
import * as React from "react";
import { Link } from "react-router";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Search,
  ChevronDown,
  PanelLeftClose,
  LayoutDashboard,
  Bot,
  Plug,
  Users,
  FolderOpen,
  FileCode,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button, Spinner, Dropdown } from "@heroui/react";

import { useAuthStore } from "@/src/features/auth/auth-store";
import { authService } from "@/src/features/auth/services/auth.service";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  isStreaming: boolean;
  loadingConv: boolean;
  onCreateConv: () => void;
  onDeleteConv: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  setActiveId,
  isStreaming,
  loadingConv,
  onCreateConv,
  onDeleteConv,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAdminLinks, setShowAdminLinks] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chat_sidebar_admin_open") === "true";
    }
    return false;
  });

  React.useEffect(() => {
    localStorage.setItem("chat_sidebar_admin_open", String(showAdminLinks));
  }, [showAdminLinks]);

  const handleLogout = async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      await authService.logout(refreshToken);
    } catch (err) {
      console.error("Lỗi khi đăng xuất trên server:", err);
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  const isAdmin = user?.role?.name === "ADMIN";

  const adminRoutes = [
    { name: t("nav.overview"), path: "/admin", icon: LayoutDashboard },
    { name: t("nav.agentsBuilder"), path: "/admin/agents", icon: Bot },
    { name: t("nav.mcpIntegrations"), path: "/admin/integrations", icon: Plug },
    { name: t("nav.usersRoles"), path: "/admin/users", icon: Users },
    { name: t("nav.knowledgeBase"), path: "/admin/knowledge", icon: FolderOpen },
    { name: t("nav.auditLogs"), path: "/admin/audit", icon: FileCode },
  ];

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none ${
        isOpen
          ? "w-72 border-r border-default-200 bg-default-50/40 backdrop-blur-md"
          : "w-0 overflow-hidden border-r-0"
      }`}
    >
      {/* fixed container width wrapper prevents text wrap layout shifts during width transitions */}
      <div className="w-72 h-full flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-default-200/60 flex items-center justify-between">
          <Link className="flex items-center gap-2" to="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              AX
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              {t("app.name")}
            </span>
          </Link>
          <Button
            isIconOnly
            className="cursor-pointer hover:bg-default-100"
            size="sm"
            variant="ghost"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4.5 w-4.5 text-default-500" />
          </Button>
        </div>

        {/* Search & Actions Area */}
        <div className="p-3 space-y-2">
          {/* New Chat Button */}
          <Button
            className="w-full justify-start gap-2.5 font-medium cursor-pointer border-default-200/80 bg-default-100/30 hover:bg-default-100"
            size="md"
            variant="outline"
            onClick={onCreateConv}
          >
            <Plus className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm font-semibold">{t("chat.newChat")}</span>
          </Button>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-default-400" />
            <input
              type="text"
              placeholder={t("chat.history.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-default-100/50 hover:bg-default-100 focus:bg-default-100/80 border border-default-200/50 focus:border-default-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-default-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Scrollable Center Content: Navigation and Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Admin Navigation Section */}
          {isAdmin && (
            <div className="space-y-1">
              <button
                onClick={() => setShowAdminLinks(!showAdminLinks)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-default-400 hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{t("nav.adminControl")}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    showAdminLinks ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showAdminLinks && (
                <div className="space-y-0.5 mt-1">
                  {adminRoutes.map((route) => {
                    const Icon = route.icon;
                    const isActive =
                      route.path === "/admin"
                        ? pathname === route.path
                        : pathname === route.path || pathname.startsWith(route.path + "/");

                    return (
                      <Link
                        key={route.path}
                        to={route.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer border ${
                          isActive
                            ? "bg-default-200 hover:bg-default-300/60 text-foreground dark:text-white border-default-300 shadow-sm font-bold"
                            : "text-default-500 hover:bg-default-100 hover:text-foreground border-transparent font-medium"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{route.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chat History Section */}
          <div className="space-y-1">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-default-400">
              {t("chat.history.title")}
            </span>
            <div className="space-y-1 mt-1.5">
              {loadingConv ? (
                <div className="flex justify-center py-6">
                  <Spinner color="success" size="sm" />
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
                  const isActive = isChatRoute && activeId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-all border focus:outline-none ${
                        isActive
                          ? "bg-default-200 hover:bg-default-300/60 text-foreground dark:text-white border-default-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)] font-bold"
                          : "text-default-500 hover:bg-default-100 hover:text-foreground border-transparent font-medium"
                      } ${isStreaming ? "pointer-events-none opacity-50" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => !isStreaming && setActiveId(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!isStreaming) setActiveId(conv.id);
                        }
                      }}
                    >
                      <span className="truncate max-w-[190px]">{conv.title}</span>
                      <button
                        className="text-default-400 hover:text-danger transition-colors p-1 pointer-events-auto"
                        onClick={(e) => onDeleteConv(conv.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
              {filteredConversations.length === 0 && !loadingConv && (
                <p className="text-center text-[11px] text-default-400 italic py-6">
                  {t("chat.history.empty")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Area: User Dropdown & Settings */}
        {user && (
          <div className="p-3 border-t border-default-200/40 bg-default-100/10">
            <Dropdown>
              <Dropdown.Trigger>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-default-150 cursor-pointer transition-colors w-full border border-transparent hover:border-default-200/40">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <UserIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-default-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-default-400 shrink-0" />
                </div>
              </Dropdown.Trigger>
              <Dropdown.Popover className="min-w-[240px]">
                <Dropdown.Menu aria-label="Tùy chọn tài khoản">
                  <Dropdown.Item key="user-info" textValue="user-info" className="opacity-100 select-none pb-2 border-b border-default-100">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-bold text-default-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-xs font-bold text-foreground truncate">{user.email}</p>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item key="theme-toggle" textValue="theme-toggle" className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Giao diện</span>
                      <ThemeSwitch className="shrink-0" />
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item key="lang-toggle" textValue="lang-toggle" className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Ngôn ngữ</span>
                      <LanguageSwitch className="shrink-0" />
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item
                    key="logout"
                    textValue="logout"
                    className="text-danger py-2.5"
                    onClick={handleLogout}
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span className="text-xs font-semibold">{t("logout")}</span>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
}
