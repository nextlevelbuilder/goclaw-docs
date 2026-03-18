> Bản dịch từ [English version](#installation)

# Cài đặt

> Cài GoClaw và chạy được trên máy của bạn trong vài phút. Bốn cách: cài binary nhanh, cài trực tiếp, Docker (local), hoặc Docker trên VPS.

## Tổng quan

GoClaw biên dịch thành một binary tĩnh duy nhất (~25 MB). Chọn cách phù hợp với bạn:

| Cách | Phù hợp cho | Yêu cầu |
|------|-------------|---------|
| Cài nhanh (Binary) | Setup một lệnh nhanh nhất trên Linux/macOS | curl, PostgreSQL |
| Cài trực tiếp | Developer muốn kiểm soát hoàn toàn | Go 1.26+, PostgreSQL 15+ với pgvector |
| Docker (Local) | Chạy tất cả qua Docker Compose | Docker + Docker Compose |
| VPS (Production) | Triển khai production tự host | VPS $5+, Docker |

---

## Cách 1: Cài nhanh (Binary)

Tải và cài binary GoClaw mới nhất chỉ với một lệnh. Không cần cài Go toolchain.

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash
```

**Nền tảng hỗ trợ:** Linux và macOS, cả `amd64` và `arm64`.

**Tùy chọn:**

```bash
# Cài một phiên bản cụ thể
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --version v1.30.0

# Cài vào thư mục tùy chỉnh (mặc định: /usr/local/bin)
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --dir /opt/goclaw
```

Script tự động nhận diện OS và kiến trúc, tải release tarball phù hợp từ GitHub và cài binary. Tự động dùng `sudo` nếu thư mục đích không có quyền ghi.

### Sau khi cài: thiết lập PostgreSQL

```bash
# Khởi động PostgreSQL với pgvector (Docker là cách đơn giản nhất)
docker run -d --name goclaw-pg \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=goclaw \
  pgvector/pgvector:pg18
```

### Chạy wizard thiết lập

```bash
export GOCLAW_POSTGRES_DSN='postgres://postgres:goclaw@localhost:5432/postgres?sslmode=disable'
goclaw onboard
```

Wizard chạy migrations, tạo secrets và lưu tất cả vào `.env.local`.

```bash
source .env.local && goclaw
```

---

## Cách 2: Cài trực tiếp

Cài GoClaw trực tiếp trên máy. Bạn tự quản lý Go, PostgreSQL và binary.

### Bước 1: Cài PostgreSQL + pgvector

GoClaw yêu cầu **PostgreSQL 15+** với extension **pgvector** (dùng cho tìm kiếm vector trong memory và skills). Triển khai qua Docker sử dụng **PostgreSQL 18** với pgvector (image `pgvector/pgvector:pg18`).

<details>
<summary><strong>Ubuntu 24.04+ / Debian 12+</strong></summary>

```bash
sudo apt update
sudo apt install -y postgresql postgresql-common

# Cài pgvector (thay 18 bằng phiên bản PG của bạn — kiểm tra bằng: pg_config --version)
sudo apt install -y postgresql-18-pgvector

# Tạo database và bật extension
sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> **Lưu ý:** Ubuntu 22.04 trở xuống đi kèm PostgreSQL 14, không được hỗ trợ. Vui lòng nâng cấp lên Ubuntu 24.04+ hoặc sử dụng cách cài bằng Docker.

</details>

<details>
<summary><strong>macOS (Homebrew)</strong></summary>

```bash
brew install postgresql pgvector
brew services start postgresql
createdb goclaw
psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

<details>
<summary><strong>Fedora / RHEL</strong></summary>

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo dnf install -y postgresql-devel git make gcc
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

**Kiểm tra cài đặt:**

```bash
psql -d goclaw -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
# Kết quả: vector | 0.x.x
```

> Trên Linux, thêm `sudo -u postgres` phía trước nếu user của bạn không có quyền truy cập database trực tiếp.

### Bước 2: Clone & Build

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw
go build -o goclaw .
./goclaw version
```

> **Python runtime (tùy chọn):** Một số skills tích hợp yêu cầu Python 3. Cài bằng `sudo apt install -y python3 python3-pip` (Ubuntu/Debian) hoặc `brew install python` (macOS) nếu bạn muốn dùng các skills đó.

**Build Tags (Tùy chọn):** Bật thêm tính năng tại thời điểm biên dịch:

```bash
go build -tags otel -o goclaw .              # OpenTelemetry tracing
go build -tags tsnet -o goclaw .             # Tailscale networking
go build -tags redis -o goclaw .             # Redis caching
go build -tags "otel,tsnet" -o goclaw .      # Kết hợp nhiều tag
```

### Bước 3: Chạy wizard thiết lập

```bash
./goclaw onboard
```

Wizard hướng dẫn bạn qua:
1. **Kết nối database** — nhập host, port, tên database, username, password (nhấn Enter để dùng giá trị mặc định cho PostgreSQL local)
2. **Kiểm tra kết nối** — xác nhận PostgreSQL hoạt động
3. **Migrations** — tạo các bảng cần thiết tự động
4. **Tạo khóa bảo mật** — tự động tạo `GOCLAW_GATEWAY_TOKEN` và `GOCLAW_ENCRYPTION_KEY`
5. **Lưu secrets** — ghi tất cả vào `.env.local`

### Bước 4: Khởi động gateway

```bash
source .env.local && ./goclaw
```

### Bước 5: Mở Dashboard

Dashboard là ứng dụng React riêng biệt. Mở terminal mới:

```bash
cd ui/web
cp .env.example .env    # Bắt buộc — cấu hình kết nối tới backend
pnpm install
pnpm dev
```

Mở `http://localhost:5173` và đăng nhập:
- **User ID:** `system`
- **Gateway Token:** lấy từ file `.env.local` (dòng `GOCLAW_GATEWAY_TOKEN`)

Sau khi đăng nhập, làm theo hướng dẫn [Quick Start](#quick-start) để thêm LLM provider, tạo agent đầu tiên và bắt đầu chat.

---

## Cách 3: Docker (Local)

Chạy GoClaw với Docker Compose — đã bao gồm PostgreSQL và web dashboard.

> **Lưu ý:** Setup này đã bao gồm PostgreSQL tự động qua `docker-compose.postgres.yml`. Bạn không cần cài riêng.

### Bước 1: Clone & cấu hình

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Tự động tạo encryption key + gateway token
./prepare-env.sh
```

### Bước 2: Khởi động services

GoClaw dùng các file Docker Compose theo module:
- `docker-compose.yml` — GoClaw gateway và API server chính
- `docker-compose.postgres.yml` — PostgreSQL database với pgvector extension
- `docker-compose.selfservice.yml` — Web dashboard UI (port 3000)

Bạn cần cả ba file cho một setup local đầy đủ. Nếu chỉ muốn gateway không có dashboard, có thể bỏ file selfservice.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  up -d --build
```

Lệnh này khởi động:
- **GoClaw gateway** — `ws://localhost:18790`
- **PostgreSQL** với pgvector — port `5432`
- **Web Dashboard** — `http://localhost:3000`

GoClaw tự động chạy pending database migrations mỗi lần khởi động. Không cần chạy `goclaw onboard` hay `goclaw migrate` thủ công.

Mở `http://localhost:3000` và đăng nhập:
- **User ID:** `system`
- **Gateway Token:** tìm trong `.env` (dòng `GOCLAW_GATEWAY_TOKEN`)

Sau khi đăng nhập, làm theo hướng dẫn [Quick Start](#quick-start) để thêm LLM provider, tạo agent đầu tiên và bắt đầu chat.

### Tiện ích mở rộng

Thêm khả năng với các file Docker Compose overlay:

| File overlay | Tính năng thêm vào |
|---|---|
| `docker-compose.sandbox.yml` | Code sandbox để chạy script trong môi trường cách ly |
| `docker-compose.tailscale.yml` | Truy cập từ xa an toàn qua Tailscale |
| `docker-compose.otel.yml` | OpenTelemetry tracing (Jaeger UI trên `:16686`) |
| `docker-compose.redis.yml` | Redis caching layer |
| `docker-compose.browser.yml` | Browser automation (Chrome sidecar) |
| `docker-compose.upgrade.yml` | Database upgrade service |

Thêm bất kỳ overlay nào bằng `-f` khi khởi động services:

```bash
# Ví dụ: thêm Redis caching
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.redis.yml \
  up -d --build
```

> **Lưu ý:** Overlay Redis và OTel yêu cầu rebuild image GoClaw với build args tương ứng (`ENABLE_REDIS=true`, `ENABLE_OTEL=true`). Xem chi tiết trong các file overlay.

> **Python runtime:** File `docker-compose.yml` mặc định build GoClaw với `ENABLE_PYTHON: "true"`, nên các skills dùng Python hoạt động sẵn khi dùng Docker.

---

## Cách 4: VPS (Production)

Triển khai GoClaw trên VPS với Docker. Phù hợp cho setup chạy liên tục, truy cập qua internet.

> **Lưu ý:** PostgreSQL chạy bên trong Docker. Compose file xử lý việc thiết lập — bạn không cần cài trên hệ thống VPS.

### Yêu cầu

- **VPS**: Tối thiểu 1 vCPU, 1 GB RAM (gói $5 đủ dùng). Khuyến nghị 2 vCPU / 2 GB cho workload nặng.
- **OS**: Ubuntu 24.04+ hoặc Debian 12+
- **Tên miền** (tùy chọn): Để dùng HTTPS/SSL qua reverse proxy

### Bước 1: Thiết lập server

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Docker (script chính thức — đã bao gồm Compose plugin)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Đăng xuất rồi đăng nhập lại để áp dụng thay đổi group
```

### Bước 2: Tường lửa

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable
```

### Bước 3: Tạo thư mục & Clone

```bash
sudo mkdir -p /opt/goclaw
sudo chown $(whoami):$(whoami) /opt/goclaw
git clone https://github.com/nextlevelbuilder/goclaw.git /opt/goclaw
cd /opt/goclaw

# Tự động tạo secrets
./prepare-env.sh
```

### Bước 4: Khởi động services

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  up -d --build
```

GoClaw tự động chạy pending database migrations mỗi lần khởi động. Không cần chạy `goclaw onboard` hay `goclaw migrate` thủ công.

### Bước 4.5: Kiểm tra services đã chạy

Trước khi cài reverse proxy, hãy xác nhận mọi thứ đang chạy:

```bash
docker compose ps
# Tất cả services phải hiển thị "Up"

docker compose logs goclaw | grep "gateway starting"
# Phải thấy: "goclaw gateway starting"
```

### Bước 5: Reverse Proxy với SSL

**Cấu hình DNS:** Tạo 2 bản ghi A trỏ về IP VPS:

| Bản ghi | Loại | Giá trị |
|---------|------|---------|
| `yourdomain.com` | A | `IP_VPS_CỦA_BẠN` |
| `ws.yourdomain.com` | A | `IP_VPS_CỦA_BẠN` |

**Caddy (Khuyến nghị):**

```bash
sudo apt install -y caddy
```

Tạo file `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}

ws.yourdomain.com {
    reverse_proxy localhost:18790
}
```

```bash
sudo systemctl reload caddy
```

Caddy tự động cấp chứng chỉ SSL qua Let's Encrypt.

**Nginx:**

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Tạo file `/etc/nginx/sites-available/goclaw`:

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
    }
}

server {
    server_name ws.yourdomain.com;
    location / {
        proxy_pass http://localhost:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/goclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d ws.yourdomain.com
```

### Bước 6: Sao lưu (Khuyến nghị)

Thêm cron job sao lưu PostgreSQL hàng ngày:

```bash
sudo mkdir -p /backup
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/goclaw && docker compose -f docker-compose.yml -f docker-compose.postgres.yml exec -T postgres pg_dump -U goclaw goclaw | gzip > /backup/goclaw-\$(date +\%Y\%m\%d).sql.gz") | crontab -
```

---

## Kiểm tra cài đặt

Áp dụng cho cả ba cách:

```bash
# Health check
curl http://localhost:18790/health
# Kết quả mong đợi: {"status":"ok"}

# Docker logs (cách Docker/VPS)
docker compose logs goclaw
# Tìm dòng: "goclaw gateway starting"

# Kiểm tra chẩn đoán (cách cài trực tiếp)
./goclaw doctor
```

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| `go: module requires Go >= 1.26` | Cập nhật Go: `go install golang.org/dl/go1.26@latest` |
| `pgvector extension not found` | Chạy `CREATE EXTENSION vector;` trong database goclaw |
| Port 18790 đã được dùng | Đặt `GOCLAW_PORT=18791` trong `.env` (Docker) hoặc `.env.local` (cài trực tiếp) |
| Docker build thất bại trên ARM Mac | Bật Rosetta trong Docker Desktop settings |
| `no provider API key found` | Thêm LLM provider & API key qua Dashboard |
| `encryption key not set` | Chạy `./goclaw onboard` (cài trực tiếp) hoặc `./prepare-env.sh` (Docker) |
| `Cannot connect to the Docker daemon` | Khởi động Docker Desktop trước: `open -a Docker` (macOS) hoặc `sudo systemctl start docker` (Linux) |

## Tiếp theo

- [Quick Start](#quick-start) — Chạy agent đầu tiên của bạn
- [Configuration](#configuration) — Tùy chỉnh cài đặt GoClaw

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
