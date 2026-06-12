
import * as React from "react";
import {
  MessageSquare,
  Bot,
  Clock,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, Button, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { ChatMessageItem } from "./chat-message-item";
import { ChatMarkdown } from "./chat-markdown";
import { ToolLog, PendingApproval } from "../../hooks/useChatStream";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  routedAgentId?: string;
  metadata?: any;
  createdAt: string;
}

interface ChatThreadProps {
  activeId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  runningTool: ToolLog | null;
  completedTools: ToolLog[];
  pendingApproval: PendingApproval | null;
  onDecideApproval: (approved: boolean) => void;
}

export function ChatThread({
  activeId,
  messages,
  isStreaming,
  streamingText,
  runningTool,
  completedTools,
  pendingApproval,
  onDecideApproval,
}: ChatThreadProps) {
  const { t } = useTranslation();
  const [showToolLogs, setShowToolLogs] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, runningTool, pendingApproval]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {activeId ? (
        <>
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} msg={msg} t={t} />
          ))}

          {/* Real-time Streaming Response placeholder */}
          {isStreaming &&
            (messages.length === 0 || messages[messages.length - 1].role !== "assistant") &&
            (streamingText || runningTool || completedTools.length > 0) && (
            <div className="flex gap-3 max-w-[80%] min-w-0 mr-auto animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <Bot className="h-4.5 w-4.5" />
              </div>

              <div className="space-y-4 flex-1 min-w-0">
                {/* Collapsible Tool Activity Logs */}
                {(completedTools.length > 0 || runningTool) && (
                  <Card className="bg-default-50 border border-default-200 p-3.5 rounded-xl max-w-xl space-y-2.5">
                    <div
                      className="flex items-center justify-between cursor-pointer text-default-500 hover:text-foreground focus:outline-none"
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowToolLogs(!showToolLogs)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setShowToolLogs(!showToolLogs);
                        }
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                        {t("chat.loop.running")}
                      </span>
                      {showToolLogs ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>

                    {showToolLogs && (
                      <div className="space-y-2 pt-1">
                        {completedTools.map((tCall, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span className="text-default-750 font-mono font-semibold">
                              {tCall.toolName}
                            </span>
                            <span className="text-[10px] text-default-400">
                              {t("chat.loop.success")}
                            </span>
                          </div>
                        ))}
                        {runningTool && (
                          <div className="flex items-center gap-2 text-xs text-default-500 animate-pulse">
                            <Spinner className="shrink-0 scale-75" color="success" size="sm" />
                            <span className="text-default-750 font-mono font-semibold">
                              {runningTool.toolName}
                            </span>
                            <span className="text-[10px] text-default-400">
                              {t("chat.loop.runningState")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

                {/* Token Stream Text */}
                {streamingText && (
                  <div className="bg-content1 border border-default-150 text-foreground rounded-xl rounded-tl-none px-4 py-2.5 text-sm leading-relaxed shadow-sm min-w-0">
                    <ChatMarkdown content={streamingText} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Human-in-the-loop Tool Approval Request Card */}
          {pendingApproval && (
            <div className="flex gap-3 max-w-[80%] min-w-0 mr-auto animate-bounce">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 text-amber-500 dark:text-amber-400">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>

              <Card className="bg-content1 border border-amber-500/25 p-5 rounded-xl max-w-lg space-y-4 shadow-sm min-w-0">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-455 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-foreground">
                      {t("chat.approval.title")}
                    </span>
                    <p className="text-default-500 mt-1 leading-relaxed">
                      {pendingApproval.description}
                    </p>
                    <div className="mt-3 bg-default-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono border border-default-200">
                      <p className="text-amber-600 dark:text-amber-400 font-semibold mb-1">
                        {t("chat.approval.tool", { name: pendingApproval.toolName })}
                      </p>
                      <p className="text-default-455">
                        {t("chat.approval.args", {
                          args: JSON.stringify(pendingApproval.args, null, 2),
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end">
                  <Button
                    className="cursor-pointer font-semibold"
                    size="sm"
                    variant="danger"
                    onClick={() => onDecideApproval(false)}
                  >
                    {t("chat.approval.reject")}
                  </Button>
                  <Button
                    className="cursor-pointer font-bold"
                    size="sm"
                    variant="primary"
                    onClick={() => onDecideApproval(true)}
                  >
                    {t("chat.approval.approve")}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-default-400 py-16">
          <MessageSquare className="h-10 w-10 text-default-300" />
          <div>
            <p className="text-sm font-semibold text-default-500">{t("chat.empty.title")}</p>
            <p className="text-xs text-default-400 mt-0.5">{t("chat.empty.subtitle")}</p>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
