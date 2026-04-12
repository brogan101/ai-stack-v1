import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjects,
  getListProjectsQueryKey,
  useCreateProject,
  useOpenProject,
  usePinProject,
  useGetWorkspaceReadiness,
  getGetWorkspaceReadinessQueryKey,
  ProjectType,
  OpenProjectRequestMode
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Pin, PinOff, Code, Terminal, Plus, GitBranch, ShieldCheck, AlertCircle, Zap, Layers, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const WORKSPACE_TEMPLATES = [
  {
    id: "python-app",
    label: "Python App",
    icon: "🐍",
    type: "python",
    description: "Python 3 + pyproject.toml + pytest + ruff + typing",
    features: ["pyproject.toml", "src/ layout", "pytest", "ruff linter", "type hints"],
    recommended: { coding: "qwen3-coder:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
  {
    id: "fastapi",
    label: "FastAPI",
    icon: "⚡",
    type: "python",
    description: "FastAPI + Pydantic v2 + SQLAlchemy + alembic + uvicorn",
    features: ["FastAPI", "Pydantic v2", "SQLAlchemy", "alembic migrations", "uvicorn dev"],
    recommended: { coding: "qwen3-coder:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
  {
    id: "react-vite",
    label: "React / Vite",
    icon: "⚛️",
    type: "node",
    description: "React 18 + Vite + TypeScript + Tailwind + shadcn/ui",
    features: ["React 18", "Vite", "TypeScript strict", "Tailwind CSS", "shadcn/ui"],
    recommended: { coding: "qwen3-coder:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
  {
    id: "electron-tauri",
    label: "Electron / Tauri",
    icon: "🖥️",
    type: "node",
    description: "Desktop app with Tauri (Rust) or Electron wrapper",
    features: ["Tauri or Electron", "React frontend", "Native system access", "Auto-updater"],
    recommended: { coding: "qwen3-coder:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
  {
    id: "dotnet-console",
    label: ".NET Console App",
    icon: "🟦",
    type: "dotnet",
    description: ".NET 9 Console App with typed options, serilog, and DI",
    features: [".NET 9", "Serilog", "Dependency Injection", "Typed settings"],
    recommended: { coding: "qwen3-coder:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
  {
    id: "docs-spec",
    label: "Docs / Spec Repo",
    icon: "📚",
    type: "docs",
    description: "Markdown docs repo with MkDocs or VitePress + Vale linter",
    features: ["MkDocs / VitePress", "Vale prose linter", "Conventional commits", "CHANGELOG"],
    recommended: { coding: "qwen3:30b", fast: "qwen2.5-coder:7b", autocomplete: "qwen2.5-coder:1.5b" },
  },
];

const AIDER_PROFILES = [
  {
    id: "ask",
    label: "Ask Mode",
    icon: "💬",
    description: "Discuss code and architecture without making any edits",
    flag: "--no-auto-commits --no-dirty-commits",
    mode: "ask",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    useCase: "Best for: code review, planning, explaining bugs",
  },
  {
    id: "code",
    label: "Code Mode",
    icon: "✏️",
    description: "Targeted code edits with full control — Aider's default mode",
    flag: "",
    mode: "code",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    useCase: "Best for: implementing features, bug fixes",
  },
  {
    id: "architect",
    label: "Architect Mode",
    icon: "🏗️",
    description: "Two-step: reason about changes first, then apply them (uses more tokens)",
    flag: "--architect",
    mode: "architect",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    useCase: "Best for: large refactors, new features, complex problems",
  },
  {
    id: "architect-lint",
    label: "Architect + Verify",
    icon: "🔬",
    description: "Architect mode with auto-lint and test runner after each edit",
    flag: "--architect --auto-lint --auto-test",
    mode: "architect",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    useCase: "Best for: production code, requires lint + tests configured",
  },
];

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    type: "node",
    bootstrapRepo: true,
    openInVscode: true,
    openAider: false
  });

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: readinessData, isLoading: isLoadingReadiness } = useGetWorkspaceReadiness({ query: { queryKey: getGetWorkspaceReadinessQueryKey() } });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project Created", description: "Your new workspace is ready." });
        setIsCreateOpen(false);
        setSelectedTemplate(null);
        setNewProject({ name: "", path: "", type: "node", bootstrapRepo: true, openInVscode: true, openAider: false });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      }
    }
  });

  const openProject = useOpenProject({
    mutation: {
      onSuccess: () => toast({ title: "Project Opened", description: "Launched in your editor." })
    }
  });

  const pinProject = usePinProject({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.path) return;
    createProject.mutate({ data: newProject });
  };

  const handleOpen = (id: string, mode: OpenProjectRequestMode) => {
    openProject.mutate({ projectId: id, data: { mode } });
  };

  const applyTemplate = (tmpl: typeof WORKSPACE_TEMPLATES[0]) => {
    setSelectedTemplate(tmpl.id);
    setNewProject(p => ({ ...p, type: tmpl.type }));
    setIsCreateOpen(true);
  };

  const projectTypes = Object.entries(ProjectType).map(([k, v]) => ({ value: v, label: k }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace</h1>
          <p className="text-muted-foreground text-sm mt-1">Projects, templates, and Aider launch profiles</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={v => { setIsCreateOpen(v); if (!v) setSelectedTemplate(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI-Ready Project</DialogTitle>
              <DialogDescription>
                {selectedTemplate
                  ? `Template: ${WORKSPACE_TEMPLATES.find(t => t.id === selectedTemplate)?.label}`
                  : "Scaffold a new project with AI tools pre-configured."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="my-app" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="path">Path</Label>
                <Input id="path" value={newProject.path} onChange={e => setNewProject({ ...newProject, path: e.target.value })} placeholder="C:\dev\my-app" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select value={newProject.type} onValueChange={v => setNewProject({ ...newProject, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="git" checked={newProject.bootstrapRepo} onCheckedChange={c => setNewProject({ ...newProject, bootstrapRepo: !!c })} />
                  <Label htmlFor="git" className="font-normal">Initialize Git repository</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="vscode" checked={newProject.openInVscode} onCheckedChange={c => setNewProject({ ...newProject, openInVscode: !!c })} />
                  <Label htmlFor="vscode" className="font-normal">Open in VS Code when done</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="aider" checked={newProject.openAider} onCheckedChange={c => setNewProject({ ...newProject, openAider: !!c })} />
                  <Label htmlFor="aider" className="font-normal">Launch Aider automatically</Label>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => { setIsCreateOpen(false); setSelectedTemplate(null); }}>Cancel</Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="projects">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="projects"><FolderOpen className="w-4 h-4 mr-2" />Projects</TabsTrigger>
          <TabsTrigger value="templates"><Layers className="w-4 h-4 mr-2" />Templates</TabsTrigger>
          <TabsTrigger value="aider"><Bot className="w-4 h-4 mr-2" />Aider Profiles</TabsTrigger>
        </TabsList>

        {/* Projects tab */}
        <TabsContent value="projects" className="mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingProjects ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectsData?.projects.map(project => (
                        <Card key={project.id} className="bg-background border-border shadow-sm">
                          <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                            <div className="truncate pr-2">
                              <CardTitle className="text-sm truncate">{project.name}</CardTitle>
                              <CardDescription className="text-xs font-mono mt-1 truncate">{project.path}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className={cn("h-7 w-7 -mt-1 -mr-1", project.pinned ? "text-primary" : "text-muted-foreground")} onClick={() => pinProject.mutate({ projectId: project.id })}>
                              {project.pinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                            </Button>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 pb-2 flex gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase">{project.type}</Badge>
                            {project.hasGit && <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]"><GitBranch className="w-3 h-3 mr-1" />Git</Badge>}
                            {project.aiReadiness === "ready" && <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]"><ShieldCheck className="w-3 h-3 mr-1" />AI Ready</Badge>}
                            {project.aiReadiness === "partial" && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>}
                          </CardContent>
                          <CardFooter className="p-2 border-t border-border/50 flex gap-1.5">
                            <Button variant="secondary" size="sm" className="flex-1 text-xs h-7" onClick={() => handleOpen(project.id, "vscode")}>
                              <Code className="w-3 h-3 mr-1" />VS Code
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1 text-xs h-7" onClick={() => handleOpen(project.id, "vscode-aider")}>
                              <Terminal className="w-3 h-3 mr-1" />+ Aider
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                      {projectsData?.projects.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-lg text-sm">
                          No projects yet. Use Templates to scaffold one.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">AI Readiness</CardTitle>
                  <CardDescription>Global workspace check</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReadiness ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : (
                    <div className="space-y-3">
                      {readinessData?.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-md bg-background border border-border">
                          {item.status === "ok" ? <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
                          <div>
                            <p className="font-medium text-xs text-foreground">{item.label}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{item.message}</p>
                          </div>
                        </div>
                      ))}
                      {readinessData?.recommendations && readinessData.recommendations.length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            {readinessData.recommendations.map((rec, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-primary shrink-0">•</span>{rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Templates tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Pre-configured project templates with the right model roles, linters, and structure for each stack type.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {WORKSPACE_TEMPLATES.map(tmpl => (
              <Card key={tmpl.id} className="border-border bg-card/50 hover:bg-card transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{tmpl.icon}</span>
                    <CardTitle className="text-sm font-semibold">{tmpl.label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{tmpl.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tmpl.features.map(f => (
                      <Badge key={f} variant="outline" className="text-[10px] font-normal">{f}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-primary/60" />
                      <span>Coding: <code className="font-mono">{tmpl.recommended.coding}</code></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-muted-foreground/40" />
                      <span>Autocomplete: <code className="font-mono">{tmpl.recommended.autocomplete}</code></span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-3">
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => applyTemplate(tmpl)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aider Profiles tab */}
        <TabsContent value="aider" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Aider supports distinct modes for different tasks. Launch from a project, or copy the flag to use in your terminal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AIDER_PROFILES.map(profile => (
              <Card key={profile.id} className={cn("border bg-card/50", profile.border)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0", profile.bg)}>
                      {profile.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("font-semibold text-sm", profile.color)}>{profile.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{profile.description}</p>
                      <p className="text-xs text-muted-foreground/70 italic">{profile.useCase}</p>
                    </div>
                  </div>
                  {profile.flag && (
                    <div className="mt-4 bg-background rounded-md px-3 py-2 flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-muted-foreground">aider {profile.flag}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`aider ${profile.flag}`);
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                  {!profile.flag && (
                    <div className="mt-4 bg-background rounded-md px-3 py-2">
                      <code className="text-xs font-mono text-muted-foreground">aider  <span className="text-muted-foreground/50">(default)</span></code>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-primary/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Model selection tip</p>
                  <p className="text-xs text-muted-foreground">
                    Use <code className="font-mono bg-background px-1 py-0.5 rounded">qwen3-coder:30b</code> for architect mode, 
                    <code className="font-mono bg-background px-1 py-0.5 rounded mx-1">qwen2.5-coder:7b</code> for fast code edits, 
                    and <code className="font-mono bg-background px-1 py-0.5 rounded">deepseek-r1:8b</code> for debugging and reasoning. 
                    Set these in the Models page under role assignments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
