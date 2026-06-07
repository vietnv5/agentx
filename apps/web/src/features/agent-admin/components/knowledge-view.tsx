"use client";

import * as React from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  Search,
  BookOpen,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  TextArea,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Label,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

interface Document {
  id: string;
  title: string;
  sourceType: string;
  originalFilename?: string;
  totalChunks: number;
  status: "processing" | "indexed" | "error";
  createdAt: string;
}

interface SearchResult {
  id: string;
  content: string;
  chunkIndex: number;
  distance: number;
}

export function KnowledgeView() {
  const t = useTranslations();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form Uploader State
  const [isUploading, setIsUploading] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState("");
  const [formContent, setFormContent] = React.useState("");
  const [formSourceType, setFormSourceType] = React.useState("markdown");

  // RAG Search Test Playground State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

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

  React.useEffect(() => {
    loadData();
    // Tự động reload danh sách mỗi 10s nếu có tài liệu đang processing
    const interval = setInterval(() => {
      if (documents.some((d) => d.status === "processing")) {
        loadData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loadData, documents]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    try {
      await adminService.uploadKnowledge({
        title: formTitle,
        content: formContent,
        sourceType: formSourceType,
        filename: `${formTitle.toLowerCase().replace(/ /g, "-")}.md`,
      });
      setIsUploading(false);
      setFormTitle("");
      setFormContent("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("knowledge.alert.uploadFailed"));
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (
      !confirm(
        t("knowledge.confirm.delete"),
      )
    )
      return;
    try {
      await adminService.deleteKnowledge(id);
      loadData();
    } catch (err: any) {
      alert(t("knowledge.alert.deleteFailed"));
    }
  };

  const handleSearchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const data = await adminService.searchKnowledge({
        query: searchQuery,
        limit: 5,
      });

      setSearchResults(data);
    } catch (err: any) {
      alert(t("knowledge.alert.searchFailed"));
    } finally {
      setSearching(false);
    }
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
      {isUploading && (
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
          <form className="space-y-6" onSubmit={handleUploadSubmit}>
            <div className="flex items-center justify-between border-b border-default-150 pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {t("knowledge.editor.title")}
              </h2>
              <Button
                isIconOnly
                className="cursor-pointer"
                size="sm"
                variant="danger"
                onClick={() => setIsUploading(false)}
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
                    <option value="markdown">{t("knowledge.editor.formatMarkdown")}</option>
                    <option value="text">{t("knowledge.editor.formatText")}</option>
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
                onClick={() => setIsUploading(false)}
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
      )}

      {/* Grid: Left - Doc List, Right - Similarity Search Debugger */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document List (Left Spanning 2) */}
        <Card className="lg:col-span-2 bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            {t("knowledge.list.title")}
          </h2>

          <div className="overflow-x-auto">
            <Table aria-label={t("knowledge.list.tableAriaLabel")} className="w-full">
              <TableHeader>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  {t("knowledge.list.colTitle")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  {t("knowledge.list.colFormat")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  {t("knowledge.list.colChunks")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  {t("knowledge.list.colStatus")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-right">
                  {t("knowledge.list.colActions")}
                </TableColumn>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <TableCell className="text-foreground font-semibold">
                      {doc.title}
                    </TableCell>
                    <TableCell className="text-default-500 uppercase font-mono text-xs">
                      {doc.sourceType}
                    </TableCell>
                    <TableCell className="text-center text-default-700 font-mono font-semibold">
                      {doc.totalChunks || 0} chunks
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          doc.status === "indexed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : doc.status === "processing"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                              : "bg-red-500/10 text-red-550 dark:text-red-400"
                        }`}
                      >
                        {doc.status === "indexed" ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        ) : doc.status === "processing" ? (
                          <Clock className="h-3 w-3 animate-spin" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {doc.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        className="cursor-pointer"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteDoc(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("knowledge.list.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="text-default-400 italic text-center py-6"
                      colSpan={5}
                    >
                      {t("knowledge.list.empty")}
                    </TableCell>
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Semantic Search Sandbox (Right Spanning 1) */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              {t("knowledge.search.title")}
            </h2>
            <p className="text-[10px] text-default-450">
              {t("knowledge.search.subtitle")}
            </p>
          </div>

          <form className="flex gap-2" onSubmit={handleSearchTest}>
            <input
              className="flex-1 bg-default-100 text-foreground border border-default-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              placeholder={t("knowledge.search.placeholder")}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              isIconOnly
              className="cursor-pointer"
              isDisabled={searching}
              size="sm"
              type="submit"
              variant="secondary"
            >
              {searching ? (
                <Spinner color="current" size="sm" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Search result items */}
          <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
            {searchResults.map((result) => {
              const similarity = (1 - result.distance) * 100;

              return (
                <div
                  key={result.id}
                  className="p-3 bg-default-50 border border-default-150 rounded-lg space-y-2 text-xs leading-relaxed"
                >
                  <div className="flex items-center justify-between border-b border-default-150 pb-1.5 text-[10px]">
                    <span className="font-semibold text-purple-600 dark:text-purple-400 font-mono">
                      Chunk #{result.chunkIndex}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {similarity.toFixed(1)}% {t("knowledge.search.match")}
                    </span>
                  </div>
                  <p className="text-default-600 font-mono text-[10px] break-words">
                    {result.content}
                  </p>
                </div>
              );
            })}
            {searchResults.length === 0 && !searching && (
              <p className="text-xs text-default-450 italic text-center py-8">
                {t("knowledge.search.empty")}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
