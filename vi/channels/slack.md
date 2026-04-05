> Bản dịch từ [English version](/channel-slack)

# Channel Slack

Tích hợp Slack qua Socket Mode (WebSocket). Hỗ trợ DM, @mention trong channel, trả lời theo thread, streaming, reaction, media, và message debouncing.

## Thiết lập

**Tạo Slack App:**
1. Vào https://api.slack.com/apps?new_app=1
2. Chọn "From scratch", đặt tên app (vd: `GoClaw Bot`), chọn workspace
3. Click **Create App**

**Bật Socket Mode:**
1. Thanh bên trái → **Socket Mode** → bật ON
2. Đặt tên token (vd: `goclaw-socket`), thêm scope `connections:write`
3. Sao chép **App-Level Token** (`xapp-...`)

**Thêm Bot Scopes:**
1. Thanh bên trái → **OAuth & Permissions**
2. Trong **Bot Token Scopes**, thêm:

| Scope | Mục đích |
|-------|---------|
| `app_mentions:read` | Nhận sự kiện @bot mention |
| `chat:write` | Gửi và chỉnh sửa tin nhắn |
| `im:history` | Đọc tin nhắn DM |
| `im:read` | Xem danh sách DM channel |
| `im:write` | Mở DM với user |
| `channels:history` | Đọc tin nhắn public channel |
| `groups:history` | Đọc tin nhắn private channel |
| `mpim:history` | Đọc tin nhắn multi-party DM |
| `reactions:write` | Thêm/xóa emoji reaction (tùy chọn) |
| `reactions:read` | Đọc emoji reaction (tùy chọn) |
| `files:read` | Tải file gửi đến bot |
| `files:write` | Upload file từ agent |
| `users:read` | Lấy tên hiển thị user |

**Tập tối thiểu** (chỉ DM, không reaction/file): `chat:write`, `im:history`, `im:read`, `im:write`, `users:read`, `app_mentions:read`

**Bật Event:**
1. Thanh bên trái → **Event Subscriptions** → bật ON
2. Trong **Subscribe to bot events**, thêm:

| Event | Mô tả |
|-------|-------------|
| `message.im` | Tin nhắn DM với bot |
| `message.channels` | Tin nhắn trong public channel |
| `message.groups` | Tin nhắn trong private channel |
| `message.mpim` | Tin nhắn multi-party DM |
| `app_mention` | Khi bot được @mention |

Không cần Request URL — Socket Mode xử lý event qua WebSocket.

**Cài đặt & Lấy Token:**
1. **OAuth & Permissions** → **Install to Workspace** → **Allow**
2. Sao chép **Bot User OAuth Token** (`xoxb-...`)

**Bật Slack trong GoClaw:**

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-YOUR-BOT-TOKEN",
      "app_token": "xapp-YOUR-APP-LEVEL-TOKEN",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true
    }
  }
}
```

Hoặc qua biến môi trường:

```bash
GOCLAW_SLACK_BOT_TOKEN=xoxb-...
GOCLAW_SLACK_APP_TOKEN=xapp-...
# Tự động bật Slack khi cả hai được thiết lập
```

**Mời Bot vào Channel:**
- Public: `/invite @GoClaw Bot` trong channel
- Private: Tên channel → **Integrations** → **Add an App**
- DM: Nhắn tin trực tiếp cho bot

## Cấu hình

Tất cả config key nằm trong `channels.slack`:

| Key | Kiểu | Mặc định | Mô tả |
|-----|------|---------|-------------|
| `enabled` | bool | false | Bật/tắt channel |
| `bot_token` | string | bắt buộc | Bot User OAuth Token (`xoxb-...`) |
| `app_token` | string | bắt buộc | App-Level Token cho Socket Mode (`xapp-...`) |
| `user_token` | string | -- | User OAuth Token cho định danh tùy chỉnh (`xoxp-...`) |
| `allow_from` | list | -- | Danh sách trắng user ID hoặc channel ID |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `group_policy` | string | `"open"` | `open`, `pairing`, `allowlist`, `disabled` |
| `require_mention` | bool | true | Yêu cầu @bot mention trong channel |
| `history_limit` | int | 50 | Tin nhắn chờ tối đa mỗi channel cho context (0=tắt) |
| `dm_stream` | bool | false | Bật streaming cho DM |
| `group_stream` | bool | false | Bật streaming cho group |
| `native_stream` | bool | false | Dùng Slack ChatStreamer API nếu có |
| `reaction_level` | string | `"off"` | `off`, `minimal`, `full` |
| `block_reply` | bool | -- | Ghi đè block_reply của gateway (nil=kế thừa) |
| `debounce_delay` | int | 300 | Mili giây trước khi gửi các tin nhắn nhanh (0=tắt) |
| `thread_ttl` | int | 24 | Giờ trước khi thread participation hết hạn (0=tắt) |
| `media_max_bytes` | int | 20MB | Kích thước file tải tối đa |

## Loại Token

| Token | Tiền tố | Bắt buộc | Mục đích |
|-------|--------|----------|---------|
| Bot Token | `xoxb-` | Có | API chính: tin nhắn, reaction, file, thông tin user |
| App-Level Token | `xapp-` | Có | Kết nối WebSocket Socket Mode |
| User Token | `xoxp-` | Không | Định danh bot tùy chỉnh (tên/icon) |

Tiền tố token được kiểm tra khi khởi động — token sai sẽ báo lỗi rõ ràng.

## Tính năng

### Socket Mode

Dùng WebSocket thay vì HTTP webhook. Không cần URL công khai hoặc ingress — lý tưởng cho triển khai tự quản lý. Event được xác nhận trong 3 giây theo yêu cầu của Slack.

Phân loại dead socket phát hiện lỗi auth không thể thử lại (`invalid_auth`, `token_revoked`, `missing_scope`) và dừng channel thay vì thử lại vô hạn.

### Mention Gating

Trong channel, bot chỉ phản hồi khi được @mention (mặc định `require_mention: true`). Tin nhắn không mention được lưu vào bộ đệm lịch sử và được đưa vào làm context khi bot được mention tiếp theo.

```mermaid
flowchart TD
    MSG["User đăng trong channel"] --> MENTION{"Bot được @mention<br/>hoặc trong thread đã tham gia?"}
    MENTION -->|Không| BUFFER["Thêm vào lịch sử chờ<br/>(tối đa 50 tin nhắn)"]
    MENTION -->|Có| PROCESS["Xử lý ngay<br/>Bao gồm lịch sử làm context"]
    BUFFER --> NEXT["Mention tiếp theo:<br/>lịch sử được bao gồm"]
```

Khi `require_mention: false`, Slack gửi cả sự kiện `message` và `app_mention` cho cùng một tin nhắn. GoClaw dùng dedup key chung (`channel:timestamp`) để event nào đến trước sẽ xử lý tin nhắn; event trùng lặp bị bỏ qua. Với `require_mention: false`, handler `app_mention` thoát trước khi lưu dedup key, đảm bảo handler `message` tiếp quản xử lý.

### Thread Participation

Sau khi bot trả lời trong thread, bot tự động trả lời các tin nhắn tiếp theo trong thread đó mà không cần @mention. Participation hết hạn sau `thread_ttl` giờ (mặc định 24). Đặt `thread_ttl: 0` để tắt (luôn yêu cầu @mention).

### Message Debouncing

Các tin nhắn nhanh từ cùng thread được gộp lại thành một lần gửi. Delay mặc định: 300ms (cấu hình qua `debounce_delay`). Các batch đang chờ được flush khi shutdown.

### Định dạng tin nhắn

Markdown từ LLM được chuyển sang Slack mrkdwn:

```
Markdown → Slack mrkdwn
**bold**  → *bold*
_italic_  → _italic_
~~strike~~ → ~strike~
# Header  → *Header*
[text](url) → <url|text>
```

Bảng được render dạng code block. Slack token (`<@U123>`, `<#C456>`, URL) được bảo toàn qua quá trình chuyển đổi. Tin nhắn vượt quá 4,000 ký tự được tách tại ranh giới xuống dòng.

### Streaming

Bật cập nhật phản hồi trực tiếp qua `chat.update` (sửa tại chỗ):

- **DM** (`dm_stream`): Sửa placeholder "Thinking..." khi chunk đến
- **Group** (`group_stream`): Tương tự, trong thread

Cập nhật được giới hạn 1 lần/giây để tránh rate limit Slack. Đặt `native_stream: true` để dùng Slack ChatStreamer API khi có.

### Reaction

Hiển thị emoji trạng thái trên tin nhắn user. Đặt `reaction_level`:

- `off` — Không reaction (mặc định)
- `minimal` — Chỉ thinking và done
- `full` — Tất cả trạng thái: thinking, tool use, done, error, stall

| Trạng thái | Emoji |
|--------|-------|
| Thinking | :thinking_face: |
| Tool use | :hammer_and_wrench: |
| Done | :white_check_mark: |
| Error | :x: |
| Stall | :hourglass_flowing_sand: |

Reaction được debounce 700ms để tránh spam API.

### Xử lý Media

**Nhận file:** File đính kèm được tải xuống với bảo vệ SSRF (danh sách host cho phép: `*.slack.com`, `*.slack-edge.com`, `*.slack-files.com`). Auth token bị xóa khi redirect. File vượt `media_max_bytes` (mặc định 20MB) bị bỏ qua.

**Gửi file:** File từ agent được upload qua Slack file upload API. Upload thất bại hiển thị lỗi inline.

**Trích xuất tài liệu:** File tài liệu (PDF, text) được trích xuất nội dung và thêm vào tin nhắn để agent xử lý.

### Định danh Bot Tùy chỉnh

Với User Token (`xoxp-`) tùy chọn, bot có thể đăng với tên và icon tùy chỉnh:

1. Trong **OAuth & Permissions** → **User Token Scopes** → thêm `chat:write.customize`
2. Cài lại app
3. Thêm `user_token` vào config

### Group Policy: Pairing

Slack hỗ trợ pairing cấp group. Khi `group_policy: "pairing"`:
- Admin phê duyệt channel qua CLI: `goclaw pairing approve <code>`
- Hoặc qua GoClaw web UI (phần Pairing)
- Mã pairing cho group **không** hiển thị trong channel (bảo mật: tất cả thành viên đều thấy)

Danh sách `allow_from` hỗ trợ cả user ID và Slack channel ID cho allowlist cấp group.

## Xử lý sự cố

| Vấn đề | Giải pháp |
|-------|----------|
| `invalid_auth` khi khởi động | Token sai hoặc bị thu hồi. Tạo lại token trong Slack app settings. |
| Lỗi `missing_scope` | Scope cần thiết chưa được thêm. Thêm scope trong OAuth & Permissions, cài lại app. |
| Bot không phản hồi trong channel | Bot chưa được mời vào channel. Chạy `/invite @BotName`. |
| Bot không phản hồi DM | DM policy là `disabled` hoặc cần pairing. Kiểm tra config `dm_policy`. |
| Socket Mode không kết nối | App-Level Token (`xapp-`) thiếu hoặc sai. Kiểm tra trang Basic Information. |
| Bot phản hồi không có tên riêng | User Token chưa cấu hình. Thêm `user_token` với scope `chat:write.customize`. |
| Tin nhắn bị xử lý hai lần | Dedup Socket Mode có sẵn. Nếu vẫn xảy ra, kiểm tra duplicate app_mention + message event — hành vi bình thường, dedup xử lý. |
| Tin nhắn nhanh gửi riêng lẻ | Tăng `debounce_delay` (mặc định 300ms). |
| Thread tự động trả lời dừng | Thread participation hết hạn (`thread_ttl`, mặc định 24h). Mention bot lại. |

## Tiếp theo

- [Tổng quan](/channels-overview) — Khái niệm và chính sách channel
- [Telegram](/channel-telegram) — Thiết lập Telegram bot
- [Discord](/channel-discord) — Thiết lập Discord bot
- [Browser Pairing](/channel-browser-pairing) — Luồng pairing

<!-- goclaw-source: c083622f | cập nhật: 2026-04-05 -->
