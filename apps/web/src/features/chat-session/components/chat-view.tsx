"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { chatService } from "@/src/features/chat-session/services/chat.service";
import { useChatStream } from "@/src/features/chat-session/hooks/useChatStream";

import { ChatSidebar } from "./chat-sidebar";
import { ChatHeader } from "./chat-header";
import { ChatThread } from "./chat-thread";
import { ChatInput } from "./chat-input";

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

  const handleSend = async (msgText: string) => {
    if (!activeId || isStreaming) return;

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
      <ChatSidebar
        activeId={activeId}
        conversations={conversations}
        isStreaming={isStreaming}
        loadingConv={loadingConv}
        setActiveId={setActiveId}
        onCreateConv={handleCreateConv}
        onDeleteConv={handleDeleteConv}
      />

      <div className="flex-1 flex flex-col h-full bg-default-50/10 relative">
        <ChatHeader routedAgentName={routedAgentName} />

        <ChatThread
          activeId={activeId}
          completedTools={completedTools}
          isStreaming={isStreaming}
          messages={messages}
          pendingApproval={pendingApproval}
          runningTool={runningTool}
          streamingText={streamingText}
          onDecideApproval={handleDecideApproval}
        />

        {activeId && !pendingApproval && (
          <ChatInput isStreaming={isStreaming} onSend={handleSend} />
        )}
      </div>
    </div>
  );
}
