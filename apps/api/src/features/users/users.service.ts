import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
      with: {
        role: true,
      },
    });
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: {
        role: true,
      },
    });
  }

  async findAll() {
    return this.db.query.users.findMany({
      with: {
        role: true,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
  }

  async findAllRoles() {
    return this.db.query.roles.findMany({
      with: {
        toolPermissions: true,
      },
    });
  }

  async updateUser(id: string, updateData: { roleId?: string; isActive?: boolean }) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    await this.db
      .update(schema.users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));

    return this.findById(id);
  }

  async getToolPermissions(roleId: string) {
    return this.db.query.toolPermissions.findMany({
      where: eq(schema.toolPermissions.roleId, roleId),
    });
  }

  async updateToolPermission(roleId: string, toolPattern: string, allowed: boolean) {
    // Check if permission already exists for this role and pattern
    const existing = await this.db.query.toolPermissions.findFirst({
      where: and(
        eq(schema.toolPermissions.roleId, roleId),
        eq(schema.toolPermissions.toolPattern, toolPattern),
      ),
    });

    if (existing) {
      await this.db
        .update(schema.toolPermissions)
        .set({ allowed })
        .where(eq(schema.toolPermissions.id, existing.id));
    } else {
      await this.db.insert(schema.toolPermissions).values({
        roleId,
        toolPattern,
        allowed,
      });
    }

    return this.getToolPermissions(roleId);
  }
}
