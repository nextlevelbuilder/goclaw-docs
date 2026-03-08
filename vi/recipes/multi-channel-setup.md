> Bản dịch từ [English version](../../recipes/multi-channel-setup.md)

# Thiết lập Đa Channel

> Đặt cùng một agent trên Telegram, Discord, và WebSocket cùng lúc.

## Tổng quan

GoClaw chạy nhiều channel từ một tiến trình gateway duy nhất. Một agent có thể nhận tin nhắn từ Telegram, Discord, và client WebSocket trực tiếp cùng một lúc — mỗi channel có phạm vi session riêng, nên các hội thoại được cách ly theo từng channel và người dùng.

**Điều kiện tiên quyết:** Một gateway đang hoạt động với ít nhất một agent đã tạo.

## Bước 1: Thu thập token

Bạn cần bot token cho mỗi nền tảng nhắn tin:

**Telegram:** Nhắn [@BotFather](https://t.me/BotFather) → `/newbot` → copy token

**Discord:** [discord.com/developers](https://discord.com/developers/applications) → New Application → Bot → Add Bot → copy token. Bật **Message Content Intent** trong Privileged Gateway Intents.

WebSocket không cần token bên ngoài — client xác thực bằng gateway token của bạn.

## Bước 2: Cấu hình cả ba channel

Thêm tất cả cấu hình channel vào `config.json`. Bí mật (token) để trong `.env.local` — không trong file config.

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

`.env.local` (chỉ bí mật — đừng bao giờ commit file này):
```bash
export GOCLAW_TELEGRAM_TOKEN="123456:ABCDEFGHIJKLMNOPQRSTUVWxyz"
export GOCLAW_DISCORD_TOKEN="your-discord-bot-token"
export GOCLAW_GATEWAY_TOKEN="your-gateway-token"
export GOCLAW_POSTGRES_DSN="postgres://user:pass@localhost:5432/goclaw"
```

GoClaw đọc token channel từ biến môi trường khi trường `token` trong config để trống.

## Bước 3: Gắn agent vào tất cả channel

Mặc định, gateway định tuyến tất cả tin nhắn đến agent `default`. Để gắn rõ ràng agent của bạn vào tất cả channel, thêm binding vào `config.json`:

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

Client WebSocket chỉ định agent trực tiếp trong chat request (xem Bước 5).

## Bước 4: Khởi động gateway

```bash
source .env.local && ./goclaw
```

Khi khởi động bạn sẽ thấy các dòng log như:
```
channel=telegram status=connected bot=@YourBotName
channel=discord  status=connected guild_count=2
gateway          status=listening addr=0.0.0.0:18790
```

## Bước 5: Kết nối WebSocket client

WebSocket được tích hợp sẵn trong gateway — không cần thiết lập thêm. Kết nối và xác thực:

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

// Lắng nghe phản hồi và các chunk streaming
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

Xem [WebSocket Channel](../channels/websocket.md) để biết tài liệu tham khảo giao thức đầy đủ.

## Bước 6: Xác minh cách ly xuyên channel

Session được cách ly theo channel và người dùng theo mặc định (`dm_scope: "per-channel-peer"`). Nghĩa là:
- Alice trên Telegram và Alice trên Discord có **lịch sử hội thoại riêng biệt**
- Agent xem họ là người dùng khác nhau

Nếu bạn muốn một session chung qua các channel cho cùng người dùng, đặt `dm_scope: "per-peer"` trong `config.json`:

```json
{
  "sessions": {
    "dm_scope": "per-peer"
  }
}
```

Điều này chia sẻ lịch sử hội thoại khi cùng `user_id` kết nối từ bất kỳ channel nào.

## So sánh Channel

| Tính năng | Telegram | Discord | WebSocket |
|---------|----------|---------|-----------|
| Thiết lập | Token @BotFather | Token Developer Portal | Không có (dùng gateway token) |
| DM policy mặc định | `pairing` | `open` | Xác thực qua gateway token |
| Hỗ trợ group/server | Có | Có | Không áp dụng |
| Streaming | Tùy chọn (`dm_stream`) | Qua chỉnh sửa tin nhắn | Native (sự kiện chunk) |
| Yêu cầu mention trong group | Có (mặc định) | Có (mặc định) | Không áp dụng |
| Client tùy chỉnh | Không | Không | Có |

## Giới hạn Tool theo Channel

Bạn có thể cho phép bộ tool khác nhau theo channel. Trong `config.json`:

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

Client WebSocket (thường là developer hoặc tool nội bộ) có thể giữ quyền truy cập tool đầy đủ.

## Sự cố Thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Telegram bot không phản hồi | Kiểm tra `dm_policy`. Mặc định là `"pairing"` — hoàn tất ghép nối trên browser trước, hoặc đặt `"open"` để test. |
| Discord bot offline trong server | Xác minh bot đã được thêm vào server qua URL Generator OAuth2 với scope `bot` và quyền `Send Messages`. |
| WebSocket connect bị từ chối | Đảm bảo `token` trong connect frame của bạn khớp với `GOCLAW_GATEWAY_TOKEN`. Token rỗng cho vai trò viewer-only. |
| Tin nhắn định tuyến sai agent | Kiểm tra thứ tự `bindings` trong config — binding khớp đầu tiên thắng. Binding cụ thể hơn (với `peer`) nên đặt trước binding theo toàn channel. |
| Cùng người dùng có session khác nhau trên Telegram và Discord | Đây là hành vi mặc định với `dm_scope: "per-channel-peer"`. Đặt `"per-peer"` để chia sẻ session qua các channel. |

## Tiếp theo

- [Telegram Channel](../channels/telegram.md) — tài liệu tham khảo cấu hình Telegram đầy đủ bao gồm group, topic và STT
- [Discord Channel](../channels/discord.md) — Discord gateway intent và thiết lập streaming
- [WebSocket Channel](../channels/websocket.md) — tài liệu tham khảo giao thức RPC đầy đủ
- [Personal Assistant](./personal-assistant.md) — điểm bắt đầu một channel
