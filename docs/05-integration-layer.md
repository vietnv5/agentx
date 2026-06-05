# Layer 5 — Integration Layer (MCP Client)

> **Mục tiêu**: Hướng dẫn chi tiết thiết kế và triển khai Tầng tích hợp trên AgentX. Hệ thống đóng vai trò làm MCP Client động để kết nối tới bất kỳ hệ thống MCP Server nào bên ngoài thông qua cấu hình, sử dụng thư viện `@ai-sdk/mcp` (Vercel AI SDK).

---

## 1. High-Level Integration Flow

Tầng tích hợp là cầu nối chịu trách nhiệm nhận yêu cầu gọi công cụ (tool call) từ Orchestrator, kiểm tra phân quyền người dùng, chuyển đổi giao thức và gửi yêu cầu tới các MCP Server tương ứng được cấu hình trước.

```mermaid
sequenceDiagram
    participant ORC as Orchestrator (Vercel AI SDK)
    participant VAL as Action Validator
    participant REG as Tool Registry
    participant CLI as MCP Client (@ai-sdk/mcp)
    participant MCP_SRV as External MCP Server

    ORC->>VAL: 1. Request Tool Call (e.g. database.query_users)
    Note over VAL: Check User Session & Permissions
    alt Unauthorized
        VAL-->>ORC: Access Denied Error
    else Authorized
        VAL->>REG: 2. Resolve Tool Target
        REG->>CLI: 3. Invoke Tool via Transport
        CLI->>MCP_SRV: 4. Execute JSON-RPC over stdio / SSE
        MCP_SRV-->>CLI: Tool Result Data
        CLI-->>REG: Format Standard Output
        REG-->>ORC: 5. Return Tool Result
    end
```

---

## 2. `@ai-sdk/mcp` Client Implementation

AgentX sử dụng thư viện `@ai-sdk/mcp` làm lớp nền kết nối. Hệ thống hỗ trợ 2 dạng transport chính theo đặc tả MCP: **SSE** (kết nối mạng qua HTTP) và **stdio** (chạy dòng lệnh / script nội bộ).

### 2.1 Cấu hình khởi tạo Client (Dynamic MCP Connection)

Trong AgentX, danh sách MCP server và thông số kết nối được Admin quản lý động thông qua cấu hình (tương tự định dạng `mcpServers` trong Claude Desktop). Dưới đây là code khởi tạo động MCP Client dựa trên cấu hình lưu trữ:

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { getActiveIntegrations } from './db/config-store';

interface McpInstance {
  serverId: string;
  client: any; // Type returned by createMCPClient
  tools: Record<string, any>;
}

export class IntegrationManager {
  private activeInstances: Map<string, McpInstance> = new Map();

  /**
   * Khởi tạo kết nối tới toàn bộ MCP servers được cấu hình
   */
  async initializeInstances(): Promise<void> {
    const integrations = await getActiveIntegrations();

    for (const integration of integrations) {
      try {
        let client;

        if (integration.transport === 'sse') {
          client = await createMCPClient({
            transport: 'sse',
            url: integration.endpoint,
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              ...integration.customHeaders
            }
          });
        } else if (integration.transport === 'stdio') {
          client = await createMCPClient({
            transport: 'stdio',
            command: integration.command,
            args: integration.args || [],
            env: integration.env || {} // Truyền biến môi trường đặc thù
          });
        }

        if (client) {
          this.activeInstances.set(integration.id, {
            serverId: integration.id,
            client,
            tools: client.tools() // Load toàn bộ tool schema từ server
          });
        }
      } catch (error) {
        console.error(`Failed to connect to MCP Server [${integration.name}]:`, error);
      }
    }
  }

  /**
   * Lấy toàn bộ công cụ của các MCP đang hoạt động để cấp cho AI SDK
   */
  getAllTools(): Record<string, any> {
    const allTools: Record<string, any> = {};
    for (const instance of this.activeInstances.values()) {
      Object.assign(allTools, instance.tools);
    }
    return allTools;
  }

  /**
   * Đóng toàn bộ kết nối khi tắt backend/reset session
   */
  async closeAll(): Promise<void> {
    for (const instance of this.activeInstances.values()) {
      await instance.client.close();
    }
    this.activeInstances.clear();
  }
}
```

---

## 3. External API-to-MCP Bridge (Cho hệ thống legacy không hỗ trợ MCP native)

Đối với các hệ thống cũ (legacy) chỉ cung cấp REST API hoặc SOAP và chưa hỗ trợ giao thức MCP native, đơn vị sở hữu hệ thống đó (hoặc nhà phát triển) cần tự xây dựng và triển khai một **MCP API Bridge** chạy độc lập. Bridge này đóng vai trò như một MCP Server trung gian: dịch các lệnh JSON-RPC từ AgentX gửi đến thành các truy vấn REST/SOAP tương ứng tới hệ thống cũ.

```
┌─────────────────┐             ┌─────────────────────────┐             ┌──────────────────┐
│   AgentX Core   │  JSON-RPC   │   External MCP Bridge   │  REST API   │ Legacy CRM/ERP   │
│  (MCP Client)   │ ──────────> │ (MCP Server - Độc lập)  │ ──────────> │ (GET/POST/SOAP)  │
└─────────────────┘             └─────────────────────────┘             └──────────────────┘
```

### Triển khai MCP Bridge độc lập dùng `@modelcontextprotocol/sdk` (Node.js)

Dưới đây là ví dụ cấu trúc mã nguồn của một dịch vụ MCP Bridge chạy độc lập bên ngoài AgentX:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import axios from 'axios';

const app = express();
const server = new Server(
  { name: 'legacy-erp-bridge', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 1. Định nghĩa danh sách các công cụ chuyển dịch từ REST API
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'erp_get_employee',
        description: 'Lấy thông tin chi tiết nhân viên từ hệ thống ERP cũ',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'Mã nhân viên' }
          },
          required: ['employeeId']
        }
      }
    ]
  };
});

// 2. Định nghĩa logic thực thi công cụ bằng cách gọi REST API đích
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'erp_get_employee') {
    const employeeId = args.employeeId;
    try {
      // Gọi sang hệ thống ERP Legacy
      const response = await axios.get(`https://legacy-erp.internal/api/v1/employees/${employeeId}`, {
        headers: { 'X-API-KEY': process.env.LEGACY_ERP_KEY }
      });
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Lỗi kết nối ERP: ${error.message}` }],
        isError: true
      };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});

// 3. Expose qua giao thức SSE (Server-Sent Events) để AgentX kết nối từ xa
let transport: SSEServerTransport;
app.get('/sse', (req, res) => {
  transport = new SSEServerTransport('/messages', res);
  server.connect(transport);
});

app.post('/messages', (req, res) => {
  transport.handleMessage(req, res);
});

app.listen(3001, () => console.log('MCP Bridge running independently on port 3001'));
```

---

## 4. Action Validator & Phân quyền gọi Tool

> **Quy tắc an ninh**: Agent có khả năng tự động gọi API, nên bắt buộc phải kiểm tra quyền của User thực tế trước khi thực thi tool call, tránh việc LLM bị Prompt Injection dẫn đến thực thi các lệnh trái phép.

```typescript
import { getPermissions } from './db/auth-store';

export interface UserContext {
  userId: string;
  role: string;
}

/**
 * Middleware kiểm tra quyền thực thi Tool của User
 * @returns true nếu hợp lệ, ném Error nếu không có quyền
 */
export async function validateToolExecution(
  toolName: string,
  user: UserContext,
  argumentsData: any
): Promise<boolean> {
  // 1. Tải danh sách quyền của User từ DB
  const userPermissions = await getPermissions(user.role);

  // 2. Kiểm tra xem quyền truy cập có khớp với toolName không
  // Ví dụ: tool "erp.update_salary" chỉ dành cho role "HR_Manager"
  const isAllowed = userPermissions.some(permission => {
    const pattern = new RegExp(`^${permission.toolPattern.replace('*', '.*')}$`);
    return pattern.test(toolName);
  });

  if (!isAllowed) {
    throw new Error(`User ${user.userId} với role ${user.role} không có quyền thực thi công cụ: ${toolName}`);
  }

  // 3. (Optional) Sanitize input arguments chống SQL Injection hoặc Parameter Manipulation
  sanitizeArgs(argumentsData);

  return true;
}

function sanitizeArgs(args: any) {
  // Logic lọc các ký tự độc hại, định dạng lại kiểu dữ liệu
}
```

---

## 5. Cơ chế Human-in-the-Loop (Approval Gate)

Đối với các thao tác ảnh hưởng nghiêm trọng đến dữ liệu doanh nghiệp (Ví dụ: `erp.delete_invoice`, `crm.send_bulk_email`, `hrm.approve_bonus`):
1. Hệ thống cần chặn hành động thực thi.
2. Gửi một thẻ xác nhận (Approval Card) về giao diện chat để người dùng trực tiếp bấm nút "Duyệt" (Approve) hoặc "Từ chối" (Reject).

### Sơ đồ xử lý Approval Gate

```
[Agent Loop] ──> Phát hiện Tool ghi dữ liệu ──> Chặn thực thi & Lưu trạng thái PENDING
                                                        │
[Chat UI] <── Stream thẻ xác nhận (Approval Card) ──────┘
    │
User click [Duyệt]
    │
[Chat UI] ──> Gửi POST /api/approvals/:id/approve ──────┐
                                                        ▼
[Agent Loop] <── Giải phóng trạng thái PENDING & tiếp tục chạy ReAct loop
```

### Code Triển khai State Machine tại Backend

```typescript
import { createId } from '@paralleldrive/cuid2';

export interface ApprovalRequest {
  id: string;
  sessionOrTaskId: string;
  toolName: string;
  args: any;
  status: 'pending' | 'approved' | 'rejected';
}

export class ApprovalGateManager {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();

  /**
   * Đăng ký một tool cần phê duyệt và treo luồng thực thi
   */
  async requestApproval(taskId: string, toolName: string, args: any): Promise<any> {
    const approvalId = createId();
    const approval: ApprovalRequest = {
      id: approvalId,
      sessionOrTaskId: taskId,
      toolName,
      args,
      status: 'pending'
    };

    this.pendingApprovals.set(approvalId, approval);

    // Gửi event qua WebSocket báo UI hiển thị thẻ Approval Card
    broadcastToUser(taskId, {
      type: 'approval_required',
      data: { approvalId, toolName, args }
    });

    // Chờ phản hồi từ người dùng (Long Polling hoặc Promise Resolver pattern)
    return this.waitForUserResponse(approvalId);
  }

  private async waitForUserResponse(approvalId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const approval = this.pendingApprovals.get(approvalId);
        if (!approval) {
          clearInterval(checkInterval);
          reject(new Error("Approval request deleted."));
          return;
        }

        if (approval.status === 'approved') {
          clearInterval(checkInterval);
          this.pendingApprovals.delete(approvalId);
          resolve({ approved: true, data: approval.args });
        } else if (approval.status === 'rejected') {
          clearInterval(checkInterval);
          this.pendingApprovals.delete(approvalId);
          resolve({ approved: false, reason: 'User rejected the action.' });
        }
      }, 500); // Check every 500ms
    });
  }

  /**
   * API Handler khi người dùng click Duyệt trên UI
   */
  handleUserAction(approvalId: string, action: 'approve' | 'reject') {
    const approval = this.pendingApprovals.get(approvalId);
    if (approval) {
      approval.status = action === 'approve' ? 'approved' : 'rejected';
      this.pendingApprovals.set(approvalId, approval);
    }
  }
}
```

---

## 6. Security & Data Privacy

Tầng tích hợp đóng vai trò chốt chặn cuối cùng bảo vệ dữ liệu doanh nghiệp:

1. **Token Propagation (Kế thừa định danh)**:
   - Các API request từ MCP Client gửi tới ERP bắt buộc phải đính kèm Header định danh của User đang chat (ví dụ: `X-User-Email` hoặc User-scoped OAuth Token) thay vì dùng chung 1 Master API Key cho mọi truy vấn. Điều này giúp ERP kiểm tra được phân quyền chi tiết (Data-level security) của user đó.
2. **Network Isolation (Cách ly mạng)**:
   - Các MCP Server nội bộ (chứa business logic nhạy cảm) cần được deploy trong mạng nội bộ (Internal VPC) của doanh nghiệp, không expose cổng ra Internet công cộng.
   - API Gateway của AgentX kết nối tới MCP Server bằng internal DNS hoặc Service Mesh (như Istio/Linkerd).
3. **Log Sanitization (Xóa dữ liệu nhạy cảm trong logs)**:
   - Nhật ký ghi lại quá trình gọi tool (Audit Logs) phải tự động xóa bỏ hoặc ẩn đi (masking) các thông tin nhạy cảm như mật khẩu, mã OTP, số thẻ tín dụng hoặc thông tin bảng lương cá nhân trước khi lưu xuống PostgreSQL.

---

## 7. Handling Binary & File Transfers (Multipart/Uploads)

> **Thách thức**: Giao thức MCP sử dụng định dạng JSON-RPC truyền văn bản (text-only). Việc Base64 hóa toàn bộ file nhị phân (như PDF, ảnh, excel) để truyền trong payload của tool call là cực kỳ kém hiệu quả đối với các file lớn, dễ gây quá tải bộ nhớ và vượt quá giới hạn token context.

Để giải quyết vấn đề này, AgentX áp dụng 2 mô hình (Design Patterns) chuẩn hóa như sau:

### 7.1 Pattern A: Pass-by-Reference (Truyền qua tham chiếu - Khuyên dùng)

Trong mô hình này, việc tải file nhị phân lớn và xử lý nghiệp vụ được tách biệt. Dữ liệu nhị phân không bao giờ đi qua payload của giao thức MCP JSON-RPC.

```
[1] User Uploads File       ┌─────────────┐
──────────────────────────> │ AgentX Chat │
                            │   (UI/BE)   │ ── [2] Store File in Temp S3
                            └─────────────┘
                                  │
                                  │ [3] Call Tool: erp.import_invoice({ fileUrl })
                                  ▼
                            ┌─────────────┐
                            │ External    │
                            │ MCP Server  │ ── [4] Download File via URL
                            └─────────────┘
                                  │
                                  │ [5] Perform Multipart Upload to ERP
                                  ▼
                            ┌─────────────┐
                            │ ERP System  │
                            └─────────────┘
```

**Các bước thực hiện:**
1. **Tải lên AgentX**: Người dùng tải file trực tiếp lên giao diện Chat UI. AgentX Backend sẽ lưu trữ file này vào một Storage nội bộ hoặc S3 Temp Bucket của AgentX, đồng thời sinh ra một đường dẫn tải tạm thời bảo mật (`secure_download_url` kèm token hết hạn ngắn).
2. **Gọi Tool bằng tham chiếu**: Agent khi nhận diện intent xử lý file sẽ gọi tool nghiệp vụ của MCP Server bên ngoài, nhưng chỉ truyền tham số text là đường dẫn này:
   ```json
   {
     "name": "erp_import_invoice",
     "arguments": {
       "fileUrl": "https://agentx.internal/temp-files/inv_98213.pdf?token=ab89c2"
     }
   }
   ```
3. **Download và Tải lên hệ thống đích**: External MCP Server (được cung cấp bởi ERP) nhận tool call, tải file từ `fileUrl` về bộ nhớ đệm, sau đó tự khởi tạo một kết nối Multipart/Form-data HTTP POST truyền thống để đẩy file vào API nghiệp vụ của hệ thống ERP.

### 7.2 Pattern B: Pre-signed URL / Client-Side Direct Upload (Tải lên trực tiếp từ Client)

Mô hình này tối ưu hóa băng thông bằng cách để trình duyệt của người dùng (Client) tải file trực tiếp lên máy chủ đích mà không cần trung chuyển qua bộ nhớ của AgentX Backend.

```mermaid
sequenceDiagram
    actor User as 👤 End User
    participant UI as Chat UI (Client)
    participant AG as AgentX Core (Client)
    participant MCP as External MCP Server
    participant ERP as ERP System

    User->>UI: Select file & request upload
    AG->>MCP: 1. Request Upload Session (erp.get_upload_url)
    MCP->>ERP: 2. Request Pre-signed S3 URL / Token
    ERP-->>MCP: Return Pre-signed URL & Auth Headers
    MCP-->>AG: 3. Return tool output (uploadUrl & headers)
    
    Note over UI: UI Intercepts Tool Response
    UI->>ERP: 4. Perform direct HTTP POST/PUT (Multipart File)
    ERP-->>UI: File Upload Success (file_id)
    
    UI->>AG: 5. Finalize Action with file_id (erp.process_file)
    AG-->>User: "Tải file thành công và đang xử lý..."
```

**Các bước thực hiện:**
1. **Lấy Pre-signed URL**: Agent gọi một tool hỗ trợ (ví dụ: `erp.get_upload_url(filename, contentType)`) thông qua MCP. MCP Server sẽ xin hệ thống ERP một upload URL tạm thời có hiệu lực ngắn và trả ngược về cho AgentX Client.
2. **Upload trực tiếp**: Trình duyệt (Chat UI) chặn kết quả trả về của tool này, tự động thực hiện tải file nhị phân lên thẳng URL đó bằng phương thức HTTP POST Multipart Form hoặc PUT nhị phân.
3. **Xử lý nghiệp vụ**: Sau khi tải lên thành công và nhận được định danh file nghiệp vụ từ ERP (ví dụ: `erp_file_id: "file-998822"`), Frontend sẽ tự động kích hoạt lượt chat/action tiếp theo để Agent gửi mã ID này cho tác vụ chính (ví dụ: `erp.process_document({ fileId: "file-998822" })`).

---

*Last updated: 2026-06-05*  
*Version: 0.3.0 — Revised for generic MCP configuration, client-only architecture, and binary/upload patterns*
