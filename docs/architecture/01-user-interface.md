# Layer 1 — User Interface (Chat UI)

> **Mục tiêu**: Hướng dẫn chi tiết thiết kế và triển khai giao diện Chat UI — điểm tương tác duy nhất của End User với hệ thống AgentX. Người dùng chỉ cần nhắn tin bằng ngôn ngữ tự nhiên, không cần biết về agents, tools hay integrations.

---

## 1. Tổng quan thiết kế

### Triết lý UX

| Nguyên tắc | Mô tả |
|------------|-------|
| **Zero-config cho User** | Không có button chọn agent, không cần biết hệ thống bên dưới |
| **Transparency** | Hiển thị subtle indicator khi agent đang xử lý (gọi tool, đang suy nghĩ) |
| **Structured Output** | Kết quả trả về dạng Markdown có cấu trúc (bảng, danh sách, code blocks) |
| **Real-time** | Streaming response từng token, typing indicator |
| **Conversational Memory** | Lịch sử chat được lưu và có thể quay lại |

### Tech Stack UI

| Component | Technology |
|-----------|-----------|
| Framework | Vite 6 SPA |
| UI Library | HeroUI 3 + Tailwind CSS v4 |
| AI Chat Hook | Custom `useChatStream()` hook (đọc SSE qua fetch body reader) |
| Streaming | Server-Sent Events (SSE) |
| State Management | React hooks + Zustand (cho global state) |
| Markdown Rendering | `react-markdown` + `remark-gfm` |
| Animation | Framer Motion (bundled with HeroUI 3) |

---

## 2. Component Architecture

### 2.1 Component Tree

```
ChatPage (page.tsx)
├── ConversationSidebar
│   ├── NewChatButton
│   ├── ConversationList
│   │   └── ConversationItem (active, hover states)
│   └── UserProfile (avatar, logout)
│
├── ChatWindow
│   ├── ChatHeader
│   │   ├── ConversationTitle
│   │   └── AgentStatusIndicator
│   │
│   ├── MessageList
│   │   ├── MessageBubble (user / assistant)
│   │   │   ├── MarkdownRenderer
│   │   │   ├── ToolCallCard
│   │   │   ├── ApprovalCard
│   │   │   └── AuthPromptCard
│   │   ├── ToolExecutionIndicator
│   │   └── TypingIndicator
│   │
│   └── ChatInput
│       ├── TextArea (auto-resize)
│       ├── FileUploadButton
│       └── SendButton
│
└── (Modals)
    ├── OAuthPopup
    └── TokenInputModal
```

### 2.2 Feature Module Structure

```
src/features/chat-session/
├── components/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── MessageList.tsx
│   ├── ChatInput.tsx
│   ├── ChatHeader.tsx
│   ├── ConversationSidebar.tsx
│   ├── ConversationItem.tsx
│   ├── ToolCallCard.tsx
│   ├── ApprovalCard.tsx
│   ├── AuthPromptCard.tsx
│   ├── TypingIndicator.tsx
│   ├── MarkdownRenderer.tsx
│   └── FileUploadButton.tsx
├── hooks/
│   ├── useChatStream.ts          # Wrapper around useChat() with custom logic
│   ├── useConversations.ts       # CRUD conversations
│   └── useApprovalAction.ts      # Handle approval card actions
├── services/
│   ├── chat-api.ts               # API calls for chat
│   └── conversation-api.ts       # API calls for conversations
└── types/
    └── chat-types.ts             # Message, Conversation, ToolCall types
```

---

## 3. Streaming Implementation

### 3.1 Sử dụng Custom Hook `useChatStream`

Để có toàn quyền kiểm soát luồng SSE, tích hợp Bearer token thủ công và xử lý các sự kiện đặc thù (phân vai, gọi tool, human-approval), ứng dụng tự triển khai cơ chế đọc stream bằng fetch reader:

```typescript
// src/features/chat-session/hooks/useChatStream.ts
import * as React from "react";
import { useAuthStore } from "@/src/features/auth/auth-store";
import { useTranslation } from "react-i18next";
import { toast } from "@heroui/react";

export function useChatStream() {
  const { accessToken } = useAuthStore.getState();
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingText, setStreamingText] = React.useState("");
  const [routedAgentName, setRoutedAgentName] = React.useState<string | null>(null);

  const readStream = async (url: string, onComplete?: () => Promise<void>) => {
    setIsStreaming(true);
    setStreamingText("");
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to initialize stream reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data:")) {
            const eventWrapper = JSON.parse(cleanLine.slice(5).trim());
            const { event, data } = eventWrapper;

            if (event === "agent_routing") {
              setRoutedAgentName(data.agentName);
            } else if (event === "token") {
              setStreamingText((prev) => prev + data);
            } else if (event === "complete" && onComplete) {
              await onComplete();
            }
            // Xử lý các event khác: tool_start, tool_end, tool_approval_required, error...
          }
        }
      }
    } catch (err: any) {
      toast.danger("Lỗi kết nối stream");
    } finally {
      setIsStreaming(false);
    }
  };

  const sendMessage = async (activeId: string, content: string) => {
    const url = `${
      import.meta.env.VITE_API_URL || "http://localhost:8000"
    }/api/chat/conversations/${activeId}/messages/stream?content=${encodeURIComponent(content)}`;
    await readStream(url);
  };

  return {
    isStreaming,
    streamingText,
    routedAgentName,
    sendMessage,
  };
}
```

### 3.2 Backend Chat Endpoint (SSE Streaming)

```typescript
// Backend: POST /api/chat
@Post('chat')
@UseGuards(JwtAuthGuard)
async chat(@Body() body: ChatDto, @CurrentUser() user: UserEntity, @Res() res: Response) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const result = await this.orchestrator.processMessage(
    {
      sessionId: body.conversationId,
      userId: user.id,
      userRole: user.role,
      history: await this.conversationService.getHistory(body.conversationId),
    },
    body.message,
    // onTokenStream
    (token) => res.write(`data: ${JSON.stringify({ type: 'text', content: token })}\n\n`),
    // onToolCall
    (name, args) => res.write(`data: ${JSON.stringify({ type: 'tool_call', name, args })}\n\n`),
  );

  res.write('data: [DONE]\n\n');
  res.end();
}
```

---

## 4. Message Types & Rendering

### 4.1 Message Type Definitions

```typescript
// src/features/chat-session/types/chat-types.ts

interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;                    // Markdown text
  routedAgentId?: string;             // Agent đã xử lý message này
  toolCalls?: ToolCallInfo[];
  approvalRequest?: ApprovalInfo;
  authRequired?: AuthRequiredInfo;
  tokenCount?: number;
  createdAt: Date;
}

interface ToolCallInfo {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'error';
  durationMs?: number;
}

interface ApprovalInfo {
  approvalId: string;
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  description: string;               // Mô tả hành động cho user đọc
}

interface AuthRequiredInfo {
  integrationId: string;
  integrationName: string;
  authType: 'oauth2' | 'bearer';
  oauthUrl?: string;                 // Popup URL cho OAuth2
}
```

### 4.2 Rendering Rules

| Type | Hiển thị |
|------|----------|
| **Text (Markdown)** | Render markdown với tables, code blocks, lists, links |
| **Tool Call (running)** | `🔄 Đang tra cứu phiếu lương...` — animated spinner |
| **Tool Call (success)** | `✅ Đã tra cứu thành công` — collapsible chi tiết |
| **Tool Call (error)** | `❌ Lỗi kết nối hệ thống ERP` — error message |
| **Approval Card** | Card tương tác với nút `[Duyệt]` `[Từ chối]` |
| **Auth Required** | Card đăng nhập: OAuth popup button hoặc Token input form |

### 4.3 Markdown Renderer

```typescript
// src/features/chat-session/components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <SyntaxHighlighter language={match[1]}>
              {String(children)}
            </SyntaxHighlighter>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          );
        },
      }}
    />
  );
}
```

---

## 5. Special UI Components

### 5.1 Tool Execution Indicator

Khi agent gọi tool, hiển thị trạng thái real-time:

```typescript
// src/features/chat-session/components/ToolCallCard.tsx
export function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const statusConfig = {
    pending:  { icon: '⏳', text: 'Đang chuẩn bị...', color: 'warning' },
    running:  { icon: '🔄', text: `Đang thực thi ${toolCall.toolName}...`, color: 'primary' },
    success:  { icon: '✅', text: 'Hoàn thành', color: 'success' },
    error:    { icon: '❌', text: 'Lỗi thực thi', color: 'danger' },
  };

  const config = statusConfig[toolCall.status];

  return (
    <Card className="my-2 bg-default-50">
      <CardBody className="flex flex-row items-center gap-2 py-2">
        <span className={toolCall.status === 'running' ? 'animate-spin' : ''}>
          {config.icon}
        </span>
        <span className="text-sm text-default-600">{config.text}</span>
        {toolCall.durationMs && (
          <Chip size="sm" variant="flat">{toolCall.durationMs}ms</Chip>
        )}
      </CardBody>
      {toolCall.status === 'success' && toolCall.result && (
        <Accordion>
          <AccordionItem title="Chi tiết kết quả">
            <pre className="text-xs">{JSON.stringify(toolCall.result, null, 2)}</pre>
          </AccordionItem>
        </Accordion>
      )}
    </Card>
  );
}
```

### 5.2 Approval Card

```typescript
// src/features/chat-session/components/ApprovalCard.tsx
export function ApprovalCard({ approval, onAction }: {
  approval: ApprovalInfo;
  onAction: (approvalId: string, action: 'approve' | 'reject') => void;
}) {
  return (
    <Card className="my-2 border-warning-200 bg-warning-50">
      <CardHeader>
        <span className="text-warning-700 font-semibold">⚠️ Cần phê duyệt</span>
      </CardHeader>
      <CardBody>
        <p className="text-sm mb-2">{approval.description}</p>
        <p className="text-xs text-default-500">
          Tool: <code>{approval.toolName}</code>
        </p>
        {approval.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <Button
              color="success"
              size="sm"
              onPress={() => onAction(approval.approvalId, 'approve')}
            >
              ✅ Duyệt
            </Button>
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onPress={() => onAction(approval.approvalId, 'reject')}
            >
              ❌ Từ chối
            </Button>
          </div>
        )}
        {approval.status === 'approved' && (
          <Chip color="success" size="sm">Đã duyệt</Chip>
        )}
        {approval.status === 'rejected' && (
          <Chip color="danger" size="sm">Đã từ chối</Chip>
        )}
      </CardBody>
    </Card>
  );
}
```

### 5.3 Auth Prompt Card

```typescript
// src/features/chat-session/components/AuthPromptCard.tsx
export function AuthPromptCard({ authInfo, onTokenSubmit }: {
  authInfo: AuthRequiredInfo;
  onTokenSubmit: (token: string) => void;
}) {
  const [token, setToken] = useState('');

  const handleOAuth = () => {
    // Mở popup OAuth login
    const popup = window.open(
      authInfo.oauthUrl,
      'oauth-login',
      'width=500,height=600'
    );
    // Listen for success message từ popup
    window.addEventListener('message', (event) => {
      if (event.data.type === 'oauth_success') {
        onTokenSubmit(event.data.token);
        popup?.close();
      }
    });
  };

  return (
    <Card className="my-2 border-primary-200 bg-primary-50">
      <CardHeader>
        <span className="font-semibold">🔐 Yêu cầu xác thực</span>
      </CardHeader>
      <CardBody>
        <p className="text-sm mb-3">
          Để tiếp tục, bạn cần kết nối tài khoản <strong>{authInfo.integrationName}</strong>.
        </p>

        {authInfo.authType === 'oauth2' && (
          <Button color="primary" onPress={handleOAuth}>
            🔗 Kết nối tài khoản {authInfo.integrationName}
          </Button>
        )}

        {authInfo.authType === 'bearer' && (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Nhập Access Token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1"
            />
            <Button
              color="primary"
              onPress={() => onTokenSubmit(token)}
              isDisabled={!token}
            >
              Xác nhận
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
```

---

## 6. Conversation Management

### 6.1 Sidebar Design

```
┌──────────────────────────┐
│ AgentX                   │
│ [+ Cuộc trò chuyện mới] │
├──────────────────────────┤
│ 📅 Hôm nay               │
│  💬 Hỏi về nghỉ phép     │ ← active
│  💬 Báo cáo tài chính     │
│                           │
│ 📅 Hôm qua               │
│  💬 Tra cứu khách hàng    │
│  💬 Hỗ trợ kỹ thuật       │
│                           │
│ 📅 7 ngày trước           │
│  💬 Onboarding nhân viên  │
├──────────────────────────┤
│ 👤 Nguyễn Văn A           │
│    [Đăng xuất]            │
└──────────────────────────┘
```

### 6.2 Conversation API

```
GET    /api/conversations                  → List user's conversations (sorted by updatedAt)
POST   /api/conversations                  → Create new conversation
GET    /api/conversations/:id              → Get conversation detail
PATCH  /api/conversations/:id              → Rename conversation
DELETE /api/conversations/:id              → Delete conversation (soft)
GET    /api/conversations/:id/messages     → Get messages (paginated, cursor-based)
```

### 6.3 Auto-title Generation

Khi user gửi tin nhắn đầu tiên, backend tự động sinh tiêu đề conversation:

```typescript
async function generateConversationTitle(firstMessage: string): Promise<string> {
  const result = await llmService.generate({
    tier: 'fast',
    systemPrompt: 'Tạo tiêu đề ngắn gọn (tối đa 6 từ) cho cuộc hội thoại dựa trên tin nhắn đầu tiên. Chỉ trả về tiêu đề, không thêm gì khác.',
    userPrompt: firstMessage,
  });
  return result.text.trim();
}
```

---

## 7. Embedded Widget

### 7.1 Web Component Spec

AgentX Chat có thể nhúng vào hệ thống nội bộ dưới dạng Web Component:

```html
<!-- Nhúng vào ERP Portal -->
<script src="https://agentx.company.com/widget.js"></script>
<agentx-chat
  api-url="https://agentx.company.com/api"
  theme="dark"
  position="bottom-right"
  title="Trợ lý AI"
></agentx-chat>
```

### 7.2 iframe Alternative

```html
<iframe
  src="https://agentx.company.com/embed/chat?token=USER_JWT_TOKEN"
  width="400"
  height="600"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);"
></iframe>
```

### 7.3 Widget Configuration

| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| `api-url` | string | Required | URL backend AgentX |
| `theme` | `light` \| `dark` | `dark` | Giao diện sáng/tối |
| `position` | `bottom-right` \| `bottom-left` | `bottom-right` | Vị trí floating button |
| `title` | string | `"AI Assistant"` | Tiêu đề chat window |
| `auto-open` | boolean | `false` | Tự mở khi load trang |

---

## 8. Responsive Design & Dark Mode

### 8.1 Breakpoints

| Screen | Layout |
|--------|--------|
| **Desktop** (≥1024px) | Sidebar (280px) + Chat Window |
| **Tablet** (768-1023px) | Collapsible sidebar (overlay) + Chat Window |
| **Mobile** (< 768px) | Full-screen chat, sidebar as drawer |

### 8.2 Dark Mode (Default)

AgentX mặc định sử dụng **dark mode** (cấu hình qua HeroUI `className="dark"` trên `<html>`). Các component HeroUI tự động adapt theo theme.

Custom CSS variables cho chat UI:

```css
:root {
  /* Chat-specific tokens */
  --chat-bg: hsl(222 47% 6%);
  --chat-bubble-user: hsl(217 91% 50%);
  --chat-bubble-assistant: hsl(222 30% 14%);
  --chat-input-bg: hsl(222 30% 10%);
  --chat-sidebar-bg: hsl(222 35% 8%);
}
```

---

*Last updated: 2026-06-06*
*Version: 0.1.0 — Initial Chat UI spec*
