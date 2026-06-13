import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from '../drizzle.provider';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

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
      await this.seedDefaultAgents();
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

  private readPromptFile(filename: string, defaultPrompt: string): string {
    const pathsToTry = [
      path.join(__dirname, 'prompts', filename),
      path.join(process.cwd(), 'src', 'database', 'seeds', 'prompts', filename),
      path.join(process.cwd(), 'apps', 'api', 'src', 'database', 'seeds', 'prompts', filename),
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p, 'utf8');
        } catch (e: any) {
          this.logger.warn(`Lỗi khi đọc file prompt tại ${p}: ${e.message}`);
        }
      }
    }

    this.logger.warn(`Không tìm thấy file prompt ${filename} ở bất cứ đường dẫn nào. Sử dụng prompt mặc định.`);
    return defaultPrompt;
  }

  private async seedDefaultAgents() {
    // 1. Seed Router Agent nếu chưa tồn tại Router Agent có tên 'System Router'
    const routerByName = await this.db.query.agents.findFirst({
      where: eq(schema.agents.name, 'System Router'),
    });

    if (!routerByName) {
      const routerInstructions = this.readPromptFile(
        'system-router.md',
        'Bạn là Router Agent định tuyến yêu cầu của người dùng đến Specialist Agent phù hợp nhất. Trả về JSON { "targetAgentId": "uuid" }'
      );

      await this.db.insert(schema.agents).values({
        name: 'System Router',
        systemInstructions: routerInstructions,
        llmProvider: 'local',
        llmModel: 'llama3.1:8b-instruct-q8_0',
        tier: 'fast',
        isRouter: true,
        maxSteps: 10,
        config: {},
        isActive: true,
      });
      this.logger.log('Đã seed Router Agent mặc định từ file .md: System Router (Local AI)');
    } else if (!routerByName.isRouter) {
      await this.db
        .update(schema.agents)
        .set({ isRouter: true })
        .where(eq(schema.agents.id, routerByName.id));
      this.logger.log('Đã cập nhật Router Agent mặc định thành isRouter: true');
    }

    // 2. Seed Specialist Agent nếu chưa tồn tại Specialist Agent có tên 'General Assistant'
    const specialistByName = await this.db.query.agents.findFirst({
      where: eq(schema.agents.name, 'General Assistant'),
    });

    if (!specialistByName) {
      const assistantInstructions = this.readPromptFile(
        'general-assistant.md',
        'Bạn là trợ lý ảo hữu ích, chạy cục bộ bằng mô hình Llama 3.1 8B.'
      );

      const [newAgent] = await this.db.insert(schema.agents).values({
        name: 'General Assistant',
        systemInstructions: assistantInstructions,
        llmProvider: 'local',
        llmModel: 'llama3.1:8b-instruct-q8_0',
        tier: 'smart',
        isRouter: false,
        maxSteps: 10,
        config: {},
        isActive: true,
      }).returning();

      // Thêm kỹ năng mặc định cho Specialist Agent
      await this.db.insert(schema.agentSkills).values({
        agentId: newAgent.id,
        name: 'General',
        description: 'Giải đáp các thắc mắc chung và hỗ trợ hội thoại hàng ngày',
      });

      this.logger.log('Đã seed Specialist Agent mặc định từ file .md: General Assistant (Local AI)');
    } else if (specialistByName.isRouter) {
      await this.db
        .update(schema.agents)
        .set({ isRouter: false })
        .where(eq(schema.agents.id, specialistByName.id));
      this.logger.log('Đã cập nhật Specialist Agent mặc định thành isRouter: false');
    }
  }
}
