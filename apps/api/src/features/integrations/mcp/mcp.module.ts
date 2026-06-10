import { Module } from '@nestjs/common';
import { McpClientPool } from './mcp-client.pool';
import { DatabaseModule } from '../../../database/database.module';
import { RedisModule } from '../../../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [McpClientPool],
  exports: [McpClientPool],
})
export class McpModule {}
