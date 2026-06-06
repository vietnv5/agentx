# Environment Variables Reference

> Tổng hợp tất cả biến môi trường cần thiết cho AgentX — reference duy nhất cho cả development và production.

---

## 1. Backend Environment Variables (`apps/api/.env`)

### Server

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `PORT` | No | `8000` | Port chạy backend |
| `NODE_ENV` | No | `development` | Môi trường: `development`, `production`, `test` |

### Database (PostgreSQL)

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `DATABASE_HOST` | **Yes** | — | Host PostgreSQL |
| `DATABASE_PORT` | No | `5432` | Port PostgreSQL |
| `DATABASE_USER` | **Yes** | — | Username |
| `DATABASE_PASSWORD` | **Yes** | — | Password |
| `DATABASE_NAME` | **Yes** | — | Database name |

### Redis

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `REDIS_HOST` | **Yes** | — | Host Redis |
| `REDIS_PORT` | No | `6379` | Port Redis |
| `REDIS_PASSWORD` | No | — | Password Redis (bắt buộc cho production) |

### JWT Authentication

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `JWT_ACCESS_SECRET` | **Yes** | — | Secret key cho Access Token (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret key cho Refresh Token (min 32 chars) |

> ⚠️ **Production**: Sử dụng random string dài ≥ 64 chars. KHÔNG dùng giá trị mặc định.

### Encryption

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `ENCRYPTION_KEY` | **Yes** | — | Key mã hóa AES-256 cho user credentials (min 32 chars) |

### Admin Seed Account

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `ADMIN_DEFAULT_EMAIL` | No | `admin@agentx.local` | Email tài khoản admin mặc định |
| `ADMIN_DEFAULT_PASSWORD` | No | `Admin@123456` | Password admin mặc định |

> ⚠️ **Production**: Đổi password ngay sau lần đăng nhập đầu tiên.

### LLM Configuration (Tiers)

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `LLM_SMART_PROVIDER` | **Yes** | `anthropic` | Provider cho tier Smart |
| `LLM_SMART_MODEL` | **Yes** | — | Model ID cho tier Smart |
| `LLM_FAST_PROVIDER` | No | `openai` | Provider cho tier Fast |
| `LLM_FAST_MODEL` | No | — | Model ID cho tier Fast |
| `LLM_VISION_PROVIDER` | No | `google` | Provider cho tier Vision |
| `LLM_VISION_MODEL` | No | — | Model ID cho tier Vision |

**Các giá trị phổ biến:**

| Tier | Provider | Model ID |
|------|----------|----------|
| Smart | `anthropic` | `claude-sonnet-4-20250514` |
| Smart | `openai` | `gpt-4o` |
| Fast | `anthropic` | `claude-haiku-4-20250414` |
| Fast | `openai` | `gpt-4o-mini` |
| Vision | `google` | `gemini-2.5-pro` |

### LLM Provider API Keys

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `ANTHROPIC_API_KEY` | Conditional | — | API key Anthropic Claude |
| `OPENAI_API_KEY` | Conditional | — | API key OpenAI |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Conditional | — | API key Google Gemini |
| `DEEPSEEK_API_KEY` | Conditional | — | API key DeepSeek |

> **Conditional**: Cần ít nhất API key của provider được chọn cho `LLM_SMART_PROVIDER`.

### CORS

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |

### Observability

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | — | OpenTelemetry collector endpoint |

---

## 2. Frontend Environment Variables (`apps/web/.env`)

| Variable | Required | Default | Mô tả |
|----------|:--------:|---------|-------|
| `NEXT_PUBLIC_API_URL` | **Yes** | — | URL backend API |

> **Lưu ý**: Biến `NEXT_PUBLIC_*` sẽ được exposed ra browser. KHÔNG đặt secrets ở đây.

---

## 3. `.env.example` Files

### `apps/api/.env.example`

```env
# ─── Server ───────────────────────────────
PORT=8000
NODE_ENV=development

# ─── Database ─────────────────────────────
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=agentx_user
DATABASE_PASSWORD=agentx_secure_password
DATABASE_NAME=agentx_db

# ─── Redis ────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=           # Uncomment for production

# ─── JWT Secrets ──────────────────────────
JWT_ACCESS_SECRET=dev_access_secret_change_this_in_production_min_32_chars
JWT_REFRESH_SECRET=dev_refresh_secret_change_this_in_production_min_32_chars

# ─── Encryption (AES-256) ────────────────
ENCRYPTION_KEY=dev_encryption_key_32_chars_long!

# ─── Admin Seed ───────────────────────────
ADMIN_DEFAULT_EMAIL=admin@agentx.local
ADMIN_DEFAULT_PASSWORD=Admin@123456

# ─── LLM Tier Configuration ──────────────
LLM_SMART_PROVIDER=anthropic
LLM_SMART_MODEL=claude-sonnet-4-20250514
LLM_FAST_PROVIDER=anthropic
LLM_FAST_MODEL=claude-haiku-4-20250414
# LLM_VISION_PROVIDER=google
# LLM_VISION_MODEL=gemini-2.5-pro

# ─── LLM API Keys ────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
DEEPSEEK_API_KEY=

# ─── CORS ─────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ─── Observability (Optional) ────────────
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### `apps/web/.env.example`

```env
# ─── API Connection ──────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 4. Production Environment Checklist

Trước khi deploy production, đảm bảo:

- [ ] `JWT_ACCESS_SECRET` là random string ≥ 64 chars
- [ ] `JWT_REFRESH_SECRET` là random string ≥ 64 chars (khác với access secret)
- [ ] `ENCRYPTION_KEY` là random string ≥ 32 chars
- [ ] `ADMIN_DEFAULT_PASSWORD` đã được đổi sau lần login đầu
- [ ] `REDIS_PASSWORD` đã được set
- [ ] `DATABASE_PASSWORD` là strong password
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` chỉ chứa domain production
- [ ] Tất cả API keys là production keys (không dùng test keys)
- [ ] `.env` files KHÔNG được commit vào Git

### Generate Random Secrets

```bash
# Generate 64-char random string
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Hoặc dùng openssl
openssl rand -base64 48
```

---

*Last updated: 2026-06-06*
