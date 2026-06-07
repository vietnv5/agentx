import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, sql, eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getToolExecutions(limit = 100) {
    return this.db.query.toolExecutions.findMany({
      orderBy: [desc(schema.toolExecutions.executedAt)],
      limit,
    });
  }

  async getLlmUsageLogs(limit = 100) {
    return this.db.query.llmUsageLogs.findMany({
      with: {
        agent: true,
      },
      orderBy: [desc(schema.llmUsageLogs.createdAt)],
      limit,
    });
  }

  async getDashboardStats() {
    // 1. Tổng cost 24h qua và tổng cộng
    const totalCostRes = await this.db
      .select({
        totalCost: sql<number>`COALESCE(SUM(CAST(${schema.llmUsageLogs.costUsd} AS NUMERIC)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(${schema.llmUsageLogs.totalTokens}), 0)`,
        avgLatency: sql<number>`COALESCE(AVG(${schema.llmUsageLogs.latencyMs}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.llmUsageLogs);

    const past24hCostRes = await this.db
      .select({
        totalCost: sql<number>`COALESCE(SUM(CAST(${schema.llmUsageLogs.costUsd} AS NUMERIC)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(${schema.llmUsageLogs.totalTokens}), 0)`,
      })
      .from(schema.llmUsageLogs)
      .where(sql`${schema.llmUsageLogs.createdAt} >= NOW() - INTERVAL '24 HOURS'`);

    // 2. Tỷ lệ lỗi tool execution
    const toolStats = await this.db
      .select({
        status: schema.toolExecutions.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.toolExecutions)
      .groupBy(schema.toolExecutions.status);

    // 3. Biểu đồ chi phí theo ngày (7 ngày qua)
    const costOverTime = await this.db
      .select({
        date: sql<string>`TO_CHAR(${schema.llmUsageLogs.createdAt}, 'YYYY-MM-DD')`,
        cost: sql<number>`COALESCE(SUM(CAST(${schema.llmUsageLogs.costUsd} AS NUMERIC)), 0)`,
        tokens: sql<number>`COALESCE(SUM(${schema.llmUsageLogs.totalTokens}), 0)`,
      })
      .from(schema.llmUsageLogs)
      .where(sql`${schema.llmUsageLogs.createdAt} >= NOW() - INTERVAL '7 DAYS'`)
      .groupBy(sql`TO_CHAR(${schema.llmUsageLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${schema.llmUsageLogs.createdAt}, 'YYYY-MM-DD')`);

    // 4. Số lượng agents và integrations
    const [agentCount] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(schema.agents);
    const [integrationCount] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(schema.integrations);

    return {
      overall: {
        totalCost: Number(totalCostRes[0]?.totalCost || 0),
        totalTokens: Number(totalCostRes[0]?.totalTokens || 0),
        avgLatencyMs: Math.round(Number(totalCostRes[0]?.avgLatency || 0)),
        requestCount: Number(totalCostRes[0]?.count || 0),
        agentCount: Number(agentCount?.count || 0),
        integrationCount: Number(integrationCount?.count || 0),
      },
      past24h: {
        totalCost: Number(past24hCostRes[0]?.totalCost || 0),
        totalTokens: Number(past24hCostRes[0]?.totalTokens || 0),
      },
      toolExecutions: toolStats.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      }, {} as Record<string, number>),
      costOverTime,
    };
  }
}
