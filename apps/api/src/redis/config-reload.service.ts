import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Subject } from 'rxjs';
import { RedisService } from './redis.service';

@Injectable()
export class ConfigReloadService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigReloadService.name);
  private subClient: Redis;
  
  // Subject phát sự kiện reload sang McpClientPool đăng ký
  readonly reload$ = new Subject<string>();

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    // Khởi tạo client kết nối riêng phục vụ subscribe
    this.subClient = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 3,
    });

    this.subClient.on('connect', () => {
      this.logger.log(`Redis SubClient connected successfully for channel subscriptions.`);
    });

    this.subClient.subscribe('mcp:reload', (err) => {
      if (err) {
        this.logger.error('Đăng ký kênh mcp:reload thất bại:', err);
      } else {
        this.logger.log('Đăng ký kênh mcp:reload thành công.');
      }
    });

    this.subClient.on('message', (channel, message) => {
      if (channel === 'mcp:reload') {
        try {
          const { integrationId } = JSON.parse(message);
          this.logger.log(`Nhận sự kiện reload cho Integration ID: ${integrationId}`);
          this.reload$.next(integrationId);
        } catch (err) {
          this.logger.error('Lỗi phân tích tin nhắn reload:', err.message);
        }
      }
    });
  }

  publishReload(integrationId: string) {
    this.logger.log(`Phát sự kiện reload cho Integration ID: ${integrationId}`);
    this.redisService.getClient().publish('mcp:reload', JSON.stringify({ integrationId }));
  }

  onModuleDestroy() {
    if (this.subClient) {
      this.subClient.disconnect();
    }
  }
}
