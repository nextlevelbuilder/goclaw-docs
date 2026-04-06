# Tài liệu Kênh GoClaw

Tài liệu đầy đủ cho tất cả các tích hợp nền tảng nhắn tin trong GoClaw.

## Bắt đầu nhanh

1. **[Tổng quan](./overview.md)** — Khái niệm, chính sách, sơ đồ luồng tin nhắn
2. **[Telegram](./telegram.md)** — Long polling, forum topics, STT, streaming
3. **[Discord](./discord.md)** — Gateway API, placeholder editing, threads
4. **[Slack](./slack.md)** — Socket Mode, threads, streaming, reactions, debounce
5. **[Larksuite](./larksuite.md)** — WebSocket/Webhook, streaming cards, media
6. **[Zalo OA](./zalo-oa.md)** — Official Account, chỉ DM, pairing, hình ảnh
7. **[Zalo Cá nhân](./zalo-personal.md)** — Tài khoản cá nhân (không chính thức), DM + nhóm
8. **[WhatsApp](./whatsapp.md)** — Kết nối trực tiếp, xác thực QR, media, typing indicators, pairing
9. **[WebSocket](./websocket.md)** — RPC trực tiếp, custom client, streaming events
10. **[Ghép nối trình duyệt](./browser-pairing.md)** — Xác thực mã 8 ký tự, session token

## Bảng so sánh kênh

| Tính năng | Telegram | Discord | Slack | Larksuite | Zalo OA | Zalo CN | WhatsApp | WebSocket |
|---------|----------|---------|-------|--------|---------|-----------|----------|-----------|
| **Độ phức tạp** | Dễ | Dễ | Dễ | Trung bình | Trung bình | Khó | Trung bình | Rất dễ |
| **Transport** | Polling | Gateway | Socket Mode | WS/Webhook | Polling | Protocol | Kết nối trực tiếp | WebSocket |
| **Hỗ trợ DM** | Có | Có | Có | Có | Có | Có | Có | N/A |
| **Hỗ trợ nhóm** | Có | Có | Có | Có | Không | Có | Có | N/A |
| **Streaming** | Có | Có | Có | Có | Không | Không | Không | Có |
| **Định dạng** | HTML | Markdown | mrkdwn | Cards | Plain | Plain | WA native | JSON |
| **Media** | Ảnh, Voice, File | File, Embeds | File (20MB) | Ảnh, File | Ảnh | -- | Ảnh, Video, Audio, Docs | N/A |
| **Xác thực** | Token | Token | 3 Token | App ID + Secret | API Key | Credentials | QR Code | Token + Pairing |
| **Mức rủi ro** | Thấp | Thấp | Thấp | Thấp | Thấp | Cao | Trung bình | Thấp |

## File cấu hình

Tất cả cấu hình kênh nằm trong `config.json` gốc:

```json
{
  "channels": {
    "telegram": { ... },
    "discord": { ... },
    "slack": { ... },
    "feishu": { ... },
    "zalo": { ... },
    "zalo_personal": { ... },
    "whatsapp": { ... }
  }
}
```

Giá trị bí mật (token, API key) được tải từ biến môi trường hoặc `.env.local`, không bao giờ lưu trong `config.json`.

## Các mẫu chung

### Chính sách DM

Tất cả kênh hỗ trợ kiểm soát truy cập DM:

- `pairing` — Yêu cầu phê duyệt mã 8 ký tự (mặc định cho Telegram, Larksuite, Zalo)
- `allowlist` — Chỉ người dùng được liệt kê (giới hạn cho thành viên nhóm)
- `open` — Chấp nhận tất cả DM (bot công khai)
- `disabled` — Không DM (chỉ nhóm)

### Chính sách nhóm

Cho các kênh hỗ trợ nhóm:

- `open` — Chấp nhận tất cả nhóm
- `allowlist` — Chỉ nhóm được liệt kê
- `disabled` — Không nhắn tin nhóm

### Xử lý tin nhắn

Tất cả kênh:
1. Lắng nghe sự kiện nền tảng
2. Xây dựng `InboundMessage` (người gửi, chat ID, nội dung, media)
3. Publish lên message bus
4. Agent xử lý và phản hồi
5. Manager định tuyến đến kênh
6. Kênh format và gửi (tuân thủ giới hạn 2K-4K ký tự)

## Xử lý sự cố

### Bot không phản hồi

1. Kiểm tra kênh `enabled: true` trong config
2. Kiểm tra cài đặt chính sách (DM policy, group policy)
3. Kiểm tra allowlist (nếu có)
4. Kiểm tra log lỗi

### Media không gửi được

1. Xác nhận loại file được hỗ trợ
2. Kiểm tra kích thước file dưới giới hạn nền tảng
3. Đảm bảo file tạm tồn tại
4. Kiểm tra kênh có quyền gửi media

### Mất kết nối

1. Kiểm tra kết nối mạng
2. Xác minh thông tin xác thực
3. Kiểm tra giới hạn tốc độ dịch vụ
4. Khởi động lại kênh
