"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Bot,
  Plug,
  Users,
  FileCode,
  FolderOpen,
  MessageSquare,
  LogOut,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import clsx from "clsx";

import { useAuthStore } from "@/src/features/auth/auth-store";
import { authService } from "@/src/features/auth/services/auth.service";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const t = useTranslations();

  React.useEffect(() => {
    // Nếu chưa đăng nhập, chuyển hướng sang login
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;

      await authService.logout(refreshToken);
    } catch (err) {
      console.error("Lỗi khi đăng xuất trên server:", err);
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-default-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role?.name === "ADMIN";

  // Danh sách routes cho Admin
  const adminRoutes = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Agents Builder", path: "/admin/agents", icon: Bot },
    { name: "MCP Integrations", path: "/admin/integrations", icon: Plug },
    { name: "Users & Roles", path: "/admin/users", icon: Users },
    { name: "Knowledge Base", path: "/admin/knowledge", icon: FolderOpen },
    { name: "Audit Logs", path: "/admin/audit", icon: FileCode },
  ];

  // Danh sách routes chung
  const generalRoutes = [
    { name: t("nav.playground"), path: "/chat", icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar - Glassmorphism style */}
      <aside className="flex w-64 flex-col border-r border-default-200/60 bg-default-50/40 backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-default-200/40">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              AX
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              AgentX Platform
            </span>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {/* General Section */}
          <div className="space-y-2">
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-default-400">
              {t("nav.playground")}
            </span>
            <div className="space-y-1">
              {generalRoutes.map((route) => {
                const Icon = route.icon;
                const isActive = pathname === route.path;

                return (
                  <Link
                    key={route.path}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "text-default-500 hover:bg-default-100/50 hover:text-foreground",
                    )}
                    href={route.path}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {route.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Control Section */}
          {isAdmin && (
            <div className="space-y-2">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-default-400">
                {t("nav.adminControl")}
              </span>
              <div className="space-y-1">
                {adminRoutes.map((route) => {
                  const Icon = route.icon;
                  const isActive =
                    pathname === route.path ||
                    pathname.startsWith(route.path + "/");

                  return (
                    <Link
                      key={route.path}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-default-200/80 text-foreground border border-default-300/50"
                          : "text-default-500 hover:bg-default-100/50 hover:text-foreground",
                      )}
                      href={route.path}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {route.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Non-Admin Staff Warning */}
          {!isAdmin && (
            <div className="rounded-lg border border-yellow-500/10 bg-yellow-500/5 p-3 flex gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-xs text-default-400">
                <span className="font-semibold text-yellow-500">
                  {t("staffMode.title")}
                </span>
                <p className="mt-0.5 leading-relaxed">{t("staffMode.desc")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer (User Info, Theme Switcher & Logout) */}
        <div className="p-4 border-t border-default-200/40 bg-default-100/10">
          <div className="flex items-center justify-between gap-3 mb-3 px-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-default-200/60 text-default-700 border border-default-300/30">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate text-foreground">
                  {user.name}
                </p>
                <p className="text-[10px] text-default-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeSwitch className="text-default-500 hover:text-foreground shrink-0" />
              <span className="w-[1px] h-3 bg-default-300/60 mx-1" />
              <LanguageSwitch />
            </div>
          </div>
          <button
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4.5 w-4.5" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}
