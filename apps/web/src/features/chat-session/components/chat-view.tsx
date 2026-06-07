"use client";

import * as React from "react";
import { apiClient } from "@/src/lib/api-client";
import { useAuthStore } from "@/src/features/auth/auth-store";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Bot,
  User as UserIcon,
  Play,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, Button, Spinner } from "@heroui/react";

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

interface ToolLog {
  toolName: string;
  args?: any;
  output?: any;
  status: "pending" | "success" | "error" | "denied";
}

export default function ChatView() {
  const { accessToken } = useAuthStore.getState();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");

  const [loadingConv, setLoadingConv] = React.useState(true);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);

  // Streaming States
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [routedAgentName, setRoutedAgentName] = React.useState<string | null>(null);
  const [streamingText, setStreamingText] = React.useState("");
  const [runningTool, setRunningTool] = React.useState<ToolLog | null>(null);
  const [completedTools, setCompletedTools] = React.useState<ToolLog[]>([]);
  const [showToolLogs, setShowToolLogs] = React.useState(true);

  // Approval Modal/Card State
  const [pendingApproval, setPendingApproval] = React.useState<{
    id: string;
    toolName: string;
    args: any;
    description?: string;
  } | null>(null);

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
      const res = await apiClient.get("/api/chat/conversations");
      setConversations(res.data);
      if (selectFirst && res.data.length > 0) {
        setActiveId(res.data[0].id);
      }
    } catch (err) {
      console.error("Không tải được danh sách hội thoại", err);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  const loadMessages = React.useCallback(async (id: string) => {
    try {
      setLoadingMsgs(true);
      const res = await apiClient.get(`/api/chat/conversations/${id}`);
      setMessages(res.data.messages || []);
      setPendingApproval(null);

      // Lấy danh sách approval đang chờ của hội thoại này
      const approvalRes = await apiClient.get(`/api/chat/conversations/${id}/approvals`);
      if (approvalRes.data.length > 0) {
        const req = approvalRes.data[0];
        setPendingApproval({
          id: req.id,
          toolName: req.toolName,
          args: req.args,
          description: req.description,
        });
      }
    } catch (err) {
      console.error("Không tải được tin nhắn", err);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

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
  }, [activeId, loadMessages]);

  const handleCreateConv = async () => {
    try {
      const res = await apiClient.post("/api/chat/conversations", {
        title: `Cuộc hội thoại #${conversations.length + 1}`,
      });
      await loadConversations();
      setActiveId(res.data.id);
    } catch (err) {
      alert("Tạo hội thoại mới lỗi");
    }
  };

  const handleDeleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có muốn xóa cuộc hội thoại này?")) return;
    try {
      await apiClient.delete(`/api/chat/conversations/${id}`);
      if (activeId === id) setActiveId(null);
      loadConversations();
    } catch (err) {
      alert("Xóa hội thoại lỗi");
    }
  };

  // Hàm đọc SSE Stream bằng Fetch Reader để đính kèm Token Auth
  const readStream = async (url: string) => {
    setIsStreaming(true);
    setStreamingText("");
    setRoutedAgentName(null);
    setRunningTool(null);
    setCompletedTools([]);
    setPendingApproval(null);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Không thể khởi tạo luồng đọc.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data:")) {
            try {
              const eventWrapper = JSON.parse(cleanLine.slice(5).trim());
              const { event, data } = eventWrapper;

              if (event === "agent_routing") {
                setRoutedAgentName(data.agentName);
              } else if (event === "token") {
                setStreamingText((prev) => prev + data);
              } else if (event === "tool_start") {
                setRunningTool({ toolName: data.toolName, args: data.args, status: "pending" });
              } else if (event === "tool_end") {
                setRunningTool(null);
                setCompletedTools((prev) => [
                  ...prev,
                  { toolName: data.toolName, output: data.output, status: data.status === "success" ? "success" : "error" },
                ]);
              } else if (event === "tool_approval_required") {
                setPendingApproval({
                  id: data.approvalRequestId,
                  toolName: data.toolName,
                  args: data.args,
                  description: data.description,
                });
              } else if (event === "complete") {
                // Done. Reload messages history from db to get final formatted items
                if (activeId) {
                  await loadMessages(activeId);
                }
              } else if (event === "error") {
                alert(`Lỗi thực thi agent: ${data}`);
              }
            } catch (e) {
              // Parse error
            }
          }
        }
      }
    } catch (err: any) {
      alert(`Lỗi kết nối stream: ${err.message}`);
    } finally {
      setIsStreaming(false);
      setRunningTool(null);
      setStreamingText("");
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

    const url = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    }/api/chat/conversations/${activeId}/messages/stream?content=${encodeURIComponent(msgText)}`;
    
    await readStream(url);
  };

  const handleDecideApproval = async (approved: boolean) => {
    if (!pendingApproval || !activeId) return;

    const approvalId = pendingApproval.id;
    setPendingApproval(null);

    const url = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    }/api/chat/conversations/${activeId}/approval/${approvalId}/decide/stream?approved=${approved}`;

    await readStream(url);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background font-sans">
      {/* Conversations History Sidebar */}
      <div className="w-72 border-r border-default-200 bg-default-50/30 flex flex-col justify-between shrink-0">
        <div className="p-4 border-b border-default-200/60 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
            Lịch sử Hội thoại
          </span>
          <Button
            size="sm"
            variant="secondary"
            isIconOnly
            onClick={handleCreateConv}
            className="cursor-pointer"
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
                  onClick={() => !isStreaming && setActiveId(conv.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                    isActive
                      ? "bg-default-200/80 text-foreground border-default-300/50 font-bold"
                      : "text-default-500 hover:bg-default-100 hover:text-foreground border-transparent"
                  } ${isStreaming ? "pointer-events-none opacity-50" : ""}`}
                >
                  <span className="truncate max-w-[170px]">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConv(conv.id, e)}
                    className="text-default-400 hover:text-danger transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
          {conversations.length === 0 && !loadingConv && (
            <p className="text-center text-xs text-default-450 italic py-8">Chưa có cuộc hội thoại nào.</p>
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
              <h2 className="text-sm font-bold text-foreground">AgentX Playground</h2>
              <p className="text-[10px] text-default-500">ReAct Loop, SSE Streaming & Human-in-the-loop approvals.</p>
            </div>
          </div>
          {routedAgentName && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">Routed: {routedAgentName}</span>
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
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      isUser
                        ? "bg-default-200 border-default-350 text-default-600 dark:text-default-300"
                        : "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {isUser ? <UserIcon className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                    </div>

                    {/* Balloon Bubble */}
                    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
                      <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-emerald-600 dark:bg-emerald-600/90 text-white rounded-tr-none shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                          : "bg-content1 border border-default-150 text-foreground rounded-tl-none shadow-sm"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      {/* Render tool executions metadata if any */}
                      {msg.metadata?.toolCalls && (
                        <div className="mt-2 w-full max-w-lg">
                           <Card className="bg-default-50 border border-default-200 p-3 rounded-lg space-y-2">
                            <span className="text-[10px] font-bold uppercase text-default-450 tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                              Hoạt động MCP Tool
                            </span>
                            {msg.metadata.toolCalls.map((tCall: any, idx: number) => (
                              <div key={idx} className="bg-default-100 p-2.5 rounded border border-default-200 font-mono text-[10px] text-default-500 space-y-1">
                                <p className="text-foreground font-semibold">Called: {tCall.toolName || tCall.function?.name}</p>
                                <p className="text-default-450">Args: {JSON.stringify(tCall.args || tCall.function?.arguments)}</p>
                              </div>
                            ))}
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Real-time Streaming Response placeholder */}
              {isStreaming && (streamingText || runningTool || completedTools.length > 0) && (
                <div className="flex gap-3 max-w-[80%] mr-auto">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <Bot className="h-4.5 w-4.5" />
                  </div>

                  <div className="space-y-4 flex-1">
                    {/* Collapsible Tool Activity Logs */}
                    {(completedTools.length > 0 || runningTool) && (
                      <Card className="bg-default-50 border border-default-200 p-3.5 rounded-xl max-w-xl space-y-2.5">
                        <div
                          onClick={() => setShowToolLogs(!showToolLogs)}
                          className="flex items-center justify-between cursor-pointer text-default-500 hover:text-foreground"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                            Đang chạy ReAct loop...
                          </span>
                          {showToolLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>

                        {showToolLogs && (
                          <div className="space-y-2 pt-1">
                            {completedTools.map((t, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                <span className="text-default-750 font-mono font-semibold">{t.toolName}</span>
                                <span className="text-[10px] text-default-400">(success)</span>
                              </div>
                            ))}
                            {runningTool && (
                              <div className="flex items-center gap-2 text-xs text-default-500 animate-pulse">
                                <Spinner size="sm" color="success" className="shrink-0 scale-75" />
                                <span className="text-default-750 font-mono font-semibold">{runningTool.toolName}</span>
                                <span className="text-[10px] text-default-400">(running)</span>
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
                      <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-450 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-foreground">Yêu cầu Phê duyệt chạy Công cụ (Approval Gate)</span>
                        <p className="text-default-500 mt-1 leading-relaxed">{pendingApproval.description}</p>
                        <div className="mt-3 bg-default-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono border border-default-200">
                          <p className="text-amber-600 dark:text-amber-400 font-semibold mb-1">Tool: {pendingApproval.toolName}</p>
                          <p className="text-default-450">Args: {JSON.stringify(pendingApproval.args, null, 2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDecideApproval(false)}
                        className="cursor-pointer font-semibold"
                      >
                        Từ chối (Reject)
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleDecideApproval(true)}
                        className="cursor-pointer font-bold"
                      >
                        Cho phép (Approve)
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
                <p className="text-sm font-semibold text-default-500">Không có cuộc hội thoại nào đang mở</p>
                <p className="text-xs text-default-400 mt-0.5">Bấm nút cộng (+) ở sidebar bên trái để khởi tạo hội thoại mới.</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Footer */}
        {activeId && !pendingApproval && (
          <div className="p-6 bg-background border-t border-default-200/60">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                disabled={isStreaming}
                placeholder={isStreaming ? "AgentX đang xử lý..." : "Nhập tin nhắn..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-default-100 text-foreground border border-default-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                isDisabled={isStreaming || !input.trim()}
                variant="primary"
                isIconOnly
                className="cursor-pointer h-11 w-11 rounded-xl shrink-0"
              >
                {isStreaming ? <Spinner size="sm" color="current" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
