> Bản dịch từ [English version](/provider-mistral)

# Mistral

> Dùng các model Mistral AI trong GoClaw qua OpenAI-compatible API.

## Tổng quan

GoClaw kết nối với Mistral AI dùng generic `OpenAIProvider` trỏ đến endpoint tương thích OpenAI của Mistral (`https://api.mistral.ai/v1`). Không cần xử lý đặc biệt — chat chuẩn, streaming, và tool use đều hoạt động ngay. Mistral cung cấp nhiều model từ Mistral 7B nhẹ đến Mistral Large hàng đầu.

## Điều kiện tiên quyết

- Một Mistral API key từ [console.mistral.ai](https://console.mistral.ai)
- Tài khoản Mistral với subscription hoặc credits đang hoạt động

## Cấu hình config.json

```json
{
  "providers": {
    "mistral": {
      "api_key": "...",
      "api_base": "https://api.mistral.ai/v1"
    }
  }
}
```

## Cấu hình qua Dashboard

Vào **Settings → Providers → Mistral** trong dashboard và nhập API key và base URL. Được lưu mã hóa AES-256-GCM.

## Các Model Được Hỗ Trợ

| Model | Context Window | Ghi chú |
|---|---|---|
| mistral-large-latest | 128k tokens | Model Mistral mạnh nhất |
| mistral-medium-latest | 128k tokens | Cân bằng giữa hiệu suất và chi phí |
| mistral-small-latest | 128k tokens | Nhanh và phải chăng |
| codestral-latest | 256k tokens | Tối ưu cho sinh code |
| open-mistral-7b | 32k tokens | Open-weight, chi phí thấp nhất |
| open-mixtral-8x7b | 32k tokens | Open-weight MoE model |
| open-mixtral-8x22b | 64k tokens | Open-weight large MoE model |

Xem danh sách model và giá hiện tại tại [docs.mistral.ai/getting-started/models](https://docs.mistral.ai/getting-started/models/).

## Tool Use

Mistral hỗ trợ function calling trên `mistral-large`, `mistral-small`, và `codestral`. GoClaw gửi tool theo định dạng OpenAI chuẩn — không cần chuyển đổi. Các model open-weight nhỏ hơn không hỗ trợ tool use.

## Streaming

Streaming được hỗ trợ trên tất cả model Mistral. GoClaw dùng `stream_options.include_usage` để ghi lại token count ở cuối mỗi stream.

## Sinh code

Với agent thiên về code, `codestral-latest` được tối ưu cho các tác vụ lập trình và có context window 256k token — lớn nhất trong dòng Mistral. Trỏ agent vào nó trực tiếp:

```json
{
  "provider": "mistral",
  "model": "codestral-latest"
}
```

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 401` | API key không hợp lệ | Xác minh key tại console.mistral.ai |
| `HTTP 422` khi dùng tool | Model không hỗ trợ function calling | Dùng mistral-large hoặc mistral-small |
| `HTTP 429` | Rate limit | GoClaw tự retry; kiểm tra giới hạn gói |
| Model not found | Tên bị đổi hoặc deprecated | Kiểm tra tên hiện tại tại docs.mistral.ai |
| Latency cao | Đang dùng model lớn | Chuyển sang mistral-small-latest để phản hồi nhanh hơn |

## Tiếp theo

- [Tổng quan](/providers-overview) — kiến trúc provider và retry logic
- [Groq](/provider-groq) — inference cực nhanh cho open model
- [OpenRouter](/provider-openrouter) — truy cập Mistral và 100+ model khác qua một key

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
