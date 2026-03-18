> Bản dịch từ [English version](#troubleshoot-common)

# Các vấn đề thường gặp

> Cách xử lý những vấn đề phổ biến nhất khi chạy GoClaw.

## Tổng quan

Trang này bao gồm các vấn đề bạn thường gặp khi khởi động GoClaw lần đầu hoặc sau khi thay đổi cấu hình. Vấn đề được nhóm theo giai đoạn: khởi động, WebSocket connection, hành vi agent, và sử dụng tài nguyên.

## Gateway Không Khởi Động

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `failed to load config` | Đường dẫn config file sai hoặc JSON5 malformed | Kiểm tra env var `GOCLAW_CONFIG`; validate cú pháp JSON5 |
| `No AI provider API key found` | Env var API key chưa được load | Chạy `source .env.local && ./goclaw` hoặc chạy lại `./goclaw onboard` |
| `ping postgres: dial error` | PostgreSQL không chạy hoặc DSN sai | Xác minh `GOCLAW_POSTGRES_DSN`; kiểm tra Postgres đang chạy |
| `open discord session` error | Discord bot token không hợp lệ | Kiểm tra lại `GOCLAW_DISCORD_TOKEN` trong env |
| `sandbox disabled: Docker not available` | Docker không cài/chạy nhưng sandbox mode được đặt | Cài Docker hoặc đặt `sandbox.mode: "off"` trong config |
| Port already in use | Một process khác đang dùng cùng port | Đổi `GOCLAW_PORT` (mặc định `8080`) hoặc kill process chiếm port |
| `database schema is outdated` | Chưa chạy migration sau khi nâng cấp binary | Chạy `./goclaw upgrade` (hoặc đặt `GOCLAW_AUTO_UPGRADE=true`) |
| `database schema is dirty` | Migration trước đó thất bại giữa chừng | Chạy `./goclaw migrate force <version-1>` rồi `./goclaw upgrade` |
| `database schema is newer than this binary` | Đang dùng binary cũ với DB mới hơn | Nâng cấp binary GoClaw lên phiên bản mới nhất |

**Kiểm tra nhanh:** GoClaw tự phát hiện thiếu provider config và in thông báo hữu ích:

```
No AI provider API key found. Did you forget to load your secrets?

  source .env.local && ./goclaw
```

## WebSocket Connection Lỗi

WebSocket endpoint là `ws://localhost:8080/ws`. Frame đầu tiên gửi đi **phải** là method `connect` — bất kỳ method nào khác sẽ trả về `ErrUnauthorized: first request must be 'connect'`.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `first request must be 'connect'` | Sai thứ tự frame | Gửi `{"type":"req","method":"connect","params":{...}}` trước |
| `invalid frame` / `malformed request` | JSON xấu | Validate frame theo wire type trong `pkg/protocol` |
| `websocket read error` (log) | Client đóng đột ngột | Bình thường khi tab trình duyệt đóng; kiểm tra logic reconnect phía client |
| Rate limited (không có response) | Quá nhiều request mỗi user | Gateway áp dụng per-user token-bucket rate limiting; chờ và retry |
| CORS block trong browser | Browser enforce same-origin | Thêm origin frontend của bạn vào `gateway.allowed_origins` trong config |
| Tin nhắn vượt 512 KB | WebSocket frame lớn hơn giới hạn server | Chia nhỏ payload; GoClaw đóng connection với `ErrReadLimit` khi vượt giới hạn |

## Agent Không Phản Hồi

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `HTTP 401` từ provider | API key không hợp lệ hoặc hết hạn | Cập nhật API key của provider trong dashboard hoặc DB |
| `HTTP 429` từ provider | Hit rate limit upstream | GoClaw tự retry (tối đa 3× với exponential backoff); nếu kéo dài, giảm request volume |
| `HTTP 404` / model not found | Tên model sai hoặc không khả dụng | Kiểm tra tên model trong agent config với danh sách model hiện tại của provider |
| Agent trả về reply rỗng | Lỗi system prompt hoặc giới hạn token | Kiểm tra file `bootstrap/`; review context window usage trong session tracing |
| Tool call không thực thi | Thiếu tool registration hoặc sandbox cấu hình sai | Kiểm tra log khởi động tìm dòng `registered tool:`; xác minh Docker nếu sandbox bật |

GoClaw retry khi gặp `429`, `500`, `502`, `503`, `504`, và network error (connection reset, EOF, timeout) với exponential backoff bắt đầu 300ms, tối đa 30s.

## Memory Usage Cao

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Memory tăng theo số session | Nhiều session mở được cache trong bộ nhớ | Session được Postgres-backed; kiểm tra session cleanup interval trong config |
| Footprint embeddings lớn | pgvector index loading | Bình thường với memory collection lớn; đảm bảo `WORK_MEM` được đặt trong Postgres |
| Log buffer tăng | `LogTee` capture tất cả log cho UI streaming | Không phải leak; giới hạn per-client. Kiểm tra WS client bị treo |

## Chẩn đoán

Chạy `./goclaw doctor` để kiểm tra nhanh sức khỏe hệ thống. Lệnh này xác minh:

- Config file có tồn tại và parse được không
- Kết nối PostgreSQL và schema version
- API key của provider (được che)
- Credentials channel
- External tool (Docker, curl, git)
- Workspace directory

```
./goclaw doctor
```

## Tiếp theo

- [Vấn đề theo channel](#troubleshoot-channels)
- [Vấn đề theo provider](#troubleshoot-providers)
- [Vấn đề database](#troubleshoot-database)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
