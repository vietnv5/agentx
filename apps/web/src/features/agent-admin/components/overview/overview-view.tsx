
import * as React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { MetricCards } from "./metric-cards";
import { CostChart } from "./cost-chart";
import { StatusSummary } from "./status-summary";

interface Stats {
  overall: {
    totalCost: number;
    totalTokens: number;
    avgLatencyMs: number;
    requestCount: number;
    agentCount: number;
    integrationCount: number;
  };
  past24h: {
    totalCost: number;
    totalTokens: number;
  };
  toolExecutions: Record<string, number>;
  costOverTime: Array<{ date: string; cost: number; tokens: number }>;
}

export default function OverviewView() {
  const { t } = useTranslation();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getOverviewStats();

      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("overview.error.fetch"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("overview.loading")}
        </span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-foreground">{t("overview.error.title")}</h2>
        <p className="text-default-500 max-w-md">
          {error || t("overview.error.message")}
        </p>
        <Button
          className="cursor-pointer"
          variant="primary"
          onClick={fetchStats}
        >
          {t("overview.retry")}
        </Button>
      </div>
    );
  }

  const { overall, past24h, toolExecutions, costOverTime } = stats;

  const successExecs = toolExecutions.success ?? 0;
  const errorExecs = toolExecutions.error ?? 0;
  const deniedExecs = toolExecutions.denied ?? 0;
  const totalExecs = successExecs + errorExecs + deniedExecs;
  const errorRate =
    totalExecs > 0 ? ((errorExecs / totalExecs) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("overview.title")}
          </h1>
          <p className="text-sm text-default-500">
            {t("overview.subtitle")}
          </p>
        </div>
        <Button
          className="cursor-pointer border border-default-200"
          variant="ghost"
          onClick={fetchStats}
        >
          <RefreshCw className="h-4 w-4" />
          {t("overview.refresh")}
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <MetricCards
        agentCount={overall.agentCount}
        avgLatencyMs={overall.avgLatencyMs}
        errorRate={errorRate}
        integrationCount={overall.integrationCount}
        overallCost={overall.totalCost}
        past24hCost={past24h.totalCost}
        requestCount={overall.requestCount}
        totalExecs={totalExecs}
      />

      {/* Main Stats Charts Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cost Over Time (SVG Chart) */}
        <CostChart costOverTime={costOverTime} />

        {/* Tool Status Summary */}
        <StatusSummary
          deniedExecs={deniedExecs}
          errorExecs={errorExecs}
          successExecs={successExecs}
          totalExecs={totalExecs}
        />
      </div>
    </div>
  );
}
