import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmProviderFactory } from './llm-provider.factory';

@Module({
  providers: [LlmProviderFactory, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
