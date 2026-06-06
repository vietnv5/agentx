import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Thiết lập global prefix là api
  app.setGlobalPrefix('api');

  // Cấu hình Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('AgentX API')
    .setDescription('Tài liệu API hệ thống AgentX — Multi-Agent Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  // Đường dẫn docs sẽ là /docs
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port);
  
  logger.log(`====================================================`);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📖 Swagger API Document is on: http://localhost:${port}/docs`);
  logger.log(`====================================================`);
}
bootstrap();
