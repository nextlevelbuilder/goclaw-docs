> Bản dịch từ [English version](../../providers/openrouter.md)

# OpenRouter

> Truy cập 100+ model từ Anthropic, Google, Meta, Mistral, và nhiều hơn nữa chỉ qua một API key.

## Tổng quan

OpenRouter là một LLM aggregator cung cấp một unified endpoint tương thích OpenAI. GoClaw dùng chung cách triển khai `OpenAIProvider` cho OpenRouter, với một điểm quan trọng: model ID phải bao gồm provider prefix (ví dụ: `anthropic/claude-sonnet-4-5-20250929`). Nếu bạn truyền tên model không có prefix, GoClaw tự động fallback về model mặc định đã cấu hình.

## Điều kiện tiên quyết

- Một OpenRouter API key từ [openrouter.ai](https://openrouter.ai)
- Credits được nạp vào tài khoản OpenRouter

## Cấu hình config.json

```json
{
  "providers": {
    "openrouter": {
      "api_key": "sk-or-v1-..."
    }
  }
}
```

Base URL mặc định là `https://openrouter.ai/api/v1`. Không cần đặt `api_base` trừ khi bạn dùng proxy.

## Cấu hình qua Managed Mode

Vào **Settings → Providers → OpenRouter** trong dashboard và dán API key. Key được mã hóa AES-256-GCM trước khi lưu.

## Định dạng Model ID

OpenRouter yêu cầu model ID theo định dạng `provider/model-name`. Ví dụ:

| Provider | Model ID |
|---|---|
| Anthropic Claude Sonnet | `anthropic/claude-sonnet-4-5-20250929` |
| Anthropic Claude Opus | `anthropic/claude-opus-4-5` |
| Google Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Meta Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` |
| Mistral Large | `mistralai/mistral-large` |
| DeepSeek R1 | `deepseek/deepseek-r1` |

Xem toàn bộ model tại [openrouter.ai/models](https://openrouter.ai/models).

## Cách hoạt động của resolveModel

Logic `resolveModel()` của GoClaw áp dụng riêng cho OpenRouter:

- Nếu model string có `/` → dùng nguyên như vậy
- Nếu model string không có `/` → fallback về model mặc định đã cấu hình trong provider

Điều này tránh việc gửi tên model không có prefix (như `claude-sonnet-4-5`) mà OpenRouter sẽ từ chối.

Để đặt model mặc định cho OpenRouter trong agent config:

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4-5-20250929"
}
```

## Tính năng được hỗ trợ

OpenRouter chuyển tiếp hầu hết tính năng đến provider model bên dưới. Tính khả dụng phụ thuộc vào model:

| Tính năng | Ghi chú |
|---|---|
| Streaming | Hỗ trợ tất cả model |
| Tool use / function calling | Hỗ trợ hầu hết model |
| Vision | Phụ thuộc model (ví dụ: GPT-4o, Claude Sonnet) |
| Reasoning / thinking | Phụ thuộc model (ví dụ: DeepSeek R1, o3) |
| Usage stats | Trả về trong chunk streaming cuối |

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Kiểm tra key bắt đầu bằng `sk-or-` |
| Model not found | Thiếu provider prefix | Dùng định dạng `provider/model-name` |
| Model không có prefix fallback về default | Hành vi của `resolveModel()` | Luôn bao gồm `/` trong model ID với OpenRouter |
| `HTTP 402` | Không đủ credits | Nạp thêm tiền vào tài khoản OpenRouter |
| Tính năng không được hỗ trợ | Giới hạn của model bên dưới | Kiểm tra khả năng model tại openrouter.ai/models |

## Tiếp theo

- [Gemini](./gemini.md) — Google Gemini trực tiếp qua endpoint tương thích OpenAI
- [OpenAI](./openai.md) — tích hợp trực tiếp OpenAI
- [Tổng quan](./overview.md) — kiến trúc provider và retry logic
