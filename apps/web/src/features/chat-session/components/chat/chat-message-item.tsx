"use client";

import * as React from "react";
import { Bot, User as UserIcon, ShieldCheck } from "lucide-react";
import { Card } from "@heroui/react";
import { ChatMarkdown } from "./chat-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  routedAgentId?: string;
  metadata?: any;
  createdAt: string;
}

interface ChatMessageItemProps {
  msg: Message;
  t: (key: string, vars?: any) => string;
}

export const ChatMessageItem = React.memo(({ msg, t }: ChatMessageItemProps) => {
  console.log("[ChatMessageItem] rendering msg:", msg.id, msg.role, JSON.stringify(msg.content));
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";

  if (isTool) return null; // We render tool calls in collapsible logs

  return (
    <div
      className={`flex gap-3 max-w-[80%] min-w-0 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
    >
      {/* Icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
          isUser
            ? "bg-default-200 border-default-350 text-default-600 dark:text-default-300"
            : "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {isUser ? (
          <UserIcon className="h-4.5 w-4.5" />
        ) : (
          <Bot className="h-4.5 w-4.5" />
        )}
      </div>

      {/* Balloon Bubble */}
      <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed min-w-0 ${
            isUser
              ? "bg-emerald-600 dark:bg-emerald-600/90 text-white rounded-tr-none shadow-[0_0_15px_rgba(16,185,129,0.05)]"
              : "bg-content1 border border-default-150 text-foreground rounded-tl-none shadow-sm"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
          ) : (
            <ChatMarkdown content={msg.content} />
          )}
        </div>

        {/* Render tool executions metadata if any */}
        {msg.metadata?.toolCalls && (
          <div className="mt-2 w-full max-w-lg animate-fade-in">
            <Card className="bg-default-50 border border-default-200 p-3 rounded-lg space-y-2">
              <span className="text-[10px] font-bold uppercase text-default-455 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                {t("chat.mcp.activity")}
              </span>
              {msg.metadata.toolCalls.map((tCall: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-default-100 p-2.5 rounded border border-default-200 font-mono text-[10px] text-default-500 space-y-1"
                >
                  <p className="text-foreground font-semibold">
                    {t("chat.mcp.called", { name: tCall.toolName || tCall.function?.name })}
                  </p>
                  <p className="text-default-455">
                    {t("chat.mcp.args", {
                      args: JSON.stringify(tCall.args || tCall.function?.arguments),
                    })}
                  </p>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessageItem.displayName = "ChatMessageItem";
