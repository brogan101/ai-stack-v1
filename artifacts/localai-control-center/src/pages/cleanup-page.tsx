import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useScanForCleanup, 
  getScanForCleanupQueryKey,
  useExecuteCleanup
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, AlertTriangle, ShieldCheck, HardDrive, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CleanupPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: scanData, isLoading, refetch } = useScanForCleanup({ query: { queryKey: getScanForCleanupQueryKey() } });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const cleanup = useExecuteCleanup({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cleanup Complete", description: "Selected artifacts were removed." });
        setSelectedIds([]);
        setIsConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: getScanForCleanupQueryKey() });
      }
    }
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectSafe = () => {
    if (scanData) {
      const safeIds = scanData.artifacts.filter(a => a.risk === 'safe').map(a => a.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...safeIds])));
    }
  };

  const handleExecute = () => {
    if (selectedIds.length === 0) return;
    
    // Check if any destructive or moderate items are selected
    const hasRisky = scanData?.artifacts.some(a => 
      selectedIds.includes(a.id) && (a.risk === 'moderate' || a.risk === 'destructive')
    );

    if (hasRisky) {
      setIsConfirmOpen(true);
    } else {
      cleanup.mutate({ data: { artifactIds: selectedIds } });
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'safe': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><ShieldCheck className="w-3 h-3 mr-1" /> Safe</Badge>;
      case 'moderate': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> Moderate</Badge>;
      case 'destructive': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> Destructive</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cleanup</h1>
          <p className="text-muted-foreground mt-1">Remove stale wrappers, obsolete scripts, and free up space.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Rescan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Trash2 className="w-4 h-4 mr-2" />
              Artifacts Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-10 w-24" /> : <div className="text-4xl font-bold">{scanData?.totalFound || 0}</div>}
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Stale Wrappers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-10 w-24" /> : <div className="text-4xl font-bold text-yellow-500">{scanData?.staleWrappers || 0}</div>}
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <HardDrive className="w-4 h-4 mr-2" />
              Space Savable
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-10 w-24" /> : <div className="text-4xl font-bold text-primary">{scanData?.spaceSavable || "0 B"}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scan Results</CardTitle>
            <CardDescription>Select items to clean up.</CardDescription>
          </div>
          <div className="flex gap-2 pr-6">
            <Button variant="outline" size="sm" onClick={selectSafe}>Select All Safe</Button>
            <Button 
              variant={selectedIds.length > 0 ? "destructive" : "secondary"} 
              size="sm" 
              onClick={handleExecute}
              disabled={selectedIds.length === 0 || cleanup.isPending}
            >
              {cleanup.isPending ? "Executing..." : `Execute Cleanup (${selectedIds.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : scanData?.artifacts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <ShieldCheck className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
              <p>System is clean. No obsolete artifacts found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scanData?.artifacts.map(item => (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                  <div className="pt-0.5">
                    <Checkbox 
                      checked={selectedIds.includes(item.id)} 
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{item.description}</span>
                      {getRiskBadge(item.risk)}
                      <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate" title={item.path}>{item.path}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Destructive Action
            </DialogTitle>
            <DialogDescription>
              You have selected items marked as moderate or destructive risk. Deleting these may affect running systems or configurations. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => cleanup.mutate({ data: { artifactIds: selectedIds } })}>
              Yes, proceed with cleanup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
