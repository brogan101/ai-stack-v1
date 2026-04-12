import { useEffect, useRef, useState } from "react";
import { useGetSystemLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Terminal, Filter, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "text-red-400",
  FATAL: "text-red-500",
  WARN: "text-amber-400",
  WARNING: "text-amber-400",
  INFO: "text-sky-400",
  DEBUG: "text-slate-400",
};

type LogSource = "all" | "ollama" | "webui";

export default function LogsPage() {
  const [source, setSource] = useState<LogSource>("all");
  const [lines, setLines] = useState(150);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useGetSystemLogs(
    { source, lines },
    { query: { refetchInterval: 10000, staleTime: 5000 } as any }
  );

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [dataUpdatedAt, autoScroll]);

  const allLines = data?.lines ?? [];
  const filtered = filterLevel === "all"
    ? allLines
    : allLines.filter(l => l.level === filterLevel);

  const sourceLabel: Record<string, string> = { all: "All Sources", ollama: "Ollama", webui: "Open WebUI" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Log Viewer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time logs from Ollama and Open WebUI. Refreshes every 10 seconds.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Source:</span>
          <div className="flex gap-1">
            {(["all", "ollama", "webui"] as LogSource[]).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-colors",
                  source === s
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                {sourceLabel[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Level:</span>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="DEBUG">DEBUG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Lines:</span>
          <Select value={String(lines)} onValueChange={v => setLines(Number(v))}>
            <SelectTrigger className="w-20 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="150">150</SelectItem>
              <SelectItem value="300">300</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Log pane */}
      <Card className="border-border bg-[#0b0f17]">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono flex items-center gap-2 text-muted-foreground">
              <Terminal className="w-4 h-4" />
              {filtered.length} lines · {sourceLabel[source]}
            </CardTitle>
            {data?.truncated && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                Truncated — increase line count
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] overflow-y-auto font-mono text-xs leading-5">
            {isLoading && (
              <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading logs...
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Terminal className="w-8 h-8 opacity-30" />
                <p>No log lines found</p>
                <p className="text-xs opacity-60">On Windows, check %USERPROFILE%\AppData\Local\Ollama\logs\</p>
              </div>
            )}

            {!isLoading && filtered.map((line, i) => {
              const levelColor = line.level ? (LEVEL_COLORS[line.level] || "text-slate-300") : "text-slate-300";
              const sourceBadgeColor = line.source === "ollama" ? "text-purple-400" : line.source === "webui" ? "text-cyan-400" : "text-slate-500";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 px-4 py-0.5 hover:bg-white/[0.02] border-l-2 border-transparent",
                    line.level === "ERROR" || line.level === "FATAL" ? "border-l-red-500/50 bg-red-500/5" : "",
                    line.level === "WARN" || line.level === "WARNING" ? "border-l-amber-400/30" : "",
                  )}
                >
                  {line.timestamp && (
                    <span className="text-slate-600 shrink-0 w-[140px]">{line.timestamp}</span>
                  )}
                  <span className={cn("shrink-0 w-12 text-right", sourceBadgeColor)}>
                    {line.source}
                  </span>
                  {line.level && (
                    <span className={cn("shrink-0 w-10 text-right font-bold", levelColor)}>
                      {line.level.slice(0, 4)}
                    </span>
                  )}
                  <span className="text-slate-300 break-all whitespace-pre-wrap">{line.message}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </Card>

      {!autoScroll && (
        <button
          onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
          className="fixed bottom-6 right-6 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm shadow-lg hover:opacity-90"
        >
          <ArrowDown className="w-4 h-4" />
          Jump to bottom
        </button>
      )}
    </div>
  );
}
