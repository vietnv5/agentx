"use client";

import * as React from "react";
import {
  Plug,
  Play,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Lock,
} from "lucide-react";
import { Card, Button, Spinner, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ToolDefinition {
  id: string;
  toolName: string;
  description?: string;
  inputSchema: any;
  requiresApproval: boolean;
  isActive?: boolean;
}

interface Integration {
  id: string;
  name: string;
  description?: string;
  transport: "sse" | "stdio" | "http";
  endpoint?: string;
  headers?: any;
  command?: string;
  args?: any;
  env?: any;
  status: "active" | "inactive" | "error";
  syncError?: string;
  toolDefinitions: ToolDefinition[];
}

interface IntegrationCardProps {
  integration: Integration;
  test: { success: boolean; error?: string; tools?: any[] } | undefined;
  isTesting: boolean;
  onTestConnection: (id: string) => void;
  onSyncTools: (id: string) => void;
  onEdit: (integration: Integration) => void;
  onDelete: (id: string) => void;
  onSelect?: (integration: Integration) => void;
}

export function IntegrationCard({
  integration,
  test,
  isTesting,
  onTestConnection,
  onSyncTools,
  onEdit,
  onDelete,
  onSelect,
}: IntegrationCardProps) {
  const t = useTranslations();

  return (
    <Card className="bg-content1 border border-default-150 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
      {/* Integration Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between w-full">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg border ${
              integration.status === "active"
                ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-default-200 border border-default-300 text-default-500"
            }`}
          >
            <Plug className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base leading-tight">
              {integration.name}
            </h3>
            <p className="text-xs text-default-500 mt-1">
              {integration.description || t("integrations.list.noDesc")}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-default-100 text-default-650 border border-default-200 font-mono">
                {integration.transport}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                  integration.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : integration.status === "error"
                      ? "bg-red-500/10 text-red-500 dark:text-red-400"
                      : "bg-default-100 text-default-500"
                }`}
              >
                {integration.status}
              </span>
              
              {(() => {
                const tools = integration.toolDefinitions || [];
                const totalCount = tools.length;
                const autoRunCount = tools.filter(t => (t.isActive ?? true) && !t.requiresApproval).length;
                const requiresApprovalCount = tools.filter(t => (t.isActive ?? true) && t.requiresApproval).length;
                const disabledCount = tools.filter(t => t.isActive === false).length;

                return (
                  <>
                    <Chip
                      size="sm"
                      variant="soft"
                      color="default"
                      className="font-bold text-[10px] h-5"
                    >
                      {t("integrations.list.totalToolsCount", { count: totalCount })}
                    </Chip>
                    {autoRunCount > 0 && (
                      <Chip
                        size="sm"
                        variant="soft"
                        color="success"
                        className="font-semibold text-[10px] h-5"
                      >
                        {t("integrations.list.autoRunCount", { count: autoRunCount })}
                      </Chip>
                    )}
                    {requiresApprovalCount > 0 && (
                      <Chip
                        size="sm"
                        variant="soft"
                        color="warning"
                        className="font-semibold text-[10px] h-5"
                      >
                        {t("integrations.list.approvalCount", { count: requiresApprovalCount })}
                      </Chip>
                    )}
                    {disabledCount > 0 && (
                      <Chip
                        size="sm"
                        variant="soft"
                        color="danger"
                        className="font-semibold text-[10px] h-5"
                      >
                        {t("integrations.list.disabledCount", { count: disabledCount })}
                      </Chip>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Connection Status Log if any */}
        {integration.syncError && (
          <div className="max-w-md bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 text-xs text-red-500 dark:text-red-400 leading-relaxed font-mono">
            <span className="font-semibold block mb-0.5 text-red-305">
              {t("integrations.list.syncError")}
            </span>
            {integration.syncError}
          </div>
        )}

      </div>

      {/* Action Buttons (Footer area) */}
      <div className="flex items-center justify-between pt-4 border-t border-default-150">
        <div className="flex items-center gap-2">
          <Button
            className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
            isDisabled={isTesting}
            size="sm"
            variant="ghost"
            onClick={() => onTestConnection(integration.id)}
          >
            {isTesting ? (
              <Spinner color="success" size="sm" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {t("integrations.list.testConnection")}
          </Button>
          <Button
            className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
            size="sm"
            variant="ghost"
            onClick={() => onSyncTools(integration.id)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("integrations.list.syncTools")}
          </Button>
          <Button
            className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(integration)}
          >
            <Edit2 className="h-3.5 w-3.5" />
            {t("integrations.list.edit")}
          </Button>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="danger"
            onClick={() => onDelete(integration.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("integrations.list.delete")}
          </Button>
        </div>
        {onSelect && (
          <Button
            className="cursor-pointer font-bold"
            size="sm"
            variant="primary"
            onClick={() => onSelect(integration)}
          >
            {t("integrations.list.manageTools", { fallback: "Manage Tools" })}
          </Button>
        )}
      </div>
    </Card>
  );
}
