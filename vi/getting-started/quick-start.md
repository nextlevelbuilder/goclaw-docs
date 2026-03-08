> Bản dịch từ [English version](../../getting-started/quick-start.md)

# Quick Start

> AI agent đầu tiên của bạn chạy trong 5 phút.

## Tổng quan

Hướng dẫn này đưa bạn qua các bước: build GoClaw, chạy wizard onboard, khởi động gateway, và chat với agent đầu tiên.

## Bước 1: Build

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw
go build -o goclaw .
```

## Bước 2: Cài đặt PostgreSQL

GoClaw cần PostgreSQL cho managed mode:

```bash
# Dùng Docker (nhanh nhất)
docker run -d --name goclaw-db \
  -e POSTGRES_USER=goclaw \
  -e POSTGRES_PASSWORD=goclaw \
  -e POSTGRES_DB=goclaw \
  -p 5432:5432 \
  pgvector/pgvector:pg17

# Đặt connection string
export GOCLAW_POSTGRES_DSN="postgres://goclaw:goclaw@localhost:5432/goclaw?sslmode=disable"
```

## Bước 3: Chạy Onboard Wizard

```bash
./goclaw onboard
```

Wizard sẽ hướng dẫn bạn qua:

1. **Chọn LLM provider** — OpenRouter (khuyến nghị cho người mới), Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, và nhiều hơn
2. **Nhập API key** — Key được lưu mã hóa, không bao giờ ở dạng plain text
3. **Chọn model** — Đã điền sẵn theo provider (ví dụ: `anthropic/claude-sonnet-4-5-20250929` cho OpenRouter)
4. **Cài đặt channel** (tùy chọn) — Telegram, Discord, WhatsApp, Zalo, Feishu/Lark
5. **Bật tính năng** (tùy chọn) — Memory, browser automation, text-to-speech

Wizard tạo ra hai file:
- `config.json` — Cấu hình agent và gateway
- `.env.local` — Secrets (gateway token, encryption key)

## Bước 4: Khởi động Gateway

```bash
source .env.local
./goclaw
```

Bạn sẽ thấy:

```
GoClaw gateway listening on :18790
```

## Bước 5: Chat với Agent

### Dùng Web Dashboard

Nếu bạn đã bật dashboard trong quá trình cài đặt, mở `http://localhost:3000` trên trình duyệt.

### Dùng WebSocket

Kết nối bằng bất kỳ WebSocket client nào:

```bash
# Dùng websocat (cài: cargo install websocat)
websocat ws://localhost:18790/ws \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN"
```

Gửi JSON message:

```json
{
  "type": "chat",
  "agent_id": "default",
  "content": "Xin chào! Bạn có thể làm gì?"
}
```

### Dùng HTTP API

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "default",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'
```

## Docker Compose (Cách thay thế)

Bỏ qua bước 1-4 với Docker Compose:

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Cài đặt environment
cp .env.example .env
# Sửa .env với API key của bạn

# Khởi động tất cả
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| `no provider API key found` | Đặt ít nhất một biến môi trường `GOCLAW_*_API_KEY` |
| `connection refused on :5432` | Đảm bảo PostgreSQL đang chạy và DSN đúng |
| `unauthorized` trên WebSocket | Kiểm tra `GOCLAW_GATEWAY_TOKEN` khớp với auth header |

## Tiếp theo

- [Configuration](configuration.md) — Tinh chỉnh cài đặt của bạn
- [Web Dashboard Tour](web-dashboard-tour.md) — Khám phá giao diện trực quan
- [Agents Explained](../core-concepts/agents-explained.md) — Hiểu về loại agent và context
