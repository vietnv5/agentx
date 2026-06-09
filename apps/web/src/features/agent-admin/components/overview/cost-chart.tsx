"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@heroui/react";
import { useTranslations } from "next-intl";

interface CostOverTimeEntry {
  date: string;
  cost: number;
  tokens: number;
}

interface CostChartProps {
  costOverTime: CostOverTimeEntry[];
}

export function CostChart({ costOverTime }: CostChartProps) {
  const t = useTranslations();

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
  );
}
