# Testing Strategy

> Chiến lược testing cho dự án AgentX — bao gồm test pyramid, setup cho Backend (Jest/NestJS) và Frontend (Vitest), mock patterns cho LLM và MCP, và CI integration.

---

## 1. Test Pyramid

```
          ┌─────────┐
          │  E2E    │  ← Ít nhất, chạy chậm nhất
          │  Tests  │     Playwright/Cypress
         ─┴─────────┴─
        ┌───────────────┐
        │ Integration   │  ← Trung bình
        │   Tests       │     Test API endpoints, DB queries
       ─┴───────────────┴─
      ┌─────────────────────┐
      │    Unit Tests       │  ← Nhiều nhất, chạy nhanh nhất
      │                     │     Test services, utils, hooks
      └─────────────────────┘
```

| Level | Scope | Tools | Coverage Target |
|-------|-------|-------|----------------|
| **Unit** | Services, utils, hooks, components | Jest (BE), Vitest (FE) | ≥ 80% |
| **Integration** | API endpoints, DB queries | Jest + Supertest (BE) | ≥ 60% |
| **E2E** | Full user flows | Playwright | Critical paths |

---

## 2. Backend Testing (NestJS + Jest)

### 2.1 Setup

```bash
# Jest đã được cài sẵn với NestJS
cd apps/api
pnpm test            # Run all tests
pnpm test:watch      # Watch mode
pnpm test:cov        # Coverage report
```

### 2.2 Unit Test — Service

```typescript
// src/features/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@test.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STAFF',
        isActive: true,
      });

      const result = await service.login('test@test.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@test.com',
        password: await bcrypt.hash('correct-password', 10),
        isActive: true,
      });

      await expect(service.login('test@test.com', 'wrong-password'))
        .rejects.toThrow('Mật khẩu không chính xác.');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@test.com',
        password: await bcrypt.hash('password', 10),
        isActive: false,
      });

      await expect(service.login('test@test.com', 'password'))
        .rejects.toThrow('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
    });
  });
});
```

### 2.3 Unit Test — LLM Service (Mock Provider)

```typescript
// src/features/llm/llm.service.spec.ts
describe('LlmService', () => {
  let service: LlmService;
  let factory: jest.Mocked<LlmProviderFactory>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: LlmProviderFactory,
          useValue: {
            buildProviderModel: jest.fn().mockResolvedValue({
              model: { /* mock LanguageModel */ },
              providerName: 'anthropic',
              modelId: 'claude-sonnet-4-20250514',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                'LLM_SMART_PROVIDER': 'anthropic',
                'LLM_SMART_MODEL': 'claude-sonnet-4-20250514',
                'LLM_FAST_PROVIDER': 'openai',
                'LLM_FAST_MODEL': 'gpt-4o-mini',
              };
              return env[key];
            }),
          },
        },
        { provide: TokenMeteringService, useValue: { recordUsage: jest.fn() } },
        { provide: CostCalculatorService, useValue: { compute: jest.fn() } },
      ],
    }).compile();

    service = module.get(LlmService);
    factory = module.get(LlmProviderFactory);
  });

  it('should resolve default tier model', async () => {
    const binding = await service.resolveModel('smart');

    expect(factory.buildProviderModel).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4-20250514');
    expect(binding.providerName).toBe('anthropic');
  });

  it('should use agent override when provided', async () => {
    const binding = await service.resolveModel('smart', {
      agentType: 'HR Agent',
      definition: { llmProvider: 'openai', llmModel: 'gpt-4o' },
    });

    expect(factory.buildProviderModel).toHaveBeenCalledWith('openai', 'gpt-4o');
  });
});
```

### 2.4 Integration Test — Controller

```typescript
// src/features/agents/agents.controller.spec.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('AdminAgentsController (Integration)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    // Setup test module with real DB (test database)
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Login as admin to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@agentx.local', password: 'Admin@123456' });
    adminToken = loginRes.body.data.accessToken;
  });

  it('POST /api/admin/agents → should create agent', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Agent',
        systemInstructions: 'You are a test agent.',
        tier: 'smart',
        isRouter: false,
        maxSteps: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Agent');
  });

  it('GET /api/admin/agents → should require ADMIN role', async () => {
    // Login as STAFF user
    const staffRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'staff@test.com', password: 'password123' });
    const staffToken = staffRes.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/admin/agents')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 3. Frontend Testing (Vitest + React Testing Library)

### 3.1 Setup

```bash
cd apps/web
pnpm test            # Run all tests
pnpm test:watch      # Watch mode
pnpm test:cov        # Coverage
```

### 3.2 Component Test

```typescript
// src/features/chat-session/components/MessageBubble.test.tsx
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('should render user message', () => {
    render(
      <MessageBubble
        message={{ role: 'user', content: 'Hello', id: '1', createdAt: new Date() }}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should render markdown in assistant message', () => {
    render(
      <MessageBubble
        message={{
          role: 'assistant',
          content: 'You have **7 days** remaining.',
          id: '2',
          createdAt: new Date(),
        }}
      />
    );

    expect(screen.getByText('7 days')).toHaveStyle('font-weight: bold');
  });
});
```

### 3.3 Hook Test

```typescript
// src/features/auth/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth-store';

describe('useAuthStore', () => {
  it('should set auth state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('test-token', { id: '1', email: 'test@test.com', role: 'STAFF' });
    });

    expect(result.current.accessToken).toBe('test-token');
    expect(result.current.user?.email).toBe('test@test.com');
  });

  it('should clear auth state on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('token', { id: '1', email: 'a@b.com', role: 'STAFF' });
      result.current.clearAuth();
    });

    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
```

---

## 4. MCP Integration Testing

### 4.1 Mock MCP Server

Tạo mock MCP server cho integration tests:

```typescript
// test/mocks/mock-mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export function createMockMcpServer() {
  const server = new Server(
    { name: 'mock-erp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'erp.get_leave_balance',
        description: 'Get leave balance',
        inputSchema: {
          type: 'object',
          properties: { employeeId: { type: 'string' } },
          required: ['employeeId'],
        },
      },
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'erp.get_leave_balance') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ remaining: 7, used: 5, total: 12 }) }],
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}
```

---

## 5. CI Integration (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: agentx_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test:cov
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: test_user
          DATABASE_PASSWORD: test_password
          DATABASE_NAME: agentx_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_ACCESS_SECRET: test_access_secret
          JWT_REFRESH_SECRET: test_refresh_secret

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web test:cov

  build:
    runs-on: ubuntu-latest
    needs: [lint, test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

---

*Last updated: 2026-06-06*
