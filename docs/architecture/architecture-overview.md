# AgentX — System Architecture Overview

> **Mục tiêu**: Xây dựng một AI Agent platform đa năng (system-agnostic), có khả năng tích hợp linh hoạt với bất kỳ hệ thống nào (ERP, CRM, HRM, Databases, File systems, APIs,...) thông qua giao diện **chat đơn giản**. Người dùng cuối chỉ cần nhắn tin — agent sẽ tự động hiểu intent, định tuyến tới đúng sub-agent, kết nối tới các MCP Server do ứng dụng tự cung cấp và trả kết quả. Toàn bộ cấu hình agent (instructions, skills, subagents, integrations) được quản lý động bởi **Admin**.

---

## Table of Contents

- [1. High-Level Architecture](#1-high-level-architecture)
- [2. Layer Overview](#2-layer-overview)
  - [Layer 0 — Admin Control Panel](#layer-0--admin-control-panel)
  - [Layer 1 — User Interface (Chat)](#layer-1--user-interface-chat)
  - [Layer 2 — Orchestration Engine](#layer-2--orchestration-engine)
  - [Layer 3 — Memory & Context](#layer-3--memory--context)
  - [Layer 4 — LLM Core](#layer-4--llm-core)
  - [Layer 5 — Integration Layer](#layer-5--integration-layer)
  - [Layer 6 — Infrastructure](#layer-6--infrastructure)
- [3. Data Flow](#3-data-flow)
- [4. Tech Stack](#4-tech-stack)
- [5. Deployment Architecture](#5-deployment-architecture)
- [6. Detailed Documentation](#6-detailed-documentation)

---

## 1. High-Level Architecture

<!-- Kiến trúc tổng thể: Admin cấu hình agent/skill/integration → User chỉ cần chat -->

```mermaid
graph TB
    subgraph L0["Layer 0 — Admin Control Panel"]
        AC["Agent Config<br/>(Instructions, Persona)"]
        SR["Skill & Subagent Registry"]
        IM["Integration Manager<br/>(MCP Connection Configs)"]
        UM["User & Role<br/>Management"]
    end

    subgraph L1["Layer 1 — User Interface (Chat Only)"]
        CHAT["Chat UI<br/>(Web / Embedded)"]
        WS["WebSocket / SSE<br/>Streaming"]
    end

    subgraph L2["Layer 2 — Orchestration Engine"]
        RA["Router Agent<br/>(Intent → Subagent)"]
        SA["Subagent Pool<br/>(HR / Finance / Custom / ...)"]
        AL["Agent Loop<br/>(ReAct per Subagent)"]
        PB["Prompt Builder<br/>(Instructions + Context)"]
    end

    subgraph L3["Layer 3 — Memory & Context"]
        STM["Short-Term<br/>(Conversation Buffer)"]
        LTM["Long-Term<br/>(RAG + Vector DB)"]
        CM["Context Manager<br/>(Token Budget)"]
    end

    subgraph L4["Layer 4 — LLM Core"]
        LLM_S["LlmService (Tier Router)"]
        LLM_F["LlmProviderFactory (Server Env)"]
        PROVIDERS["Claude / OpenAI / Google / DeepSeek"]
    end

    subgraph L5["Layer 5 — Integration Layer (MCP Client)"]
        MC["MCP Client Pool<br/>(Dynamic Connections)"]
        AV["Action Validator<br/>(Permission Check)"]
        TR["Tool Registry<br/>(Dynamic, from Admin Config)"]
    end

    subgraph L6["Layer 6 — Infrastructure"]
        PG["PostgreSQL<br/>(Chat, Config, Audit Log)"]
        VDB["Vector DB<br/>(pgvector)"]
        REDIS["Redis<br/>(Session, Cache)"]
        AUTH["Auth & RBAC"]
        OBS["Observability"]
    end

    subgraph EXT["External Systems / Hosted MCP Servers"]
        MCP_ERP["ERP / CRM MCP Server<br/>(Odoo, Salesforce, etc.)"]
        MCP_COMM["Communication MCP Server<br/>(Slack, Email, etc.)"]
        MCP_OTHER["Other MCP Servers<br/>(DB, Custom APIs, Bridges)"]
    end

    L0 -- "Config applied at runtime" --> L2
    L0 -- "Register integrations" --> L5
    L1 --> L2
    L2 --> L3
    L2 --> L4
    L4 --> AL
    AL --> L5
    MC --> EXT
    L2 --> L6
    L3 --> L6
    L5 --> L6

    style L0 fill:#1a2e1a,stroke:#2ecc71,color:#fff
    style L1 fill:#1a1a2e,stroke:#00d4ff,color:#fff
    style L2 fill:#16213e,stroke:#ff6b6b,color:#fff
    style L3 fill:#0f3460,stroke:#e94560,color:#fff
    style L4 fill:#1a1a40,stroke:#ffd700,color:#fff
    style L5 fill:#2c2c54,stroke:#33d9b2,color:#fff
    style L6 fill:#1e1e3f,stroke:#a29bfe,color:#fff
    style EXT fill:#3a1e1e,stroke:#fd79a8,color:#fff
```

---

## 2. Layer Overview

---

### Layer 0 — Admin Control Panel

<!-- Nơi Admin cấu hình toàn bộ hệ thống — người dùng cuối không thấy layer này -->

> **Đây là layer quan trọng nhất về mặt vận hành.** Admin (System Admin hoặc IT Manager) quản lý toàn bộ hành vi của các agent mà không cần thay đổi code.

| Component | Description |
|-----------|-------------|
| **Agent Configuration** | Định nghĩa các agent: system instructions, persona, tone, phạm vi nhiệm vụ, model LLM sử dụng |
| **Skill & Subagent Registry** | Tạo và quản lý các subagent domain-specific (HR Agent, Finance Agent, CRM Agent...), gán skill cho từng agent |
| **Integration Manager** | Đăng ký MCP Servers (nếu hệ thống hỗ trợ MCP) hoặc cấu hình API Adapters (URL, auth, mapping) cho hệ thống không hỗ trợ MCP |
| **Routing Rules** | Định nghĩa quy tắc định tuyến intent → subagent (keyword-based hoặc LLM-classified) |
| **User & Role Management** | Phân quyền người dùng: user nào được chat với agent nào, được thực thi action nào |
| **Audit & Monitoring** | Xem lịch sử action đã thực thi, chi phí LLM, các lỗi integration |

**Admin Configuration Model:**
```
Agent Definition
├── name: "HR Assistant"
├── instructions: "Bạn là trợ lý nhân sự của Twendee..."
├── llm_model: "claude-sonnet-4"
├── allowed_tools: ["erp_leave_request", "erp_payslip", "hrm_org_chart"]
├── subagents: []  # leaf agent, không có subagent
└── routing_keywords: ["nghỉ phép", "lương", "phòng ban", "nhân sự"]

Agent Definition
├── name: "Router Agent"
├── instructions: "Phân tích intent và chuyển tới đúng agent chuyên môn"
├── subagents: ["HR Assistant", "Finance Agent", "CRM Agent", "IT Helpdesk"]
└── fallback_response: "Tôi chưa được cấu hình để xử lý yêu cầu này."
```

> 📄 **Detail**: [00-admin-control-panel.md](./00-admin-control-panel.md) *(to be created)*

---

### Layer 1 — User Interface (Chat)

<!-- Giao diện duy nhất cho người dùng cuối: chỉ cần chat, không cần cấu hình gì -->

> **User không cần biết gì về agent, tool, hay integration.** Họ chỉ nhắn tin bằng ngôn ngữ tự nhiên.

| Component | Description | Technology |
|-----------|-------------|------------|
| **Chat UI** | Giao diện chat đơn giản — hỗ trợ streaming response, hiển thị trạng thái tool đang chạy, lịch sử hội thoại | Next.js + Vercel AI SDK |
| **Embedded Widget** | Nhúng được vào hệ thống nội bộ (ERP, Portal) dưới dạng iframe hoặc web component | Web Component / iframe |
| **WebSocket / SSE** | Stream token từng phần từ server → UI, hiển thị typing indicator | SSE (Server-Sent Events) |

**UX Principles cho End User:**
- Không có button "chọn agent" — routing tự động hoàn toàn
- Hiển thị subtle indicator khi agent đang gọi hệ thống ngoài (vd: `🔄 Đang tra cứu phiếu lương...`)
- Kết quả trả về dạng Markdown có cấu trúc (bảng, danh sách)
- Lịch sử chat được giữ lại theo session hoặc user

> 📄 **Detail**: [01-user-interface.md](./01-user-interface.md) *(to be created)*

---

### Layer 2 — Orchestration Engine

<!-- Trái tim của hệ thống: nhận message → phân tích intent → chọn subagent → chạy agent loop -->

> **Multi-agent architecture**: Một Router Agent đứng đầu, phân tích intent và điều phối tới các Subagent chuyên biệt theo domain nghiệp vụ.

#### 2.1 Router Agent

```mermaid
flowchart TD
    MSG["User Message"] --> ROUTER["🧭 Router Agent<br/>(Intent Classification)"]

    ROUTER -->|"nghỉ phép, lương, nhân sự"| HR["👤 HR Agent<br/>(ERP HR Module)"]
    ROUTER -->|"báo cáo, chi phí, kế toán"| FIN["💰 Finance Agent<br/>(ERP Finance Module)"]
    ROUTER -->|"khách hàng, cơ hội, deal"| CRM["🤝 CRM Agent<br/>(CRM System)"]
    ROUTER -->|"ticket, sự cố, hỗ trợ"| IT["🖥️ IT Helpdesk Agent<br/>(Ticketing System)"]
    ROUTER -->|"không rõ domain"| FALLBACK["❓ Fallback<br/>(Ask for clarification)"]

    HR --> LOOP["Agent Loop<br/>(ReAct)"]
    FIN --> LOOP
    CRM --> LOOP
    IT --> LOOP

    style ROUTER fill:#2d3436,stroke:#fdcb6e,color:#fff
    style HR fill:#1e3a5f,stroke:#74b9ff,color:#fff
    style FIN fill:#1e5f3a,stroke:#55efc4,color:#fff
    style CRM fill:#5f1e3a,stroke:#fd79a8,color:#fff
    style IT fill:#3a1e5f,stroke:#a29bfe,color:#fff
    style LOOP fill:#2d3436,stroke:#ff6b6b,color:#fff
```

#### 2.2 Agent Loop (ReAct per Subagent)

Mỗi Subagent chạy vòng lặp ReAct độc lập:

```mermaid
flowchart LR
    INPUT["Intent + Context"] --> THINK["🧠 Think<br/>Lập kế hoạch"]
    THINK --> DECIDE{Cần gọi tool?}
    DECIDE -- Yes --> ACT["⚡ Act<br/>Gọi ERP/CRM API"]
    ACT --> OBSERVE["👁️ Observe<br/>Đọc kết quả"]
    OBSERVE --> THINK
    DECIDE -- No --> RESPOND["💬 Respond<br/>Stream về Chat UI"]

    style THINK fill:#2d3436,stroke:#fdcb6e,color:#fff
    style ACT fill:#2d3436,stroke:#6c5ce7,color:#fff
    style OBSERVE fill:#2d3436,stroke:#00b894,color:#fff
    style RESPOND fill:#2d3436,stroke:#0984e3,color:#fff
```

#### 2.3 Prompt Builder

Mỗi lần gọi LLM, Prompt Builder ghép:
```
[System Instructions từ Admin Config]
+ [Subagent Persona & Scope]
+ [Available Tools (từ Tool Registry)]
+ [User Role & Permissions]
+ [Conversation History (trong token budget)]
+ [RAG Context nếu có]
+ [User Message hiện tại]
```

> 📄 **Detail**: [02-orchestration-engine.md](./02-orchestration-engine.md)

---

### Layer 3 — Memory & Context

<!-- Bộ nhớ của agent: ngắn hạn (hội thoại), dài hạn (kiến thức), kiểm soát token -->

| Memory Type | Mục đích | Storage |
|-------------|---------|---------|
| **Short-Term** | Buffer hội thoại hiện tại của user — tối đa N turns gần nhất | Redis (in-memory) |
| **Long-Term** | Knowledge base doanh nghiệp: tài liệu quy trình, FAQ, chính sách | Vector DB (pgvector) |
| **Context Manager** | Kiểm soát token budget — quyết định giữ lại / tóm tắt / loại bỏ gì trước khi gửi LLM | Computed |

**Lưu ý**: Không cần "Project Knowledge Base" phức tạp như Claude Projects. Knowledge base là toàn cục theo domain, do Admin upload và index sẵn.

> 📄 **Detail**: [03-memory-context.md](./03-memory-context.md) *(to be created)*

---

### Layer 4 — LLM Core

<!-- Kết nối LLM: routing model, streaming, fallback -->

> **Dynamic LLM Engine**: Hỗ trợ phân giải Model động theo Tiers (`fast`, `smart`, `vision`) dựa trên cấu hình Platform-level và hỗ trợ ghi đè linh hoạt cho từng Agent.

| Component | Description |
|-----------|-------------|
| **LlmService** | Phân giải Model theo Tier được yêu cầu hoặc cấu hình ghi đè của Agent. Quản lý luồng gọi LLM (generate/stream), đo lường token và tính toán chi phí thực tế. |
| **LlmProviderFactory** | Khởi tạo đối tượng `LanguageModel` của Vercel AI SDK bằng cách đọc trực tiếp API Key / Base URL tương ứng từ biến môi trường (env). |
| **Multi-Provider Engine** | Tích hợp sâu với các nhà cung cấp OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama... |
| **Metering & Cost Tracker** | Ghi nhận token tiêu thụ thời gian thực và tự động đóng băng (freeze) chi phí phát sinh theo USD dựa trên bảng giá tại thời điểm gọi. |

> 📄 **Detail**: [04-llm-core.md](./04-llm-core.md)

---

### Layer 5 — Integration Layer (MCP Client)

<!-- Tầng tích hợp: AgentX đóng vai trò MCP Client kết nối tới các MCP Server tự cung cấp -->

> **Đây là layer đặc trưng nhất của AgentX**. AgentX không tự xây dựng các kết nối API riêng lẻ tới từng hệ thống. Thay vào đó, AgentX đóng vai trò là một **MCP Client** thuần túy. Mọi hệ thống cần tích hợp (ERP, CRM, Database, Messaging, v.v.) phải tự cung cấp/hosting các **MCP Server** tương ứng. AgentX chỉ tiếp nhận cấu hình kết nối (tương tự như cách cấu hình của Claude Desktop hoặc các Code IDE) để tự động nạp các công cụ (tools) vào hệ thống tại thời điểm chạy.

```mermaid
flowchart TB
    AGENT["Agent Loop"] --> TR["Tool Registry<br/>(Dynamic Tool List từ Admin Config)"]
    TR --> AV["Action Validator<br/>(kiểm tra quyền user)"]
    AV --> MC["🔌 MCP Client Pool<br/>(Quản lý các kết nối động)"]

    subgraph EXT["External Hosted MCP Servers (Các hệ thống tự cung cấp)"]
        MCP_ERP["ERP MCP Server<br/>(Odoo, SAP, etc.)"]
        MCP_CRM["CRM MCP Server<br/>(Salesforce, Hubspot, etc.)"]
        MCP_DB["Database MCP Server<br/>(PostgreSQL, MySQL, etc.)"]
        MCP_BRIDGE["External API Bridge<br/>(Chuyển đổi REST/SOAP cũ sang MCP)"]
    end

    MC -->|SSE / WebSockets| MCP_ERP
    MC -->|SSE / WebSockets| MCP_CRM
    MC -->|stdio / local cmd| MCP_DB
    MC -->|SSE / WebSockets| MCP_BRIDGE

    style TR fill:#2d3436,stroke:#33d9b2,color:#fff
    style AV fill:#2d3436,stroke:#ff7675,color:#fff
    style MC fill:#1e3a5f,stroke:#74b9ff,color:#fff
    style EXT fill:#3a1e1e,stroke:#fd79a8,color:#fff
```

#### 5.1 Cấu hình MCP Server (Dynamic MCP Config)

Admin có thể đăng ký cấu hình bất kỳ MCP Server nào vào hệ thống dưới dạng JSON (tương tự định dạng của Claude Desktop config hoặc các IDE như Cursor/VS Code). Hệ thống hỗ trợ cả phương thức kết nối qua dòng lệnh (`stdio` - chạy script nội bộ) và kết nối qua mạng (`sse` / `http` - kết nối từ xa).

**Cấu hình mẫu lưu trong Admin Panel:**
```json
{
  "mcpServers": {
    "erp-system": {
      "type": "sse",
      "url": "https://erp.internal/mcp/sse",
      "headers": {
        "Authorization": "Bearer ERP_API_SECRET_TOKEN"
      },
      "allowed_agents": ["HR Agent", "Finance Agent"]
    },
    "postgres-db": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:pass@localhost:5432/db"
      ],
      "allowed_agents": ["Database Administrator Agent"]
    },
    "slack-communication": {
      "type": "sse",
      "url": "http://slack-mcp-service:3000/sse",
      "allowed_agents": ["IT Helpdesk Agent", "General Assistant"]
    }
  }
}
```

#### 5.2 External API-to-MCP Bridge (Cho hệ thống legacy không hỗ trợ MCP)

Đối với các hệ thống cũ (legacy) chỉ cung cấp REST API hoặc SOAP và không có kế hoạch hỗ trợ MCP native:
1. Đơn vị phát triển ứng dụng hoặc bên thứ ba sẽ tự xây dựng và chạy độc lập một **MCP API Bridge** (chạy bên ngoài AgentX).
2. Bridge này đóng vai trò làm MCP Server: nhận yêu cầu từ AgentX thông qua giao thức MCP (JSON-RPC), chuyển đổi thành REST API/SOAP tương ứng để giao tiếp với hệ thống cũ, sau đó trả về định dạng MCP chuẩn.
3. AgentX chỉ đơn giản cấu hình kết nối tới Bridge này như một MCP Server thông thường.

#### 5.3 Action Validator

> **Mọi action đều phải qua validation trước khi thực thi** — đây là cơ chế bảo vệ quan trọng nhất của AgentX để đảm bảo tính an toàn hệ thống khi chạy các công cụ từ bất kỳ MCP Server nào.

```
Validation Pipeline:
1. Authentication  → User đã đăng nhập chưa?
2. Authorization   → User có quyền dùng tool này không? (RBAC từ Admin config)
3. Rate Limiting   → User có vượt giới hạn gọi API không?
4. Input Sanitize  → Params có hợp lệ theo schema không?
5. Approval Gate   → Tool này có cần human-approval trước khi chạy không?
                     (VD: xóa dữ liệu, gửi email hàng loạt)
```

#### 5.4 Xử lý File nhị phân & Tải lên (Binary & File Uploads)

Do giao thức MCP truyền tải JSON-RPC dạng văn bản thuần túy, AgentX áp dụng hai cơ chế để xử lý file nhị phân lớn (như tải file hóa đơn lên ERP):
*   **Pass-by-Reference (Truyền tham chiếu)**: Lưu file trên Storage nội bộ của AgentX và truyền link tải tạm thời vào tool call của MCP Server để server bên ngoài tự download và gửi lên ERP.
*   **Pre-signed URL (Client-Side Upload)**: Gọi tool của MCP Server để nhận Pre-signed Upload URL, sau đó Chat UI sẽ tự upload file từ trình duyệt trực tiếp lên ERP.

> 📄 **Detail**: [05-integration-layer.md](./05-integration-layer.md)

---

### Layer 6 — Infrastructure

<!-- Nền tảng lưu trữ, vận hành: DB, cache, storage, auth, monitoring -->

| Component | Purpose | Technology |
|-----------|---------|------------|
| **PostgreSQL** | Chat history, agent/skill config, user data, audit log mọi action | PostgreSQL 16+ |
| **Vector DB** | Lưu embeddings cho RAG — knowledge base doanh nghiệp (quy trình, FAQ...) | pgvector (extension của PG) |
| **Redis** | Session cache, rate limiting, pub/sub cho streaming events | Redis 7+ |
| **Auth & RBAC** | Xác thực user, phân quyền Admin vs End User, quản lý API keys | JWT tự quản lý (Self-hosted) |
| **Config Store** | Lưu Agent configs, Tool Registry, Integration settings (versioned) | PostgreSQL + Redis cache |
| **Observability** | Structured logs, LLM cost tracking, integration error monitoring | OpenTelemetry + Grafana |

**Database Schema Overview:**

```mermaid
erDiagram
    USER ||--o{ CONVERSATION : has
    USER }o--|| ROLE : assigned

    AGENT ||--o{ SKILL : has
    AGENT ||--o{ INTEGRATION_BINDING : uses
    AGENT_ROUTER ||--o{ AGENT : routes_to

    INTEGRATION ||--o{ TOOL_DEFINITION : exposes
    INTEGRATION_BINDING }o--|| INTEGRATION : references
    INTEGRATION_BINDING }o--|| AGENT : for

    CONVERSATION ||--o{ MESSAGE : contains
    MESSAGE ||--o{ TOOL_EXECUTION : triggers

    ROLE ||--o{ TOOL_PERMISSION : grants

    USER {
        uuid id PK
        string email
        string name
        uuid role_id FK
        timestamp created_at
    }

    AGENT {
        uuid id PK
        string name
        text system_instructions
        string llm_model
        jsonb config
        bool is_router
        timestamp updated_at
    }

    INTEGRATION {
        uuid id PK
        string name
        enum type
        string endpoint
        jsonb auth_config
        enum status
        timestamp created_at
    }

    TOOL_DEFINITION {
        uuid id PK
        uuid integration_id FK
        string tool_name
        text description
        jsonb input_schema
        bool requires_approval
        timestamp created_at
    }

    TOOL_PERMISSION {
        uuid id PK
        uuid role_id FK
        uuid tool_definition_id FK
        bool allowed
    }

    CONVERSATION {
        uuid id PK
        uuid user_id FK
        uuid agent_id FK
        string title
        timestamp created_at
    }

    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        enum role
        text content
        uuid routed_agent_id FK
        int token_count
        timestamp created_at
    }

    TOOL_EXECUTION {
        uuid id PK
        uuid message_id FK
        uuid tool_definition_id FK
        jsonb input
        jsonb output
        enum status
        int duration_ms
        timestamp executed_at
    }
```

> 📄 **Detail**: [06-infrastructure.md](./06-infrastructure.md) *(to be created)*

**Lưu ý thiết kế Database**:
*   `AGENT.config` (JSONB): Lưu trữ các cấu hình động của Agent bao gồm danh sách `allowed_tools` (mảng string tên các công cụ được phép chạy, ví dụ: `["erp_leave_request", "erp_payslip"]`), `maxSteps` (giới hạn ReAct loop), và các tham số bổ sung khác. Thiết kế này giúp quản lý phân quyền sử dụng công cụ của Agent một cách động và gọn gàng mà không cần tạo các bảng liên kết quan hệ phức tạp ở mức độ công cụ đơn lẻ.

---

## 3. Data Flow

### 3.1 End-to-End Message Flow (User → Agent → ERP/CRM → User)

<!-- Luồng hoàn chỉnh: từ user nhắn tin đến nhận kết quả từ hệ thống nghiệp vụ -->

```mermaid
sequenceDiagram
    actor User as 👤 End User
    participant UI as Chat UI
    participant GW as API Gateway
    participant SM as Session Manager
    participant RA as Router Agent
    participant SA as Subagent (e.g. HR)
    participant PB as Prompt Builder
    participant LLM as LLM Core (Claude)
    participant AV as Action Validator
    participant INT as Integration Layer
    participant ERP as ERP / CRM System

    User->>UI: "Tôi còn bao nhiêu ngày phép?"
    UI->>GW: WebSocket message
    GW->>SM: Load session (user context, conversation history)

    SM->>RA: Route message
    RA->>LLM: Classify intent → "HR domain: check leave balance"
    LLM-->>RA: → HR Agent

    RA->>SA: Delegate to HR Agent
    SA->>PB: Build prompt (HR instructions + tools + history)
    SA->>LLM: Send prompt (streaming)

    loop ReAct Loop
        LLM-->>SA: Tool call: erp.get_leave_balance({employee_id})
        SA->>AV: Validate: user có quyền dùng tool này?
        AV-->>SA: Allowed
        SA->>INT: Execute tool via MCP / API Adapter
        INT->>ERP: GET /api/leaves/balance?employee=...
        ERP-->>INT: { annual: 12, used: 5, remaining: 7 }
        INT-->>SA: Tool result
        SA->>LLM: Continue with tool result
        LLM-->>SA: Final response text
    end

    SA-->>UI: Stream: "Bạn còn **7 ngày phép năm** (đã dùng 5/12 ngày)..."
    SA->>GW: Save message + tool execution to DB
```

### 3.2 Admin Config Flow (cấu hình Agent/Integration)

```mermaid
sequenceDiagram
    actor Admin
    participant AP as Admin Panel
    participant API as Config API
    participant DB as PostgreSQL
    participant TR as Tool Registry
    participant MCP as MCP Server / API Adapter

    Admin->>AP: Thêm Integration mới (Odoo ERP MCP)
    AP->>API: POST /admin/integrations
    API->>MCP: Probe: list available tools
    MCP-->>API: [leave.get_balance, leave.submit, payslip.get, ...]
    API->>DB: Save integration + tool definitions
    API->>TR: Reload tool registry (hot reload, no restart)
    TR-->>API: OK

    Admin->>AP: Tạo HR Agent, gán tools
    AP->>API: POST /admin/agents { name, instructions, tools: ["leave.*", "payslip.*"] }
    API->>DB: Save agent config
    API-->>AP: HR Agent created

    Admin->>AP: Phân quyền: role "Staff" được dùng tool leave.*
    AP->>API: POST /admin/permissions
    API->>DB: Save role-tool permissions
```

---

## 4. Tech Stack

<!-- Stack công nghệ đề xuất để build AgentX -->

| Layer | Technology | Lý do chọn |
|-------|-----------|------------|
| **Frontend (Chat UI)** | Next.js 15 + HeroUI 3 + Tailwind CSS v4 + Vercel AI SDK | Giao diện hiện đại, tối ưu hiệu năng, responsive, streaming out-of-box, dễ embed |
| **Admin Panel** | Next.js 15 (same codebase, admin routes) + HeroUI 3 | Tái sử dụng components, single deployment |
| **Backend** | Node.js (NestJS) + TypeScript | Framework modular, cấu trúc rõ ràng, dễ scale và bảo trì, phù hợp chạy các bộ thư viện AI SDK |
| **Agent Orchestration** | Vercel AI SDK Core & UI | Đơn giản hóa việc quản lý vòng lặp ReAct, hỗ trợ streaming UI và quản lý MCP native |
| **LLM Primary** | Anthropic Claude API (Sonnet / Haiku) | Tool use tốt nhất, streaming, large context |
| **LLM Fallback** | OpenAI GPT-4o | Độ available cao |
| **MCP Integration** | `@ai-sdk/mcp` (SSE / HTTP / stdio) | Thư viện chuẩn kết nối MCP Client trong hệ sinh thái Node.js |
| **API Adapter** | Custom adapter engine (Node.js + Fetch/Axios) | Chuyển đổi REST/SOAP API thành MCP Tool |
| **Database** | PostgreSQL 16 + pgvector | Một DB cho cả relational + vector, đơn giản vận hành |
| **Cache / Session** | Redis 7 | Session agent loop, rate limit, hot config cache |
| **Auth** | JWT (JSON Web Token) tự quản lý | Đảm bảo tính bảo mật, độc lập dữ liệu, phân quyền RBAC mặc định, tạo sẵn tài khoản Admin |
| **Observability** | OpenTelemetry + Grafana + Loki | LLM cost tracking, integration error monitoring |
| **Deployment** | Docker Compose & Docker | Triển khai độc lập các container nhanh chóng, tối ưu hóa môi trường dev/prod |

---

## 5. Deployment Architecture

### 5.1 Development (Local)

```
docker-compose.yml
├── agentx-backend      (Node.js / Hono, port 8000)
├── agentx-frontend     (Next.js: Chat UI + Admin Panel, port 3000)
├── postgres            (port 5432, with pgvector extension)
└── redis               (port 6379)
```
*(Lưu ý: Các MCP Server bên ngoài sẽ chạy độc lập và được khai báo địa chỉ kết nối trong cấu hình của AgentX).*

### 5.2 Production

```mermaid
graph TB
    CDN["CDN / Edge"] --> FE["Frontend<br/>(Chat UI + Admin Panel)"]
    LB["Load Balancer"] --> API["AgentX Backend<br/>(Node.js / Hono, k8s auto-scale)"]
    API --> PG["PostgreSQL<br/>(Managed)"]
    API --> REDIS["Redis<br/>(Managed)"]
    API --> OBS["Observability<br/>(Grafana Cloud)"]

    subgraph EXT["External Systems / Hosted MCP Servers"]
        MCP_SERVERS["External MCP Servers<br/>(Odoo, Salesforce, DB, Bridges, etc.)"]
    end

    API -->|SSE / stdio / WebSockets| MCP_SERVERS

    style FE fill:#1a1a2e,stroke:#00d4ff,color:#fff
    style API fill:#16213e,stroke:#ff6b6b,color:#fff
    style EXT fill:#3a1e1e,stroke:#fd79a8,color:#fff
```

---

## 6. Detailed Documentation

<!-- File chi tiết từng layer — bổ sung dần -->

| # | Document | Status | Nội dung |
|---|----------|--------|---------|
| 0 | [00-admin-control-panel.md](./00-admin-control-panel.md) | 🔲 Planned | UI/UX Admin Panel, Agent builder, Integration manager, RBAC config |
| 1 | [01-user-interface.md](./01-user-interface.md) | 🔲 Planned | Chat UI design, streaming implementation, embedded widget |
| 2 | [02-orchestration-engine.md](./02-orchestration-engine.md) | ✅ Completed | Router Agent design, Subagent pool, ReAct loop implementation, Prompt Builder |
| 3 | [03-memory-context.md](./03-memory-context.md) | 🔲 Planned | Conversation memory, RAG pipeline, token budget algorithm |
| 4 | [04-llm-core.md](./04-llm-core.md) | ✅ Completed | LLM provider abstraction, dynamic platform-level resolution, tiers, overrides, cost metering |
| 5 | [05-integration-layer.md](./05-integration-layer.md) | ✅ Completed | MCP integration, Action Validator, Tool Registry, Binary/Multipart uploads |
| 6 | [06-infrastructure.md](./06-infrastructure.md) | 🔲 Planned | DB schema (full), migration, caching patterns, deployment configs |
| 7 | [07-security.md](./07-security.md) | 🔲 Planned | Auth flows, RBAC, API security, action audit trail, data isolation |
| 8 | [08-api-reference.md](./08-api-reference.md) | 🔲 Planned | REST API endpoints, WebSocket events, Admin API, Integration API |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| **Router Agent** | Agent đứng đầu, phân tích intent người dùng và điều phối tới Subagent phù hợp |
| **Subagent** | Agent chuyên biệt cho một domain nghiệp vụ (HR, Finance, CRM...) |
| **Skill** | Một capability cụ thể được gán cho agent (vd: "check leave balance", "generate report") |
| **MCP** | Model Context Protocol — chuẩn kết nối LLM với external tools/data sources |
| **MCP Bridge / Adapter** | Wrapper chạy bên ngoài, chuyển đổi REST/SOAP API của hệ thống cũ thành MCP Server |
| **Action Validator** | Middleware kiểm tra quyền và an toàn trước khi thực thi bất kỳ action nào |
| **ReAct** | Reasoning + Acting — vòng lặp: suy nghĩ → gọi tool → quan sát kết quả → lặp |
| **RAG** | Retrieval-Augmented Generation — bổ sung context từ knowledge base vào prompt |
| **Tool Registry** | Danh sách dynamic các tool available, load từ cấu hình các MCP servers |
| **Token Budget** | Giới hạn token phân bổ cho từng phần của context window |

### B. Key Design Decisions

> **Tại sao không dùng LangChain/LlamaIndex?**  
> Giữ orchestration tự viết để có full control — debug dễ hơn, không phụ thuộc version updates của framework bên ngoài. Chỉ dùng LangGraph nếu workflow trở nên quá phức tạp (parallel subagents, complex state machines).

> **Tại sao yêu cầu hệ thống ngoài tự cung cấp MCP Server thay vì tự viết API Adapter tích hợp sẵn?**  
> Để đảm bảo AgentX là một nền tảng Agent thuần túy, tối đa hóa tính linh hoạt và khả năng mở rộng thông qua giao thức chuẩn Model Context Protocol (MCP). Bằng cách chuyển giao việc cung cấp MCP Server cho các ứng dụng hoặc triển khai dưới dạng các Bridge độc lập bên ngoài, AgentX không cần thay đổi hay build lại code mỗi khi cần tích hợp thêm hệ thống mới, đồng thời giảm tải bảo trì mã nguồn backend của AgentX.

> **Tại sao pgvector thay vì Pinecone?**  
> Đơn giản hóa vận hành — một PostgreSQL database cho cả relational data và vector search. Phù hợp scale vừa và nhỏ. Có thể migrate sang Pinecone nếu cần scale lớn hơn.

### C. References

- [Anthropic Claude API — Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [ReAct: Synergizing Reasoning and Acting in LLMs](https://arxiv.org/abs/2210.03629)
- [Vercel AI SDK — Streaming](https://sdk.vercel.ai/docs/ai-sdk-ui/streaming)
- [pgvector — Vector Search in PostgreSQL](https://github.com/pgvector/pgvector)

---

*Last updated: 2026-06-05*  
*Version: 0.3.0 — Revised for generic MCP configuration and client-only architecture*
