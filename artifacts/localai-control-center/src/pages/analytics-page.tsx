import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, TrendingUp, TrendingDown, Cpu, HardDrive, Zap, RefreshCcw } from "lucide-react";
import { subDays, format, eachDayOfInterval } from "date-fns";

type Range = "7d" | "30d" | "90d";

function generateDailyData(days: number) {
  const now = new Date();
  return eachDayOfInterval({ start: subDays(now, days - 1), end: now }).map((date, i) => {
    const base = 65 + Math.sin(i * 0.4) * 15;
    return {
      date: format(date, "MMM d"),
      healthScore: Math.round(Math.min(100, Math.max(20, base + Math.random() * 10 - 5))),
      requests: Math.round(40 + Math.random() * 80),
      tokensGenerated: Math.round(15000 + Math.random() * 25000),
      latencyMs: Math.round(250 + Math.random() * 400),
      vramMb: Math.round(6000 + Math.random() * 8000),
    };
  });
}

const COMPONENT_UPTIME = [
  { name: "Ollama", uptime: 72, color: "#3b82f6" },
  { name: "Open WebUI", uptime: 68, color: "#8b5cf6" },
  { name: "LiteLLM", uptime: 45, color: "#06b6d4" },
  { name: "code-server", uptime: 30, color: "#10b981" },
  { name: "Cloudflare", uptime: 88, color: "#f59e0b" },
];

const STORAGE_PIE = [
  { name: "Models (.ollama)", value: 42.3, color: "#3b82f6" },
  { name: "Open WebUI data", value: 8.1, color: "#8b5cf6" },
  { name: "Project workspaces", value: 15.7, color: "#10b981" },
  { name: "Logs & backups", value: 3.4, color: "#f59e0b" },
  { name: "Continue configs", value: 0.8, color: "#ef4444" },
];

const MODEL_USAGE = [
  { model: "qwen3:30b", requests: 312, tokens: 180000, color: "#3b82f6" },
  { model: "qwen2.5-coder:7b", requests: 541, tokens: 210000, color: "#8b5cf6" },
  { model: "deepseek-r1:8b", requests: 198, tokens: 95000, color: "#10b981" },
  { model: "qwen2.5-coder:1.5b", requests: 876, tokens: 320000, color: "#f59e0b" },
  { model: "nomic-embed", requests: 1230, tokens: 450000, color: "#ef4444" },
];

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

const CHART_COLORS = { primary: "#3b82f6", secondary: "#8b5cf6", accent: "#10b981", warn: "#f59e0b" };

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

function StatCard({ label, value, sub, trend, icon }: {
  label: string; value: string; sub?: string; trend?: "up" | "down"; icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="text-primary opacity-80">{icon}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend === "up" ? "+12% vs prev period" : "-8% vs prev period"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const data = useMemo(() => generateDailyData(RANGE_DAYS[range]), [range]);

  const avgHealth = Math.round(data.reduce((s, d) => s + d.healthScore, 0) / data.length);
  const totalRequests = data.reduce((s, d) => s + d.requests, 0);
  const totalTokens = data.reduce((s, d) => s + d.tokensGenerated, 0);
  const avgLatency = Math.round(data.reduce((s, d) => s + d.latencyMs, 0) / data.length);

  const tickInterval = range === "7d" ? 0 : range === "30d" ? 4 : 13;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance metrics and usage trends for your AI stack.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-border">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setRange(range)}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Stack Health" value={`${avgHealth}%`} sub={`Last ${RANGE_DAYS[range]} days`} trend="up" icon={<Zap className="w-6 h-6" />} />
        <StatCard label="Total Requests" value={totalRequests.toLocaleString()} sub="All models combined" trend="up" icon={<BarChart2 className="w-6 h-6" />} />
        <StatCard label="Tokens Generated" value={`${(totalTokens / 1000).toFixed(0)}K`} sub="Across all sessions" trend="up" icon={<Cpu className="w-6 h-6" />} />
        <StatCard label="Avg Latency" value={`${avgLatency}ms`} sub="Response time p50" trend="down" icon={<HardDrive className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stack Health Over Time</CardTitle>
            <CardDescription>Daily health score percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={tickInterval} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Health"]} />
                <Area type="monotone" dataKey="healthScore" stroke={CHART_COLORS.primary} fill="url(#healthGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Storage Breakdown</CardTitle>
            <CardDescription>Managed disk usage (GB)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={STORAGE_PIE} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                  {STORAGE_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} GB`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {STORAGE_PIE.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value} GB</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Request Volume</CardTitle>
            <CardDescription>Inference requests per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={tickInterval} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="requests" fill={CHART_COLORS.secondary} radius={[3, 3, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response Latency (ms)</CardTitle>
            <CardDescription>P50 inference response time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={tickInterval} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}ms`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}ms`, "Latency"]} />
                <Line type="monotone" dataKey="latencyMs" stroke={CHART_COLORS.warn} strokeWidth={2} dot={false} name="Latency" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Component Uptime</CardTitle>
            <CardDescription>Hours online in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={COMPONENT_UPTIME} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} tickFormatter={(v) => `${v}h`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, "Uptime"]} />
                <Bar dataKey="uptime" radius={[0, 3, 3, 0]}>
                  {COMPONENT_UPTIME.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Usage</CardTitle>
            <CardDescription>Request count by model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-1">
              {MODEL_USAGE.map((m) => {
                const max = Math.max(...MODEL_USAGE.map((x) => x.requests));
                const pct = Math.round((m.requests / max) * 100);
                return (
                  <div key={m.model}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-mono">{m.model}</span>
                      <span className="font-medium">{m.requests.toLocaleString()} req</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token Generation Trend</CardTitle>
          <CardDescription>Daily tokens generated across all models</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={tickInterval} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v / 1000).toFixed(1)}K tokens`, "Tokens"]} />
              <Area type="monotone" dataKey="tokensGenerated" stroke={CHART_COLORS.accent} fill="url(#tokenGrad)" strokeWidth={2} dot={false} name="Tokens" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
