import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateToolPermissionDto } from './dto/create-tool-permission.dto';
import { UpdateToolPermissionDto } from './dto/update-tool-permission.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(schema.users.email, email), eq(schema.users.deleted, false)),
      with: {
        role: true,
      },
    });
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: and(eq(schema.users.id, id), eq(schema.users.deleted, false)),
      with: {
        role: true,
      },
    });
  }

  async findAll() {
    return this.db.query.users.findMany({
      where: eq(schema.users.deleted, false),
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

  async createUser(createData: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createData.password, salt);

    const [newUser] = await this.db.insert(schema.users).values({
      name: createData.name,
      email: createData.email,
      password: hashedPassword,
      roleId: createData.roleId,
      isActive: createData.isActive ?? true,
    }).returning();

    return this.findById(newUser.id);
  }

  async updateUser(id: string, updateData: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    const payload: any = { ...updateData };
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(updateData.password, salt);
    } else {
      delete payload.password;
    }

    await this.db
      .update(schema.users)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));

    return this.findById(id);
  }

  async deleteUser(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    // Soft delete the user by setting deleted: true and isActive: false
    await this.db
      .update(schema.users)
      .set({ deleted: true, isActive: false })
      .where(eq(schema.users.id, id));

    return { success: true };
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

  async createToolPermission(roleId: string, createData: CreateToolPermissionDto) {
    const [newPerm] = await this.db.insert(schema.toolPermissions).values({
      roleId,
      toolPattern: createData.toolPattern,
      allowed: createData.allowed,
      isActive: createData.isActive ?? true,
    }).returning();

    return newPerm;
  }

  async updatePermission(id: string, updateData: UpdateToolPermissionDto) {
    const [updated] = await this.db
      .update(schema.toolPermissions)
      .set({
        ...updateData,
      })
      .where(eq(schema.toolPermissions.id, id))
      .returning();

    return updated;
  }

  async deletePermission(id: string) {
    await this.db
      .delete(schema.toolPermissions)
      .where(eq(schema.toolPermissions.id, id));

    return { success: true };
  }
}
