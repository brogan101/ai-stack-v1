import { useState } from "react";
import { useCheckUpdates, useRunUpdates } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, ArrowUpCircle, CheckCircle2, AlertCircle, HelpCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  winget: "winget",
  pip: "pip",
  ollama: "Ollama",
};

const STATUS_CONFIG = {
  ok: { color: "text-green-400", bg: "bg-green-400/10", icon: CheckCircle2, label: "Up to date" },
  "update-available": { color: "text-amber-400", bg: "bg-amber-400/10", icon: ArrowUpCircle, label: "Update available" },
  unknown: { color: "text-slate-400", bg: "bg-slate-400/10", icon: HelpCircle, label: "Unknown" },
  error: { color: "text-red-400", bg: "bg-red-400/10", icon: AlertCircle, label: "Error" },
};

export default function UpdatesPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useCheckUpdates({
    query: { staleTime: 1000 * 60 * 5 },
  });

  const runUpdates = useRunUpdates({
    mutation: {
      onSuccess: (result) => {
        toast({ title: result.success ? "Updates started" : "Update failed", description: result.message, variant: result.success ? "default" : "destructive" });
        setSelected(new Set());
      },
    },
  });

  const items = data?.items ?? [];
  const updateCount = data?.updatesAvailable ?? 0;

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(items.filter(i => i.updateAvailable).map(i => i.id)));
  const clearAll = () => setSelected(new Set());

  const groupedByCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Updates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check and install updates for managed tools via winget, pip, and Ollama
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              onClick={() => runUpdates.mutate({ itemIds: Array.from(selected) })}
              disabled={runUpdates.isPending}
              className="bg-primary/90 hover:bg-primary"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Update {selected.size} Selected
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            {isFetching ? "Checking..." : "Check Now"}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="w-8 h-8 text-primary/70" />
              <div>
                <div className="text-2xl font-bold text-foreground">{items.length}</div>
                <div className="text-xs text-muted-foreground">Managed tools</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowUpCircle className={cn("w-8 h-8", updateCount > 0 ? "text-amber-400" : "text-green-400")} />
              <div>
                <div className="text-2xl font-bold text-foreground">{updateCount}</div>
                <div className="text-xs text-muted-foreground">Updates available</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "ok").length}</div>
                <div className="text-xs text-muted-foreground">Up to date</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary/50" />
          <p>Checking for updates...</p>
          <p className="text-xs mt-1">This may take 30–60 seconds</p>
        </div>
      )}

      {!isLoading && data && (
        <div className="space-y-6">
          {/* Select controls */}
          {updateCount > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <button onClick={selectAll} className="hover:text-primary underline-offset-2 hover:underline">Select all with updates</button>
              <span>·</span>
              <button onClick={clearAll} className="hover:text-primary underline-offset-2 hover:underline">Clear</button>
              {selected.size > 0 && <span className="text-primary font-medium">{selected.size} selected</span>}
            </div>
          )}

          {Object.entries(groupedByCategory).map(([category, catItems]) => (
            <Card key={category} className="border-border bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
                    {CATEGORY_LABELS[category] || category}
                  </Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    {catItems.filter(i => i.updateAvailable).length} update{catItems.filter(i => i.updateAvailable).length !== 1 ? "s" : ""} available
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {catItems.map((item) => {
                    const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                    const Icon = cfg.icon;
                    return (
                      <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        {item.updateAvailable && (
                          <Checkbox
                            checked={selected.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        )}
                        {!item.updateAvailable && <div className="w-4" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{item.name}</span>
                            {item.updateAvailable && (
                              <Badge className="bg-amber-400/15 text-amber-400 border-amber-400/20 text-xs">
                                Update
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {item.currentVersion && <span>Current: <code className="font-mono">{item.currentVersion}</code></span>}
                            {item.availableVersion && (
                              <>
                                <span>→</span>
                                <span className="text-amber-400">
                                  Available: <code className="font-mono">{item.availableVersion}</code>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {data.checkedAt && (
            <p className="text-xs text-muted-foreground text-right">
              Last checked: {new Date(data.checkedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
