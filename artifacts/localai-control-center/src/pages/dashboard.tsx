import { useState, useEffect } from "react";
import {
  useGetStackStatus, getGetStackStatusQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
  useGetStorageSummary, getGetStorageSummaryQueryKey,
  useGetDiagnostics, getGetDiagnosticsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, HardDrive, AlertTriangle, CheckCircle2, Play, Square, ExternalLink,
  Clock, MessageSquare, Cpu, ScrollText, Wrench, BarChart2, Zap, Server,
  RefreshCcw, ArrowRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Chat", icon: MessageSquare, href: "/chat", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", desc: "Start a conversation" },
  { label: "Models", icon: Cpu, href: "/models", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", desc: "Manage Ollama models" },
  { label: "Log Viewer", icon: ScrollText, href: "/logs", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", desc: "Tail live logs" },
  { label: "Diagnostics", icon: Activity, href: "/diagnostics", color: "text-violet-400 bg-violet-400/10 border-violet-400/20", desc: "Run system checks" },
  { label: "Updates", icon: RefreshCcw, href: "/updates", color: "text-sky-400 bg-sky-400/10 border-sky-400/20", desc: "Check for updates" },
  { label: "Analytics", icon: BarChart2, href: "/analytics", color: "text-pink-400 bg-pink-400/10 border-pink-400/20", desc: "View metrics" },
];

function UptimeClock({ since }: { since: Date }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const tick = () => setElapsed(formatDistanceToNow(since, { includeSeconds: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return <span>{elapsed}</span>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [upSince] = useState(() => new Date(Date.now() - 1000 * 60 * 47));

  const { data: stackStatus, isLoading: isLoadingStack } = useGetStackStatus({ query: { queryKey: getGetStackStatusQueryKey() } });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: storage, isLoading: isLoadingStorage } = useGetStorageSummary({ query: { queryKey: getGetStorageSummaryQueryKey() } });
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useGetDiagnostics({ query: { queryKey: getGetDiagnosticsQueryKey() } });

  const healthScore = stackStatus?.healthScore ?? 0;
  const runningCount = stackStatus?.components.filter(c => c.running).length ?? 0;
  const totalCount = stackStatus?.components.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Mission control for your local AI infrastructure.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("http://127.0.0.1:8080", "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" />Open WebUI
          </Button>
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />Start All AI
          </Button>
          <Button variant="destructive" size="sm">
            <Square className="w-4 h-4 mr-2" />Stop All AI
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", healthScore > 50 ? "bg-green-400" : "bg-red-400")} />
          <span>{runningCount}/{totalCount} services running</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Control Center up for <UptimeClock since={upSince} /></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" />
          <span>Ollama · 127.0.0.1:11434</span>
        </div>
        {diagnostics?.recommendations && diagnostics.recommendations.length > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{diagnostics.recommendations.length} recommendation{diagnostics.recommendations.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => setLocation(action.href)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer",
                  action.color
                )}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <div className="text-sm font-semibold leading-tight">{action.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{action.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Activity className="w-4 h-4 mr-2" />Stack Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStack ? <Skeleton className="h-10 w-24" /> : (
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold ${healthScore >= 90 ? 'text-green-500' : healthScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {healthScore}%
                </span>
              </div>
            )}
            <div className="mt-4 flex gap-2 flex-wrap">
              <Badge variant={stackStatus?.ollamaReachable ? "default" : "destructive"} className={stackStatus?.ollamaReachable ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                Ollama
              </Badge>
              <Badge variant={stackStatus?.openWebUIReachable ? "default" : "destructive"} className={stackStatus?.openWebUIReachable ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                WebUI
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Component Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStack ? (
              <div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-6 w-24" />)}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stackStatus?.components.map(comp => (
                  <Badge key={comp.id} variant="outline"
                    className={`flex items-center gap-1.5 ${comp.running ? 'bg-green-500/10 text-green-400 border-green-500/20' : !comp.installed ? 'bg-muted text-muted-foreground' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${comp.running ? 'bg-green-500' : !comp.installed ? 'bg-muted-foreground' : 'bg-yellow-500'}`} />
                    {comp.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" />Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {activity?.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                ) : (
                  activity?.entries.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 text-sm">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-green-500' : entry.status === 'warning' ? 'bg-yellow-500' : entry.status === 'failure' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="flex-1">
                        <p className="text-foreground">{entry.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center"><HardDrive className="w-5 h-5 mr-2 text-primary" />Storage Summary</span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setLocation("/cleanup")}>
                  Cleanup <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStorage ? <Skeleton className="h-20 w-full" /> : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Managed Space</p>
                      <p className="text-2xl font-bold text-foreground">{storage?.totalFormatted}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Models</p>
                      <p className="text-xl font-medium text-primary">{storage?.modelsFormatted}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {storage?.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[200px]">{item.label}</span>
                        <span className="text-foreground font-mono">{item.sizeFormatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center text-yellow-500"><AlertTriangle className="w-5 h-5 mr-2" />Recommended Fixes</span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setLocation("/setup")}>
                  Fix <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDiagnostics ? <Skeleton className="h-16 w-full" /> : (
                <div className="space-y-2">
                  {diagnostics?.recommendations.length === 0 ? (
                    <div className="flex items-center text-sm text-green-500">
                      <CheckCircle2 className="w-4 h-4 mr-2" />All systems operating normally.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {diagnostics?.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>{rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
