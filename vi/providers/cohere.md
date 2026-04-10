> Bản dịch từ [English version](/provider-cohere)

# Cohere

Kết nối GoClaw với các model Command của Cohere qua OpenAI-compatible API.

## Tổng quan

Cohere cung cấp endpoint tương thích OpenAI, nghĩa là `OpenAIProvider` chuẩn của GoClaw xử lý toàn bộ giao tiếp — streaming, tool call, và usage tracking đều hoạt động ngay. Các model Command R và Command R+ của Cohere đặc biệt mạnh ở retrieval-augmented generation (RAG) và tool use.

## Cài đặt

Thêm Cohere API key vào `config.json`:

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus"
    }
  }
}
```

Lưu key trong `.env.local`:

```bash
COHERE_API_KEY=your-cohere-api-key
```

API base mặc định là `https://api.cohere.com/compatibility/v1`. GoClaw đặt giá trị này tự động khi bạn cấu hình provider `cohere`.

## Models

| Model | Ghi chú |
|---|---|
| `command-r-plus` | Độ chính xác cao nhất, tốt nhất cho tác vụ phức tạp và RAG |
| `command-r` | Cân bằng giữa hiệu suất và chi phí |
| `command-light` | Nhanh nhất và rẻ nhất, phù hợp tác vụ đơn giản |

## Ví dụ

**Config tối giản:**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus",
      "max_tokens": 4096
    }
  }
}
```

**Custom API base (khi bạn proxy Cohere):**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY",
      "api_base": "https://your-proxy.example.com/cohere/v1"
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key thiếu hoặc không hợp lệ | Kiểm tra `COHERE_API_KEY` trong `.env.local` |
| `model not found` | Sai model ID | Dùng model ID chính xác từ [tài liệu Cohere](https://docs.cohere.com/docs/models) |
| Tool call trả về lỗi | Vấn đề schema | Định dạng tool của Cohere tương thích OpenAI; kiểm tra lại tool parameter schemas |
| Response chậm | Context window lớn | Model Command R chậm hơn với context dài; cân nhắc dùng `command-light` để tăng tốc |

## Tiếp theo

- [Perplexity](/provider-perplexity) — AI tìm kiếm web qua OpenAI-compatible API
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
