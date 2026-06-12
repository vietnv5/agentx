
import * as React from "react";
import { Modal, Button, Input, TextArea, TextField, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface DocumentUploaderProps {
  isOpen: boolean;
  onSubmit: (payload: { title: string; content: string; sourceType: string }) => Promise<void>;
  onCancel: () => void;
}

export function DocumentUploader({ isOpen, onSubmit, onCancel }: DocumentUploaderProps) {
  const { t } = useTranslation();
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
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} variant="blur">
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog className="w-full sm:!max-w-7xl h-auto">
          <Modal.CloseTrigger />
          <form className="w-full" onSubmit={handleSubmit}>
            <Modal.Header className="flex flex-col gap-1 text-lg font-bold">
              {t("knowledge.editor.title")}
            </Modal.Header>
            <Modal.Body className="pb-6">
              <div className="space-y-4">
          <TextField
            isRequired
            className="w-full"
            name="title"
            value={formTitle}
            onChange={setFormTitle}
          >
            <Label className="text-default-500 text-xs font-semibold mb-1 block">
              {t("knowledge.editor.docTitle")}
            </Label>
            <Input
              className="text-foreground"
              placeholder={t("knowledge.editor.docTitlePlaceholder")}
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

          <TextField
            isRequired
            className="w-full"
            name="content"
            value={formContent}
            onChange={setFormContent}
          >
            <Label className="text-default-500 text-xs font-semibold mb-1 block">
              {t("knowledge.editor.content")}
            </Label>
            <TextArea
              className="text-foreground text-xs font-mono"
              placeholder={t("knowledge.editor.contentPlaceholder")}
              rows={10}
            />
          </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
                type="button"
                variant="ghost"
                onPress={onCancel}
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
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
