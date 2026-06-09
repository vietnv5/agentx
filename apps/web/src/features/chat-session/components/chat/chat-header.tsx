"use client";

import { Bot, PanelLeftOpen } from "lucide-react";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ChatHeaderProps {
  routedAgentName: string | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ChatHeader({
  routedAgentName,
  isSidebarOpen,
  onToggleSidebar,
}: ChatHeaderProps) {
  const t = useTranslations();

  return (
    <div className="h-16 border-b border-default-200/60 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <Button
            isIconOnly
            className="cursor-pointer hover:bg-default-100"
            size="sm"
            variant="ghost"
            onClick={onToggleSidebar}
          >
            <PanelLeftOpen className="h-4.5 w-4.5 text-default-500" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {t("chat.header.title")}
            </h2>
            <p className="text-[10px] text-default-500">
              {t("chat.header.subtitle")}
            </p>
          </div>
        </div>
      </div>
      {routedAgentName && (
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {t("chat.header.routed", { name: routedAgentName })}
          </span>
        </div>
      )}
    </div>
  );
}
