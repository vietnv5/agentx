# Project Initialization Guide

> **Mục tiêu**: Tài liệu ghi chép lại toàn bộ quy trình thiết lập monorepo pnpm, khởi tạo boilerplate cho Backend (NestJS) và Frontend (Next.js + HeroUI 3) từ con số 0, giúp lưu trữ lịch sử cấu trúc và hỗ trợ tái dựng hoặc nhân bản dự án khi cần.

---

## 1. Thiết lập cấu trúc Monorepo (pnpm Workspace)

Hệ thống AgentX áp dụng mô hình monorepo sử dụng **pnpm workspaces** để quản lý nhiều gói (packages/applications) trong một repository duy nhất một cách hiệu quả, chia sẻ dependencies và tối ưu hóa thời gian cài đặt.

### Bước 1.1: Khởi tạo thư mục root và package.json ở root
Tạo thư mục dự án và khởi tạo file `package.json` quản lý chung ở thư mục gốc:

```bash
mkdir agentx
cd agentx
pnpm init
```

Cập nhật cấu hình file `package.json` ở root để khai báo đây là dự án monorepo private, đồng thời định nghĩa các scripts gộp để quản lý các ứng dụng con:

```json
{
  "name": "agentx-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev": "pnpm --filter api dev & pnpm --filter web dev",
    "build:api": "pnpm --filter api build",
    "build:web": "pnpm --filter web build",
    "build": "pnpm --recursive build",
    "lint": "pnpm --recursive lint",
    "test": "pnpm --recursive test"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

### Bước 1.2: Định nghĩa Workspace (`pnpm-workspace.yaml`)
Tạo file `pnpm-workspace.yaml` tại thư mục root để chỉ ra nơi chứa các ứng dụng con (ở đây là thư mục `apps/`):

```yaml
packages:
  - "apps/*"
```

Tạo thư mục chứa các ứng dụng:
```bash
mkdir apps
```

---

## 2. Khởi tạo Backend (NestJS) tại `apps/api`

Tầng nghiệp vụ và APIs của AgentX được xây dựng trên nền tảng **NestJS**.

### Bước 2.1: Khởi tạo khung dự án bằng NestJS CLI
Di chuyển vào thư mục `apps/` và chạy lệnh NestJS CLI thông qua `npx` để sinh mã boilerplate:

```bash
cd apps
npx -y @nestjs/cli new api --directory=api --package-manager=pnpm --strict --skip-git --skip-install
```

**Giải thích các cờ sử dụng:**
*   `api`: Tên của ứng dụng con.
*   `--directory=api`: Đặt thư mục đích là `api`.
*   `--package-manager=pnpm`: Cấu hình pnpm làm trình quản lý gói mặc định cho dự án con này.
*   `--strict`: Kích hoạt chế độ kiểm tra kiểu nghiêm ngặt (Strict Type Checking) của TypeScript, giúp giảm thiểu lỗi runtime.
*   `--skip-git`: Bỏ qua khởi tạo Git repository cục bộ do dự án đã quản lý Git tập trung ở thư mục root.
*   `--skip-install`: **Quan trọng**. Không tự cài dependencies cục bộ để tránh tạo file lockfile riêng lẻ và phân mảnh thư mục `node_modules` ngoài tầm kiểm soát của pnpm workspace.

---

## 3. Khởi tạo Frontend (Vite 6 + HeroUI 3 + React Router 7) tại `apps/web`

Giao diện người dùng và Admin Dashboard của AgentX được xây dựng bằng **Vite 6** kết hợp với **HeroUI 3** và **React Router 7**.

### Bước 3.1: Khởi tạo khung dự án bằng Vite
Di chuyển vào thư mục `apps/` và chạy lệnh khởi tạo template React TypeScript bằng Vite:

```bash
cd apps
npx -y create-vite@latest web --template react-ts
```

### Bước 3.2: Dọn dẹp tích hợp monorepo
Sau khi CLI khởi tạo thành công, thực hiện dọn dẹp các tệp tin thừa có thể gây xung đột với monorepo:
*   Xóa file `apps/web/pnpm-lock.yaml` để tránh xung đột lockfile ở root.
*   Xóa thư mục `apps/web/.git/` để tránh lồng Git repository.
*   Xóa thư mục `apps/web/node_modules/` để chuẩn bị cài đặt đồng nhất từ root workspace.

---

## 4. Cấu hình Packages & Đồng bộ Workspace

### Bước 4.1: Cấu hình dependencies bổ sung cho Backend
Cập nhật tệp `apps/api/package.json`, bổ sung các dependencies nghiệp vụ vào phần `dependencies`:
*   Cơ sở dữ liệu: `drizzle-orm`, `pg` (PostgreSQL client)
*   Bộ nhớ đệm: `redis`, `ioredis`
*   Bảo mật & Xác thực: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `helmet`
*   Tiện ích & Xác thực dữ liệu: `class-validator`, `class-transformer`, `@paralleldrive/cuid2`
*   Tài liệu API: `@nestjs/swagger`, `swagger-ui-express`

Đồng thời, thêm script chạy dev: `"dev": "nest start --watch"` vào mục `scripts` và thêm các gói types cần thiết (`@types/bcrypt`, `@types/pg`, `@types/passport-jwt`, và `drizzle-kit` cho dev) vào phần `devDependencies`.

### Bước 4.2: Cấu hình dependencies bổ sung cho Frontend
Cập nhật tệp `apps/web/package.json`, đổi tên package thành `"name": "web"` và bổ sung các thư viện hỗ trợ:
*   Giao tiếp API: `axios`
*   Quản lý State: `zustand`
*   Icons & Animation: `lucide-react`, `framer-motion` (nếu template chưa khai báo)

### Bước 4.3: Chạy cài đặt đồng bộ hóa toàn bộ Workspace
Tại thư mục root của monorepo, chạy lệnh:

```bash
pnpm install
```

pnpm sẽ tự động phân tích tất cả các tệp `package.json` trong monorepo, tải về các gói và thiết lập các symbolic links dùng chung một cách tối ưu.

---

## 5. Thiết lập mã nguồn cơ bản ban đầu (Boilerplate Integration)

### 5.1 Cấu hình Frontend (Vite 6 + HeroUI 3 + React Router 7)

#### 1. Tạo Entry Point (`apps/web/src/main.tsx`)
Điểm khởi động của ứng dụng, chịu trách nhiệm bootstrap và cung cấp các provider chính (Routing, Theme, Toast):
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";

import App from "./App.tsx";
import "./i18n"; // Khởi tạo i18next
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Toast.Provider />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

#### 2. Định nghĩa App Component (`apps/web/src/App.tsx`)
```tsx
import { Route, Routes, Navigate } from "react-router";
import { lazy, Suspense } from "react";

// Layouts
import LayoutWrapper from "@/layouts/layout-wrapper";
import AuthLayout from "@/layouts/auth-layout";
import DashboardLayout from "@/layouts/dashboard-layout";

const HomePage = lazy(() => import("@/pages/home"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
```

#### 3. Cấu hình CSS (`apps/web/src/styles/globals.css`)
Import Tailwind v4 và styles của HeroUI:
```css
@import "tailwindcss";
@import "@heroui/styles";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: "Inter", sans-serif;
  --font-mono: "Fira Code", monospace;
}
```

---

### 5.2 Cấu hình Backend (NestJS 11 + Swagger & Logging)

#### 1. Tạo HTTP Request Logger Middleware
Tạo file `apps/api/src/common/middleware/logger.middleware.ts` để ghi lại nhật ký request:
```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip}`);
    });

    next();
  }
}
```

#### 2. Đăng ký Middleware trong `app.module.ts`
```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({ /* controllers, providers */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
```

#### 3. Cấu hình Swagger Docs và in Logs startup trong `main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('AgentX API')
    .setDescription('Tài liệu API hệ thống AgentX — Multi-Agent Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port);
  
  logger.log(`====================================================`);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📖 Swagger API Document is on: http://localhost:${port}/docs`);
  logger.log(`====================================================`);
}
bootstrap();
```

---

## 6. Chạy thử nghiệm và xác minh

Kiểm tra biên dịch dự án Backend và Frontend để đảm bảo tất cả cấu hình chuẩn hóa:

```bash
# Build Backend NestJS
pnpm --filter api build

# Build Frontend Vite SPA
pnpm --filter web build
```

Khởi chạy môi trường phát triển cục bộ:
```bash
pnpm dev
```
*   API phục vụ tại: `http://localhost:8000/api`
*   Swagger UI phục vụ tại: `http://localhost:8000/docs`
*   Web app phục vụ tại: `http://localhost:3000`
