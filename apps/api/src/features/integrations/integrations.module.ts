import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { McpClientPool } from './mcp-client.pool';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, McpClientPool],
  exports: [IntegrationsService, McpClientPool],
})
export class IntegrationsModule {}
