import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createConversation(userId: string, title?: string) {
    const [conv] = await this.db
      .insert(schema.conversations)
      .values({
        userId,
        title: title || 'Cuộc hội thoại mới',
      })
      .returning();

    return conv;
  }

  async findUserConversations(userId: string) {
    return this.db.query.conversations.findMany({
      where: eq(schema.conversations.userId, userId),
      orderBy: [desc(schema.conversations.updatedAt)],
    });
  }

  async findOne(id: string, userId: string) {
    const conv = await this.db.query.conversations.findFirst({
      where: and(eq(schema.conversations.id, id), eq(schema.conversations.userId, userId)),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    });

    if (!conv) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại ID: ${id}`);
    }

    return conv;
  }

  async deleteConversation(id: string, userId: string) {
    const conv = await this.findOne(id, userId);
    await this.db.delete(schema.conversations).where(eq(schema.conversations.id, conv.id));
    return { success: true, message: 'Đã xóa cuộc hội thoại thành công' };
  }

  async getPendingApprovals(conversationId: string, userId: string) {
    return this.db.query.approvalRequests.findMany({
      where: and(
        eq(schema.approvalRequests.conversationId, conversationId),
        eq(schema.approvalRequests.userId, userId),
        eq(schema.approvalRequests.status, 'pending'),
      ),
      orderBy: [desc(schema.approvalRequests.createdAt)],
    });
  }
}
