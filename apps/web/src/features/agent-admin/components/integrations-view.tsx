"use client";

import * as React from "react";
import {
  Plug,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Play,
  CheckCircle,
  XCircle,
  Lock,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  TextArea,
  Spinner,
  Accordion,
  TextField,
  Label,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

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
  authConfig?: any;
  status: "active" | "inactive" | "error";
  syncError?: string;
  toolDefinitions: ToolDefinition[];
}

export default function IntegrationsView() {
  const t = useTranslations();
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formTransport, setFormTransport] = React.useState<"sse" | "stdio">(
    "stdio",
  );
  const [formEndpoint, setFormEndpoint] = React.useState("");
  const [formHeaders, setFormHeaders] = React.useState("{}");
  const [formCommand, setFormCommand] = React.useState("");
  const [formArgs, setFormArgs] = React.useState("[]");
  const [formEnv, setFormEnv] = React.useState("{}");
  const [formStatus, setFormStatus] = React.useState<
    "active" | "inactive" | "error"
  >("active");

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

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormTransport("stdio");
    setFormEndpoint("");
    setFormHeaders("{}");
    setFormCommand("");
    setFormArgs("[]");
    setFormEnv("{}");
    setFormStatus("active");
    setEditingId(null);
    setIsEditing(false);
  };

  const handleEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setFormName(integration.name);
    setFormDesc(integration.description || "");
    setFormTransport(integration.transport);
    setFormEndpoint(integration.endpoint || "");
    setFormHeaders(JSON.stringify(integration.headers || {}, null, 2));
    setFormCommand(integration.command || "");
    setFormArgs(JSON.stringify(integration.args || [], null, 2));
    setFormEnv(JSON.stringify(integration.env || {}, null, 2));
    setFormStatus(integration.status);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let parsedHeaders = {};
    let parsedArgs = [];
    let parsedEnv = {};

    try {
      if (formTransport === "sse") {
        parsedHeaders = JSON.parse(formHeaders || "{}");
      } else {
        parsedArgs = JSON.parse(formArgs || "[]");
        parsedEnv = JSON.parse(formEnv || "{}");
      }
    } catch (err) {
      alert(
        t("integrations.alert.jsonInvalid"),
      );

      return;
    }

    const payload = {
      name: formName,
      description: formDesc,
      transport: formTransport,
      endpoint: formTransport === "sse" ? formEndpoint : null,
      headers: formTransport === "sse" ? parsedHeaders : null,
      command: formTransport === "stdio" ? formCommand : null,
      args: formTransport === "stdio" ? parsedArgs : null,
      env: formTransport === "stdio" ? parsedEnv : null,
      status: formStatus,
    };

    try {
      if (editingId) {
        await adminService.updateIntegration(editingId, payload);
      } else {
        await adminService.createIntegration(payload);
      }
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("integrations.alert.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        t("integrations.confirm.delete"),
      )
    )
      return;
    try {
      await adminService.deleteIntegration(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("integrations.alert.deleteFailed"));
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
      alert(t("integrations.alert.syncSuccess"));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("integrations.alert.syncFailed"));
    }
  };

  const handleToggleToolApproval = async (
    toolId: string,
    currentVal: boolean,
  ) => {
    try {
      await adminService.toggleToolApproval(toolId, !currentVal);
      loadData();
    } catch (err: any) {
      alert(t("integrations.alert.permissionFailed"));
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

      {/* Form Editor */}
      {isEditing && (
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between border-b border-default-150 pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingId
                  ? t("integrations.editor.titleEdit", { name: formName })
                  : t("integrations.editor.titleCreate")}
              </h2>
              <Button
                isIconOnly
                className="cursor-pointer"
                size="sm"
                variant="danger"
                onClick={resetForm}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Side */}
              <div className="space-y-4">
                <TextField isRequired className="w-full" name="name">
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.name")}
                  </Label>
                  <Input
                    className="text-foreground"
                    placeholder={t("integrations.editor.namePlaceholder")}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </TextField>

                <TextField className="w-full" name="description">
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.desc")}
                  </Label>
                  <TextArea
                    className="text-foreground"
                    placeholder={t("integrations.editor.descPlaceholder")}
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </TextField>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("integrations.editor.transport")}
                    </span>
                    <select
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                      value={formTransport}
                      onChange={(e) => setFormTransport(e.target.value as any)}
                    >
                      <option value="stdio">{t("integrations.editor.transportStdio")}</option>
                      <option value="sse">{t("integrations.editor.transportSse")}</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("integrations.editor.status")}
                    </span>
                    <select
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                    >
                      <option value="active">{t("integrations.editor.statusActive")}</option>
                      <option value="inactive">{t("integrations.editor.statusInactive")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Side - Transport Configs */}
              <div className="space-y-4">
                {formTransport === "sse" ? (
                  <div className="space-y-4">
                    <TextField isRequired className="w-full" name="endpoint">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">
                        {t("integrations.editor.sseUrl")}
                      </Label>
                      <Input
                        className="text-foreground"
                        placeholder={t("integrations.editor.sseUrlPlaceholder")}
                        value={formEndpoint}
                        onChange={(e) => setFormEndpoint(e.target.value)}
                      />
                    </TextField>
                    <TextField className="w-full" name="headers">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">
                        {t("integrations.editor.headers")}
                      </Label>
                      <TextArea
                        className="text-foreground font-mono text-xs"
                        placeholder={t("integrations.editor.headersPlaceholder")}
                        rows={4}
                        value={formHeaders}
                        onChange={(e) => setFormHeaders(e.target.value)}
                      />
                    </TextField>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <TextField isRequired className="w-full" name="command">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">
                        {t("integrations.editor.command")}
                      </Label>
                      <Input
                        className="text-foreground"
                        placeholder={t("integrations.editor.commandPlaceholder")}
                        value={formCommand}
                        onChange={(e) => setFormCommand(e.target.value)}
                      />
                    </TextField>
                    <TextField className="w-full" name="args">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">
                        {t("integrations.editor.args")}
                      </Label>
                      <TextArea
                        className="text-foreground font-mono text-xs"
                        placeholder={t("integrations.editor.argsPlaceholder")}
                        rows={3}
                        value={formArgs}
                        onChange={(e) => setFormArgs(e.target.value)}
                      />
                    </TextField>
                    <TextField className="w-full" name="env">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">
                        {t("integrations.editor.env")}
                      </Label>
                      <TextArea
                        className="text-foreground font-mono text-xs"
                        placeholder={t("integrations.editor.envPlaceholder")}
                        rows={3}
                        value={formEnv}
                        onChange={(e) => setFormEnv(e.target.value)}
                      />
                    </TextField>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-default-150">
              <Button
                className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
                type="button"
                variant="ghost"
                onClick={resetForm}
              >
                {t("integrations.editor.cancel")}
              </Button>
              <Button
                className="cursor-pointer font-bold"
                type="submit"
                variant="primary"
              >
                {t("integrations.editor.save")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Listing Integrations */}
      <div className="space-y-6">
        {integrations.map((integration) => {
          const test = testResult[integration.id];
          const isTesting = testingId === integration.id;

          return (
            <Card
              key={integration.id}
              className="bg-content1 border border-default-150 p-6 rounded-xl space-y-6 shadow-sm"
            >
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
                              ? "bg-red-500/10 text-red-500 dark:text-red-400"
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
                    onClick={() => handleTestConnection(integration.id)}
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
                    onClick={() => handleSyncTools(integration.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("integrations.list.syncTools")}
                  </Button>
                  <Button
                    className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(integration)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {t("integrations.list.edit")}
                  </Button>
                  <Button
                    className="cursor-pointer"
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(integration.id)}
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
                            tools: test.tools?.map((t: any) => t.name).join(", ") || t("integrations.list.noTools")
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
                  {t("integrations.list.toolsHeader", { count: integration.toolDefinitions?.length || 0 })}
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
                                  handleToggleToolApproval(
                                    tool.id,
                                    tool.requiresApproval,
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleToolApproval(
                                      tool.id,
                                      tool.requiresApproval,
                                    );
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
        })}

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
    </div>
  );
}
