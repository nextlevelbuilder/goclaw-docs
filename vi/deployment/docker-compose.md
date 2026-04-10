> Bản dịch từ [English version](/deploy-docker-compose)

# Docker Compose Deployment

> GoClaw cung cấp cấu trúc docker-compose có thể kết hợp: một file base, thư mục `compose.d/` chứa các overlay luôn hoạt động, và thư mục `compose.options/` chứa các overlay tùy chọn để bạn chọn lựa.

> **Tự động upgrade khi khởi động:** Docker entrypoint tự động chạy `goclaw upgrade` trước khi khởi động gateway. Điều này áp dụng các database migration đang chờ, nên bạn không cần bước upgrade riêng cho các triển khai đơn giản. Với môi trường production, hãy cân nhắc chạy upgrade overlay riêng trước.

## Tổng quan

Cấu trúc compose được thiết kế theo module. File `docker-compose.yml` base định nghĩa service `goclaw` cốt lõi. Các overlay trong `compose.d/` được tự động lắp ghép. Các overlay trong `compose.options/` có thể copy vào `compose.d/` để kích hoạt.

### `compose.d/` — overlay luôn hoạt động

Các file trong `compose.d/` được `prepare-compose.sh` tải tự động (theo thứ tự tên file):

```
compose.d/
  00-goclaw.yml        # Định nghĩa service cốt lõi
  11-postgres.yml      # PostgreSQL 18 + pgvector
  12-selfservice.yml   # Web dashboard UI (nginx + React, port 3000)
  13-upgrade.yml       # One-shot DB migration runner
  14-browser.yml       # Headless Chrome sidecar (CDP, port 9222)
  15-otel.yml          # Jaeger cho OpenTelemetry trace visualization
  16-redis.yml         # Redis 7 cache backend
  17-sandbox.yml       # Docker-in-Docker sandbox cho agent thực thi code
  18-tailscale.yml     # Tailscale tsnet để truy cập từ xa an toàn
```

### `compose.options/` — overlay tùy chọn

Thư mục `compose.options/` chứa các file overlay tham chiếu. Copy file bạn muốn vào `compose.d/` để kích hoạt.

### `prepare-compose.sh` — tạo COMPOSE_FILE

Chạy script này một lần sau khi thay đổi `compose.d/` để cập nhật biến `COMPOSE_FILE` trong `.env`:

```bash
./prepare-compose.sh
```

Script đọc tất cả file `compose.d/*.yml` (theo thứ tự), kiểm tra config bằng `docker compose config`, và ghi giá trị `COMPOSE_FILE` vào `.env`. Docker Compose tự động đọc `COMPOSE_FILE` trong mỗi lệnh `docker compose`.

```bash
# Các flag
./prepare-compose.sh --quiet             # ẩn output
./prepare-compose.sh --skip-validation   # bỏ qua kiểm tra config
```

> **podman-compose:** Không đọc `COMPOSE_FILE` tự động. Chạy `source .env` trước mỗi lệnh `podman-compose`.

---

## Các cấu hình mẫu

### Thiết lập lần đầu

Chạy script chuẩn bị môi trường để tự động tạo các secret cần thiết:

```bash
./prepare-env.sh
```

Script này tạo `.env` từ `.env.example` và tự động sinh `GOCLAW_ENCRYPTION_KEY` và `GOCLAW_GATEWAY_TOKEN` nếu chưa có.

Tùy chọn thêm API key của LLM provider vào `.env` ngay, hoặc thêm sau qua web dashboard:

```env
GOCLAW_OPENROUTER_API_KEY=sk-or-xxxxx
# hoặc GOCLAW_ANTHROPIC_API_KEY=sk-ant-xxxxx
# hoặc bất kỳ GOCLAW_*_API_KEY nào khác
```

> **Docker vs bare metal:** Với Docker, cấu hình provider qua `.env` hoặc qua web dashboard sau khi khởi động. Wizard `goclaw onboard` chỉ dành cho bare metal — nó cần terminal tương tác và không chạy được trong container.

### Biến môi trường bắt buộc vs tùy chọn (Docker)

| Biến | Bắt buộc | Ghi chú |
|------|----------|---------|
| `GOCLAW_GATEWAY_TOKEN` | Có | Tự sinh bởi `prepare-env.sh` |
| `GOCLAW_ENCRYPTION_KEY` | Có | Tự sinh bởi `prepare-env.sh` |
| `GOCLAW_*_API_KEY` | Không | Key của LLM provider — đặt trong `.env` hoặc thêm qua dashboard. Cần có trước khi chat |
| `GOCLAW_AUTO_UPGRADE` | Khuyến nghị | Đặt `true` để tự chạy DB migration khi khởi động |
| `POSTGRES_USER` | Không | Mặc định: `goclaw` |
| `POSTGRES_PASSWORD` | Không | Mặc định: `goclaw` — **đổi cho production** |

> **Quan trọng:** Tất cả biến `GOCLAW_*` phải đặt trong file `.env`, không dùng prefix trước command (ví dụ `GOCLAW_AUTO_UPGRADE=true docker compose …` sẽ **không hoạt động** vì compose đọc từ `env_file`).

### Khởi động stack

Sau khi chạy `prepare-compose.sh`, khởi động stack bình thường — `COMPOSE_FILE` trong `.env` cho Docker Compose biết cần load file nào:

```bash
./prepare-compose.sh
docker compose up -d --build
```

Để thêm hoặc bỏ một thành phần, copy file từ `compose.options/` vào `compose.d/` (hoặc xóa đi), rồi chạy lại `prepare-compose.sh`.

### Tối giản — chỉ core + PostgreSQL

Chỉ giữ các file cần thiết trong `compose.d/`:

```
compose.d/00-goclaw.yml
compose.d/11-postgres.yml
compose.d/13-upgrade.yml
```

Sau đó:

```bash
./prepare-compose.sh && docker compose up -d --build
```

### Chuẩn — + dashboard + sandbox

```
compose.d/00-goclaw.yml
compose.d/11-postgres.yml
compose.d/12-selfservice.yml
compose.d/13-upgrade.yml
compose.d/17-sandbox.yml
```

```bash
# Build sandbox image trước (một lần duy nhất)
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .

./prepare-compose.sh && docker compose up -d --build
```

Dashboard: [http://localhost:3000](http://localhost:3000)

### Full — bao gồm cả OTel tracing

Thêm `compose.options/15-otel.yml` vào `compose.d/`, rồi:

```bash
./prepare-compose.sh && docker compose up -d --build
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

### `docker-compose.redis.yml`

Rebuild GoClaw với `ENABLE_REDIS=true` và khởi động Redis 7 Alpine với AOF persistence.

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GOCLAW_REDIS_DSN` | `redis://redis:6379/0` | Chuỗi kết nối Redis (tự động cấu hình) |

Build arg: `ENABLE_REDIS=true` — biên dịch Redis cache backend vào binary.

Volume: `redis-data` → `/data` (AOF persistence).

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

## Build Arguments

Đây là các flag biên dịch được truyền vào khi `docker build`. Mỗi flag bật một dependency tùy chọn.

| Build Arg | Mặc định | Tác dụng |
|-----------|----------|----------|
| `ENABLE_OTEL` | `false` | OpenTelemetry span exporter |
| `ENABLE_TSNET` | `false` | Tailscale networking |
| `ENABLE_REDIS` | `false` | Redis cache backend |
| `ENABLE_SANDBOX` | `false` | Docker CLI trong container (cho sandbox) |
| `ENABLE_PYTHON` | `false` | Python 3 runtime cho skills |
| `ENABLE_NODE` | `false` | Node.js runtime cho skills |
| `ENABLE_FULL_SKILLS` | `false` | Cài sẵn các skill dependency (pandas, pypdf, v.v.) |
| `ENABLE_CLAUDE_CLI` | `false` | Cài npm package `@anthropic-ai/claude-code` |
| `VERSION` | `dev` | Chuỗi semantic version |

---

## Phân tách đặc quyền (v3)

Từ v3, Docker image sử dụng **phân tách đặc quyền** qua `su-exec`:

```
docker-entrypoint.sh (chạy với quyền root)
  ├── Cài các apk package đã lưu (đọc /app/data/.runtime/apk-packages)
  ├── Khởi động pkg-helper với quyền root (Unix socket /tmp/pkg.sock, quyền 0660 root:goclaw)
  └── su-exec goclaw → khởi động /app/goclaw serve (hạ xuống non-root)
```

### pkg-helper

`pkg-helper` là một binary nhỏ có quyền root, xử lý quản lý package hệ thống thay mặt cho process `goclaw`. Nó lắng nghe trên Unix socket và nhận request cài đặt/gỡ bỏ Alpine package (`apk`). User `goclaw` không thể gọi `apk` trực tiếp nhưng có thể yêu cầu qua helper này.

Các Docker capability cần thiết khi dùng pkg-helper (được thêm mặc định trong cấu hình compose):

```yaml
cap_add:
  - SETUID
  - SETGID
  - CHOWN
  - DAC_OVERRIDE
```

> Nếu bạn ghi đè `cap_drop: ALL` trong cấu hình compose bảo mật cao, bạn phải thêm lại bốn capability này, nếu không pkg-helper sẽ lỗi và cài đặt package qua admin UI sẽ không hoạt động.

### Thư mục Runtime Package

Các package theo yêu cầu (pip/npm) cài qua admin UI được lưu vào data volume:

| Đường dẫn | Owner | Nội dung |
|-----------|-------|---------|
| `/app/data/.runtime/pip` | `goclaw` | Python package cài qua pip |
| `/app/data/.runtime/npm-global` | `goclaw` | npm global package |
| `/app/data/.runtime/pip-cache` | `goclaw` | pip download cache |
| `/app/data/.runtime/apk-packages` | `root:goclaw` | danh sách apk package đã lưu (0640) |

Các thư mục này tồn tại qua các lần tạo lại container vì chúng nằm trên volume `goclaw-data`.

---

## Volumes

| Volume | Mount path | Nội dung |
|--------|-----------|----------|
| `goclaw-data` | `/app/data` | `config.json` và runtime data |
| `goclaw-workspace` | `/app/workspace` hoặc `/app/.goclaw` | Agent workspaces |
| `goclaw-skills` | `/app/skills` | Skill files |
| `postgres-data` | `/var/lib/postgresql` | Dữ liệu PostgreSQL |
| `tsnet-state` | `/app/tsnet-state` | Tailscale node state |
| `redis-data` | `/data` | Redis AOF persistence |

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
docker compose pull

# 2. Chạy DB migration trước khi khởi động binary mới
docker compose run --rm upgrade

# 3. Khởi động lại stack
docker compose up -d --build
```

> `COMPOSE_FILE` trong `.env` (được đặt bởi `prepare-compose.sh`) đã bao gồm `13-upgrade.yml` tự động, nên không cần chỉ định `-f` thủ công.

---

## Các cách cài đặt khác

### Cài bằng binary (không dùng Docker)

Tải binary mới nhất trực tiếp:

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash

# Phiên bản cụ thể
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --version v1.19.1

# Thư mục tùy chỉnh
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --dir /opt/goclaw
```

Hỗ trợ Linux và macOS (amd64 và arm64).

### Cài đặt Docker tương tác

Script setup tự sinh `.env` và tạo lệnh compose phù hợp:

```bash
./scripts/setup-docker.sh              # Chế độ tương tác
./scripts/setup-docker.sh --variant full --with-ui   # Không tương tác
```

Variant: `alpine` (base), `node`, `python`, `full`. Thêm `--with-ui` để bật dashboard, `--dev` cho chế độ development với live reload.

---

## Docker Images dựng sẵn

Các image multi-arch (amd64 + arm64) chính thức được publish sau mỗi release lên cả hai registry:

| Registry | Gateway | Web Dashboard |
|----------|---------|--------------|
| Docker Hub | `digitop/goclaw` | `digitop/goclaw-web` |
| GHCR | `ghcr.io/nextlevelbuilder/goclaw` | `ghcr.io/nextlevelbuilder/goclaw-web` |

### Các tag variant

Image được chia thành **runtime variant** (những gì được cài sẵn) và **build-tag variant** (tính năng biên dịch sẵn):

**Runtime variants:**

| Tag | Node.js | Python | Skill deps | Trường hợp sử dụng |
|-----|---------|--------|------------|-------------------|
| `latest` / `vX.Y.Z` | — | — | — | Base tối giản (~50 MB) |
| `node` / `vX.Y.Z-node` | ✓ | — | — | Skill JS/TS |
| `python` / `vX.Y.Z-python` | — | ✓ | — | Skill Python |
| `full` / `vX.Y.Z-full` | ✓ | ✓ | ✓ | Tất cả skill dependency được cài sẵn |

**Build-tag variants:**

| Tag | OTel | Tailscale | Redis | Trường hợp sử dụng |
|-----|------|-----------|-------|-------------------|
| `otel` / `vX.Y.Z-otel` | ✓ | — | — | OpenTelemetry tracing |
| `tsnet` / `vX.Y.Z-tsnet` | — | ✓ | — | Truy cập từ xa qua Tailscale |
| `redis` / `vX.Y.Z-redis` | — | — | ✓ | Redis caching |

> **Mẹo:** Runtime variant và build-tag variant độc lập với nhau. Nếu cần Python + OTel, hãy build local với `ENABLE_PYTHON=true` và `ENABLE_OTEL=true`.

Ví dụ pull image:

```bash
# Bản tối giản mới nhất
docker pull digitop/goclaw:latest

# Với Python runtime
docker pull digitop/goclaw:python

# Full runtime (Node + Python + tất cả deps)
docker pull digitop/goclaw:full

# Với OTel tracing
docker pull ghcr.io/nextlevelbuilder/goclaw:otel
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
| `database schema is outdated` | Migration chưa chạy sau khi update | Thêm `GOCLAW_AUTO_UPGRADE=true` vào **file** `.env` (không dùng prefix trước command — compose đọc từ `env_file`), hoặc chạy upgrade overlay trước khi start |
| `network goclaw-net … incorrect label` | Docker network `goclaw-net` đã tồn tại với label xung đột | Chạy `docker network rm goclaw-net` rồi thử lại — Compose tự tạo network `goclaw-net` |

---

## Tiếp theo

- [Database Setup](/deploy-database) — cài đặt PostgreSQL thủ công và migration
- [Security Hardening](/deploy-security) — tổng quan bảo mật 5 lớp
- [Observability](/deploy-observability) — cấu hình OpenTelemetry và Jaeger
- [Tailscale](/deploy-tailscale) — truy cập từ xa an toàn qua Tailscale

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
