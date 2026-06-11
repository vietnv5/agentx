"use client";

import * as React from "react";
import { FolderOpen, Plus, AlertCircle } from "lucide-react";
import { Button, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { DocumentList } from "./document-list";
import { DocumentUploader } from "./document-uploader";
import { SearchSandbox } from "./search-sandbox";
import { ConfirmModal } from "@/src/components/confirm-modal";

interface Document {
  id: string;
  title: string;
  sourceType: string;
  originalFilename?: string;
  totalChunks: number;
  status: "processing" | "indexed" | "error";
  createdAt: string;
}

export function KnowledgeView() {
  const t = useTranslations();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form Uploader State
  const [isUploading, setIsUploading] = React.useState(false);

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [docToDeleteId, setDocToDeleteId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getKnowledge();

      setDocuments(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("knowledge.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const documentsRef = React.useRef(documents);
  React.useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  React.useEffect(() => {
    loadData();
    // Tự động reload danh sách mỗi 10s nếu có tài liệu đang processing
    const interval = setInterval(() => {
      if (documentsRef.current.some((d) => d.status === "processing")) {
        loadData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleUploadSubmit = async (payload: {
    title: string;
    content: string;
    sourceType: string;
  }) => {
    try {
      await adminService.uploadKnowledge({
        ...payload,
        filename: `${payload.title.toLowerCase().replace(/ /g, "-")}.md`,
      });
      setIsUploading(false);
      toast.success(t("knowledge.alert.uploadSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("knowledge.alert.uploadFailed"));
    }
  };

  const handleDeleteDoc = (id: string) => {
    setDocToDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDeleteId) return;
    try {
      await adminService.deleteKnowledge(docToDeleteId);
      toast.success(t("knowledge.alert.deleteSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("knowledge.alert.deleteFailed"));
    }
  };

  const handleSearch = async (query: string) => {
    const data = await adminService.searchKnowledge({
      query,
      limit: 5,
    });
    return data;
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("knowledge.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            {t("knowledge.title")}
          </h1>
          <p className="text-sm text-default-500">
            {t("knowledge.subtitle")}
          </p>
        </div>
        {!isUploading && (
          <Button
            className="cursor-pointer"
            variant="primary"
            onClick={() => setIsUploading(true)}
          >
            <Plus className="h-4 w-4" />
            {t("knowledge.addDoc")}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Editor */}
      <DocumentUploader
        isOpen={isUploading}
        onCancel={() => setIsUploading(false)}
        onSubmit={handleUploadSubmit}
      />

      {/* Grid: Left - Doc List, Right - Similarity Search Debugger */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document List (Left Spanning 2) */}
        <DocumentList documents={documents} onDelete={handleDeleteDoc} />

        {/* Semantic Search Sandbox (Right Spanning 1) */}
        <SearchSandbox onSearch={handleSearch} />
      </div>

      {/* Delete Document Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("knowledge.list.delete")}
        description={t("knowledge.confirm.delete")}
        onConfirm={confirmDeleteDoc}
      />
    </div>
  );
}
