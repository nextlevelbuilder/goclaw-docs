> Bản dịch từ [English version](../../deployment/docker-compose.md)

# Docker Compose Deployment

> GoClaw cung cấp 9 file compose — một file base và 8 overlay để bạn kết hợp linh hoạt tùy theo stack cần triển khai.

## Tổng quan

Cấu trúc compose được thiết kế theo module. Bạn luôn bắt đầu với `docker-compose.yml` (base) và chồng thêm các overlay bằng `-f`. Mỗi overlay chỉ mở rộng hoặc ghi đè những gì cần thiết.

```
docker-compose.yml            # Base: binary goclaw, ports, volumes, security hardening
docker-compose.postgres.yml   # PostgreSQL 18 + pgvector
docker-compose.selfservice.yml # Web dashboard UI (nginx + React, port 3000)
docker-compose.sandbox.yml    # Docker-in-Docker sandbox cho agent thực thi code
docker-compose.browser.yml    # Headless Chrome sidecar (CDP, port 9222)
docker-compose.otel.yml       # Jaeger cho OpenTelemetry trace visualization
docker-compose.tailscale.yml  # Tailscale tsnet để truy cập từ xa an toàn
docker-compose.upgrade.yml    # One-shot DB migration runner
docker-compose.vnstock-mcp.yml # Ví dụ: vnstock MCP sidecar (community overlay)
```

---

## Các cấu hình mẫu

### Tối giản — chỉ core + PostgreSQL

Không dashboard, không sandbox. Phù hợp cho các triển khai headless/API-only.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

### Chuẩn — + dashboard + sandbox

Điểm khởi đầu được khuyến nghị cho hầu hết các self-hosted setup.

```bash
# 1. Build sandbox image trước (một lần duy nhất)
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .

# 2. Khởi động stack
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  up -d --build
```

Dashboard: [http://localhost:3000](http://localhost:3000)

### Chuẩn + browser automation

Thêm headless Chrome sidecar cho browser tool.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.browser.yml \
  up -d --build
```

### Full — bao gồm cả OTel tracing

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  -f docker-compose.otel.yml \
  up -d --build
```

Jaeger UI: [http://localhost:16686](http://localhost:16686)

---

## Tham chiếu Overlay

### `docker-compose.postgres.yml`

Khởi động `pgvector/pgvector:pg18` kèm health check và tự động cấu hình `GOCLAW_POSTGRES_DSN`. GoClaw chờ health check trước khi khởi động.

Biến môi trường (đặt trong `.env` hoặc shell):

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `POSTGRES_USER` | `goclaw` | Database user |
| `POSTGRES_PASSWORD` | `goclaw` | Mật khẩu database — **đổi khi production** |
| `POSTGRES_DB` | `goclaw` | Tên database |
| `POSTGRES_PORT` | `5432` | Host port để expose |

### `docker-compose.selfservice.yml`

Build React SPA từ `ui/web/` và serve qua nginx trên port 3000.

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GOCLAW_UI_PORT` | `3000` | Host port cho dashboard |

### `docker-compose.sandbox.yml`

Mount `/var/run/docker.sock` để GoClaw có thể tạo container cô lập cho agent thực thi shell. Cần build sandbox image trước.

> **Lưu ý bảo mật:** Mount Docker socket cho container quyền kiểm soát Docker trên host. Chỉ dùng trong môi trường tin cậy.

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GOCLAW_SANDBOX_MODE` | `all` | `off`, `non-main`, hoặc `all` |
| `GOCLAW_SANDBOX_IMAGE` | `goclaw-sandbox:bookworm-slim` | Image dùng cho sandbox container |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `rw` | `none`, `ro`, hoặc `rw` |
| `GOCLAW_SANDBOX_SCOPE` | `session` | `session`, `agent`, hoặc `shared` |
| `GOCLAW_SANDBOX_MEMORY_MB` | `512` | Giới hạn bộ nhớ mỗi sandbox container |
| `GOCLAW_SANDBOX_CPUS` | `1.0` | Giới hạn CPU mỗi sandbox container |
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | `300` | Thời gian thực thi tối đa (giây) |
| `GOCLAW_SANDBOX_NETWORK` | `false` | Bật truy cập mạng trong sandbox |
| `DOCKER_GID` | `999` | GID của group `docker` trên host |

### `docker-compose.browser.yml`

Khởi động `zenika/alpine-chrome:124` với CDP trên port 9222. GoClaw kết nối qua `GOCLAW_BROWSER_REMOTE_URL=ws://chrome:9222`.

### `docker-compose.otel.yml`

Khởi động Jaeger (`jaegertracing/all-in-one:1.68.0`) và rebuild GoClaw với build arg `ENABLE_OTEL=true` để bật OTel exporter.

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GOCLAW_TELEMETRY_ENABLED` | `true` | Bật OTel export |
| `GOCLAW_TELEMETRY_ENDPOINT` | `jaeger:4317` | OTLP gRPC endpoint |
| `GOCLAW_TELEMETRY_PROTOCOL` | `grpc` | `grpc` hoặc `http` |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | `goclaw-gateway` | Tên service trong traces |

### `docker-compose.tailscale.yml`

Rebuild với `ENABLE_TSNET=true` để nhúng Tailscale trực tiếp vào binary (không cần sidecar).

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `GOCLAW_TSNET_AUTH_KEY` | Có | Tailscale auth key từ admin console |
| `GOCLAW_TSNET_HOSTNAME` | Không (mặc định: `goclaw-gateway`) | Tên thiết bị trên tailnet |

### `docker-compose.upgrade.yml`

Service one-shot chạy `goclaw upgrade` rồi thoát. Dùng để áp dụng database migration mà không cần downtime.

```bash
# Xem trước thay đổi (dry-run)
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --dry-run

# Áp dụng upgrade
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# Kiểm tra trạng thái migration
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --status
```

---

## Volumes

| Volume | Mount path | Nội dung |
|--------|-----------|----------|
| `goclaw-data` | `/app/data` | `config.json` và runtime data |
| `goclaw-workspace` | `/app/workspace` hoặc `/app/.goclaw` | Agent workspaces |
| `goclaw-skills` | `/app/skills` | Skill files |
| `postgres-data` | `/var/lib/postgresql` | Dữ liệu PostgreSQL |
| `tsnet-state` | `/app/tsnet-state` | Tailscale node state |

---

## Base Container Hardening

File `docker-compose.yml` base áp dụng các cài đặt bảo mật sau cho service `goclaw`:

```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
read_only: true
tmpfs:
  - /tmp:rw,noexec,nosuid,size=256m
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '2.0'
      pids: 200
```

> Sandbox overlay (`docker-compose.sandbox.yml`) ghi đè `cap_drop` và `security_opt` vì Docker socket cần quyền mở rộng hơn.

---

## Quy trình Update / Upgrade

```bash
# 1. Pull image mới nhất / rebuild code
docker compose -f docker-compose.yml -f docker-compose.postgres.yml pull

# 2. Chạy DB migration trước khi khởi động binary mới
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# 3. Khởi động lại stack
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build
```

---

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `goclaw` thoát ngay khi khởi động | PostgreSQL chưa sẵn sàng | Postgres overlay đã có health check dependency; đảm bảo bạn include nó |
| Sandbox container không khởi động được | Docker socket chưa mount hoặc GID sai | Thêm sandbox overlay và đặt `DOCKER_GID` khớp với `stat -c %g /var/run/docker.sock` |
| Dashboard trả về 502 | Service `goclaw` chưa healthy | Kiểm tra `docker compose logs goclaw`; dashboard phụ thuộc vào goclaw |
| OTel traces không hiện trong Jaeger | Binary build thiếu `ENABLE_OTEL=true` | Thêm flag `--build` khi dùng otel overlay; nó sẽ rebuild với build arg |
| Port 5432 đã bị chiếm | Postgres local đang chạy | Đặt `POSTGRES_PORT=5433` trong `.env` |

---

## Tiếp theo

- [Database Setup](./database-setup.md) — cài đặt PostgreSQL thủ công và migration
- [Security Hardening](./security-hardening.md) — tổng quan bảo mật 5 lớp
- [Observability](./observability.md) — cấu hình OpenTelemetry và Jaeger
- [Tailscale](./tailscale.md) — truy cập từ xa an toàn qua Tailscale
