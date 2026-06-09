"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Modal, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText,
  cancelText,
  variant = "danger",
}: ConfirmModalProps) {
  const t = useTranslations();
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine icon background and color based on variant
  const iconColorClass = {
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    primary: "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400",
  }[variant];

  const confirmBtnVariant = {
    danger: "danger",
    warning: "warning",
    primary: "primary",
  }[variant] as any;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[360px] bg-content1 border border-default-150 rounded-xl shadow-lg p-4">
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-row items-center gap-2 pb-2">
            <Modal.Icon className={`${iconColorClass} rounded-lg p-1.5 shrink-0 size-8 flex items-center justify-center`}>
              <AlertTriangle className="size-4" />
            </Modal.Icon>
            <Modal.Heading className="text-sm font-bold text-foreground leading-none">
              {title}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="py-2.5 text-xs text-default-550 leading-relaxed">
            {description}
          </Modal.Body>
          <Modal.Footer className="flex justify-end gap-2 pt-2.5 border-t border-default-100">
            <Button
              className="cursor-pointer border border-default-250 text-default-550"
              size="sm"
              variant="ghost"
              isDisabled={loading}
              onPress={() => onOpenChange(false)}
            >
              {cancelText || t("cancel") || "Hủy"}
            </Button>
            <Button
              className="cursor-pointer font-semibold flex items-center gap-1.5"
              size="sm"
              variant={confirmBtnVariant}
              isPending={loading}
              isDisabled={loading}
              onPress={handleConfirm}
            >
              {loading && <Spinner color="current" size="sm" />}
              {confirmText || t("confirm") || "Xác nhận"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
