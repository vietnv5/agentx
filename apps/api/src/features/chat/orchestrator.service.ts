import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { Subject } from 'rxjs';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { LlmService } from '../llm/llm.service';
import { McpClientPool } from '../integrations/mcp-client.pool';

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
        })
        .returning();

      // 3. Lấy lịch sử tin nhắn của cuộc hội thoại
      const history = await this.db.query.messages.findMany({
        where: eq(schema.messages.conversationId, conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

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

    const allowedTools = bindings.map((b) => b.toolDefinition);

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
        prompt: promptInput,
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

      // Duyệt qua từng tool call để thực thi
      for (const call of toolCallsToExecute) {
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

          const [toolMsg] = await this.db
            .insert(schema.messages)
            .values({
              conversationId,
              role: 'tool',
              content: JSON.stringify(obsError),
              metadata: { toolCallId: call.toolCallId },
            })
            .returning();

          currentHistory.push(assistantMsg);
          currentHistory.push(toolMsg);
          continue;
        }

        // Tìm định nghĩa tool trong db
        const toolDef = allowedTools.find((t) => t.toolName === toolName);
        if (!toolDef) {
          const obsError = { error: `Không tìm thấy tool ${toolName} trong các tool được gán cho Agent` };
          
          const [toolMsg] = await this.db
            .insert(schema.messages)
            .values({
              conversationId,
              role: 'tool',
              content: JSON.stringify(obsError),
              metadata: { toolCallId: call.toolCallId },
            })
            .returning();

          currentHistory.push(assistantMsg);
          currentHistory.push(toolMsg);
          continue;
        }

        // 2b. Kiểm tra xem tool có cần User phê duyệt hay không (Human-In-The-Loop)
        if (toolDef.requiresApproval) {
          // Tạo Approval Request
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

          // TẠM DỪNG: Dừng ReAct loop ở đây và đóng stream, đợi người dùng phê duyệt
          eventSubject.complete();
          return;
        }

        // 2c. Thực thi tool thông qua McpClientPool
        eventSubject.next({
          event: 'tool_start',
          data: { toolName, args: toolArgs },
        });

        const start = Date.now();
        let observation: any;
        try {
          const result = await this.mcpPool.executeTool(toolDef.integrationId, toolName, toolArgs);
          observation = result;

          await this.db.insert(schema.toolExecutions).values({
            messageId: assistantMsg.id,
            toolDefinitionId: toolDef.id,
            toolName,
            input: toolArgs,
            output: result,
            status: 'success',
            durationMs: Date.now() - start,
          });

          eventSubject.next({
            event: 'tool_end',
            data: { toolName, output: result, status: 'success' },
          });
        } catch (err) {
          observation = { error: err.message };

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
            data: { toolName, output: { error: err.message }, status: 'error' },
          });
        }

        // Lưu tin nhắn observation của tool
        const [toolMsg] = await this.db
          .insert(schema.messages)
          .values({
            conversationId,
            role: 'tool',
            content: typeof observation === 'string' ? observation : JSON.stringify(observation),
            metadata: { toolCallId: call.toolCallId },
          })
          .returning();

        currentHistory.push(assistantMsg);
        currentHistory.push(toolMsg);
      }
    }

    // Quá số bước tối đa mà không trả về kết quả cuối
    eventSubject.next({ event: 'error', data: 'Vượt quá số bước ReAct tối đa của Agent.' });
    eventSubject.complete();
  }

  private formatHistoryForLlm(history: Array<typeof schema.messages.$inferSelect>): string {
    // Chuyển đổi lịch sử tin nhắn thành một chuỗi prompt hoặc format phù hợp.
    // Vì chúng ta dùng Vercel AI SDK Core (generateText/streamText), ta có thể truyền chuỗi hội thoại
    // dạng text hoặc prompt rõ ràng.
    return history
      .map((msg) => {
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        if (msg.role === 'tool') return `Tool Observation: ${msg.content}`;
        return `${msg.role}: ${msg.content}`;
      })
      .join('\n\n');
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
}
