> Bản dịch từ [English version](/websocket-protocol)

# WebSocket Protocol

> Đặc tả protocol v3 cho WebSocket RPC interface của GoClaw gateway.

## Tổng quan

GoClaw expose WebSocket endpoint tại `/ws`. Tất cả giao tiếp client-gateway dùng JSON frame với ba loại: `req` (request), `res` (response), và `event` (server-push). Request đầu tiên trên bất kỳ kết nối nào phải là `connect` để xác thực và thương lượng protocol version.

**Connection URL:** `ws://<host>:<port>/ws`

**Protocol version:** `3`

---

## Giới hạn kết nối

| Tham số | Giá trị | Mô tả |
|---------|---------|-------|
| Read limit | 512 KB | Kết nối tự đóng nếu một message vượt giới hạn |
| Send buffer | 256 message | Message bị drop khi buffer đầy |
| Read deadline | 60 s | Reset mỗi message hoặc pong; ngắt kết nối khi timeout |
| Write deadline | 10 s | Timeout ghi mỗi frame |
| Ping interval | 30 s | Server ping keepalive chủ động |
| Rate limit | có thể cấu hình | `rate_limit_rpm` trong gateway config (0 = tắt, >0 = request mỗi phút, burst size 5) |

### CORS & Kiểm soát Origin

- **`allowed_origins`** — mảng string trong gateway config. Rỗng = cho phép tất cả origin (chế độ dev). Hỗ trợ wildcard `"*"`. Client không phải browser (header `Origin` trống) luôn được cho phép.
- **Chế độ Desktop** — đặt biến môi trường `GOCLAW_DESKTOP=1` để dùng CORS cho phép (`Access-Control-Allow-Origin: *`). Thêm các header: `X-GoClaw-Tenant-Id`, `X-GoClaw-User-Id`.

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

**Yêu cầu `user_id`:** Tham số `user_id` trong `connect` bắt buộc để scope session theo từng user. Đây là opaque VARCHAR(255). Với triển khai multi-tenant, dùng định dạng ghép `tenant.{tenantId}.user.{userId}` — GoClaw dùng identity propagation và tin tưởng upstream service cung cấp identity chính xác.

---

## RPC Methods

### Core

| Method | Params | Mô tả |
|--------|--------|-------|
| `connect` | `{token, user_id, sender_id?, locale?}` | Xác thực. Phải là request đầu tiên |
| `health` | — | Ping / health check |
| `status` | — | Trạng thái gateway |
| `providers.models` | — | Liệt kê model khả dụng từ tất cả LLM provider đã cấu hình |

### Chat

> **Kiểm tra quyền sở hữu session (v3):** Tất cả 5 method `chat.*` đều xác minh quyền sở hữu session. Người dùng không phải admin chỉ có thể truy cập session của chính họ (khớp theo `user_id`). Truy cập session của người khác trả về lỗi `UNAUTHORIZED`. Admin và kết nối gateway-owner bỏ qua kiểm tra này.

| Method | Params | Mô tả |
|--------|--------|-------|
| `chat.send` | `{message, sessionKey?, agentId?}` | Gửi tin nhắn; response stream qua event `agent`/`chat` |
| `chat.history` | `{sessionKey}` | Lấy lịch sử tin nhắn |
| `chat.abort` | `{sessionKey}` | Hủy run đang diễn ra |
| `chat.inject` | `{sessionKey, content}` | Inject tin nhắn không trigger run |
| `chat.session.status` | `{sessionKey}` | Lấy trạng thái run và phase hoạt động của session |

### Quản lý Agents

| Method | Params | Mô tả |
|--------|--------|-------|
| `agents.list` | — | Liệt kê tất cả agents |
| `agent.wait` | `{agentId}` | Chờ agent hoàn thành run hiện tại |
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

### Teams

| Method | Mô tả |
|--------|-------|
| `teams.list` | Liệt kê tất cả team |
| `teams.create` | Tạo team (chỉ admin) |
| `teams.get` | Lấy team kèm thành viên |
| `teams.update` | Cập nhật thuộc tính team |
| `teams.delete` | Xóa team |
| `teams.members.add` | Thêm agent vào team |
| `teams.members.remove` | Xóa agent khỏi team |
| `teams.tasks.list` | Liệt kê task của team (có thể lọc) |
| `teams.tasks.get` | Lấy task kèm comments/events |
| `teams.tasks.create` | Tạo task |
| `teams.tasks.claim` | Claim task (đánh dấu in-progress) |
| `teams.tasks.assign` | Gán task cho thành viên |
| `teams.tasks.approve` | Phê duyệt task hoàn thành |
| `teams.tasks.reject` | Từ chối task |
| `teams.tasks.comment` | Thêm comment vào task |
| `teams.tasks.comments` | Liệt kê comment của task |
| `teams.tasks.events` | Liệt kê lịch sử event của task |
| `teams.tasks.delete` | Xóa task |
| `teams.tasks.active-by-session` | Lấy task đang hoạt động theo session (dùng để khôi phục trạng thái khi chuyển session) |
| `teams.workspace.list` | Liệt kê file workspace của team |
| `teams.workspace.read` | Đọc file workspace |
| `teams.workspace.delete` | Xóa file workspace |
| `teams.events.list` | Liệt kê lịch sử event team (phân trang) |
| `teams.known_users` | Lấy danh sách user ID đã biết trong team |
| `teams.scopes` | Lấy channel/chat scope cho task routing |

### Usage & Quota

| Method | Mô tả |
|--------|-------|
| `usage.get` | Thống kê token usage |
| `usage.summary` | Usage summary cards |
| `quota.usage` | Quota consumption cho user hiện tại |

### Logs

| Method | Params | Mô tả |
|--------|--------|-------|
| `logs.tail` | `{action: "start"\|"stop", level?}` | Bắt đầu hoặc dừng stream log trực tiếp; log entries được gửi qua server-push event khi đang active |

### Heartbeat

| Method | Params | Mô tả |
|--------|--------|-------|
| `heartbeat.get` | `{agentId}` | Lấy cấu hình heartbeat của agent |
| `heartbeat.set` | `{agentId, enabled?, intervalSec?, prompt?, providerName?, model?, ...}` | Upsert cấu hình heartbeat (intervalSec tối thiểu 300) |
| `heartbeat.toggle` | `{agentId, enabled}` | Bật hoặc tắt heartbeat |
| `heartbeat.test` | `{agentId}` | Kích hoạt heartbeat run ngay lập tức |
| `heartbeat.logs` | `{agentId, limit?, offset?}` | Liệt kê log thực thi heartbeat |
| `heartbeat.checklist.get` | `{agentId}` | Đọc file context HEARTBEAT.md |
| `heartbeat.checklist.set` | `{agentId, content}` | Ghi/thay thế file context HEARTBEAT.md |
| `heartbeat.targets` | `{agentId}` | Liệt kê delivery target cho thông báo heartbeat |

### API Keys

| Method | Params | Mô tả |
|--------|--------|-------|
| `api_keys.list` | — | Liệt kê API key (non-admin chỉ thấy key của mình) |
| `api_keys.create` | `{name, scopes, expires_in?, owner_id?, tenant_id?}` | Tạo API key; trả về raw key một lần duy nhất |
| `api_keys.revoke` | `{id}` | Thu hồi API key (non-admin chỉ thu hồi key của mình) |

### Tenants

| Method | Params | Mô tả |
|--------|--------|-------|
| `tenants.list` | — | Liệt kê tất cả tenant (chỉ owner) |
| `tenants.get` | `{id}` | Lấy tenant theo ID |
| `tenants.create` | `{name, slug, settings?}` | Tạo tenant và workspace |
| `tenants.update` | `{id, name?, status?, settings?}` | Cập nhật thuộc tính tenant |
| `tenants.users.list` | `{tenant_id}` | Liệt kê user trong tenant |
| `tenants.users.add` | `{tenant_id, user_id, role?}` | Thêm user (role: owner/admin/operator/member/viewer) |
| `tenants.users.remove` | `{tenant_id, user_id}` | Xóa user và phát sự kiện access-revoked |
| `tenants.mine` | — | Lấy danh sách tenant membership của user hiện tại |

### Messaging

| Method | Params | Mô tả |
|--------|--------|-------|
| `zalo.personal.qr.start` | `{instance_id}` | Bắt đầu quy trình đăng nhập QR Zalo Personal |
| `zalo.personal.contacts` | `{instance_id}` | Lấy danh sách bạn bè và nhóm Zalo |

---

## Server-Push Events

### Agent Events (`"agent"`)

Phát ra trong quá trình agent run. Kiểm tra `payload.type`:

| `payload.type` | Mô tả |
|----------------|-------|
| `run.started` | Agent run bắt đầu |
| `run.completed` | Run hoàn thành thành công |
| `run.failed` | Run gặp lỗi |
| `run.cancelled` | Run bị huỷ trước khi hoàn thành |
| `run.retrying` | Run đang được retry |
| `tool.call` | Tool được gọi |
| `tool.result` | Tool trả kết quả |
| `block.reply` | Reply bị input guard chặn |
| `activity` | Cập nhật hoạt động agent |

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
| `presence` | Thay đổi trạng thái hiện diện của user |
| `agent.summoning` | Predefined agent persona generation đang diễn ra |
| `delegation.started` | Bắt đầu delegation sang subagent |
| `delegation.completed` | Delegation hoàn thành thành công |
| `delegation.failed` | Delegation thất bại |
| `delegation.cancelled` | Delegation bị huỷ |
| `delegation.progress` | Kết quả delegation trung gian |
| `delegation.announce` | Kết quả subagent được gom lại gửi về parent |
| `delegation.accumulated` | Kết quả delegation tích luỹ |
| `connect.challenge` | Challenge xác thực được phát |
| `voicewake.changed` | Cài đặt voice wake word thay đổi |
| `talk.mode` | Trạng thái talk mode thay đổi |
| `node.pair.requested` | Nhận được node pairing request |
| `node.pair.resolved` | Node pairing được giải quyết |
| `session.updated` | Metadata chat session được cập nhật |
| `trace.updated` | Agent trace được cập nhật |
| `heartbeat` | Sự kiện thực thi heartbeat |
| `workspace.file.changed` | File team workspace thay đổi |
| `agent_link.created` | Delegation link được tạo |
| `agent_link.updated` | Delegation link được cập nhật |
| `agent_link.deleted` | Delegation link bị xóa |
| `tenant.access.revoked` | Quyền truy cập tenant bị thu hồi của user |
| `zalo.personal.qr.code` | QR code Zalo được tạo |
| `zalo.personal.qr.done` | Đăng nhập QR Zalo hoàn tất |

### Skill Events

| Event | Mô tả |
|-------|-------|
| `skill.deps.checked` | Bắt đầu kiểm tra dependency của skill |
| `skill.deps.complete` | Tất cả dependency của skill đã được giải quyết |
| `skill.deps.installing` | Bắt đầu cài đặt dependency của skill |
| `skill.deps.installed` | Cài đặt dependency skill hoàn tất |
| `skill.dep.item.installing` | Đang cài đặt từng dependency |
| `skill.dep.item.installed` | Cài đặt từng dependency hoàn tất |

### Team Events

| Event | Mô tả |
|-------|-------|
| `team.created` | Team được tạo |
| `team.updated` | Team được cập nhật |
| `team.deleted` | Team bị xóa |
| `team.member.added` | Thành viên được thêm vào team |
| `team.member.removed` | Thành viên bị xóa khỏi team |
| `team.message.sent` | Tin nhắn peer-to-peer trong team |
| `team.leader.processing` | Team leader đang xử lý request |
| `team.task.created` | Task được tạo |
| `team.task.completed` | Task hoàn thành |
| `team.task.claimed` | Task được nhận |
| `team.task.cancelled` | Task bị huỷ |
| `team.task.failed` | Task thất bại |
| `team.task.reviewed` | Task được review |
| `team.task.approved` | Task được phê duyệt |
| `team.task.rejected` | Task bị từ chối |
| `team.task.progress` | Cập nhật tiến độ task |
| `team.task.commented` | Bình luận được thêm vào task |
| `team.task.assigned` | Task được giao cho thành viên |
| `team.task.dispatched` | Task được phân phối |
| `team.task.updated` | Task được cập nhật |
| `team.task.deleted` | Task bị xóa |
| `team.task.stale` | Task bị đánh dấu cũ |
| `team.task.attachment_added` | Tệp đính kèm được thêm vào task |

---

## Ví dụ Session

```javascript
const ws = new WebSocket("ws://localhost:18790/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "req", id: "1", method: "connect",
    params: { token: "YOUR_TOKEN", user_id: "user-123", protocol: 3 }
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

- [REST API](/rest-api) — HTTP endpoint cho agent CRUD, skill upload, traces
- [CLI Commands](/cli-commands) — quản lý pairing và session từ terminal
- [Glossary](/glossary) — Session, Lane, Compaction, và các thuật ngữ quan trọng khác

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
