import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Đăng ký cookie-parser để đọc HTTP-Only Cookies
  app.use(cookieParser());

  // Cấu hình CORS cho phép frontend kết nối chéo origin
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Hỗ trợ cookie cho fallback SSO chéo subdomain
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-refresh-token',
  });

  // Kích hoạt ValidationPipe toàn cục cho class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

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
