import { useState } from "react";
import {
  useGetStackStatus, getGetStackStatusQueryKey,
  useStartComponent, useStopComponent, useRestartComponent
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Play, Square, RotateCw, Download, Terminal, Settings, ExternalLink, Search, PlayCircle, StopCircle } from "lucide-react";
import { SiOllama, SiPython, SiGit, SiGithub, SiNodedotjs, SiRust } from "react-icons/si";
import { cn } from "@/lib/utils";

const PORT_MAP: Record<string, { port: number; openable: boolean }> = {
  ollama: { port: 11434, openable: true },
  "open-webui": { port: 8080, openable: true },
  litellm: { port: 4000, openable: true },
  "code-server": { port: 8443, openable: true },
  "openvscode-server": { port: 3000, openable: true },
};

const CATEGORY_MAP: Record<string, string> = {
  ollama: "Core AI",
  "open-webui": "Core AI",
  litellm: "Core AI",
  python: "Dev Tools",
  git: "Dev Tools",
  github: "Dev Tools",
  node: "Dev Tools",
  dotnet: "Dev Tools",
  rust: "Dev Tools",
  aider: "Dev Tools",
  nvitop: "Dev Tools",
  continue: "Dev Tools",
  "windows-terminal": "Dev Tools",
  "code-server": "Optional",
  "openvscode-server": "Optional",
  cloudflare: "Optional",
  comfyui: "Optional",
};

const CATEGORY_ORDER = ["Core AI", "Dev Tools", "Optional"];

function getCategory(compId: string): string {
  const key = compId.toLowerCase();
  for (const [pattern, cat] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(pattern)) return cat;
  }
  return "Other";
}

function getPort(compId: string) {
  const key = compId.toLowerCase();
  for (const [pattern, info] of Object.entries(PORT_MAP)) {
    if (key.includes(pattern)) return info;
  }
  return null;
}

function getIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("ollama")) return <SiOllama className="w-5 h-5 text-blue-400" />;
  if (n.includes("code")) return <span className="w-5 h-5 text-blue-500 font-bold text-xs flex items-center justify-center">VS</span>;
  if (n.includes("python")) return <SiPython className="w-5 h-5 text-yellow-500" />;
  if (n.includes("git") && !n.includes("hub")) return <SiGit className="w-5 h-5 text-orange-500" />;
  if (n.includes("github")) return <SiGithub className="w-5 h-5" />;
  if (n.includes("node")) return <SiNodedotjs className="w-5 h-5 text-green-500" />;
  if (n.includes(".net")) return <span className="w-5 h-5 text-purple-500 font-bold text-xs flex items-center justify-center">.N</span>;
  if (n.includes("rust")) return <SiRust className="w-5 h-5 text-orange-700" />;
  if (n.includes("terminal")) return <Terminal className="w-5 h-5" />;
  return <Settings className="w-5 h-5" />;
}

export default function ComponentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const { data: stackStatus, isLoading } = useGetStackStatus({ query: { queryKey: getGetStackStatusQueryKey() } });

  const startComponent = useStartComponent({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetStackStatusQueryKey() }) } });
  const stopComponent = useStopComponent({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetStackStatusQueryKey() }) } });
  const restartComponent = useRestartComponent({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetStackStatusQueryKey() }) } });

  const handleStart = (id: string) => startComponent.mutate({ componentId: id });
  const handleStop = (id: string) => stopComponent.mutate({ componentId: id });
  const handleRestart = (id: string) => restartComponent.mutate({ componentId: id });

  const components = stackStatus?.components ?? [];

  const filtered = components.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const cat = getCategory(c.id);
    const matchCat = categoryFilter === "All" || cat === categoryFilter;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof filtered>>((acc, cat) => {
    const items = filtered.filter(c => getCategory(c.id) === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const coreRunning = components.filter(c => getCategory(c.id) === "Core AI" && c.running).length;
  const coreTotal = components.filter(c => getCategory(c.id) === "Core AI").length;
  const allRunning = components.filter(c => c.running).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Components</h1>
          <p className="text-muted-foreground mt-1">Manage your local AI stack and developer tools.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" title="Start Ollama + WebUI + LiteLLM">
            <PlayCircle className="w-4 h-4" />Start Core AI
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" title="Stop all running services">
            <StopCircle className="w-4 h-4" />Stop All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-muted-foreground">{allRunning} / {components.length} running</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Core AI: {coreRunning}/{coreTotal}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter components…"
            className="pl-8 h-8 w-48 text-sm bg-background"
          />
        </div>
        <div className="flex gap-1">
          {["All", ...CATEGORY_ORDER].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={cn("px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                categoryFilter === cat ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{category}</h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{items.filter(c => c.running).length}/{items.length} running</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(comp => {
                  const portInfo = getPort(comp.id);
                  return (
                    <Card key={comp.id} className="border-border bg-card flex flex-col">
                      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-secondary/50">{getIcon(comp.name)}</div>
                          <div>
                            <CardTitle className="text-base">{comp.name}</CardTitle>
                            <CardDescription className="text-xs font-mono mt-0.5">{comp.version || "Unknown version"}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={comp.running ? "default" : comp.installed ? "secondary" : "outline"}
                            className={comp.running ? "bg-green-500/10 text-green-500 border-green-500/20" : !comp.installed ? "text-muted-foreground" : ""}
                          >
                            {comp.running ? "Running" : comp.installed ? "Stopped" : "Missing"}
                          </Badge>
                          {portInfo && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono">:{portInfo.port}</span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1">
                        {comp.path && (
                          <p className="text-xs text-muted-foreground font-mono truncate" title={comp.path}>{comp.path}</p>
                        )}
                        {comp.statusMessage && (
                          <p className="text-xs text-yellow-500">{comp.statusMessage}</p>
                        )}
                        {portInfo?.openable && comp.running && (
                          <button
                            onClick={() => window.open(`http://127.0.0.1:${portInfo.port}`, "_blank")}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open in browser
                          </button>
                        )}
                      </CardContent>
                      <CardFooter className="pt-3 border-t border-border/50 gap-2 flex-wrap">
                        {comp.installed ? (
                          <>
                            {comp.canStart && !comp.running && (
                              <Button size="sm" variant="default" className="flex-1" onClick={() => handleStart(comp.id)} disabled={startComponent.isPending}>
                                <Play className="w-4 h-4 mr-2" />Start
                              </Button>
                            )}
                            {comp.canStop && comp.running && (
                              <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStop(comp.id)} disabled={stopComponent.isPending}>
                                <Square className="w-4 h-4 mr-2" />Stop
                              </Button>
                            )}
                            {comp.canStart && comp.canStop && comp.running && (
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRestart(comp.id)} disabled={restartComponent.isPending}>
                                <RotateCw className="w-4 h-4 mr-2" />Restart
                              </Button>
                            )}
                          </>
                        ) : (
                          comp.canInstall && (
                            <Button size="sm" variant="secondary" className="w-full">
                              <Download className="w-4 h-4 mr-2" />Install
                            </Button>
                          )
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No components match your filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
