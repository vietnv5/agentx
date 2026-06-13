# Developer Onboarding Guide

> Hướng dẫn setup môi trường phát triển AgentX lần đầu tiên — từ cài đặt công cụ đến chạy thành công toàn bộ hệ thống trên local.

---

## 1. Prerequisites

### Yêu cầu hệ thống

| Tool | Version | Kiểm tra |
|------|---------|----------|
| **Node.js** | ≥ 22.0.0 | `node --version` |
| **pnpm** | ≥ 10.0.0 | `pnpm --version` |
| **Docker Desktop** | Latest | `docker --version` |
| **Git** | Latest | `git --version` |

### Cài đặt nếu chưa có

```bash
# Node.js (recommend dùng nvm hoặc fnm)
fnm install 22
fnm use 22

# pnpm
npm install -g pnpm@latest

# Docker Desktop → https://www.docker.com/products/docker-desktop
```

### LLM API Keys (tối thiểu 1 key)

| Provider | Lấy key tại | Biến môi trường |
|----------|------------|----------------|
| Anthropic | https://console.anthropic.com | `ANTHROPIC_API_KEY` |
| OpenAI | https://platform.openai.com | `OPENAI_API_KEY` |

---

## 2. Clone & Install

```bash
# 1. Clone repository
git clone https://github.com/vietnv5/agentx.git
cd agentx

# 2. Install dependencies (pnpm workspace)
pnpm install
```

Monorepo structure:
```
agentx/
├── apps/
│   ├── api/       ← Backend (NestJS)
│   └── web/       ← Frontend (Vite SPA)
├── package.json   ← Root workspace config
└── pnpm-workspace.yaml
```

---

## 3. Environment Setup

### 3.1 Backend Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Mở `apps/api/.env` và điền các giá trị:

```env
# ─── Server ────────────────────────────
PORT=8000
NODE_ENV=development

# ─── Database (khớp với docker-compose) ─
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=agentx_user
DATABASE_PASSWORD=agentx_secure_password
DATABASE_NAME=agentx_db

# ─── Redis ──────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ─── JWT Secrets ────────────────────────
JWT_ACCESS_SECRET=dev_access_secret_change_this_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_this_in_production

# ─── Encryption Key (AES-256 cho user credentials) ─
ENCRYPTION_KEY=dev_encryption_key_32_chars_long!

# ─── Admin Seed Account ────────────────
ADMIN_DEFAULT_EMAIL=admin@agentx.local
ADMIN_DEFAULT_PASSWORD=Admin@123456

# ─── LLM Configuration ─────────────────
LLM_SMART_PROVIDER=anthropic
LLM_SMART_MODEL=claude-sonnet-4-20250514
LLM_FAST_PROVIDER=anthropic
LLM_FAST_MODEL=claude-haiku-4-20250414

# ─── LLM API Keys (điền ít nhất 1 key) ─
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
DEEPSEEK_API_KEY=
```

### 3.2 Frontend Environment

```bash
cp apps/web/.env.example apps/web/.env
```

Mở `apps/web/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

## 4. Start Infrastructure (Database + Redis)

Khởi chạy PostgreSQL (với pgvector) và Redis bằng Docker Compose:

```bash
# Chỉ chạy infra containers (không chạy app containers)
docker compose up postgres redis -d
```

Kiểm tra containers đã running:

```bash
docker compose ps
# NAME                  STATUS
# agentx-postgres-dev   Up
# agentx-redis-dev      Up
```

Kiểm tra database connection:

```bash
docker exec agentx-postgres-dev psql -U agentx_user -d agentx_db -c "SELECT 1;"
```

---

## 5. Run Backend

```bash
# 1. Chạy database migrations
cd apps/api
pnpm drizzle-kit migrate

# 2. Khởi chạy backend (development mode with hot-reload)
cd ../..
pnpm dev:api
```

Backend sẽ chạy tại `http://localhost:8000`.

Khi khởi chạy, bạn sẽ thấy logs hiển thị thông tin khởi tạo và đường dẫn truy cập rõ ràng:

```
[Nest] LOG [NestApplication] Nest application successfully started +1ms
[Nest] LOG [Bootstrap] ====================================================
[Nest] LOG [Bootstrap] 🚀 Application is running on: http://localhost:8000/api
[Nest] LOG [Bootstrap] 📖 Swagger API Document is on: http://localhost:8000/docs
[Nest] LOG [Bootstrap] ====================================================
```

*(Nếu khởi động lần đầu và đã cấu hình DB, log seeding cũng sẽ xuất hiện tự động để tạo tài khoản admin: `admin@agentx.local` / `Admin@123456`)*.

### 5.2 API Documentation (Swagger Docs)
Tài liệu API được cấu hình tự động thông qua Swagger UI. Sau khi backend khởi chạy thành công, bạn có thể truy cập trực tiếp tại:
👉 **http://localhost:8000/docs**

Tại đây, bạn có thể xem chi tiết tất cả các endpoint, các schemas DTOs đầu vào/đầu ra, và thực hiện gọi thử trực tiếp bằng Bearer Token.

### 5.3 Request Logging
Mọi request HTTP gửi tới API đều được tự động ghi lại log qua `LoggerMiddleware` theo định dạng:
`[HTTP] <METHOD> <URL> <STATUS_CODE> - <DURATION>ms - IP: <IP_ADDRESS>`
Giúp dễ dàng theo dõi và gỡ lỗi trong quá trình phát triển.

### 5.4 Kiểm tra health:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

---

## 6. Run Frontend

```bash
# Mở terminal mới
pnpm dev:web
```

Frontend sẽ chạy tại `http://localhost:3000`.

Hoặc chạy cả FE + BE cùng lúc:

```bash
pnpm dev
```

### 6.2 Frontend UI Stack Setup (Vite 6 + HeroUI 3 + React Router 7)

Dự án sử dụng **Vite 6** kết hợp với **HeroUI 3**, **Tailwind CSS v4**, **React 19** và **React Router 7** cho giao diện SPA. Dưới đây là cách stack này được thiết lập:

#### 1. Cài đặt các Package chính
```bash
cd apps/web
pnpm add @heroui/react @heroui/styles framer-motion react-router react-dom next-themes react-i18next i18next
pnpm add -D tailwindcss @tailwindcss/vite vite
```

#### 2. Cấu hình Tailwind CSS v4 trong `src/styles/globals.css`
Tailwind v4 đơn giản hóa cấu hình bằng cách import trực tiếp trong tệp CSS chính và sử dụng Vite plugin (`@tailwindcss/vite`):
```css
@import "tailwindcss";
@import "@heroui/styles";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: "Inter", sans-serif;
  --font-mono: "Fira Code", monospace;
}
```

#### 3. Entry Point (`src/main.tsx`)
Điểm khởi động của ứng dụng, chịu trách nhiệm bootstrap và wrap các provider toàn cục (Routing, Theme, Toast):
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

#### 4. Route Định Tuyến Chính (`src/App.tsx`)
Khai báo toàn bộ layout và route của ứng dụng, hỗ trợ dynamic import (lazy-loading) để tối ưu dung lượng bundle:
```tsx
import { Route, Routes, Navigate } from "react-router";
import { lazy, Suspense } from "react";

// Layouts
import DashboardLayout from "@/layouts/dashboard-layout";
import AuthLayout from "@/layouts/auth-layout";
import LayoutWrapper from "@/layouts/layout-wrapper";

// Lazy-loaded pages
const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/features/auth/components/login/login-view"));
const ChatPage = lazy(() => import("@/features/chat-session/components/chat/chat-view"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
```

---

## 7. First Login & Verification

### 7.1 Đăng nhập Admin

1. Mở browser: `http://localhost:3000`
2. Đăng nhập: `admin@agentx.local` / `Admin@123456`
3. Bạn sẽ được chuyển tới Dashboard

### 7.2 Tạo Agent đầu tiên

1. Vào **Admin Panel** → **Agents** → **Create Agent**
2. Điền thông tin:
   - Name: `General Assistant`
   - System Instructions: `Bạn là trợ lý AI thông minh, thân thiện.`
   - Tier: `smart`
   - Type: Specialist Agent
3. Save

### 7.3 Test Chat

1. Vào **Chat**
2. Gõ: `Xin chào, bạn có thể giúp gì cho tôi?`
3. Agent sẽ stream response về

---

## 8. IDE Setup

### VS Code Extensions (Recommended)

| Extension | Mục đích |
|-----------|---------|
| **ESLint** | Lint code |
| **Prettier** | Format code |
| **Tailwind CSS IntelliSense** | Autocomplete Tailwind classes |
| **PostgreSQL** (by Chris Kolkman) | Browse DB |
| **Thunder Client** hoặc **REST Client** | Test API |
| **GitLens** | Git history |

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "api", "start:debug"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 9. Troubleshooting

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix:** Kiểm tra Docker container đang chạy:
```bash
docker compose up postgres -d
docker compose logs postgres
```

### Port đã bị chiếm

```
Error: listen EADDRINUSE :::8000
```

**Fix:** Tìm và kill process:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8000
kill -9 <PID>
```

### pgvector extension not found

```
Error: type "vector" does not exist
```

**Fix:** Đảm bảo dùng image `pgvector/pgvector:pg16` trong docker-compose, không dùng `postgres:16` thuần.

### pnpm install fails

```
ERR_PNPM_PEER_DEP_ISSUES
```

**Fix:**
```bash
pnpm install --no-strict-peer-dependencies
```

### HeroUI components not rendering

Kiểm tra `main.tsx` đã import `@/styles/globals.css` và globals.css đã import `@heroui/styles`.

---

*Last updated: 2026-06-06*
