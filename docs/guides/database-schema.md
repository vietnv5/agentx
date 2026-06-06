# Database Schema Guide

> Tài liệu chi tiết schema database phục vụ quá trình implement Drizzle ORM — bao gồm naming conventions, migration workflow, seed scripts, và common query patterns.

---

## 1. Schema Overview

AgentX sử dụng **PostgreSQL 16** + **pgvector** extension, ORM bằng **Drizzle ORM**.

### Danh sách bảng

| Bảng | Mô tả | Feature Module |
|------|-------|---------------|
| `roles` | Vai trò người dùng (ADMIN, STAFF) | `users` |
| `users` | Tài khoản người dùng | `users` |
| `refresh_tokens` | Refresh tokens cho JWT auth | `auth` |
| `agents` | Cấu hình agents (Router + Specialist) | `agents` |
| `agent_skills` | Skills gán cho agent | `agents` |
| `integrations` | MCP Server connections | `integrations` |
| `tool_definitions` | Tool schemas từ MCP servers | `integrations` |
| `agent_tool_bindings` | Agent ↔ Tool mapping | `agents` |
| `tool_permissions` | Role ↔ Tool permissions | `users` |
| `conversations` | Chat conversations | `conversations` |
| `messages` | Chat messages | `conversations` |
| `tool_executions` | Tool execution audit logs | `conversations` |
| `approval_requests` | Human-in-the-loop approvals | `integrations` |
| `user_credentials` | Encrypted user tokens cho MCP auth | `integrations` |
| `llm_usage_logs` | LLM token & cost tracking | `llm` |
| `knowledge_documents` | RAG knowledge base documents | `knowledge` |
| `knowledge_chunks` | Embedded text chunks | `knowledge` |

> **Schema đầy đủ** với Drizzle ORM code: xem [06-infrastructure.md](../architecture/06-infrastructure.md#1-database-schema-full-drizzle-orm)

---

## 2. Naming Conventions

| Item | Convention | Ví dụ |
|------|-----------|-------|
| **Table names** | snake_case, plural | `users`, `tool_definitions` |
| **Column names** | snake_case | `created_at`, `is_active`, `role_id` |
| **Primary keys** | `id` (UUID) | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **Foreign keys** | `{referenced_table_singular}_id` | `user_id`, `agent_id`, `integration_id` |
| **Timestamps** | `created_at`, `updated_at` | Luôn dùng `TIMESTAMP` |
| **Boolean columns** | `is_` prefix | `is_active`, `is_router`, `is_archived` |
| **JSONB columns** | Tên mô tả rõ nội dung | `config`, `metadata`, `auth_config`, `headers` |
| **Enums** | snake_case | `role_type`, `transport_type`, `approval_status` |
| **Indexes** | `idx_{table}_{columns}` | `idx_users_email`, `idx_messages_conversation` |
| **Unique indexes** | `idx_{table}_{columns}_unique` | `idx_tool_defs_name_unique` |

---

## 3. Migration Workflow

### 3.1 Commands

```bash
cd apps/api

# Tạo migration file từ schema changes
pnpm drizzle-kit generate

# Apply tất cả pending migrations
pnpm drizzle-kit migrate

# Push schema trực tiếp (CHỈ dùng cho dev nhanh, KHÔNG dùng cho prod)
pnpm drizzle-kit push

# Xem trạng thái migrations
pnpm drizzle-kit status

# Tạo file SQL migration tùy chỉnh (cho pgvector extension, etc.)
# → Tạo thủ công trong src/database/migrations/
```

### 3.2 Quy trình thêm bảng mới

1. **Định nghĩa schema** trong `src/database/schema.ts`
2. **Export schema** — đảm bảo tất cả tables được export
3. **Generate migration**: `pnpm drizzle-kit generate`
4. **Review migration file** trong `src/database/migrations/`
5. **Apply migration**: `pnpm drizzle-kit migrate`
6. **Commit** cả schema + migration file

### 3.3 pgvector Extension

pgvector cần enable trước khi chạy migration lần đầu:

```typescript
// src/database/seeds/extensions.ts
export async function enableExtensions(db: NodePgDatabase) {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
}
```

---

## 4. Seed Scripts

### 4.1 Admin Seeding (Đã có)

Xem chi tiết tại [project-structure.md](../project-structure.md) — tự động tạo roles (ADMIN, STAFF) và admin user khi bootstrap.

### 4.2 Development Seed Data

```typescript
// src/database/seeds/dev-seeding.ts
export async function seedDevData(db: NodePgDatabase<typeof schema>) {
  // 1. Tạo staff user
  const staffRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'STAFF'),
  });
  await db.insert(schema.users).values({
    email: 'staff@agentx.local',
    password: await bcrypt.hash('Staff@123456', 10),
    name: 'Staff User',
    roleId: staffRole!.id,
  }).onConflictDoNothing();

  // 2. Tạo General Agent
  await db.insert(schema.agents).values({
    name: 'General Assistant',
    systemInstructions: 'Bạn là trợ lý AI thông minh, thân thiện.',
    tier: 'smart',
    isRouter: false,
    maxSteps: 10,
    config: { routingKeywords: [] },
  }).onConflictDoNothing();

  // 3. Tạo Router Agent
  const generalAgent = await db.query.agents.findFirst({
    where: eq(schema.agents.name, 'General Assistant'),
  });
  await db.insert(schema.agents).values({
    name: 'Router Agent',
    systemInstructions: 'Bạn phân tích ý định người dùng và chuyển tới agent phù hợp.',
    tier: 'fast',
    isRouter: true,
    maxSteps: 3,
    config: {
      subagentIds: [generalAgent?.id],
      routingStrategy: 'hybrid',
      fallbackResponse: 'Tôi chưa được cấu hình để xử lý yêu cầu này.',
    },
  }).onConflictDoNothing();
}
```

---

## 5. Common Query Patterns (Drizzle ORM)

### 5.1 Find by ID

```typescript
const agent = await db.query.agents.findFirst({
  where: eq(schema.agents.id, agentId),
});
```

### 5.2 Find with Relations

```typescript
const user = await db.query.users.findFirst({
  where: eq(schema.users.id, userId),
  with: {
    role: true,
  },
});
```

### 5.3 Insert

```typescript
const [newAgent] = await db.insert(schema.agents)
  .values({
    name: dto.name,
    systemInstructions: dto.systemInstructions,
    tier: dto.tier,
    isRouter: dto.isRouter,
    maxSteps: dto.maxSteps,
    config: { routingKeywords: dto.routingKeywords },
  })
  .returning();
```

### 5.4 Update

```typescript
const [updated] = await db.update(schema.agents)
  .set({
    name: dto.name,
    updatedAt: new Date(),
  })
  .where(eq(schema.agents.id, agentId))
  .returning();
```

### 5.5 Soft Delete

```typescript
await db.update(schema.users)
  .set({ isActive: false, updatedAt: new Date() })
  .where(eq(schema.users.id, userId));
```

### 5.6 Pagination

```typescript
async function findPaginated(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    db.query.agents.findMany({
      limit: pageSize,
      offset: offset,
      orderBy: [desc(schema.agents.createdAt)],
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(schema.agents),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total: Number(countResult[0].count),
    },
  };
}
```

### 5.7 Join Query

```typescript
// Lấy messages kèm tool executions
const messagesWithTools = await db
  .select({
    message: schema.messages,
    toolExecution: schema.toolExecutions,
  })
  .from(schema.messages)
  .leftJoin(
    schema.toolExecutions,
    eq(schema.messages.id, schema.toolExecutions.messageId),
  )
  .where(eq(schema.messages.conversationId, conversationId))
  .orderBy(asc(schema.messages.createdAt));
```

### 5.8 Transaction

```typescript
await db.transaction(async (tx) => {
  // Delete agent's tool bindings first
  await tx.delete(schema.agentToolBindings)
    .where(eq(schema.agentToolBindings.agentId, agentId));

  // Then delete the agent
  await tx.delete(schema.agents)
    .where(eq(schema.agents.id, agentId));
});
```

---

## 6. Relations (Drizzle ORM)

```typescript
// src/database/schema.ts (relations section)
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  conversations: many(conversations),
  refreshTokens: many(refreshTokens),
  credentials: many(userCredentials),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  skills: many(agentSkills),
  toolBindings: many(agentToolBindings),
  messages: many(messages),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  routedAgent: one(agents, { fields: [messages.routedAgentId], references: [agents.id] }),
  toolExecutions: many(toolExecutions),
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  toolDefinitions: many(toolDefinitions),
  userCredentials: many(userCredentials),
}));

export const toolDefinitionsRelations = relations(toolDefinitions, ({ one }) => ({
  integration: one(integrations, { fields: [toolDefinitions.integrationId], references: [integrations.id] }),
}));
```

---

*Last updated: 2026-06-06*
