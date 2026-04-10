/**
 * WINDOWS SYSTEM INTEGRATION
 * Provides OS-level kill-switch, cleanup, and status-read capabilities
 * via PowerShell scripts in the scripts/windows/ directory.
 */

import path from "path";
import { existsSync, readFileSync } from "fs";
import { execCommand, shellQuote } from "./runtime.js";

function repoRoot(): string {
  // __dirname is polyfilled in the esbuild bundle banner
  return path.resolve(__dirname, "..", "..", "..");
}

function processManifestPath(): string {
  return path.join(repoRoot(), "runtime", "process-manifest.json");
}

function systemStatusPath(): string {
  return path.join(repoRoot(), "runtime", "system-integration-status.json");
}

function systemIntegrationScriptPath(): string {
  return path.join(repoRoot(), "scripts", "windows", "LocalAI.SystemIntegration.ps1");
}

export interface KillSwitchResult {
  success: boolean;
  message: string;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

export interface SystemIntegrationStatus {
  [key: string]: unknown;
}

export async function invokeSystemKillSwitch(): Promise<KillSwitchResult> {
  const scriptPath = systemIntegrationScriptPath();
  if (!existsSync(scriptPath)) {
    return { success: false, message: "System integration script not found." };
  }
  await execCommand(
    `powershell -NoProfile -ExecutionPolicy Bypass -File ${shellQuote(scriptPath)} -Mode kill -ManifestPath ${shellQuote(processManifestPath())} -StatusPath ${shellQuote(systemStatusPath())}`,
    30000,
  );
  return { success: true, message: "Kill switch executed." };
}

export async function robustCleanup(targetPath: string): Promise<CleanupResult> {
  const scriptPath = systemIntegrationScriptPath();
  if (!existsSync(scriptPath)) {
    return { success: false, message: "System integration script not found." };
  }
  const { stdout } = await execCommand(
    `powershell -NoProfile -ExecutionPolicy Bypass -File ${shellQuote(scriptPath)} -Mode cleanup -ManifestPath ${shellQuote(processManifestPath())} -StatusPath ${shellQuote(systemStatusPath())} -TargetPath ${shellQuote(targetPath)}`,
    60000,
  );
  try {
    return JSON.parse((stdout ?? "").trim()) as CleanupResult;
  } catch {
    return { success: false, message: (stdout ?? "Cleanup command did not return valid JSON.").trim() };
  }
}

export function readSystemIntegrationStatus(): SystemIntegrationStatus | null {
  const statusFile = systemStatusPath();
  if (!existsSync(statusFile)) return null;
  try {
    return JSON.parse(readFileSync(statusFile, "utf-8")) as SystemIntegrationStatus;
  } catch { return null; }
}
