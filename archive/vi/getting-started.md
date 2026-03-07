# Bắt Đầu

**GoClaw** là một AI gateway đa agent, kết nối các LLM với công cụ, kênh giao tiếp và dữ liệu của bạn — được triển khai dưới dạng một binary Go duy nhất (~25 MB, ~36 MB kèm OTel). Không có phụ thuộc runtime, khởi động dưới 1 giây. Hệ thống điều phối các nhóm agent, ủy quyền liên agent, và quy trình kiểm soát chất lượng trên hơn 13 provider LLM với khả năng cô lập đa tenant hoàn toàn.

Đây là bản port Go của [OpenClaw](https://github.com/openclaw/openclaw) với bảo mật nâng cao, PostgreSQL đa tenant, và khả năng quan sát cấp sản xuất.

---

## Điểm Nổi Bật

- **Nhóm Agent & Điều Phối** — Nhóm với bảng nhiệm vụ chung, ủy quyền liên agent (đồng bộ/bất đồng bộ), chuyển giao hội thoại, vòng lặp đánh giá quality gate, và khám phá agent hybrid
- **PostgreSQL Đa Tenant** — File context theo từng người dùng, mã hóa thông tin xác thực (AES-256-GCM), chia sẻ agent, và cô lập dữ liệu hoàn toàn
- **Bảo Mật 5 Lớp** — Giới hạn tốc độ, phát hiện prompt injection, bảo vệ SSRF, từ chối các mẫu lệnh shell, và mã hóa AES-256-GCM
- **Hơn 13 Provider LLM** — Anthropic (native HTTP+SSE với prompt caching), OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, Cohere, Perplexity, DashScope (Qwen), Bailian Coding
- **Đa Kênh** — WebSocket, HTTP (tương thích OpenAI), Telegram, Discord, Feishu/Lark, Zalo, WhatsApp
- **Tích Hợp MCP** — Kết nối các server Model Context Protocol bên ngoài (stdio, SSE, streamable-HTTP) với quyền truy cập theo từng agent và từng người dùng
- **Công Cụ Tùy Chỉnh** — Định nghĩa công cụ dựa trên shell lúc runtime qua HTTP API với biến môi trường được mã hóa
- **Quan Sát Cấp Sản Xuất** — Tracing cuộc gọi LLM tích hợp sẵn với tùy chọn xuất OpenTelemetry OTLP + Jaeger

---

## Hai Chế Độ Hoạt Động

| Khía cạnh | Standalone | Managed |
|--------|-----------|---------|
| Lưu trữ | File JSON + SQLite | PostgreSQL (pgvector) |
| Phụ thuộc | Không (ngoài LLM API key) | PostgreSQL 15+ |
| Agent | Định nghĩa trong `config.json` | CRUD qua HTTP API + Web Dashboard |
| Đa tenant | Thư mục workspace theo người dùng | Cô lập hoàn toàn bằng DB |
| Nhóm Agent | Không có | Bảng nhiệm vụ chung + hộp thư |
| Ủy quyền | Không có | Ủy quyền đồng bộ/bất đồng bộ + quality gate |
| Tracing | Không có | Tracing cuộc gọi LLM đầy đủ + xuất OTel |
| Công cụ tùy chỉnh | Không có | Công cụ shell định nghĩa lúc runtime |

---

## Khởi Động Nhanh

### Yêu Cầu

- Go 1.25+
- Ít nhất một LLM API key (Anthropic, OpenAI, OpenRouter, hoặc bất kỳ provider nào được hỗ trợ)
- PostgreSQL 15+ với pgvector (chỉ cho chế độ managed)

### Build Từ Mã Nguồn

```bash
# Build
go build -o goclaw .

# Thiết lập tương tác (tạo config.json + .env.local)
./goclaw onboard

# Tải môi trường và khởi động
source .env.local
./goclaw
```

Lệnh `onboard` tự động phát hiện API key từ biến môi trường. Nếu tìm thấy, nó chạy không cần tương tác. Nếu không, nó khởi chạy wizard tương tác để chọn provider, model, gateway token, và các kênh giao tiếp.

### Chế Độ Managed (PostgreSQL)

```bash
# Thiết lập PostgreSQL DSN (chỉ qua biến môi trường, không bao giờ trong config.json)
export GOCLAW_POSTGRES_DSN="postgres://goclaw:goclaw@localhost:5432/goclaw?sslmode=disable"

# Chạy database migrations
./goclaw migrate up

# Khởi động gateway
./goclaw
```

---

## Triển Khai Docker

GoClaw cung cấp **8 file Docker Compose có thể kết hợp** để bạn linh hoạt chọn theo nhu cầu triển khai.

### Các File Compose

| File | Mục đích |
|------|---------|
| `docker-compose.yml` | Định nghĩa service cơ sở (bắt buộc) |
| `docker-compose.standalone.yml` | Lưu trữ dựa trên file với persistent volumes |
| `docker-compose.managed.yml` | PostgreSQL pgvector (pg18) cho chế độ đa tenant |
| `docker-compose.selfservice.yml` | Web dashboard UI (nginx + React SPA, cổng 3000) |
| `docker-compose.upgrade.yml` | Service migration schema database một lần |
| `docker-compose.sandbox.yml` | Sandbox thực thi code dựa trên Docker (yêu cầu docker socket) |
| `docker-compose.otel.yml` | OpenTelemetry + Jaeger tracing (Jaeger UI trên cổng 16686) |
| `docker-compose.tailscale.yml` | Tailscale VPN mesh listener để truy cập từ xa an toàn |

### Các Cấu Hình Triển Khai Thông Dụng

**Standalone (đơn giản nhất):**

```bash
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d
```

**Managed + Web Dashboard (khuyến nghị):**

```bash
# Chuẩn bị môi trường (tự động tạo encryption key + gateway token)
chmod +x prepare-env.sh && ./prepare-env.sh

# Khởi động các service
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml up -d
```

**Full Stack (managed + dashboard + tracing):**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.otel.yml up -d
```

**Với Code Sandbox:**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.sandbox.yml up -d
```

**Nâng Cấp Schema Database:**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.upgrade.yml run --rm goclaw-upgrade
```

### Sử Dụng Makefile

```bash
make up      # Khởi động managed + dashboard (mặc định)
make down    # Dừng tất cả service
make logs    # Xem log container goclaw theo thời gian thực
make reset   # Dừng, xóa volumes, build lại
make build   # Build binary trên máy cục bộ
```

### Cổng Mặc Định

| Service | Cổng |
|---------|------|
| Gateway (HTTP + WebSocket) | 18790 |
| Web Dashboard | 3000 |
| PostgreSQL | 5432 |
| Jaeger UI (OTel) | 16686 |

---

## Biến Môi Trường

### Khóa Provider LLM (cần ít nhất một)

```bash
GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
GOCLAW_OPENAI_API_KEY=sk-...
GOCLAW_OPENROUTER_API_KEY=sk-or-...
GOCLAW_GROQ_API_KEY=gsk_...
GOCLAW_DEEPSEEK_API_KEY=sk-...
GOCLAW_GEMINI_API_KEY=...
GOCLAW_MISTRAL_API_KEY=...
GOCLAW_XAI_API_KEY=...
GOCLAW_MINIMAX_API_KEY=...
GOCLAW_COHERE_API_KEY=...
GOCLAW_PERPLEXITY_API_KEY=...
```

### Gateway & Bảo Mật

```bash
GOCLAW_GATEWAY_TOKEN=           # Tự động tạo bởi prepare-env.sh
GOCLAW_ENCRYPTION_KEY=          # Tự động tạo (32-byte hex)
GOCLAW_PORT=18790               # Cổng gateway
GOCLAW_HOST=0.0.0.0             # Host gateway
```

### Database (chế độ managed)

```bash
GOCLAW_MODE=managed             # "standalone" hoặc "managed"
GOCLAW_POSTGRES_DSN=postgres://goclaw:goclaw@localhost:5432/goclaw
```

### Kênh Giao Tiếp (tùy chọn)

```bash
GOCLAW_TELEGRAM_TOKEN=
GOCLAW_DISCORD_TOKEN=
GOCLAW_LARK_APP_ID=
GOCLAW_LARK_APP_SECRET=
GOCLAW_ZALO_TOKEN=
GOCLAW_WHATSAPP_BRIDGE_URL=
```

### Luồng Scheduler

```bash
GOCLAW_LANE_MAIN=30             # Concurrency luồng chính
GOCLAW_LANE_SUBAGENT=50         # Luồng subagent
GOCLAW_LANE_DELEGATE=100        # Luồng ủy quyền
GOCLAW_LANE_CRON=30             # Luồng cron
```

### Quan Sát & TTS (tùy chọn)

```bash
GOCLAW_TELEMETRY_ENABLED=true
GOCLAW_TELEMETRY_ENDPOINT=      # Endpoint OTLP
GOCLAW_TTS_OPENAI_API_KEY=
GOCLAW_TTS_ELEVENLABS_API_KEY=
GOCLAW_TTS_MINIMAX_API_KEY=
```

---

## Cấu Hình

Cấu hình được tải từ file JSON5 với phủ chồng biến môi trường. Bí mật không bao giờ được lưu vào file cấu hình.

```json
{
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "token": ""
  },
  "agents": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "context_window": 200000
    }
  },
  "tools": {
    "profile": "full"
  },
  "database": {
    "mode": "standalone"
  }
}
```

### Các Phần Cấu Hình

| Phần | Mục đích |
|---------|---------|
| `gateway` | host, port, token, allowed_origins, rate_limit_rpm |
| `agents` | defaults (provider, model, context_window) + danh sách per-agent |
| `tools` | profile, allow/deny lists, exec_approval, mcp_servers |
| `channels` | Cài đặt Telegram, Discord, Feishu, Zalo, WhatsApp |
| `database` | mode (standalone/managed) |
| `sessions` | Cài đặt quản lý session |
| `tts` | Cài đặt provider text-to-speech |
| `cron` | Cài đặt cron job |
| `telemetry` | Cài đặt OpenTelemetry |
| `tailscale` | Cấu hình Tailscale listener |
| `bindings` | Ánh xạ kênh sang agent |

---

## Provider LLM Được Hỗ Trợ

| Provider | Loại | Model Mặc Định |
|----------|------|---------------|
| Anthropic | Native HTTP + SSE | `claude-sonnet-4-5-20250929` |
| OpenAI | Tương thích OpenAI | `gpt-4o` |
| OpenRouter | Tương thích OpenAI | `anthropic/claude-sonnet-4-5-20250929` |
| Groq | Tương thích OpenAI | `llama-3.3-70b-versatile` |
| DeepSeek | Tương thích OpenAI | `deepseek-chat` |
| Gemini | Tương thích OpenAI | `gemini-2.0-flash` |
| Mistral | Tương thích OpenAI | `mistral-large-latest` |
| xAI | Tương thích OpenAI | `grok-3-mini` |
| MiniMax | Tương thích OpenAI | `MiniMax-M2.5` |
| Cohere | Tương thích OpenAI | `command-a` |
| Perplexity | Tương thích OpenAI | `sonar-pro` |
| DashScope | Tương thích OpenAI | `qwen-plus` |
| Bailian Coding | Tương thích OpenAI | `bailian-code` |

---

## Lệnh CLI

```bash
# Gateway
goclaw                          # Khởi động gateway (mặc định)
goclaw onboard                  # Wizard thiết lập tương tác
goclaw version                  # In phiên bản & protocol
goclaw doctor                   # Kiểm tra sức khỏe hệ thống

# Agent
goclaw agent list               # Liệt kê agent đã cấu hình
goclaw agent chat               # Chat với một agent
goclaw agent add                # Thêm agent mới
goclaw agent delete             # Xóa agent

# Database (chế độ managed)
goclaw migrate up               # Chạy migrations còn tồn đọng
goclaw migrate down             # Rollback migration gần nhất
goclaw migrate version          # Hiển thị phiên bản schema hiện tại
goclaw upgrade                  # Nâng cấp schema + data hooks
goclaw upgrade --status         # Hiển thị trạng thái schema
goclaw upgrade --dry-run        # Xem trước các thay đổi tồn đọng

# Cấu Hình
goclaw config show              # Hiển thị cấu hình (bí mật đã ẩn)
goclaw config path              # Hiển thị đường dẫn file cấu hình
goclaw config validate          # Kiểm tra tính hợp lệ cấu hình

# Session
goclaw sessions list            # Liệt kê session đang hoạt động
goclaw sessions delete [key]    # Xóa session
goclaw sessions reset [key]     # Xóa lịch sử session

# Kỹ năng, Model, Kênh
goclaw skills list              # Liệt kê kỹ năng có sẵn
goclaw models list              # Liệt kê AI model và provider
goclaw channels list            # Liệt kê kênh nhắn tin

# Cron & Pairing
goclaw cron list                # Liệt kê công việc định kỳ
goclaw pairing approve [code]   # Phê duyệt mã pairing
goclaw pairing list             # Liệt kê thiết bị đã pair
```

---

## Web Dashboard

GoClaw bao gồm một React 19 SPA dashboard (Vite 6, TypeScript, Tailwind CSS 4, Radix UI) để quản lý agent, session, kỹ năng, và cấu hình.

### Phát Triển Cục Bộ

```bash
cd ui/web
pnpm install    # Phải dùng pnpm, không dùng npm
pnpm dev
```

### Docker (qua selfservice compose)

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml up -d
```

Dashboard chạy trên cổng 3000 và kết nối đến gateway qua WebSocket.

---

## Bước Tiếp Theo

- [Tổng Quan Kiến Trúc](#architecture) — Sơ đồ thành phần, bản đồ module, trình tự khởi động
- [Vòng Lặp Agent](#agent-loop) — Tìm hiểu sâu về chu kỳ Think-Act-Observe
- [Tài Liệu API](#api-reference) — Endpoint HTTP và WebSocket
- [Bảo Mật](#security) — Mô hình bảo vệ theo chiều sâu 5 lớp
- [Hệ Thống Công Cụ](#tools) — Hơn 30 công cụ tích hợp, công cụ tùy chỉnh, và tích hợp MCP
- [Kênh & Nhắn Tin](#channels) — Telegram, Discord, Feishu/Lark, Zalo, WhatsApp
