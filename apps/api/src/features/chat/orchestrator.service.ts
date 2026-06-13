import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { Subject } from 'rxjs';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { LlmService } from '../llm/llm.service';
import { McpClientPool } from '../integrations/mcp/mcp-client.pool';
import * as fs from 'fs';

export interface ChatStreamEvent {
  event: 'agent_routing' | 'token' | 'tool_start' | 'tool_end' | 'tool_approval_required' | 'complete' | 'error';
  data: any;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly llmService: LlmService,
    private readonly mcpPool: McpClientPool,
  ) {}

  async processMessage(
    conversationId: string,
    userId: string,
    userMessageContent: string,
    eventSubject: Subject<ChatStreamEvent>,
    attachments: any[] = [],
  ) {
    try {
      // 1. Lấy thông tin user và role để kiểm tra quyền
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        with: { role: true },
      });

      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      // 2. Lưu tin nhắn của user vào database
      const [userMsg] = await this.db
        .insert(schema.messages)
        .values({
          conversationId,
          role: 'user',
          content: userMessageContent,
          attachments: attachments,
        })
        .returning();

      // Cập nhật thời gian update của conversation
      await this.db
        .update(schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));

      // 3. Lấy lịch sử tin nhắn của cuộc hội thoại
      const history = await this.db.query.messages.findMany({
        where: eq(schema.messages.conversationId, conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      // Tự động sinh tiêu đề nếu đây là tin nhắn đầu tiên
      if (history.length === 1) {
        this.generateAndSetTitle(conversationId, userMessageContent).catch((err) =>
          this.logger.error(`Lỗi sinh title tự động: ${err.message}`),
        );
      }

      // 4. Tìm Specialist Agent tương ứng thông qua Router Agent
      let targetAgent = await this.routeAgent(userMessageContent);
      if (!targetAgent) {
        // Fallback: Tìm agent đầu tiên hoạt động
        targetAgent = (await this.db.query.agents.findFirst({
          where: and(eq(schema.agents.isActive, true), eq(schema.agents.isRouter, false)),
        })) || null;
      }

      if (!targetAgent) {
        throw new Error('Hệ thống chưa cấu hình Specialist Agent nào hoạt động.');
      }

      eventSubject.next({
        event: 'agent_routing',
        data: { agentId: targetAgent.id, agentName: targetAgent.name },
      });

      // 5. Chạy ReAct Loop cho Specialist Agent
      await this.runReActLoop({
        conversationId,
        user,
        agent: targetAgent,
        messagesHistory: history,
        eventSubject,
      });

    } catch (error) {
      this.logger.error(`Lỗi trong luồng điều phối Orchestrator: ${error.message}`);
      eventSubject.next({ event: 'error', data: error.message });
      eventSubject.complete();
    }
  }

  // Luồng tiếp tục chạy sau khi Tool Approval được phê duyệt
  async resumeAfterApproval(
    approvalId: string,
    approved: boolean,
    eventSubject: Subject<ChatStreamEvent>,
  ) {
    try {
      const approval = await this.db.query.approvalRequests.findFirst({
        where: eq(schema.approvalRequests.id, approvalId),
      });

      if (!approval || approval.status !== 'pending') {
        throw new Error('Yêu cầu phê duyệt không hợp lệ hoặc đã được xử lý.');
      }

      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, approval.userId),
        with: { role: true },
      });

      if (!user) {
        throw new Error('Không tìm thấy người dùng gửi yêu cầu');
      }

      // Cập nhật trạng thái approval request
      await this.db
        .update(schema.approvalRequests)
        .set({
          status: approved ? 'approved' : 'rejected',
          decidedAt: new Date(),
        })
        .where(eq(schema.approvalRequests.id, approvalId));

      // Cập nhật thời gian update của conversation
      await this.db
        .update(schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversations.id, approval.conversationId));

      let observation: any;

      // Tạo tin nhắn assistant đã gọi tool trước đó
      const [assistantMsg] = await this.db
        .insert(schema.messages)
        .values({
          conversationId: approval.conversationId,
          role: 'assistant',
          content: `Yêu cầu thực thi tool: ${approval.toolName}`,
          metadata: {
            toolCalls: [
              {
                id: approvalId,
                type: 'function',
                function: { name: approval.toolName, arguments: JSON.stringify(approval.args) },
              },
            ],
          },
        })
        .returning();

      if (approved) {
        eventSubject.next({
          event: 'tool_start',
          data: { toolName: approval.toolName, args: approval.args },
        });

        // Tìm tool definition để biết integration
        const toolDef = await this.db.query.toolDefinitions.findFirst({
          where: eq(schema.toolDefinitions.toolName, approval.toolName),
        });

        if (!toolDef) {
          throw new Error(`Không tìm thấy định nghĩa của Tool: ${approval.toolName}`);
        }

        const start = Date.now();
        try {
          const result = await this.mcpPool.executeTool(toolDef.integrationId, approval.toolName, approval.args as Record<string, any>);
          observation = result;

          // Lưu log thành công
          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolDefinitionId: toolDef.id,
            toolName: approval.toolName,
            input: approval.args,
            output: result,
            status: 'success',
            durationMs: Date.now() - start,
          });

          eventSubject.next({
            event: 'tool_end',
            data: { toolName: approval.toolName, output: result, status: 'success' },
          });
        } catch (err) {
          observation = { error: err.message };

          // Lưu log thất bại
          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolDefinitionId: toolDef.id,
            toolName: approval.toolName,
            input: approval.args,
            output: { error: err.message },
            status: 'error',
            errorMessage: err.message,
            durationMs: Date.now() - start,
          });

          eventSubject.next({
            event: 'tool_end',
            data: { toolName: approval.toolName, output: { error: err.message }, status: 'error' },
          });
        }
      } else {
        observation = { error: 'Thực thi tool đã bị từ chối bởi người dùng.' };
        
        eventSubject.next({
          event: 'tool_end',
          data: { toolName: approval.toolName, output: observation, status: 'denied' },
        });
      }

      // Lưu tin nhắn observation của tool
      await this.db.insert(schema.messages).values({
        conversationId: approval.conversationId,
        role: 'tool',
        content: typeof observation === 'string' ? observation : JSON.stringify(observation),
        metadata: { toolCallId: approvalId },
      });

      // Lấy lại lịch sử bao gồm tin nhắn mới
      const history = await this.db.query.messages.findMany({
        where: eq(schema.messages.conversationId, approval.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      // Tìm agent phù hợp với tin nhắn (tìm agent cuối cùng được gán hoặc Specialist Agent)
      const lastMsgWithAgent = history.slice().reverse().find(m => m.routedAgentId !== null);
      let agent = await this.db.query.agents.findFirst({
        where: eq(schema.agents.id, lastMsgWithAgent?.routedAgentId || ''),
      });

      if (!agent) {
        agent = await this.db.query.agents.findFirst({
          where: and(eq(schema.agents.isActive, true), eq(schema.agents.isRouter, false)),
        });
      }

      if (!agent) {
        throw new Error('Không tìm thấy agent hoạt động để tiếp tục');
      }

      // Chạy tiếp ReAct Loop
      await this.runReActLoop({
        conversationId: approval.conversationId,
        user,
        agent,
        messagesHistory: history,
        eventSubject,
      });

    } catch (error) {
      this.logger.error(`Lỗi khi tiếp tục luồng sau phê duyệt: ${error.message}`);
      eventSubject.next({ event: 'error', data: error.message });
      eventSubject.complete();
    }
  }

  // Phân loại routing sang Specialist Agent phù hợp
  private async routeAgent(userMessage: string): Promise<typeof schema.agents.$inferSelect | null> {
    const routerAgent = await this.db.query.agents.findFirst({
      where: and(eq(schema.agents.isRouter, true), eq(schema.agents.isActive, true)),
    });

    const activeSpecialists = await this.db.query.agents.findMany({
      where: and(eq(schema.agents.isRouter, false), eq(schema.agents.isActive, true)),
      with: { skills: true },
    });

    if (activeSpecialists.length === 0) {
      return null;
    }

    if (!routerAgent) {
      // Nếu không có Router Agent, định tuyến dựa trên keyword định danh cơ bản trong tin nhắn
      for (const agent of activeSpecialists) {
        for (const skill of agent.skills) {
          if (userMessage.toLowerCase().includes(skill.name.toLowerCase())) {
            return agent;
          }
        }
      }
      return activeSpecialists[0]; // Trả về agent đầu tiên
    }

    // Dựng prompt định tuyến cho Router Agent
    const specialistsDescription = activeSpecialists
      .map((a) => `- ID: "${a.id}", Tên: "${a.name}", Kỹ năng: ${a.skills.map((s) => s.name).join(', ')}`)
      .join('\n');

    const prompt = `Tin nhắn của User: "${userMessage}"
Danh sách các Specialist Agents khả dụng:
${specialistsDescription}

Hãy phân tích tin nhắn và quyết định gửi yêu cầu này tới Specialist Agent phù hợp nhất. Trả về kết quả CHỈ dạng JSON thô (không có markdown \`\`\`), ví dụ:
{ "targetAgentId": "uuid-ở-đây" }`;

    try {
      const llmResult = await this.llmService.generate({
        provider: routerAgent.llmProvider || 'openai',
        model: routerAgent.llmModel || 'gpt-4o-mini',
        system: routerAgent.systemInstructions,
        prompt,
      });

      const cleanJsonStr = llmResult.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      const matchedAgent = activeSpecialists.find((a) => a.id === parsed.targetAgentId);
      return matchedAgent || activeSpecialists[0];
    } catch (err) {
      this.logger.warn(`Lỗi định tuyến tự động LLM: ${err.message}. Sử dụng keyword định tuyến fallback.`);
      return activeSpecialists[0];
    }
  }

  // ReAct Execution Loop
  private async runReActLoop({
    conversationId,
    user,
    agent,
    messagesHistory,
    eventSubject,
  }: {
    conversationId: string;
    user: any;
    agent: typeof schema.agents.$inferSelect;
    messagesHistory: Array<typeof schema.messages.$inferSelect>;
    eventSubject: Subject<ChatStreamEvent>;
  }) {
    let currentHistory = [...messagesHistory];
    let stepCount = 0;
    const maxSteps = agent.maxSteps || 10;

    // Lấy danh sách tools mà agent này được phép dùng
    const bindings = await this.db.query.agentToolBindings.findMany({
      where: eq(schema.agentToolBindings.agentId, agent.id),
      with: { toolDefinition: true },
    });

    const allowedTools = bindings
      .map((b) => b.toolDefinition)
      .filter((t) => t.isActive);

    // Lấy danh sách tool permissions của role để kiểm tra quyền
    const rolePermissions = await this.db.query.toolPermissions.findMany({
      where: eq(schema.toolPermissions.roleId, user.roleId),
    });

    while (stepCount < maxSteps) {
      stepCount++;
      this.logger.log(`Chạy ReAct bước thứ ${stepCount}/${maxSteps} cho agent: ${agent.name}`);

      // Định dạng lịch sử tin nhắn cho Vercel AI SDK
      const promptInput = this.formatHistoryForLlm(currentHistory);

      const formattedTools = allowedTools.map((t) => ({
        name: t.toolName,
        description: t.description || '',
        inputSchema: t.inputSchema,
      }));

      // Gọi streamText từ LlmService
      const resultStream = await this.llmService.stream({
        provider: agent.llmProvider || 'openai',
        model: agent.llmModel || 'gpt-4o',
        system: agent.systemInstructions,
        messages: promptInput,
        tools: formattedTools,
      });

      let assistantResponseText = '';
      const toolCallsToExecute: any[] = [];

      // Lắng nghe stream và đẩy tokens về client
      for await (const chunk of resultStream.fullStream) {
        this.logger.log(`[ReAct Loop] Received chunk: ${JSON.stringify(chunk)}`);
        if (chunk.type === 'text-delta') {
          const text = chunk.textDelta ?? chunk.delta ?? chunk.text ?? '';
          assistantResponseText += text;
          eventSubject.next({ event: 'token', data: text });
        } else if (chunk.type === 'tool-call') {
          toolCallsToExecute.push(chunk);
        }
      }

      // 1. Nếu LLM không yêu cầu gọi tool, lưu tin nhắn hoàn thiện và kết thúc
      if (toolCallsToExecute.length === 0) {
        const [finalMsg] = await this.db
          .insert(schema.messages)
          .values({
            conversationId,
            role: 'assistant',
            content: assistantResponseText,
            routedAgentId: agent.id,
          })
          .returning();

        // Ghi nhận LLM Usage Log (giả lập / hoặc ước lượng)
        const usage = (await resultStream.usage) as any;
        await this.db.insert(schema.llmUsageLogs).values({
          messageId: finalMsg.id,
          agentId: agent.id,
          provider: agent.llmProvider || 'openai',
          model: agent.llmModel || 'gpt-4o',
          tier: agent.tier || 'smart',
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
          totalTokens: usage?.totalTokens ?? 0,
          costUsd: this.llmService.calculateCost(
            agent.llmProvider || 'openai',
            agent.llmModel || 'gpt-4o',
            usage?.promptTokens ?? 0,
            usage?.completionTokens ?? 0,
          ),
        });

        eventSubject.next({ event: 'complete', data: { messageId: finalMsg.id } });
        eventSubject.complete();
        return;
      }

      // 2. Nếu LLM yêu cầu gọi tool(s)
      // Lưu tin nhắn chứa cuộc gọi tool
      const [assistantMsg] = await this.db
        .insert(schema.messages)
        .values({
          conversationId,
          role: 'assistant',
          content: assistantResponseText || 'Đang gọi công cụ hỗ trợ...',
          routedAgentId: agent.id,
          metadata: { toolCalls: toolCallsToExecute },
        })
        .returning();

      // Lưu log usage của LLM cho cuộc gọi tool này
      const usageTool = (await resultStream.usage) as any;
      await this.db.insert(schema.llmUsageLogs).values({
        messageId: assistantMsg.id,
        agentId: agent.id,
        provider: agent.llmProvider || 'openai',
        model: agent.llmModel || 'gpt-4o',
        tier: agent.tier || 'smart',
        promptTokens: usageTool?.promptTokens ?? 0,
        completionTokens: usageTool?.completionTokens ?? 0,
        totalTokens: usageTool?.totalTokens ?? 0,
        costUsd: this.llmService.calculateCost(
          agent.llmProvider || 'openai',
          agent.llmModel || 'gpt-4o',
          usageTool?.promptTokens ?? 0,
          usageTool?.completionTokens ?? 0,
        ),
      });

      // Duyệt qua từng tool call để thực thi đồng thời (Parallel execution)
      const toolPromises = toolCallsToExecute.map(async (call) => {
        const toolName = call.toolName;
        const toolArgs = call.args;

        // 2a. Kiểm tra quyền của vai trò (Role Permissions)
        const allowed = this.isToolAllowed(toolName, rolePermissions);
        if (!allowed) {
          const obsError = { error: `Bị từ chối: Vai trò của bạn không được phép chạy công cụ ${toolName}` };
          
          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolName,
            input: toolArgs,
            output: obsError,
            status: 'denied',
            errorMessage: 'Role permission denied',
          });

          return { call, result: obsError, status: 'denied', toolDef: null };
        }

        // Tìm định nghĩa tool trong db
        const toolDef = allowedTools.find((t) => t.toolName === toolName);
        if (!toolDef) {
          const obsError = { error: `Không tìm thấy tool ${toolName} trong các tool được gán cho Agent` };
          return { call, result: obsError, status: 'error', toolDef: null };
        }

        // 2b. Kiểm tra xem tool có cần User phê duyệt hay không (Human-In-The-Loop)
        if (toolDef.requiresApproval) {
           return { call, requiresApproval: true, toolDef, toolArgs, toolName };
        }

        // 2c. Thực thi tool thông qua McpClientPool
        eventSubject.next({
          event: 'tool_start',
          data: { toolName, args: toolArgs, toolCallId: call.toolCallId },
        });

        const start = Date.now();
        let observation: any;
        let execStatus: 'success' | 'error' = 'success';
        try {
          const result = await this.mcpPool.executeTool(toolDef.integrationId, toolName, toolArgs);
          
          // Truncate observation if it's too large to save token budget
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          observation = resultStr.length > 3000 ? resultStr.substring(0, 3000) + '... [Truncated]' : result;

          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolDefinitionId: toolDef.id,
            toolName,
            input: toolArgs,
            output: observation,
            status: 'success',
            durationMs: Date.now() - start,
          });

          eventSubject.next({
            event: 'tool_end',
            data: { toolName, output: observation, status: 'success', toolCallId: call.toolCallId },
          });
        } catch (err) {
          observation = { error: err.message };
          execStatus = 'error';

          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolDefinitionId: toolDef.id,
            toolName,
            input: toolArgs,
            output: { error: err.message },
            status: 'error',
            errorMessage: err.message,
            durationMs: Date.now() - start,
          });

          eventSubject.next({
            event: 'tool_end',
            data: { toolName, output: { error: err.message }, status: 'error', toolCallId: call.toolCallId },
          });
        }
        
        return { call, result: observation, status: execStatus, toolDef };
      });

      const executedTools = await Promise.all(toolPromises);

      // Check if any tool required approval
      const approvalRequiredTool = executedTools.find(t => t.requiresApproval);
      if (approvalRequiredTool) {
          const { toolName, toolArgs, toolDef } = approvalRequiredTool;
          const [req] = await this.db
            .insert(schema.approvalRequests)
            .values({
              conversationId,
              userId: user.id,
              toolName,
              args: toolArgs,
              description: `Agent yêu cầu quyền chạy tool ${toolName} với tham số: ${JSON.stringify(toolArgs)}`,
              status: 'pending',
            })
            .returning();

          eventSubject.next({
            event: 'tool_approval_required',
            data: {
              approvalRequestId: req.id,
              toolName,
              args: toolArgs,
              description: req.description,
            },
          });

          // Dừng ReAct loop
          eventSubject.complete();
          return;
      }

      currentHistory.push(assistantMsg);
      for (const t of executedTools) {
        if (!t.requiresApproval) {
            const [toolMsg] = await this.db
              .insert(schema.messages)
              .values({
                conversationId,
                role: 'tool',
                content: typeof t.result === 'string' ? t.result : JSON.stringify(t.result),
                metadata: { toolCallId: t.call.toolCallId },
              })
              .returning();
            currentHistory.push(toolMsg);
        }
      }
    }

    // Quá số bước tối đa mà không trả về kết quả cuối
    eventSubject.next({ event: 'error', data: 'Vượt quá số bước ReAct tối đa của Agent.' });
    eventSubject.complete();
  }

  private formatHistoryForLlm(history: Array<typeof schema.messages.$inferSelect>): any[] {
    const formattedMessages: any[] = [];

    for (const msg of history) {
      const meta = msg.metadata as any;
      if (msg.role === 'tool') {
        let parsedOutput: any;
        try {
          parsedOutput = JSON.parse(msg.content);
        } catch {
          parsedOutput = msg.content;
        }

        let formattedOutput: any;
        if (
          parsedOutput &&
          typeof parsedOutput === 'object' &&
          'type' in parsedOutput &&
          ['text', 'json', 'execution-denied', 'error-text', 'error-json', 'content'].includes(parsedOutput.type)
        ) {
          formattedOutput = parsedOutput;
        } else if (parsedOutput && typeof parsedOutput === 'object' && 'error' in parsedOutput) {
          const errMessage = String(parsedOutput.error);
          if (errMessage.includes('Bị từ chối') || errMessage.toLowerCase().includes('denied')) {
            formattedOutput = {
              type: 'execution-denied',
              reason: errMessage,
            };
          } else {
            formattedOutput = {
              type: 'error-json',
              json: parsedOutput,
            };
          }
        } else if (typeof parsedOutput === 'string') {
          formattedOutput = {
            type: 'text',
            text: parsedOutput,
          };
        } else {
          formattedOutput = {
            type: 'json',
            json: parsedOutput,
          };
        }

        formattedMessages.push({
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: meta?.toolCallId || 'unknown',
              toolName: meta?.toolName || 'unknown',
              output: formattedOutput,
            },
          ],
        });
        continue;
      }

      if (msg.role === 'assistant') {
        const contentParts: any[] = [];
        if (msg.content) {
          contentParts.push({ type: 'text', text: msg.content });
        }
        if (meta?.toolCalls) {
          meta.toolCalls.forEach((call: any) => {
            contentParts.push(call);
          });
        }
        formattedMessages.push({ role: 'assistant', content: contentParts.length > 0 ? contentParts : msg.content });
        continue;
      }

      // User and system messages
      if (msg.role === 'user' || msg.role === 'system') {
        const contentParts: any[] = [];
        if (msg.content) {
          contentParts.push({ type: 'text', text: msg.content });
        }

        if (msg.attachments && Array.isArray(msg.attachments)) {
          for (const att of msg.attachments) {
            try {
              if (att.type?.startsWith('image/')) {
                // Đọc ảnh base64 nếu lưu ở dạng local
                if (att.url.startsWith('/uploads/')) {
                  const filePath = att.path || att.url.replace('/uploads/', 'uploads/');
                  if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath);
                    const base64Data = fileData.toString('base64');
                    contentParts.push({ type: 'image', image: `data:${att.type};base64,${base64Data}` });
                  }
                } else {
                  contentParts.push({ type: 'image', image: new URL(att.url) });
                }
              } else if (att.type?.startsWith('text/') || att.type === 'application/json' || att.name?.endsWith('.md') || att.name?.endsWith('.csv')) {
                // Đọc text
                let textContent = '';
                if (att.url.startsWith('/uploads/')) {
                  const filePath = att.path || att.url.replace('/uploads/', 'uploads/');
                  if (fs.existsSync(filePath)) {
                    textContent = fs.readFileSync(filePath, 'utf-8');
                  }
                }
                if (textContent) {
                  contentParts.push({
                    type: 'text',
                    text: `\n--- File: ${att.name} ---\n${textContent}\n--- End File ---\n`,
                  });
                }
              }
            } catch (err) {
              this.logger.warn(`Lỗi khi đọc file đính kèm ${att.name}: ${err.message}`);
            }
          }
        }

        formattedMessages.push({
          role: msg.role,
          content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts,
        });
      }
    }

    return formattedMessages;
  }

  private isToolAllowed(toolName: string, permissions: Array<{ toolPattern: string; allowed: boolean }>): boolean {
    if (permissions.length === 0) {
      return true; // Cho phép mặc định nếu chưa phân quyền
    }
    let allowed = false;
    for (const perm of permissions) {
      const regexStr = '^' + perm.toolPattern.replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexStr);
      if (regex.test(toolName)) {
        allowed = perm.allowed;
      }
    }
    return allowed;
  }

  private async generateAndSetTitle(conversationId: string, content: string) {
    try {
      const provider = process.env.LLM_FAST_PROVIDER || 'openai';
      const model = process.env.LLM_FAST_MODEL || 'gpt-4o-mini';

      const prompt = `Tóm tắt nội dung sau thành một tiêu đề ngắn gọn (khoảng 3-6 từ) để làm tên cho cuộc trò chuyện. Không dùng ngoặc kép, không dùng các ký tự đặc biệt, không trả lời dài dòng. Nội dung: "${content}"`;
      const result = await this.llmService.generate({
        provider,
        model,
        prompt,
      });

      let title = result.text.trim();
      // Loại bỏ ngoặc kép nếu LLM vẫn trả về
      if (title.startsWith('"') && title.endsWith('"')) {
        title = title.slice(1, -1);
      }

      await this.db
        .update(schema.conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));
      
      this.logger.log(`Tự động đặt tên hội thoại ${conversationId} thành: ${title}`);
    } catch (error) {
      this.logger.error(`Không thể sinh title cho hội thoại ${conversationId}: ${error.message}`);
    }
  }
}
