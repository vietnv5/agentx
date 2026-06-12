import { Route, Routes, Navigate } from "react-router";
import { lazy, Suspense } from "react";

// Layouts
import DashboardLayout from "@/layouts/dashboard-layout";
import AuthLayout from "@/layouts/auth-layout";
import LayoutWrapper from "@/layouts/layout-wrapper";

// Lazy-loaded pages (code splitting)
const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/features/auth/components/login/login-view"));
const ChatPage = lazy(() => import("@/features/chat-session/components/chat/chat-view"));
const AdminOverview = lazy(() => import("@/features/agent-admin/components/overview/overview-view"));
const AgentsPage = lazy(() => import("@/features/agent-admin/components/agents/agents-view"));
const IntegrationsPage = lazy(() => import("@/features/agent-admin/components/integrations/integrations-view"));
const UsersPage = lazy(() => import("@/features/agent-admin/components/users/users-view").then(m => ({ default: m.UsersView })));
const KnowledgePage = lazy(() => import("@/features/agent-admin/components/knowledge/knowledge-view").then(m => ({ default: m.KnowledgeView })));
const AuditPage = lazy(() => import("@/features/agent-admin/components/audit/audit-view").then(m => ({ default: m.AuditView })));

// Static pages
const DocsPage = lazy(() => import("@/pages/docs"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const BlogPage = lazy(() => import("@/pages/blog"));
const AboutPage = lazy(() => import("@/pages/about"));

const LoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes under LayoutWrapper layout */}
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Auth Routes under AuthLayout layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Dashboard Routes under DashboardLayout layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/agents" element={<AgentsPage />} />
          <Route path="/admin/integrations" element={<IntegrationsPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/knowledge" element={<KnowledgePage />} />
          <Route path="/admin/audit" element={<AuditPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
