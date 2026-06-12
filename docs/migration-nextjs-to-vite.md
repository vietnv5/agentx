# Kế hoạch chuyển đổi Frontend: Next.js → Vite SPA

> **Mục tiêu**: Hợp nhất toàn bộ code từ `apps/web` (Next.js 16) vào `apps/ui` (Vite 6), chuyển đổi ứng dụng sang kiến trúc Single Page Application (SPA) thuần client-side để tối ưu hiệu năng, loại bỏ SSR overhead và hydration mismatch.

---

## 1. Tổng quan hiện trạng

### 1.1 `apps/web` — Next.js 16 (Nguồn chính, sẽ bị loại bỏ)

| Thành phần | Chi tiết |
|---|---|
| **Framework** | Next.js 16 + App Router |
| **React** | 19.2.6 |
| **UI Library** | HeroUI 3.1.0 + Tailwind CSS 4.1.11 |
| **State Management** | Zustand (persist → localStorage) |
| **i18n** | `next-intl` 4.13 (server-side config + `NextIntlClientProvider`) |
| **HTTP Client** | Axios + interceptor (JWT refresh flow) |
| **Routing** | Next.js App Router — File-based (`src/app/`) |
| **Fonts** | `next/font/google` (Inter, Fira Code) |
| **Env vars** | `process.env.NEXT_PUBLIC_API_URL` (3 files, 4 lần sử dụng) |
| **Markdown** | `react-markdown` + `remark-gfm` |

### 1.2 `apps/ui` — Vite 6 (Đích đến, khung template sẵn có)

| Thành phần | Chi tiết |
|---|---|
| **Framework** | Vite 6.0.11 + `@vitejs/plugin-react` |
| **React** | 19.x |
| **UI Library** | HeroUI 3.1.0 + Tailwind CSS 4.1.11 |
| **Routing** | `react-router-dom` 6.23 → **Nâng lên `react-router` v7** (Library mode) |
| **Layout** | Template đơn giản (5 trang tĩnh: /, /docs, /pricing, /blog, /about) |
| **Plugins** | `vite-tsconfig-paths`, `@tailwindcss/vite` |

### 1.3 Bản đồ Route cần chuyển đổi

| Route hiện tại (Next.js) | Route mới (Vite SPA) | Nguồn Component |
|---|---|---|
| `/` | `/` | `app/page.tsx` → Home |
| `/login` | `/login` | `features/auth/components/login/login-view.tsx` |
| `/chat` | `/chat` | `features/chat-session/components/chat/chat-view.tsx` |
| `/admin` | `/admin` | `features/agent-admin/components/overview/overview-view.tsx` |
| `/admin/agents` | `/admin/agents` | `features/agent-admin/components/agents/agents-view.tsx` |
| `/admin/integrations` | `/admin/integrations` | `features/agent-admin/components/integrations/integrations-view.tsx` |
| `/admin/users` | `/admin/users` | `features/agent-admin/components/users/users-view.tsx` |
| `/admin/knowledge` | `/admin/knowledge` | `features/agent-admin/components/knowledge/knowledge-view.tsx` |
| `/admin/audit` | `/admin/audit` | `features/agent-admin/components/audit/audit-view.tsx` |
| `/about`, `/blog`, `/docs`, `/pricing` | ✅ Giữ nguyên | Trang tĩnh template (giữ lại theo yêu cầu) |

---

## 2. Phân tích các điểm phụ thuộc Next.js cần thay thế

### 2.1 Next.js-specific Imports (14 files bị ảnh hưởng)

| Import Next.js | Thay thế bằng | Files ảnh hưởng |
|---|---|---|
| `next/navigation` → `useRouter` | `react-router` → `useNavigate` | 5 files |
| `next/navigation` → `usePathname` | `react-router` → `useLocation` | 3 files |
| `next/navigation` → `useSearchParams` | `react-router` → `useSearchParams` | 2 files |
| `next/link` → `Link` | `react-router` → `Link` (prop `href` → `to`) | 3 files |
| `next/font/google` | CSS `@import` Google Fonts | 1 file (`config/fonts.ts`) |
| `next/server` | **Xoá** (middleware không cần thiết) | 1 file (`middleware.ts`) |
| `next-intl` → `useTranslations` | `react-i18next` → `useTranslation` | **35 files** |
| `next-intl` → `useLocale` | `react-i18next` → `i18n.language` | 2 files |
| `next-intl/server` → `getRequestConfig` | **Xoá** (Client-side init) | 1 file (`i18n/request.ts`) |
| `NextIntlClientProvider` | `I18nextProvider` | 1 file (`app/layout.tsx`) |
| `next-themes` → `ThemeProvider` | Giữ nguyên (tương thích Vite) | 1 file |

### 2.2 Environment Variables

| Hiện tại | Thay thế Vite |
|---|---|
| `process.env.NEXT_PUBLIC_API_URL` | `import.meta.env.VITE_API_URL` |

File `.env`:
```
VITE_API_URL=http://localhost:8000
```

### 2.3 "use client" Directives

Toàn bộ `"use client"` directive là khái niệm của Next.js RSC → **Xoá tất cả** vì Vite SPA 100% là client-side.

---

## 3. Kế hoạch triển khai chi tiết (5 Phase)

### Phase 0: Chuẩn bị & Backup (Ước lượng: ~30 phút)

- [ ] Tạo branch mới: `feat/migrate-vite-spa`
- [ ] Backup danh sách dependencies hiện tại
- [ ] Xác nhận cấu trúc thư mục đích (`apps/ui`)

---

### Phase 1: Hạ tầng cơ sở — Dependencies & Config (Ước lượng: ~1 giờ)

#### 1.1 Cập nhật `apps/ui/package.json`

**Thêm dependencies mới** (từ `apps/web` chưa có trong `apps/ui`):

```json
{
  "dependencies": {
    "@heroui/react": "3.1.0",
    "@heroui/styles": "3.1.0",
    "axios": "^1.7.7",
    "clsx": "2.1.1",
    "framer-motion": "^11.11.0",
    "i18next": "^24.0.0",
    "i18next-browser-languagedetector": "^8.0.0",
    "lucide-react": "^0.454.0",
    "next-themes": "0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "^15.0.0",
    "react-markdown": "^10.1.0",
    "react-router": "^7.0.0",
    "remark-gfm": "^4.0.1",
    "zustand": "^4.5.5"
  }
}
```

**Loại bỏ (KHÔNG thêm):** `next`, `next-intl`, `intl-messageformat`

#### 1.2 Cập nhật `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 3000,
    // Không dùng proxy — CORS + full URL qua apiClient dùng chung
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router"],
          ui: ["@heroui/react", "framer-motion"],
        },
      },
    },
  },
});
```

#### 1.3 Cập nhật `index.html`

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AgentX - Hệ thống quản lý và vận hành đa Agent thông minh" />
    <title>AgentX Platform</title>
    <!-- Google Fonts: Inter + Fira Code -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### 1.4 Cập nhật `globals.css`

```css
@import "tailwindcss";
@import "@heroui/styles";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: "Inter", sans-serif;
  --font-mono: "Fira Code", monospace;
}
```

#### 1.5 Tạo file `.env`

```env
VITE_API_URL=http://localhost:8000
```

---

### Phase 2: Hệ thống i18n — Thay thế `next-intl` bằng `react-i18next` (Ước lượng: ~2 giờ)

Đây là phần lớn nhất vì **35 component files** sử dụng `useTranslations` từ `next-intl`.

#### 2.1 Tạo cấu trúc i18n mới

```
apps/ui/src/
├── i18n/
│   ├── index.ts              # Khởi tạo i18next instance
│   ├── config.ts             # Locales config (giữ nguyên từ web)
│   └── loaders/
│       └── loadMessages.ts   # Dynamic import các JSON (giữ logic unflatten)
```

#### 2.2 File `i18n/index.ts` — Khởi tạo i18next

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { defaultLocale, locales } from "./config";

// Import trực tiếp JSON files (Vite tự động resolve JSON)
import commonVi from "./common/vi.json";
import commonEn from "./common/en.json";
import authVi from "../features/auth/i18n/vi.json";
import authEn from "../features/auth/i18n/en.json";
import adminVi from "../features/agent-admin/i18n/vi.json";
import adminEn from "../features/agent-admin/i18n/en.json";
import chatVi from "../features/chat-session/i18n/vi.json";
import chatEn from "../features/chat-session/i18n/en.json";

// Unflatten function (giữ nguyên từ web)
function unflatten(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const parts = key.split(".");
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = data[key];
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      }
    }
  }
  return result;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: unflatten({ ...commonVi, ...authVi, ...adminVi, ...chatVi }) },
      en: { translation: unflatten({ ...commonEn, ...authEn, ...adminEn, ...chatEn }) },
    },
    fallbackLng: defaultLocale,
    supportedLngs: [...locales],
    interpolation: { escapeValue: false },
    detection: {
      order: ["cookie", "navigator"],
      caches: ["cookie"],
      cookieName: "NEXT_LOCALE", // Giữ backward-compat với cookie cũ
    },
  });

export default i18n;
```

#### 2.3 Quy tắc thay thế trong Component

| `next-intl` (cũ) | `react-i18next` (mới) |
|---|---|
| `import { useTranslations } from "next-intl"` | `import { useTranslation } from "react-i18next"` |
| `const t = useTranslations()` | `const { t } = useTranslation()` |
| `t("key")` | `t("key")` *(không đổi)* |
| `t.rich("key", { br: () => <br/> })` | Sử dụng `<Trans>` component hoặc `t("key", { returnObjects: true })` |
| `import { useLocale } from "next-intl"` | `import { useTranslation } from "react-i18next"` → `i18n.language` |

> **Lưu ý đặc biệt**: Hàm `t.rich()` được sử dụng trong `app/page.tsx` (Home) cần được chuyển sang `<Trans>` component từ `react-i18next`.

#### 2.4 Copy toàn bộ file dịch JSON

```
apps/web/src/i18n/common/vi.json          → apps/ui/src/i18n/common/vi.json
apps/web/src/i18n/common/en.json          → apps/ui/src/i18n/common/en.json
apps/web/src/features/auth/i18n/          → apps/ui/src/features/auth/i18n/
apps/web/src/features/agent-admin/i18n/   → apps/ui/src/features/agent-admin/i18n/
apps/web/src/features/chat-session/i18n/  → apps/ui/src/features/chat-session/i18n/
```

---

### Phase 3: Routing & Layouts — Thay thế App Router bằng React Router (Ước lượng: ~2 giờ)

#### 3.1 Cấu trúc Routing mới (`App.tsx`)

```tsx
import { Route, Routes, Navigate } from "react-router";
import { lazy, Suspense } from "react";

// Layouts
import DashboardLayout from "@/layouts/dashboard-layout";
import AuthLayout from "@/layouts/auth-layout";

// Lazy-loaded pages (code splitting)
const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/features/auth/components/login/login-view"));
const ChatPage = lazy(() => import("@/features/chat-session/components/chat/chat-view"));
const AdminOverview = lazy(() => import("@/features/agent-admin/components/overview/overview-view"));
const AgentsPage = lazy(() => import("@/features/agent-admin/components/agents/agents-view"));
const IntegrationsPage = lazy(() => import("@/features/agent-admin/components/integrations/integrations-view"));
const UsersPage = lazy(() => import("@/features/agent-admin/components/users/users-view"));
const KnowledgePage = lazy(() => import("@/features/agent-admin/components/knowledge/knowledge-view"));
const AuditPage = lazy(() => import("@/features/agent-admin/components/audit/audit-view"));

const LoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Dashboard (Protected) */}
        <Route element={<DashboardLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/agents" element={<AgentsPage />} />
          <Route path="/admin/integrations" element={<IntegrationsPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/knowledge" element={<KnowledgePage />} />
          <Route path="/admin/audit" element={<AuditPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
```

#### 3.2 Dashboard Layout (chuyển từ `app/(dashboard)/layout.tsx`)

- Chuyển toàn bộ logic auth guard, sidebar, chat state từ file `(dashboard)/layout.tsx`
- Thay `useRouter().push()` → `useNavigate()`
- Thay `usePathname()` → `useLocation().pathname`
- Sử dụng `<Outlet />` thay vì `{children}`

#### 3.3 Provider Stack mới (`main.tsx`)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";

import App from "./App";
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

---

### Phase 4: Di chuyển toàn bộ Feature Code (Ước lượng: ~3-4 giờ)

#### 4.1 Danh sách file cần copy & chỉnh sửa

##### A. Core Infrastructure

| Từ `apps/web/src/` | Sang `apps/ui/src/` | Cần chỉnh sửa |
|---|---|---|
| `lib/api-client.ts` | `lib/api-client.ts` | `NEXT_PUBLIC_API_URL` → `VITE_API_URL` |
| `config/site.ts` | `config/site.ts` | Xoá `Link` refs nếu có |
| `config/fonts.ts` | **Xoá** | Thay bằng CSS `@import` trong `globals.css` |
| `types/` | `types/` | Copy nguyên |

##### B. Shared Components (8 files)

| File | Chỉnh sửa cần thiết |
|---|---|
| `components/navbar.tsx` | `next/link` → `react-router/Link`, `useTranslations` → `useTranslation` |
| `components/layout-wrapper.tsx` | `usePathname` → `useLocation`, `useTranslations` → `useTranslation` |
| `components/language-switch.tsx` | `useLocale` → `i18n.language`, `useRouter` → custom logic `i18n.changeLanguage()` |
| `components/theme-switch.tsx` | Giữ nguyên (dùng `next-themes` tương thích) |
| `components/confirm-modal.tsx` | `useTranslations` → `useTranslation` |
| `components/icons.tsx` | Giữ nguyên |
| `components/primitives.ts` | Giữ nguyên |
| `components/counter.tsx` | Giữ nguyên |

##### C. Feature: Auth (4 files)

| File | Chỉnh sửa |
|---|---|
| `features/auth/auth-store.ts` | Giữ nguyên (Zustand, không dùng Next.js API) |
| `features/auth/services/auth.service.ts` | Giữ nguyên |
| `features/auth/components/login/login-view.tsx` | `useRouter` → `useNavigate`, `useTranslations` → `useTranslation` |
| `features/auth/i18n/*.json` | Copy nguyên |

##### D. Feature: Chat Session (9 files)

| File | Chỉnh sửa |
|---|---|
| `features/chat-session/hooks/useChatStore.ts` | Giữ nguyên |
| `features/chat-session/hooks/useChatStream.ts` | `NEXT_PUBLIC_API_URL` → `VITE_API_URL`, `useTranslations` → `useTranslation` |
| `features/chat-session/services/chat.service.ts` | Giữ nguyên |
| `features/chat-session/components/chat/*.tsx` (7 files) | `useRouter/usePathname/useSearchParams` → react-router, `useTranslations` → `useTranslation`, `next/link` → `react-router/Link` |
| `features/chat-session/i18n/*.json` | Copy nguyên |

##### E. Feature: Agent Admin (~20+ files)

| Nhóm | Files | Chỉnh sửa |
|---|---|---|
| Services | `services/admin.service.ts` | Giữ nguyên |
| Overview | `components/overview/*.tsx` (4 files) | `useTranslations` → `useTranslation` |
| Agents | `components/agents/*.tsx` (3 files) | `useTranslations` → `useTranslation` |
| Integrations | `components/integrations/*.tsx` + `mcp/*.tsx` | `useRouter/useSearchParams` → react-router, `useTranslations` → `useTranslation` |
| Users | `components/users/*.tsx` (4 files) | `useTranslations` → `useTranslation` |
| Knowledge | `components/knowledge/*.tsx` (4 files) | `useTranslations` → `useTranslation` |
| Audit | `components/audit/*.tsx` (3 files) | `useTranslations` → `useTranslation` |
| i18n | `i18n/*.json` | Copy nguyên |

#### 4.2 Quy tắc chuyển đổi cơ học (Search & Replace)

Phần lớn thay đổi có thể tự động hóa bằng các pattern sau:

```
1. "use client";                                     → XOÁ (toàn bộ file)
2. import { useTranslations } from "next-intl"       → import { useTranslation } from "react-i18next"
3. const t = useTranslations()                       → const { t } = useTranslation()
4. import { useRouter } from "next/navigation"       → import { useNavigate } from "react-router"
5. const router = useRouter()                        → const navigate = useNavigate()
6. router.push("/path")                              → navigate("/path")
7. import { usePathname } from "next/navigation"     → import { useLocation } from "react-router"
8. const pathname = usePathname()                    → const { pathname } = useLocation()
9. import { useSearchParams } from "next/navigation" → import { useSearchParams } from "react-router"
10. import Link from "next/link"                     → import { Link } from "react-router"
11. <Link href="/path">                              → <Link to="/path">
12. process.env.NEXT_PUBLIC_API_URL                  → import.meta.env.VITE_API_URL
```

---

### Phase 5: Dọn dẹp & Kiểm tra (Ước lượng: ~1-2 giờ)

#### 5.1 Dọn dẹp files trong `apps/ui`

- Xoá `pages/index.tsx` cũ (thay bằng `pages/home.tsx` mới từ `web`)
- Cập nhật `pages/about.tsx`, `pages/blog.tsx`, `pages/docs.tsx`, `pages/pricing.tsx` — **giữ lại** nhưng đồng bộ style
- Xoá layout cũ: `layouts/default.tsx` (thay bằng `layouts/dashboard-layout.tsx`)

#### 5.2 Giữ nguyên `apps/web` làm backup

- **KHÔNG xoá** thư mục `apps/web/`
- Giữ lại để làm reference cho code cũ khi cần so sánh
- Trong `pnpm-workspace.yaml` có thể comment out hoặc giữ nguyên

#### 5.3 Cập nhật tài liệu

- Cập nhật `docs/project-structure.md`: Thay mục `1.2 Frontend (Next.js 15 + App Router)` → `1.2 Frontend (Vite 6 + React Router 7)`
- Cập nhật `docs/guides/onboarding.md` nếu có hướng dẫn setup frontend
- Cập nhật `.agent/skills/` rules nếu cần (frontend-style-rules về i18n)

#### 5.4 Kiểm tra & Verification

| Hạng mục | Cách kiểm tra |
|---|---|
| Build thành công | `pnpm --filter ui build` — Không có lỗi TS/compile |
| Dev server chạy | `pnpm --filter ui dev` — HMR hoạt động |
| Routing SPA | Click tất cả các link, kiểm tra URL thay đổi mà không reload trang |
| Auth flow | Login → Redirect → Dashboard → Logout → Redirect Login |
| Auth guard | Truy cập `/chat`, `/admin` khi chưa login → Redirect `/login` |
| i18n | Chuyển ngôn ngữ Vi ↔ En, kiểm tra tất cả các trang |
| Theme | Chuyển Light ↔ Dark mode |
| Chat streaming | Gửi tin nhắn, nhận SSE response realtime |
| Admin CRUD | Agents/Integrations/Users — Create, Read, Update, Delete |
| API interceptor | Token refresh tự động khi 401 |
| Code splitting | Kiểm tra Network tab — lazy load chunks khi navigate |
| SPA fallback | Deploy static → Refresh bất kỳ route → App load đúng |

---

## 4. Ước lượng thời gian tổng thể

| Phase | Nội dung | Thời gian |
|---|---|---|
| Phase 0 | Chuẩn bị & Backup | ~30 phút |
| Phase 1 | Hạ tầng: Dependencies, Config, Fonts | ~1 giờ |
| Phase 2 | i18n: Thay thế `next-intl` → `react-i18next` | ~2 giờ |
| Phase 3 | Routing & Layouts: App Router → React Router | ~2 giờ |
| Phase 4 | Di chuyển Feature Code (Auth, Chat, Admin) | ~3-4 giờ |
| Phase 5 | Dọn dẹp, Test & Cập nhật docs | ~1-2 giờ |
| **Tổng** | | **~9-11 giờ** |

---

## 5. Rủi ro & Giải pháp

| Rủi ro | Xác suất | Giải pháp |
|---|---|---|
| `t.rich()` từ `next-intl` không có tương đương trực tiếp | Trung bình | Sử dụng `<Trans>` component từ `react-i18next` hoặc custom render |
| `next-themes` không tương thích Vite | Thấp | `next-themes` hoạt động hoàn toàn client-side, đã verified với Vite |
| React version mismatch | Thấp | Cả 2 đều dùng React 19, align version trong package.json |
| SPA fallback trên production server | Trung bình | Cấu hình Nginx `try_files $uri /index.html` hoặc Vite preview `--host` |
| `framer-motion` animation bị ảnh hưởng | Thấp | Thư viện thuần client, không phụ thuộc SSR |

---

## 6. Quyết định kiến trúc — ĐÃ XÁC NHẬN ✅

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Giữ `apps/web` sau khi migrate? | ✅ **Giữ lại** làm backup/reference, không xoá |
| 2 | Đổi tên `apps/ui`? | ✅ **Giữ nguyên tên `apps/ui`** |
| 3 | Trang static (about, blog, docs, pricing)? | ✅ **Giữ lại** |
| 4 | Proxy API trong dev? | ✅ **CORS + full URL** qua `apiClient` dùng chung (không dùng Vite proxy) |
| 5 | React Router version? | ✅ **Nâng lên v7** — import từ `react-router` thay vì `react-router-dom` |

> [!NOTE]
> React Router v7 ở **Library mode** (không dùng Framework mode/SSR). Thay đổi chính:
> - Package: `react-router-dom` → `react-router` (unified package)
> - Import: `import { ... } from "react-router"` thay vì `"react-router-dom"`
> - API hooks (`useNavigate`, `useLocation`, `useSearchParams`, `Link`, `Outlet`, `Routes`, `Route`, `BrowserRouter`) giữ nguyên tên — chỉ đổi package source
