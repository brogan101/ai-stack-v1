import { useGetDiagnostics, getGetDiagnosticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, ShieldAlert, RefreshCw, Terminal, Cpu, Database } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function DiagnosticsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useGetDiagnostics({ 
    query: { queryKey: getGetDiagnosticsQueryKey() } 
  });

  const categories = data?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof data.items>) || {};

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'system': return <Cpu className="w-5 h-5" />;
      case 'ai stack': return <Database className="w-5 h-5" />;
      case 'dev tools': return <Terminal className="w-5 h-5" />;
      default: return <ShieldAlert className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostics</h1>
          <p className="text-muted-foreground mt-1">Full system report and environmental health.</p>
        </div>
        <div className="flex items-center gap-4">
          {data?.generatedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Last scanned: {format(new Date(data.generatedAt), 'pp')}
            </span>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading || isRefetching) ? 'animate-spin' : ''}`} />
            Run Full Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <Card key={i} className="border-border bg-card">
                  <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                  <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <Card key={category} className="border-border bg-card">
                <CardHeader className="pb-3 flex flex-row items-center gap-2">
                  <div className="text-primary">{getCategoryIcon(category)}</div>
                  <CardTitle className="text-lg m-0 leading-none">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border divide-y divide-border">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between p-4 bg-background">
                        <div className="flex flex-col gap-1 pr-4">
                          <span className="font-medium text-sm text-foreground">{item.label}</span>
                          <span className="font-mono text-xs text-muted-foreground break-all">{item.value}</span>
                          {item.details && (
                            <span className="text-xs text-muted-foreground mt-1">{item.details}</span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 shrink-0 ${getStatusColor(item.status)}`}>
                          {item.status === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span className="text-xs font-medium uppercase tracking-wider">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card className="border-border bg-card sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-yellow-500" />
                Expert Recommendations
              </CardTitle>
              <CardDescription>Based on the latest diagnostic scan.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : data?.recommendations && data.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mb-2" />
                  <span className="text-sm">No issues detected. Your stack is fully optimized.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
