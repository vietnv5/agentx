"use client";

import * as React from "react";
import { Plug, Plus, AlertCircle } from "lucide-react";
import { Button, Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useRouter, useSearchParams } from "next/navigation";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { IntegrationForm } from "./mcp/integration-form";
import { IntegrationCard } from "./mcp/integration-card";
import { IntegrationDetail } from "./mcp/integration-detail";
import { ConfirmModal } from "@/src/components/confirm-modal";

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
  authConfig?: any;
  status: "active" | "inactive" | "error";
  syncError?: string;
  toolDefinitions: ToolDefinition[];
}

export default function IntegrationsView() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingIntegration, setEditingIntegration] = React.useState<Integration | null>(null);

  // Detail View State
  const [selectedIntegrationId, setSelectedIntegrationId] = React.useState<string | null>(null);

  // Sync selected ID with URL search param
  React.useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      if (selectedIntegrationId !== idParam) {
        setSelectedIntegrationId(idParam);
      }
    } else {
      if (selectedIntegrationId !== null) {
        setSelectedIntegrationId(null);
      }
    }
  }, [searchParams, selectedIntegrationId]);

  const handleSelectIntegration = (id: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set("id", id);
    } else {
      params.delete("id");
    }
    const newSearch = params.toString();
    router.push(newSearch ? `/admin/integrations?${newSearch}` : `/admin/integrations`);
  };

  const selectedIntegration = React.useMemo(() => {
    return integrations.find((i) => i.id === selectedIntegrationId) || null;
  }, [integrations, selectedIntegrationId]);

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [integrationToDeleteId, setIntegrationToDeleteId] = React.useState<string | null>(null);

  // Connection Test State
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResult, setTestResult] = React.useState<
    Record<string, { success: boolean; error?: string; tools?: any[] }>
  >({});

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getIntegrations();

      setIntegrations(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("integrations.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingIntegration(null);
    setIsEditing(false);
  };

  const handleSubmit = async (payload: any) => {
    try {
      if (editingIntegration) {
        await adminService.updateIntegration(editingIntegration.id, payload);
        toast.success(t("integrations.alert.saveSuccess"));
      } else {
        await adminService.createIntegration(payload);
        toast.success(t("integrations.alert.saveSuccess"));
      }
      setEditingIntegration(null);
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("integrations.alert.saveFailed"));
    }
  };

  const handleDelete = (id: string) => {
    setIntegrationToDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDeleteIntegration = async () => {
    if (!integrationToDeleteId) return;
    try {
      await adminService.deleteIntegration(integrationToDeleteId);
      toast.success(t("integrations.alert.deleteSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("integrations.alert.deleteFailed"));
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const data = await adminService.testIntegration(id);

      setTestResult((prev) => ({
        ...prev,
        [id]: { success: data.success, error: data.error, tools: data.tools },
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          success: false,
          error: err.response?.data?.message || t("integrations.alert.testError"),
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncTools = async (id: string) => {
    try {
      await adminService.syncIntegration(id);
      toast.success(t("integrations.alert.syncSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("integrations.alert.syncFailed"));
    }
  };

  const handleToggleToolApproval = async (
    toolId: string,
    currentVal: boolean,
  ) => {
    try {
      await adminService.toggleToolApproval(toolId, !currentVal);
      toast.success(t("integrations.alert.permissionSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("integrations.alert.permissionFailed"));
    }
  };

  const handleToggleToolActive = async (
    toolId: string,
    currentVal: boolean,
  ) => {
    try {
      await adminService.toggleToolActive(toolId, !currentVal);
      toast.success(t("integrations.alert.permissionSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("integrations.alert.permissionFailed"));
    }
  };

  if (loading && integrations.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("integrations.loading")}
        </span>
      </div>
    );
  }

  if (selectedIntegration) {
    return (
      <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 font-sans">
        <IntegrationDetail
          integration={selectedIntegration}
          onBack={() => handleSelectIntegration(null)}
          onToggleToolApproval={handleToggleToolApproval}
          onToggleToolActive={handleToggleToolActive}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            {t("integrations.title")}
          </h1>
          <p className="text-sm text-default-500">
            {t("integrations.subtitle")}
          </p>
        </div>
        {!isEditing && (
          <Button
            className="cursor-pointer"
            variant="primary"
            onClick={() => setIsEditing(true)}
          >
            <Plus className="h-4 w-4" />
            {t("integrations.register")}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Editor */}
      <IntegrationForm
        isOpen={isEditing}
        initialIntegration={editingIntegration}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />

      {/* Listing Integrations */}
      <div className="space-y-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            isTesting={testingId === integration.id}
            test={testResult[integration.id]}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSyncTools={handleSyncTools}
            onTestConnection={handleTestConnection}
            onSelect={(integration) => handleSelectIntegration(integration.id)}
          />
        ))}

        {integrations.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 border border-dashed border-default-200 rounded-xl bg-default-100/20">
            <Plug className="h-10 w-10 text-default-400" />
            <p className="text-default-550 text-sm">
              {t("integrations.list.noIntegrations")}
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              <Plus className="h-4 w-4" />
              {t("integrations.register")}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Integration Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("integrations.list.delete")}
        description={t("integrations.confirm.delete")}
        onConfirm={confirmDeleteIntegration}
      />
    </div>
  );
}
