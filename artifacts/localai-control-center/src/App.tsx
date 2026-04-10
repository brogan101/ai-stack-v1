import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";

// ── Placeholder pages ─────────────────────────────────────────────────────────
// These will be replaced when the full page source is reconstructed.
// Each page corresponds to a compiled route seen in dist/public/index.html.

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">
        Source reconstruction in progress — backend API is live at{" "}
        <code className="bg-muted px-1 rounded">/api/healthz</code>
      </p>
    </div>
  );
}

const Dashboard = () => <Placeholder title="Dashboard" />;
const ModelsPage = () => <Placeholder title="Models" />;
const WorkspacePage = () => <Placeholder title="Workspace" />;
const ChatPage = () => <Placeholder title="Chat" />;
const SetupPage = () => <Placeholder title="Setup" />;
const UpdatesPage = () => <Placeholder title="Updates" />;
const CleanupPage = () => <Placeholder title="Cleanup" />;
const DiagnosticsPage = () => <Placeholder title="Diagnostics" />;
const LogsPage = () => <Placeholder title="Logs" />;
const StudiosPage = () => <Placeholder title="Studios" />;
const ContinuePage = () => <Placeholder title="Continue.dev" />;
const RemotePage = () => <Placeholder title="Remote Access" />;
const IntegrationsPage = () => <Placeholder title="Integrations" />;
const SettingsPage = () => <Placeholder title="Settings" />;
const NotFound = () => <Placeholder title="404 — Page Not Found" />;

// ── Query client ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/models" component={ModelsPage} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/setup" component={SetupPage} />
        <Route path="/updates" component={UpdatesPage} />
        <Route path="/cleanup" component={CleanupPage} />
        <Route path="/diagnostics" component={DiagnosticsPage} />
        <Route path="/logs" component={LogsPage} />
        <Route path="/studios" component={StudiosPage} />
        <Route path="/continue" component={ContinuePage} />
        <Route path="/remote" component={RemotePage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}
