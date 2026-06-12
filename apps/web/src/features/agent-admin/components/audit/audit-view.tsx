
import * as React from "react";
import { FileCode, AlertCircle } from "lucide-react";
import { Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { ToolAuditTable } from "./tool-audit-table";
import { LlmUsageTable } from "./llm-usage-table";

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

export function AuditView() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [toolsLogs, setToolsLogs] = React.useState<ToolExecution[]>([]);
  const [llmLogs, setLlmLogs] = React.useState<LlmUsageLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [toolsData, llmData] = await Promise.all([
        adminService.getToolsAuditLogs(50),
        adminService.getLlmUsageLogs(50),
      ]);

      setToolsLogs(toolsData);
      setLlmLogs(llmData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("audit.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && toolsLogs.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("audit.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCode className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          {t("audit.title")}
        </h1>
        <p className="text-sm text-default-500">
          {t("audit.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Logs */}
      <div className="space-y-8">
        {/* Section 1: Tool Executions */}
        <ToolAuditTable locale={locale} logs={toolsLogs} />

        {/* Section 2: LLM Cost & Token Usage Logs */}
        <LlmUsageTable locale={locale} logs={llmLogs} />
      </div>
    </div>
  );
}
