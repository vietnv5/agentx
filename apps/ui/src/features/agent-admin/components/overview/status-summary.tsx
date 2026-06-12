

import { Zap } from "lucide-react";
import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface StatusSummaryProps {
  successExecs: number;
  errorExecs: number;
  deniedExecs: number;
  totalExecs: number;
}

export function StatusSummary({
  successExecs,
  errorExecs,
  deniedExecs,
  totalExecs,
}: StatusSummaryProps) {
  const { t } = useTranslation();

  return (
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
            <span className="text-default-500">
              {successExecs}
              {t("overview.metrics.times")}
            </span>
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
            <span className="text-default-500">
              {errorExecs}
              {t("overview.metrics.times")}
            </span>
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
            <span className="text-default-500">
              {deniedExecs}
              {t("overview.metrics.times")}
            </span>
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
  );
}
