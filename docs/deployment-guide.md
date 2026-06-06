# Docker Deployment Guide

Tài liệu này hướng dẫn chi tiết cách đóng gói dưới dạng container (Dockerization) và triển khai toàn bộ hệ thống AgentX bằng **Docker** và **Docker Compose**. Hệ thống bao gồm 4 thành phần chính:
1. **Frontend**: Next.js 15 (cấu hình Standalone build để giảm dung lượng image).
2. **Backend**: NestJS (cấu hình Multi-stage build tách biệt môi trường builder và runner).
3. **Database**: PostgreSQL 16 tích hợp sẵn extension `pgvector` phục vụ tìm kiếm Vector (RAG).
4. **Cache / Session Store**: Redis 7.

---

## 1. Dockerfile cho các Thành phần

### 1.1 Backend Dockerfile (`apps/api/Dockerfile`)
Sử dụng mô hình **Multi-stage build** để loại bỏ các devDependencies và các file mã nguồn TS gốc trong image chạy cuối cùng, giúp giảm dung lượng image và tăng tính bảo mật.

```dockerfile
# Stage 1: Build & Compile TypeScript
FROM node:24.16-alpine AS builder
WORKDIR /usr/src/app

# Cài đặt pnpm phiên bản 10.13.1
RUN npm install -g pnpm@10.13.1

# Cài đặt công cụ build cần thiết (nếu có native modules)
RUN apk add --no-cache python3 make g++

# Copy package files để leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy toàn bộ mã nguồn và build
COPY . .
RUN pnpm run build

# Stage 2: Production Run
FROM node:24.16-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Cài đặt pnpm
RUN npm install -g pnpm@10.13.1

# Chỉ cài đặt production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy sản phẩm đã compile từ builder
COPY --from=builder /usr/src/app/dist ./dist

# Mở port cho Backend (mặc định 8000)
EXPOSE 8000

# Khởi chạy ứng dụng
CMD ["node", "dist/main.js"]
```

---

### 1.2 Frontend Dockerfile (`apps/web/Dockerfile`)
Next.js 15 hỗ trợ tính năng xuất bản độc lập (`output: "standalone"`). Cơ chế này tự động gom tất cả code và node_modules tối thiểu cần thiết để chạy server vào một thư mục duy nhất, giảm dung lượng image từ ~1GB xuống còn **~120MB**.

*Trước khi build, hãy chắc chắn cấu hình `next.config.ts` (hoặc `next.config.js`) có chứa:*
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Bắt buộc để chạy trên Docker tối ưu
};

export default nextConfig;
```

#### Dockerfile tối ưu cho Frontend:
```dockerfile
# Stage 1: Cài đặt dependencies
FROM node:24.16-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10.13.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build Next.js app
FROM node:24.16-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.13.1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Chèn các biến môi trường cần thiết tại thời điểm build (Build-time Env)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm run build

# Stage 3: Runner image gọn nhẹ
FROM node:24.16-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Bảo mật: Không chạy container bằng quyền root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy tài nguyên tĩnh và cấu hình standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Chạy Next.js standalone server
CMD ["node", "server.js"]
```

---

## 2. Triển khai Môi trường Phát triển (Development)

Trong môi trường local, ta sử dụng Docker Compose để chạy database, cache, đồng thời ánh xạ mã nguồn từ máy chủ (volume mount) vào container để phục vụ tính năng Hot-Reload (Live reload).

### 2.1 File cấu hình `docker-compose.yml` (Dev)
Tạo file `docker-compose.yml` ở thư mục gốc của dự án (`agentx/`):

```yaml
version: '3.8'

services:
  # 1. Database PostgreSQL tích hợp pgvector
  postgres:
    image: pgvector/pgvector:pg16
    container_name: agentx-postgres-dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: agentx_user
      POSTGRES_PASSWORD: agentx_secure_password
      POSTGRES_DB: agentx_db
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
    networks:
      - agentx-network
    restart: unless-stopped

  # 2. Redis Caching & Session
  redis:
    image: redis:7-alpine
    container_name: agentx-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redisdata-dev:/data
    networks:
      - agentx-network
    restart: unless-stopped

  # 3. Backend Service (NestJS)
  backend:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: agentx-backend-dev
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=agentx_user
      - DATABASE_PASSWORD=agentx_secure_password
      - DATABASE_NAME=agentx_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - ADMIN_DEFAULT_EMAIL=admin@agentx.local
      - ADMIN_DEFAULT_PASSWORD=Admin@123456
      - JWT_ACCESS_SECRET=dev_access_secret_key_123
      - JWT_REFRESH_SECRET=dev_refresh_secret_key_456
      - LLM_SMART_PROVIDER=anthropic
      - LLM_SMART_MODEL=claude-3-5-sonnet-20241022
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./apps/api:/usr/src/app
      - /usr/src/app/node_modules
    depends_on:
      - postgres
      - redis
    networks:
      - agentx-network
    command: pnpm run start:dev

  # 4. Frontend Service (Next.js)
  frontend:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:8000
    container_name: agentx-frontend-dev
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    networks:
      - agentx-network
    command: pnpm dev

volumes:
  pgdata-dev:
  redisdata-dev:

networks:
  agentx-network:
    driver: bridge
```

### 2.2 Các bước khởi chạy môi trường Dev:
1. Đảm bảo bạn đã khai báo API keys trong file `.env` ở máy host (thư mục gốc):
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxx...
   ```
2. Khởi chạy toàn bộ hệ thống bằng lệnh:
   ```bash
   docker compose up --build
   ```
3. Truy cập:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`
   - Đăng nhập Admin: `admin@agentx.local` / `Admin@123456`

---

## 3. Triển khai Môi trường Vận hành (Production)

Trong môi trường Production, các container được cấu hình bảo mật hơn, tối ưu tài nguyên, không mount code trực tiếp và tự động khởi động lại nếu gặp sự cố.

### 3.1 File cấu hình `docker-compose.prod.yml`
Tạo file `docker-compose.prod.yml` để chạy trên server:

```yaml
version: '3.8'

services:
  # Database PostgreSQL + pgvector
  postgres:
    image: pgvector/pgvector:pg16
    container_name: agentx-postgres-prod
    environment:
      POSTGRES_USER: ${PROD_DB_USER}
      POSTGRES_PASSWORD: ${PROD_DB_PASSWORD}
      POSTGRES_DB: agentx_prod_db
    volumes:
      - pgdata-prod:/var/lib/postgresql/data
    networks:
      - agentx-prod-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    restart: always

  # Redis Cache & Session
  redis:
    image: redis:7-alpine
    container_name: agentx-redis-prod
    command: redis-server --requirepass ${PROD_REDIS_PASSWORD}
    volumes:
      - redisdata-prod:/data
    networks:
      - agentx-prod-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
    restart: always

  # Backend API
  backend:
    image: agentx-backend:latest
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: agentx-backend-prod
    expose:
      - "8000"
    environment:
      - PORT=8000
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=${PROD_DB_USER}
      - DATABASE_PASSWORD=${PROD_DB_PASSWORD}
      - DATABASE_NAME=agentx_prod_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${PROD_REDIS_PASSWORD}
      - ADMIN_DEFAULT_EMAIL=${ADMIN_EMAIL}
      - ADMIN_DEFAULT_PASSWORD=${ADMIN_PASSWORD}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - LLM_SMART_PROVIDER=${LLM_PROVIDER}
      - LLM_SMART_MODEL=${LLM_MODEL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - agentx-prod-network
    restart: always

  # Frontend Chat UI & Admin Portal
  frontend:
    image: agentx-frontend:latest
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${PUBLIC_API_URL}
    container_name: agentx-frontend-prod
    expose:
      - "3000"
    environment:
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_API_URL=${PUBLIC_API_URL}
    depends_on:
      - backend
    networks:
      - agentx-prod-network
    restart: always

  # Nginx Reverse Proxy (Định tuyến & Cấp SSL Certbot)
  nginx:
    image: nginx:alpine
    container_name: agentx-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - frontend
      - backend
    networks:
      - agentx-prod-network
    restart: always

volumes:
  pgdata-prod:
  redisdata-prod:

networks:
  agentx-prod-network:
    driver: bridge
```

### 3.2 Cấu hình Nginx (`nginx.conf`)
File cấu hình Nginx điều hướng request từ cổng `80`/`443`:
- `/api/*` và `/socket.io/*` chuyển tiếp đến **Backend Container** (port 8000).
- Tất cả các request còn lại chuyển tiếp đến **Frontend Container** (port 3000).

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream fe_server {
        server frontend:3000;
    }

    upstream be_server {
        server backend:8000;
    }

    server {
        listen 80;
        server_name agentx.twendee.com; # Thay thế bằng domain thực tế

        # Redirect HTTP sang HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name agentx.twendee.com;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;

        # Frontend Static and Pages
        location / {
            proxy_pass http://fe_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend HTTP API
        location /api/ {
            proxy_pass http://be_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Real-time WebSocket Gateway
        location /socket.io/ {
            proxy_pass http://be_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }
    }
}
```

### 3.3 Hướng dẫn vận hành trên Production:
1. Chuẩn bị file `.env.prod` chứa các thông tin bảo mật.
2. Khởi chạy toàn bộ hệ thống bằng Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```
3. Xem logs hệ thống:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```
4. Kiểm tra sức khỏe các Container (Health Check):
   - Backend API: `curl http://localhost:8000/api/health`
   - Frontend UI: `curl http://localhost:3000`

5. Chạy Database Migration (Drizzle ORM):
   Hệ thống được cấu hình tự động kiểm tra và chạy migration khi backend container khởi động. Tuy nhiên, bạn cũng có thể kích hoạt thủ công bằng lệnh:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend pnpm drizzle-kit migrate
   ```
