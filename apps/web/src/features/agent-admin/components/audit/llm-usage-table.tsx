"use client";

import * as React from "react";
import { Cpu } from "lucide-react";
import {
  Card,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { useTranslations } from "next-intl";

interface LlmUsageLog {
  id: string;
  provider: string;
  model: string;
  tier?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: string;
  latencyMs?: number;
  createdAt: string;
  agent?: { name: string };
}

interface LlmUsageTableProps {
  logs: LlmUsageLog[];
  locale: string;
}

export function LlmUsageTable({ logs, locale }: LlmUsageTableProps) {
  const t = useTranslations();

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          {t("audit.llm.title")}
        </h2>
        <p className="text-[10px] text-default-455">
          {t("audit.llm.subtitle")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table aria-label={t("audit.list.tableAriaLabelLlm")} className="w-full">
          <TableHeader>
            <TableColumn className="bg-default-100 text-foreground font-bold">
              {t("audit.llm.colAgent")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold">
              {t("audit.llm.colProvider")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold">
              {t("audit.llm.colModel")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold text-center">
              {t("audit.llm.colTokens")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold text-center">
              {t("audit.llm.colCost")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold text-center">
              {t("audit.llm.colLatency")}
            </TableColumn>
            <TableColumn className="bg-default-100 text-foreground font-bold text-right">
              {t("audit.llm.colTime")}
            </TableColumn>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-b border-default-100 hover:bg-default-50/50"
              >
                <TableCell className="font-semibold text-foreground">
                  {log.agent?.name || t("audit.llm.routerAgent")}
                </TableCell>
                <TableCell className="text-default-500 capitalize">
                  {log.provider}
                </TableCell>
                <TableCell className="text-xs text-default-700 font-mono">
                  {log.model}
                </TableCell>
                <TableCell className="text-center text-xs text-default-500 font-mono">
                  {log.promptTokens} / {log.completionTokens} /{" "}
                  <span className="text-foreground font-bold">
                    {log.totalTokens}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  $
                  {log.costUsd ? Number(log.costUsd).toFixed(5) : "0.00000"}
                </TableCell>
                <TableCell className="text-center text-xs text-default-600 font-mono">
                  {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                </TableCell>
                <TableCell className="text-right text-xs text-default-455 font-mono">
                  {new Date(log.createdAt).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                  )}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  className="text-default-400 italic text-center py-6"
                  colSpan={7}
                >
                  {t("audit.llm.empty")}
                </TableCell>
                <TableCell className="hidden" />
                <TableCell className="hidden" />
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
