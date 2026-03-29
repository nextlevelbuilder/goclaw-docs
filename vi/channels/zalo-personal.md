> Bản dịch từ [English version](/channel-zalo-personal)

# Channel Zalo Personal

Tích hợp tài khoản Zalo cá nhân không chính thức sử dụng giao thức được dịch ngược (zcago). Hỗ trợ DM và nhóm với kiểm soát truy cập hạn chế.

## Cảnh báo: Dùng theo rủi ro của bạn

Zalo Personal dùng **giao thức không chính thức, được dịch ngược**. Tài khoản của bạn có thể bị khoá, cấm, hoặc hạn chế bởi Zalo bất kỳ lúc nào. **KHÔNG** khuyến nghị dùng cho bot production. Dùng [Zalo OA](/channel-zalo-oa) cho các tích hợp chính thức.

Cảnh báo bảo mật được ghi log khi khởi động: `security.unofficial_api`.

## Thiết lập

**Yêu cầu:**
- Tài khoản Zalo cá nhân với thông tin đăng nhập
- Thông tin đăng nhập được lưu dưới dạng file JSON

**Tạo file JSON thông tin đăng nhập:**

```json
{
  "phone": "84987654321",
  "password": "your_password_here",
  "device_id": "your_device_id"
}
```

**Bật Zalo Personal:**

```json
{
  "channels": {
    "zalo_personal": {
      "enabled": true,
      "credentials_path": "/home/goclaw/.goclaw/zalo-creds.json",
      "dm_policy": "allowlist",
      "group_policy": "allowlist",
      "allow_from": ["friend_zalo_id", "group_chat_id"]
    }
  }
}
```

## Cấu hình

Tất cả config key nằm trong `channels.zalo_personal`:

| Key | Kiểu | Mặc định | Mô tả |
|-----|------|---------|-------------|
| `enabled` | bool | false | Bật/tắt channel |
| `credentials_path` | string | -- | Đường dẫn đến file JSON thông tin đăng nhập |
| `allow_from` | list | -- | Danh sách trắng user/group ID |
| `dm_policy` | string | `"allowlist"` | `pairing`, `allowlist`, `open`, `disabled` (mặc định hạn chế) |
| `group_policy` | string | `"allowlist"` | `open`, `allowlist`, `disabled` (mặc định hạn chế) |
| `require_mention` | bool | true | Yêu cầu mention bot trong nhóm |
| `block_reply` | bool | -- | Ghi đè block_reply của gateway (nil=kế thừa) |

## Tính năng

### So sánh với Zalo OA

| Khía cạnh | Zalo OA | Zalo Personal |
|--------|---------|---------------|
| Giao thức | Official Bot API | Dịch ngược (zcago) |
| Loại tài khoản | Official Account | Tài khoản cá nhân |
| Hỗ trợ DM | Có | Có |
| Hỗ trợ nhóm | Không | Có |
| Chính sách DM mặc định | `pairing` | `allowlist` (hạn chế) |
| Chính sách nhóm mặc định | N/A | `allowlist` (hạn chế) |
| Phương thức xác thực | API key | Thông tin đăng nhập (số điện thoại + mật khẩu) |
| Mức độ rủi ro | Không có | Cao (tài khoản có thể bị cấm) |
| Khuyến nghị cho | Bot chính thức | Chỉ phát triển/kiểm thử |

### Hỗ trợ DM & Nhóm

Khác với Zalo OA, Personal hỗ trợ cả DM và nhóm:

- DM: Cuộc trò chuyện trực tiếp với từng user
- Nhóm: Group chat (Zalo chat group)
- Chính sách mặc định là **hạn chế**: `allowlist` cho cả DM và nhóm

Cho phép user/nhóm cụ thể qua `allow_from`:

```json
{
  "allow_from": [
    "user_zalo_id_1",
    "user_zalo_id_2",
    "group_chat_id_3"
  ]
}
```

### Xác thực

Yêu cầu file thông tin đăng nhập có số điện thoại, mật khẩu, và device ID. Ở lần kết nối đầu tiên, tài khoản có thể yêu cầu quét QR hoặc xác minh thêm từ Zalo.

**Xác thực lại bằng QR**: Khi xác thực lại qua quét QR (ví dụ sau khi session hết hạn), GoClaw huỷ an toàn session trước đó trước khi bắt đầu luồng QR mới. Cơ chế huỷ race-safe này ngăn nhiều session chạy đồng thời và tránh xung đột trong quá trình đăng nhập.

### Xử lý Media

Việc gửi media bao gồm xác minh sau khi ghi — các file được xác nhận đã ghi xuống đĩa trước khi gửi đến Zalo API.

### Khả năng phục hồi

Khi kết nối thất bại:
- Tối đa 10 lần thử khởi động lại
- Exponential backoff: 1s → tối đa 60s
- Xử lý đặc biệt cho mã lỗi 3000: trì hoãn ban đầu 60s (thường là rate limiting)
- Typing controller theo thread (local key)

## Xử lý sự cố

| Vấn đề | Giải pháp |
|-------|----------|
| "Account locked" | Tài khoản bị Zalo hạn chế. Điều này xảy ra thường xuyên với tích hợp bot. Dùng Zalo OA thay thế. |
| "Invalid credentials" | Xác minh số điện thoại, mật khẩu và device ID trong file thông tin đăng nhập. Xác thực lại nếu Zalo yêu cầu. |
| Không nhận được tin nhắn | Kiểm tra `allow_from` có bao gồm người gửi. Xác minh chính sách DM/nhóm không phải `disabled`. |
| Bot liên tục ngắt kết nối | Zalo có thể đang rate limiting. Kiểm tra log về mã lỗi 3000. Chờ 60+ giây trước khi kết nối lại. |
| Cảnh báo "Unofficial API" | Điều này bình thường. Hãy nhận thức rủi ro và chỉ dùng cho phát triển/kiểm thử. |

## Tiếp theo

- [Tổng quan](/channels-overview) — Khái niệm và chính sách channel
- [Zalo OA](/channel-zalo-oa) — Tích hợp Zalo chính thức (khuyến nghị)
- [Telegram](/channel-telegram) — Thiết lập Telegram bot
- [Browser Pairing](/channel-browser-pairing) — Luồng pairing

<!-- goclaw-source: 120fc2d | cập nhật: 2026-03-18 -->
