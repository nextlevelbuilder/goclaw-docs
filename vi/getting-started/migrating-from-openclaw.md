> Bản dịch từ [English version](/migrating-from-openclaw)

# Chuyển từ OpenClaw sang GoClaw

> Những gì thay đổi trong GoClaw và cách chuyển cài đặt của bạn.

## Tổng quan

GoClaw là phiên bản đa tenant được phát triển từ OpenClaw. Nếu bạn đang chạy OpenClaw như một personal assistant, GoClaw mang đến cho bạn team, delegation, thông tin xác thực mã hóa, tracing, và cách ly per-user — trong khi vẫn giữ nguyên các khái niệm agent bạn đã quen.

## Tại sao nên chuyển?

| Tính năng | OpenClaw | GoClaw |
|-----------|----------|--------|
| Đa tenant | Không (single user) | Có (cách ly per-user) |
| Agent team | Sub-agent delegation | Cộng tác team đầy đủ (task board chung, delegation) |
| Lưu trữ thông tin xác thực | Plain text trong config | Mã hóa AES-256-GCM trong DB |
| Memory | SQLite + QMD semantic search | PostgreSQL + SQLite (FTS5 hybrid search) |
| Tracing | Không | Đầy đủ LLM call trace với theo dõi chi phí |
| Hỗ trợ MCP | Có (qua mcporter bridge) | Có (stdio, SSE, streamable-http) |
| Custom tool | Có (52+ built-in skill) | Có (định nghĩa qua dashboard hoặc API) |
| Code sandbox | Có (Docker-based) | Có (Docker-based với per-agent config) |
| Database | SQLite | PostgreSQL |
| Channel | 6 core (Telegram, Discord, Slack, Signal, iMessage, Web) + 35+ channel mở rộng | 7 (Telegram, Discord, Slack, WhatsApp, Zalo OA, Zalo Personal, Feishu) |
| Dashboard | Web UI cơ bản | Management dashboard đầy đủ |

## Bảng so sánh Config

### Cấu hình Agent

| OpenClaw | GoClaw | Ghi chú |
|----------|--------|---------|
| `ai.provider` | `agents.defaults.provider` | Tên provider giống nhau |
| `ai.model` | `agents.defaults.model` | Model identifier giống nhau |
| `ai.maxTokens` | `agents.defaults.max_tokens` | Snake case trong GoClaw |
| `ai.temperature` | `agents.defaults.temperature` | Khoảng giá trị giống nhau (0-2) |
| `commands.*` | `tools.*` | Tool thay thế command |

### Cài đặt Channel

Channel hoạt động tương tự về mặt khái niệm nhưng dùng định dạng config khác:

**OpenClaw:**
```json
{
  "telegram": {
    "botToken": "123:ABC"
  }
}
```

**GoClaw:**
```jsonc
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "env:TELEGRAM_BOT_TOKEN"
    }
  }
}
```

Lưu ý: GoClaw giữ token trong biến môi trường, không đặt trong file config.

### Context File

GoClaw dùng context file (khái niệm tương tự OpenClaw). 6 file core được load mỗi session:

| File | Mục đích |
|------|---------|
| `AGENTS.md` | Hướng dẫn vận hành, quy tắc memory, hướng dẫn an toàn |
| `SOUL.md` | Tính cách và giọng điệu của agent |
| `IDENTITY.md` | Tên, avatar, lời chào |
| `USER.md` | Hồ sơ người dùng, timezone, tùy chọn |
| `BOOTSTRAP.md` | Nghi thức chạy lần đầu (tự động xóa sau khi hoàn tất) |

> **Lưu ý:** `TOOLS.md` không được dùng trong GoClaw — cấu hình tool được quản lý qua Dashboard. Không cần chuyển file này.

Context file bổ sung cho tính năng nâng cao:

| File | Mục đích |
|------|---------|
| `MEMORY.md` | Memory dài hạn được chọn lọc |
| `DELEGATION.md` | Hướng dẫn delegation cho sub-agent |
| `TEAM.md` | Quy tắc phối hợp team |

GoClaw hỗ trợ context files ở cả cấp agent (dùng chung) và cấp user (ghi đè). Tên file liệt kê là quy ước, không bắt buộc.

**Điểm khác biệt quan trọng:** OpenClaw lưu các file này trên filesystem. GoClaw lưu trong PostgreSQL với phạm vi per-user — mỗi người dùng có thể có phiên bản context file riêng cho cùng một agent.

## Những gì được chuyển (và những gì không)

| Được chuyển | Không được chuyển |
|-------------|------------------|
| Cấu hình agent (provider, model, tools) | Lịch sử tin nhắn (bắt đầu mới) |
| Context file (upload thủ công) | Trạng thái session |
| Channel token (qua biến môi trường) | Hồ sơ người dùng (tạo lại lần đăng nhập đầu) |

## Các bước chuyển đổi

1. **Cài đặt GoClaw** — Làm theo hướng dẫn [Cài đặt](/installation) và [Quick Start](/quick-start)
2. **Ánh xạ config** — Dịch OpenClaw config bằng bảng so sánh ở trên
3. **Chuyển context file** — Copy các file `.md` context (ngoại trừ `TOOLS.md` — không dùng trong GoClaw); upload qua dashboard hoặc API
4. **Cập nhật channel token** — Chuyển token từ config sang biến môi trường
5. **Kiểm tra** — Xác minh agent phản hồi đúng qua từng channel

> **Lưu ý bảo mật:** GoClaw mã hóa tất cả thông tin xác thực bằng AES-256-GCM trong database, an toàn hơn so với cách lưu plaintext trong config của OpenClaw. Sau khi chuyển API key và token sang GoClaw, chúng được lưu trữ ở dạng mã hóa.

## Tính năng mới trong GoClaw

Các tính năng bạn có thêm sau khi chuyển:

- **Agent Team** — Nhiều agent cộng tác trên tác vụ với task board chung
- **Delegation** — Agent A gọi Agent B cho các subtask chuyên biệt
- **Multi-Tenancy** — Mỗi người dùng có session, memory, và context cách ly
- **Traces** — Xem mọi LLM call, tool sử dụng, và chi phí token
- **Custom Tool** — Định nghĩa tool của riêng bạn mà không cần chạm vào code Go
- **MCP Integration** — Kết nối external tool server
- **Cron Job** — Lên lịch tác vụ agent định kỳ
- **Thông tin xác thực mã hóa** — API key lưu với mã hóa AES-256-GCM

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Context file không load | Upload qua dashboard hoặc API; đường dẫn filesystem khác với OpenClaw |
| Hành vi phản hồi khác | Kiểm tra `max_tool_iterations` — mặc định GoClaw (20) có thể khác cài đặt OpenClaw của bạn |
| Thiếu channel | GoClaw tập trung vào 7 channel core; một số channel OpenClaw (IRC, Signal, iMessage, LINE, v.v.) chưa được port |

## Tiếp theo

- [GoClaw hoạt động như thế nào](/how-goclaw-works) — Hiểu về kiến trúc mới
- [Multi-Tenancy](/multi-tenancy) — Tìm hiểu về cách ly per-user
- [Configuration](/configuration) — Tham chiếu config đầy đủ

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
