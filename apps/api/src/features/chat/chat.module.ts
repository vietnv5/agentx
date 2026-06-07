import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OrchestratorService } from './orchestrator.service';
import { DatabaseModule } from '../../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [DatabaseModule, LlmModule, IntegrationsModule],
  controllers: [ChatController],
  providers: [ChatService, OrchestratorService],
  exports: [ChatService, OrchestratorService],
})
export class ChatModule {}
