import * as React from "react";
import { useLocation, useNavigate, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { PanelLeftOpen } from "lucide-react";
import { Button, toast } from "@heroui/react";

import { useAuthStore } from "@/src/features/auth/auth-store";
import { ChatSidebar } from "@/src/features/chat-session/components/chat/chat-sidebar";
import { useChatStore } from "@/src/features/chat-session/hooks/useChatStore";

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  // Global Chat State
  const conversations = useChatStore((state) => state.conversations);
  const activeId = useChatStore((state) => state.activeId);
  const setActiveId = useChatStore((state) => state.setActiveId);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const loadingConv = useChatStore((state) => state.loadingConv);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const toggleSidebar = useChatStore((state) => state.toggleSidebar);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const deleteConversation = useChatStore((state) => state.deleteConversation);

  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    // Nếu chưa đăng nhập, chuyển hướng sang login (chỉ check sau khi hydrate xong)
    if (isHydrated && !isAuthenticated) {
      navigate("/login");
    }
  }, [isHydrated, isAuthenticated, navigate]);

  React.useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadConversations();
    }
  }, [isHydrated, isAuthenticated, loadConversations]);

  // Loading state khi chưa hydrate hoặc chưa có user
  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-default-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");

  const handleSelectConversation = (id: string | null) => {
    setActiveId(id);
    if (id) {
      navigate(`/chat?id=${id}`);
    } else {
      navigate("/chat");
    }
  };

  const handleCreateConv = () => {
    setActiveId(null);
    navigate("/chat");
  };

  const handleDeleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("chat.confirm.delete"))) return;
    try {
      await deleteConversation(id);
      toast.success(t("chat.alert.deleteSuccess"));
      if (activeId === id) {
        navigate("/chat");
      }
    } catch (err) {
      toast.danger(t("chat.alert.deleteFailed"));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans relative">
      {/* Collapsible Chat-style Sidebar for all pages */}
      <ChatSidebar
        activeId={activeId}
        conversations={conversations}
        isStreaming={isStreaming}
        loadingConv={loadingConv}
        setActiveId={handleSelectConversation}
        onCreateConv={handleCreateConv}
        onDeleteConv={handleDeleteConv}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background relative">
        {/* Generic Admin Top Header Bar when sidebar is collapsed (non-chat pages only) */}
        {!isChatRoute && !isSidebarOpen && (
          <div className="h-16 border-b border-default-200/60 px-6 flex items-center shrink-0 select-none bg-default-50/20 backdrop-blur-md animate-fade-in">
            <Button
              isIconOnly
              className="cursor-pointer hover:bg-default-100"
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
            >
              <PanelLeftOpen className="h-4.5 w-4.5 text-default-500" />
            </Button>
            <span className="ml-4 font-bold text-sm text-foreground tracking-tight">
              AgentX Admin Console
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
