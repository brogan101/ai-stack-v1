import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, BarChart2, MessageSquare, Layers, Server, Database,
  FolderOpen, Code2, Wrench, RefreshCcw, Trash2, Activity, ScrollText,
  Globe, Plug, Settings, Search, ArrowRight, Cpu
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  keywords: string[];
}

const ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-4 h-4" />, keywords: ["home", "overview", "health"] },
  { label: "Analytics", href: "/analytics", icon: <BarChart2 className="w-4 h-4" />, keywords: ["charts", "metrics", "graphs", "stats"] },
  { label: "Chat", href: "/chat", icon: <MessageSquare className="w-4 h-4" />, keywords: ["ai", "llm", "conversation"] },
  { label: "Studios", href: "/studios", icon: <Layers className="w-4 h-4" />, keywords: ["coding", "sysadmin", "image", "cad"] },
  { label: "Components", href: "/stack", icon: <Server className="w-4 h-4" />, keywords: ["stack", "ollama", "webui", "services", "start", "stop"] },
  { label: "Models", href: "/models", icon: <Cpu className="w-4 h-4" />, keywords: ["ollama", "pull", "roles", "vram", "embed"] },
  { label: "Workspace", href: "/workspace", icon: <FolderOpen className="w-4 h-4" />, keywords: ["projects", "aider", "templates"] },
  { label: "Continue", href: "/continue", icon: <Code2 className="w-4 h-4" />, keywords: ["config", "rules", "vscode", "copilot"] },
  { label: "Setup & Repair", href: "/setup", icon: <Wrench className="w-4 h-4" />, keywords: ["install", "repair", "winget"] },
  { label: "Updates", href: "/updates", icon: <RefreshCcw className="w-4 h-4" />, keywords: ["upgrade", "pip", "packages"] },
  { label: "Cleanup", href: "/cleanup", icon: <Trash2 className="w-4 h-4" />, keywords: ["stale", "delete", "free space"] },
  { label: "Diagnostics", href: "/diagnostics", icon: <Activity className="w-4 h-4" />, keywords: ["health", "check", "tools", "paths"] },
  { label: "Log Viewer", href: "/logs", icon: <ScrollText className="w-4 h-4" />, keywords: ["logs", "output", "errors"] },
  { label: "Remote Access", href: "/remote", icon: <Globe className="w-4 h-4" />, keywords: ["cloudflare", "tunnel", "tailscale", "vpn"] },
  { label: "Integrations", href: "/integrations", icon: <Plug className="w-4 h-4" />, keywords: ["connections", "apis", "status"] },
  { label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" />, keywords: ["theme", "preferences", "tokens"] },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const filtered = query.trim()
    ? ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      })
    : ITEMS;

  const navigate = useCallback((href: string) => {
    setLocation(href);
    onClose();
    setQuery("");
  }, [setLocation, onClose]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border-border bg-card">
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="border-0 bg-transparent focus-visible:ring-0 text-sm py-4 px-0 h-12"
          />
          <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No results for "{query}"</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.href}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent text-foreground transition-colors group"
                onClick={() => navigate(item.href)}
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.icon}</span>
                <span>{item.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded mr-1.5">↑↓</kbd>Navigate</span>
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded mr-1.5">↵</kbd>Open</span>
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded mr-1.5">⌘K</kbd>Toggle</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
