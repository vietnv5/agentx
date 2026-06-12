

import { DollarSign, Activity, AlertTriangle, Cpu } from "lucide-react";
import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface MetricCardsProps {
  past24hCost: number;
  overallCost: number;
  avgLatencyMs: number;
  requestCount: number;
  errorRate: string;
  totalExecs: number;
  agentCount: number;
  integrationCount: number;
}

export function MetricCards({
  past24hCost,
  overallCost,
  avgLatencyMs,
  requestCount,
  errorRate,
  totalExecs,
  agentCount,
  integrationCount,
}: MetricCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1 */}
      <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-default-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("overview.metrics.cost24h")}
          </span>
          <DollarSign className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-foreground">
          ${past24hCost.toFixed(4)}
        </div>
        <p className="text-xs text-default-400">
          {t("overview.metrics.total")}{" "}
          <span className="text-default-600 font-semibold">
            ${overallCost.toFixed(4)}
          </span>
        </p>
      </Card>

      {/* Card 2 */}
      <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-default-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("overview.metrics.latency")}
          </span>
          <Activity className="h-5 w-5 text-sky-500 dark:text-sky-400" />
        </div>
        <div className="text-2xl font-bold text-foreground">
          {avgLatencyMs} ms
        </div>
        <p className="text-xs text-default-400">
          {t("overview.metrics.totalRequests")}{" "}
          <span className="text-default-600 font-semibold">
            {requestCount}
          </span>
        </p>
      </Card>

      {/* Card 3 */}
      <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-default-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("overview.metrics.toolErrorRate")}
          </span>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-foreground">{errorRate}%</div>
        <p className="text-xs text-default-400">
          {t("overview.metrics.totalToolCalls")}{" "}
          <span className="text-default-600 font-semibold">
            {totalExecs}{t("overview.metrics.times")}
          </span>
        </p>
      </Card>

      {/* Card 4 */}
      <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-default-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("overview.metrics.totalResources")}
          </span>
          <Cpu className="h-5 w-5 text-purple-500 dark:text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-foreground">
          {agentCount} Agents
        </div>
        <p className="text-xs text-default-400">
          {t("overview.metrics.mcpConnections")}{" "}
          <span className="text-default-600 font-semibold">
            {integrationCount}{t("overview.metrics.servers")}
          </span>
        </p>
      </Card>
    </div>
  );
}
