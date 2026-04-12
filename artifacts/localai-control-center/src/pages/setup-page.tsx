import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useInspectSetup, 
  getInspectSetupQueryKey,
  useRunRepair,
  RepairRequestMode
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wrench, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SetupPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: setupData, isLoading } = useInspectSetup({ query: { queryKey: getInspectSetupQueryKey() } });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const repair = useRunRepair({
    mutation: {
      onSuccess: () => {
        toast({ title: "Repair Started", description: "Repair tasks have been initiated." });
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: getInspectSetupQueryKey() });
      }
    }
  });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllMissing = () => {
    if (setupData) {
      const missingIds = setupData.items.filter(i => i.status !== 'ok' && i.canRepair).map(i => i.id);
      setSelectedItems(missingIds);
    }
  };

  const handleRepair = (mode: RepairRequestMode) => {
    if (mode === 'selective' && selectedItems.length === 0) return;
    repair.mutate({ data: { itemIds: mode === 'selective' ? selectedItems : [], mode } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup & Repair</h1>
        <p className="text-muted-foreground mt-1">Manage dependencies, CLI tools, and fix broken installations.</p>
      </div>

      {setupData?.isFreshPC && (
        <Alert className="bg-primary/10 text-primary border-primary/20">
          <Info className="h-4 w-4" />
          <AlertTitle>Fresh Installation Detected</AlertTitle>
          <AlertDescription>
            Looks like you're on a new system. We recommend running "Repair All Missing" to provision your AI stack.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg border border-border bg-background">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Healthy
                    </span>
                    <span className="text-xl font-bold">{setupData?.okCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg border border-border bg-background">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" /> Missing/Outdated
                    </span>
                    <span className="text-xl font-bold text-yellow-500">{setupData?.missingCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg border border-border bg-background">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" /> Broken
                    </span>
                    <span className="text-xl font-bold text-red-500">{setupData?.brokenCount}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => handleRepair('selective')} 
                disabled={selectedItems.length === 0 || repair.isPending}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Repair Selected ({selectedItems.length})
              </Button>
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => handleRepair('all-missing')}
                disabled={repair.isPending || setupData?.missingCount === 0}
              >
                Repair All Missing
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-xs" 
                onClick={selectAllMissing}
              >
                Select All Repairable
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-border bg-card h-full">
            <CardHeader>
              <CardTitle>Dependency Inspection</CardTitle>
              <CardDescription>Status of required system tools and packages.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 w-[50px]"></th>
                        <th className="px-4 py-3 font-medium">Tool</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {setupData?.items.map(item => (
                        <tr key={item.id} className="bg-background hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                              disabled={!item.canRepair}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.name}
                            {item.repairAction && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.repairAction}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                          <td className="px-4 py-3">
                            {item.status === 'ok' ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Installed</Badge>
                            ) : item.status === 'missing' ? (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Missing</Badge>
                            ) : item.status === 'outdated' ? (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Outdated</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Broken</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.version || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
