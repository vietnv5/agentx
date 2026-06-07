import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from '../drizzle.provider';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Đang kiểm tra dữ liệu khởi tạo...');
    try {
      await this.seedRoles();
      await this.seedAdminUser();
    } catch (error) {
      this.logger.error('Lỗi khi seed dữ liệu khởi tạo:', (error as Error).stack);
    }
  }

  private async seedRoles() {
    const roles = [
      { name: 'ADMIN', description: 'Vai trò ADMIN' },
      { name: 'STAFF', description: 'Vai trò STAFF' },
    ];
    for (const roleData of roles) {
      const exists = await this.db.query.roles.findFirst({
        where: eq(schema.roles.name, roleData.name),
      });
      if (!exists) {
        await this.db.insert(schema.roles).values(roleData);
        this.logger.log(`Đã khởi tạo vai trò: ${roleData.name}`);
      }
    }
  }

  private async seedAdminUser() {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@agentx.local';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';

    const adminExists = await this.db.query.users.findFirst({
      where: eq(schema.users.email, adminEmail),
    });

    if (!adminExists) {
      // 1. Tìm vai trò ADMIN
      const adminRole = await this.db.query.roles.findFirst({
        where: eq(schema.roles.name, 'ADMIN'),
      });
      if (!adminRole) {
        throw new Error('Không tìm thấy vai trò ADMIN để liên kết.');
      }

      // 2. Mã hóa mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // 3. Tạo tài khoản
      await this.db.insert(schema.users).values({
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        roleId: adminRole.id,
        isActive: true,
      });

      this.logger.warn('====================================================');
      this.logger.warn(`TÀI KHOẢN ADMIN MẶC ĐỊNH ĐÃ ĐƯỢC KHỞI TẠO!`);
      this.logger.warn(`Email: ${adminEmail}`);
      this.logger.warn(`Password: ${adminPassword} (Vui lòng đổi mật khẩu sau khi đăng nhập)`);
      this.logger.warn('====================================================');
    } else {
      this.logger.log('Tài khoản Admin đã tồn tại. Bỏ qua bước seed user.');
    }
  }
}
