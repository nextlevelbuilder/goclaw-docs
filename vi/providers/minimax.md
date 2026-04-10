> Bản dịch từ [English version](/provider-minimax)

# MiniMax

Kết nối GoClaw với các model MiniMax qua OpenAI-compatible API với đường dẫn chat tùy chỉnh.

## Tổng quan

MiniMax cung cấp OpenAI-compatible API, nhưng đường dẫn endpoint native của họ khác với chuẩn `/chat/completions`. GoClaw xử lý điều này tự động bằng cách dùng đường dẫn chat tùy chỉnh (`/text/chatcompletion_v2`) — bạn chỉ cần cấu hình API key là mọi thứ hoạt động, bao gồm streaming và tool call.

## Cài đặt

Thêm MiniMax API key vào `config.json`:

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01"
    }
  }
}
```

Lưu key trong `.env.local`:

```bash
MINIMAX_API_KEY=your-minimax-api-key
```

API base mặc định là `https://api.minimax.chat/v1` và GoClaw tự động định tuyến đến `/text/chatcompletion_v2` thay vì `/chat/completions` chuẩn. Bạn không cần cấu hình điều này thủ công.

## Custom API Base

Nếu bạn dùng endpoint quốc tế của MiniMax:

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY",
      "api_base": "https://api.minimaxi.chat/v1"
    }
  }
}
```

## Models

| Model | Ghi chú |
|---|---|
| `MiniMax-Text-01` | Context lớn (lên đến 1M tokens) |
| `abab6.5s-chat` | Nhanh, hiệu quả, đa năng |
| `abab5.5-chat` | Thế hệ cũ hơn, chi phí thấp hơn |

## Ví dụ

**Config tối giản:**

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01",
      "max_tokens": 4096,
      "temperature": 0.7
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key không hợp lệ | Xác minh `MINIMAX_API_KEY` trong `.env.local` |
| `404` trên chat endpoint | Sai `api_base` khu vực | Dùng đúng endpoint MiniMax cho khu vực của bạn |
| Response rỗng | Sai tên model | Kiểm tra tài liệu MiniMax để lấy model ID chính xác |
| Tool call thất bại | Schema không tương thích | MiniMax theo định dạng OpenAI tool; đảm bảo tool schema của bạn là JSON Schema hợp lệ |

## Tiếp theo

- [Cohere](/provider-cohere) — một provider tương thích OpenAI khác
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
