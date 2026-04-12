import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Database, Palette, Save, RotateCcw, ShieldCheck } from "lucide-react";

interface SettingsState {
  theme: string;
  sidebarCollapsed: boolean;
  notifications: boolean;
  notifyErrors: boolean;
  notifyUpdates: boolean;
  notifyModelPulls: boolean;
  tokenWarningThreshold: number;
  dailyTokenLimit: number;
  chatHistoryRetention: string;
  autoCheckUpdates: boolean;
  updateInterval: string;
  backupBeforeUpdate: boolean;
  ollamaAutoStart: boolean;
  maxConcurrentModels: number;
  vramAlertThreshold: number;
  defaultChatModel: string;
  defaultCodingModel: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: "dark",
  sidebarCollapsed: false,
  notifications: true,
  notifyErrors: true,
  notifyUpdates: true,
  notifyModelPulls: false,
  tokenWarningThreshold: 8000,
  dailyTokenLimit: 100000,
  chatHistoryRetention: "30d",
  autoCheckUpdates: true,
  updateInterval: "daily",
  backupBeforeUpdate: true,
  ollamaAutoStart: true,
  maxConcurrentModels: 1,
  vramAlertThreshold: 90,
  defaultChatModel: "qwen3:30b",
  defaultCodingModel: "qwen3-coder:30b",
};

const MODELS = ["qwen3-coder:30b", "qwen2.5-coder:7b", "deepseek-r1:8b", "qwen3:30b", "llava"];
const RETENTION_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "forever", label: "Forever" },
  { value: "none", label: "Don't retain" },
];
const UPDATE_INTERVALS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "manual", label: "Manual only" },
];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const save = () => {
    setIsDirty(false);
    toast({ title: "Settings saved", description: "Your preferences have been applied." });
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    setIsDirty(false);
    toast({ title: "Settings reset", description: "Restored to defaults." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Global preferences and behavior configuration</p>
        </div>
        <div className="flex gap-2">
          {isDirty && (
            <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20">Unsaved changes</Badge>
          )}
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={save} disabled={!isDirty}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary/60" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Theme" description="UI color scheme">
            <Select value={settings.theme} onValueChange={v => update("theme", v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Collapsed sidebar" description="Start with sidebar collapsed to save screen space">
            <Switch checked={settings.sidebarCollapsed} onCheckedChange={v => update("sidebarCollapsed", v)} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary/60" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Enable notifications" description="Show in-app toast notifications">
            <Switch checked={settings.notifications} onCheckedChange={v => update("notifications", v)} />
          </SettingRow>
          <SettingRow label="Error alerts">
            <Switch checked={settings.notifyErrors} onCheckedChange={v => update("notifyErrors", v)} disabled={!settings.notifications} />
          </SettingRow>
          <SettingRow label="Update available">
            <Switch checked={settings.notifyUpdates} onCheckedChange={v => update("notifyUpdates", v)} disabled={!settings.notifications} />
          </SettingRow>
          <SettingRow label="Model pull complete">
            <Switch checked={settings.notifyModelPulls} onCheckedChange={v => update("notifyModelPulls", v)} disabled={!settings.notifications} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Token Limits */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary/60" />
            Token Limits
          </CardTitle>
          <CardDescription className="text-xs">Controls for local token usage monitoring</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Warning threshold" description={`Warn when session tokens exceed ${settings.tokenWarningThreshold.toLocaleString()}`}>
            <div className="flex items-center gap-3 w-48">
              <Slider
                value={[settings.tokenWarningThreshold]}
                onValueChange={([v]) => update("tokenWarningThreshold", v)}
                min={1000}
                max={50000}
                step={1000}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">{(settings.tokenWarningThreshold / 1000).toFixed(0)}k</span>
            </div>
          </SettingRow>
          <SettingRow label="Daily token limit" description="Soft limit for total daily token usage">
            <Input
              type="number"
              value={settings.dailyTokenLimit}
              onChange={e => update("dailyTokenLimit", Number(e.target.value))}
              className="w-32 text-sm font-mono"
            />
          </SettingRow>
          <SettingRow label="Chat history retention">
            <Select value={settings.chatHistoryRetention} onValueChange={v => update("chatHistoryRetention", v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary/60" />
            Model Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Default chat model">
            <Select value={settings.defaultChatModel} onValueChange={v => update("defaultChatModel", v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map(m => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Default coding model">
            <Select value={settings.defaultCodingModel} onValueChange={v => update("defaultCodingModel", v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map(m => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Auto-start Ollama" description="Launch Ollama on system startup">
            <Switch checked={settings.ollamaAutoStart} onCheckedChange={v => update("ollamaAutoStart", v)} />
          </SettingRow>
          <SettingRow label="Max concurrent models" description="Limit simultaneous loaded models">
            <div className="flex items-center gap-3 w-40">
              <Slider
                value={[settings.maxConcurrentModels]}
                onValueChange={([v]) => update("maxConcurrentModels", v)}
                min={1}
                max={4}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono text-muted-foreground w-4">{settings.maxConcurrentModels}</span>
            </div>
          </SettingRow>
          <SettingRow label="VRAM alert threshold" description={`Alert when VRAM exceeds ${settings.vramAlertThreshold}%`}>
            <div className="flex items-center gap-3 w-40">
              <Slider
                value={[settings.vramAlertThreshold]}
                onValueChange={([v]) => update("vramAlertThreshold", v)}
                min={50}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-mono text-muted-foreground w-8">{settings.vramAlertThreshold}%</span>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary/60" />
            Updates & Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Auto-check for updates">
            <Switch checked={settings.autoCheckUpdates} onCheckedChange={v => update("autoCheckUpdates", v)} />
          </SettingRow>
          <SettingRow label="Check interval">
            <Select value={settings.updateInterval} onValueChange={v => update("updateInterval", v)} disabled={!settings.autoCheckUpdates}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UPDATE_INTERVALS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Backup before update" description="Create a snapshot before applying any updates">
            <Switch checked={settings.backupBeforeUpdate} onCheckedChange={v => update("backupBeforeUpdate", v)} />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
