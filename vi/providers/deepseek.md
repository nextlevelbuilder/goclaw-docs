> Bản dịch từ [English version](/provider-deepseek)

# DeepSeek

> Chạy các reasoning model mạnh mẽ của DeepSeek trong GoClaw, với hỗ trợ đầy đủ reasoning_content streaming.

## Tổng quan

GoClaw kết nối với DeepSeek qua OpenAI-compatible API của nó, dùng generic `OpenAIProvider`. Các reasoning model của DeepSeek (dòng R1) trả về một trường `reasoning_content` riêng biệt bên cạnh nội dung response thông thường. GoClaw ghi lại nội dung này vào `Thinking` trong response, và echo lại dưới dạng `reasoning_content` trong các assistant message tiếp theo — điều mà DeepSeek yêu cầu để duy trì chuỗi reasoning đúng đắn trong hội thoại nhiều lượt.

## Điều kiện tiên quyết

- Một DeepSeek API key từ [platform.deepseek.com](https://platform.deepseek.com)
- Credits được nạp vào tài khoản DeepSeek

## Cấu hình config.json

```json
{
  "providers": {
    "deepseek": {
      "api_key": "sk-...",
      "api_base": "https://api.deepseek.com/v1"
    }
  }
}
```

## Cấu hình qua Dashboard

Vào **Settings → Providers → DeepSeek** trong dashboard và nhập API key và base URL. Được lưu mã hóa AES-256-GCM.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| deepseek-chat | 64k tokens | Model chat đa năng (DeepSeek V3) |
| deepseek-reasoner | 64k tokens | Reasoning model R1, trả về reasoning_content |

## Hỗ trợ reasoning_content

Model R1 của DeepSeek trả về thinking dưới dạng trường `reasoning_content` riêng trong response delta. GoClaw xử lý điều này ở cả streaming và non-streaming:

- **Streaming:** `delta.reasoning_content` được ghi lại và bắn ra dưới dạng callback `StreamChunk{Thinking: ...}`, sau đó lưu vào `ChatResponse.Thinking`
- **Non-streaming:** `message.reasoning_content` được ánh xạ sang `ChatResponse.Thinking`

Ở lượt tiếp theo, GoClaw tự động thêm thinking của assistant vào request dưới dạng `reasoning_content` — DeepSeek yêu cầu điều này để model duy trì chuỗi reasoning xuyên suốt các lượt.

Để dùng reasoning model:

```json
{
  "provider": "deepseek",
  "model": "deepseek-reasoner"
}
```

Bạn cũng có thể đặt `thinking_level` để kiểm soát mức độ reasoning (ánh xạ sang `reasoning_effort`):

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

## Tool Use

DeepSeek hỗ trợ function calling theo định dạng tool chuẩn OpenAI. Tool call arguments đến dưới dạng JSON string và được GoClaw parse trước khi truyền vào tool handler.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Xác minh key tại platform.deepseek.com |
| `HTTP 402` | Không đủ credits | Nạp thêm tiền vào tài khoản DeepSeek |
| Thiếu reasoning content | Đang dùng deepseek-chat thay vì deepseek-reasoner | Chuyển model sang `deepseek-reasoner` |
| Reasoning đa lượt suy giảm | reasoning_content không được echo lại | GoClaw xử lý tự động — đảm bảo dùng agent loop có sẵn |
| `HTTP 429` | Rate limit | GoClaw tự retry với exponential backoff |

## Tiếp theo

- [Groq](/provider-groq) — inference cực nhanh cho open model
- [Gemini](/provider-gemini) — các model Google Gemini
- [Tổng quan](/providers-overview) — kiến trúc provider và retry logic

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
