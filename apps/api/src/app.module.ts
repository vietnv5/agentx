import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './features/users/users.module';
import { AuthModule } from './features/auth/auth.module';
import { AgentsModule } from './features/agents/agents.module';
import { IntegrationsModule } from './features/integrations/integrations.module';
import { AuditModule } from './features/audit/audit.module';
import { ChatModule } from './features/chat/chat.module';
import { MemoryModule } from './features/memory/memory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    AuthModule,
    AgentsModule,
    IntegrationsModule,
    AuditModule,
    ChatModule,
    MemoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
