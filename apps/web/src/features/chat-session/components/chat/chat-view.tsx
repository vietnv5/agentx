"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@heroui/react";

import { chatService } from "@/src/features/chat-session/services/chat.service";
import { useChatStream } from "@/src/features/chat-session/hooks/useChatStream";
import { useChatStore } from "@/src/features/chat-session/hooks/useChatStore";

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

export default function ChatView() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);

  // Global Chat State
  const conversations = useChatStore((state) => state.conversations);
  const activeId = useChatStore((state) => state.activeId);
  const setActiveId = useChatStore((state) => state.setActiveId);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const toggleSidebar = useChatStore((state) => state.toggleSidebar);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const createConversation = useChatStore((state) => state.createConversation);

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

  // Load conversations once if empty
  React.useEffect(() => {
    if (conversations.length === 0) {
      loadConversations();
    }
  }, [conversations.length, loadConversations]);

  // Sync activeId with URL query params
  React.useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      if (activeId !== idParam) {
        setActiveId(idParam);
      }
    } else {
      if (activeId !== null) {
        setActiveId(null);
      }
    }
  }, [searchParams, activeId, setActiveId]);

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
    if (activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
      setPendingApproval(null);
    }
  }, [activeId, loadMessages, setPendingApproval]);

  const handleSend = async (msgText: string, attachments?: any[]) => {
    if (isStreaming) return;

    let targetId = activeId;

    // Nếu chưa có hội thoại (đang ở màn New Chat), tạo nháp một hội thoại trước khi gửi tin nhắn
    if (!targetId) {
      try {
        const nextIdx = conversations.length + 1;
        targetId = await createConversation(t("chat.history.tempTitle", { index: nextIdx }));
        setActiveId(targetId);
        // Thay đổi URL để reflect đúng ID mới
        router.replace(`/chat?id=${targetId}`);
      } catch (err) {
        toast.danger(t("chat.alert.createFailed"));
        return;
      }
    }

    // Các file đã được upload ở bước chọn file, giờ chỉ cần lấy data attachments gửi đi
    const uploadedAttachments = attachments || [];

    // Thêm tạm thời tin nhắn của user vào view local
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: msgText,
        metadata: {
           attachments: uploadedAttachments
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    await sendMessage(targetId, msgText, uploadedAttachments, async () => {
      // Done. Reload messages history from db to get final formatted items
      await loadMessages(targetId!);
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
    <div className="flex-1 flex flex-col h-full bg-default-50/10 relative overflow-hidden font-sans">
      <ChatHeader
        routedAgentName={routedAgentName}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

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

      {!pendingApproval && (
        <ChatInput isStreaming={isStreaming} onSend={handleSend} />
      )}
    </div>
  );
}
