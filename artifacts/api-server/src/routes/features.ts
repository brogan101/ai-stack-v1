import { Router } from "express";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { workspaceContextService } from "../lib/code-context.js";
import { getUniversalGatewayTags } from "../lib/model-orchestrator.js";

const router = Router();
const routesDir = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.resolve(routesDir, "../lib");

const hasCodeContext = existsSync(path.join(libDir, "code-context.ts"));
const hasModelOrchestrator = existsSync(path.join(libDir, "model-orchestrator.ts"));
const hasWorkspaceIntelligence = existsSync(path.join(libDir, "global-workspace-intelligence.ts"));

router.get("/features", async (_req, res) => {
  const [gateway, contextStatus] = await Promise.all([
    getUniversalGatewayTags(),
    workspaceContextService.getStatus().catch(() => null),
  ]);

  const hasIndexedWorkspace = (contextStatus?.workspaces.length ?? 0) > 0 || (contextStatus?.totalFiles ?? 0) > 0;

  return res.json({
    RAG: hasCodeContext ? "Active" : "Unavailable",
    Vision: hasModelOrchestrator ? (gateway.ollamaReachable ? "Active" : "Ready") : "Unavailable",
    ExecutionAgent: hasWorkspaceIntelligence ? "Active" : "Unavailable",
    CodeContext: hasCodeContext ? (hasIndexedWorkspace ? "Active" : "Ready") : "Unavailable",
    ModelRouting: hasModelOrchestrator ? (gateway.ollamaReachable ? "Active" : "Degraded") : "Unavailable",
    WorkspaceIntelligence: hasWorkspaceIntelligence ? "Active" : "Unavailable",
  });
});

export default router;
