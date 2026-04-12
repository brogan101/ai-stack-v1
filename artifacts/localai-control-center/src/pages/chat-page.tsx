import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Send, Bot, User, Cpu, Zap, Code2, Terminal, Layers, ImageIcon,
  ChevronRight, RotateCcw, Trash2, PanelRight, Clock, Hash, Copy,
  RefreshCw, SlidersHorizontal, ChevronDown, BookOpen, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAPABILITIES = [
  { id: "coding", label: "Coding", icon: Code2, color: "text-emerald-400", model: "qwen3-coder:30b",
    starters: ["Refactor this function to use async/await", "Write unit tests for the UserService class", "Review this code for security issues", "Generate a TypeScript interface from this JSON"] },
  { id: "sysadmin", label: "Sysadmin", icon: Terminal, color: "text-amber-400", model: "qwen3:30b",
    starters: ["Check what's eating my VRAM", "Write a PowerShell script to rotate logs", "How do I schedule a cleanup task in Windows?", "Diagnose why Ollama keeps crashing"] },
  { id: "research", label: "Research", icon: Layers, color: "text-sky-400", model: "qwen3:30b",
    starters: ["Compare LoRA vs QLoRA for fine-tuning", "What's the best context window for coding tasks?", "Summarize the key differences between DeepSeek-R1 and Qwen3", "Explain MoE architecture simply"] },
  { id: "image", label: "Image", icon: ImageIcon, color: "text-violet-400", model: "llava",
    starters: ["Describe this image and extract text", "Generate a prompt for a realistic portrait", "What ComfyUI workflow should I use for upscaling?", "Explain ControlNet usage for style transfer"] },
];

const MODELS = ["qwen3-coder:30b","qwen2.5-coder:7b","deepseek-r1:8b","qwen3:30b","llava","nomic-embed-text"];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokens?: number;
  thinkingSteps?: string[];
  model?: string;
  latencyMs?: number;
}

const MOCK_THINKING = [
  "Analyzing the request context...",
  "Reviewing relevant code patterns...",
  "Checking for edge cases...",
  "Formulating response...",
];

function ThoughtPanel({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <ChevronRight className="w-3 h-3 text-primary/40 shrink-0" />
          <span className="font-mono">{step}</span>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message, showThoughts, onCopy, onRegenerate, isLast }: {
  message: Message; showThoughts: boolean;
  onCopy: (text: string) => void;
  onRegenerate?: () => void;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5", isUser ? "bg-primary/20" : "bg-muted")}>
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={cn("max-w-[80%] space-y-1.5", isUser && "items-end flex flex-col")}>
        {!isUser && message.thinkingSteps && message.thinkingSteps.length > 0 && showThoughts && (
          <div className="bg-muted/30 border border-border/50 rounded-md p-2.5 mb-1">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 font-semibold">Internal Reasoning</div>
            <ThoughtPanel steps={message.thinkingSteps} />
          </div>
        )}
        <div className={cn("rounded-lg px-4 py-2.5 text-sm leading-relaxed", isUser ? "bg-primary/15 text-foreground border border-primary/20" : "bg-card border border-border text-foreground")}>
          <pre className="font-sans whitespace-pre-wrap break-words">{message.content}</pre>
        </div>
        <div className={cn("flex items-center gap-3 text-[10px] text-muted-foreground/50", isUser && "flex-row-reverse")}>
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.tokens && <span className="flex items-center gap-1"><Hash className="w-2.5 h-2.5" />{message.tokens} tok</span>}
          {message.latencyMs && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{message.latencyMs}ms</span>}
          {message.model && !isUser && <span className="font-mono">{message.model}</span>}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
            onClick={() => onCopy(message.content)}
            title="Copy"
          >
            <Copy className="w-3 h-3" />
          </button>
          {!isUser && isLast && onRegenerate && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary flex items-center gap-1"
              onClick={onRegenerate}
              title="Regenerate"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Regen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([{
    id: "1", role: "assistant",
    content: "LocalAI Control Center chat is ready. Select a capability and model above, then start your session. All inference runs locally — no data leaves your machine.",
    timestamp: new Date(), model: "qwen3-coder:30b", tokens: 42, latencyMs: 284, thinkingSteps: [],
  }]);
  const [input, setInput] = useState("");
  const [capability, setCapability] = useState("coding");
  const [model, setModel] = useState("qwen3-coder:30b");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showThoughts, setShowThoughts] = useState(true);
  const [totalTokens, setTotalTokens] = useState(42);
  const [showSettings, setShowSettings] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful local AI assistant. Always be concise and accurate. Never use external APIs.");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const selectedCap = CAPABILITIES.find(c => c.id === capability)!;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied", description: "Message copied to clipboard." }));
  }, [toast]);

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;
    if (!overrideInput) setInput("");
    if (showStarters) setShowStarters(false);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    const thinkingSteps = capability === "coding" ? MOCK_THINKING : [];
    await new Promise(r => setTimeout(r, 400));
    const tok = Math.floor(Math.random() * 300) + 80;
    const lat = Math.floor(Math.random() * 1200) + 300;
    setTotalTokens(prev => prev + tok);
    const responses: Record<string, string> = {
      coding: `Here's how I'd approach that:\n\n\`\`\`python\n# temp=${temperature.toFixed(1)} · top_p=${topP.toFixed(2)} · model=${model}\nresult = solve_problem(input)\nreturn result\n\`\`\`\n\nRunning entirely on your machine via Ollama :11434.`,
      sysadmin: `For system administration:\n\n1. Check current service status\n2. Review logs for anomalies\n3. Apply the fix with a rollback plan\n\nAll operations run locally.`,
      research: `Based on available context (temp=${temperature.toFixed(1)}):\n\nThis response uses ${model} running via Ollama. For deeper research, enable Large Context profile in Components.`,
      image: `Image tasks require a vision-capable model. Currently using ${model}.\n\nFor image generation, run ComfyUI Desktop. For vision analysis, use llava.`,
    };
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(), role: "assistant",
      content: responses[capability] || "Response from local model.",
      timestamp: new Date(), model, tokens: tok, latencyMs: lat, thinkingSteps,
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(false);
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setMessages(prev => prev.filter(m => m.id !== messages[messages.length - 1].id));
    sendMessage(lastUser.content);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground mr-2">Chat</h1>
        <div className="flex gap-1">
          {CAPABILITIES.map(cap => {
            const Icon = cap.icon;
            return (
              <button key={cap.id} onClick={() => { setCapability(cap.id); setModel(cap.model); }}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                  capability === cap.id ? `${cap.color} bg-current/10 border-current/30` : "text-muted-foreground border-border hover:border-muted-foreground"
                )}>
                <Icon className="w-3.5 h-3.5" />{cap.label}
              </button>
            );
          })}
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <Cpu className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map(m => <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1"><Hash className="w-3 h-3" />{totalTokens} tokens</Badge>
          <Button variant="ghost" size="icon" className={cn("h-8 w-8", showSettings && "text-primary")} onClick={() => setShowSettings(v => !v)} title="Temperature & settings">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowThoughts(!showThoughts)} title="Toggle thought panel">
            <PanelRight className={cn("w-4 h-4", showThoughts ? "text-primary" : "text-muted-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => { setMessages([]); setTotalTokens(0); setShowStarters(true); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Card className="mb-3 border-border bg-card/50">
          <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">System Prompt</Label>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="text-xs resize-none min-h-[64px] bg-background border-border font-mono"
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground flex justify-between mb-2">
                  Temperature <span className="text-foreground font-mono">{temperature.toFixed(2)}</span>
                </Label>
                <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={2} step={0.01} />
                <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1"><span>Precise</span><span>Creative</span></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex justify-between mb-2">
                  Top-P <span className="text-foreground font-mono">{topP.toFixed(2)}</span>
                </Label>
                <Slider value={[topP]} onValueChange={([v]) => setTopP(v)} min={0} max={1} step={0.01} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Local · Ollama 11434
        </div>
        <span>·</span>
        <selectedCap.icon className={cn("w-3 h-3", selectedCap.color)} />
        <span className={selectedCap.color}>{selectedCap.label} mode</span>
        <span>·</span>
        <span className="font-mono">{model}</span>
        <span>· temp {temperature.toFixed(1)}</span>
        {isStreaming && <><span>·</span><span className="text-primary animate-pulse">Generating...</span></>}
      </div>

      {/* Messages */}
      <Card className="flex-1 border-border bg-card/30 overflow-hidden">
        <CardContent className="h-full p-4 overflow-y-auto space-y-5">
          {/* Starter prompts */}
          {showStarters && messages.length <= 1 && (
            <div className="pb-2">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Starter prompts for {selectedCap.label}</span>
                <button onClick={() => setShowStarters(false)} className="ml-auto text-muted-foreground/40 hover:text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedCap.starters.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-left text-xs text-muted-foreground border border-border rounded-lg px-3 py-2.5 hover:border-primary/40 hover:text-foreground hover:bg-muted/30 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} showThoughts={showThoughts}
              onCopy={handleCopy}
              onRegenerate={msg.role === "assistant" && i === messages.length - 1 ? regenerate : undefined}
              isLast={i === messages.length - 1}
            />
          ))}
          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Input */}
      <div className="mt-3">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder={`Ask ${selectedCap.label.toLowerCase()} question… (Enter to send, Shift+Enter for newline)`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="resize-none min-h-[60px] max-h-[120px] text-sm bg-card border-border"
            disabled={isStreaming}
          />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming} className="h-[60px] px-5 bg-primary hover:bg-primary/90">
            {isStreaming ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-muted-foreground/50">
          <span>All inference runs locally. No data sent to external APIs.</span>
          <div className="flex items-center gap-1"><Zap className="w-3 h-3" /><span>Shift+Enter for newline</span></div>
        </div>
      </div>
    </div>
  );
}
