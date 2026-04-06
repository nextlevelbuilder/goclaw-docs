> Bản dịch từ [English version](/troubleshoot-channels)

# Vấn đề Channel

> Troubleshooting theo channel cho Telegram, Discord, Feishu, Zalo, và WhatsApp.

## Tổng quan

Mỗi channel có connection mode, permission model, và đặc thù định dạng tin nhắn riêng. Trang này bao gồm các pattern lỗi phổ biến nhất cho mỗi channel. Để xem vấn đề cấp gateway (khởi động, WebSocket, rate limiting), xem [Các vấn đề thường gặp](/troubleshoot-common).

## Mẹo Chung

- Lỗi channel xuất hiện trong gateway log với tên channel làm context (ví dụ `"feishu bot probe failed"`, `"zalo getUpdates error"`).
- Tất cả channel tự reconnect sau lỗi tạm thời. Warning log không có nghĩa channel hỏng vĩnh viễn.
- Kiểm tra trạng thái channel qua dashboard hoặc RPC method `channels.status`.

---

## Telegram

Telegram dùng **long polling** — không cần webhook URL public.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `create telegram bot: ...` khi khởi động | Bot token không hợp lệ | Xác minh `GOCLAW_TELEGRAM_TOKEN` với `@BotFather` |
| `start long polling: ...` | Lỗi mạng hoặc token bị thu hồi | Kiểm tra kết nối đến `api.telegram.org`; cấp token mới nếu cần |
| Bot không phản hồi trong group | Group streaming chưa bật | Đặt `group_stream: true` trong channel config |
| Menu command không đồng bộ | `setMyCommands` bị rate limit | Tự retry; restart gateway sau vài giây |
| Proxy không kết nối | Proxy URL không hợp lệ | Dùng định dạng `http://user:pass@host:port` trong field config `proxy` |
| Bảng trông lạ | HTML Telegram không hỗ trợ bảng | Bình thường — GoClaw render bảng dạng ASCII trong block `<pre>` |

**Env var bắt buộc:** `GOCLAW_TELEGRAM_TOKEN`

---

## Discord

Discord dùng kết nối **gateway WebSocket** lâu dài.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `create discord session: ...` khi khởi động | Bot token không hợp lệ | Xác minh `GOCLAW_DISCORD_TOKEN` trong Discord developer portal |
| `open discord session: ...` | Không thể kết nối Discord gateway | Kiểm tra mạng; xem [status.discord.com](https://status.discord.com) |
| Bot không nhận tin nhắn | Thiếu Gateway Intents | Bật **Message Content Intent** trong Discord developer portal → Bot |
| Tin nhắn bị cắt | Giới hạn 2000 ký tự Discord | GoClaw tự chunk; kiểm tra code block lớn gần giới hạn |
| Pairing reply không được gửi | DM permission chưa được cấp | Bot phải chia sẻ server với user và có DM permission |

**Env var bắt buộc:** `GOCLAW_DISCORD_TOKEN`

**Checklist Intents** (Discord developer portal → Bot → Privileged Gateway Intents):
- [x] Message Content Intent

---

## Feishu / Lark

Feishu hỗ trợ hai chế độ: **WebSocket** (mặc định, không cần URL public) và **Webhook** (cần HTTPS endpoint public).

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `feishu app_id and app_secret are required` | Thiếu credentials | Đặt `GOCLAW_LARK_APP_ID` và `GOCLAW_LARK_APP_SECRET` |
| `feishu bot probe failed` (chỉ warning) | Fetch bot info thất bại; channel vẫn khởi động | Kiểm tra app permission trong Feishu console; không fatal |
| `feishu websocket error` (reconnects) | WS connection bị ngắt | Tự reconnect; lỗi kéo dài gợi ý firewall đang chặn `*.larksuite.com` |
| Webhook signature verification thất bại | Token hoặc encrypt key sai | Xác minh `GOCLAW_LARK_VERIFICATION_TOKEN` và `GOCLAW_LARK_ENCRYPT_KEY` khớp app config |
| Event không được deliver ở webhook mode | Feishu không kết nối được server | Đảm bảo HTTPS endpoint public; Feishu yêu cầu SSL |
| `feishu send media failed` | Media URL không thể truy cập public | Host media trên URL public; Feishu fetch media khi deliver |

**Env var bắt buộc:**

```bash
GOCLAW_LARK_APP_ID=cli_xxxx
GOCLAW_LARK_APP_SECRET=your_secret
# Chỉ webhook mode:
GOCLAW_LARK_ENCRYPT_KEY=your_encrypt_key
GOCLAW_LARK_VERIFICATION_TOKEN=your_token
```

Đặt `connection_mode: "websocket"` (mặc định) hoặc `"webhook"` trong channel config.

---

## Zalo

Zalo OA Bot **chỉ DM** (không có group chat) với giới hạn 2000 ký tự text mỗi tin nhắn. GoClaw tự chunk response dài hơn. Chạy ở polling mode.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `zalo token is required` | Thiếu OA token | Đặt `GOCLAW_ZALO_TOKEN` với Zalo OA access token |
| `zalo getMe failed` | Token không hợp lệ hoặc hết hạn | Refresh token trong Zalo Developer Console; OA token hết hạn định kỳ |
| Bot không phản hồi | DM policy cấu hình sai | Kiểm tra `dm_policy` trong channel config |
| `zalo getUpdates error` trong logs | Polling error (trừ HTTP 408) | HTTP 408 là bình thường (timeout, không có update); lỗi khác retry sau 5s |
| Group message bị bỏ qua | Giới hạn platform | Zalo OA chỉ hỗ trợ DM — đây là thiết kế |

**Env var bắt buộc:** `GOCLAW_ZALO_TOKEN`

---

## WhatsApp

WhatsApp **kết nối trực tiếp** (native multi-device protocol). Không cần bridge service bên ngoài. Trạng thái xác thực lưu trong database.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Không hiển thị QR | Không kết nối được WhatsApp server | Kiểm tra mạng (port 443, 5222) |
| Quét QR nhưng không xác thực | Trạng thái xác thực bị hỏng | Dùng nút Re-authenticate hoặc restart channel |
| `whatsapp bridge_url is required` | Cấu hình cũ còn | Xóa bridge_url khỏi config — không còn cần |
| Gửi `whatsapp not connected` | Chưa xác thực | Scan QR qua UI wizard trước |
| Log hiện `logged out` | WhatsApp thu hồi phiên | Dùng nút Re-authenticate scan QR mới |
| Tin nhắn nhóm bị bỏ qua | Chính sách hoặc mention gate | Kiểm tra group_policy và require_mention |
| Media download thất bại | Mạng hoặc file | Kiểm tra log; xác nhận temp dir ghi được; tối đa 20 MB/file |

Xác thực qua GoClaw UI (Channels > WhatsApp > Re-authenticate).

---

## Tiếp theo

- [Vấn đề provider](/troubleshoot-providers)
- [Vấn đề database](/troubleshoot-database)
- [Các vấn đề thường gặp](/troubleshoot-common)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
