# Vấn Đề WebSocket

> Xử lý sự cố kết nối WebSocket, xác thực và xử lý tin nhắn trong GoClaw.

## Tổng Quan

GoClaw cung cấp một endpoint WebSocket duy nhất tại `/ws`. Toàn bộ giao tiếp thời gian thực giữa client và gateway — chat, sự kiện, RPC call — đều chạy qua kết nối này. Trang này liệt kê các lỗi phổ biến kèm nguyên nhân và cách khắc phục.

## Xác Thực

Frame đầu tiên gửi sau khi kết nối **phải** là lệnh gọi method `connect`. Bất kỳ method nào khác trước khi xác thực đều trả về lỗi `UNAUTHORIZED`.

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `UNAUTHORIZED: first request must be 'connect'` | Gửi method khác trước `connect` | Luôn gửi `{"type":"req","method":"connect","params":{...}}` làm frame đầu tiên |
| `UNAUTHORIZED` trên mọi request | Token thiếu hoặc sai | Kiểm tra header `Authorization` hoặc token trong payload connect |
| Browser pairing bị treo | Đang chờ admin phê duyệt | Chỉ `browser.pairing.status` được phép trước khi pairing hoàn tất — poll method đó |
| Kết nối bị từ chối ngay lập tức | Origin không có trong allowlist | Thêm origin frontend vào `gateway.allowed_origins` trong config (xem CORS bên dưới) |

**Ví dụ connect frame:**

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_API_KEY",
    "user_id": "user-123"
  }
}
```

## Lỗi Kết Nối

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Không nhận được HTTP 101 | URL sai hoặc gateway chưa chạy | Endpoint là `ws://host:8080/ws` (hoặc `wss://` với TLS); kiểm tra gateway đang hoạt động |
| `websocket upgrade failed` trong server log | Proxy không chuyển tiếp header `Upgrade` | Cấu hình nginx/caddy để pass `Connection: Upgrade` và `Upgrade: websocket` |
| Kết nối bị ngắt sau 60 giây không hoạt động | Read deadline timeout | Gateway yêu cầu pong reply mỗi 60 giây; implement pong handler trong client |
| `websocket read error` trong server log | Client đóng đột ngột (đóng tab, mất mạng) | Bình thường với browser client; implement reconnect với exponential backoff |
| `INVALID_REQUEST: unexpected frame type` | Gửi frame type không phải request | Chỉ frame kiểu `req` được hỗ trợ từ phía client |
| `INVALID_REQUEST: invalid frame` | JSON không hợp lệ | Kiểm tra cấu trúc payload theo protocol wire types |

### CORS

Nếu kết nối bị từ chối trong browser console với lỗi CORS, origin của request không có trong allowlist.

```yaml
# config.json5
gateway: {
  allowed_origins: ["https://app.example.com", "http://localhost:3000"]
}
```

Client không phải browser (CLI, SDK, channel) không gửi header `Origin` và luôn được cho phép.

## Kích Thước Tin Nhắn

Server giới hạn **512 KB** mỗi WebSocket frame (`maxWSMessageSize = 512 * 1024`). Khi frame vượt giới hạn này, gorilla/websocket báo `ErrReadLimit` và server đóng kết nối.

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Kết nối bị ngắt giữa chừng | Frame vượt 512 KB | Chia payload lớn thành nhiều request nhỏ; tránh nhúng binary trực tiếp |
| Upload file thất bại qua WebSocket | Nội dung file nhúng trong frame | Dùng HTTP media upload endpoint (`/api/media/upload`) thay thế |

**Quy tắc:** giữ payload request dưới 100 KB. Nội dung lớn nên dùng HTTP endpoint.

## Giới Hạn Tốc Độ (Rate Limiting)

Rate limiting **tắt theo mặc định**. Khi bật (`gateway.rate_limit_rpm > 0`), gateway áp dụng token-bucket limiter theo từng user với burst là 5.

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Request bị bỏ qua (không có response) | Vượt rate limit của user | Giảm tần suất gửi request và thử lại |
| `security.rate_limited` trong server log | Client vượt `rate_limit_rpm` | Tăng `gateway.rate_limit_rpm` hoặc giảm lưu lượng từ client |

**Ping/pong frame không bị tính** vào rate limit — chỉ các RPC request frame mới bị tính.

Để cấu hình rate limiting:

```yaml
# config.json5
gateway: {
  rate_limit_rpm: 60   # 60 request mỗi phút mỗi user, burst 5
}
```

Đặt `0` hoặc bỏ qua để tắt (mặc định).

## Ping / Pong

Gateway gửi WebSocket ping mỗi **30 giây**. Read deadline được reset về **60 giây** sau mỗi pong reply.

Nếu client không trả lời ping trong vòng 60 giây, server coi kết nối đã chết và đóng lại.

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Kết nối bị ngắt khi client không hoạt động | Client không phản hồi ping frame | Bật auto pong trong thư viện WebSocket (hầu hết đã bật mặc định) |
| Kết nối ngắt đúng sau 60 giây | Pong handler chưa được đăng ký | Đăng ký pong handler để reset read deadline |

Hầu hết thư viện WebSocket (browser native, `ws` cho Node.js, gorilla) xử lý ping/pong tự động. Kiểm tra tài liệu thư viện nếu kết nối bị ngắt khi idle.

## Thư Viện Client

| Thư viện | Ghi chú |
|----------|---------|
| Browser `WebSocket` API | Ping/pong do browser xử lý. Không cần cấu hình thêm. |
| Node.js `ws` | Bật `{ autoPong: true }` (mặc định trong các phiên bản gần đây) |
| Python `websockets` | Ping/pong tự động; dùng tham số `ping_interval` / `ping_timeout` |
| Go `gorilla/websocket` | Đăng ký pong handler và reset read deadline thủ công |
| CLI / curl | Dùng `websocat` — tự động xử lý pong |

**Reconnect pattern:** khi nhận sự kiện close, đợi 1 giây → kết nối lại → xác thực bằng `connect` → tiếp tục.

## Tiếp Theo

- [Vấn Đề Phổ Biến](#troubleshoot-common) — lỗi khởi động, agent, bộ nhớ
- [Xử Lý Sự Cố Channel](#troubleshoot-channels) — lỗi Telegram, Discord, WhatsApp

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
