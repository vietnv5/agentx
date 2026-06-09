"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import {
  Card,
  Table,
} from "@heroui/react";
import { useTranslations } from "next-intl";

interface ToolExecution {
  id: string;
  toolName: string;
  input: any;
  output: any;
  status: "success" | "error" | "denied" | "timeout";
  errorMessage?: string;
  durationMs?: number;
  executedAt: string;
}

interface ToolAuditTableProps {
  logs: ToolExecution[];
  locale: string;
}

export function ToolAuditTable({ logs, locale }: ToolAuditTableProps) {
  const t = useTranslations();

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          {t("audit.tools.title")}
        </h2>
        <p className="text-[10px] text-default-450">
          {t("audit.tools.subtitle")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table aria-label={t("audit.list.tableAriaLabelTool")} className="w-full">
          <Table.ScrollContainer>
            <Table.Content className="w-full">
              <Table.Header>
                <Table.Column isRowHeader className="bg-default-100 text-foreground font-bold">
                  {t("audit.tools.colName")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("audit.tools.colInput")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("audit.tools.colOutput")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("audit.tools.colStatus")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("audit.tools.colDuration")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-right">
                  {t("audit.tools.colTime")}
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="text-default-400 italic text-center py-6">
                    {t("audit.tools.empty")}
                  </div>
                )}
              >
                {logs.map((log) => (
                  <Table.Row
                    key={log.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <Table.Cell className="font-mono text-xs text-foreground font-semibold">
                      {log.toolName}
                    </Table.Cell>
                    <Table.Cell className="max-w-[180px] truncate">
                      <span
                        className="font-mono text-[10px] text-default-500 block"
                        title={JSON.stringify(log.input)}
                      >
                        {JSON.stringify(log.input)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="max-w-[220px] truncate">
                      <span
                        className="font-mono text-[10px] text-default-500 block"
                        title={JSON.stringify(log.output)}
                      >
                        {log.errorMessage ? (
                          <span className="text-red-500 dark:text-red-400 font-bold">
                            {log.errorMessage}
                          </span>
                        ) : (
                          JSON.stringify(log.output)
                        )}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : log.status === "denied"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-500 dark:text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-center text-xs text-default-600 font-mono">
                      {log.durationMs ? `${log.durationMs}ms` : "-"}
                    </Table.Cell>
                    <Table.Cell className="text-right text-xs text-default-455 font-mono">
                      {new Date(log.executedAt).toLocaleString(
                        locale === "vi" ? "vi-VN" : "en-US",
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </Card>
  );
}
