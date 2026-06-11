"use client";

import * as React from "react";
import { ArrowLeft, Lock, Unlock, Search, Check, X, ChevronDown } from "lucide-react";
import {
  Button,
  Table,
  Checkbox,
  Input,
  Spinner,
  Switch,
  cn,
} from "@heroui/react";
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
  toolDefinitions: ToolDefinition[];
  [key: string]: any;
}

interface IntegrationDetailProps {
  integration: Integration;
  onBack: () => void;
  onToggleToolApproval: (toolId: string, currentVal: boolean) => Promise<void>;
  onToggleToolActive: (toolId: string, currentVal: boolean) => Promise<void>;
}

export function IntegrationDetail({
  integration,
  onBack,
  onToggleToolApproval,
  onToggleToolActive,
}: IntegrationDetailProps) {
  const t = useTranslations();
  const [selectedKeys, setSelectedKeys] = React.useState<any>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [expandedSchemas, setExpandedSchemas] = React.useState<Record<string, boolean>>({});

  const filteredTools = React.useMemo(() => {
    if (!integration.toolDefinitions) return [];
    if (!searchQuery) return integration.toolDefinitions;
    const lowerQuery = searchQuery.toLowerCase();
    return integration.toolDefinitions.filter(
      (tool) =>
        tool.toolName.toLowerCase().includes(lowerQuery) ||
        (tool.description && tool.description.toLowerCase().includes(lowerQuery))
    );
  }, [integration.toolDefinitions, searchQuery]);

  const toggleSchema = (toolId: string) => {
    setExpandedSchemas((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleBulkToggle = async (requireApproval: boolean) => {
    setIsUpdating(true);
    try {
      const selectedIds =
        selectedKeys === "all"
          ? filteredTools.map((t) => t.id)
          : Array.from(selectedKeys as Set<any>).map((k) => String(k));
      
      if (selectedIds.length === 0) return;

      // Lọc các tool cần thay đổi trạng thái (tránh toggle thừa)
      const toolsToChange = filteredTools.filter(
        (tool) => selectedIds.includes(tool.id) && tool.requiresApproval !== requireApproval
      );

      // Chạy toggle thông qua parent method
      await Promise.all(
        toolsToChange.map((tool) => onToggleToolApproval(tool.id, tool.requiresApproval))
      );
      
      // Clear selection sau khi cập nhật thành công
      setSelectedKeys(new Set());
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkActiveToggle = async (isActive: boolean) => {
    setIsUpdating(true);
    try {
      const selectedIds =
        selectedKeys === "all"
          ? filteredTools.map((t) => t.id)
          : Array.from(selectedKeys as Set<any>).map((k) => String(k));
      
      if (selectedIds.length === 0) return;

      // Lọc các tool cần thay đổi trạng thái hoạt động
      const toolsToChange = filteredTools.filter(
        (tool) => selectedIds.includes(tool.id) && (tool.isActive ?? true) !== isActive
      );

      // Chạy toggle thông qua parent method
      await Promise.all(
        toolsToChange.map((tool) => onToggleToolActive(tool.id, tool.isActive ?? true))
      );
      
      // Clear selection sau khi cập nhật thành công
      setSelectedKeys(new Set());
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="ghost"
          onClick={onBack}
          className="text-default-500 hover:text-foreground cursor-pointer border-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {integration.name} <span className="text-default-400 font-normal">/</span> Tools
          </h2>
          <p className="text-sm text-default-500">
            {t("integrations.list.toolsHeader", { count: integration.toolDefinitions?.length || 0 })}
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-content1 p-3 rounded-xl border border-default-150 shadow-sm">
        <div className="relative w-full xl:max-w-xs">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
            <Search className="h-4 w-4 text-default-400" />
          </div>
          <Input
            className="w-full pl-8"
            placeholder={t("integrations.list.searchTools", { fallback: "Search tools..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Active status bulk actions */}
          <Button
            className="flex-1 sm:flex-none border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            variant="ghost"
            isDisabled={selectedKeys !== "all" && (selectedKeys.size === 0 || isUpdating)}
            onPress={() => handleBulkActiveToggle(true)}
          >
            {isUpdating ? <Spinner size="sm" color="success" /> : <Check className="h-4 w-4" />}
            {t("integrations.list.enableSelectedBulk", { fallback: "Enable Selected" })}
          </Button>
          <Button
            className="flex-1 sm:flex-none border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
            variant="ghost"
            isDisabled={selectedKeys !== "all" && (selectedKeys.size === 0 || isUpdating)}
            onPress={() => handleBulkActiveToggle(false)}
          >
            {isUpdating ? <Spinner size="sm" color="danger" /> : <X className="h-4 w-4" />}
            {t("integrations.list.disableSelectedBulk", { fallback: "Disable Selected" })}
          </Button>

          <div className="hidden sm:block w-[1px] h-6 bg-default-250 mx-1" />

          {/* Approval bulk actions */}
          <Button
            className="flex-1 sm:flex-none border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            variant="ghost"
            isDisabled={selectedKeys !== "all" && (selectedKeys.size === 0 || isUpdating)}
            onPress={() => handleBulkToggle(true)}
          >
            {isUpdating ? <Spinner size="sm" color="warning" /> : <Lock className="h-4 w-4" />}
            {t("integrations.list.requireApprovalBulk", { fallback: "Require Approval" })}
          </Button>
          <Button
            className="flex-1 sm:flex-none border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 cursor-pointer"
            variant="ghost"
            isDisabled={selectedKeys !== "all" && (selectedKeys.size === 0 || isUpdating)}
            onPress={() => handleBulkToggle(false)}
          >
            {isUpdating ? <Spinner size="sm" color="success" /> : <Unlock className="h-4 w-4" />}
            {t("integrations.list.autoRunBulk", { fallback: "Auto Run" })}
          </Button>
        </div>
      </div>

      <Table className="bg-content1 border border-default-150 shadow-sm rounded-xl p-0 overflow-hidden w-full">
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Integration Tools"
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          >
            <Table.Header>
              <Table.Column id="selection" className="pr-0 bg-default-50 text-default-600 font-semibold py-2.5 w-12 text-center">
                <Checkbox aria-label="Select all" slot="selection">
                  <Checkbox.Control className="bg-white dark:bg-default-900 border border-default-300 hover:border-default-450 dark:hover:border-default-500 rounded-md data-[selected=true]:bg-primary data-[selected=true]:border-primary transition-colors cursor-pointer">
                    <Checkbox.Indicator className="text-white" />
                  </Checkbox.Control>
                </Checkbox>
              </Table.Column>
              <Table.Column isRowHeader id="toolName" className="bg-default-50 text-default-600 font-semibold text-xs uppercase tracking-wider py-2.5 px-3 w-1/4">
                Tool Name
              </Table.Column>
              <Table.Column id="description" className="bg-default-50 text-default-600 font-semibold text-xs uppercase tracking-wider py-2.5 px-3 w-2/5">
                Description & Schema
              </Table.Column>
              <Table.Column id="isActive" className="bg-default-50 text-default-600 font-semibold text-xs uppercase tracking-wider py-2.5 px-3 text-center w-24">
                {t("integrations.list.toolActiveHeader", { fallback: "Active" })}
              </Table.Column>
              <Table.Column id="status" className="bg-default-50 text-default-600 font-semibold text-xs uppercase tracking-wider py-2.5 px-3 text-right">
                Status / Action
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex flex-col items-center justify-center p-8 text-center text-default-400">
                  {t("integrations.list.noToolsSynced")}
                </div>
              )}
            >
              {filteredTools.map((tool) => {
                const isActive = tool.isActive ?? true;
                const isSchemaExpanded = !!expandedSchemas[tool.id];
                return (
                  <Table.Row key={tool.id} id={tool.id} className={cn("border-b border-default-100 hover:bg-default-50/50 dark:hover:bg-default-50/20 transition-colors", !isActive && "bg-default-50/40 text-default-450 dark:text-default-500 opacity-80")}>
                    <Table.Cell className="pr-0 py-2.5 px-3 text-center align-top">
                      <Checkbox
                        aria-label={`Select ${tool.toolName}`}
                        slot="selection"
                        variant="secondary"
                      >
                        <Checkbox.Control className="bg-white dark:bg-default-900 border border-default-300 hover:border-default-450 dark:hover:border-default-500 rounded-md data-[selected=true]:bg-primary data-[selected=true]:border-primary transition-colors cursor-pointer">
                          <Checkbox.Indicator className="text-white" />
                        </Checkbox.Control>
                      </Checkbox>
                    </Table.Cell>
                    <Table.Cell className="py-2.5 px-3 text-sm font-sans align-top">
                      <span className="font-mono font-semibold text-foreground text-xs">{tool.toolName}</span>
                    </Table.Cell>
                    <Table.Cell className="py-2.5 px-3 text-sm font-sans align-top">
                      <div className="space-y-1.5">
                        <p className="text-default-550 leading-relaxed text-xs">
                          {tool.description || t("integrations.list.toolNoDescSet")}
                        </p>
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleSchema(tool.id)}
                            className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 focus:outline-none cursor-pointer"
                          >
                            <span>{t("integrations.list.inputSchema")}</span>
                            <ChevronDown className={cn("h-3 w-3 text-primary transition-transform duration-200", isSchemaExpanded ? "rotate-180" : "")} />
                          </button>
                          {isSchemaExpanded && (
                            <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              <pre className="bg-default-100 dark:bg-default-50 p-2 rounded-lg overflow-x-auto text-[10px] font-mono border border-default-150 text-foreground leading-normal max-w-xl max-h-48 scrollbar-thin">
                                {JSON.stringify(tool.inputSchema, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-2.5 px-3 text-center align-top">
                      <div className="flex justify-center items-center h-[24px]" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          size="sm"
                          isSelected={isActive}
                          onChange={() => onToggleToolActive(tool.id, isActive)}
                          className="cursor-pointer"
                        />
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-2.5 px-3 text-sm font-sans text-right align-top">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "cursor-pointer font-semibold text-xs h-7 px-2.5 transition-colors duration-150",
                          tool.requiresApproval
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            : "border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                        )}
                        isDisabled={!isActive}
                        onPress={() => onToggleToolApproval(tool.id, tool.requiresApproval)}
                      >
                        {tool.requiresApproval ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                        {tool.requiresApproval ? t("integrations.list.requiresApproval") : t("integrations.list.autoRun")}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
