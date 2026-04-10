> Bản dịch từ [English version](/provider-groq)

# Groq

> Chạy các model open-source với tốc độ vượt trội nhờ phần cứng LPU inference của Groq.

## Tổng quan

Groq cung cấp OpenAI-compatible API với tốc độ tạo token nhanh hơn đáng kể so với các provider dùng GPU — thường nhanh hơn 10–20x với các model được hỗ trợ. GoClaw kết nối với Groq dùng `OpenAIProvider` chuẩn mà không cần xử lý đặc biệt. Base URL trỏ đến `https://api.groq.com/openai/v1`.

## Điều kiện tiên quyết

- Một Groq API key từ [console.groq.com](https://console.groq.com)
- Gói free của Groq khá hào phóng; có gói trả phí cho rate limit cao hơn

## Cấu hình config.json

```json
{
  "providers": {
    "groq": {
      "api_key": "gsk_...",
      "api_base": "https://api.groq.com/openai/v1"
    }
  }
}
```

## Cấu hình qua Dashboard

Vào **Settings → Providers → Groq** trong dashboard và nhập API key và base URL. Được lưu mã hóa AES-256-GCM.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| llama-3.3-70b-versatile | 128k tokens | Chất lượng tốt nhất trên Groq |
| llama-3.1-8b-instant | 128k tokens | Nhanh nhất, latency thấp nhất |
| llama3-70b-8192 | 8k tokens | 70B thế hệ trước |
| llama3-8b-8192 | 8k tokens | 8B thế hệ trước |
| mixtral-8x7b-32768 | 32k tokens | Mixtral MoE model |
| gemma2-9b-it | 8k tokens | Google Gemma 2 |

Xem danh sách đầy đủ và cập nhật tại [console.groq.com/docs/models](https://console.groq.com/docs/models) — Groq thường xuyên thêm model mới.

## Khi nào nên dùng Groq

Groq phù hợp nhất với workload nhạy cảm với latency:

- **Agent tương tác** nơi tốc độ phản hồi quan trọng hơn năng lực
- **Pipeline throughput cao** xử lý nhiều request ngắn
- **Prototyping** nơi vòng lặp nhanh quan trọng hơn chi phí token

Với các tác vụ reasoning phức tạp hoặc context rất dài, hãy cân nhắc [Anthropic](/provider-anthropic) hoặc [OpenAI](/provider-openai).

## Tool Use

Groq hỗ trợ function calling trên hầu hết các model. GoClaw gửi tool theo định dạng OpenAI chuẩn. Lưu ý rằng hỗ trợ tool call khác nhau theo model — kiểm tra docs của Groq cho model cụ thể bạn đang dùng.

## Streaming

Streaming hoạt động qua SSE chuẩn OpenAI. GoClaw thêm `stream_options.include_usage` trong mọi streaming request để ghi lại token count trong chunk cuối.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Xác minh key bắt đầu bằng `gsk_` |
| `HTTP 429` | Rate limit (tokens per minute) | GoClaw retry tự động; giảm concurrency hoặc nâng gói |
| Model not found | Model bị deprecated hoặc đổi tên | Kiểm tra danh sách model hiện tại tại console.groq.com |
| Tool call không hoạt động | Model không hỗ trợ function calling | Chuyển sang llama-3.3-70b-versatile |
| Context window ngắn | Chọn model cũ | Dùng llama-3.3-70b-versatile (128k) |

## Tiếp theo

- [Mistral](/provider-mistral) — các model Mistral AI
- [DeepSeek](/provider-deepseek) — reasoning model với thinking content
- [Tổng quan](/providers-overview) — kiến trúc provider và retry logic

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
