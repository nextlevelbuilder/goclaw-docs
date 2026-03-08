> Bản dịch từ [English version](../../providers/anthropic.md)

# Anthropic

> Tích hợp Claude native trong GoClaw — xây dựng trực tiếp trên Anthropic HTTP+SSE API với đầy đủ hỗ trợ extended thinking và prompt caching.

## Tổng quan

Anthropic provider là một HTTP client tự viết tay (không dùng SDK bên thứ ba). Nó nói chuyện trực tiếp với Anthropic Messages API, xử lý streaming qua SSE, tool use passback, và extended thinking blocks. Model mặc định là `claude-sonnet-4-5-20250929`. Prompt caching luôn bật — GoClaw đặt `cache_control: ephemeral` trên mọi request.

## Điều kiện tiên quyết

- Một Anthropic API key từ [console.anthropic.com](https://console.anthropic.com)
- Quota đủ cho các model bạn dự định dùng

## Cấu hình config.json

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-api03-..."
    }
  }
}
```

Để dùng base URL tùy chỉnh (ví dụ: proxy):

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## Cấu hình qua Managed Mode

Trong GoClaw dashboard, vào **Settings → Providers → Anthropic** và nhập API key. Key được mã hóa AES-256-GCM trước khi lưu. Thay đổi có hiệu lực ngay mà không cần restart.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| claude-opus-4-5 | 200k tokens | Mạnh nhất, chi phí cao nhất |
| claude-sonnet-4-5-20250929 | 200k tokens | Mặc định — cân bằng tốt giữa tốc độ và chất lượng |
| claude-haiku-4-5 | 200k tokens | Nhanh nhất, chi phí thấp nhất |
| claude-opus-4 | 200k tokens | Thế hệ trước |
| claude-sonnet-4 | 200k tokens | Thế hệ trước |

Để ghi đè model mặc định cho một agent cụ thể, đặt `model` trong config của agent đó.

## Extended Thinking

Anthropic provider triển khai `SupportsThinking() bool` và trả về `true`. Khi `thinking_level` được đặt trong request, GoClaw tự động kích hoạt tính năng extended thinking của Anthropic.

Token budget theo thinking level:

| Level | Budget |
|---|---|
| `low` | 4,096 tokens |
| `medium` | 10,000 tokens (mặc định) |
| `high` | 32,000 tokens |

Khi thinking được bật:
- Header `anthropic-beta: interleaved-thinking-2025-05-14` được gửi kèm
- Temperature bị loại bỏ (Anthropic yêu cầu điều này)
- `max_tokens` được tự động nâng lên `budget + 8192` nếu giá trị hiện tại quá thấp
- Thinking blocks được giữ nguyên và truyền lại trong các vòng lặp tool use

Ví dụ cấu hình agent với thinking:

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

## Prompt Caching

Prompt caching luôn hoạt động. GoClaw đặt `cache_control: ephemeral` trên mọi request body. Response `Usage` bao gồm `cache_creation_input_tokens` và `cache_read_input_tokens` để bạn theo dõi tỷ lệ cache hit trong tracing.

## Tool Use

Anthropic dùng định dạng tool schema khác OpenAI. GoClaw tự động chuyển đổi:
- Tools được gửi dưới dạng `input_schema` (không phải `parameters`)
- Tool results được bọc trong content block `tool_result`
- Khi thinking đang bật, các raw content block (bao gồm thinking signatures) được giữ nguyên và echo lại trong các vòng lặp tool tiếp theo — đây là yêu cầu của Anthropic API

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Kiểm tra key bắt đầu bằng `sk-ant-` |
| `HTTP 400` khi dùng thinking | Đặt temperature song song với thinking | GoClaw tự xóa temperature; đừng hard-code nó trong raw request |
| `HTTP 529` | Anthropic bị quá tải | Retry logic xử lý tự động; chờ và thử lại |
| Thinking blocks không xuất hiện | Model không hỗ trợ thinking | Dùng claude-sonnet-4-5 hoặc claude-opus-4-5 |
| Chi phí token cao | Cache không hit | Đảm bảo system prompt ổn định giữa các request |

## Tiếp theo

- [OpenAI](./openai.md) — GPT-4o và các model reasoning o-series
- [Tổng quan](./overview.md) — kiến trúc provider và retry logic
