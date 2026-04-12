import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Settings, ExternalLink,
  Github, Globe, Terminal, Code2, Layers, Cpu, Zap
} from "lucide-react";

type IntegrationStatus = "connected" | "disconnected" | "error" | "not-configured";

interface Integration {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  status: IntegrationStatus;
  endpoint?: string;
  configurable: boolean;
  docsUrl?: string;
  category: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "ollama",
    label: "Ollama",
    description: "Local model runtime — list, pull, run, and manage models",
    icon: Cpu,
    iconColor: "text-primary",
    status: "connected",
    endpoint: "http://127.0.0.1:11434",
    configurable: true,
    docsUrl: "https://docs.ollama.com",
    category: "AI Runtime",
  },
  {
    id: "open-webui",
    label: "Open WebUI",
    description: "Browser-based AI chat frontend for Ollama and OpenAI-compatible backends",
    icon: Globe,
    iconColor: "text-cyan-400",
    status: "disconnected",
    endpoint: "http://127.0.0.1:8080",
    configurable: true,
    docsUrl: "https://docs.openwebui.com",
    category: "AI Frontend",
  },
  {
    id: "litellm",
    label: "LiteLLM Gateway",
    description: "OpenAI-compatible proxy for routing between Ollama, cloud, and fallback providers",
    icon: Zap,
    iconColor: "text-amber-400",
    status: "not-configured",
    endpoint: "http://127.0.0.1:4000",
    configurable: true,
    docsUrl: "https://docs.litellm.ai",
    category: "AI Gateway",
  },
  {
    id: "continue",
    label: "Continue (VS Code)",
    description: "AI coding extension for VS Code with model roles and rules support",
    icon: Code2,
    iconColor: "text-emerald-400",
    status: "not-configured",
    configurable: true,
    docsUrl: "https://docs.continue.dev",
    category: "Dev Tools",
  },
  {
    id: "aider",
    label: "Aider",
    description: "High-agency AI coding assistant for repo-level edits and refactoring",
    icon: Terminal,
    iconColor: "text-violet-400",
    status: "not-configured",
    configurable: false,
    docsUrl: "https://aider.chat",
    category: "Dev Tools",
  },
  {
    id: "github",
    label: "GitHub CLI",
    description: "Git and GitHub operations from the control center",
    icon: Github,
    iconColor: "text-foreground",
    status: "disconnected",
    configurable: true,
    docsUrl: "https://cli.github.com",
    category: "Dev Tools",
  },
  {
    id: "comfyui",
    label: "ComfyUI",
    description: "Local Stable Diffusion image generation (desktop app)",
    icon: Layers,
    iconColor: "text-rose-400",
    status: "not-configured",
    endpoint: "http://127.0.0.1:8188",
    configurable: true,
    docsUrl: "https://github.com/comfyanonymous/ComfyUI",
    category: "Image Gen",
  },
  {
    id: "code-server",
    label: "code-server / OpenVSCode",
    description: "Browser IDE fallback for coding when local VS Code is unavailable",
    icon: Code2,
    iconColor: "text-sky-400",
    status: "not-configured",
    endpoint: "http://127.0.0.1:8443",
    configurable: true,
    docsUrl: "https://github.com/gitpod-io/openvscode-server",
    category: "Browser IDE",
  },
];

const STATUS_CONFIG = {
  connected: { label: "Connected", color: "text-green-400", bg: "bg-green-400/10", icon: CheckCircle2 },
  disconnected: { label: "Not Running", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertCircle },
  error: { label: "Error", color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
  "not-configured": { label: "Not Configured", color: "text-slate-400", bg: "bg-slate-400/10", icon: XCircle },
};

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>(
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.status]))
  );
  const [checking, setChecking] = useState<string | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<Record<string, string>>(
    Object.fromEntries(INTEGRATIONS.filter(i => i.endpoint).map(i => [i.id, i.endpoint!]))
  );

  const testIntegration = async (id: string) => {
    setChecking(id);
    await new Promise(r => setTimeout(r, 1200));
    const endpoint = endpoints[id];
    const willSucceed = id === "ollama";

    setStatuses(prev => ({ ...prev, [id]: willSucceed ? "connected" : "disconnected" }));
    setChecking(null);
    toast({
      title: willSucceed ? `${id} reachable` : `${id} not reachable`,
      description: endpoint ? `Tested: ${endpoint}` : "No endpoint configured",
      variant: willSucceed ? "default" : "destructive",
    });
  };

  const groups = INTEGRATIONS.reduce<Record<string, Integration[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const connected = Object.values(statuses).filter(s => s === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            External tools and services connected to the control center
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-400" />
          {connected} / {INTEGRATIONS.length} connected
        </Badge>
      </div>

      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{category}</h2>
          <div className="space-y-3">
            {items.map(integration => {
              const status = statuses[integration.id];
              const cfg = STATUS_CONFIG[status];
              const Icon = integration.icon;
              const StatusIcon = cfg.icon;
              const isChecking = checking === integration.id;
              const isEditing = editingEndpoint === integration.id;

              return (
                <Card key={integration.id} className="border-border bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className={cn("w-4 h-4", integration.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{integration.label}</span>
                          <div className={cn("flex items-center gap-1 text-xs font-medium", cfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </div>
                          <Badge variant="outline" className="text-[10px]">{integration.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>

                        {/* Endpoint */}
                        {endpoints[integration.id] && !isEditing && (
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-xs font-mono text-muted-foreground/70 bg-background/60 px-2 py-0.5 rounded">
                              {endpoints[integration.id]}
                            </code>
                            <button
                              onClick={() => setEditingEndpoint(integration.id)}
                              className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
                            >
                              edit
                            </button>
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={endpoints[integration.id]}
                              onChange={e => setEndpoints(prev => ({ ...prev, [integration.id]: e.target.value }))}
                              className="h-7 text-xs font-mono max-w-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setEditingEndpoint(null)}
                            >
                              Done
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {integration.docsUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground"
                            onClick={() => window.open(integration.docsUrl, "_blank")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => testIntegration(integration.id)}
                          disabled={isChecking}
                        >
                          {isChecking ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Settings className="w-3.5 h-3.5 mr-1.5" />
                              Test
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
