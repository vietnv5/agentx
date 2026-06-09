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
import { Card, Button, Spinner, Accordion } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ToolDefinition {
  id: string;
  toolName: string;
  description?: string;
  inputSchema: any;
  requiresApproval: boolean;
}

interface Integration {
  id: string;
  name: string;
  description?: string;
  transport: "sse" | "stdio";
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
  onToggleToolApproval: (toolId: string, currentVal: boolean) => void;
}

export function IntegrationCard({
  integration,
  test,
  isTesting,
  onTestConnection,
  onSyncTools,
  onEdit,
  onDelete,
  onToggleToolApproval,
}: IntegrationCardProps) {
  const t = useTranslations();

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-6 shadow-sm">
      {/* Integration Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-default-150 pb-4">
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
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-default-100 text-default-655 border border-default-200 font-mono">
                {integration.transport}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                  integration.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : integration.status === "error"
                      ? "bg-red-500/10 text-red-505 dark:text-red-400"
                      : "bg-default-100 text-default-500"
                }`}
              >
                {integration.status}
              </span>
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
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
      </div>

      {/* Test results if triggered */}
      {test && (
        <div
          className={`p-4 rounded-lg border flex gap-3 items-start ${
            test.success
              ? "bg-emerald-500/5 border-emerald-500/15"
              : "bg-red-500/5 border-red-500/15"
          }`}
        >
          {test.success ? (
            <>
              <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-foreground">
                  {t("integrations.list.testSuccess")}
                </span>
                <p className="text-default-500 mt-1 leading-relaxed">
                  {t("integrations.list.testSuccessDetail", {
                    count: test.tools?.length || 0,
                    tools:
                      test.tools?.map((t: any) => t.name).join(", ") ||
                      t("integrations.list.noTools"),
                  })}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-foreground">
                  {t("integrations.list.testFailed")}
                </span>
                <p className="text-red-500 dark:text-red-400 mt-1 leading-relaxed font-mono">
                  {test.error}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Discovered Tools Accordion */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-default-455">
          {t("integrations.list.toolsHeader", {
            count: integration.toolDefinitions?.length || 0,
          })}
        </h4>

        <Accordion className="px-0" variant="surface">
          {integration.toolDefinitions?.map((tool) => (
            <Accordion.Item
              key={tool.id}
              className="bg-default-50/50 border border-default-200 rounded-lg hover:border-default-300 transition-colors"
            >
              <Accordion.Heading>
                <Accordion.Trigger className="flex items-center justify-between w-full">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {tool.toolName}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-default-500 truncate max-w-[200px] md:max-w-xs block font-sans">
                        {tool.description || t("integrations.list.toolNoDesc")}
                      </span>
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all focus:outline-none ${
                          tool.requiresApproval
                            ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : "bg-default-100 border border-default-200 text-default-500 hover:bg-default-200 hover:text-foreground"
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn sự kiện click expand Accordion
                          onToggleToolApproval(tool.id, tool.requiresApproval);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleToolApproval(tool.id, tool.requiresApproval);
                          }
                        }}
                      >
                        <Lock className="h-3 w-3" />
                        {tool.requiresApproval
                          ? t("integrations.list.requiresApproval")
                          : t("integrations.list.autoRun")}
                      </div>
                    </div>
                  </div>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="text-xs space-y-3 p-1 font-sans text-default-650 leading-relaxed">
                  <div>
                    <span className="font-bold text-default-700">
                      {t("integrations.list.toolDesc")}
                    </span>
                    <p className="mt-0.5">
                      {tool.description || t("integrations.list.toolNoDescSet")}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-default-700">
                      {t("integrations.list.inputSchema")}
                    </span>
                    <pre className="mt-1 bg-default-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono border border-default-150">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        {(!integration.toolDefinitions ||
          integration.toolDefinitions.length === 0) && (
          <p className="text-xs text-default-455 italic text-center py-4 border border-dashed border-default-200 rounded-lg">
            {t("integrations.list.noToolsSynced")}
          </p>
        )}
      </div>
    </Card>
  );
}
