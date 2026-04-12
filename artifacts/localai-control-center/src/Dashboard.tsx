import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Bot,
  BrainCircuit,
  Clock3,
  Cpu,
  Eye,
  Gauge,
  HardDrive,
  Layers3,
  RefreshCw,
  Server,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

type HealthResponse = {
  status: string;
};

type FeatureMap = Record<string, string>;

type SystemSummary = {
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    label: string;
  };
  node: {
    version: string;
    pid: number;
  };
  uptime: {
    seconds: number;
    human: string;
    startedAt: string;
  };
  ollama: {
    reachable: boolean;
    installedModels: number;
    runningModels: number;
    totalRunningVram: number;
    totalRunningVramFormatted: string;
  };
  vram: {
    mode: string;
    status: string;
    provider: string;
    reason: string;
    gpuName?: string;
    totalBytes?: number;
    totalFormatted: string;
    freeBytes?: number;
    freeFormatted: string;
    usedBytes?: number;
    usedFormatted: string;
    safeBudgetBytes: number;
    safeBudgetFormatted: string;
    reserveBytes: number;
    reserveFormatted: string;
    detectedAt: string;
  };
};

type MetricCardProps = {
  icon: typeof Server;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "good" | "warn";
};

type FeatureCardProps = {
  name: string;
  status: string;
  description: string;
  icon: typeof Sparkles;
};

const FEATURE_COPY: Record<
  string,
  {
    description: string;
    icon: typeof Sparkles;
  }
> = {
  RAG: {
    description: "Semantic retrieval and context assembly for sovereign local knowledge workflows.",
    icon: Sparkles,
  },
  Vision: {
    description: "Vision-aware intent routing for image, document, and screenshot understanding.",
    icon: Eye,
  },
  ExecutionAgent: {
    description: "Autonomous multi-step workspace execution backed by the sovereign control plane.",
    icon: TerminalSquare,
  },
  CodeContext: {
    description: "AST and symbol-aware project indexing for grounded code assistance.",
    icon: Layers3,
  },
  ModelRouting: {
    description: "Dynamic orchestration that aligns intent, role assignment, and VRAM policy.",
    icon: BrainCircuit,
  },
  WorkspaceIntelligence: {
    description: "Cross-file project graph analysis for planning and refactor execution.",
    icon: Bot,
  },
};

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`${endpoint} returned ${response.status}`);
  }

  return (await response.json()) as T;
}

function formatRelativeTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

function getStatusTone(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "active" || normalized === "ok" || normalized === "healthy") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (normalized === "ready") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  }

  if (normalized === "degraded" || normalized === "warning") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  return "border-rose-400/20 bg-rose-500/10 text-rose-100";
}

function getMetricToneClasses(tone: MetricCardProps["tone"]): string {
  if (tone === "good") {
    return "border-emerald-400/15 bg-emerald-500/[0.08]";
  }

  if (tone === "warn") {
    return "border-amber-400/15 bg-amber-500/[0.08]";
  }

  return "border-white/8 bg-white/[0.03]";
}

function SectionPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-slate-950/60 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.25)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "default" }: MetricCardProps) {
  return (
    <div className={`rounded-[24px] border p-5 ${getMetricToneClasses(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-3 text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function FeatureCard({ name, status, description, icon: Icon }: FeatureCardProps) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(status)}`}>
          {status}
        </span>
      </div>
      <h4 className="mt-4 text-lg font-semibold text-white">{name}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
      {message}
    </div>
  );
}

export default function Dashboard() {
  const healthQuery = useQuery({
    queryKey: ["healthz"],
    queryFn: () => fetchJson<HealthResponse>("/api/healthz"),
    refetchInterval: 15_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["system-summary"],
    queryFn: () => fetchJson<SystemSummary>("/api/system/summary"),
    refetchInterval: 20_000,
  });

  const featuresQuery = useQuery({
    queryKey: ["features"],
    queryFn: () => fetchJson<FeatureMap>("/api/features"),
    refetchInterval: 30_000,
  });

  const summary = summaryQuery.data;
  const features = featuresQuery.data ?? {};
  const apiHealthy = healthQuery.data?.status === "ok";
  const detectedAt = summary?.vram.detectedAt ? formatRelativeTime(summary.vram.detectedAt) : "waiting for telemetry";
  const refreshedAt = summaryQuery.dataUpdatedAt
    ? formatRelativeTime(new Date(summaryQuery.dataUpdatedAt).toISOString())
    : "waiting for first sync";
  const vramUsagePercent =
    summary?.vram.totalBytes && summary.vram.freeBytes !== undefined
      ? Math.max(0, Math.min(100, Math.round(((summary.vram.totalBytes - summary.vram.freeBytes) / summary.vram.totalBytes) * 100)))
      : 0;

  const featureCards = Object.entries(features).map(([name, status]) => ({
    name,
    status,
    description: FEATURE_COPY[name]?.description ?? "Sovereign capability is exposed through the local control plane.",
    icon: FEATURE_COPY[name]?.icon ?? Sparkles,
  }));

  const summaryError = summaryQuery.error instanceof Error ? summaryQuery.error.message : null;
  const featuresError = featuresQuery.error instanceof Error ? featuresQuery.error.message : null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-slate-950/70 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.35)] lg:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Live control plane</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Sovereign Dashboard
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-400 lg:text-base">
              This view is backed by live API telemetry. System health, VRAM guard status, runtime details, and
              sovereign feature readiness are fetched directly from the backend rather than inferred from placeholder UI
              state.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">API</p>
              <p className="mt-2 text-lg font-semibold text-white">{apiHealthy ? "Connected" : "Checking"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">VRAM guard</p>
              <p className="mt-2 text-lg font-semibold text-white">{summary?.vram.mode ?? "Pending"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last sync</p>
              <p className="mt-2 text-lg font-semibold text-white">{refreshedAt}</p>
            </div>
          </div>
        </div>
      </section>

      {summaryError ? <ErrorBanner message={`System summary failed to load: ${summaryError}`} /> : null}
      {featuresError ? <ErrorBanner message={`Feature map failed to load: ${featuresError}`} /> : null}

      {summaryQuery.isPending && !summary ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Server}
            label="Runtime uptime"
            value={summary?.uptime.human ?? "Pending"}
            detail={summary?.uptime.startedAt ? `Started ${formatRelativeTime(summary.uptime.startedAt)}` : "Waiting for API summary"}
            tone="good"
          />
          <MetricCard
            icon={Cpu}
            label="Node runtime"
            value={summary?.node.version ?? "Pending"}
            detail={summary ? `PID ${summary.node.pid} on ${summary.os.hostname}` : "Node metadata unavailable"}
          />
          <MetricCard
            icon={HardDrive}
            label="Installed models"
            value={summary ? String(summary.ollama.installedModels) : "Pending"}
            detail={
              summary
                ? `${summary.ollama.runningModels} loaded, ${summary.ollama.totalRunningVramFormatted} in active VRAM`
                : "Ollama inventory unavailable"
            }
            tone={summary?.ollama.reachable ? "good" : "warn"}
          />
          <MetricCard
            icon={Gauge}
            label="VRAM state"
            value={summary?.vram.status ?? "Pending"}
            detail={
              summary
                ? `${summary.vram.mode} budget ${summary.vram.safeBudgetFormatted}, sampled ${detectedAt}`
                : "Waiting for GPU telemetry"
            }
            tone={summary?.vram.status === "healthy" ? "good" : "warn"}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <SectionPanel eyebrow="Sovereign modules" title="Implemented capability surface">
          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.length > 0 ? (
              featureCards.map((feature) => (
                <FeatureCard
                  key={feature.name}
                  name={feature.name}
                  status={feature.status}
                  description={feature.description}
                  icon={feature.icon}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-400">
                Waiting for feature telemetry from <code className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-200">/api/features</code>.
              </div>
            )}
          </div>
        </SectionPanel>

        <SectionPanel eyebrow="VRAM telemetry" title="Guardrail and hardware status">
          {summary ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(summary.vram.status)}`}>
                  {summary.vram.status}
                </span>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <RefreshCw className="h-4 w-4" />
                  {detectedAt}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Provider</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {summary.vram.gpuName ? `${summary.vram.provider} · ${summary.vram.gpuName}` : summary.vram.provider}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/70 p-3 text-sky-200">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                    style={{ width: `${vramUsagePercent}%` }}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Used</p>
                    <p className="mt-2 text-lg font-semibold text-white">{summary.vram.usedFormatted}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Free</p>
                    <p className="mt-2 text-lg font-semibold text-white">{summary.vram.freeFormatted}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">{summary.vram.reason}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Safe budget</p>
                  <p className="mt-2 text-lg font-semibold text-white">{summary.vram.safeBudgetFormatted}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reserve</p>
                  <p className="mt-2 text-lg font-semibold text-white">{summary.vram.reserveFormatted}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-400">
              Waiting for <code className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-200">/api/system/summary</code>.
            </div>
          )}
        </SectionPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionPanel eyebrow="Runtime profile" title="Machine and process details">
          {summary ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">Operating system</p>
                <p className="mt-3 text-xl font-semibold text-white">{summary.os.label}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Host {summary.os.hostname} · {summary.os.platform} · {summary.os.arch}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">Process uptime</p>
                <p className="mt-3 text-xl font-semibold text-white">{summary.uptime.human}</p>
                <p className="mt-2 text-sm text-slate-400">Started {formatRelativeTime(summary.uptime.startedAt)}</p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">Ollama reachability</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {summary.ollama.reachable ? "Reachable" : "Unavailable"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {summary.ollama.installedModels} installed models, {summary.ollama.runningModels} loaded
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">Node process</p>
                <p className="mt-3 text-xl font-semibold text-white">{summary.node.version}</p>
                <p className="mt-2 text-sm text-slate-400">PID {summary.node.pid}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-400">
              Runtime details will appear once the backend summary responds.
            </div>
          )}
        </SectionPanel>

        <SectionPanel eyebrow="Data sources" title="Dashboard truth endpoints">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">/api/healthz</p>
                  <p className="mt-1 text-sm text-slate-400">Confirms API liveness for the UI shell.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(apiHealthy ? "ok" : "warning")}`}>
                  {apiHealthy ? "ok" : "checking"}
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">/api/system/summary</p>
                  <p className="mt-1 text-sm text-slate-400">OS, Node, uptime, Ollama, and VRAM guard telemetry.</p>
                </div>
                <Clock3 className="h-5 w-5 text-sky-200" />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">/api/features</p>
                  <p className="mt-1 text-sm text-slate-400">Implemented sovereign capabilities exposed as a feature map.</p>
                </div>
                <Sparkles className="h-5 w-5 text-sky-200" />
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
