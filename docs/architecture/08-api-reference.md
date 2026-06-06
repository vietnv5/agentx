# API Reference

> **Mục tiêu**: Tài liệu tham chiếu API đầy đủ cho AgentX — phục vụ Frontend và Backend phát triển song song. Bao gồm Authentication API, Chat API, Admin API, Approval API, và WebSocket/SSE events.

---

## 1. API Conventions

### Base URL

```
Development: http://localhost:8000/api
Production:  https://agentx.company.com/api
```

### Authentication

Tất cả API (trừ `/api/auth/login` và `/api/health`) yêu cầu Access Token:

```
Authorization: Bearer <access_token>
```

### Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

**Error:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

### Pagination

Sử dụng offset-based pagination cho lists:

```
GET /api/admin/users?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | number | 1 | Trang hiện tại |
| `pageSize` | number | 20 | Số items/trang (max: 100) |
| `sortBy` | string | `createdAt` | Cột sắp xếp |
| `sortOrder` | `asc` \| `desc` | `desc` | Thứ tự sắp xếp |

### Error Codes

| HTTP Code | Error Code | Mô tả |
|-----------|-----------|-------|
| 400 | `VALIDATION_ERROR` | Input không hợp lệ |
| 401 | `UNAUTHORIZED` | Access token missing hoặc expired |
| 401 | `AUTH_REQUIRED` | User cần xác thực với hệ thống bên ngoài (MCP) |
| 403 | `FORBIDDEN` | Không có quyền truy cập resource |
| 404 | `NOT_FOUND` | Resource không tồn tại |
| 409 | `CONFLICT` | Trùng lặp (duplicate name, email) |
| 429 | `RATE_LIMITED` | Vượt giới hạn request |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống |

---

## 2. Authentication API

### 2.1 Login

```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "admin@agentx.local",
  "password": "Admin@123456"
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@agentx.local",
      "name": "System Administrator",
      "role": "ADMIN"
    }
  }
}
```

**Side effect:** Set `refreshToken` as HTTP-Only cookie.

**Errors:** 401 — Invalid credentials.

---

### 2.2 Refresh Token

```
POST /api/auth/refresh
```

**Request:** No body. Refresh token auto-sent via HTTP-Only cookie.

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@agentx.local",
      "name": "System Administrator",
      "role": "ADMIN"
    }
  }
}
```

**Errors:** 401 — Refresh token expired or revoked.

---

### 2.3 Logout

```
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "data": { "message": "Logged out successfully" }
}
```

**Side effect:** Revoke refresh token in DB, clear cookie.

---

## 3. Chat API

### 3.1 Send Message (Streaming)

```
POST /api/chat
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "conversationId": "uuid-or-null",
  "message": "Tôi còn bao nhiêu ngày phép?"
}
```

**Response:** Server-Sent Events (SSE) stream.

```
Content-Type: text/event-stream

data: {"type":"text","content":"Để "}
data: {"type":"text","content":"tôi "}
data: {"type":"text","content":"kiểm tra..."}
data: {"type":"tool_call","name":"erp.get_leave_balance","args":{"employeeId":"123"},"status":"running"}
data: {"type":"tool_result","name":"erp.get_leave_balance","result":{"remaining":7},"status":"success","durationMs":245}
data: {"type":"text","content":"Bạn còn **7 ngày phép** năm."}
data: {"type":"done","conversationId":"uuid","messageId":"uuid"}
```

**SSE Event Types:**

| Type | Payload | Mô tả |
|------|---------|-------|
| `text` | `{ content: string }` | Token text stream |
| `tool_call` | `{ name, args, status }` | Agent bắt đầu gọi tool |
| `tool_result` | `{ name, result, status, durationMs }` | Kết quả tool execution |
| `approval_required` | `{ approvalId, toolName, args, description }` | Cần user phê duyệt |
| `auth_required` | `{ integrationId, integrationName, authType, oauthUrl? }` | Cần xác thực MCP |
| `error` | `{ code, message }` | Lỗi trong quá trình xử lý |
| `done` | `{ conversationId, messageId }` | Stream hoàn tất |

---

### 3.2 Conversations

```
GET    /api/conversations                   → List conversations
POST   /api/conversations                   → Create conversation
GET    /api/conversations/:id               → Get conversation detail
PATCH  /api/conversations/:id               → Update (rename)
DELETE /api/conversations/:id               → Delete conversation
GET    /api/conversations/:id/messages      → Get messages
```

#### List Conversations

```
GET /api/conversations?page=1&pageSize=20
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Hỏi về nghỉ phép",
      "updatedAt": "2026-06-06T10:30:00Z",
      "messageCount": 8
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 15 }
}
```

#### Get Messages (Cursor-based)

```
GET /api/conversations/:id/messages?cursor=message-uuid&limit=50
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Tôi còn bao nhiêu ngày phép?",
      "createdAt": "2026-06-06T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Bạn còn **7 ngày phép** năm.",
      "routedAgentId": "agent-hr-uuid",
      "toolCalls": [
        {
          "toolName": "erp.get_leave_balance",
          "status": "success",
          "durationMs": 245
        }
      ],
      "createdAt": "2026-06-06T10:00:05Z"
    }
  ],
  "meta": { "nextCursor": "uuid-or-null", "hasMore": false }
}
```

---

## 4. Admin API

> Tất cả Admin API yêu cầu role `ADMIN`.

### 4.1 Agents

```
GET    /api/admin/agents                     → List agents
POST   /api/admin/agents                     → Create agent
GET    /api/admin/agents/:id                 → Get agent
PATCH  /api/admin/agents/:id                 → Update agent
DELETE /api/admin/agents/:id                 → Delete agent (soft)
```

#### Create Agent

```
POST /api/admin/agents
```

**Request:**
```json
{
  "name": "HR Assistant",
  "systemInstructions": "Bạn là trợ lý nhân sự...",
  "tier": "smart",
  "isRouter": false,
  "maxSteps": 10,
  "allowedTools": ["erp.get_leave_balance", "erp.submit_leave"],
  "routingKeywords": ["nghỉ phép", "lương", "nhân sự"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "HR Assistant",
    "isActive": true,
    "createdAt": "2026-06-06T12:00:00Z"
  }
}
```

---

### 4.2 Integrations

```
GET    /api/admin/integrations               → List integrations
POST   /api/admin/integrations               → Register integration
GET    /api/admin/integrations/:id           → Get integration
PATCH  /api/admin/integrations/:id           → Update integration
DELETE /api/admin/integrations/:id           → Remove integration
POST   /api/admin/integrations/test          → Test connection
GET    /api/admin/integrations/:id/tools     → List discovered tools
POST   /api/admin/integrations/:id/refresh   → Re-discover tools
```

#### Register Integration

```
POST /api/admin/integrations
```

**Request (SSE transport):**
```json
{
  "name": "Odoo ERP",
  "transport": "sse",
  "endpoint": "https://erp.internal/mcp/sse",
  "headers": {
    "Authorization": "Bearer ERP_TOKEN"
  },
  "authConfig": {
    "type": "oauth2",
    "oauthAuthorizationUrl": "https://erp.internal/oauth/authorize",
    "oauthTokenUrl": "https://erp.internal/oauth/token",
    "oauthScopes": ["read:hr", "write:leaves"]
  }
}
```

**Request (stdio transport):**
```json
{
  "name": "PostgreSQL Direct",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost:5432/db"]
}
```

#### Test Connection

```
POST /api/admin/integrations/test
```

**Request:**
```json
{
  "transport": "sse",
  "endpoint": "https://erp.internal/mcp/sse",
  "headers": { "Authorization": "Bearer TOKEN" }
}
```

**Response (200):**
```json
{
  "data": {
    "success": true,
    "latencyMs": 120,
    "discoveredTools": [
      {
        "name": "erp.get_leave_balance",
        "description": "Lấy số ngày phép còn lại",
        "inputSchema": {
          "type": "object",
          "properties": {
            "employeeId": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

---

### 4.3 Users & Roles

```
GET    /api/admin/users                      → List users
POST   /api/admin/users                      → Create user
PATCH  /api/admin/users/:id                  → Update user
DELETE /api/admin/users/:id                  → Delete user (soft)
GET    /api/admin/roles                      → List roles
POST   /api/admin/roles/:id/permissions      → Set tool permissions
GET    /api/admin/roles/:id/permissions      → Get role permissions
```

#### Create User

```
POST /api/admin/users
```

**Request:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123!",
  "name": "Nguyễn Văn A",
  "roleId": "role-staff-uuid"
}
```

---

### 4.4 Knowledge Base

```
POST   /api/admin/knowledge                  → Upload document (multipart)
GET    /api/admin/knowledge                  → List documents
DELETE /api/admin/knowledge/:id              → Delete document
POST   /api/admin/knowledge/:id/reindex      → Re-index document
```

---

### 4.5 Audit Logs

```
GET /api/admin/audit/tool-executions?page=1&agentId=uuid&status=error&from=2026-06-01&to=2026-06-06
GET /api/admin/audit/llm-usage?groupBy=agent&from=2026-06-01&to=2026-06-06
```

#### LLM Usage Summary

**Response (200):**
```json
{
  "data": {
    "totalCostUsd": 45.23,
    "totalTokens": 1250000,
    "breakdown": [
      {
        "agentId": "uuid",
        "agentName": "HR Assistant",
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "totalCostUsd": 25.10,
        "promptTokens": 500000,
        "completionTokens": 200000,
        "requestCount": 1500
      }
    ]
  }
}
```

---

## 5. Approval API

```
POST /api/approvals/:id/action
```

**Request:**
```json
{
  "action": "approve"
}
```

hoặc

```json
{
  "action": "reject"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "approval-uuid",
    "status": "approved",
    "decidedAt": "2026-06-06T10:05:00Z"
  }
}
```

---

## 6. User Credential API (MCP Auth)

```
POST /api/auth/save-token
```

Lưu token cá nhân của user cho một integration cụ thể:

**Request:**
```json
{
  "integrationId": "integration-uuid",
  "token": "user_personal_access_token_or_oauth_code"
}
```

**Response (200):**
```json
{
  "data": { "message": "Token saved successfully" }
}
```

---

## 7. Health Check

```
GET /api/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-06-06T15:00:00Z",
  "uptime": 86400,
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

---

*Last updated: 2026-06-06*
*Version: 0.1.0 — Initial API Reference*
