/**
 * SELF-HEALING RUNTIME — Sovereign Ollama Sentinel
 * ==================================================
 * Monitors the local Ollama server and silently restarts it when it crashes.
 *
 * Strategy:
 *   • Polls /api/tags every POLL_INTERVAL_MS.
 *   • Three consecutive failures → declare Ollama dead.
 *   • Attempts restart up to MAX_RESTART_ATTEMPTS times with exponential backoff.
 *   • Every health change is emitted to the Thought Log so the UI reflects it.
 *   • On Windows: uses `start "" ollama.exe serve` after optional taskkill.
 *   • On Linux/macOS: uses `ollama serve &` in background.
 *
 * This is a sovereign file. Do NOT simplify, stub, or delete this logic.
 */

import { exec } from "child_process";
import os from "os";
import { promisify } from "util";

import { thoughtLog } from "./thought-log.js";
import { logger } from "./logger.js";

const execAsync = promisify(exec);

// ── Configuration ─────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL        = process.env["OLLAMA_HOST"] ?? "http://127.0.0.1:11434";
const POLL_INTERVAL_MS       = 30_000;   // 30 seconds between health checks
const FAILURE_THRESHOLD      = 3;        // consecutive failures before restart attempt
const MAX_RESTART_ATTEMPTS   = 5;        // per sentinel lifetime
const BASE_BACKOFF_MS        = 15_000;   // 15 s before first restart attempt
const MAX_BACKOFF_MS         = 300_000;  // max 5 minutes between retry attempts
const PROBE_TIMEOUT_MS       = 6_000;    // timeout for each health probe
const STARTUP_GRACE_PERIOD_MS = 20_000; // wait after restart before probing again

const IS_WINDOWS = os.platform() === "win32";

// ── State ─────────────────────────────────────────────────────────────────────

interface SentinelState {
  running: boolean;
  lastSeenHealthy: string | null;
  consecutiveFailures: number;
  restartAttempts: number;
  status: "healthy" | "degraded" | "restarting" | "dead";
  lastStatusChange: string;
  lastError?: string;
}

const state: SentinelState = {
  running: false,
  lastSeenHealthy: null,
  consecutiveFailures: 0,
  restartAttempts: 0,
  status: "healthy",
  lastStatusChange: new Date().toISOString(),
};

export function getSentinelState(): Readonly<SentinelState> {
  return { ...state };
}

// ── Health probe ──────────────────────────────────────────────────────────────

async function probeOllama(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Restart logic ─────────────────────────────────────────────────────────────

async function killOllama(): Promise<void> {
  try {
    if (IS_WINDOWS) {
      await execAsync('taskkill /F /IM ollama.exe /T', { timeout: 8000, windowsHide: true });
    } else {
      await execAsync('pkill -f "ollama serve" || pkill -f ollama', { timeout: 8000 });
    }
    logger.info("Ollama process terminated by sentinel");
  } catch {
    // Process may already be dead — that's fine
  }
}

async function launchOllama(): Promise<void> {
  if (IS_WINDOWS) {
    // Detached launch — will survive the parent process
    exec('start "" /b ollama serve', { windowsHide: true });
  } else {
    exec('nohup ollama serve > /dev/null 2>&1 &');
  }
  logger.info("Ollama restart command issued by sentinel");
}

async function attemptRestart(): Promise<void> {
  state.restartAttempts++;
  const attempt = state.restartAttempts;

  thoughtLog.publish({
    level: "warning",
    category: "system",
    title: "Sentinel — Restarting Ollama",
    message: `Ollama appears dead after ${FAILURE_THRESHOLD} consecutive probe failures. Attempting restart (attempt ${attempt}/${MAX_RESTART_ATTEMPTS}).`,
    metadata: { attempt, consecutiveFailures: state.consecutiveFailures },
  });

  setState("restarting");
  await killOllama();
  await sleep(3000);  // brief pause between kill and launch
  await launchOllama();

  // Grace period — Ollama needs time to load
  thoughtLog.publish({
    category: "system",
    title: "Sentinel — Waiting for Ollama",
    message: `Ollama restart command issued. Waiting ${STARTUP_GRACE_PERIOD_MS / 1000}s for startup...`,
  });
  await sleep(STARTUP_GRACE_PERIOD_MS);

  // Verify restart succeeded
  const alive = await probeOllama();
  if (alive) {
    setState("healthy");
    thoughtLog.publish({
      category: "system",
      title: "Sentinel — Ollama Recovered",
      message: `Ollama is responding again after restart (attempt ${attempt}).`,
      metadata: { attempt },
    });
    state.consecutiveFailures = 0;
  } else {
    thoughtLog.publish({
      level: "error",
      category: "system",
      title: "Sentinel — Restart Failed",
      message: `Ollama still not responding after restart attempt ${attempt}. Will retry with backoff.`,
      metadata: { attempt, maxAttempts: MAX_RESTART_ATTEMPTS },
    });
  }
}

// ── State helpers ─────────────────────────────────────────────────────────────

function setState(status: SentinelState["status"]): void {
  if (state.status !== status) {
    state.status = status;
    state.lastStatusChange = new Date().toISOString();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
}

// ── Main sentinel loop ────────────────────────────────────────────────────────

async function sentinelLoop(): Promise<void> {
  while (state.running) {
    const alive = await probeOllama();

    if (alive) {
      if (state.consecutiveFailures > 0 || state.status !== "healthy") {
        thoughtLog.publish({
          category: "system",
          title: "Sentinel — Ollama Healthy",
          message: "Ollama is responding normally.",
        });
      }
      state.consecutiveFailures = 0;
      state.lastSeenHealthy = new Date().toISOString();
      setState("healthy");
    } else {
      state.consecutiveFailures++;
      state.lastError = `Probe failed at ${new Date().toISOString()}`;

      if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
        if (state.restartAttempts >= MAX_RESTART_ATTEMPTS) {
          setState("dead");
          thoughtLog.publish({
            level: "error",
            category: "system",
            title: "Sentinel — Ollama DEAD",
            message: `Ollama has not responded after ${MAX_RESTART_ATTEMPTS} restart attempts. Manual intervention required.`,
            metadata: { restartAttempts: state.restartAttempts },
          });
          // Stop polling — service is declared dead
          state.running = false;
          return;
        }

        const delay = backoffMs(state.restartAttempts + 1);
        thoughtLog.publish({
          level: "warning",
          category: "system",
          title: "Sentinel — Ollama Unreachable",
          message: `${state.consecutiveFailures} consecutive probe failures. Waiting ${delay / 1000}s before restart attempt ${state.restartAttempts + 1}.`,
        });
        setState("degraded");
        await sleep(delay);
        await attemptRestart();
      } else {
        thoughtLog.publish({
          level: "warning",
          category: "system",
          title: "Sentinel — Probe Failed",
          message: `Ollama probe failed (${state.consecutiveFailures}/${FAILURE_THRESHOLD}). Will retry.`,
          metadata: { consecutiveFailures: state.consecutiveFailures },
        });
        setState("degraded");
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

let sentinelPromise: Promise<void> | null = null;

export function startOllamaSentinel(): void {
  if (state.running) {
    logger.info("Ollama sentinel already running");
    return;
  }

  state.running = true;
  state.consecutiveFailures = 0;
  state.restartAttempts = 0;
  state.status = "healthy";
  state.lastStatusChange = new Date().toISOString();

  thoughtLog.publish({
    category: "kernel",
    title: "Sentinel — Started",
    message: `Ollama self-healing sentinel started. Polling every ${POLL_INTERVAL_MS / 1000}s. Max restarts: ${MAX_RESTART_ATTEMPTS}.`,
    metadata: { pollIntervalMs: POLL_INTERVAL_MS, maxRestarts: MAX_RESTART_ATTEMPTS, ollamaUrl: OLLAMA_BASE_URL },
  });

  sentinelPromise = sentinelLoop().catch(err => {
    logger.error({ err }, "Ollama sentinel loop crashed");
    thoughtLog.publish({
      level: "error",
      category: "system",
      title: "Sentinel — Loop Crashed",
      message: `Self-healing sentinel crashed: ${err instanceof Error ? err.message : String(err)}`,
    });
    state.running = false;
  });
}

export function stopOllamaSentinel(): void {
  state.running = false;
  thoughtLog.publish({
    category: "kernel",
    title: "Sentinel — Stopped",
    message: "Ollama self-healing sentinel stopped.",
  });
}
