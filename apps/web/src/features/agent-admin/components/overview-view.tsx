"use client";

import * as React from "react";
import {
  TrendingUp,
  Cpu,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Activity,
  Zap,
} from "lucide-react";
import { Card, Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

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
  const t = useTranslations();
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
  }, []);

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

  // Tính tỷ lệ lỗi tool
  const successExecs = toolExecutions.success ?? 0;
  const errorExecs = toolExecutions.error ?? 0;
  const deniedExecs = toolExecutions.denied ?? 0;
  const totalExecs = successExecs + errorExecs + deniedExecs;
  const errorRate =
    totalExecs > 0 ? ((errorExecs / totalExecs) * 100).toFixed(1) : "0.0";

  // Vẽ SVG Line/Bar Chart đơn giản cho costOverTime
  const maxCost = Math.max(...costOverTime.map((d) => d.cost), 0.01);
  const chartHeight = 150;
  const chartWidth = 500;
  const points = costOverTime
    .map((d, index) => {
      const x = (index / (costOverTime.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (d.cost / maxCost) * chartHeight;

      return `${x},${y}`;
    })
    .join(" ");

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
            ${past24h.totalCost.toFixed(4)}
          </div>
          <p className="text-xs text-default-400">
            {t("overview.metrics.total")}{" "}
            <span className="text-default-600 font-semibold">
              ${overall.totalCost.toFixed(4)}
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
            {overall.avgLatencyMs} ms
          </div>
          <p className="text-xs text-default-400">
            {t("overview.metrics.totalRequests")}{" "}
            <span className="text-default-600 font-semibold">
              {overall.requestCount}
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
            {overall.agentCount} Agents
          </div>
          <p className="text-xs text-default-400">
            {t("overview.metrics.mcpConnections")}{" "}
            <span className="text-default-600 font-semibold">
              {overall.integrationCount}{t("overview.metrics.servers")}
            </span>
          </p>
        </Card>
      </div>

      {/* Main Stats Charts Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cost Over Time (SVG Chart) */}
        <Card className="col-span-2 bg-content1 border border-default-150 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              {t("overview.chart.llmCost")}
            </h3>
            <span className="text-xs text-default-400">{t("overview.chart.unit")}</span>
          </div>

          {costOverTime.length > 0 ? (
            <div className="space-y-4">
              {/* SVG Line Chart */}
              <div className="relative h-[180px] w-full">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                >
                  {/* Grid Lines */}
                  <line
                    className="text-default-100"
                    stroke="currentColor"
                    strokeDasharray="4"
                    strokeWidth="1"
                    x1="0"
                    x2={chartWidth}
                    y1="0"
                    y2="0"
                  />
                  <line
                    className="text-default-100"
                    stroke="currentColor"
                    strokeDasharray="4"
                    strokeWidth="1"
                    x1="0"
                    x2={chartWidth}
                    y1={chartHeight / 2}
                    y2={chartHeight / 2}
                  />
                  <line
                    className="text-default-200"
                    stroke="currentColor"
                    strokeWidth="1"
                    x1="0"
                    x2={chartWidth}
                    y1={chartHeight}
                    y2={chartHeight}
                  />

                  {/* Gradient Area under line */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${chartHeight} L${points} L${chartWidth},${chartHeight} Z`}
                    fill="url(#chart-grad)"
                  />

                  {/* Price Line */}
                  <polyline
                    fill="none"
                    points={points}
                    stroke="#10B981"
                    strokeWidth="2.5"
                  />

                  {/* Interactive Circles on vertices */}
                  {costOverTime.map((d, i) => {
                    const x = (i / (costOverTime.length - 1 || 1)) * chartWidth;
                    const y = chartHeight - (d.cost / maxCost) * chartHeight;

                    return (
                      <circle
                        key={i}
                        className="fill-emerald-400 stroke-background stroke-2 hover:r-6 cursor-pointer transition-all"
                        cx={x}
                        cy={y}
                        r="4"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Labels */}
              <div className="flex justify-between text-[10px] text-default-400 font-mono">
                {costOverTime.map((d, i) => (
                  <span key={i}>{d.date.slice(5)}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-xs text-default-500">
              {t("overview.chart.noData")}
            </div>
          )}
        </Card>

        {/* Tool Status Summary */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-default-500 flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            {t("overview.chart.mcpStatus")}
          </h3>

          <div className="space-y-4 pt-2">
            {/* Success Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t("overview.chart.success")}
                </span>
                <span className="text-default-500">{successExecs}{t("overview.metrics.times")}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${totalExecs > 0 ? (successExecs / totalExecs) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Error Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-red-500 dark:text-red-400">
                  {t("overview.chart.execError")}
                </span>
                <span className="text-default-500">{errorExecs}{t("overview.metrics.times")}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${totalExecs > 0 ? (errorExecs / totalExecs) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Denied Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-500">{t("overview.chart.denied")}</span>
                <span className="text-default-500">{deniedExecs}{t("overview.metrics.times")}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${totalExecs > 0 ? (deniedExecs / totalExecs) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-[10px] text-default-400 leading-relaxed pt-2">
              {t("overview.chart.note")}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
