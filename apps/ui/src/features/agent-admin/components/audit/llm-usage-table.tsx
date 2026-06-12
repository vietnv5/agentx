

import { Cpu } from "lucide-react";
import {
  Card,
  Table,
} from "@heroui/react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
          <Table.ScrollContainer>
            <Table.Content className="w-full">
              <Table.Header>
                <Table.Column isRowHeader className="bg-default-100 text-foreground font-bold">
                  {t("audit.llm.colAgent")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("audit.llm.colProvider")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("audit.llm.colModel")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("audit.llm.colTokens")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("audit.llm.colCost")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("audit.llm.colLatency")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-right">
                  {t("audit.llm.colTime")}
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="text-default-400 italic text-center py-6">
                    {t("audit.llm.empty")}
                  </div>
                )}
              >
                {logs.map((log) => (
                  <Table.Row
                    key={log.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <Table.Cell className="font-semibold text-foreground">
                      {log.agent?.name || t("audit.llm.routerAgent")}
                    </Table.Cell>
                    <Table.Cell className="text-default-500 capitalize">
                      {log.provider}
                    </Table.Cell>
                    <Table.Cell className="text-xs text-default-700 font-mono">
                      {log.model}
                    </Table.Cell>
                    <Table.Cell className="text-center text-xs text-default-500 font-mono">
                      {log.promptTokens} / {log.completionTokens} /{" "}
                      <span className="text-foreground font-bold">
                        {log.totalTokens}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      $
                      {log.costUsd ? Number(log.costUsd).toFixed(5) : "0.00000"}
                    </Table.Cell>
                    <Table.Cell className="text-center text-xs text-default-600 font-mono">
                      {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                    </Table.Cell>
                    <Table.Cell className="text-right text-xs text-default-455 font-mono">
                      {new Date(log.createdAt).toLocaleString(
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
