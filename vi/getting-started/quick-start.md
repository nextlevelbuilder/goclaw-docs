> Bản dịch từ [English version](#quick-start)

# Quick Start

> Cuộc trò chuyện AI agent đầu tiên của bạn trong 5 phút.

## Điều kiện tiên quyết

Bạn đã hoàn thành [Cài đặt](#installation) và gateway đang chạy tại `http://localhost:18790`.

## Bước 1: Mở Dashboard & Hoàn tất Setup

Mở `http://localhost:3000` (Docker) hoặc `http://localhost:5173` (cài trực tiếp, chạy dev server) và đăng nhập:

- **User ID:** `system`
- **Gateway Token:** tìm trong `.env.local` (hoặc `.env` với Docker) — tìm dòng `GOCLAW_GATEWAY_TOKEN`

Lần đăng nhập đầu tiên, dashboard tự động chuyển đến **Setup Wizard**. Wizard hướng dẫn bạn qua:

1. **Thêm LLM provider** — chọn từ OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, DashScope (Alibaba Cloud Model Studio — Qwen API), Bailian (Alibaba Cloud Model Studio — Coding Plan), GLM (Zhipu), và nhiều hơn. Nhập API key và chọn model.
2. **Tạo agent đầu tiên** — đặt tên, system prompt, và chọn provider/model ở trên.
3. **Kết nối channel** (tuỳ chọn) — liên kết Telegram, Discord, WhatsApp, Zalo, Larksuite, hoặc Slack.

> **Mẹo:** Bạn có thể nhấn **"Skip setup and go to dashboard"** ở đầu wizard để bỏ qua toàn bộ và cấu hình thủ công sau. Bước Channel (bước 3) cũng có nút **Skip** nếu bạn chưa cần kết nối Telegram/Discord/etc. — có thể thêm channel sau bất cứ lúc nào.

Sau khi hoàn tất wizard, bạn đã sẵn sàng chat.

## Bước 2: Thêm Provider Khác (Tuỳ chọn)

Để thêm provider sau này:

1. Vào **Providers** (mục **SYSTEM** trên sidebar)
2. Nhấn **Add Provider**
3. Chọn provider, nhập API key, và chọn model

## Bước 3: Chat

> **Lưu ý:** Trước khi gọi API hoặc WebSocket, hãy đảm bảo bạn đã thêm ít nhất một provider trong Setup Wizard (Bước 1 ở trên). Không có provider, yêu cầu sẽ trả về `no provider API key found`.

> **Mẹo:** Kiểm tra GoClaw đang chạy: `curl http://localhost:18790/health`

### Dùng Dashboard

Vào **Chat** (mục **CORE** trên sidebar) và chọn agent bạn đã tạo trong bước setup.

Để tạo thêm agent, vào **Agents** (cũng trong mục **CORE**) và nhấn **Create Agent**. Xem [Creating Agents](#creating-agents) để biết chi tiết.

### Dùng HTTP API

HTTP API tương thích với OpenAI. Dùng format `goclaw:<agent-key>` trong trường `model` để chỉ định agent:

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "X-GoClaw-User-Id: system" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "goclaw:your-agent-key",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'
```

Thay `YOUR_GATEWAY_TOKEN` bằng giá trị từ `.env.local` (cài trực tiếp) hoặc `.env` (Docker) và `your-agent-key` bằng agent key hiển thị trên trang Agents (ví dụ: `goclaw:my-assistant`).

> **Mẹo về agent identifier:** Dashboard hiển thị hai identifier cho mỗi agent — `agent_key` (tên hiển thị dễ đọc) và `id` (UUID). Dùng `agent_key` trong trường `model` cho HTTP API. Dùng `id` (UUID) làm `agentId` cho WebSocket `chat.send`. Cả hai đều hiển thị trên trang Agents.

### Dùng WebSocket

Kết nối bằng bất kỳ WebSocket client nào:

```bash
# Dùng websocat (cài: cargo install websocat)
websocat ws://localhost:18790/ws
```

**Đầu tiên**, gửi frame `connect` để xác thực:

```json
{"type":"req","id":"1","method":"connect","params":{"token":"YOUR_GATEWAY_TOKEN","user_id":"system"}}
```

**Sau đó**, gửi tin nhắn chat:

```json
{"type":"req","id":"2","method":"chat.send","params":{"agentId":"your-agent-key","message":"Xin chào! Bạn có thể làm gì?"}}
```

> **Tip:** Nếu bỏ qua `agentId`, GoClaw sẽ dùng agent `default`.

**Phản hồi:**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "runId": "uuid-string",
    "content": "Xin chào! Tôi có thể giúp gì cho bạn?",
    "usage": { "input_tokens": 150, "output_tokens": 25 }
  }
}
```

Trường `media` chỉ xuất hiện trong payload khi agent trả về file media được tạo ra.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| `no provider API key found` | Thêm provider và API key trong Dashboard |
| `unauthorized` trên WebSocket | Kiểm tra `token` trong frame `connect` khớp với `GOCLAW_GATEWAY_TOKEN` |
| Dashboard hiển thị trang trắng | Đảm bảo web UI service đang chạy |

## Tiếp theo

- [Configuration](#configuration) — Tinh chỉnh cài đặt của bạn
- [Dashboard Tour](#dashboard-tour) — Khám phá giao diện trực quan
- [Agents Explained](#agents-explained) — Hiểu về loại agent và context

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
