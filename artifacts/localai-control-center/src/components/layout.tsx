import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BarChart2, Layers, Box, FolderOpen, Wrench, Trash2, Activity,
  ArrowUpCircle, FileCode2, ScrollText, MessageSquare, Palette,
  Globe, Plug, Settings, Server, ChevronDown, Bell, Search, X, CheckCheck,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useNotifications } from "@/contexts/notifications";
import { CommandPalette } from "@/components/command-palette";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface NavItem { href: string; label: string; icon: React.ElementType }
interface NavGroup { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
    ],
  },
  {
    label: "AI",
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/studios", label: "Studios", icon: Palette },
      { href: "/stack", label: "Components", icon: Layers },
      { href: "/models", label: "Models", icon: Box },
    ],
  },
  {
    label: "Dev",
    items: [
      { href: "/workspace", label: "Workspace", icon: FolderOpen },
      { href: "/continue", label: "Continue", icon: FileCode2 },
    ],
  },
  {
    label: "Maintenance",
    items: [
      { href: "/setup", label: "Setup & Repair", icon: Wrench },
      { href: "/updates", label: "Updates", icon: ArrowUpCircle },
      { href: "/cleanup", label: "Cleanup", icon: Trash2 },
    ],
  },
  {
    label: "Observe",
    items: [
      { href: "/diagnostics", label: "Diagnostics", icon: Activity },
      { href: "/logs", label: "Log Viewer", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/remote", label: "Remote Access", icon: Globe },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const [, setLocation] = useLocation();

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={markAllRead} title="Mark all read">
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors",
                !n.read && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", TYPE_COLORS[n.type])} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", n.read && "text-muted-foreground")}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground/60">
                      {format(n.timestamp, "MMM d, h:mm a")}
                    </span>
                    {n.action && (
                      <button
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => { setLocation(n.action!.href); markRead(n.id); onClose(); }}
                      >
                        {n.action.label} →
                      </button>
                    )}
                    {!n.read && (
                      <button className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(n.id)} className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  const toggleGroup = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const handleCmdK = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen(v => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleCmdK);
    return () => window.removeEventListener("keydown", handleCmdK);
  }, [handleCmdK]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-52 border-r border-border bg-sidebar flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-border gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-foreground tracking-tight">LocalAI</div>
            <div className="text-[10px] text-muted-foreground font-medium tracking-wide">Control Center</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {navGroups.map((group) => {
            const isCollapsed = collapsed[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-2 mb-1 group"
                >
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-muted-foreground/30 transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href} className="block">
                          <div
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "")} />
                            {item.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-card/50 flex items-center justify-end px-6 gap-2 shrink-0">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-md px-3 py-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Search…</span>
            <kbd className="hidden sm:inline text-[10px] bg-background/60 border border-border rounded px-1 py-0.5 ml-1">⌘K</kbd>
          </button>

          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
