# Giao thức WebSocket (v3)

Các loại frame: `req` (yêu cầu từ client), `res` (phản hồi từ server), `event` (server đẩy).

## Xác thực

Yêu cầu đầu tiên phải là bắt tay `connect`. Xác thực hỗ trợ ba con đường:

```json
// Con đường 1: Dựa trên token (vai trò admin)
{"type": "req", "id": 1, "method": "connect", "params": {"token": "your-gateway-token", "user_id": "alice"}}

// Con đường 2: Kết nối lại browser pairing (vai trò operator)
{"type": "req", "id": 1, "method": "connect", "params": {"sender_id": "previously-paired-id", "user_id": "alice"}}

// Con đường 3: Không có token -- khởi động luồng browser pairing (trả về mã pairing)
{"type": "req", "id": 1, "method": "connect", "params": {"user_id": "alice"}}
```

## Các Method

| Method | Mô tả |
|--------|-------------|
| `connect` | Bắt tay xác thực (phải là yêu cầu đầu tiên) |
| `health` | Kiểm tra sức khỏe server |
| `status` | Trạng thái và metadata server |
| `chat.send` | Gửi message đến agent |
| `chat.history` | Lấy lịch sử session |
| `chat.abort` | Hủy yêu cầu agent đang chạy |
| `agent` | Lấy thông tin agent |
| `sessions.list` | Liệt kê các session đang hoạt động |
| `sessions.delete` | Xóa session |
| `sessions.patch` | Cập nhật metadata session |
| `skills.list` | Liệt kê các skill có sẵn |
| `cron.list` | Liệt kê các cron job đã lên lịch |
| `cron.create` | Tạo cron job |
| `cron.delete` | Xóa cron job |
| `cron.toggle` | Bật/tắt cron job |
| `models.list` | Liệt kê các mô hình AI có sẵn |
| `browser.pairing.status` | Kiểm tra trạng thái phê duyệt pairing |
| `device.pair.request` | Yêu cầu ghép cặp thiết bị |
| `device.pair.approve` | Phê duyệt mã pairing |
| `device.pair.list` | Liệt kê các pairing đang chờ và đã phê duyệt |
| `device.pair.revoke` | Thu hồi pairing |

## Sự kiện (server đẩy)

| Sự kiện | Mô tả |
|-------|-------------|
| `chunk` | Token streaming từ LLM (payload: `{content}`) |
| `tool.call` | Agent đang gọi tool (payload: `{name, id}`) |
| `tool.result` | Kết quả thực thi tool |
| `run.started` | Agent bắt đầu xử lý |
| `run.completed` | Agent hoàn thành xử lý |
| `shutdown` | Server đang tắt |

## Định dạng Frame

### Yêu cầu (client gửi server)
```json
{
  "type": "req",
  "id": "unique-request-id",
  "method": "chat.send",
  "params": { ... }
}
```

### Phản hồi (server gửi client)
```json
{
  "type": "res",
  "id": "matching-request-id",
  "ok": true,
  "payload": { ... }
}
```

### Phản hồi lỗi
```json
{
  "type": "res",
  "id": "matching-request-id",
  "ok": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

### Sự kiện (server đẩy)
```json
{
  "type": "event",
  "event": "chunk",
  "payload": { "content": "streaming text..." }
}
```
