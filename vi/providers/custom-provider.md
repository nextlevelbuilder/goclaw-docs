> Bản dịch từ [English version](/provider-custom)

# Custom Provider

Kết nối GoClaw với bất kỳ API nào tương thích OpenAI — model local, inference server tự host, hoặc proxy bên thứ ba.

## Tổng quan

`OpenAIProvider` của GoClaw hoạt động với bất kỳ server nào nói đúng định dạng OpenAI chat completions. Bạn cấu hình tên, API base URL, API key (tùy chọn với server local), và model mặc định. Điều này bao gồm các cài đặt local như Ollama và vLLM, dịch vụ proxy như LiteLLM, và bất kỳ vendor nào quảng cáo tương thích OpenAI.

GoClaw cũng tự động làm sạch tool schema cho các provider không chấp nhận một số JSON Schema field — tool của bạn hoạt động ngay cả khi model downstream khắt khe hơn OpenAI.

## Cài đặt

Custom provider được đăng ký qua HTTP API hoặc cấu hình ở cấp database — không có config key tĩnh cho tên tùy ý. Tuy nhiên, bạn có thể dùng bất kỳ slot tên có sẵn nào với `api_base` tùy chỉnh để trỏ đến server khác:

```json
{
  "providers": {
    "openai": {
      "api_key": "not-required",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

Cách này hoạt động vì GoClaw chỉ quan tâm đến API base và key — tên provider chỉ là nhãn để định tuyến.

## Local Ollama

Chạy model local với [Ollama](https://ollama.com):

```bash
ollama serve          # khởi động tại http://localhost:11434
ollama pull llama3.2  # tải model về
```

```json
{
  "providers": {
    "openai": {
      "api_key": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

Ollama bỏ qua giá trị API key — truyền bất kỳ string không rỗng nào.

## vLLM

Tự host bất kỳ model HuggingFace nào với [vLLM](https://docs.vllm.ai):

```bash
vllm serve meta-llama/Llama-3.2-3B-Instruct --port 8000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "vllm",
      "api_base": "http://localhost:8000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "meta-llama/Llama-3.2-3B-Instruct"
    }
  }
}
```

## LiteLLM Proxy

[LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) proxy 100+ provider qua một endpoint tương thích OpenAI duy nhất:

```bash
litellm --model ollama/llama3.2 --port 4000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "$LITELLM_KEY",
      "api_base": "http://localhost:4000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "ollama/llama3.2"
    }
  }
}
```

## Schema Cleaning

GoClaw tự động loại bỏ các JSON Schema field không được hỗ trợ khỏi tool definitions dựa trên tên provider. Xử lý trong `CleanToolSchemas`:

| Provider | Field bị loại bỏ |
|---|---|
| `gemini` / `gemini-*` | `$ref`, `$defs`, `additionalProperties`, `examples`, `default` |
| `anthropic` | `$ref`, `$defs` |
| Các provider khác | Không loại bỏ gì |

Với custom provider dùng tên không chuẩn, không có schema cleaning nào được áp dụng. Nếu model local của bạn từ chối một số schema field, hãy dùng tên provider kích hoạt đúng cleaning (ví dụ: đặt tên provider là `gemini` để strip các field không tương thích Gemini).

## Khác biệt về Tool Format

Không phải tất cả server tương thích OpenAI đều triển khai tool giống nhau. Các vấn đề thường gặp:

- **Ollama**: Hỗ trợ tool phụ thuộc vào model. Dùng model được tag với hỗ trợ `tools` (ví dụ: `llama3.2`, `qwen2.5`).
- **vLLM**: Hỗ trợ tool phụ thuộc vào model. Truyền flag `--enable-auto-tool-choice` và `--tool-call-parser` khi khởi động vLLM.
- **LiteLLM**: Xử lý chuyển đổi định dạng tool theo từng provider một cách trong suốt.

Nếu tool call thất bại, thử tắt tool cho provider đó và fallback sang plain text với structured output prompt.

## Ví dụ

**LM Studio (giao diện GUI local để chạy model):**

```json
{
  "providers": {
    "openai": {
      "api_key": "lm-studio",
      "api_base": "http://localhost:1234/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
    }
  }
}
```

**Jan (một local model runner khác):**

```json
{
  "providers": {
    "openai": {
      "api_key": "jan",
      "api_base": "http://localhost:1337/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2-3b-instruct"
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `connection refused` | Server local chưa chạy | Khởi động Ollama/vLLM/LiteLLM trước GoClaw |
| `model not found` | Sai tên model cho server | Kiểm tra danh sách model của server (`GET /v1/models`) |
| Tool call gây lỗi | Server không hỗ trợ tool | Tắt tool trong agent config hoặc chuyển sang model hỗ trợ tool |
| Lỗi schema validation | Server từ chối `additionalProperties` hoặc `$ref` | Dùng tên provider kích hoạt schema cleaning, hoặc sanitize tool schema ở upstream |
| Streaming không hoạt động | Server không triển khai SSE đúng cách | Thử tắt streaming; một số server local có lỗi SSE |

## Tiếp theo

- [Tổng quan](/providers-overview) — so sánh tất cả provider
- [DashScope](/provider-dashscope) — các model Qwen của Alibaba
- [Perplexity](/provider-perplexity) — sinh text tăng cường tìm kiếm

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
