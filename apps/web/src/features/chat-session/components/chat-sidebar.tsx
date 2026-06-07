"use client";

import * as React from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

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
}

export function ChatSidebar({
  conversations,
  activeId,
  setActiveId,
  isStreaming,
  loadingConv,
  onCreateConv,
  onDeleteConv,
}: ChatSidebarProps) {
  const t = useTranslations();

  return (
    <div className="w-72 border-r border-default-200 bg-default-50/30 flex flex-col justify-between shrink-0">
      <div className="p-4 border-b border-default-200/60 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <MessageSquare className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
          {t("chat.history.title")}
        </span>
        <Button
          isIconOnly
          className="cursor-pointer"
          size="sm"
          variant="secondary"
          onClick={onCreateConv}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loadingConv ? (
          <div className="flex justify-center py-8">
            <Spinner color="success" size="sm" />
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeId === conv.id;

            return (
              <div
                key={conv.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all border focus:outline-none ${
                  isActive
                    ? "bg-default-200/80 text-foreground border-default-300/50 font-bold"
                    : "text-default-500 hover:bg-default-100 hover:text-foreground border-transparent"
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
                <span className="truncate max-w-[170px]">{conv.title}</span>
                <button
                  className="text-default-400 hover:text-danger transition-colors p-1"
                  onClick={(e) => onDeleteConv(conv.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
        {conversations.length === 0 && !loadingConv && (
          <p className="text-center text-xs text-default-450 italic py-8">
            {t("chat.history.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
