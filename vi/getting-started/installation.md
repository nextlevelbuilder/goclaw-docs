> Bản dịch từ [English version](../../getting-started/installation.md)

# Cài đặt

> Cài GoClaw và chạy được trên máy của bạn trong vài phút.

## Tổng quan

GoClaw biên dịch thành một binary tĩnh duy nhất. Bạn có thể build từ source, dùng Docker, hoặc tải bản release có sẵn. Chọn cách nào phù hợp với workflow của bạn.

## Yêu cầu

| Yêu cầu | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Go | 1.25+ | Chỉ cần khi build từ source |
| PostgreSQL | 15+ | Bắt buộc cho managed mode; cần extension `pgvector` |
| Docker | Mới nhất | Chỉ cần khi dùng Docker |

## Cách 1: Build từ source

```bash
# Clone repo
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Build binary
go build -o goclaw .

# Kiểm tra
./goclaw --version
```

Kết quả là một binary ~25 MB duy nhất, không có runtime dependency nào.

### Build Tags (Tùy chọn)

Bật thêm tính năng tại thời điểm biên dịch:

```bash
# Với OpenTelemetry tracing (~36 MB)
go build -tags otel -o goclaw .

# Với Tailscale networking
go build -tags tsnet -o goclaw .

# Với code sandbox
go build -tags sandbox -o goclaw .

# Kết hợp nhiều tag
go build -tags "otel,tsnet,sandbox" -o goclaw .
```

## Cách 2: Docker

```bash
# Clone và build
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Build image
docker build -t goclaw .
```

Docker image được build trên Alpine 3.22, chạy với user non-root `goclaw` (UID 1000), và nặng khoảng ~50 MB.

### Docker Compose (Khuyến nghị)

Cách dễ nhất để chạy GoClaw cùng với PostgreSQL và web dashboard:

```bash
# Khởi động tất cả service
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

Lệnh này khởi động:
- **GoClaw** trên port `18790`
- **PostgreSQL** với extension pgvector
- **Web Dashboard** để quản lý trực quan

### Biến môi trường

Tạo file `.env` trước khi khởi động:

```bash
# Bắt buộc
GOCLAW_GATEWAY_TOKEN=your-secure-token-here
GOCLAW_ENCRYPTION_KEY=your-encryption-key-here

# API key của provider (ít nhất một cái)
GOCLAW_OPENROUTER_API_KEY=sk-or-...
# hoặc GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
# hoặc GOCLAW_OPENAI_API_KEY=sk-...
```

## Kiểm tra cài đặt

### Health Check

```bash
curl http://localhost:18790/health
# Kết quả mong đợi: {"status":"ok"}
```

### Docker Logs

```bash
docker compose logs goclaw
# Tìm dòng: "gateway listening on :18790"
```

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| `go: module requires Go >= 1.25` | Cập nhật Go: `go install golang.org/dl/go1.25@latest` |
| `pgvector extension not found` | Cài pgvector: chạy `CREATE EXTENSION vector;` trong PostgreSQL |
| Port 18790 đã được dùng | Đổi port: set `GOCLAW_PORT=18791` trong `.env` |
| Docker build thất bại trên ARM Mac | Đảm bảo Docker Desktop đã bật Rosetta |

## Tiếp theo

- [Quick Start](quick-start.md) — Chạy agent đầu tiên của bạn
- [Configuration](configuration.md) — Tùy chỉnh cài đặt GoClaw
