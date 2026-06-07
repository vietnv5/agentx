import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigReloadService } from './config-reload.service';

@Global()
@Module({
  providers: [RedisService, ConfigReloadService],
  exports: [RedisService, ConfigReloadService],
})
export class RedisModule {}
