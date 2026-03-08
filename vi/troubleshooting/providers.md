> Bản dịch từ [English version](../../troubleshooting/providers.md)

# Vấn đề Provider

> Cách xử lý lỗi API key, rate limiting, model mismatch, và schema validation failure.

## Tổng quan

GoClaw hỗ trợ Anthropic (native HTTP+SSE) và nhiều OpenAI-compatible provider. Provider chỉ được đăng ký khi khởi động nếu có API key. Tất cả provider đều dùng automatic retry với exponential backoff cho lỗi tạm thời (429, 500–504, connection reset, timeout).

## Provider Không Được Đăng Ký

Nếu provider không xuất hiện trong dashboard hoặc trả về `provider not found`, nó đã bị bỏ qua khi khởi động vì thiếu API key.

Kiểm tra log khởi động tìm dòng `registered provider`:

```
INFO registered provider name=anthropic
INFO registered provider name=openai
```

Nếu provider bị thiếu, đặt env var tương ứng và restart:

| Provider | Env var |
|----------|---------|
| Anthropic | `GOCLAW_ANTHROPIC_API_KEY` |
| OpenAI | `GOCLAW_OPENAI_API_KEY` |
| Gemini | `GOCLAW_GEMINI_API_KEY` |
| DashScope / Qwen | `GOCLAW_DASHSCOPE_API_KEY` |
| OpenRouter | `GOCLAW_OPENROUTER_API_KEY` |
| Groq | `GOCLAW_GROQ_API_KEY` |
| DeepSeek | `GOCLAW_DEEPSEEK_API_KEY` |
| Mistral | `GOCLAW_MISTRAL_API_KEY` |
| xAI / Grok | `GOCLAW_XAI_API_KEY` |
| MiniMax | `GOCLAW_MINIMAX_API_KEY` |
| Cohere | `GOCLAW_COHERE_API_KEY` |
| Perplexity | `GOCLAW_PERPLEXITY_API_KEY` |

Provider cũng có thể thêm lúc runtime qua dashboard (lưu trong bảng `llm_providers` với key mã hóa AES-256-GCM).

## Lỗi Thường Gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `HTTP 401` | API key không hợp lệ hoặc bị thu hồi | Tạo lại key từ console của provider; cập nhật env var hoặc dashboard |
| `HTTP 403` | Tài khoản bị đình chỉ hoặc hạn chế plan | Kiểm tra trạng thái tài khoản provider; nâng cấp plan nếu đang dùng free tier |
| `HTTP 429` | Hit rate limit | GoClaw tự retry tối đa 3× với backoff (min 300ms, max 30s); nếu kéo dài, giảm concurrency |
| `HTTP 404` / model not found | Tên model sai hoặc model bị xóa | Kiểm tra tên model hiện tại trong tài liệu provider; cập nhật agent config |
| `HTTP 500/502/503/504` | Provider outage | Tự retry; kiểm tra trang status của provider nếu kéo dài |
| Connection reset / EOF / timeout | Mất ổn định mạng | Tự retry; kiểm tra DNS và firewall rules |

## Retry Behavior

GoClaw retry khi gặp HTTP 429, 500, 502, 503, 504, và network error. Cấu hình mặc định:

- **Số lần:** 3
- **Delay ban đầu:** 300ms
- **Delay tối đa:** 30s
- **Backoff:** exponential với ±10% jitter
- **Retry-After header:** được tôn trọng khi có (ví dụ trên 429 từ Anthropic/OpenAI)

## Schema Validation Errors (Gemini)

Gemini từ chối các field JSON Schema mà provider khác chấp nhận. GoClaw tự động loại bỏ field không tương thích trước khi gửi tool definition.

Field bị xóa cho Gemini: `$ref`, `$defs`, `additionalProperties`, `examples`, `default`

Nếu bạn vẫn thấy schema validation error từ Gemini, tool definition có thể dùng nested reference chưa được resolve đầy đủ. Đơn giản hóa parameter schema của tool.

Field bị xóa cho Anthropic: `$ref`, `$defs`

## Extended Thinking (Anthropic)

Extended thinking cần model tương thích (ví dụ `claude-opus-4-5`) và một `thinking` block trong request. GoClaw tự động thêm header `anthropic-beta: interleaved-thinking-2025-05-14` khi có thinking block.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Thinking không xuất hiện | Model không hỗ trợ | Dùng `claude-opus-4-5` hoặc model có khả năng thinking khác |
| Các block `redacted_thinking` | Encrypted thinking được trả về | Bình thường — chúng được giữ lại để context passback; không có nội dung đọc được |
| Budget vượt quá | `budget_tokens` quá thấp | Tăng `budget_tokens` trong agent config; tối thiểu thường là 1024 |

## Claude CLI Provider

Provider `claude-cli` shell ra binary `claude` thay vì gọi API trực tiếp.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Binary không tìm thấy | `claude` không có trong PATH | Đặt `GOCLAW_CLAUDE_CLI_PATH` bằng đường dẫn đầy đủ đến binary |
| Auth failure | CLI chưa xác thực | Chạy `claude login` thủ công để xác thực |
| Model sai | Default model mismatch | Đặt `GOCLAW_CLAUDE_CLI_MODEL` theo model alias mong muốn |
| Work dir errors | Đường dẫn `GOCLAW_CLAUDE_CLI_WORK_DIR` không tồn tại | Tạo thư mục hoặc cập nhật env var |

## Codex Provider

Provider `codex` (OpenAI Codex CLI) cũng shell ra binary local.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Binary không tìm thấy | `codex` không có trong PATH | Cài Codex CLI hoặc đặt đường dẫn trong provider config |
| Auth failure | CLI chưa xác thực | Chạy `codex auth` hoặc đặt `OPENAI_API_KEY` trong environment |
| Stream read error | Binary crash giữa stream | Kiểm tra tương thích phiên bản binary; cập nhật Codex CLI |

## Tiếp theo

- [Vấn đề database](database.md)
- [Các vấn đề thường gặp](common-issues.md)
- [Vấn đề channel](channels.md)
