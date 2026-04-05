> Bản dịch từ [English version](/provider-openai)

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

## Reasoning API

GoClaw hỗ trợ cấu hình reasoning hai tầng: provider-level defaults áp dụng cho toàn bộ agent, và agent-level overrides. Áp dụng cho các model o-series và GPT-5/Codex.

### Cấu hình mặc định ở cấp provider

Đặt reasoning defaults tái sử dụng trực tiếp trên provider qua `settings.reasoning_defaults`. Mọi agent dùng provider này sẽ kế thừa tự động:

```json
{
  "name": "openai",
  "provider_type": "openai",
  "settings": {
    "reasoning_defaults": {
      "effort": "high",
      "fallback": "downgrade"
    }
  }
}
```

Nếu provider chưa cấu hình `reasoning_defaults`, chế độ `inherit` sẽ mặc định tắt reasoning.

### Override ở cấp agent

Agent có thể override hoặc kế thừa provider default qua `reasoning.override_mode` trong `other_config`:

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "inherit"
    }
  }
}
```

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "custom",
      "effort": "medium",
      "fallback": "off"
    }
  }
}
```

| `override_mode` | Hành vi |
|---|---|
| `inherit` | Dùng `reasoning_defaults` của provider |
| `custom` | Dùng chính sách reasoning của agent |

Agent không có `override_mode` sẽ hoạt động như `custom` (tương thích ngược).

### Các mức effort và fallback policy

Giá trị effort hợp lệ: `off`, `auto`, `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

Giá trị fallback khi mức effort yêu cầu không được model hỗ trợ:

| `fallback` | Hành vi |
|---|---|
| `downgrade` (mặc định) | Dùng mức hỗ trợ cao nhất thấp hơn mức yêu cầu |
| `off` | Tắt reasoning |
| `provider_default` | Dùng mức effort mặc định của model |

### Chuẩn hóa effort cho GPT-5 và Codex

Với các model GPT-5 và Codex đã biết, GoClaw xác thực và chuẩn hóa effort trước khi gửi request, tránh lỗi API khi mức yêu cầu không được biến thể model đó hỗ trợ:

| Model | Mức hỗ trợ | Mặc định |
|---|---|---|
| gpt-5 | minimal, low, medium, high | medium |
| gpt-5.1 | none, low, medium, high | none |
| gpt-5.1-codex | low, medium, high | medium |
| gpt-5.2 | none, low, medium, high, xhigh | none |
| gpt-5.2-codex | low, medium, high, xhigh | medium |
| gpt-5.3-codex | low, medium, high, xhigh | medium |
| gpt-5.4 | none, low, medium, high, xhigh | none |
| gpt-5-mini / gpt-5.4-mini | none, low, medium, high, xhigh | none |

Với model chưa biết (ví dụ: bản phát hành mới), effort yêu cầu được truyền thẳng. Trace metadata ghi lại `source` và `effective_effort` đã được resolve để bạn thấy giá trị thực sự được gửi.

### Legacy `thinking_level` (tương thích ngược)

Key `options.thinking_level` cũ vẫn hoạt động như cách viết tắt cho reasoning API:

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

Đây là một shim — GoClaw ánh xạ nó sang `reasoning_effort` nội bộ. Cấu hình mới nên dùng `reasoning.override_mode` với `effort`. Lượng token reasoning được theo dõi tại `Usage.ThinkingTokens` từ `completion_tokens_details.reasoning_tokens`.

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

### Developer Role (GPT-4o+)

Với endpoint gốc OpenAI (`api.openai.com`), GoClaw tự động chuyển role `system` thành `developer` khi gửi request. Role `developer` có độ ưu tiên instruction cao hơn `system` cho GPT-4o và các model mới hơn.

Chuyển đổi này chỉ áp dụng cho endpoint gốc OpenAI. Các backend tương thích OpenAI khác (Azure OpenAI, proxy, Qwen, DeepSeek...) vẫn dùng role `system` tiêu chuẩn.

## Tiếp theo

- [OpenRouter](/provider-openrouter) — truy cập 100+ model qua một API key
- [Anthropic](/provider-anthropic) — tích hợp Claude native
- [Tổng quan](/providers-overview) — kiến trúc provider và retry logic

<!-- goclaw-source: c083622f | cập nhật: 2026-04-05 -->
