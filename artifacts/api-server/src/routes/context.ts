import { Router } from "express";
import { workspaceContextService } from "../lib/code-context.js";
import {
  ingestDocumentAsync,
  hybridSearch,
  getVaultStatus,
  deleteDocument,
  getEmbeddingJob,
  listEmbeddingJobs,
} from "../lib/knowledge-vault.js";

const router = Router();

// ── Workspace Context ─────────────────────────────────────────────────────────

router.get("/context/status", async (_req, res) => {
  const status = await workspaceContextService.getStatus();
  return res.json(status);
});

router.get("/context/workspaces", async (_req, res) => {
  const workspaces = await workspaceContextService.getWorkspaceSummaries();
  return res.json({ workspaces });
});

router.post("/context/index", async (req, res) => {
  const { workspacePath, force } = req.body;
  try {
    if (workspacePath) {
      const index = await workspaceContextService.indexWorkspace(workspacePath, !!force);
      return res.json({ success: true, workspace: index.rootPath, fileCount: index.fileCount, symbolCount: index.symbolCount });
    }
    const workspaces = await workspaceContextService.refreshKnownWorkspaces("manual");
    return res.json({ success: true, workspaces });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/context/search", async (req, res) => {
  const { query, workspacePath, maxFiles, maxTokens } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ success: false, message: "query required" });
  }
  try {
    const result = await workspaceContextService.search(query, workspacePath, maxFiles, maxTokens);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/context/file", async (req, res) => {
  const filePath = String(req.query.path || "");
  const workspacePath = req.query.workspacePath ? String(req.query.workspacePath) : undefined;
  if (!filePath) {
    return res.status(400).json({ success: false, message: "path query parameter required" });
  }
  try {
    const result = await workspaceContextService.readWorkspaceFile(filePath, workspacePath);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/context/read-write-verify", async (req, res) => {
  const { filePath, updatedContent, workspacePath } = req.body;
  if (!filePath || typeof updatedContent !== "string") {
    return res.status(400).json({ success: false, message: "filePath and updatedContent are required" });
  }
  try {
    const result = await workspaceContextService.applyReadWriteVerify(filePath, updatedContent, workspacePath ?? "");
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Multi-file atomic refactor.
 * Body: { changes: { [absoluteFilePath]: newContent }, workspacePath: string }
 */
router.post("/context/multi-file-refactor", async (req, res) => {
  const { changes, workspacePath } = req.body as {
    changes?: Record<string, string>;
    workspacePath?: string;
  };
  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return res.status(400).json({ success: false, message: "changes object with at least one entry required" });
  }
  if (!workspacePath) {
    return res.status(400).json({ success: false, message: "workspacePath required" });
  }
  try {
    const result = await workspaceContextService.applyMultiFileRefactor(changes, workspacePath);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── Knowledge Vault (RAG) ─────────────────────────────────────────────────────

/**
 * Ingest a document into the Knowledge Vault.
 * Body: { content, sourceId, sourceTitle, embeddingModel?, metadata? }
 * Returns: { jobId } — poll /context/vault/jobs/:id for status.
 */
router.post("/context/vault/ingest", async (req, res) => {
  const { content, sourceId, sourceTitle, embeddingModel, metadata } = req.body as {
    content?: string;
    sourceId?: string;
    sourceTitle?: string;
    embeddingModel?: string;
    metadata?: Record<string, unknown>;
  };
  if (!content?.trim()) {
    return res.status(400).json({ success: false, message: "content required" });
  }
  if (!sourceId?.trim()) {
    return res.status(400).json({ success: false, message: "sourceId required" });
  }
  const jobId = ingestDocumentAsync(
    content, sourceId, sourceTitle ?? sourceId, embeddingModel, metadata,
  );
  return res.status(202).json({ success: true, jobId, message: "Ingest job queued" });
});

/**
 * Hybrid semantic + keyword search over the Knowledge Vault.
 * Body: { query, topK?, embeddingModel?, filterSourceId? }
 */
router.post("/context/vault/search", async (req, res) => {
  const { query, topK, embeddingModel, filterSourceId } = req.body as {
    query?: string;
    topK?: number;
    embeddingModel?: string;
    filterSourceId?: string;
  };
  if (!query?.trim()) {
    return res.status(400).json({ success: false, message: "query required" });
  }
  try {
    const result = await hybridSearch(query, topK, embeddingModel, filterSourceId);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Vault status: chunk count, document count, pending jobs.
 */
router.get("/context/vault/status", async (req, res) => {
  const embeddingModel = req.query.embeddingModel ? String(req.query.embeddingModel) : undefined;
  try {
    const status = await getVaultStatus(embeddingModel);
    return res.json({ success: true, ...status });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Delete all chunks for a specific document from the vault.
 */
router.delete("/context/vault/documents/:sourceId", async (req, res) => {
  const { sourceId } = req.params;
  try {
    const deleted = await deleteDocument(sourceId!);
    return res.json({ success: deleted, message: deleted ? "Document deleted" : "Document not found" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * List all embedding jobs (recent ingest operations).
 */
router.get("/context/vault/jobs", async (_req, res) => {
  const jobs = listEmbeddingJobs();
  return res.json({ success: true, jobs });
});

/**
 * Get a specific embedding job by ID.
 */
router.get("/context/vault/jobs/:jobId", async (req, res) => {
  const job = getEmbeddingJob(req.params.jobId!);
  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }
  return res.json({ success: true, job });
});

export default router;
