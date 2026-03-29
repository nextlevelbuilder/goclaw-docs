> Bản dịch từ [English version](/provider-perplexity)

# Perplexity

Kết nối GoClaw với các model AI tìm kiếm web của Perplexity qua OpenAI-compatible API.

## Tổng quan

Các model Perplexity kết hợp LLM với tìm kiếm web trực tiếp, rất phù hợp cho các agent cần thông tin cập nhật. GoClaw kết nối với Perplexity qua `OpenAIProvider` chuẩn — cùng code path với OpenAI và Groq — nên streaming và tool call hoạt động mà không cần cấu hình đặc biệt.

## Cài đặt

Thêm Perplexity API key vào `config.json`:

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro"
    }
  }
}
```

Lưu key trong `.env.local`:

```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
```

API base mặc định là `https://api.perplexity.ai`. GoClaw định tuyến request đến `/chat/completions` như thường.

## Models

| Model | Ghi chú |
|---|---|
| `sonar-pro` | Model tìm kiếm hàng đầu, độ chính xác cao nhất |
| `sonar` | Tìm kiếm nhanh hơn và rẻ hơn |
| `sonar-reasoning` | Reasoning + tìm kiếm, tốt cho query phức tạp |
| `sonar-reasoning-pro` | Reasoning tốt nhất với tìm kiếm web trực tiếp |

Các model `sonar` của Perplexity tự động tìm kiếm web trước khi trả lời. Bạn không cần cấu hình tìm kiếm riêng.

## Ví dụ

**Config tối giản:**

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro",
      "max_tokens": 2048
    }
  }
}
```

**Dùng Perplexity chỉ cho một agent cụ thể, các agent khác dùng provider khác:**

```json
{
  "providers": {
    "anthropic": { "api_key": "$ANTHROPIC_API_KEY" },
    "perplexity": { "api_key": "$PERPLEXITY_API_KEY" }
  },
  "agents": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5"
    },
    "list": {
      "research-agent": {
        "provider": "perplexity",
        "model": "sonar-pro"
      }
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key không hợp lệ | Xác minh `PERPLEXITY_API_KEY` trong `.env.local` |
| Kết quả tìm kiếm cũ | Đang dùng model không phải sonar | Chuyển sang biến thể `sonar` để có tìm kiếm web trực tiếp |
| Latency cao | Tìm kiếm thêm round-trip | Đây là hành vi bình thường; `sonar` nhanh hơn `sonar-pro` |
| Tool call không được hỗ trợ | Sonar models của Perplexity không hỗ trợ function calling | Dùng Perplexity cho tác vụ research; xử lý tool call bằng provider khác |

## Tiếp theo

- [DashScope](/provider-dashscope) — các model Qwen của Alibaba qua OpenAI-compatible API
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
