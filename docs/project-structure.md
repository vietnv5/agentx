# Source Code Structure & Setup Guide

Tài liệu này hướng dẫn chi tiết về cách cấu trúc mã nguồn theo hướng **Feature-based** (tập trung theo tính năng), cách cài đặt frontend với **HeroUI 3** và cơ chế xác thực **JWT (JSON Web Token)** mặc định cùng với việc tự động tạo tài khoản Admin khi khởi tạo hệ thống.

---

## 1. Feature-Based Architecture (Cấu trúc theo tính năng)

Dự án AgentX áp dụng mô hình Feature-based cho cả Backend và Frontend nhằm tăng khả năng bảo trì, cô lập các lỗi và giúp các đội phát triển làm việc song song mà ít bị xung đột code (conflict).

### 1.1 Backend (NestJS + TypeScript)
Thư mục `apps/api/` được tổ chức thành các Module tự chứa (Self-contained Modules). Mỗi module đại diện cho một tính năng/domain nghiệp vụ riêng, bao gồm đầy đủ controller, service, entities, DTOs và guards liên quan.

#### Sơ đồ cấu trúc thư mục Backend:
```
apps/api/
├── src/
│   ├── app.module.ts              # Module gốc kết nối tất cả các modules
│   ├── main.ts                    # Entry point của ứng dụng NestJS
│   │
│   ├── common/                    # Các thành phần dùng chung toàn hệ thống
│   │   ├── decorators/            # Custom decorators (e.g., @CurrentUser, @Roles)
│   │   ├── filters/               # Exception filters xử lý lỗi tập trung
│   │   ├── guards/                # Global guards hoặc shared guards
│   │   ├── interceptors/          # Logging, transform response interceptors
│   │   └── interfaces/            # Types/Interfaces dùng chung
│   │
│   ├── config/                    # Cấu hình hệ thống (Environment Variables validation)
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   │
│   ├── database/                  # Tầng kết nối Database (Drizzle ORM)
│   │   ├── database.module.ts     # Khởi tạo DrizzleModule & DrizzleProvider
│   │   ├── drizzle.provider.ts    # Provider kết nối PostgreSQL (pg client)
│   │   ├── schema.ts              # Trung tâm định nghĩa và export toàn bộ các bảng db
│   │   └── seeds/                 # Scripts seed dữ liệu ban đầu (Tạo Admin Account)
│   │       └── admin-seeding.ts
│   │
│   ├── redis/                     # Shared Redis module (Caching, Session management)
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   └── features/                  # Danh sách các modules tính năng (Feature-based)
│       ├── auth/                  # Tính năng xác thực & phân quyền
│       │   ├── dto/               # LoginDto, RegisterDto
│       │   ├── guards/            # JwtAuthGuard, RolesGuard
│       │   ├── strategies/        # JwtStrategy (Passport)
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── auth.module.ts
│       │
│       ├── users/                 # Quản lý người dùng và vai trò (RBAC)
│       │   ├── dto/
│       │   ├── users.schema.ts    # Drizzle schema cho bảng users và roles
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── users.module.ts
│       │
│       ├── agents/                # Quản lý Agent & Subagent Config (Layer 0 & 2)
│       │   ├── dto/
│       │   ├── agents.schema.ts   # Drizzle schema cho bảng agents và skills
│       │   ├── agents.controller.ts
│       │   ├── agents.service.ts
│       │   └── agents.module.ts
│       │
│       ├── conversations/         # Quản lý Session chat và lịch sử hội thoại (Layer 3)
│       │   ├── dto/
│       │   ├── conversations.schema.ts # Drizzle schema cho conversations, messages
│       │   ├── conversations.controller.ts
│       │   ├── conversations.service.ts
│       │   └── conversations.module.ts
│       │
│       ├── integrations/          # Quản lý kết nối MCP Server & API Adapters (Layer 5)
│       │   ├── dto/
│       │   ├── integrations.schema.ts # Drizzle schema cho integrations và tool definitions
│       │   ├── mcp-client.pool.ts # Quản lý kết nối MCP Client
│       │   ├── integrations.controller.ts
│       │   ├── integrations.service.ts
│       │   └── integrations.module.ts
│       │
│       └── llm/                   # Quản lý kết nối LLM Providers (Layer 4)
│           ├── llm-provider.factory.ts
│           ├── llm.service.ts
│           ├── token-metering.service.ts
│           └── llm.module.ts
```

#### Quy tắc thiết kế Backend:
1. **Tính độc lập**: Các module trong `features/` không được import trực tiếp các file logic nội bộ của module khác. Nếu cần giao tiếp, hãy import module đó hoặc sử dụng các Dependency Injection thông qua Interface/Service được export công khai.
2. **Không viết logic trong Controller**: Controller chỉ làm nhiệm vụ tiếp nhận HTTP requests, validate input thông qua DTOs/ValidationPipes, gọi service và trả về kết quả. Toàn bộ Business Logic phải nằm trong Service.

---

### 1.2 Frontend (Vite 6 + React Router 7 SPA)
Thư mục `apps/web/` là ứng dụng Single Page Application (SPA) thuần client-side được xây dựng trên nền tảng Vite 6 và React Router 7. Hệ thống được tổ chức theo cấu trúc Feature-based giúp mở rộng dễ dàng.

#### Sơ đồ cấu trúc thư mục Frontend:
```
apps/web/
├── public/                        # Static assets (images, fonts, icons)
├── src/
│   ├── App.tsx                    # Định nghĩa các routes và code-splitting (lazy load)
│   ├── main.tsx                   # Điểm khởi động ứng dụng (bootstrap), load global providers
│   ├── i18n/                      # Cấu hình đa ngôn ngữ (react-i18next)
│   │   ├── config.ts
│   │   └── index.ts
│   │
│   ├── layouts/                   # Layouts chứa khung bao ngoài các routes
│   │   ├── layout-wrapper.tsx     # Khung layout cho trang public (Navbar + Footer)
│   │   ├── dashboard-layout.tsx   # Khung layout Dashboard (Sidebar, Auth guard)
│   │   └── auth-layout.tsx        # Khung layout Login/Auth
│   │
│   ├── pages/                     # Tệp view làm điểm kết nối (Home, About, Docs, Pricing...)
│   │   ├── home.tsx
│   │   ├── about.tsx
│   │   └── ...
│   │
│   ├── components/                # UI Components dùng chung (siteConfig, icons, confirm-modal...)
│   ├── config/                    # Config constants, siteConfig
│   ├── hooks/                     # Custom Hooks dùng chung
│   ├── lib/                       # SDK client và axios client instance
│   │   └── api-client.ts
│   ├── types/                     # TypeScript definitions toàn cục
│   │
│   └── features/                  # Feature Modules (Chứa logic và components riêng biệt)
│       ├── auth/                  # Feature Login/Logout (auth-store, auth.service)
│       ├── chat-session/          # Feature hội thoại (chat-sidebar, chat-thread, useChatStream)
│       └── agent-admin/           # Feature cấu hình & giám sát Agent dành cho Admin
```

#### Quy tắc thiết kế Frontend:
1. **Pages Directory mỏng**: Thư mục `src/pages/` chỉ chứa các Page component làm "điểm ghép nối" (view template). Logic nghiệp vụ thực tế, state, và các component nghiệp vụ phức tạp bắt buộc phải đưa vào `src/features/`.
2. **Feature Encapsulation**: Một components nằm trong `src/features/auth/` không được import trực tiếp components của `src/features/chat-session/`. Mọi sự chia sẻ components chung bắt buộc phải thông qua thư mục `src/components/`.

---

## 2. Hướng dẫn Setup & Kiến thức liên quan

Để tránh trùng lặp thông tin và duy trì một nguồn sự thật duy nhất (Single Source of Truth), các chi tiết cài đặt và cấu trúc bảo mật đã được di chuyển sang các tài liệu chuyên biệt:

*   **Thiết lập Frontend với HeroUI 3 & Tailwind v4**: Xem chi tiết tại [Developer Onboarding Guide](./guides/onboarding.md#62-frontend-ui-stack-setup-heroui-3--tailwind-v4).
*   **Cơ chế Xác thực Dual-Token JWT & Sequence Diagram**: Xem chi tiết tại [Security Architecture](./architecture/07-security.md#1-authentication-jwt-dual-token).
*   **Tự động khởi tạo tài khoản Admin (Admin Seeding)**: Xem chi tiết tại [Developer Onboarding Guide](./guides/onboarding.md#5-run-backend).

