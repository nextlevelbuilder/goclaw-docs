> Bản dịch từ [English version](/recipe-multi-channel)

# Multi-Channel Setup

> Đặt cùng một agent trên Telegram, Discord, và WebSocket cùng lúc.

## Tổng quan

GoClaw chạy nhiều channel từ một gateway process. Một agent duy nhất có thể nhận tin nhắn từ Telegram, Discord, và WebSocket client trực tiếp cùng lúc — mỗi channel có session scope riêng, nên các cuộc hội thoại được cách ly theo channel và người dùng.

**Bạn cần:**
- Một gateway đang hoạt động với ít nhất một agent đã tạo
- Truy cập web dashboard tại `http://localhost:18790`
- Bot token cho mỗi nền tảng nhắn tin

## Bước 1: Thu thập token

Bạn cần bot token cho mỗi nền tảng:

**Telegram:** Nhắn [@BotFather](https://t.me/BotFather) → `/newbot` → copy token
**Discord:** [discord.com/developers](https://discord.com/developers/applications) → New Application → Bot → Add Bot → copy token. Bật **Message Content Intent** trong Privileged Gateway Intents.

WebSocket không cần token bên ngoài — client xác thực bằng gateway token.

## Bước 2: Tạo channel instance

Mở web dashboard và vào **Channels → Create Instance**. Tạo một instance cho mỗi nền tảng:

**Telegram:**
- **Channel type:** Telegram
- **Name:** `main-telegram`
- **Agent:** Chọn agent của bạn
- **Credentials:** Dán bot token từ @BotFather
- **Config:** Đặt `dm_policy` thành `pairing` (khuyến nghị) hoặc `open`

Click **Save**.

**Discord:**
- **Channel type:** Discord
- **Name:** `main-discord`
- **Agent:** Chọn cùng agent
- **Credentials:** Dán Discord bot token
- **Config:** Đặt `dm_policy` thành `open`, `require_mention` thành `true`

Click **Save**.

Cả hai channel hoạt động ngay lập tức — không cần khởi động lại gateway. WebSocket được tích hợp trong gateway và không cần tạo instance.

Khi khởi động bạn sẽ thấy log như:
```
channel=telegram status=connected bot=@YourBotName
channel=discord  status=connected guild_count=2
gateway          status=listening addr=0.0.0.0:18790
```

<details>
<summary><strong>Qua config.json</strong></summary>

Thêm tất cả config channel vào `config.json`. Secret (token) để trong `.env.local` — không trong file config.

`config.json`:
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true,
      "reaction_level": "minimal"
    },
    "discord": {
      "enabled": true,
      "token": "",
      "dm_policy": "open",
      "group_policy": "open",
      "require_mention": true,
      "history_limit": 50
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "token": ""
  }
}
```

`.env.local` (chỉ secret — không commit file này):
```bash
export GOCLAW_TELEGRAM_TOKEN="123456:ABCDEFGHIJKLMNOPQRSTUVWxyz"
export GOCLAW_DISCORD_TOKEN="your-discord-bot-token"
export GOCLAW_GATEWAY_TOKEN="your-gateway-token"
export GOCLAW_POSTGRES_DSN="postgres://user:pass@localhost:5432/goclaw"
```

GoClaw đọc token channel từ biến môi trường khi trường `token` trong config để trống.

Thêm binding để định tuyến tin nhắn đến agent:

```json
{
  "bindings": [
    {
      "agentId": "my-assistant",
      "match": { "channel": "telegram" }
    },
    {
      "agentId": "my-assistant",
      "match": { "channel": "discord" }
    }
  ]
}
```

Khởi động gateway:

```bash
source .env.local && ./goclaw
```

</details>

## Bước 3: Kết nối WebSocket client

WebSocket được tích hợp trong gateway — không cần setup thêm. Kết nối và xác thực:

```javascript
const ws = new WebSocket('ws://localhost:18790/ws');

// Frame đầu tiên phải là connect
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      token: 'your-gateway-token',
      user_id: 'web-user-alice'
    }
  }));
};

// Gửi tin nhắn chat
function chat(message) {
  ws.send(JSON.stringify({
    type: 'req',
    id: String(Date.now()),
    method: 'chat',
    params: {
      agent: 'my-assistant',
      message: message
    }
  }));
}

// Lắng nghe phản hồi và streaming chunk
ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  if (frame.type === 'event' && frame.event === 'chunk') {
    process.stdout.write(frame.payload.text);
  }
  if (frame.type === 'res' && frame.method === 'chat') {
    console.log('\n[done]');
  }
};
```

Xem [WebSocket Channel](/channel-websocket) để biết tham khảo protocol đầy đủ.

## Bước 4: Xác minh cách ly cross-channel

Session được cách ly theo channel và người dùng mặc định (`dm_scope: "per-channel-peer"`). Nghĩa là:
- Alice trên Telegram và Alice trên Discord có lịch sử hội thoại **riêng biệt**
- Agent xử lý họ như hai người dùng khác nhau

Xác minh cách ly trong dashboard: vào **Sessions** và lọc theo agent — bạn sẽ thấy session riêng cho mỗi channel.

Nếu bạn muốn một session duy nhất xuyên channel cho cùng người dùng, đặt `dm_scope: "per-peer"` trong `config.json`:

```json
{
  "sessions": {
    "dm_scope": "per-peer"
  }
}
```

Điều này chia sẻ lịch sử hội thoại khi cùng `user_id` kết nối từ bất kỳ channel nào.

## Xử lý tin nhắn Telegram

Telegram có giới hạn 4096 ký tự mỗi tin nhắn. GoClaw tự động xử lý phản hồi dài:

- Tin nhắn dài được chia thành nhiều phần tại ranh giới tự nhiên (đoạn văn, code block)
- Định dạng HTML được thử trước cho output phong phú
- Nếu parse HTML thất bại, tin nhắn fallback sang plain text
- Không cần cấu hình — hoàn toàn tự động

## So sánh channel

| Tính năng | Telegram | Discord | WebSocket |
|-----------|----------|---------|-----------|
| Setup | @BotFather token | Developer Portal token | Không (dùng gateway token) |
| DM policy mặc định | `pairing` | `open` | Xác thực qua gateway token |
| Hỗ trợ group/server | Có | Có | N/A |
| Streaming | Tùy chọn (`dm_stream`) | Qua chỉnh sửa tin nhắn | Native (chunk event) |
| Cần mention trong group | Có (mặc định) | Có (mặc định) | N/A |
| Custom client | Không | Không | Có |

## Giới hạn tool theo channel

Bạn có thể cho phép bộ tool khác nhau cho mỗi channel. Vào **Agents → agent của bạn → Config tab** và cấu hình policy tool theo channel.

<details>
<summary><strong>Qua config.json</strong></summary>

```json
{
  "agents": {
    "list": {
      "my-assistant": {
        "tools": {
          "byProvider": {
            "telegram": { "deny": ["exec", "write_file"] },
            "discord":  { "deny": ["exec", "write_file"] }
          }
        }
      }
    }
  }
}
```

</details>

WebSocket client (thường là developer hoặc tool nội bộ) có thể giữ toàn bộ quyền truy cập tool.

## File đính kèm

Khi agent dùng `write_file` để tạo file, nó tự động được gửi dưới dạng attachment trong channel. Tính năng này hoạt động trên Telegram, Discord, và các channel được hỗ trợ khác — không cần cấu hình thêm.

## Sự cố thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Telegram bot không phản hồi | Kiểm tra `dm_policy`. Mặc định là `"pairing"` — hoàn tất browser pairing trước, hoặc đặt `"open"` để test. |
| Discord bot offline trong server | Xác minh bot đã được thêm vào server qua OAuth2 URL Generator với scope `bot` và quyền `Send Messages`. |
| WebSocket connect bị từ chối | Đảm bảo `token` trong connect frame khớp với `GOCLAW_GATEWAY_TOKEN`. Token trống cho role viewer-only. |
| Tin nhắn định tuyến sai agent | Kiểm tra agent assignment của channel instance trong Dashboard → Channels. Binding khớp đầu tiên thắng khi dùng config.json. |
| Cùng user có session khác nhau trên Telegram vs Discord | Đúng như mong đợi với `dm_scope: "per-channel-peer"` mặc định. Đặt `"per-peer"` để chia sẻ session xuyên channel. |

## Tiếp theo

- [Telegram Channel](/channel-telegram) — tham khảo đầy đủ config Telegram bao gồm group, topic, và STT
- [Discord Channel](/channel-discord) — Discord gateway intent và setup streaming
- [WebSocket Channel](/channel-websocket) — tham khảo protocol RPC đầy đủ
- [Personal Assistant](/recipe-personal-assistant) — điểm khởi đầu single-channel

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
