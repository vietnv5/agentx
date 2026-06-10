import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { McpModule } from './mcp/mcp.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, McpModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService, McpModule],
})
export class IntegrationsModule {}
