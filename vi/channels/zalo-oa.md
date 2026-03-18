> Bản dịch từ [English version](#channel-zalo-oa)

# Channel Zalo OA

Tích hợp Zalo Official Account (OA). Chỉ hỗ trợ DM với kiểm soát truy cập dựa trên pairing và hỗ trợ hình ảnh.

## Thiết lập

**Tạo Zalo OA:**

1. Vào https://oa.zalo.me
2. Tạo Official Account (yêu cầu số điện thoại Zalo)
3. Đặt tên OA, avatar và ảnh bìa
4. Trong cài đặt OA, vào "Settings" → "API" → "Bot API"
5. Tạo API key
6. Sao chép API key để cấu hình

**Bật Zalo OA:**

```json
{
  "channels": {
    "zalo": {
      "enabled": true,
      "token": "YOUR_API_KEY",
      "dm_policy": "pairing",
      "allow_from": [],
      "media_max_mb": 5
    }
  }
}
```

## Cấu hình

Tất cả config key nằm trong `channels.zalo`:

| Key | Kiểu | Mặc định | Mô tả |
|-----|------|---------|-------------|
| `enabled` | bool | false | Bật/tắt channel |
| `token` | string | bắt buộc | API key từ Zalo OA console |
| `allow_from` | list | -- | Danh sách trắng user ID |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `webhook_url` | string | -- | URL webhook tuỳ chọn (ghi đè polling) |
| `webhook_secret` | string | -- | Secret ký webhook tuỳ chọn |
| `media_max_mb` | int | 5 | Kích thước file hình ảnh tối đa (MB) |
| `block_reply` | bool | -- | Ghi đè block_reply của gateway (nil=kế thừa) |

## Tính năng

### Chỉ hỗ trợ DM

Zalo OA chỉ hỗ trợ nhắn tin trực tiếp. Chức năng nhóm không có sẵn. Tất cả tin nhắn được xử lý như DM.

### Long Polling

Chế độ mặc định: Bot poll Zalo API mỗi 30 giây để lấy tin nhắn mới. Server trả về tin nhắn và đánh dấu chúng đã đọc.

- Timeout poll: 30 giây (mặc định)
- Backoff khi lỗi: 5 giây
- Giới hạn văn bản: 2,000 ký tự mỗi tin nhắn
- Giới hạn hình ảnh: 5 MB

### Chế độ Webhook (Tuỳ chọn)

Thay vì polling, cấu hình Zalo để POST event đến gateway của bạn:

```json
{
  "webhook_url": "https://your-gateway.com/zalo/webhook",
  "webhook_secret": "your_webhook_secret"
}
```

Zalo gửi chữ ký HMAC trong header `X-Zalo-Signature`. Implementation xác minh chữ ký này trước khi xử lý.

### Hỗ trợ hình ảnh

Bot có thể nhận và gửi hình ảnh (JPG, PNG). Tối đa 5 MB mặc định.

**Nhận**: Hình ảnh được tải xuống và lưu dưới dạng file tạm thời trong quá trình xử lý tin nhắn.

**Gửi**: Hình ảnh có thể được gửi dưới dạng media attachment:

```json
{
  "channel": "zalo",
  "content": "Here's your image",
  "media": [
    { "url": "/tmp/image.jpg", "type": "image" }
  ]
}
```

### Pairing mặc định

Chính sách DM mặc định là `"pairing"`. User mới thấy hướng dẫn mã pairing với debounce 60 giây (không spam). Chủ sở hữu phê duyệt qua:

```
/pair CODE
```

## Xử lý sự cố

| Vấn đề | Giải pháp |
|-------|----------|
| "Invalid API key" | Kiểm tra token từ Zalo OA console. Đảm bảo OA đang hoạt động và Bot API đã được bật. |
| Không nhận được tin nhắn | Xác minh polling đang chạy (kiểm tra log). Đảm bảo OA có thể nhận tin nhắn (không bị tạm ngưng). |
| Upload hình ảnh thất bại | Xác minh file hình ảnh tồn tại và dưới `media_max_mb`. Kiểm tra định dạng file (JPG/PNG). |
| Chữ ký webhook không khớp | Đảm bảo `webhook_secret` khớp với Zalo console. Kiểm tra timestamp có còn gần đây không. |
| Mã pairing không được gửi | Kiểm tra chính sách DM là `"pairing"`. Xác minh chủ sở hữu có thể gửi tin nhắn đến OA. |

## Tiếp theo

- [Tổng quan](#channels-overview) — Khái niệm và chính sách channel
- [Zalo Personal](#channel-zalo-personal) — Tích hợp tài khoản Zalo cá nhân
- [Telegram](#channel-telegram) — Thiết lập Telegram bot
- [Browser Pairing](#channel-browser-pairing) — Luồng pairing

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
