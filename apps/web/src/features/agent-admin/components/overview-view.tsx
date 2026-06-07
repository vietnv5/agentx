"use client";

import * as React from "react";
import { adminService } from "@/src/features/agent-admin/services/admin.service";
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
      setError(err.response?.data?.message || "Không thể tải số liệu thống kê");
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
        <span className="text-default-500 text-sm">Đang tải dữ liệu dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-foreground">Lỗi tải dữ liệu</h2>
        <p className="text-default-500 max-w-md">{error || "Có lỗi xảy ra khi kết nối tới máy chủ."}</p>
        <Button variant="primary" onClick={fetchStats} className="cursor-pointer">
          Thử lại
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
  const errorRate = totalExecs > 0 ? ((errorExecs / totalExecs) * 100).toFixed(1) : "0.0";

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
          <h1 className="text-2xl font-bold text-foreground">Hệ thống Điều khiển AgentX</h1>
          <p className="text-sm text-default-500">Giám sát hiệu năng đa agent, chi phí API và công cụ MCP.</p>
        </div>
        <Button
          variant="ghost"
          onClick={fetchStats}
          className="cursor-pointer border border-default-200"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Chi phí 24h</span>
            <DollarSign className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">${past24h.totalCost.toFixed(4)}</div>
          <p className="text-xs text-default-400">
            Tổng cộng: <span className="text-default-600 font-semibold">${overall.totalCost.toFixed(4)}</span>
          </p>
        </Card>

        {/* Card 2 */}
        <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Độ trễ trung bình</span>
            <Activity className="h-5 w-5 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{overall.avgLatencyMs} ms</div>
          <p className="text-xs text-default-400">
            Tổng số yêu cầu: <span className="text-default-600 font-semibold">{overall.requestCount}</span>
          </p>
        </Card>

        {/* Card 3 */}
        <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỷ lệ lỗi Tool</span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{errorRate}%</div>
          <p className="text-xs text-default-400">
            Tổng gọi tool: <span className="text-default-600 font-semibold">{totalExecs} lần</span>
          </p>
        </Card>

        {/* Card 4 */}
        <Card className="bg-content1 border border-default-150 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng tài nguyên</span>
            <Cpu className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{overall.agentCount} Agents</div>
          <p className="text-xs text-default-400">
            Kết nối MCP: <span className="text-default-600 font-semibold">{overall.integrationCount} server</span>
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
              Chi phí LLM 7 ngày qua (USD)
            </h3>
            <span className="text-xs text-default-400">Đơn vị: USD</span>
          </div>

          {costOverTime.length > 0 ? (
            <div className="space-y-4">
              {/* SVG Line Chart */}
              <div className="relative h-[180px] w-full">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="currentColor" className="text-default-100" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="currentColor" className="text-default-100" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="currentColor" className="text-default-200" strokeWidth="1" />

                  {/* Gradient Area under line */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${chartHeight} L${points} L${chartWidth},${chartHeight} Z`}
                    fill="url(#chart-grad)"
                  />

                  {/* Price Line */}
                  <polyline fill="none" stroke="#10B981" strokeWidth="2.5" points={points} />

                  {/* Interactive Circles on vertices */}
                  {costOverTime.map((d, i) => {
                    const x = (i / (costOverTime.length - 1 || 1)) * chartWidth;
                    const y = chartHeight - (d.cost / maxCost) * chartHeight;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="4"
                        className="fill-emerald-400 stroke-background stroke-2 hover:r-6 cursor-pointer transition-all"
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
              Không có dữ liệu chi phí 7 ngày qua.
            </div>
          )}
        </Card>

        {/* Tool Status Summary */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-default-500 flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            Trạng thái gọi MCP Tools
          </h3>

          <div className="space-y-4 pt-2">
            {/* Success Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">Thành công</span>
                <span className="text-default-500">{successExecs} lần</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalExecs > 0 ? (successExecs / totalExecs) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Error Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-red-500 dark:text-red-400">Lỗi thực thi</span>
                <span className="text-default-500">{errorExecs} lần</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${totalExecs > 0 ? (errorExecs / totalExecs) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Denied Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-500">Từ chối (Permission)</span>
                <span className="text-default-500">{deniedExecs} lần</span>
              </div>
              <div className="h-2 w-full rounded-full bg-default-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${totalExecs > 0 ? (deniedExecs / totalExecs) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-default-400 leading-relaxed pt-2">
              * Tỷ lệ lỗi được ghi nhận dựa trên các hoạt động gọi công cụ tự động của specialist agents trong ReAct loop.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
