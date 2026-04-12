import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { NotificationsProvider } from "@/contexts/notifications";

import Dashboard from "@/pages/dashboard";
import AnalyticsPage from "@/pages/analytics-page";
import ChatPage from "@/pages/chat-page";
import StudiosPage from "@/pages/studios-page";
import ComponentsPage from "@/pages/components-page";
import ModelsPage from "@/pages/models-page";
import WorkspacePage from "@/pages/workspace-page";
import ContinuePage from "@/pages/continue-page";
import SetupPage from "@/pages/setup-page";
import UpdatesPage from "@/pages/updates-page";
import CleanupPage from "@/pages/cleanup-page";
import DiagnosticsPage from "@/pages/diagnostics-page";
import LogsPage from "@/pages/logs-page";
import RemoteAccessPage from "@/pages/remote-access-page";
import IntegrationsPage from "@/pages/integrations-page";
import SettingsPage from "@/pages/settings-page";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/studios" component={StudiosPage} />
        <Route path="/stack" component={ComponentsPage} />
        <Route path="/models" component={ModelsPage} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/continue" component={ContinuePage} />
        <Route path="/setup" component={SetupPage} />
        <Route path="/updates" component={UpdatesPage} />
        <Route path="/cleanup" component={CleanupPage} />
        <Route path="/diagnostics" component={DiagnosticsPage} />
        <Route path="/logs" component={LogsPage} />
        <Route path="/remote" component={RemoteAccessPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationsProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </NotificationsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
