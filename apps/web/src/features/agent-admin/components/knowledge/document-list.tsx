"use client";

import * as React from "react";
import { BookOpen, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import {
  Card,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { useTranslations } from "next-intl";

interface Document {
  id: string;
  title: string;
  sourceType: string;
  originalFilename?: string;
  totalChunks: number;
  status: "processing" | "indexed" | "error";
  createdAt: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const t = useTranslations();

  return (
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
                    onClick={() => onDelete(doc.id)}
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
  );
}
