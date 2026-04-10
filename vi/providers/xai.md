> Bản dịch từ [English version](/provider-xai)

# xAI (Grok)

Kết nối GoClaw với các model Grok của xAI qua OpenAI-compatible API.

## Tổng quan

Các model Grok của xAI có thể truy cập qua endpoint tương thích OpenAI tại `https://api.x.ai/v1`. GoClaw dùng chung `OpenAIProvider` với OpenAI, Groq, và các provider khác — bạn chỉ cần trỏ đến base URL của xAI với API key xAI. Mọi tính năng chuẩn đều hoạt động: streaming, tool call, và thinking token.

## Cài đặt

Thêm xAI API key vào `config.json`:

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3"
    }
  }
}
```

Lưu key trong `.env.local` (không bao giờ lưu thẳng vào `config.json`):

```bash
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxx
```

GoClaw đọc `$XAI_API_KEY` từ environment khi khởi động.

## Models

Các model Grok phổ biến để dùng trong field `model`:

| Model | Ghi chú |
|---|---|
| `grok-3` | Model flagship mới nhất |
| `grok-3-mini` | Nhỏ hơn, nhanh hơn, rẻ hơn |
| `grok-2-vision-1212` | Multimodal (ảnh + text) |

Đặt mặc định trong `agents.defaults.model`, hoặc truyền `model` theo từng request qua API.

## Ví dụ

**Config tối giản cho Grok-3:**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3",
      "max_tokens": 8192
    }
  }
}
```

**Custom API base (khi bạn proxy xAI traffic):**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY",
      "api_base": "https://your-proxy.example.com/xai/v1"
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key sai hoặc thiếu | Kiểm tra `XAI_API_KEY` trong `.env.local` |
| `404 Not Found` | Sai tên model | Kiểm tra [danh sách model xAI](https://docs.x.ai/docs/models) |
| Model không trả về content | Context quá lớn | Giảm `max_tokens` hoặc rút ngắn lịch sử hội thoại |

## Tiếp theo

- [MiniMax](/provider-minimax) — provider tương thích OpenAI với đường dẫn chat tùy chỉnh
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
