import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { HttpClientTransport } from './http-client.transport';
import { DRIZZLE_PROVIDER } from '../../../database/drizzle.provider';
import * as schema from '../../../database/schema';
import { ConfigReloadService } from '../../../redis/config-reload.service';

@Injectable()
export class McpClientPool implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(McpClientPool.name);
  private readonly activeClients = new Map<string, { client: Client; transport: any }>();

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configReloadService: ConfigReloadService,
  ) {}

  onModuleInit() {
    this.configReloadService.reload$.subscribe(async (integrationId) => {
      this.logger.log(`Tín hiệu reload nhận được. Thực hiện đóng kết nối cũ cho: ${integrationId}`);
      await this.closeClient(integrationId);
    });
  }

  async getClient(integrationId: string): Promise<Client> {
    const cached = this.activeClients.get(integrationId);
    if (cached) {
      return cached.client;
    }

    const integration = await this.db.query.integrations.findFirst({
      where: eq(schema.integrations.id, integrationId),
    });

    if (!integration || integration.status !== 'active') {
      throw new Error(`MCP Integration ${integrationId} không tồn tại hoặc đang inactive.`);
    }

    this.logger.log(`Đang thiết lập kết nối tới MCP Integration: ${integration.name}`);
    const { client, transport } = await this.connect(integration);
    this.activeClients.set(integrationId, { client, transport });
    return client;
  }

  async closeClient(integrationId: string): Promise<void> {
    const cached = this.activeClients.get(integrationId);
    if (cached) {
      this.logger.log(`Đang đóng kết nối tới MCP Integration ID: ${integrationId}`);
      try {
        await cached.client.close();
      } catch (err) {
        this.logger.error(`Lỗi khi đóng client MCP: ${err.message}`);
      }
      this.activeClients.delete(integrationId);
    }
  }

  async testConnection(integration: typeof schema.integrations.$inferSelect) {
    this.logger.log(`Kiểm tra kết nối thử tới MCP Server: ${integration.name}`);
    let connection: { client: Client; transport: any } | null = null;
    try {
      connection = await this.connect(integration);
      const toolList = await connection.client.listTools();
      return {
        success: true,
        tools: toolList.tools || [],
      };
    } catch (error) {
      this.logger.error(`Kiểm tra kết nối MCP thất bại cho ${integration.name}: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Kết nối thất bại',
      };
    } finally {
      if (connection) {
        try {
          await connection.client.close();
        } catch (err) {
          this.logger.error(`Lỗi khi đóng kết nối thử: ${err.message}`);
        }
      }
    }
  }

  async syncTools(integrationId: string): Promise<void> {
    const integration = await this.db.query.integrations.findFirst({
      where: eq(schema.integrations.id, integrationId),
    });

    if (!integration) {
      throw new Error(`Không tìm thấy MCP Integration ID: ${integrationId}`);
    }

    const testRes = await this.testConnection(integration);
    if (!testRes.success || !testRes.tools) {
      throw new Error(`Không thể đồng bộ công cụ: Kết nối lỗi (${testRes.error})`);
    }

    const discoveredTools = testRes.tools;

    await this.db.transaction(async (tx) => {
      // Lấy danh sách tools hiện tại trong db cho integration này
      const existingTools = await tx.query.toolDefinitions.findMany({
        where: eq(schema.toolDefinitions.integrationId, integrationId),
      });

      const existingToolNames = existingTools.map((t) => t.toolName);
      const discoveredToolNames = discoveredTools.map((t) => t.name);

      // 1. Xóa các tools không còn tồn tại ở server
      const toolsToDelete = existingTools.filter((t) => !discoveredToolNames.includes(t.toolName));
      if (toolsToDelete.length > 0) {
        await tx.delete(schema.toolDefinitions).where(
          inArray(
            schema.toolDefinitions.id,
            toolsToDelete.map((t) => t.id),
          ),
        );
      }

      // 2. Thêm mới hoặc cập nhật các tools từ server
      for (const tool of discoveredTools) {
        const existing = existingTools.find((t) => t.toolName === tool.name);
        if (existing) {
          // Cập nhật mô tả & inputSchema
          await tx
            .update(schema.toolDefinitions)
            .set({
              description: tool.description || '',
              inputSchema: tool.inputSchema || {},
            })
            .where(eq(schema.toolDefinitions.id, existing.id));
        } else {
          // Thêm mới
          await tx.insert(schema.toolDefinitions).values({
            integrationId,
            toolName: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema || {},
            requiresApproval: false, // Default false, Admin cấu hình sau
          });
        }
      }
    });

    this.logger.log(`Đồng bộ thành công ${discoveredTools.length} tools cho integration: ${integration.name}`);
  }

  private async connect(integration: typeof schema.integrations.$inferSelect) {
    let transport: any;
    if (integration.transport === 'stdio') {
      if (!integration.command) {
        throw new Error('Lỗi cấu hình stdio: Thiếu command chạy.');
      }
      const cleanEnv: Record<string, string> = {};
      for (const [key, val] of Object.entries(process.env)) {
        if (val !== undefined) {
          cleanEnv[key] = val;
        }
      }
      transport = new StdioClientTransport({
        command: integration.command,
        args: (integration.args as string[]) || [],
        env: {
          ...cleanEnv,
          ...((integration.env as Record<string, string>) || {}),
        },
      });
    } else if (integration.transport === 'sse') {
      if (!integration.endpoint) {
        throw new Error('Lỗi cấu hình SSE: Thiếu endpoint URL.');
      }
      transport = new SSEClientTransport(new URL(integration.endpoint), {
        eventSourceInit: {
          headers: (integration.headers as Record<string, string>) || {},
        } as any,
      });
    } else if (integration.transport === 'http') {
      if (!integration.endpoint) {
        throw new Error('Lỗi cấu hình HTTP: Thiếu endpoint URL.');
      }
      transport = new HttpClientTransport(new URL(integration.endpoint), {
        headers: (integration.headers as Record<string, string>) || {},
      });
    } else {
      throw new Error(`Chưa hỗ trợ transport: ${integration.transport}`);
    }

    const client = new Client(
      {
        name: 'agentx-platform-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );

    // Timeout kết nối sau 10 giây
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Kết nối tới MCP Server bị quá giờ (10s)')), 10000),
    );

    await Promise.race([connectPromise, timeoutPromise]);
    return { client, transport };
  }

  async executeTool(integrationId: string, toolName: string, args: Record<string, any>) {
    const client = await this.getClient(integrationId);
    try {
      const response = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return response;
    } catch (error) {
      this.logger.error(`Thực thi tool ${toolName} lỗi trên integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Đang đóng toàn bộ kết nối MCP Clients...');
    for (const [id] of this.activeClients) {
      await this.closeClient(id);
    }
  }
}
