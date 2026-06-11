import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { McpClientPool } from './mcp/mcp-client.pool';
import { ConfigReloadService } from '../../redis/config-reload.service';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly mcpPool: McpClientPool,
    private readonly configReloadService: ConfigReloadService,
  ) {}

  async findAll() {
    return this.db.query.integrations.findMany({
      with: {
        toolDefinitions: true,
      },
      orderBy: (integrations, { desc }) => [desc(integrations.createdAt)],
    });
  }

  async findOne(id: string) {
    const integration = await this.db.query.integrations.findFirst({
      where: eq(schema.integrations.id, id),
      with: {
        toolDefinitions: true,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Không tìm thấy MCP Integration ID: ${id}`);
    }

    return integration;
  }

  async create(dto: CreateIntegrationDto) {
    const [integration] = await this.db
      .insert(schema.integrations)
      .values({
        name: dto.name,
        description: dto.description,
        transport: dto.transport,
        endpoint: dto.endpoint,
        headers: dto.headers ?? {},
        command: dto.command,
        args: dto.args ?? [],
        env: dto.env ?? {},
        authConfig: dto.authConfig ?? {},
        status: dto.status ?? 'active',
      })
      .returning();

    // Nếu tạo ở trạng thái active, tự động kết nối và đồng bộ tools
    if (integration.status === 'active') {
      try {
        await this.mcpPool.syncTools(integration.id);
      } catch (err) {
        // Cập nhật status sang error nếu sync tools lỗi
        await this.db
          .update(schema.integrations)
          .set({ status: 'error', updatedAt: new Date() })
          .where(eq(schema.integrations.id, integration.id));
        
        // Trả về kèm thông tin cảnh báo lỗi kết nối
        return {
          ...integration,
          status: 'error',
          syncError: err.message,
        };
      }
    }

    return this.findOne(integration.id);
  }

  async update(id: string, dto: UpdateIntegrationDto) {
    const existing = await this.findOne(id);

    // Đóng client cũ trước khi cập nhật cấu hình mới
    await this.mcpPool.closeClient(id);

    const [updated] = await this.db
      .update(schema.integrations)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.integrations.id, id))
      .returning();

    if (updated.status === 'active') {
      try {
        await this.mcpPool.syncTools(id);
      } catch (err) {
        await this.db
          .update(schema.integrations)
          .set({ status: 'error', updatedAt: new Date() })
          .where(eq(schema.integrations.id, id));
        
        return {
          ...updated,
          status: 'error',
          syncError: err.message,
        };
      }
    }

    this.configReloadService.publishReload(id);
    return this.findOne(id);
  }

  async remove(id: string) {
    const integration = await this.findOne(id);
    await this.mcpPool.closeClient(id);
    await this.db.delete(schema.integrations).where(eq(schema.integrations.id, id));
    this.configReloadService.publishReload(id);
    return { success: true, message: `Đã xóa tích hợp ${integration.name} thành công` };
  }

  async testConnectionById(id: string) {
    const integration = await this.findOne(id);
    return this.mcpPool.testConnection(integration);
  }

  async syncToolsById(id: string) {
    try {
      await this.mcpPool.syncTools(id);
    } catch (err) {
      throw new BadRequestException(err.message || 'Lỗi khi đồng bộ tools');
    }
    return this.findOne(id);
  }

  async findAllTools() {
    return this.db.query.toolDefinitions.findMany({
      with: {
        integration: true,
      },
    });
  }

  async updateToolApproval(toolId: string, requiresApproval: boolean) {
    const tool = await this.db.query.toolDefinitions.findFirst({
      where: eq(schema.toolDefinitions.id, toolId),
    });

    if (!tool) {
      throw new NotFoundException(`Không tìm thấy Tool Definition ID: ${toolId}`);
    }

    await this.db
      .update(schema.toolDefinitions)
      .set({ requiresApproval })
      .where(eq(schema.toolDefinitions.id, toolId));

    return this.db.query.toolDefinitions.findFirst({
      where: eq(schema.toolDefinitions.id, toolId),
    });
  }

  async updateToolActive(toolId: string, isActive: boolean) {
    const tool = await this.db.query.toolDefinitions.findFirst({
      where: eq(schema.toolDefinitions.id, toolId),
    });

    if (!tool) {
      throw new NotFoundException(`Không tìm thấy Tool Definition ID: ${toolId}`);
    }

    await this.db
      .update(schema.toolDefinitions)
      .set({ isActive })
      .where(eq(schema.toolDefinitions.id, toolId));

    return this.db.query.toolDefinitions.findFirst({
      where: eq(schema.toolDefinitions.id, toolId),
    });
  }
}
