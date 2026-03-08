> Bản dịch từ [English version](../../getting-started/configuration.md)

# Configuration

> Cách cấu hình GoClaw với config.json và biến môi trường.

## Tổng quan

GoClaw dùng hai lớp cấu hình: file `config.json` cho cấu trúc và biến môi trường cho secrets. File config hỗ trợ JSON5 (cho phép comment) và tự động reload khi lưu.

## Vị trí file config

Mặc định, GoClaw tìm `config.json` trong thư mục hiện tại. Ghi đè bằng:

```bash
export GOCLAW_CONFIG=/path/to/config.json
```

## Cấu trúc config

```jsonc
{
  // Cài đặt gateway
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "max_message_chars": 32000,
    "rate_limit_rpm": 20
  },

  // Mặc định cho agent (áp dụng cho tất cả agent trừ khi được ghi đè)
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tokens": 8192,
      "temperature": 0.7,
      "max_tool_iterations": 20,
      "context_window": 200000,
      "agent_type": "open",
      "memory": true
    },
    "list": {
      // Ghi đè per-agent đặt ở đây
    }
  },

  // Thông tin xác thực LLM provider
  "providers": {
    "openrouter": { "api_key": "env:GOCLAW_OPENROUTER_API_KEY" },
    "anthropic": { "api_key": "env:GOCLAW_ANTHROPIC_API_KEY" }
  },

  // Tích hợp channel
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" },
    "discord": { "enabled": false }
  },

  // Cài đặt tool
  "tools": {
    "exec_approval": "light",
    "web": { "engine": "duckduckgo" },
    "browser": { "headless": true }
  },

  // Text-to-speech provider
  "tts": {},

  // Tác vụ lên lịch
  "cron": [],

  // Định tuyến agent theo channel
  "bindings": {}
}
```

## Biến môi trường

Secrets **không được** đặt trong `config.json`. Dùng biến môi trường thay thế:

### Bắt buộc

| Biến | Mục đích |
|------|---------|
| `GOCLAW_GATEWAY_TOKEN` | Auth token cho API/WebSocket |
| `GOCLAW_ENCRYPTION_KEY` | Khóa AES-256-GCM để mã hóa thông tin xác thực trong DB |
| `GOCLAW_POSTGRES_DSN` | PostgreSQL connection string (ngoài Docker) |

### API Key của Provider

| Biến | Provider |
|------|----------|
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic |
| `GOCLAW_OPENAI_API_KEY` | OpenAI |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_MISTRAL_API_KEY` | Mistral |
| `GOCLAW_XAI_API_KEY` | xAI |

### Tùy chọn

| Biến | Mặc định | Mục đích |
|------|---------|---------|
| `GOCLAW_CONFIG` | `./config.json` | Đường dẫn file config |
| `GOCLAW_WORKSPACE` | `./workspace` | Thư mục workspace của agent |
| `GOCLAW_DATA_DIR` | `./data` | Thư mục data |
| `GOCLAW_TRACE_VERBOSE` | `0` | Đặt thành `1` để xem debug LLM trace |

## Hot Reload

GoClaw theo dõi `config.json` để phát hiện thay đổi bằng `fsnotify` với debounce 300ms. Khi bạn lưu file:

- Cấu hình agent cập nhật ngay lập tức
- Cài đặt channel reload
- Thông tin xác thực provider làm mới

Hầu hết thay đổi không cần restart. Cài đặt gateway (host, port) yêu cầu restart.

## Agent Defaults vs Per-Agent Overrides

Cài đặt trong `agents.defaults` áp dụng cho tất cả agent. Ghi đè per-agent trong `agents.list`:

```jsonc
{
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "temperature": 0.7
    },
    "list": {
      "code-helper": {
        "model": "anthropic/claude-opus-4-20250514",
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  }
}
```

Agent `code-helper` kế thừa `provider: "openrouter"` từ defaults nhưng dùng model và temperature riêng.

## Mức Exec Approval

Cài đặt `tools.exec_approval` kiểm soát độ an toàn khi thực thi code:

| Mức | Hành vi |
|-----|---------|
| `full` | Người dùng phải xác nhận mọi lệnh shell |
| `light` | Tự động chấp nhận lệnh an toàn, hỏi với lệnh nguy hiểm |
| `none` | Tự động chấp nhận tất cả (dùng cẩn thận) |

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Config không load | Kiểm tra đường dẫn `GOCLAW_CONFIG`; đảm bảo cú pháp JSON5 hợp lệ |
| Hot reload không hoạt động | Đảm bảo file đã được lưu (không chỉ buffer); kiểm tra fsnotify hỗ trợ OS của bạn |
| Không tìm thấy API key | Đảm bảo biến môi trường đã được export trong shell session hiện tại |

## Tiếp theo

- [Web Dashboard Tour](web-dashboard-tour.md) — Cấu hình trực quan thay vì sửa JSON
- [Agents Explained](../core-concepts/agents-explained.md) — Tìm hiểu sâu về cấu hình agent
- [Tools Overview](../core-concepts/tools-overview.md) — Các tool và danh mục có sẵn
