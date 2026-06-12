
import * as React from "react";
import { useLocation } from "react-router";

import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  // Nếu là route chat hoặc admin, trả về children thô để page layout tự kiểm soát (full-screen)
  const isDashboard =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login");

  if (isDashboard) {
    return (
      <div className="w-full h-screen overflow-hidden bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3 border-t border-default-100">
        <span className="text-default-400 text-sm">
          {t("footer.poweredBy")}
        </span>
      </footer>
    </div>
  );
}
