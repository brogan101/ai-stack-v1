import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Code2, Terminal, Box, ImageIcon, ArrowRight, Zap, CheckCircle2,
  AlertCircle, Globe, ExternalLink
} from "lucide-react";

const STUDIOS = [
  {
    id: "coding",
    label: "Coding Studio",
    icon: Code2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    description: "Full AI-assisted coding environment powered by Continue + Aider + Ollama",
    features: [
      "Continue VS Code extension with model roles",
      "Aider for high-agency repo edits",
      "qwen3-coder:30b as primary model",
      "Autocomplete via qwen2.5-coder:1.5b",
      "DeepSeek-R1 for debugging & reasoning",
      "Context profiles for VRAM management",
    ],
    primaryAction: { label: "Open VS Code + Continue", url: "vscode://." },
    secondaryAction: { label: "Launch Aider", url: "#" },
    status: "available",
    models: ["qwen3-coder:30b", "qwen2.5-coder:7b", "deepseek-r1:8b"],
    quickLinks: [
      { label: "Manage Rules", href: "/continue" },
      { label: "Model Roles", href: "/models" },
    ],
  },
  {
    id: "sysadmin",
    label: "Sysadmin Studio",
    icon: Terminal,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    description: "System administration and infrastructure ops with AI assistance",
    features: [
      "AI-assisted PowerShell / Bash scripting",
      "Log analysis and anomaly detection",
      "System health monitoring and repair",
      "Config diff and rollback tools",
      "Diagnostics and preflight checks",
      "Cleanup and maintenance automation",
    ],
    primaryAction: { label: "Open Diagnostics", url: "#" },
    secondaryAction: { label: "View Logs", url: "#" },
    status: "available",
    models: ["qwen3:30b", "deepseek-r1:8b"],
    quickLinks: [
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "Log Viewer", href: "/logs" },
    ],
  },
  {
    id: "cad",
    label: "CAD Studio",
    icon: Box,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    description: "AI-assisted CAD and design workflows — geometry, scripting, and generation",
    features: [
      "OpenSCAD / FreeCAD scripting with AI",
      "Geometry generation from text prompts",
      "Model export and format conversion",
      "AI design review and validation",
      "3D print optimization suggestions",
      "Parametric model assistance",
    ],
    primaryAction: { label: "Coming Soon", url: "#" },
    secondaryAction: null,
    status: "coming-soon",
    models: ["qwen3-coder:30b"],
    quickLinks: [],
  },
  {
    id: "image",
    label: "Image Studio",
    icon: ImageIcon,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    description: "Local image generation and vision tasks via ComfyUI, llava, and Ollama",
    features: [
      "ComfyUI Desktop for Stable Diffusion",
      "llava / gemma3 for vision analysis",
      "Image prompt refinement via chat",
      "Batch processing and upscaling",
      "Model management for image models",
      "ControlNet and LoRA support",
    ],
    primaryAction: { label: "Open ComfyUI", url: "#" },
    secondaryAction: { label: "Vision Chat", url: "#" },
    status: "requires-setup",
    models: ["llava", "gemma3"],
    quickLinks: [
      { label: "Stack Components", href: "/stack" },
    ],
  },
];

const STATUS_CONFIG = {
  available: { label: "Available", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", icon: CheckCircle2 },
  "coming-soon": { label: "Coming Soon", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", icon: AlertCircle },
  "requires-setup": { label: "Requires Setup", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: AlertCircle },
};

export default function StudiosPage() {
  const [activeStudio, setActiveStudio] = useState<string | null>(null);
  const selected = STUDIOS.find(s => s.id === activeStudio);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Studios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Specialized capability workspaces — Coding, Sysadmin, CAD, and Image Generation
        </p>
      </div>

      {/* Studio cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STUDIOS.map(studio => {
          const Icon = studio.icon;
          const statusCfg = STATUS_CONFIG[studio.status as keyof typeof STATUS_CONFIG];
          const StatusIcon = statusCfg.icon;
          const isSelected = activeStudio === studio.id;

          return (
            <Card
              key={studio.id}
              className={cn(
                "border bg-card/50 cursor-pointer transition-all duration-200 hover:bg-card",
                isSelected ? `${studio.border} ring-1 ring-current` : "border-border",
                studio.status === "coming-soon" && "opacity-60"
              )}
              onClick={() => setActiveStudio(isSelected ? null : studio.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", studio.bg)}>
                      <Icon className={cn("w-5 h-5", studio.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{studio.label}</CardTitle>
                      <div className={cn("flex items-center gap-1.5 mt-0.5 text-xs font-medium", statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={cn("w-4 h-4 mt-1 transition-transform text-muted-foreground", isSelected && "rotate-90")} />
                </div>
                <CardDescription className="text-xs mt-2">{studio.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {studio.models.map(m => (
                    <Badge key={m} variant="outline" className="font-mono text-[10px]">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expanded studio detail */}
      {selected && (
        <Card className={cn("border bg-card/30", selected.border)}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <selected.icon className={cn("w-5 h-5", selected.color)} />
              <CardTitle className="text-base">{selected.label} — Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Features */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Capabilities</h3>
                <ul className="space-y-2">
                  {selected.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Zap className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", selected.color)} />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions + links */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Launch</h3>
                  <div className="space-y-2">
                    <Button
                      className={cn("w-full", selected.status !== "available" && "opacity-50 cursor-not-allowed")}
                      disabled={selected.status !== "available"}
                      onClick={() => window.open(selected.primaryAction.url, "_blank")}
                    >
                      {selected.status === "coming-soon" ? (
                        <>Coming Soon</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" />{selected.primaryAction.label}</>
                      )}
                    </Button>
                    {selected.secondaryAction && (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={selected.status !== "available"}
                        onClick={() => window.open(selected.secondaryAction!.url, "_blank")}
                      >
                        {selected.secondaryAction.label}
                      </Button>
                    )}
                  </div>
                </div>

                {selected.quickLinks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Links</h3>
                    <div className="space-y-1.5">
                      {selected.quickLinks.map(link => (
                        <a
                          key={link.href}
                          href={link.href}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Models</h3>
                  <div className="space-y-1.5">
                    {selected.models.map(m => (
                      <div key={m} className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span className="font-mono text-xs text-foreground">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
