# Contributing Guide

> Quy trình đóng góp code cho dự án AgentX — bao gồm Git workflow, commit conventions, code review process, và quy tắc tạo feature module.

---

## 1. Git Workflow

### 1.1 Branch Naming

```
main                          ← Production-ready code
├── feature/auth-login        ← Tính năng mới
├── feature/chat-streaming    ← Tính năng mới
├── fix/token-refresh-loop    ← Sửa bug
├── chore/update-deps         ← Cập nhật dependencies, config
├── docs/api-reference        ← Tài liệu
└── refactor/llm-service      ← Tái cấu trúc code
```

**Convention:**
```
<type>/<short-description>
```

| Type | Mục đích |
|------|---------|
| `feature/` | Tính năng mới |
| `fix/` | Sửa bug |
| `chore/` | Maintenance, config, deps |
| `docs/` | Tài liệu |
| `refactor/` | Tái cấu trúc, không thay đổi behavior |

### 1.2 Flow

```mermaid
gitgraph
    commit id: "main"
    branch feature/auth-login
    checkout feature/auth-login
    commit id: "feat: add login form"
    commit id: "feat: add jwt auth guard"
    commit id: "test: add auth service tests"
    checkout main
    merge feature/auth-login id: "PR #1 merged"
    branch feature/chat-ui
    commit id: "feat: chat window component"
    checkout main
    merge feature/chat-ui id: "PR #2 merged"
```

1. Tạo branch từ `main`
2. Develop & commit
3. Push branch → Tạo Pull Request
4. Code review → Approve
5. Squash merge vào `main`

---

## 2. Commit Convention (Conventional Commits)

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Mô tả | Ví dụ |
|------|-------|-------|
| `feat` | Tính năng mới | `feat(auth): add JWT login endpoint` |
| `fix` | Sửa bug | `fix(chat): resolve streaming disconnect` |
| `docs` | Tài liệu | `docs(api): add chat API reference` |
| `style` | Format code (không thay đổi logic) | `style(web): fix linting errors` |
| `refactor` | Tái cấu trúc code | `refactor(llm): extract provider factory` |
| `test` | Thêm/sửa tests | `test(auth): add login service unit tests` |
| `chore` | Build, deps, config | `chore(deps): upgrade heroui to 3.1` |
| `perf` | Tối ưu performance | `perf(db): add index on messages table` |

### Scope (tùy chọn)

| Scope | Package |
|-------|---------|
| `api` | `apps/api` — Backend |
| `web` | `apps/web` — Frontend |
| `auth` | Auth feature module |
| `chat` | Chat feature module |
| `agents` | Agents feature module |
| `integrations` | Integrations feature module |
| `llm` | LLM Core module |
| `db` | Database/migrations |
| `docs` | Documentation |

### Ví dụ

```
feat(api): implement agent CRUD endpoints

- Add CreateAgentDto with class-validator
- Add AgentsController with CRUD operations
- Add AgentsService with Drizzle queries
- Add JwtAuthGuard + RolesGuard('ADMIN')

Closes #42
```

---

## 3. Pull Request Process

### 3.1 PR Template

```markdown
## Summary
<!-- Mô tả ngắn gọn thay đổi -->

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Chore

## Changes
<!-- Liệt kê các thay đổi chính -->
- 

## Screenshots (nếu có UI changes)
<!-- Paste screenshots -->

## Testing
<!-- Mô tả cách test -->
- [ ] Unit tests pass
- [ ] Manual testing done

## Checklist
- [ ] Code follows project conventions
- [ ] Self-reviewed
- [ ] No console.log/debugger left
- [ ] DTO validation added for new endpoints
- [ ] Feature isolation rules respected
```

### 3.2 Review Checklist

Reviewer cần kiểm tra:

- [ ] Code clean, đọc hiểu được
- [ ] Không có logic trong Controller (logic nằm trong Service)
- [ ] DTO validation đầy đủ cho input
- [ ] Feature isolation: không import trực tiếp giữa features
- [ ] Error handling phù hợp
- [ ] Không có hardcoded values (dùng env/config)
- [ ] Sensitive data không bị log
- [ ] Tests cover các cases chính

### 3.3 Merge Strategy

- **Squash merge** cho feature/fix branches → giữ history sạch
- Tiêu đề merge commit theo Conventional Commits format

---

## 4. Code Style

### 4.1 ESLint

```bash
# Chạy lint
pnpm lint

# Auto-fix
pnpm lint --fix
```

### 4.2 Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 4.3 Naming Conventions

| Item | Convention | Ví dụ |
|------|-----------|-------|
| **File names** (BE) | kebab-case | `auth.service.ts`, `create-agent.dto.ts` |
| **File names** (FE) | PascalCase cho components | `ChatWindow.tsx`, `MessageBubble.tsx` |
| **Classes** | PascalCase | `AgentsService`, `JwtAuthGuard` |
| **Interfaces/Types** | PascalCase, no prefix | `AgentDefinition`, `ChatMessage` |
| **Functions** | camelCase | `findById`, `processMessage` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_TURNS`, `DEFAULT_BUDGET` |
| **DB tables** | snake_case, plural | `users`, `tool_definitions` |
| **DB columns** | snake_case | `created_at`, `is_active` |
| **Env variables** | UPPER_SNAKE_CASE | `DATABASE_HOST`, `JWT_ACCESS_SECRET` |
| **API routes** | kebab-case | `/api/admin/agents`, `/api/auth/save-token` |

---

## 5. Feature Module Pattern

### 5.1 Backend (NestJS Module)

Khi tạo tính năng mới, tạo thư mục tương ứng trong `apps/api/src/features/`:

```
features/new-feature/
├── dto/
│   ├── create-new-feature.dto.ts
│   └── update-new-feature.dto.ts
├── new-feature.schema.ts          # Drizzle schema (nếu cần bảng mới)
├── new-feature.controller.ts
├── new-feature.service.ts
└── new-feature.module.ts
```

**Module template:**

```typescript
// new-feature.module.ts
import { Module } from '@nestjs/common';
import { NewFeatureController } from './new-feature.controller';
import { NewFeatureService } from './new-feature.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService],       // Export nếu module khác cần dùng
})
export class NewFeatureModule {}
```

### 5.2 Frontend (Feature Folder)

```
features/new-feature/
├── components/
│   ├── NewFeatureList.tsx
│   └── NewFeatureForm.tsx
├── hooks/
│   └── useNewFeature.ts
├── i18n/
│   ├── vi.json
│   └── en.json
├── services/
│   └── new-feature-api.ts
└── types/
    └── new-feature-types.ts
```

### 5.3 Import Rules

```
✅ OK:
features/auth/auth.service.ts → import from '../../common/guards/'
features/auth/auth.service.ts → import from '../../database/'
features/agents/agents.module.ts → imports: [AuthModule]  (module-level)

❌ KHÔNG ĐƯỢC:
features/agents/agents.service.ts → import from '../auth/auth.service'  (direct internal import)
features/chat-session/components/ → import from '../agent-admin/components/'
```

**Quy tắc**: Features không import trực tiếp file nội bộ của feature khác. Nếu cần chia sẻ:
- **Backend**: Import Module → inject Service qua DI
- **Frontend**: Đưa component/hook ra `src/components/` hoặc `src/hooks/`

### 5.4 Quy tắc Đa ngôn ngữ (i18n)

Để hỗ trợ đa ngôn ngữ cho các features mới, hãy tuân thủ các quy tắc sau:

1. **Quản lý bản dịch độc lập (Feature Isolation)**:
   Mỗi feature module tự quản lý các tệp tin dịch của riêng mình trong thư mục `i18n/`:
   ```
   features/new-feature/i18n/
   ├── vi.json
   └── en.json
   ```
2. **Định dạng khóa phẳng (Flat Keys)**:
   Các tệp tin JSON phải sử dụng các key ở định dạng phẳng sử dụng ký tự chấm (dot-notation), ví dụ:
   ```json
   {
     "newFeature.title": "Tính năng mới",
     "newFeature.button.create": "Tạo mới"
   }
   ```
   *Lưu ý: Không khai báo cấu trúc lồng nhau (nested objects) trực tiếp trong các tệp JSON i18n. Trình tải dịch của hệ thống sẽ tự động unflatten các key phẳng thành dạng lồng nhau ở runtime.*

3. **Đăng ký Feature**:
   Sau khi tạo thư mục `i18n/` và các tệp tin dịch tương ứng, bắt buộc phải đăng ký tên feature trong mảng `FEATURES` tại tệp tin [getMessages.ts](file:///d:/GitHub/AI%20agent/agentx/apps/web/src/i18n/loaders/getMessages.ts) để trình tải i18n tự động phát hiện và merge bản dịch:
   ```typescript
   const FEATURES = ["auth", "agent-admin", "chat-session", "new-feature"];
   ```

4. **Sử dụng i18n trong Code**:
   - Sử dụng hook `useTranslations` từ thư viện `next-intl` để lấy chuỗi dịch.
   - Các từ khóa dùng chung cho toàn bộ dự án (ví dụ: tên ứng dụng, nút "Lưu", nút "Hủy", thông báo lỗi kết nối...) phải được đặt tại thư mục dùng chung [apps/web/src/i18n/common/](file:///d:/GitHub/AI%20agent/agentx/apps/web/src/i18n/common/) thay vì lặp lại ở các feature.

---


## 6. Database Changes

Khi cần thay đổi schema:

1. Sửa file `src/database/schema.ts`
2. Generate migration:
   ```bash
   cd apps/api
   pnpm drizzle-kit generate
   ```
3. Review file migration trong `src/database/migrations/`
4. Apply migration:
   ```bash
   pnpm drizzle-kit migrate
   ```
5. Commit cả schema + migration file

---

*Last updated: 2026-06-06*
