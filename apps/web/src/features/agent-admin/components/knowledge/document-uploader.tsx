"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Card, Button, Input, TextArea, TextField, Label } from "@heroui/react";
import { useTranslations } from "next-intl";

interface DocumentUploaderProps {
  onSubmit: (payload: { title: string; content: string; sourceType: string }) => Promise<void>;
  onCancel: () => void;
}

export function DocumentUploader({ onSubmit, onCancel }: DocumentUploaderProps) {
  const t = useTranslations();
  const [formTitle, setFormTitle] = React.useState("");
  const [formContent, setFormContent] = React.useState("");
  const [formSourceType, setFormSourceType] = React.useState("markdown");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    onSubmit({
      title: formTitle,
      content: formContent,
      sourceType: formSourceType,
    });
  };

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-default-150 pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {t("knowledge.editor.title")}
          </h2>
          <Button
            isIconOnly
            className="cursor-pointer"
            size="sm"
            variant="danger"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <TextField isRequired className="w-full" name="title">
            <Label className="text-default-500 text-xs font-semibold mb-1 block">
              {t("knowledge.editor.docTitle")}
            </Label>
            <Input
              className="text-foreground"
              placeholder={t("knowledge.editor.docTitlePlaceholder")}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </TextField>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <span className="text-xs font-semibold text-default-500 block mb-1">
                {t("knowledge.editor.format")}
              </span>
              <select
                className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                value={formSourceType}
                onChange={(e) => setFormSourceType(e.target.value)}
              >
                <option value="markdown">
                  {t("knowledge.editor.formatMarkdown")}
                </option>
                <option value="text">
                  {t("knowledge.editor.formatText")}
                </option>
              </select>
            </div>
          </div>

          <TextField isRequired className="w-full" name="content">
            <Label className="text-default-500 text-xs font-semibold mb-1 block">
              {t("knowledge.editor.content")}
            </Label>
            <TextArea
              className="text-foreground text-xs font-mono"
              placeholder={t("knowledge.editor.contentPlaceholder")}
              rows={10}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
            />
          </TextField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-default-150">
          <Button
            className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            {t("knowledge.editor.cancel")}
          </Button>
          <Button
            className="cursor-pointer font-bold"
            type="submit"
            variant="primary"
          >
            {t("knowledge.editor.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
