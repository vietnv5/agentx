# Kế hoạch & Hướng dẫn Triển khai AgentX (Phase 2, 3 & 4)

Tài liệu này lưu trữ toàn bộ kế hoạch triển khai, các bước thực thi thực tế, lệnh chạy và quy trình kiểm thử End-to-End cho các Giai đoạn 2, 3, và 4 của hệ thống AgentX (Admin Panel, Orchestration Engine, RAG Memory, Security & Permissions).

---

## 1. Tổng quan các Giai đoạn Triển khai

### Phase 2: Tầng Quản trị (Admin Control Panel)
*   **Backend**: 
    *   Tạo API quản trị Agents (`GET`, `POST`, `PATCH`, `DELETE` tại `/api/admin/agents`).
    *   Tạo API quản trị MCP Servers (`/api/admin/integrations`), tích hợp stdio/SSE và tự động đồng bộ (discover) các công cụ của server.
    *   Quản lý vai trò & quyền hạn (`/api/admin/users`, `/api/admin/roles/:id/permissions`).
    *   Nhật ký gọi công cụ & thống kê chi phí LLM (`/api/admin/audit`).
*   **Frontend**:
    *   Sidebar điều hướng glassmorphism cao cấp.
    *   Giao diện Dashboard tổng quan (Stats, Biểu đồ chi phí).
    *   Giao diện quản lý Agents Builder, MCP Integrations, Users & Roles, Audit Logs.

### Phase 3: Bộ máy Điều phối & Luồng Chat (Orchestration & SSE)
*   **Backend**:
    *   Tích hợp Vercel AI SDK gọi các model LLM linh hoạt (Fast, Smart, Vision).
    *   Xây dựng bộ máy ReAct Loop điều phối Specialist Agents, tự động gọi MCP tools qua Client Pool.
    *   Hỗ trợ phê duyệt công cụ (Human-in-the-loop) đối với các tools nhạy cảm.
    *   API stream SSE `/api/chat/conversations/:id/messages/stream` để trả về phản hồi thời gian thực.
    *   Sử dụng Redis Pub/Sub để reload cấu hình MCP Client Pool mà không cần khởi động lại server.
*   **Frontend**:
    *   Giao diện Chat thời gian thực.
    *   Hiển thị log chạy tools của Agent (dạng collapsed logs) và component phê duyệt (Approve/Reject).

### Phase 4: Bộ nhớ RAG & Bảo mật (Memory & Security)
*   **Backend**:
    *   Tích hợp pgvector trên PostgreSQL để lưu trữ và truy vấn vector tương đồng (cosine distance).
    *   Tải lên tài liệu, tự động chia nhỏ thành các chunks, tính toán embeddings qua LLM và index vào database.
    *   Mã hóa API keys/credentials của các MCP Servers bằng AES-256-GCM.
*   **Frontend**:
    *   Trang quản lý Tri thức (Knowledge Base) cho phép tải tài liệu, index và tìm kiếm thử nghiệm.

---

## 2. Hướng dẫn Thực thi & Chạy local

Lưu ý: Mọi bước này đã được chạy thử nghiệm thành công 100% trên môi trường Windows local.

### Bước 1: Khởi chạy môi trường Docker
Khởi động container PostgreSQL (hỗ trợ pgvector) và Redis bằng Docker Compose:
```bash
docker compose up -d
```
*   *Lưu ý*: Đảm bảo Docker Desktop đã được mở và Engine đang chạy (biểu tượng cá voi màu xanh lá cây).
*   *Xóa dữ liệu để chạy lại sạch sẽ (nếu cần)*: `docker compose down -v` rồi chạy lại `docker compose up -d`.

### Bước 2: Đồng bộ & Di trú Cơ sở dữ liệu (Drizzle ORM)
Do database sử dụng kiểu dữ liệu `vector` cho tính năng RAG, tệp migration SQL tại [0000_high_speed_demon.sql](file:///d:/GitHub/AI%20agent/agentx/apps/api/src/database/migrations/0000_high_speed_demon.sql) cần được bổ sung câu lệnh kích hoạt extension ở đầu:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Chạy lệnh di trú trong thư mục `apps/api` để tạo toàn bộ bảng và index:
```bash
cd apps/api
npx drizzle-kit migrate
```

### Bước 3: Biên dịch toàn Monorepo
Kiểm tra cú pháp và build toàn bộ monorepo (cả backend NestJS và frontend Vite SPA) để đảm bảo không lỗi:
```bash
# Ở thư mục gốc dự án
pnpm run build
```
*(Nếu sử dụng HeroUI v3.1.0, các Button phải dùng `variant="ghost"`/`variant="primary"`, prop `isDisabled` thay cho `disabled`, và `Accordion` phải chuyển thành compound component chuẩn).*

### Bước 4: Khởi chạy chế độ Phát triển (Dev Mode)
Khởi chạy đồng thời cả Backend và Frontend với hot-reload:
```bash
# Ở thư mục gốc dự án
pnpm run dev
```
*   **Backend API**: Chạy tại `http://localhost:8000/api`
*   **Swagger API Docs**: Chạy tại `http://localhost:8000/docs`
*   **Vite Frontend**: Chạy tại `http://localhost:3000`

Hệ thống sẽ tự động seed vai trò và tài khoản Admin mặc định khi start NestJS lần đầu:
*   **Email**: `admin@agentx.local`
*   **Password**: `Admin@123456`

> [!NOTE]
> **Cơ chế xác thực JWT mới**: Để tránh lỗi CORS Cookie chéo domain (`strict-origin-when-cross-origin`), hệ thống mặc định tắt việc sử dụng Cookie CORS. 
> Refresh Token sẽ được trả về trực tiếp trong JSON response body khi login và được lưu trữ cục bộ ở frontend (LocalStorage qua Zustand Persist).
> Khi refresh token, client sẽ gửi `refreshToken` qua JSON Request Body hoặc qua Header `Authorization: Bearer <refreshToken>`. Cookie chỉ được sử dụng làm fallback dự phòng để phục vụ tích hợp với các hệ thống khác muốn sign-on 1 lần (Single Sign-On) cho các hệ thống khác nhau (ví dụ: `erp.companyX.com` và `agentx-chat.companyX.com`).

---

## 3. Quy trình Kiểm thử E2E API bằng Script

Để xác minh nhanh hoạt động của API Backend (bao gồm đăng nhập, cấp token JWT, kiểm tra Role Guard, truy vấn Agents/Integrations), bạn có thể chạy tệp script kiểm thử độc lập tại thư mục scratch:

```bash
# Thực thi từ thư mục gốc dự án
node .gemini/antigravity-ide/brain/8bee70b3-8d05-4db9-bff0-67af68226ac3/scratch/test-e2e.js
```

### Mã nguồn của Script Kiểm thử (`test-e2e.js`):
```javascript
async function runTest() {
  console.log('=== TEST E2E BACKEND AGENTX ===');
  const API_URL = 'http://localhost:8000/api';
  
  try {
    // 1. Test Login
    console.log('1. Đang thử đăng nhập bằng admin@agentx.local...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@agentx.local',
        password: 'Admin@123456'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Đăng nhập thất bại: ${loginRes.status} - ${errText}`);
    }
    
    const loginData = await loginRes.json();
    console.log('✓ Đăng nhập thành công!');
    console.log('Response data:', loginData);
    const token = loginData.accessToken;
    const refreshToken = loginData.refreshToken; // Đọc từ body
    
    // 2. Fetch Agents (Kiểm tra Role Guard bằng Access Token)
    console.log('\n2. Lấy danh sách Agents...');
    const agentsRes = await fetch(`${API_URL}/admin/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!agentsRes.ok) {
      const errText = await agentsRes.text();
      throw new Error(`Lấy agents thất bại: ${agentsRes.status} - ${errText}`);
    }
    const agentsData = await agentsRes.json();
    console.log('✓ Lấy danh sách agents thành công! Số lượng:', agentsData.length);
    
    // 3. Test Refresh Token (Truyền refreshToken qua Body và Bearer Header)
    console.log('\n3. Thử nghiệm Refresh Token...');
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}` // Gửi qua header
      },
      body: JSON.stringify({ refreshToken }) // Gửi qua body
    });
    if (!refreshRes.ok) {
      const errText = await refreshRes.text();
      throw new Error(`Refresh token thất bại: ${refreshRes.status} - ${errText}`);
    }
    const refreshData = await refreshRes.json();
    console.log('✓ Refresh token thành công! Access Token mới:', refreshData.accessToken ? 'OK' : 'FAIL');

    // 4. Test Logout (Thu hồi token)
    console.log('\n4. Thử nghiệm Logout (thu hồi token)...');
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Access Token xác thực
      },
      body: JSON.stringify({ refreshToken }) // Refresh Token để thu hồi
    });
    if (!logoutRes.ok) {
      const errText = await logoutRes.text();
      throw new Error(`Logout thất bại: ${logoutRes.status} - ${errText}`);
    }
    const logoutData = await logoutRes.json();
    console.log('✓ Đăng xuất thành công!', logoutData);
    
    console.log('\n=== TẤT CẢ CÁC BƯỚC API CƠ BẢN ĐÃ ĐƯỢC XÁC MINH THÀNH CÔNG ===');
  } catch (error) {
    console.error('❌ Lỗi kiểm thử API:', error.message);
    process.exit(1);
  }
}

runTest();
```
