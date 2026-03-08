> Bản dịch từ [English version](../../providers/gemini.md)

# Gemini

> Dùng các model Google Gemini trong GoClaw qua endpoint tương thích OpenAI.

## Tổng quan

GoClaw kết nối với Google Gemini thông qua OpenAI-compatible API của nó (`https://generativelanguage.googleapis.com/v1beta/openai/`). Provider dùng chung cùng cách triển khai `OpenAIProvider` với OpenAI và OpenRouter, nhưng có xử lý đặc biệt cho định dạng tool call của Gemini. Cụ thể, Gemini 2.5+ yêu cầu field `thought_signature` phải được echo lại trên mọi tool call — GoClaw xử lý điều này tự động.

## Điều kiện tiên quyết

- Một Google AI Studio API key từ [aistudio.google.com](https://aistudio.google.com)
- Hoặc một Google Cloud project với Vertex AI được bật (dùng Vertex endpoint làm `api_base`)

## Cấu hình config.json

```json
{
  "providers": {
    "gemini": {
      "api_key": "AIza...",
      "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/"
    }
  }
}
```

## Cấu hình qua Managed Mode

Vào **Settings → Providers → Gemini** trong dashboard và nhập API key và base URL. Cả hai đều được lưu mã hóa AES-256-GCM.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| gemini-2.5-pro | 1M tokens | Mạnh nhất, hỗ trợ thinking |
| gemini-2.5-flash | 1M tokens | Nhanh và rẻ, hỗ trợ thinking |
| gemini-2.0-flash | 1M tokens | Flash thế hệ trước |
| gemini-1.5-pro | 2M tokens | Context window lớn nhất |
| gemini-1.5-flash | 1M tokens | Flash thế hệ trước |

## Xử lý đặc thù của Gemini

### Truyền lại thought_signature

Gemini 2.5+ trả về `thought_signature` trên các tool call. GoClaw lưu nó trong `ToolCall.Metadata["thought_signature"]` và echo lại trong các request tiếp theo. Đây là bắt buộc — gửi tool call mà thiếu signature sẽ gây ra `HTTP 400`.

### Tool call collapsing

Nếu một tool call cũ trong lịch sử hội thoại thiếu `thought_signature` (ví dụ: từ model cũ hơn hoặc session được resume), GoClaw tự động collapse vòng tool call đó: các tool call của assistant bị xóa, và kết quả tool được gộp vào một plain user message. Điều này giữ nguyên context mà không kích hoạt lỗi validation signature của Gemini.

### Xử lý content rỗng

Gemini từ chối assistant message có `content` rỗng khi có tool calls. GoClaw bỏ qua field `content` trong trường hợp đó thay vì gửi string rỗng.

## Thinking / Reasoning

Gemini 2.5 hỗ trợ extended thinking. Đặt `thinking_level` trong options của agent:

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

GoClaw ánh xạ sang `reasoning_effort` trong request. Thinking tokens được theo dõi tại `Usage.ThinkingTokens`.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 400` khi dùng tool | Thiếu `thought_signature` | GoClaw xử lý tự động qua collapse logic |
| `HTTP 400` content rỗng | Content của assistant message rỗng | GoClaw tự bỏ qua content rỗng |
| `HTTP 403` | API key không hợp lệ hoặc hết quota | Kiểm tra key trong AI Studio; xác minh billing |
| Model not found | Sai tên model | Kiểm tra model ID chính xác tại [ai.google.dev](https://ai.google.dev/gemini-api/docs/models) |
| Thinking không hoạt động | Model không hỗ trợ | Dùng gemini-2.5-pro hoặc gemini-2.5-flash |

## Tiếp theo

- [DeepSeek](./deepseek.md) — các model DeepSeek với hỗ trợ reasoning_content
- [OpenRouter](./openrouter.md) — truy cập Gemini và 100+ model khác qua một key
- [Tổng quan](./overview.md) — kiến trúc provider và retry logic
