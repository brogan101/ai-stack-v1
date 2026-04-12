/**
 * KNOWLEDGE VAULT — Sovereign RAG Engine
 * =========================================
 * Asynchronous, non-blocking embedding pipeline with Hybrid Search.
 * Hybrid Search = Semantic (cosine similarity via Ollama embeddings) + Keyword (BM25-style TF-IDF).
 *
 * Architecture:
 *   1. Documents are chunked into ~512-token overlapping chunks.
 *   2. Each chunk is embedded asynchronously via Ollama's /api/embeddings endpoint.
 *   3. Embeddings are persisted to disk (no external DB required).
 *   4. At query time, the query is embedded and hybrid-ranked against all stored chunks.
 *   5. Top-K chunks are returned as a structured context block for injection into the LLM prompt.
 *
 * This is a sovereign file. Do NOT simplify, stub, or delete this logic.
 */

import { createHash, randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

import { fetchJson, toolsRoot } from "./runtime.js";
import { logger } from "./logger.js";
import { thoughtLog } from "./thought-log.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const VAULT_DIR          = path.join(toolsRoot(), "knowledge-vault");
const CHUNKS_DIR         = path.join(VAULT_DIR, "chunks");
const EMBEDDINGS_DIR     = path.join(VAULT_DIR, "embeddings");
const MANIFEST_FILE      = path.join(VAULT_DIR, "manifest.json");
const DEFAULT_EMBED_MODEL = "nomic-embed-text";
const CHUNK_SIZE_CHARS   = 1600;   // ~400 tokens at 4 chars/token
const CHUNK_OVERLAP      = 200;    // characters of overlap between adjacent chunks
const MAX_CHUNKS_TOTAL   = 50000;  // hard cap to avoid unbounded growth
const HYBRID_SEMANTIC_WEIGHT = 0.6;
const HYBRID_KEYWORD_WEIGHT  = 0.4;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultDocument {
  id: string;
  sourceId: string;        // user-supplied identifier (file path, URL, etc.)
  sourceTitle: string;
  content: string;
  contentHash: string;
  ingestedAt: string;
  chunkCount: number;
  metadata?: Record<string, unknown>;
}

export interface VaultChunk {
  id: string;
  documentId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  text: string;
  embeddingModel: string;
  embedding: number[];
  ingestedAt: string;
}

export interface SearchHit {
  chunk: Omit<VaultChunk, "embedding">;
  score: number;
  semanticScore: number;
  keywordScore: number;
}

export interface SearchResult {
  hits: SearchHit[];
  promptContext: string;
  query: string;
  embeddingModel: string;
  totalChunksSearched: number;
}

export interface VaultStatus {
  documentCount: number;
  chunkCount: number;
  embeddingModel: string;
  vaultSizeBytes: number;
  documents: Array<Pick<VaultDocument, "id" | "sourceId" | "sourceTitle" | "chunkCount" | "ingestedAt">>;
}

export interface IngestResult {
  documentId: string;
  sourceId: string;
  chunkCount: number;
  embedded: number;
  skipped: number;
  durationMs: number;
}

export type EmbeddingJob = {
  status: "pending" | "running" | "completed" | "failed";
  documentId: string;
  sourceId: string;
  totalChunks: number;
  embeddedChunks: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

interface VaultManifest {
  version: number;
  documents: VaultDocument[];
  updatedAt: string;
}

// ── Active embedding jobs (non-blocking) ─────────────────────────────────────

const activeJobs = new Map<string, EmbeddingJob>();

export function getEmbeddingJob(jobId: string): EmbeddingJob | undefined {
  return activeJobs.get(jobId);
}

export function listEmbeddingJobs(): EmbeddingJob[] {
  return [...activeJobs.values()];
}

// ── Disk helpers ──────────────────────────────────────────────────────────────

async function ensureVaultDirs(): Promise<void> {
  await mkdir(CHUNKS_DIR,     { recursive: true });
  await mkdir(EMBEDDINGS_DIR, { recursive: true });
}

async function loadManifest(): Promise<VaultManifest> {
  if (!existsSync(MANIFEST_FILE)) {
    return { version: 1, documents: [], updatedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(await readFile(MANIFEST_FILE, "utf-8")) as VaultManifest;
  } catch {
    return { version: 1, documents: [], updatedAt: new Date().toISOString() };
  }
}

async function saveManifest(manifest: VaultManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function chunkFilePath(chunkId: string): string {
  return path.join(CHUNKS_DIR, `${chunkId}.json`);
}

function embeddingFilePath(chunkId: string): string {
  return path.join(EMBEDDINGS_DIR, `${chunkId}.json`);
}

async function saveChunk(chunk: VaultChunk): Promise<void> {
  // Store chunk text and metadata separately from the embedding vector
  const { embedding, ...meta } = chunk;
  await writeFile(chunkFilePath(chunk.id), JSON.stringify(meta), "utf-8");
  await writeFile(embeddingFilePath(chunk.id), JSON.stringify(embedding), "utf-8");
}

async function loadAllChunks(): Promise<VaultChunk[]> {
  await ensureVaultDirs();
  const files = await readdir(CHUNKS_DIR).catch(() => [] as string[]);
  const chunks: VaultChunk[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const meta = JSON.parse(await readFile(path.join(CHUNKS_DIR, file), "utf-8")) as Omit<VaultChunk, "embedding">;
      const embeddingPath = embeddingFilePath(meta.id);
      if (!existsSync(embeddingPath)) continue;
      const embedding = JSON.parse(await readFile(embeddingPath, "utf-8")) as number[];
      chunks.push({ ...meta, embedding });
    } catch { /* skip corrupted chunk */ }
  }
  return chunks;
}

async function deleteChunksForDocument(documentId: string): Promise<void> {
  const files = await readdir(CHUNKS_DIR).catch(() => [] as string[]);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const meta = JSON.parse(await readFile(path.join(CHUNKS_DIR, file), "utf-8")) as { documentId?: string };
      if (meta.documentId === documentId) {
        await unlink(path.join(CHUNKS_DIR, file)).catch(() => undefined);
        await unlink(path.join(EMBEDDINGS_DIR, file)).catch(() => undefined);
      }
    } catch { /* skip */ }
  }
}

// ── Text chunking ─────────────────────────────────────────────────────────────

function chunkText(text: string, sourceId: string, documentId: string, sourceTitle: string): Array<{ text: string; chunkIndex: number }> {
  const chunks: Array<{ text: string; chunkIndex: number }> = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.length === 0) return chunks;

  let start = 0;
  let index = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, normalized.length);
    let boundary = end;
    // Walk back to a sentence/paragraph boundary for cleaner chunks
    if (end < normalized.length) {
      const sub = normalized.slice(start, end);
      const paraBreak = sub.lastIndexOf("\n\n");
      const sentBreak = sub.lastIndexOf(". ");
      const newline    = sub.lastIndexOf("\n");
      const ideal = Math.max(paraBreak, sentBreak, newline);
      if (ideal > CHUNK_SIZE_CHARS / 2) boundary = start + ideal + 1;
    }
    chunks.push({ text: normalized.slice(start, boundary).trim(), chunkIndex: index++ });
    start = boundary - CHUNK_OVERLAP;
    if (start <= 0 || start >= boundary) start = boundary;
  }
  return chunks;
}

// ── Ollama embeddings API ─────────────────────────────────────────────────────

async function fetchEmbedding(text: string, model: string): Promise<number[]> {
  const response = await fetchJson<{ embedding?: number[] }>(
    "http://127.0.0.1:11434/api/embeddings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    },
    30000,
  );
  const embedding = response.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(`Ollama returned empty embedding for model "${model}"`);
  }
  return embedding;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── BM25-style keyword scoring ────────────────────────────────────────────────

function tokenizeQuery(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9_\s]/g, " ")
      .split(/\s+/)
      .filter(t => t.length >= 2 && !STOPWORDS.has(t)),
  )];
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "has", "her",
  "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its",
  "this", "that", "with", "from", "they", "will", "been", "have", "what",
]);

function keywordScore(chunkText: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const lower = chunkText.toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    let pos = 0; let count = 0;
    while ((pos = lower.indexOf(token, pos)) !== -1) { count++; pos += token.length; }
    if (count > 0) hits += Math.log1p(count);
  }
  return hits / queryTokens.length;
}

// ── Async ingest pipeline ─────────────────────────────────────────────────────

/**
 * Non-blocking ingest — returns a jobId immediately and runs in background.
 * The caller can poll /api/vault/jobs/:jobId to track progress.
 */
export function ingestDocumentAsync(
  content: string,
  sourceId: string,
  sourceTitle: string,
  embeddingModel = DEFAULT_EMBED_MODEL,
  metadata?: Record<string, unknown>,
): string {
  const jobId     = randomUUID();
  const contentHash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  const job: EmbeddingJob = {
    status: "pending",
    documentId: jobId,
    sourceId,
    totalChunks: 0,
    embeddedChunks: 0,
    startedAt: new Date().toISOString(),
  };
  activeJobs.set(jobId, job);

  // Fire and forget — intentionally not awaited
  void (async () => {
    job.status = "running";
    const t0 = Date.now();
    try {
      await ensureVaultDirs();
      const manifest = await loadManifest();

      // Remove existing document with same sourceId (re-ingest)
      const existingIdx = manifest.documents.findIndex(d => d.sourceId === sourceId);
      if (existingIdx !== -1) {
        await deleteChunksForDocument(manifest.documents[existingIdx]!.id);
        manifest.documents.splice(existingIdx, 1);
      }

      const rawChunks = chunkText(content, sourceId, jobId, sourceTitle);
      job.totalChunks = rawChunks.length;

      thoughtLog.publish({
        category: "system",
        title: "Knowledge Vault — Ingesting",
        message: `Embedding ${rawChunks.length} chunks from "${sourceTitle}" using ${embeddingModel}`,
        metadata: { sourceId, chunkCount: rawChunks.length, embeddingModel },
      });

      let embedded = 0;
      let skipped  = 0;
      for (const { text, chunkIndex } of rawChunks) {
        if (!text.trim()) { skipped++; continue; }
        try {
          const embedding = await fetchEmbedding(text, embeddingModel);
          const chunk: VaultChunk = {
            id: randomUUID(),
            documentId: jobId,
            sourceId, sourceTitle, chunkIndex,
            text, embeddingModel, embedding,
            ingestedAt: new Date().toISOString(),
          };
          await saveChunk(chunk);
          embedded++;
          job.embeddedChunks = embedded;
        } catch (err) {
          logger.warn({ err, chunkIndex, sourceId }, "Failed to embed chunk — skipping");
          skipped++;
        }
      }

      const doc: VaultDocument = {
        id: jobId, sourceId, sourceTitle, content,
        contentHash, ingestedAt: new Date().toISOString(),
        chunkCount: embedded, metadata,
      };
      manifest.documents.push(doc);
      if (manifest.documents.length > MAX_CHUNKS_TOTAL) {
        manifest.documents = manifest.documents.slice(-MAX_CHUNKS_TOTAL);
      }
      await saveManifest(manifest);

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      thoughtLog.publish({
        category: "system",
        title: "Knowledge Vault — Ingest Complete",
        message: `"${sourceTitle}" ingested: ${embedded} chunks embedded, ${skipped} skipped in ${Date.now() - t0}ms`,
        metadata: { sourceId, embedded, skipped, durationMs: Date.now() - t0 },
      });
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
      thoughtLog.publish({
        level: "error",
        category: "system",
        title: "Knowledge Vault — Ingest Failed",
        message: `Failed to ingest "${sourceTitle}": ${job.error}`,
        metadata: { sourceId, error: job.error },
      });
    }
  })();

  return jobId;
}

// ── Hybrid search ─────────────────────────────────────────────────────────────

export async function hybridSearch(
  query: string,
  topK = 5,
  embeddingModel = DEFAULT_EMBED_MODEL,
  filterSourceId?: string,
): Promise<SearchResult> {
  const t0 = Date.now();
  await ensureVaultDirs();

  // Embed the query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await fetchEmbedding(query, embeddingModel);
  } catch (err) {
    thoughtLog.publish({
      level: "warning",
      category: "system",
      title: "Knowledge Vault — Query Embedding Failed",
      message: `Falling back to keyword-only search: ${err instanceof Error ? err.message : String(err)}`,
    });
    queryEmbedding = [];
  }

  const queryTokens = tokenizeQuery(query);
  const allChunks   = await loadAllChunks();
  const candidates  = filterSourceId
    ? allChunks.filter(c => c.sourceId === filterSourceId)
    : allChunks;

  if (candidates.length === 0) {
    return { hits: [], promptContext: "", query, embeddingModel, totalChunksSearched: 0 };
  }

  // Score every chunk with hybrid formula
  const scored = candidates.map(chunk => {
    const semantic = queryEmbedding.length > 0 ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    const keyword  = keywordScore(chunk.text, queryTokens);
    // Normalize keyword score to [0,1] range (approximate)
    const normalizedKeyword = Math.min(1, keyword / 5);
    const score = HYBRID_SEMANTIC_WEIGHT * semantic + HYBRID_KEYWORD_WEIGHT * normalizedKeyword;
    const { embedding: _e, ...meta } = chunk;
    return { chunk: meta, score, semanticScore: semantic, keywordScore: normalizedKeyword };
  });

  // Sort descending by hybrid score, take top K
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.slice(0, topK).filter(h => h.score > 0.01);

  // Build prompt context block
  const contextParts = hits.map((hit, i) =>
    `[${i + 1}] Source: ${hit.chunk.sourceTitle} (chunk ${hit.chunk.chunkIndex})\n${hit.chunk.text}`,
  );
  const promptContext = contextParts.join("\n\n---\n\n");

  thoughtLog.publish({
    category: "system",
    title: "Knowledge Vault — Search",
    message: `Hybrid search for "${query.slice(0, 80)}" → ${hits.length} hits from ${candidates.length} chunks in ${Date.now() - t0}ms`,
    metadata: { query: query.slice(0, 80), hits: hits.length, totalChunks: candidates.length, topScore: hits[0]?.score ?? 0 },
  });

  return {
    hits,
    promptContext,
    query,
    embeddingModel,
    totalChunksSearched: candidates.length,
  };
}

// ── Status ────────────────────────────────────────────────────────────────────

export async function getVaultStatus(embeddingModel = DEFAULT_EMBED_MODEL): Promise<VaultStatus> {
  await ensureVaultDirs();
  const manifest = await loadManifest();

  let vaultSizeBytes = 0;
  for (const dir of [CHUNKS_DIR, EMBEDDINGS_DIR]) {
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const file of files) {
      const s = await stat(path.join(dir, file)).catch(() => null);
      if (s) vaultSizeBytes += s.size;
    }
  }

  const chunkFiles = await readdir(CHUNKS_DIR).catch(() => [] as string[]);

  return {
    documentCount: manifest.documents.length,
    chunkCount: chunkFiles.filter(f => f.endsWith(".json")).length,
    embeddingModel,
    vaultSizeBytes,
    documents: manifest.documents.map(d => ({
      id: d.id,
      sourceId: d.sourceId,
      sourceTitle: d.sourceTitle,
      chunkCount: d.chunkCount,
      ingestedAt: d.ingestedAt,
    })),
  };
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  const manifest = await loadManifest();
  const idx = manifest.documents.findIndex(d => d.id === documentId);
  if (idx === -1) return false;
  await deleteChunksForDocument(documentId);
  manifest.documents.splice(idx, 1);
  await saveManifest(manifest);
  return true;
}

// ── Initialisation ────────────────────────────────────────────────────────────

export async function initKnowledgeVault(): Promise<void> {
  await ensureVaultDirs();
  const manifest = await loadManifest();
  thoughtLog.publish({
    category: "kernel",
    title: "Knowledge Vault Ready",
    message: `RAG engine initialised — ${manifest.documents.length} documents in vault`,
    metadata: { documentCount: manifest.documents.length },
  });
}
