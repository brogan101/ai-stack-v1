import { useState } from "react";
import { useGetContinueConfig, useGetContinueRules, useSaveContinueRule, useDeleteContinueRule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2, FileText, Plus, Trash2, Save, RefreshCw, CheckCircle2,
  AlertCircle, Bot, Zap
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetContinueRulesQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const CURATED_RULE_PACKS = [
  {
    id: "fail-loud",
    name: "Fail-Loud Coding Rules",
    filename: "fail-loud.md",
    description: "Require explicit error handling, no silent fallbacks, no placeholder logic",
    content: `# Fail-Loud Coding Rules

You must follow these rules in all code you write or edit:

- Never use silent fallbacks or swallow exceptions without logging them explicitly
- Never use placeholder values, TODO comments, or stub implementations in delivered code
- If an operation can fail, it MUST be handled — no bare except/catch blocks that do nothing
- Log errors with full context: what operation failed, what inputs were used, what the error was
- If you are unsure what to do in an error case, raise an exception and document why
- Prefer explicit over implicit: no "magic" defaults that hide behavior
- Configuration must be validated at startup — fail fast if required config is missing
- Never return null/undefined where an error should be thrown
- Use typed errors, not generic Error with a string message, when the codebase supports it
`,
  },
  {
    id: "python-rules",
    name: "Python Rules",
    filename: "python.md",
    description: "Typing, docstrings, pathlib, modern Python conventions",
    content: `# Python Rules

- Use Python 3.10+ syntax — use match/case where appropriate, use |  for union types
- Always use type annotations for function signatures (parameters and return types)
- Use pathlib.Path for all file path operations — never os.path or string concatenation
- Use dataclasses or Pydantic models for structured data — never plain dicts for typed data
- Write docstrings for all public functions and classes
- Use f-strings for string formatting — no % formatting or .format()
- Use context managers (with statement) for all file, DB, and network resources
- Keep functions small and single-purpose — max ~30 lines as a guideline
- Use list/dict/set comprehensions where they are more readable than loops
- Prefer logging over print() in non-script code
`,
  },
  {
    id: "web-rules",
    name: "Web App Rules (React/Vite)",
    filename: "webapp.md",
    description: "TypeScript, component structure, state management, accessibility",
    content: `# Web App Rules (React/Vite)

- Use TypeScript with strict mode — no any types, no implicit returns without types
- Components must be functional components with explicit prop interfaces
- Keep components focused: one component = one responsibility
- Co-locate state as close to where it is used as possible
- Use React Query (TanStack Query) for server state — no useEffect for data fetching
- Prefer composition over prop drilling — use context sparingly
- All form inputs must be controlled components
- Use semantic HTML — heading hierarchy, aria-labels on interactive elements
- Never inline event handler logic that is more than 2–3 lines — extract to a named function
- Use CSS variables / Tailwind classes — no inline styles except for dynamic values
`,
  },
  {
    id: "repo-cleanup-rules",
    name: "Repo Cleanup Rules",
    filename: "repo-cleanup.md",
    description: "Standards for removing stale code, dead wrappers, and duplicate config",
    content: `# Repo Cleanup Rules

When asked to clean up or audit a codebase:

- List all files you plan to remove before removing any of them
- Classify each file as: safe (no dependencies), moderate (check first), or destructive (explicit approval needed)
- Never delete a file that is referenced by another file without confirming the reference is dead
- Old wrapper scripts (.cmd, .bat, .ps1) are candidates for removal if their functionality is now in the main app
- Duplicate config files must be consolidated — pick the canonical location and remove the copies
- Stale TODO/FIXLOG files can be archived (moved to /archive/) not deleted outright
- After cleanup, verify the remaining code still works by checking imports and references
- Document what was removed in a CHANGELOG entry or cleanup summary
`,
  },
  {
    id: "aider-rules",
    name: "Aider / High-Agency Rules",
    filename: "aider.md",
    description: "Rules for when Aider is running in architect or code mode",
    content: `# Aider / High-Agency Edit Rules

When working as a high-agency coding assistant (Aider or similar):

- Before editing, state exactly which files you will modify and why
- Prefer targeted edits over full file rewrites — only rewrite if the structure is fundamentally broken
- After any refactor, check that all callers/importers of changed APIs still compile
- Do not add dependencies without flagging them — list any new packages required
- Do not change public APIs without explicit instruction
- When fixing bugs, state the root cause before writing the fix
- After implementing, describe what you changed and what you did NOT change
- Flag any assumptions you made that should be verified by the user
- If multiple valid approaches exist, briefly describe the tradeoffs before picking one
`,
  },
];

export default function ContinuePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<{ filename: string; content: string } | null>(null);
  const [newRuleName, setNewRuleName] = useState("");

  const { data: configData, isLoading: configLoading } = useGetContinueConfig();
  const { data: rulesData, isLoading: rulesLoading } = useGetContinueRules();

  const saveRule = useSaveContinueRule({
    mutation: {
      onSuccess: (result) => {
        toast({ title: result.success ? "Rule saved" : "Save failed", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) {
          setEditingRule(null);
          setNewRuleName("");
          queryClient.invalidateQueries({ queryKey: getGetContinueRulesQueryKey() });
        }
      },
    },
  });

  const deleteRule = useDeleteContinueRule({
    mutation: {
      onSuccess: (result) => {
        toast({ title: result.success ? "Rule deleted" : "Delete failed", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) queryClient.invalidateQueries({ queryKey: getGetContinueRulesQueryKey() });
      },
    },
  });

  const installPack = (pack: typeof CURATED_RULE_PACKS[0]) => {
    saveRule.mutate({ data: { filename: pack.filename, content: pack.content } });
    toast({ title: `Installing "${pack.name}"...`, description: pack.filename });
  };

  const models = configData?.models ?? [];
  const rules = rulesData?.rules ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Continue Config</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Continue AI extension configuration, model roles, and rules packs
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="overview"><Settings2 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="rules"><FileText className="w-4 h-4 mr-2" />Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="packs"><Zap className="w-4 h-4 mr-2" />Rule Packs</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Config Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {configLoading ? (
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {configData?.configExists ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {configData?.configExists ? "config.json found" : "config.json not found"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{configData?.configPath}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={cn("w-5 h-5 shrink-0", rules.length > 0 ? "text-green-400" : "text-slate-500")} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{rules.length} rule file{rules.length !== 1 ? "s" : ""} installed</div>
                      <div className="text-xs text-muted-foreground font-mono">{configData?.rulesDir}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {models.length > 0 && (
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Configured Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {models.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium text-foreground">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.provider} · {m.model}</div>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{m.provider}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!configData?.configExists && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Continue not configured</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Install the Continue extension in VS Code, then run it once to generate a config.json.
                      The rules packs below will work once the config directory exists.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules tab */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {/* New rule */}
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                New Rule File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!editingRule ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="filename.md"
                    value={newRuleName}
                    onChange={e => setNewRuleName(e.target.value)}
                    className="font-mono text-sm max-w-xs"
                  />
                  <Button
                    onClick={() => {
                      const name = newRuleName.trim();
                      if (!name) return;
                      const safeName = name.endsWith(".md") ? name : `${name}.md`;
                      setEditingRule({ filename: safeName, content: `# ${safeName.replace(".md", "")}\n\n` });
                    }}
                    disabled={!newRuleName.trim()}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-mono text-primary">{editingRule.filename}</div>
                  <textarea
                    className="w-full h-64 bg-background border border-border rounded-md p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editingRule.content}
                    onChange={e => setEditingRule({ ...editingRule, content: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveRule.mutate({ data: { filename: editingRule.filename, content: editingRule.content } })}
                      disabled={saveRule.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveRule.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingRule(null); setNewRuleName(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing rules */}
          {rulesLoading ? (
            <div className="text-muted-foreground text-sm flex items-center gap-2 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading rules...
            </div>
          ) : rules.length === 0 ? (
            <Card className="border-border bg-card/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No rule files found</p>
                <p className="text-xs mt-1">Install a rule pack below or create a new file above</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <Card key={rule.filename} className="border-border bg-card/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono text-foreground">{rule.filename}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{rule.sizeBytes} bytes</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                          onClick={() => deleteRule.mutate({ filename: rule.filename })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <pre className="text-xs text-muted-foreground bg-background/50 rounded p-3 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                      {rule.content.slice(0, 300)}{rule.content.length > 300 ? "..." : ""}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rule packs tab */}
        <TabsContent value="packs" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Curated rule packs for common workflows. Installing a pack creates a rules file that Continue reads automatically.
          </p>
          <div className="grid gap-4">
            {CURATED_RULE_PACKS.map(pack => {
              const installed = rules.some(r => r.filename === pack.filename);
              return (
                <Card key={pack.id} className={cn("border-border bg-card/50", installed && "border-green-500/20")}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{pack.name}</span>
                        {installed && (
                          <Badge className="bg-green-400/10 text-green-400 border-green-400/20 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{pack.description}</p>
                      <code className="text-xs text-muted-foreground/60 font-mono mt-1 block">{pack.filename}</code>
                    </div>
                    <Button
                      size="sm"
                      variant={installed ? "outline" : "default"}
                      onClick={() => installPack(pack)}
                      disabled={saveRule.isPending}
                      className="shrink-0"
                    >
                      {installed ? (
                        <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reinstall</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5 mr-1.5" /> Install</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
