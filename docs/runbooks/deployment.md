# Production Deployment Runbook

> **Mục tiêu**: Cung cấp quy trình từng bước (runbook) để triển khai, cập nhật, giám sát và xử lý sự cố hệ thống AgentX trên các môi trường staging và production.

---

## 1. Pre-Deployment Checklist

Trước khi thực hiện triển khai hoặc cập nhật, người chịu trách nhiệm vận hành (Ops/DevOps) phải kiểm tra các yếu tố sau:

- [ ] **Docker Images**: Đảm bảo các image của `api` (backend) và `web` (frontend) đã được build thành công trên CI/CD và đẩy lên Registry (Docker Hub, AWS ECR, etc.) với tag phiên bản tương ứng (ví dụ: `v1.0.0` hoặc commit hash).
- [ ] **Môi trường cấu hình**: Kiểm tra các biến môi trường tại máy chủ đích đã được cập nhật đầy đủ và khớp với tài liệu [env-variables.md](../guides/env-variables.md).
- [ ] **Backup Database**: Nếu là cập nhật phiên bản (update deployment), bắt buộc phải thực hiện backup database trước khi chạy migration (xem mục [Backup & Restore](#5-backup--restore)).
- [ ] **Trạng thái Hạ tầng**: Đảm bảo các tài nguyên hệ thống (CPU, RAM, Disk) tại máy chủ đích còn đủ dung lượng trống (tối thiểu 20% bộ nhớ).

---

## 2. Quy trình Triển khai (Deployment Steps)

Dưới đây là các bước triển khai chuẩn bằng Docker Compose. Trong thực tế, các lệnh này có thể được tự động hóa qua GitHub Actions / GitLab CI.

### Bước 2.1: Truy cập máy chủ và cập nhật file cấu hình
Di chuyển tới thư mục cài đặt dự án trên server và cập nhật file `docker-compose.yml` cùng file cấu hình môi trường `.env`.

```bash
cd /opt/agentx
# Cập nhật code / docker-compose definition (nếu có thay đổi)
git pull origin main
```

### Bước 2.2: Kéo các image mới nhất về máy chủ
```bash
docker compose pull api web
```

### Bước 2.3: Chạy Database Migrations
Trước khi khởi động ứng dụng backend phiên bản mới, ta cần chạy migration để cập nhật cấu trúc database phù hợp. Chạy một container phụ temporary để thực hiện công việc này:

```bash
docker compose run --rm api pnpm drizzle-kit migrate
```

> [!WARNING]
> Nếu quá trình chạy migration bị lỗi, hãy dừng deploy ngay lập tức và tiến hành điều tra. Không được khởi chạy code API mới trên schema cũ hoặc ngược lại.

### Bước 2.4: Khởi động hệ thống (Rolling Update)
Khởi chạy các container phiên bản mới. Sử dụng cờ `--detach` để chạy dưới nền và `--force-recreate` để chắc chắn khởi động lại với cấu hình mới:

```bash
docker compose up -d postgres redis
docker compose up -d api web
```

Nếu cấu hình Nginx làm Reverse Proxy hoặc load balancer, thực hiện reload Nginx:
```bash
sudo nginx -s reload
```

---

## 3. Xác minh sau Triển khai (Post-Deployment Verification)

Sau khi hoàn tất quá trình khởi động, thực hiện kiểm tra khói (Smoke Test) theo checklist:

- [ ] **Kiểm tra trạng thái Container**:
  ```bash
  docker compose ps
  # Tất cả container phải ở trạng thái "Up" (hoặc "running")
  ```
- [ ] **Kiểm tra Health Check API**:
  Truy cập endpoint healthcheck công khai:
  ```bash
  curl -fsS http://localhost:8000/api/health
  # Trả về status: "ok" cùng kết nối DB và Redis thông suốt
  ```
- [ ] **Kiểm tra logs**:
  Kiểm tra logs của backend xem có lỗi kết nối hoặc khởi chạy không:
  ```bash
  docker compose logs api --tail=100
  ```
- [ ] **Kiểm tra Giao diện (Frontend)**:
  Mở trình duyệt truy cập địa chỉ domain của ứng dụng (ví dụ: `https://agentx.domain.com`):
  - Đảm bảo tải trang login thành công.
  - Thực hiện đăng nhập thử bằng tài khoản admin hoặc tài khoản test.
  - Gửi một tin nhắn bất kỳ lên Chat UI để verify luồng streaming SSE từ Backend và LLM.

---

## 4. Kịch bản khôi phục (Rollback Procedure)

Khi quá trình deploy xảy ra lỗi nghiêm trọng không thể khắc phục ngay (ví dụ: API crash loop, API không kết nối được DB, UI trắng xóa):

### Bước 4.1: Quay lại phiên bản Docker Image trước đó
Cập nhật file `.env` hoặc file deploy, thay đổi tag của các image về phiên bản ổn định trước đó (ví dụ: đổi từ `v1.1.0` thành `v1.0.9`).

### Bước 4.2: Deploy lại ứng dụng ổn định
```bash
docker compose up -d api web
```

### Bước 4.3: Rollback Database (Nếu cần)
Nếu phiên bản mới đã chạy migration làm thay đổi schema và không tương thích ngược, bạn cần rollback database.

> [!CAUTION]
> Rollback database có thể gây mất dữ liệu mới phát sinh trong quá trình deploy. Hãy thực hiện vô cùng cẩn thận.

Sử dụng Drizzle Kit để khôi phục cấu trúc database (chạy trong docker container):
```bash
# Khôi phục file migration cuối cùng
docker compose run --rm api pnpm drizzle-kit drop
```
*Lưu ý: Nếu có cấu trúc phức tạp, cách an toàn nhất là khôi phục database từ bản backup tạo ra ngay trước khi triển khai (xem mục 5).*

---

## 5. Backup & Restore (Sao lưu & Khôi phục)

### 5.1 Sao lưu Database (PostgreSQL)
Chạy script backup định kỳ hàng ngày (qua cron job) và lưu trữ bản backup an toàn.

**Lệnh backup thủ công:**
```bash
# Định nghĩa tên file backup kèm timestamp
BACKUP_FILE="agentx_db_backup_$(date +%Y%m%d_%H%M%S).sql"

# Thực hiện pg_dump trong container và lưu ra thư mục backup trên host
docker exec -t agentx-postgres-prod pg_dump -U agentx_user -d agentx_db > /opt/agentx/backups/$BACKUP_FILE

# Nén file backup
gzip /opt/agentx/backups/$BACKUP_FILE
```

### 5.2 Khôi phục Database (PostgreSQL)
Khi cần khôi phục dữ liệu từ một bản backup:

```bash
# Giải nén file backup
gunzip /opt/agentx/backups/agentx_db_backup_xxxxxxxx_xxxxxx.sql.gz

# Xóa database hiện tại và tạo database trống
docker exec -t agentx-postgres-prod psql -U agentx_user -d postgres -c "DROP DATABASE agentx_db;"
docker exec -t agentx-postgres-prod psql -U agentx_user -d postgres -c "CREATE DATABASE agentx_db;"

# Khôi phục dữ liệu từ file sql
docker exec -i agentx-postgres-prod psql -U agentx_user -d agentx_db < /opt/agentx/backups/agentx_db_backup_xxxxxxxx_xxxxxx.sql
```

### 5.3 Sao lưu Redis
Redis được sử dụng chủ yếu để lưu cache và session. Trong trường hợp cần backup Redis database:

```bash
# Yêu cầu Redis ghi dữ liệu ra đĩa (RDB file)
docker exec -t agentx-redis-prod redis-cli SAVE

# Sao chép file dump.rdb ra thư mục lưu trữ
docker cp agentx-redis-prod:/data/dump.rdb /opt/agentx/backups/redis_dump.rdb
```

---

## 6. Monitoring & Troubleshooting (Giám sát & Xử lý lỗi)

### 6.1 Giám sát tài nguyên
- **Logs**: Sử dụng `docker compose logs -f [service_name]` để xem log realtime.
- **CPU & RAM**: Sử dụng lệnh `docker stats` để kiểm tra tài nguyên của các container.
- **OpenTelemetry / Prometheus**: Nếu hệ thống được tích hợp Grafana, theo dõi các dashboard:
  - CPU/Memory Usage của VM.
  - HTTP Request Latency và Rate Limiting của API Gateway.
  - Tần suất lỗi 5xx trên backend.

### 6.2 Các sự cố thường gặp (Troubleshooting)

| Sự cố | Nguyên nhân | Cách khắc phục |
|-------|------------|----------------|
| **Không kết nối được Database** | Mật khẩu sai, host không khớp hoặc Container DB chưa up | Kiểm tra lại thông số `DATABASE_URL` trong `.env`. Chạy `docker compose ps` kiểm tra xem postgres có bị restart liên tục không. |
| **API bị crash (loop restart)** | Thiếu biến môi trường bắt buộc | Chạy `docker compose logs api` để tìm dòng log báo lỗi validation config (ví dụ: `Config validation error`). Bổ sung biến môi trường thiếu vào `.env`. |
| **SSE Stream bị đứt / buffering** | Nginx buffering đang được bật | Trong file config Nginx proxy, cấu hình `proxy_buffering off;` và `proxy_cache off;` cho path `/api/chat`. |
| **Lỗi "Access Token Expired" liên tục** | Thời gian máy chủ lệch | Đồng bộ thời gian máy chủ đích thông qua NTP: `sudo timedatectl set-ntp on`. |

---

*Last updated: 2026-06-06*
*Version: 1.0.0 — Production Ready*
