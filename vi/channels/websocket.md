> Bản dịch từ [English version](#channel-websocket)

# Channel WebSocket

Giao tiếp RPC trực tiếp với GoClaw gateway qua WebSocket. Không cần nền tảng nhắn tin trung gian — lý tưởng cho client tuỳ chỉnh, web app, và kiểm thử.

## Kết nối

**Endpoint:**

```
ws://your-gateway.com:8080/ws
wss://your-gateway.com:8080/ws  (TLS)
```

**WebSocket Upgrade:**

```
GET /ws HTTP/1.1
Host: your-gateway.com:8080
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

Server phản hồi với `101 Switching Protocols`.

## Xác thực

Tin nhắn đầu tiên phải là frame `connect`:

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "user_id": "user_123"
  }
}
```

**Tham số:**

| Trường | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------------|
| `token` | string | Không | Token API của gateway (trống = vai trò viewer) |
| `user_id` | string | Có | Định danh client/user (mờ đục, tối đa 255 ký tự) |

**Response:**

```json
{
  "type": "res",
  "id": "1",
  "ok": true,
  "payload": {
    "protocol": 3,
    "role": "admin",
    "user_id": "user_123"
  }
}
```

### Vai trò

- **viewer** (mặc định): Chỉ đọc (không có token hoặc token sai)
- **operator**: Đọc + ghi + chat
- **admin**: Toàn quyền (với token gateway đúng)

## Gửi tin nhắn

Sau khi xác thực, gửi request `chat.send`:

```json
{
  "type": "req",
  "id": "2",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "What is 2+2?",
    "channel": "websocket"
  }
}
```

**Tham số:**

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `agentId` | string | Agent cần truy vấn |
| `message` | string | Tin nhắn của user |
| `channel` | string | Thường là `"websocket"` |
| `sessionId` | string | Tuỳ chọn: tiếp tục session hiện có |

**Response:**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "content": "2+2 equals 4.",
    "usage": {
      "input_tokens": 42,
      "output_tokens": 8
    }
  }
}
```

## Streaming Event

Trong quá trình agent xử lý, server đẩy event:

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "chunk": "2+2 equals",
    "delta": " equals"
  },
  "seq": 1
}
```

**Loại Event:**

| Event | Payload | Mô tả |
|-------|---------|-------------|
| `chat` | `{chunk, delta}` | Streaming text chunk |
| `agent` | `{run_id, status}` | Vòng đời agent (started, completed, failed) |
| `tool.call` | `{tool, input}` | Gọi tool |
| `tool.result` | `{tool, output}` | Kết quả tool |

## Client JavaScript tối giản

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Xác thực
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      user_id: 'web_client_1'
    }
  }));
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === 'res' && frame.id === '1') {
    // Đã kết nối! Giờ gửi tin nhắn
    ws.send(JSON.stringify({
      type: 'req',
      id: '2',
      method: 'chat.send',
      params: {
        agentId: 'main',
        message: 'Hello!',
        channel: 'websocket'
      }
    }));
  }

  if (frame.type === 'res' && frame.id === '2') {
    console.log('Response:', frame.payload.content);
  }

  if (frame.type === 'event' && frame.event === 'chat') {
    console.log('Chunk:', frame.payload.chunk);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Quản lý Session

Dùng lại session ID để tiếp tục cuộc trò chuyện:

```json
{
  "type": "req",
  "id": "3",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "Add 5 to the result.",
    "sessionId": "session_xyz",
    "channel": "websocket"
  }
}
```

Session ID được trả về trong mỗi response. Lưu lại và truyền vào để duy trì lịch sử cuộc trò chuyện.

## Keepalive

Server gửi ping frame mỗi 30 giây. Client phải trả lời bằng pong. Hầu hết thư viện WebSocket làm điều này tự động.

## Giới hạn Frame

| Giới hạn | Giá trị |
|-------|-------|
| Kích thước tin nhắn đọc | 512 KB |
| Deadline đọc | 60 giây |
| Deadline ghi | 10 giây |
| Buffer gửi | 256 tin nhắn |

Tin nhắn vượt giới hạn bị drop và ghi log.

## Xử lý lỗi

Request thất bại bao gồm chi tiết lỗi:

```json
{
  "type": "res",
  "id": "2",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "unknown method",
    "retryable": false
  }
}
```

## Xử lý sự cố

| Vấn đề | Giải pháp |
|-------|----------|
| "Connection refused" | Kiểm tra gateway đang chạy trên host/port đúng. |
| "Unauthorized" | Xác minh token đúng. Kiểm tra user_id đã được cung cấp. |
| "Message too large" | Giảm kích thước tin nhắn (giới hạn 512 KB). |
| Không có streaming event | Đảm bảo provider hỗ trợ streaming. Kiểm tra cấu hình model. |
| Kết nối bị ngắt | Server có thể đã đạt giới hạn message buffer. Kết nối lại và tiếp tục session. |

## Tiếp theo

- [Tổng quan](#channels-overview) — Khái niệm và chính sách channel
- [WebSocket Protocol](#websocket-protocol) — Tài liệu giao thức đầy đủ
- [Browser Pairing](#channel-browser-pairing) — Luồng pairing cho client tuỳ chỉnh

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
