"use client";

import * as React from "react";
import { adminService } from "@/src/features/agent-admin/services/admin.service";
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
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formTransport, setFormTransport] = React.useState<"sse" | "stdio">("stdio");
  const [formEndpoint, setFormEndpoint] = React.useState("");
  const [formHeaders, setFormHeaders] = React.useState("{}");
  const [formCommand, setFormCommand] = React.useState("");
  const [formArgs, setFormArgs] = React.useState("[]");
  const [formEnv, setFormEnv] = React.useState("{}");
  const [formStatus, setFormStatus] = React.useState<"active" | "inactive" | "error">("active");

  // Connection Test State
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResult, setTestResult] = React.useState<Record<string, { success: boolean; error?: string; tools?: any[] }>>({});

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getIntegrations();
      setIntegrations(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải danh sách tích hợp");
    } finally {
      setLoading(false);
    }
  }, []);

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
      alert("Định dạng JSON cấu hình phụ trợ (Headers, Args, Env) không hợp lệ.");
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
      alert(err.response?.data?.message || "Lưu kết nối MCP thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa MCP Integration này? Toàn bộ tool definitions sẽ bị xóa.")) return;
    try {
      await adminService.deleteIntegration(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Xóa tích hợp thất bại");
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
        [id]: { success: false, error: err.response?.data?.message || "Kiểm tra kết nối lỗi" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncTools = async (id: string) => {
    try {
      await adminService.syncIntegration(id);
      alert("Đồng bộ danh sách tools thành công!");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Đồng bộ thất bại");
    }
  };

  const handleToggleToolApproval = async (toolId: string, currentVal: boolean) => {
    try {
      await adminService.toggleToolApproval(toolId, !currentVal);
      loadData();
    } catch (err: any) {
      alert("Không thể thay đổi phân quyền tool");
    }
  };

  if (loading && integrations.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">Đang tải danh sách MCP integrations...</span>
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
            Tích hợp MCP Servers
          </h1>
          <p className="text-sm text-default-500">Kết nối các Model Context Protocol servers để cung cấp công cụ tự động cho Agents.</p>
        </div>
        {!isEditing && (
          <Button
            variant="primary"
            onClick={() => setIsEditing(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Đăng ký Server
          </Button>
        )}
      </div>

      {/* Form Editor */}
      {isEditing && (
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-default-150 pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? `Cập nhật cấu hình: ${formName}` : "Đăng ký MCP Server mới"}
              </h2>
              <Button size="sm" variant="danger" isIconOnly onClick={resetForm} className="cursor-pointer">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Side */}
              <div className="space-y-4">
                <TextField isRequired name="name" className="w-full">
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">Tên tích hợp (Friendly Name)</Label>
                  <Input
                    placeholder="e.g. Git MCP Server"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="text-foreground"
                  />
                </TextField>

                <TextField name="description" className="w-full">
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">Mô tả tích hợp</Label>
                  <TextArea
                    placeholder="Giải thích tính năng của server này mang lại..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={2}
                    className="text-foreground"
                  />
                </TextField>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-default-500 block mb-1">Phương thức kết nối (Transport)</label>
                    <select
                      value={formTransport}
                      onChange={(e) => setFormTransport(e.target.value as any)}
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                    >
                      <option value="stdio">stdio (Local Command)</option>
                      <option value="sse">sse (HTTP Server-Sent Events)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-default-500 block mb-1">Trạng thái (Status)</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Side - Transport Configs */}
              <div className="space-y-4">
                {formTransport === "sse" ? (
                  <div className="space-y-4">
                    <TextField isRequired name="endpoint" className="w-full">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">SSE Endpoint URL</Label>
                      <Input
                        placeholder="e.g. http://localhost:3001/sse"
                        value={formEndpoint}
                        onChange={(e) => setFormEndpoint(e.target.value)}
                        className="text-foreground"
                      />
                    </TextField>
                    <TextField name="headers" className="w-full">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">Custom Headers (JSON)</Label>
                      <TextArea
                        placeholder='e.g. {"Authorization": "Bearer token"}'
                        value={formHeaders}
                        onChange={(e) => setFormHeaders(e.target.value)}
                        rows={4}
                        className="text-foreground font-mono text-xs"
                      />
                    </TextField>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <TextField isRequired name="command" className="w-full">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">Lệnh chạy Command</Label>
                      <Input
                        placeholder="e.g. npx or node"
                        value={formCommand}
                        onChange={(e) => setFormCommand(e.target.value)}
                        className="text-foreground"
                      />
                    </TextField>
                    <TextField name="args" className="w-full">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">Đối số lệnh Args (JSON Array)</Label>
                      <TextArea
                        placeholder='e.g. ["-y", "@modelcontextprotocol/server-git"]'
                        value={formArgs}
                        onChange={(e) => setFormArgs(e.target.value)}
                        rows={3}
                        className="text-foreground font-mono text-xs"
                      />
                    </TextField>
                    <TextField name="env" className="w-full">
                      <Label className="text-default-500 text-xs font-semibold mb-1 block">Biến môi trường Env (JSON Object)</Label>
                      <TextArea
                        placeholder='e.g. {"GITHUB_PERSONAL_ACCESS_TOKEN": "..."}'
                        value={formEnv}
                        onChange={(e) => setFormEnv(e.target.value)}
                        rows={3}
                        className="text-foreground font-mono text-xs"
                      />
                    </TextField>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-default-150">
              <Button type="button" variant="ghost" onClick={resetForm} className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100">
                Hủy bỏ
              </Button>
              <Button type="submit" variant="primary" className="cursor-pointer font-bold">
                Lưu kết nối
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
            <Card key={integration.id} className="bg-content1 border border-default-150 p-6 rounded-xl space-y-6 shadow-sm">
              {/* Integration Row */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-default-150 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${
                    integration.status === "active"
                      ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-default-200 border border-default-300 text-default-500"
                  }`}>
                    <Plug className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">{integration.name}</h3>
                    <p className="text-xs text-default-500 mt-1">{integration.description || "Không có mô tả"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-default-100 text-default-655 border border-default-200 font-mono">
                        {integration.transport}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        integration.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : integration.status === "error"
                          ? "bg-red-500/10 text-red-500 dark:text-red-400"
                          : "bg-default-100 text-default-500"
                      }`}>
                        {integration.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connection Status Log if any */}
                {integration.syncError && (
                  <div className="max-w-md bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 text-xs text-red-500 dark:text-red-400 leading-relaxed font-mono">
                    <span className="font-semibold block mb-0.5 text-red-305">Lỗi đồng bộ:</span>
                    {integration.syncError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTestConnection(integration.id)}
                    isDisabled={isTesting}
                    className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
                  >
                    {isTesting ? <Spinner size="sm" color="success" /> : <Play className="h-3.5 w-3.5" />}
                    Test Connection
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSyncTools(integration.id)}
                    className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync Tools
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(integration)} className="cursor-pointer border border-default-200 text-default-600 hover:bg-default-50">
                    <Edit2 className="h-3.5 w-3.5" />
                    Sửa
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(integration.id)} className="cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </Button>
                </div>
              </div>

              {/* Test results if triggered */}
              {test && (
                <div className={`p-4 rounded-lg border flex gap-3 items-start ${
                  test.success ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"
                }`}>
                  {test.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-foreground">Kết nối thành công!</span>
                        <p className="text-default-500 mt-1 leading-relaxed">
                          Phát hiện {test.tools?.length || 0} tools từ server: {test.tools?.map((t) => t.name).join(", ") || "không có tools"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-foreground">Kết nối thất bại</span>
                        <p className="text-red-500 dark:text-red-400 mt-1 leading-relaxed font-mono">{test.error}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Discovered Tools Accordion */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-default-450">
                  Tools Definitions ({integration.toolDefinitions?.length || 0})
                </h4>

                <Accordion variant="surface" className="px-0">
                  {integration.toolDefinitions?.map((tool) => (
                    <Accordion.Item
                      key={tool.id}
                      className="bg-default-50/50 border border-default-200 rounded-lg hover:border-default-300 transition-colors"
                    >
                      <Accordion.Heading>
                        <Accordion.Trigger className="flex items-center justify-between w-full">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-mono text-sm font-semibold text-foreground">{tool.toolName}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-default-500 truncate max-w-[200px] md:max-w-xs block font-sans">
                                {tool.description || "Không có mô tả"}
                              </span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation(); // Ngăn sự kiện click expand Accordion
                                  handleToggleToolApproval(tool.id, tool.requiresApproval);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                  tool.requiresApproval
                                    ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                                    : "bg-default-100 border border-default-200 text-default-500 hover:bg-default-200 hover:text-foreground"
                                }`}
                              >
                                <Lock className="h-3 w-3" />
                                {tool.requiresApproval ? "Cần phê duyệt" : "Tự động chạy"}
                              </div>
                            </div>
                          </div>
                          <Accordion.Indicator />
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      <Accordion.Panel>
                        <Accordion.Body className="text-xs space-y-3 p-1 font-sans text-default-650 leading-relaxed">
                          <div>
                            <span className="font-bold text-default-700">Mô tả:</span>
                            <p className="mt-0.5">{tool.description || "Chưa thiết lập mô tả"}</p>
                          </div>
                          <div>
                            <span className="font-bold text-default-700">Input Schema (JSON Schema):</span>
                            <pre className="mt-1 bg-default-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono border border-default-150">
                              {JSON.stringify(tool.inputSchema, null, 2)}
                            </pre>
                          </div>
                        </Accordion.Body>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
                {(!integration.toolDefinitions || integration.toolDefinitions.length === 0) && (
                  <p className="text-xs text-default-455 italic text-center py-4 border border-dashed border-default-200 rounded-lg">
                    Chưa có tools nào được đồng bộ. Hãy bấm nút Sync Tools để đồng bộ tools.
                  </p>
                )}
              </div>
            </Card>
          );
        })}

        {integrations.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 border border-dashed border-default-200 rounded-xl bg-default-100/20">
            <Plug className="h-10 w-10 text-default-400" />
            <p className="text-default-550 text-sm">Chưa có kết nối MCP Server nào được cấu hình.</p>
            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4" />
              Đăng ký Server
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
