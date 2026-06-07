"use client";

import * as React from "react";
import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatHeaderProps {
  routedAgentName: string | null;
}

export function ChatHeader({ routedAgentName }: ChatHeaderProps) {
  const t = useTranslations();

  return (
    <div className="h-16 border-b border-default-200/60 px-6 flex items-center justify-between">
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
