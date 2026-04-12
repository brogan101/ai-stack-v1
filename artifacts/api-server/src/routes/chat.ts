import { Router } from "express";
import { mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

import {
  getUniversalGatewayTags,
  streamGatewayChatToSse,
  sendGatewayChat,
  queueUniversalModelPull,
  unloadOllamaModel,
  getRunningGatewayModels,
  distributedFetchJson,
  routeModelForMessages,
} from "../lib/model-orchestrator.js";
import { workspaceContextService } from "../lib/code-context.js";
import { writeManagedJson } from "../lib/snapshot-manager.js";
import { thoughtLog } from "../lib/thought-log.js";
import { toolsRoot } from "../lib/runtime.js";

const router = Router();

const HISTORY_DIR = path.join(toolsRoot(), "chat-history");

async function ensureHistoryDir(): Promise<void> {
  if (!existsSync(HISTORY_DIR)) {
    await mkdir(HISTORY_DIR, { recursive: true });
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function maybeBuildCodeContext(
  messages: ChatMessage[],
  workspacePath: string | undefined,
  useCodeContext: boolean | undefined
) {
  if (!useCodeContext) return null;
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content?.trim();
  if (!latestUserMessage) return null;
  try {
    return await workspaceContextService.search(latestUserMessage, workspacePath, 6, 12000);
  } catch {
    return null;
  }
}

function contextSystemPrompt(context: NonNullable<Awaited<ReturnType<typeof maybeBuildCodeContext>>>): string {
  return [
    `You are helping with the workspace "${context.workspace.workspaceName}" at ${context.workspace.rootPath}.`,
    "Use the provided indexed code context before making assumptions.",
    "If the answer depends on code not shown in the context window, say what additional file should be read next.",
    "",
    context.promptContext,
  ].join("\n");
}

function contextMetadata(context: NonNullable<Awaited<ReturnType<typeof maybeBuildCodeContext>>>) {
  return {
    workspaceName: context.workspace.workspaceName,
    workspacePath: context.workspace.rootPath,
    fileCount: context.files.length,
    sectionCount: context.sections.length,
    files: context.files.map((file) => ({
      path: file.path,
      relativePath: file.relativePath,
      score: file.score,
      matchedSymbols: file.matchedSymbols.map((symbol) => `${symbol.kind} ${symbol.name}`),
    })),
  };
}

// GET /chat/models
router.get("/chat/models", async (_req, res) => {
  const gateway = await getUniversalGatewayTags();
  return res.json({
    models: gateway.models.map((model) => ({
      name: model.name,
      paramSize: model.parameterSize,
    })),
    ollamaReachable: gateway.ollamaReachable,
    vramGuard: gateway.vramGuard,
  });
});

// POST /chat/send
router.post("/chat/send", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const workspacePath = typeof body.workspacePath === "string" ? body.workspacePath : undefined;
  const useCodeContext = typeof body.useCodeContext === "boolean" ? body.useCodeContext : undefined;
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? (body.messages as unknown[]).filter(
        (message): message is ChatMessage =>
          !!message &&
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          ["system", "user", "assistant"].includes((message as Record<string, unknown>).role as string) &&
          "content" in message &&
          typeof (message as Record<string, unknown>).content === "string"
      )
    : [];

  if (!messages.length) {
    return res.status(400).json({ success: false, message: "messages required" });
  }

  try {
    const codeContext = await maybeBuildCodeContext(messages, workspacePath, useCodeContext);
    const upstreamMessages: ChatMessage[] = codeContext
      ? [{ role: "system" as const, content: contextSystemPrompt(codeContext) }, ...messages]
      : messages;

    thoughtLog.publish({
      category: "chat",
      title: "Chat Request",
      message: `Universal gateway chat request accepted${model ? ` with requested model ${model}` : ""}`,
      metadata: { workspacePath, useCodeContext: !!useCodeContext, contextAttached: !!codeContext },
    });

    const result = await sendGatewayChat(upstreamMessages, model || undefined);
    const assistantMsg: ChatMessage = { role: "assistant", content: result.message };
    const persistedModel = result.model;

    if (sessionId) {
      await ensureHistoryDir();
      const file = path.join(HISTORY_DIR, `${sessionId}.json`);
      const existing = existsSync(file)
        ? JSON.parse(await readFile(file, "utf-8"))
        : {
            id: sessionId,
            model: persistedModel,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      const session = {
        ...existing,
        model: persistedModel,
        messages: [...messages, assistantMsg],
        updatedAt: new Date().toISOString(),
      };
      await writeManagedJson(file, session);
    }

    return res.json({
      success: true,
      model: result.model,
      route: result.route,
      message: assistantMsg,
      sessionId: sessionId || undefined,
      context: codeContext ? contextMetadata(codeContext) : null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error instanceof Error ? error.message : String(error) });
  }
});

// POST /chat/stream
router.post("/chat/stream", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const workspacePath = typeof body.workspacePath === "string" ? body.workspacePath : undefined;
  const useCodeContext = typeof body.useCodeContext === "boolean" ? body.useCodeContext : undefined;
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? (body.messages as unknown[]).filter(
        (message): message is ChatMessage =>
          !!message &&
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          ["system", "user", "assistant"].includes((message as Record<string, unknown>).role as string) &&
          "content" in message &&
          typeof (message as Record<string, unknown>).content === "string"
      )
    : [];

  if (!messages.length) {
    return res.status(400).json({ success: false, message: "messages required" });
  }

  try {
    const codeContext = await maybeBuildCodeContext(messages, workspacePath, useCodeContext);
    const upstreamMessages: ChatMessage[] = codeContext
      ? [{ role: "system" as const, content: contextSystemPrompt(codeContext) }, ...messages]
      : messages;

    thoughtLog.publish({
      category: "chat",
      title: "Streaming Chat Request",
      message: `Universal gateway streaming chat started${model ? ` with requested model ${model}` : ""}`,
      metadata: { workspacePath, useCodeContext: !!useCodeContext, contextAttached: !!codeContext },
    });

    await streamGatewayChatToSse(res, {
      messages: upstreamMessages,
      requestedModel: model || undefined,
      initialPayloads: codeContext ? [{ context: contextMetadata(codeContext) }] : [],
    });
  } catch (error) {
    if (res.writableEnded || res.destroyed) {
      return;
    }
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
  return;
});

// POST /chat/assistant
router.post("/chat/assistant", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const context = typeof body.context === "string" ? body.context : "";
  const workspacePath = typeof body.workspacePath === "string" ? body.workspacePath : undefined;
  const useCodeContext = typeof body.useCodeContext === "boolean" ? body.useCodeContext : undefined;

  if (!prompt) {
    return res.status(400).json({ success: false, message: "prompt required" });
  }

  try {
    const codeContext = await maybeBuildCodeContext(
      [{ role: "user", content: prompt }],
      workspacePath,
      useCodeContext
    );

    const systemPrompt = `You are a concise local AI assistant embedded in LocalAI Control Center.
Help manage configuration, write rules files, and answer questions about the local AI stack.
Be direct and actionable. Return JSON when asked to produce structured data.
${context ? `Current context:\n${context}` : ""}
${codeContext ? `Indexed workspace context:\n${codeContext.promptContext}` : ""}`;

    const result = await sendGatewayChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      undefined
    );

    return res.json({
      success: true,
      result: result.message,
      model: result.model,
      route: result.route,
      context: codeContext ? contextMetadata(codeContext) : null,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
      result: null,
    });
  }
});

// POST /chat/command
router.post("/chat/command", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const command = typeof body.command === "string" ? body.command.trim() : "";

  if (!command) {
    return res.status(400).json({ success: false, message: "command required" });
  }

  const cmd = command.toLowerCase();

  const installMatch = cmd.match(/^\/(install|pull)\s+(.+)/);
  if (installMatch) {
    const modelName = installMatch[2].trim();
    const job = queueUniversalModelPull(modelName);
    return res.json({
      success: true,
      action: "install",
      modelName,
      jobId: job.id,
      message: `Queued pull for ${modelName}. Check the Models page for progress.`,
    });
  }

  const stopMatch = cmd.match(/^\/stop\s+(.+)/);
  if (stopMatch) {
    const modelName = stopMatch[1].trim();
    try {
      await unloadOllamaModel(modelName);
      return res.json({ success: true, action: "stop", modelName, message: `${modelName} unloaded from VRAM.` });
    } catch (error) {
      return res.json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (cmd === "/models") {
    const gateway = await getUniversalGatewayTags();
    const names = gateway.models.map((model) => model.name);
    return res.json({
      success: true,
      action: "list",
      message: names.length
        ? `Installed models:\n${names.map((name) => `\u2022 ${name}`).join("\n")}`
        : "No models installed.",
    });
  }

  if (cmd === "/status") {
    const [gateway, running] = await Promise.all([getUniversalGatewayTags(), getRunningGatewayModels()]);
    return res.json({
      success: true,
      action: "status",
      message: `**System Status**\nOllama: ${gateway.ollamaReachable ? "running" : "offline"}\nVRAM Guard: ${gateway.vramGuard.mode} (${gateway.vramGuard.status})${
        running.models.length
          ? `\nActive models: ${running.models.map((model) => model.name).join(", ")}`
          : "\nNo models loaded in VRAM"
      }`,
    });
  }

  if (cmd === "/index") {
    const workspaces = await workspaceContextService.refreshKnownWorkspaces("manual");
    return res.json({
      success: true,
      action: "index",
      message: `Code context index refreshed for ${workspaces.length} workspace(s).`,
    });
  }

  if (cmd === "/help") {
    return res.json({
      success: true,
      action: "help",
      message: `**Chat Commands:**\n\u2022 \`/install <model>\` \u2014 queue a model pull\n\u2022 \`/stop <model>\` \u2014 unload a model from VRAM\n\u2022 \`/models\` \u2014 list installed models\n\u2022 \`/status\` \u2014 show system status\n\u2022 \`/index\` \u2014 refresh the code context index\n\u2022 \`/help\` \u2014 show this message`,
    });
  }

  return res.json({
    success: false,
    message: `Unknown command: ${command}. Type /help to see available commands.`,
  });
});

/**
 * POST /chat/vision
 *
 * Multimodal image analysis via Ollama's `images` field.
 * Automatically routes to the best vision-capable model available.
 *
 * Request body:
 *   {
 *     prompt:    string            — text question / instruction
 *     images:    string[]          — base64-encoded image data (no data URI prefix needed)
 *     model?:    string            — optional override; defaults to auto-selected vision model
 *     analysis?: "desired_vs_actual" | "describe" | "ocr" | "diagnose"
 *                                 — hint that prefixes the system prompt for common use cases
 *   }
 *
 * Response:
 *   { success, model, route, message, analysisType }
 */
router.post("/chat/vision", async (req, res) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const prompt    = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const model     = typeof body.model  === "string" ? body.model.trim()  : "";
  const analysis  = typeof body.analysis === "string" ? body.analysis as string : "describe";
  const rawImages: unknown[] = Array.isArray(body.images) ? body.images : [];

  if (!prompt) {
    return res.status(400).json({ success: false, message: "prompt required" });
  }
  if (rawImages.length === 0) {
    return res.status(400).json({ success: false, message: "images array required (at least one base64 image)" });
  }

  // Strip data URI prefix if present (e.g., "data:image/png;base64,...")
  const images: string[] = rawImages
    .filter((img): img is string => typeof img === "string")
    .map(img => img.includes(",") ? img.split(",")[1]! : img);

  if (images.length === 0) {
    return res.status(400).json({ success: false, message: "images must be base64 strings" });
  }

  // Build a system prompt tailored to the analysis type
  const systemPrompts: Record<string, string> = {
    desired_vs_actual:
      "You are a visual QA agent. The user provides a screenshot or photo. " +
      "Compare what is visible (Actual) against what the user describes as expected (Desired). " +
      "List discrepancies clearly and suggest fixes.",
    describe:
      "You are a vision assistant. Describe the image in detail, noting layout, colours, text, and any notable elements.",
    ocr:
      "You are an OCR agent. Extract and return all text visible in the image, preserving structure where possible. " +
      "Return only the extracted text, nothing else.",
    diagnose:
      "You are a technical diagnostics assistant. Analyze the image for errors, warnings, or anomalies " +
      "(stack traces, UI glitches, charts, logs). Explain what you find and suggest remediation.",
  };

  const systemContent = systemPrompts[analysis] ?? systemPrompts["describe"]!;

  // Vision messages use Ollama's multimodal format:
  // the user message gets an `images` array alongside the `content` text.
  const visionMessages = [
    { role: "system" as const, content: systemContent },
    { role: "user" as const, content: prompt, images },
  ];

  // Force intent to "vision" so the router picks a vision-capable model
  let resolvedModel = model;
  if (!resolvedModel) {
    try {
      const route = await routeModelForMessages(
        [{ role: "user", content: `vision analysis: ${prompt}` }],
        undefined,
      );
      resolvedModel = route.selectedModel;
    } catch {
      resolvedModel = "llava";   // safe fallback
    }
  }

  thoughtLog.publish({
    category: "chat",
    title: "Vision Analysis Request",
    message: `Vision bridge activated — analysis type: ${analysis}, model: ${resolvedModel}, images: ${images.length}`,
    metadata: { analysisType: analysis, model: resolvedModel, imageCount: images.length },
  });

  try {
    const ollamaRes = await distributedFetchJson<{ message?: { content?: string }; model?: string }>(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: resolvedModel,
          messages: visionMessages,
          stream: false,
        }),
      },
      120_000,
    );

    const responseText = ollamaRes.message?.content ?? "";
    thoughtLog.publish({
      category: "chat",
      title: "Vision Analysis Complete",
      message: `Vision bridge response (${responseText.length} chars) from model ${ollamaRes.model ?? resolvedModel}`,
    });

    return res.json({
      success: true,
      model: ollamaRes.model ?? resolvedModel,
      message: responseText,
      analysisType: analysis,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    thoughtLog.publish({
      level: "error",
      category: "chat",
      title: "Vision Analysis Failed",
      message: `Vision bridge error: ${msg}`,
    });
    return res.status(500).json({ success: false, message: msg });
  }
});

export default router;
