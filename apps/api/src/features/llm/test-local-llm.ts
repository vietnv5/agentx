import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmModule } from './llm.module';
import { LlmService } from './llm.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LlmModule,
  ],
})
class TestModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const llmService = app.get(LlmService);

  const provider = 'local';
  const model = 'llama3.1:8b-instruct-q8_0';
  console.log(`\n========================================`);
  console.log(`Connecting to Local LLM via provider: '${provider}', model: '${model}'...`);
  console.log(`Base URL: ${process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1'}`);
  console.log(`========================================\n`);

  try {
    const response = await llmService.generate({
      provider,
      model,
      prompt: 'Trả lời ngắn gọn: Bạn là AI mô hình nào và chạy ở đâu?',
    });
    console.log('--- PHẢN HỒI THÀNH CÔNG ---');
    console.log(response.text);
    console.log('---------------------------');
    console.log(`Tokens sử dụng: ${response.totalTokens} (Prompt: ${response.promptTokens}, Completion: ${response.completionTokens})`);
    console.log(`Chi phí ước lượng: $${response.costUsd}`);
  } catch (error) {
    console.error('--- LỖI KHI GỌI LOCAL LLM ---');
    console.error(error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
