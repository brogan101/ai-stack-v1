import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListModels, 
  getListModelsQueryKey,
  useGetRunningModels,
  getGetRunningModelsQueryKey,
  useGetModelRoles,
  getGetModelRolesQueryKey,
  useUpdateModelRoles,
  usePullModel,
  useDeleteModel
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download, Trash2, Cpu, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ModelsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: listData, isLoading: isLoadingList } = useListModels({ query: { queryKey: getListModelsQueryKey() } });
  const { data: runningData, isLoading: isLoadingRunning } = useGetRunningModels({ query: { queryKey: getGetRunningModelsQueryKey() } });
  const { data: rolesData, isLoading: isLoadingRoles } = useGetModelRoles({ query: { queryKey: getGetModelRolesQueryKey() } });

  const [pullModelName, setPullModelName] = useState("");
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  const pullModel = usePullModel({
    mutation: {
      onSuccess: () => {
        toast({ title: "Pull started", description: "Model pull initiated successfully." });
        setPullModelName("");
        queryClient.invalidateQueries({ queryKey: getListModelsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: "Failed to pull model.", variant: "destructive" });
      }
    }
  });

  const deleteModel = useDeleteModel({
    mutation: {
      onSuccess: () => {
        toast({ title: "Model deleted", description: "The model was deleted successfully." });
        setModelToDelete(null);
        queryClient.invalidateQueries({ queryKey: getListModelsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetModelRolesQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: "Failed to delete model.", variant: "destructive" });
      }
    }
  });

  const updateRoles = useUpdateModelRoles({
    mutation: {
      onSuccess: () => {
        toast({ title: "Roles updated", description: "Model roles saved." });
        queryClient.invalidateQueries({ queryKey: getGetModelRolesQueryKey() });
      }
    }
  });

  const handlePullModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullModelName.trim()) return;
    pullModel.mutate({ data: { modelName: pullModelName } });
  };

  const handleRoleChange = (role: string, model: string) => {
    if (!rolesData) return;
    const newRoles = rolesData.roles.map(r => 
      r.role === role ? { role, model } : { role: r.role, model: r.assignedModel || "" }
    );
    updateRoles.mutate({ data: { roles: newRoles } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Models</h1>
        <p className="text-muted-foreground mt-1">Manage Ollama models, assign roles, and monitor VRAM usage.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Installed Models</CardTitle>
                <CardDescription>
                  {isLoadingList ? "Loading..." : `${listData?.models.length || 0} models installed (${listData?.totalSizeFormatted || '0 B'})`}
                </CardDescription>
              </div>
              <form onSubmit={handlePullModel} className="flex gap-2 w-full max-w-sm">
                <Input 
                  placeholder="llama3:latest" 
                  value={pullModelName} 
                  onChange={(e) => setPullModelName(e.target.value)}
                  className="bg-background"
                  data-testid="input-pull-model"
                />
                <Button type="submit" disabled={pullModel.isPending || !pullModelName} data-testid="btn-pull-model">
                  <Download className="w-4 h-4 mr-2" />
                  Pull
                </Button>
              </form>
            </CardHeader>
            <CardContent>
              {isLoadingList ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {listData?.models.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No models installed.</p>
                  ) : (
                    listData?.models.map(model => (
                      <div key={model.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{model.name}</span>
                            {model.isRunning && (
                              <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Running</Badge>
                            )}
                            {model.vramWarning && (
                              <Badge variant="destructive" className="flex items-center gap-1" title={model.vramWarningMessage}>
                                <AlertTriangle className="w-3 h-3" /> High VRAM
                              </Badge>
                            )}
                            {model.assignedRole && (
                              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{model.assignedRole}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {model.sizeFormatted}</span>
                            {model.parameterSize && <span>{model.parameterSize} params</span>}
                            {model.quantizationLevel && <span>{model.quantizationLevel}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setModelToDelete(model.name)} data-testid={`btn-delete-${model.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Active VRAM Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRunning ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-4">
                  {runningData?.models.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No models currently loaded in memory.</p>
                  ) : (
                    runningData?.models.map(model => (
                      <div key={model.name} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-background/50">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{model.name}</span>
                          <span className="text-sm font-medium text-primary">{model.sizeVramFormatted}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {model.cpuPercent !== undefined && <span>CPU: {model.cpuPercent}%</span>}
                          {model.gpuPercent !== undefined && <span>GPU: {model.gpuPercent}%</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Model Roles</CardTitle>
              <CardDescription>Assign specific models to AI functions across your stack.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRoles || isLoadingList ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {rolesData?.roles.map(role => (
                    <div key={role.role} className="space-y-2">
                      <Label className="flex justify-between items-center">
                        <span className="capitalize">{role.role.replace('-', ' ')}</span>
                        {role.warning && (
                          <span className="text-xs text-yellow-500 flex items-center gap-1" title={role.warning}>
                            <AlertTriangle className="w-3 h-3" /> Warning
                          </span>
                        )}
                      </Label>
                      <Select 
                        value={role.assignedModel || ""} 
                        onValueChange={(val) => handleRoleChange(role.role, val)}
                        disabled={updateRoles.isPending}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">None</SelectItem>
                          {listData?.models.map(m => (
                            <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-mono text-foreground">{modelToDelete}</span>? 
              This action cannot be undone and will free up storage space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelToDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteModel.isPending} onClick={() => modelToDelete && deleteModel.mutate({ modelName: modelToDelete })}>
              {deleteModel.isPending ? "Deleting..." : "Delete Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
