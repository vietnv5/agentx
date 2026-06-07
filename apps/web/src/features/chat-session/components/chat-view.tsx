"use client";

import * as React from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Bot,
  User as UserIcon,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { chatService } from "@/src/features/chat-session/services/chat.service";
import { useChatStream } from "@/src/features/chat-session/hooks/useChatStream";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  routedAgentId?: string;
  metadata?: any;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatView() {
  const t = useTranslations();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);

  const [loadingConv, setLoadingConv] = React.useState(true);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [showToolLogs, setShowToolLogs] = React.useState(true);

  // Hook Stream Logic
  const {
    isStreaming,
    routedAgentName,
    streamingText,
    runningTool,
    completedTools,
    pendingApproval,
    setPendingApproval,
    sendMessage,
    decideApproval,
  } = useChatStream();

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, runningTool, pendingApproval]);

  const loadConversations = React.useCallback(async (selectFirst = false) => {
    try {
      setLoadingConv(true);
      const data = await chatService.getConversations();

      setConversations(data);
      if (selectFirst && data.length > 0) {
        setActiveId(data[0].id);
      }
    } catch (err) {
      console.error(t("chat.alert.loadHistoryFailed"), err);
    } finally {
      setLoadingConv(false);
    }
  }, [t]);

  const loadMessages = React.useCallback(
    async (id: string) => {
      try {
        setLoadingMsgs(true);
        const resData = await chatService.getConversationMessages(id);

        setMessages(resData.messages || []);
        setPendingApproval(null);

        // Lấy danh sách approval đang chờ của hội thoại này
        const approvalData = await chatService.getConversationApprovals(id);

        if (approvalData.length > 0) {
          const req = approvalData[0];

          setPendingApproval({
            id: req.id,
            toolName: req.toolName,
            args: req.args,
            description: req.description,
          });
        }
      } catch (err) {
        console.error(t("chat.alert.loadMessagesFailed"), err);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [setPendingApproval, t],
  );

  React.useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  React.useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
      setPendingApproval(null);
    }
  }, [activeId, loadMessages, setPendingApproval]);

  const handleCreateConv = async () => {
    try {
      const data = await chatService.createConversation(
        t("chat.history.tempTitle", { index: conversations.length + 1 }),
      );

      await loadConversations();
      setActiveId(data.id);
    } catch (err) {
      alert(t("chat.alert.createFailed"));
    }
  };

  const handleDeleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("chat.confirm.delete"))) return;
    try {
      await chatService.deleteConversation(id);
      if (activeId === id) setActiveId(null);
      loadConversations();
    } catch (err) {
      alert(t("chat.alert.deleteFailed"));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const msgText = input.trim();

    setInput("");

    // Thêm tạm thời tin nhắn của user vào view local
    setMessages((prev) => [
      ...prev,
      {
        id: "temp-user",
        role: "user",
        content: msgText,
        createdAt: new Date().toISOString(),
      },
    ]);

    await sendMessage(activeId, msgText, async () => {
      // Done. Reload messages history from db to get final formatted items
      if (activeId) {
        await loadMessages(activeId);
      }
    });
  };

  const handleDecideApproval = async (approved: boolean) => {
    if (!pendingApproval || !activeId) return;

    const approvalId = pendingApproval.id;

    setPendingApproval(null);

    await decideApproval(activeId, approvalId, approved, async () => {
      // Done. Reload messages history from db to get final formatted items
      if (activeId) {
        await loadMessages(activeId);
      }
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background font-sans">
      {/* Conversations History Sidebar */}
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
            onClick={handleCreateConv}
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
                    onClick={(e) => handleDeleteConv(conv.id, e)}
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

      {/* Main Chat Playground Area */}
      <div className="flex-1 flex flex-col h-full bg-default-50/10 relative">
        {/* Chat Header */}
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

        {/* Message Thread container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {activeId ? (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const isTool = msg.role === "tool";

                if (isTool) return null; // We render tool calls in collapsible logs

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[80%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
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
                    <div
                      className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? "bg-emerald-600 dark:bg-emerald-600/90 text-white rounded-tr-none shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                            : "bg-content1 border border-default-150 text-foreground rounded-tl-none shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Render tool executions metadata if any */}
                      {msg.metadata?.toolCalls && (
                        <div className="mt-2 w-full max-w-lg">
                          <Card className="bg-default-50 border border-default-200 p-3 rounded-lg space-y-2">
                            <span className="text-[10px] font-bold uppercase text-default-455 tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                              {t("chat.mcp.activity")}
                            </span>
                            {msg.metadata.toolCalls.map(
                              (tCall: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-default-100 p-2.5 rounded border border-default-200 font-mono text-[10px] text-default-500 space-y-1"
                                >
                                  <p className="text-foreground font-semibold">
                                    {t("chat.mcp.called", { name: tCall.toolName || tCall.function?.name })}
                                  </p>
                                  <p className="text-default-450">
                                    {t("chat.mcp.args", { args: JSON.stringify(tCall.args || tCall.function?.arguments) })}
                                  </p>
                                </div>
                              ),
                            )}
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Real-time Streaming Response placeholder */}
              {isStreaming &&
                (streamingText || runningTool || completedTools.length > 0) && (
                  <div className="flex gap-3 max-w-[80%] mr-auto">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <Bot className="h-4.5 w-4.5" />
                    </div>

                    <div className="space-y-4 flex-1">
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
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
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
                                  <Spinner
                                    className="shrink-0 scale-75"
                                    color="success"
                                    size="sm"
                                  />
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
                        <div className="bg-content1 border border-default-150 text-foreground rounded-xl rounded-tl-none px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                          <p className="whitespace-pre-wrap">{streamingText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Pending Human-in-the-loop Tool Approval Request Card */}
              {pendingApproval && (
                <div className="flex gap-3 max-w-[80%] mr-auto animate-bounce">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 text-amber-500 dark:text-amber-400">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>

                  <Card className="bg-content1 border border-amber-500/25 p-5 rounded-xl max-w-lg space-y-4 shadow-sm">
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
                            {t("chat.approval.args", { args: JSON.stringify(pendingApproval.args, null, 2) })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <Button
                        className="cursor-pointer font-semibold"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDecideApproval(false)}
                      >
                        {t("chat.approval.reject")}
                      </Button>
                      <Button
                        className="cursor-pointer font-bold"
                        size="sm"
                        variant="primary"
                        onClick={() => handleDecideApproval(true)}
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
                <p className="text-sm font-semibold text-default-500">
                  {t("chat.empty.title")}
                </p>
                <p className="text-xs text-default-400 mt-0.5">
                  {t("chat.empty.subtitle")}
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Footer */}
        {activeId && !pendingApproval && (
          <div className="p-6 bg-background border-t border-default-200/60">
            <form className="flex gap-2" onSubmit={handleSend}>
              <input
                className="flex-1 bg-default-100 text-foreground border border-default-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                disabled={isStreaming}
                placeholder={
                  isStreaming ? t("chat.input.processing") : t("chat.input.placeholder")
                }
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button
                isIconOnly
                className="cursor-pointer h-11 w-11 rounded-xl shrink-0"
                isDisabled={isStreaming || !input.trim()}
                type="submit"
                variant="primary"
              >
                {isStreaming ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
