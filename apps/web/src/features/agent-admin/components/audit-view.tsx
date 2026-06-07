"use client";

import * as React from "react";
import { FileCode, AlertCircle, Activity, Cpu } from "lucide-react";
import {
  Card,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

interface ToolExecution {
  id: string;
  toolName: string;
  input: any;
  output: any;
  status: "success" | "error" | "denied" | "timeout";
  errorMessage?: string;
  durationMs?: number;
  executedAt: string;
}

interface LlmUsageLog {
  id: string;
  provider: string;
  model: string;
  tier?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: string;
  latencyMs?: number;
  createdAt: string;
  agent?: { name: string };
}

export function AuditView() {
  const [toolsLogs, setToolsLogs] = React.useState<ToolExecution[]>([]);
  const [llmLogs, setLlmLogs] = React.useState<LlmUsageLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [toolsData, llmData] = await Promise.all([
        adminService.getToolsAuditLogs(50),
        adminService.getLlmUsageLogs(50),
      ]);

      setToolsLogs(toolsData);
      setLlmLogs(llmData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Không thể tải dữ liệu kiểm toán",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && toolsLogs.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          Đang tải dữ liệu logs kiểm toán...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCode className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          Nhật ký Kiểm toán (Audit Logs)
        </h1>
        <p className="text-sm text-default-500">
          Giám sát các thao tác gọi công cụ nhạy cảm và thống kê chi phí sử dụng
          API mô hình ngôn ngữ lớn.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Logs */}
      <div className="space-y-8">
        {/* Section 1: Tool Executions */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              Lịch sử Gọi MCP Tools (Gần đây nhất)
            </h2>
            <p className="text-[10px] text-default-450">
              Chi tiết cuộc gọi công cụ, thời gian chạy và tham số đầu vào/ra.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table aria-label="Bảng log tool" className="w-full">
              <TableHeader>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  TÊN TOOL
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  THAM SỐ GỌI (INPUT)
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  KẾT QUẢ TRẢ VỀ (OUTPUT)
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  TRẠNG THÁI
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  ĐỘ TRỄ
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-right">
                  THỜI GIAN
                </TableColumn>
              </TableHeader>
              <TableBody>
                {toolsLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <TableCell className="font-mono text-xs text-foreground font-semibold">
                      {log.toolName}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      <span
                        className="font-mono text-[10px] text-default-500 block"
                        title={JSON.stringify(log.input)}
                      >
                        {JSON.stringify(log.input)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      <span
                        className="font-mono text-[10px] text-default-500 block"
                        title={JSON.stringify(log.output)}
                      >
                        {log.errorMessage ? (
                          <span className="text-red-500 dark:text-red-400 font-bold">
                            {log.errorMessage}
                          </span>
                        ) : (
                          JSON.stringify(log.output)
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : log.status === "denied"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-500 dark:text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-default-600 font-mono">
                      {log.durationMs ? `${log.durationMs}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-default-450 font-mono">
                      {new Date(log.executedAt).toLocaleString("vi-VN")}
                    </TableCell>
                  </TableRow>
                ))}
                {toolsLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="text-default-400 italic text-center py-6"
                      colSpan={6}
                    >
                      Chưa ghi nhận cuộc gọi tool nào trong hệ thống.
                    </TableCell>
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Section 2: LLM Cost & Token Usage Logs */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              Lịch sử Sử dụng Token & Chi phí LLM API
            </h2>
            <p className="text-[10px] text-default-450">
              Báo cáo lượng token sử dụng, chi phí tính theo USD, và độ trễ phản
              hồi LLM.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table aria-label="Bảng log LLM" className="w-full">
              <TableHeader>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  AGENT
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  PROVIDER
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  MODEL
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  TOKENS (I / O / T)
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  CHI PHÍ
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  ĐỘ TRỄ
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-right">
                  THỜI GIAN
                </TableColumn>
              </TableHeader>
              <TableBody>
                {llmLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <TableCell className="font-semibold text-foreground">
                      {log.agent?.name || "Router Agent"}
                    </TableCell>
                    <TableCell className="text-default-500 capitalize">
                      {log.provider}
                    </TableCell>
                    <TableCell className="text-xs text-default-700 font-mono">
                      {log.model}
                    </TableCell>
                    <TableCell className="text-center text-xs text-default-500 font-mono">
                      {log.promptTokens} / {log.completionTokens} /{" "}
                      <span className="text-foreground font-bold">
                        {log.totalTokens}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      $
                      {log.costUsd ? Number(log.costUsd).toFixed(5) : "0.00000"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-default-600 font-mono">
                      {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-default-450 font-mono">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </TableCell>
                  </TableRow>
                ))}
                {llmLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="text-default-400 italic text-center py-6"
                      colSpan={7}
                    >
                      Chưa ghi nhận log sử dụng LLM nào trong hệ thống.
                    </TableCell>
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                    <TableCell className="hidden" />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
