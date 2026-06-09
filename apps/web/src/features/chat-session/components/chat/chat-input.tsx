"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ChatInputProps {
  isStreaming: boolean;
  onSend: (message: string) => void;
}

export function ChatInput({ isStreaming, onSend }: ChatInputProps) {
  const t = useTranslations();
  const [input, setInput] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="p-6 bg-background border-t border-default-200/60">
      <form className="flex gap-2" onSubmit={handleSubmit}>
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
  );
}
