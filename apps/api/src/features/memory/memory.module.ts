import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { DatabaseModule } from '../../database/database.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [DatabaseModule, LlmModule],
  controllers: [MemoryController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
