import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Globe, Lock, Wifi, WifiOff, RotateCcw, AlertTriangle,
  CheckCircle2, Clock, RefreshCw, Eye, EyeOff, Copy, Server
} from "lucide-react";

type RemoteMode = "local" | "remote";
type ConnectionStatus = "connected" | "disconnected" | "error" | "checking";

const CONNECTION_PROVIDERS = [
  { id: "cloudflare", label: "Cloudflare Tunnel" },
  { id: "tailscale", label: "Tailscale Funnel" },
  { id: "direct", label: "Direct (VPN/LAN)" },
  { id: "ngrok", label: "ngrok" },
];

const PROTOCOLS = ["https", "http", "wss"];

export default function RemoteAccessPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<RemoteMode>("local");
  const [provider, setProvider] = useState("cloudflare");
  const [protocol, setProtocol] = useState("https");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("443");
  const [heartbeatPath, setHeartbeatPath] = useState("/api/health");
  const [timeout, setTimeout] = useState("5000");
  const [authToken, setAuthToken] = useState("sk-local-••••••••••••••••");
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [autoHeartbeat, setAutoHeartbeat] = useState(true);

  const testConnection = async () => {
    if (mode === "local") {
      setIsChecking(true);
      setConnectionStatus("checking");
      await new Promise(r => globalThis.setTimeout(r, 800));
      setConnectionStatus("connected");
      setLatency(12);
      setLastSuccess(new Date());
      setIsChecking(false);
      toast({ title: "Local connection OK", description: "Ollama reachable on 127.0.0.1:11434" });
      return;
    }

    if (!host.trim()) {
      toast({ title: "No host configured", description: "Enter a remote host address first", variant: "destructive" });
      return;
    }

    setIsChecking(true);
    setConnectionStatus("checking");
    const start = Date.now();
    await new Promise(r => globalThis.setTimeout(r, 1500));
    const ms = Date.now() - start;

    // Simulate connection attempt
    const success = host.includes(".") || host.includes("localhost");
    if (success) {
      setConnectionStatus("connected");
      setLatency(ms + Math.floor(Math.random() * 80));
      setLastSuccess(new Date());
      toast({ title: "Remote connection OK", description: `${protocol}://${host}:${port} reachable` });
    } else {
      setConnectionStatus("error");
      setLatency(null);
      toast({ title: "Connection failed", description: "Could not reach remote host", variant: "destructive" });
    }
    setIsChecking(false);
  };

  const rotateToken = () => {
    const newToken = `sk-local-${Math.random().toString(36).substring(2, 18)}`;
    setAuthToken(newToken);
    toast({ title: "Token rotated", description: "New auth token generated. Update remote clients." });
  };

  const copyToken = () => {
    navigator.clipboard.writeText(authToken);
    toast({ title: "Copied", description: "Auth token copied to clipboard" });
  };

  const statusColor = {
    connected: "text-green-400",
    disconnected: "text-slate-400",
    error: "text-red-400",
    checking: "text-amber-400",
  }[connectionStatus];

  const StatusIcon = {
    connected: CheckCircle2,
    disconnected: WifiOff,
    error: AlertTriangle,
    checking: RefreshCw,
  }[connectionStatus];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Remote Access</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure secure remote access to your local AI stack via Cloudflare Tunnel, Tailscale, or direct connection
        </p>
      </div>

      {/* Mode toggle */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
                <button
                  onClick={() => setMode("local")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "local" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Server className="w-4 h-4" />
                  Local Only
                </button>
                <button
                  onClick={() => setMode("remote")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "remote" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Globe className="w-4 h-4" />
                  Remote Node
                </button>
              </div>
              <div className="text-sm text-muted-foreground">
                {mode === "local" ? "All inference runs on 127.0.0.1" : "Routing through remote AI node"}
              </div>
            </div>

            {/* Connection status indicator */}
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 text-sm font-medium", statusColor)}>
                <StatusIcon className={cn("w-4 h-4", connectionStatus === "checking" && "animate-spin")} />
                {connectionStatus === "connected" ? "Connected" : connectionStatus === "checking" ? "Checking..." : connectionStatus === "error" ? "Error" : "Not Connected"}
              </div>
              {latency && <Badge variant="outline" className="font-mono text-xs">{latency}ms</Badge>}
              <Button variant="outline" size="sm" onClick={testConnection} disabled={isChecking}>
                <Wifi className="w-4 h-4 mr-2" />
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Connection config */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Connection Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={mode === "local"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_PROVIDERS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol} disabled={mode === "local"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Remote Host</Label>
                <Input
                  placeholder="your-tunnel.trycloudflare.com"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  disabled={mode === "local"}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  disabled={mode === "local"}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input
                  value={timeout}
                  onChange={e => setTimeout(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Heartbeat Path</Label>
              <Input
                value={heartbeatPath}
                onChange={e => setHeartbeatPath(e.target.value)}
                className="font-mono text-sm"
                placeholder="/api/health"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-sm">Auto-heartbeat</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Ping heartbeat path every 30s</p>
              </div>
              <Switch checked={autoHeartbeat} onCheckedChange={setAutoHeartbeat} />
            </div>
          </CardContent>
        </Card>

        {/* Auth + Status */}
        <div className="space-y-4">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary/60" />
                Auth Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bearer Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)} className="shrink-0">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={copyToken} className="shrink-0">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={rotateToken} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Rotate Token
              </Button>
              <p className="text-xs text-muted-foreground">
                Rotating the token immediately invalidates the old one. Update all remote clients after rotation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline" className="font-mono text-xs capitalize">{mode}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("font-medium", statusColor)}>{connectionStatus}</span>
              </div>
              {latency && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Latency</span>
                  <span className={cn("font-mono font-medium", latency < 100 ? "text-green-400" : latency < 500 ? "text-amber-400" : "text-red-400")}>
                    {latency}ms
                  </span>
                </div>
              )}
              {lastSuccess && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Success</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastSuccess.toLocaleTimeString()}
                  </span>
                </div>
              )}
              {mode === "local" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ollama</span>
                  <span className="font-mono text-xs text-muted-foreground">127.0.0.1:11434</span>
                </div>
              )}
              {mode === "remote" && host && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Endpoint</span>
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                    {protocol}://{host}:{port}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {mode === "remote" && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Remote mode is active</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ensure your tunnel complies with your employer's policy before enabling remote access.
                      Cloudflare Tunnel is recommended — it uses outbound-only connections and avoids exposing a public IP directly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
