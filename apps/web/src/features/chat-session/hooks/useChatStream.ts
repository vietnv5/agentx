import * as React from "react";

import { useAuthStore } from "@/src/features/auth/auth-store";
import { useTranslations } from "next-intl";

export interface ToolLog {
  toolName: string;
  args?: any;
  output?: any;
  status: "pending" | "success" | "error" | "denied";
}

export interface PendingApproval {
  id: string;
  toolName: string;
  args: any;
  description?: string;
}

import { useChatStore } from "./useChatStore";

export function useChatStream() {
  const t = useTranslations();
  const { accessToken } = useAuthStore.getState();
  const isStreaming = useChatStore((state) => state.isStreaming);
  const setIsStreaming = useChatStore((state) => state.setIsStreaming);
  const [routedAgentName, setRoutedAgentName] = React.useState<string | null>(
    null,
  );
  const [streamingText, setStreamingText] = React.useState("");
  const [runningTool, setRunningTool] = React.useState<ToolLog | null>(null);
  const [completedTools, setCompletedTools] = React.useState<ToolLog[]>([]);
  const [pendingApproval, setPendingApproval] =
    React.useState<PendingApproval | null>(null);

  // Đọc SSE Stream bằng Fetch Reader để đính kèm Token Auth
  const readStream = async (url: string, onComplete?: () => Promise<void>) => {
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
        throw new Error(t("chat.stream.initError"));
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
              console.log("[useChatStream] Parsed SSE event:", event, "data:", data);

              if (event === "agent_routing") {
                setRoutedAgentName(data.agentName);
              } else if (event === "token") {
                setStreamingText((prev) => prev + data);
              } else if (event === "tool_start") {
                setRunningTool({
                  toolName: data.toolName,
                  args: data.args,
                  status: "pending",
                });
              } else if (event === "tool_end") {
                setRunningTool(null);
                setCompletedTools((prev) => [
                  ...prev,
                  {
                    toolName: data.toolName,
                    output: data.output,
                    status: data.status === "success" ? "success" : "error",
                  },
                ]);
              } else if (event === "tool_approval_required") {
                setPendingApproval({
                  id: data.approvalRequestId,
                  toolName: data.toolName,
                  args: data.args,
                  description: data.description,
                });
              } else if (event === "complete") {
                if (onComplete) {
                  await onComplete();
                }
              } else if (event === "error") {
                alert(t("chat.stream.agentError", { error: data }));
              }
            } catch (e) {
              // Parse error
            }
          }
        }
      }
    } catch (err: any) {
      alert(t("chat.stream.connError", { error: err.message }));
    } finally {
      setIsStreaming(false);
      setRunningTool(null);
      setStreamingText("");
    }
  };

  const sendMessage = async (
    activeId: string,
    content: string,
    attachments: any[] = [],
    onComplete?: () => Promise<void>,
  ) => {
    let url = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    }/api/chat/conversations/${activeId}/messages/stream?content=${encodeURIComponent(content)}`;

    if (attachments.length > 0) {
      url += `&attachments=${encodeURIComponent(JSON.stringify(attachments))}`;
    }

    await readStream(url, onComplete);
  };

  const decideApproval = async (
    activeId: string,
    approvalId: string,
    approved: boolean,
    onComplete?: () => Promise<void>,
  ) => {
    const url = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    }/api/chat/conversations/${activeId}/approval/${approvalId}/decide/stream?approved=${approved}`;

    await readStream(url, onComplete);
  };

  return {
    isStreaming,
    routedAgentName,
    streamingText,
    runningTool,
    completedTools,
    pendingApproval,
    setPendingApproval,
    sendMessage,
    decideApproval,
  };
}
