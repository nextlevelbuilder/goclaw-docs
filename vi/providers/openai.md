> Bản dịch từ [English version](#provider-openai)

# OpenAI

> Kết nối GoClaw với các model GPT-4o và o-series reasoning của OpenAI qua API chuẩn.

## Tổng quan

GoClaw dùng generic OpenAI-compatible provider (`OpenAIProvider`) cho toàn bộ request đến OpenAI API. Provider này hỗ trợ cả model chat thông thường (GPT-4o, GPT-4o-mini) lẫn các model reasoning o-series (o1, o3, o4-mini) — loại dùng `reasoning_effort` thay vì temperature. Streaming dùng SSE và bao gồm usage stats trong chunk cuối thông qua `stream_options.include_usage`.

## Điều kiện tiên quyết

- Một OpenAI API key từ [platform.openai.com](https://platform.openai.com)
- Credits hoặc gói thanh toán pay-as-you-go

## Cấu hình config.json

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-..."
    }
  }
}
```

Base URL mặc định là `https://api.openai.com/v1`. Để dùng endpoint tùy chỉnh (ví dụ: proxy nội bộ):

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## Cấu hình qua Dashboard

Vào **Settings → Providers → OpenAI** trong dashboard và nhập API key. Key được mã hóa AES-256-GCM khi lưu.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| gpt-4o | 128k tokens | Model multimodal tốt nhất, hỗ trợ vision |
| gpt-4o-mini | 128k tokens | Nhanh hơn và rẻ hơn gpt-4o |
| o4-mini | 200k tokens | Reasoning model nhanh |
| o3 | 200k tokens | Reasoning nâng cao |
| o1 | 200k tokens | Reasoning model thế hệ đầu |
| o1-mini | 128k tokens | Reasoning model nhỏ hơn |

## Reasoning Models (o-series)

Với các model o-series, đặt `thinking_level` trong options của agent. GoClaw tự động ánh xạ sang tham số `reasoning_effort`:

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

Giá trị `thinking_level` ánh xạ trực tiếp sang `reasoning_effort`: `low`, `medium`, `high`. Lượng token dùng cho reasoning được theo dõi tại `Usage.ThinkingTokens` từ `completion_tokens_details.reasoning_tokens`.

## Vision

GPT-4o hỗ trợ ảnh đầu vào. Gửi ảnh dạng base64 trong trường `images` của message. GoClaw tự động chuyển đổi sang định dạng content block `image_url` của OpenAI:

```json
{
  "role": "user",
  "content": "Trong ảnh này có gì?",
  "images": [
    {
      "mime_type": "image/jpeg",
      "data": "<base64-encoded-bytes>"
    }
  ]
}
```

## Tool Use

OpenAI function calling hoạt động ngay mà không cần cấu hình thêm. GoClaw chuyển đổi tool definitions nội bộ sang định dạng wire của OpenAI (với wrapper `type: "function"` và `arguments` được serialize thành JSON string) trước khi gửi.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Kiểm tra key tại platform.openai.com |
| `HTTP 429` | Rate limit | GoClaw tự retry; kiểm tra giới hạn tier của bạn |
| `HTTP 400` với o-series | Tham số không được hỗ trợ | Không đặt `temperature` khi dùng o-series models |
| Vision không hoạt động | Model không hỗ trợ ảnh | Dùng gpt-4o hoặc gpt-4o-mini |

## Tiếp theo

- [OpenRouter](#provider-openrouter) — truy cập 100+ model qua một API key
- [Anthropic](#provider-anthropic) — tích hợp Claude native
- [Tổng quan](#providers-overview) — kiến trúc provider và retry logic

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
