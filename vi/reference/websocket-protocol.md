> Bản dịch từ [English version](#websocket-protocol)

# WebSocket Protocol

> Đặc tả protocol v3 cho WebSocket RPC interface của GoClaw gateway.

## Tổng quan

GoClaw expose WebSocket endpoint tại `/ws`. Tất cả giao tiếp client-gateway dùng JSON frame với ba loại: `req` (request), `res` (response), và `event` (server-push). Request đầu tiên trên bất kỳ kết nối nào phải là `connect` để xác thực và thương lượng protocol version.

**Connection URL:** `ws://<host>:<port>/ws`

**Protocol version:** `3`

---

## Loại Frame

### Request Frame (`req`)

Client gửi để gọi một RPC method.

```json
{
  "type": "req",
  "id": "unique-client-id",
  "method": "chat.send",
  "params": { "message": "Hello", "sessionKey": "user:demo" }
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `type` | string | Luôn là `"req"` |
| `id` | string | ID duy nhất do client tạo, khớp trong response |
| `method` | string | Tên RPC method |
| `params` | object | Tham số method (tùy chọn) |

### Response Frame (`res`)

Server gửi để trả lời một request.

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": true,
  "payload": { ... }
}
```

Response lỗi:

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "invalid token",
    "retryable": false
  }
}
```

**Error shape:**

| Field | Type | Mô tả |
|-------|------|-------|
| `code` | string | Error code đọc được bởi máy |
| `message` | string | Mô tả đọc được bởi người |
| `details` | any | Context bổ sung tùy chọn |
| `retryable` | boolean | Retry có thể thành công không |
| `retryAfterMs` | integer | Thời gian chờ retry được đề xuất (milliseconds) |

### Event Frame (`event`)

Server push không có request trước.

```json
{
  "type": "event",
  "event": "agent",
  "payload": { "type": "chunk", "text": "Hello" },
  "seq": 42,
  "stateVersion": { "presence": 1, "health": 2 }
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `type` | string | Luôn là `"event"` |
| `event` | string | Tên event |
| `payload` | any | Dữ liệu theo từng event |
| `seq` | integer | Số thứ tự tăng dần |
| `stateVersion` | object | Version counter cho optimistic state sync (`presence`, `health`) |

---

## Connection Handshake

Request đầu tiên phải là `connect`. Gateway reject bất kỳ method nào cho đến khi xác thực xong.

```json
// Request
{
  "type": "req",
  "id": "init",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "protocol": 3
  }
}

// Response thành công
{
  "type": "res",
  "id": "init",
  "ok": true,
  "payload": { "version": "v1.2.0", "protocol": 3 }
}
```

Protocol version sai hoặc token không hợp lệ trả về `ok: false` ngay lập tức.

---

## RPC Methods

### Core

| Method | Params | Mô tả |
|--------|--------|-------|
| `connect` | `{token, protocol}` | Xác thực. Phải là request đầu tiên |
| `health` | — | Ping / health check |
| `status` | — | Trạng thái gateway |

### Chat

| Method | Params | Mô tả |
|--------|--------|-------|
| `chat.send` | `{message, sessionKey?, agentId?}` | Gửi tin nhắn; response stream qua event `agent`/`chat` |
| `chat.history` | `{sessionKey}` | Lấy lịch sử tin nhắn |
| `chat.abort` | `{sessionKey}` | Hủy run đang diễn ra |
| `chat.inject` | `{sessionKey, content}` | Inject tin nhắn không trigger run |

### Quản lý Agents

| Method | Params | Mô tả |
|--------|--------|-------|
| `agents.list` | — | Liệt kê tất cả agents |
| `agents.create` | agent object | Tạo agent |
| `agents.update` | `{id, ...fields}` | Cập nhật agent |
| `agents.delete` | `{id}` | Xóa agent |
| `agents.files.list` | `{agentId}` | Liệt kê context file |
| `agents.files.get` | `{agentId, fileName}` | Lấy context file |
| `agents.files.set` | `{agentId, fileName, content}` | Tạo hoặc cập nhật context file |
| `agent.identity.get` | `{agentId}` | Lấy thông tin persona agent |

### Sessions

| Method | Params | Mô tả |
|--------|--------|-------|
| `sessions.list` | `{agentId?}` | Liệt kê session, tùy chọn lọc theo agent |
| `sessions.preview` | `{sessionKey}` | Lấy tóm tắt session |
| `sessions.patch` | `{sessionKey, ...fields}` | Patch metadata session |
| `sessions.delete` | `{key}` | Xóa session |
| `sessions.reset` | `{key}` | Xóa lịch sử session |

### Config

| Method | Mô tả |
|--------|-------|
| `config.get` | Lấy config hiện tại (secrets đã che) |
| `config.apply` | Thay thế toàn bộ config |
| `config.patch` | Patch các field config cụ thể |
| `config.schema` | Lấy JSON schema cho config |

### Cron

| Method | Params | Mô tả |
|--------|--------|-------|
| `cron.list` | `{includeDisabled?}` | Liệt kê cron job |
| `cron.create` | cron job object | Tạo cron job |
| `cron.update` | `{jobId, ...fields}` | Cập nhật cron job |
| `cron.delete` | `{jobId}` | Xóa cron job |
| `cron.toggle` | `{jobId, enabled}` | Bật hoặc tắt job |
| `cron.run` | `{jobId}` | Kích hoạt chạy ngay |
| `cron.runs` | `{jobId}` | Liệt kê lịch sử chạy |
| `cron.status` | `{jobId}` | Lấy trạng thái job |

### Skills

| Method | Params | Mô tả |
|--------|--------|-------|
| `skills.list` | — | Liệt kê skills |
| `skills.get` | `{id}` | Lấy chi tiết skill |
| `skills.update` | `{id, ...fields}` | Cập nhật metadata skill |

### Channels

| Method | Mô tả |
|--------|-------|
| `channels.list` | Liệt kê channel đang active |
| `channels.status` | Lấy channel health |
| `channels.toggle` | Bật/tắt channel |
| `channels.instances.list` | Liệt kê DB channel instance |
| `channels.instances.get` | Lấy channel instance |
| `channels.instances.create` | Tạo channel instance |
| `channels.instances.update` | Cập nhật channel instance |
| `channels.instances.delete` | Xóa channel instance |

### Pairing

| Method | Params | Mô tả |
|--------|--------|-------|
| `device.pair.request` | `{channel, chatId}` | Yêu cầu pairing code |
| `device.pair.approve` | `{code, approvedBy}` | Phê duyệt pairing request |
| `device.pair.deny` | `{code}` | Từ chối pairing request |
| `device.pair.list` | — | Liệt kê pairing đang chờ và đã phê duyệt |
| `device.pair.revoke` | `{channel, senderId}` | Thu hồi pairing |

### Exec Approvals

| Method | Mô tả |
|--------|-------|
| `exec.approval.list` | Liệt kê shell command approval đang chờ |
| `exec.approval.approve` | Phê duyệt lệnh |
| `exec.approval.deny` | Từ chối lệnh |

### Agent Links & Teams

| Method | Mô tả |
|--------|-------|
| `agents.links.list/create/update/delete` | Quản lý inter-agent delegation link |
| `teams.list/create/get/update/delete` | Team CRUD |
| `teams.tasks.list` | Liệt kê team task |
| `teams.members.add/remove` | Quản lý team membership |

### Usage & Quota

| Method | Mô tả |
|--------|-------|
| `usage.get` | Thống kê token usage |
| `usage.summary` | Usage summary cards |
| `quota.usage` | Quota consumption cho user hiện tại |

---

## Server-Push Events

### Agent Events (`"agent"`)

Phát ra trong quá trình agent run. Kiểm tra `payload.type`:

| `payload.type` | Mô tả |
|----------------|-------|
| `run.started` | Agent run bắt đầu |
| `run.completed` | Run hoàn thành thành công |
| `run.failed` | Run gặp lỗi |
| `run.retrying` | Run đang được retry |
| `tool.call` | Tool được gọi |
| `tool.result` | Tool trả kết quả |
| `block.reply` | Reply bị input guard chặn |

### Chat Events (`"chat"`)

| `payload.type` | Mô tả |
|----------------|-------|
| `chunk` | Token text streaming |
| `message` | Tin nhắn đầy đủ (non-streaming) |
| `thinking` | Extended thinking / reasoning output |

### System & Các Event Khác

| Event | Mô tả |
|-------|-------|
| `health` | Ping health định kỳ của gateway |
| `tick` | Heartbeat tick |
| `shutdown` | Gateway đang tắt |
| `cron` | Cron job status thay đổi |
| `exec.approval.requested` | Shell command cần user phê duyệt |
| `exec.approval.resolved` | Quyết định phê duyệt đã có |
| `device.pair.requested` | Pairing request mới từ channel user |
| `device.pair.resolved` | Pairing được phê duyệt hoặc từ chối |
| `agent.summoning` | Predefined agent persona generation đang diễn ra |
| `handoff` | Agent delegate sang agent khác (`from_agent`, `to_agent`, `reason` trong payload) |
| `delegation.started/completed/failed` | Delegation lifecycle |
| `delegation.progress` | Kết quả delegation trung gian |
| `delegation.announce` | Kết quả subagent được gom lại gửi về parent |
| `team.task.created/completed/claimed/cancelled` | Team task lifecycle |
| `team.message.sent` | Tin nhắn peer-to-peer trong team |
| `team.created/updated/deleted` | Thông báo Team CRUD |
| `team.member.added/removed` | Team membership thay đổi |

---

## Ví dụ Session

```javascript
const ws = new WebSocket("ws://localhost:18790/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "req", id: "1", method: "connect",
    params: { token: "YOUR_TOKEN", protocol: 3 }
  }));
};

ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);

  // Sau khi connect thành công, gửi chat message
  if (frame.type === "res" && frame.id === "1" && frame.ok) {
    ws.send(JSON.stringify({
      type: "req", id: "2", method: "chat.send",
      params: { message: "Hello!", sessionKey: "user:demo" }
    }));
  }

  // Stream response token
  if (frame.type === "event" && frame.event === "chat") {
    if (frame.payload?.type === "chunk") {
      process.stdout.write(frame.payload.text ?? "");
    }
  }
};
```

---

## Tiếp theo

- [REST API](#rest-api) — HTTP endpoint cho agent CRUD, skill upload, traces
- [CLI Commands](#cli-commands) — quản lý pairing và session từ terminal
- [Glossary](#glossary) — Session, Lane, Compaction, và các thuật ngữ quan trọng khác

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
