> Bản dịch từ [English version](#configuration)

# Cấu hình

> Hướng dẫn cấu hình GoClaw bằng config.json và biến môi trường.

## Tổng quan

GoClaw sử dụng hai lớp cấu hình: file `config.json` cho cấu trúc và biến môi trường cho các thông tin bí mật. File cấu hình hỗ trợ JSON5 (cho phép comment) và tự động tải lại khi được lưu.

## Vị trí file cấu hình

Mặc định, GoClaw tìm kiếm `config.json` trong thư mục hiện tại. Có thể ghi đè bằng:

```bash
export GOCLAW_CONFIG=/path/to/config.json
```

## Cấu trúc cấu hình

Các phần cấp cao nhất:

```jsonc
{
  "gateway": { ... },      // Cài đặt HTTP/WS server, xác thực, hạn mức
  "agents": {              // Mặc định + ghi đè theo từng agent
    "defaults": { ... },
    "list": { ... }
  },
  "memory": { ... },       // Bộ nhớ ngữ nghĩa (embedding, truy xuất)
  "compaction": { ... },   // Ngưỡng nén context
  "context_pruning": { ... }, // Context Pruning policy
  "subagents": { ... },    // Giới hạn đồng thời subagent
  "sandbox": { ... },      // Mặc định Docker sandbox
  "providers": { ... },    // API key nhà cung cấp LLM
  "channels": { ... },     // Tích hợp kênh nhắn tin
  "tools": { ... },        // Chính sách công cụ, máy chủ MCP
  "tts": { ... },          // Chuyển văn bản thành giọng nói
  "sessions": { ... },     // Lưu trữ & phạm vi phiên
  "cron": [],              // Tác vụ theo lịch
  "bindings": {},          // Định tuyến agent theo kênh/peer
  "telemetry": { ... },    // Xuất OpenTelemetry
  "tailscale": { ... }     // Mạng Tailscale/tsnet
}
```

**Quan trọng:** Tiền tố `env:` yêu cầu GoClaw đọc giá trị từ biến môi trường thay vì dùng chuỗi trực tiếp.

- `"env:GOCLAW_OPENROUTER_API_KEY"` → đọc `$GOCLAW_OPENROUTER_API_KEY`
- `"my-secret-key"` (không có `env:`) → dùng chuỗi trực tiếp (**không khuyến nghị** cho thông tin bí mật)

Luôn dùng `env:` cho các giá trị nhạy cảm như API key, token và mật khẩu.

## Biến môi trường

### Bắt buộc

| Biến | Mục đích |
|------|---------|
| `GOCLAW_GATEWAY_TOKEN` | Bearer token xác thực API/WebSocket |
| `GOCLAW_ENCRYPTION_KEY` | Khóa AES-256-GCM để mã hóa thông tin xác thực trong DB |
| `GOCLAW_POSTGRES_DSN` | Chuỗi kết nối PostgreSQL |

### API key nhà cung cấp

| Biến | Nhà cung cấp |
|------|-------------|
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic |
| `GOCLAW_OPENAI_API_KEY` | OpenAI |
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_MISTRAL_API_KEY` | Mistral |
| `GOCLAW_XAI_API_KEY` | xAI |
| `GOCLAW_MINIMAX_API_KEY` | MiniMax |
| `GOCLAW_COHERE_API_KEY` | Cohere |
| `GOCLAW_PERPLEXITY_API_KEY` | Perplexity |
| `GOCLAW_DASHSCOPE_API_KEY` | DashScope (Alibaba Cloud Model Studio — Qwen API) |
| `GOCLAW_BAILIAN_API_KEY` | Bailian (Alibaba Cloud Model Studio — Coding Plan) |
| `GOCLAW_ZAI_API_KEY` | ZAI |
| `GOCLAW_ZAI_CODING_API_KEY` | ZAI Coding |
| `GOCLAW_OLLAMA_CLOUD_API_KEY` | Ollama Cloud |

### Tùy chọn

| Biến | Mặc định | Mục đích |
|------|---------|---------|
| `GOCLAW_CONFIG` | `./config.json` | Đường dẫn file cấu hình |
| `GOCLAW_WORKSPACE` | `./workspace` | Thư mục workspace của agent |
| `GOCLAW_DATA_DIR` | `./data` | Thư mục dữ liệu |
| `GOCLAW_REDIS_DSN` | — | Redis DSN (nếu dùng lưu trữ phiên Redis) |
| `GOCLAW_TSNET_AUTH_KEY` | — | Khóa xác thực Tailscale |
| `GOCLAW_TRACE_VERBOSE` | `0` | Đặt thành `1` để bật debug LLM traces |

## Hot Reload

GoClaw theo dõi thay đổi của `config.json` bằng `fsnotify` với debounce 300ms. Agents, channels và thông tin xác thực nhà cung cấp sẽ tự động tải lại.

**Ngoại lệ:** Cài đặt gateway (host, port) yêu cầu khởi động lại hoàn toàn.

## Cấu hình Gateway

```jsonc
"gateway": {
  "host": "0.0.0.0",
  "port": 18790,
  "token": "env:GOCLAW_GATEWAY_TOKEN",
  "owner_ids": ["user123"],
  "max_message_chars": 32000,
  "rate_limit_rpm": 20,
  "allowed_origins": ["https://app.example.com"],
  "injection_action": "warn",
  "inbound_debounce_ms": 1000,
  "block_reply": false,
  "tool_status": true,
  "quota": {
    "enabled": true,
    "default": { "hour": 100, "day": 500 },
    "providers": { "anthropic": { "hour": 50 } },
    "channels": { "telegram": { "day": 200 } },
    "groups": { "group_vip": { "hour": 0 } }
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `host` | string | `"0.0.0.0"` | Địa chỉ bind |
| `port` | int | `18790` | Cổng HTTP/WS |
| `token` | string | — | Bearer token xác thực WS/HTTP |
| `owner_ids` | []string | — | ID người gửi được coi là "owner" (bỏ qua hạn mức/giới hạn) |
| `max_message_chars` | int | `32000` | Độ dài tối đa tin nhắn đến |
| `rate_limit_rpm` | int | `20` | Giới hạn tốc độ toàn cục (yêu cầu mỗi phút) |
| `allowed_origins` | []string | — | CORS allowlist cho WebSocket; để trống = cho phép tất cả |
| `injection_action` | string | `"warn"` | Phản hồi với prompt injection: `"log"`, `"warn"`, `"block"`, `"off"` |
| `inbound_debounce_ms` | int | `1000` | Gộp các tin nhắn nhanh trong khoảng thời gian; `-1` = vô hiệu hóa |
| `block_reply` | bool | `false` | Nếu true, ẩn văn bản trung gian trong quá trình lặp công cụ |
| `tool_status` | bool | `true` | Hiển thị tên công cụ trong xem trước streaming |
| `task_recovery_interval_sec` | int | `300` | Tần suất (giây) kiểm tra và khôi phục tác vụ nhóm bị treo |
| `quota` | object | — | Hạn ngạch yêu cầu theo người dùng/nhóm (xem bên dưới) |

**Các trường Quota** (`quota.default`, `quota.providers.*`, `quota.channels.*`, `quota.groups.*`):

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `hour` | int | Số yêu cầu tối đa mỗi giờ; `0` = không giới hạn |
| `day` | int | Số yêu cầu tối đa mỗi ngày |
| `week` | int | Số yêu cầu tối đa mỗi tuần |

## Cấu hình Agent

### Mặc định

Các cài đặt trong `agents.defaults` áp dụng cho tất cả agent trừ khi được ghi đè.

```jsonc
"agents": {
  "defaults": {
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "max_tokens": 8192,
    "temperature": 0.7,
    "max_tool_iterations": 20,
    "max_tool_calls": 25,
    "context_window": 200000,
    "agent_type": "open",
    "workspace": "./workspace",
    "restrict_to_workspace": false,
    "bootstrapMaxChars": 20000,
    "bootstrapTotalMaxChars": 24000,
    "memory": { "enabled": true }
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `provider` | string | — | ID nhà cung cấp LLM |
| `model` | string | — | Tên model |
| `max_tokens` | int | — | Số token đầu ra tối đa |
| `temperature` | float | `0.7` | Sampling temperature (độ ngẫu nhiên khi sinh văn bản) |
| `max_tool_iterations` | int | `20` | Số vòng lặp LLM→công cụ tối đa mỗi yêu cầu |
| `max_tool_calls` | int | `25` | Tổng số lần gọi công cụ tối đa mỗi yêu cầu |
| `context_window` | int | — | Kích thước cửa sổ context tính bằng token |
| `agent_type` | string | `"open"` | `"open"` (context theo session: identity/soul/user files refresh mỗi session mới) hoặc `"predefined"` (context cố định: identity/soul files dùng chung + USER.md riêng mỗi user, giữ xuyên suốt các session) |
| `workspace` | string | `"./workspace"` | Thư mục làm việc cho các thao tác file |
| `restrict_to_workspace` | bool | `false` | Chặn truy cập file ngoài workspace |
| `bootstrapMaxChars` | int | `20000` | Số ký tự tối đa cho một tài liệu bootstrap đơn |
| `bootstrapTotalMaxChars` | int | `24000` | Tổng số ký tự tối đa trên tất cả tài liệu bootstrap |

> **Lưu ý:** `intent_classify` không phải là trường trong config.json. Nó được cấu hình theo từng agent qua Dashboard (phần Cài đặt agent → Behavior & UX) và được lưu trên bản ghi agent trong cơ sở dữ liệu.

### Ghi đè theo từng Agent

```jsonc
"agents": {
  "list": {
    "code-helper": {
      "displayName": "Code Helper",
      "model": "anthropic/claude-opus-4-6",
      "temperature": 0.3,
      "max_tool_iterations": 50,
      "max_tool_calls": 40,
      "default": false,
      "skills": ["git", "code-review"],
      "workspace": "./workspace/code",
      "identity": { "name": "CodeBot", "emoji": "🤖" },
      "tools": {
        "profile": "coding",
        "deny": ["web_search"]
      },
      "sandbox": { "mode": "non-main" }
    }
  }
}
```

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `displayName` | string | Tên agent hiển thị trên giao diện |
| `default` | bool | Đánh dấu là agent mặc định cho các yêu cầu không khớp |
| `skills` | []string | ID skill cần bật; `null` = tất cả có sẵn |
| `tools` | object | Chính sách công cụ theo agent (xem phần Tools) |
| `workspace` | string | Ghi đè đường dẫn workspace cho agent này |
| `sandbox` | object | Ghi đè cấu hình sandbox cho agent này |
| `identity` | object | `{ "name": "...", "emoji": "..." }` danh tính hiển thị |
| Tất cả trường defaults | — | Bất kỳ trường `defaults` nào đều có thể ghi đè ở đây |

## Memory

Bộ nhớ ngữ nghĩa lưu trữ và truy xuất ngữ cảnh hội thoại bằng vector embedding.

```jsonc
"memory": {
  "enabled": true,
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "embedding_api_base": "",
  "max_results": 6,
  "max_chunk_len": 1000,
  "vector_weight": 0.7,
  "text_weight": 0.3,
  "min_score": 0.35
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `enabled` | bool | `true` | Bật bộ nhớ ngữ nghĩa |
| `embedding_provider` | string | auto | `"openai"`, `"gemini"`, `"openrouter"`, hoặc `""` (tự động phát hiện) |
| `embedding_model` | string | `"text-embedding-3-small"` | Model embedding |
| `embedding_api_base` | string | — | URL API base tùy chỉnh cho embeddings |
| `max_results` | int | `6` | Số khối bộ nhớ tối đa được truy xuất mỗi truy vấn |
| `max_chunk_len` | int | `1000` | Số ký tự tối đa mỗi khối bộ nhớ |
| `vector_weight` | float | `0.7` | Trọng số cho điểm tương đồng vector |
| `text_weight` | float | `0.3` | Trọng số cho điểm văn bản (BM25) |
| `min_score` | float | `0.35` | Ngưỡng điểm tối thiểu để truy xuất |

## Compaction

Kiểm soát thời điểm và cách GoClaw nén lịch sử hội thoại dài để giữ trong giới hạn context.

```jsonc
"compaction": {
  "reserveTokensFloor": 20000,
  "maxHistoryShare": 0.75,
  "minMessages": 50,
  "keepLastMessages": 4,
  "memoryFlush": {
    "enabled": true,
    "softThresholdTokens": 4000,
    "prompt": "",
    "systemPrompt": ""
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `reserveTokensFloor` | int | `20000` | Token tối thiểu luôn được dành cho phản hồi |
| `maxHistoryShare` | float | `0.75` | Phần tối đa của cửa sổ context dùng cho lịch sử |
| `minMessages` | int | `50` | Không nén cho đến khi lịch sử có đủ số tin nhắn này |
| `keepLastMessages` | int | `4` | Luôn giữ N tin nhắn gần nhất |
| `memoryFlush.enabled` | bool | `true` | Ghi nội dung tóm tắt vào bộ nhớ khi nén |
| `memoryFlush.softThresholdTokens` | int | `4000` | Kích hoạt flush khi đang tiếp cận số token này |
| `memoryFlush.prompt` | string | — | Prompt người dùng tùy chỉnh để tóm tắt |
| `memoryFlush.systemPrompt` | string | — | System prompt tùy chỉnh để tóm tắt |

## Context Pruning

Cắt bỏ các kết quả tool cũ khỏi context khi đến giới hạn.

```jsonc
"context_pruning": {
  "mode": "cache-ttl",
  "keepLastAssistants": 3,
  "softTrimRatio": 0.3,
  "hardClearRatio": 0.5,
  "minPrunableToolChars": 50000,
  "softTrim": {
    "maxChars": 4000,
    "headChars": 1500,
    "tailChars": 1500
  },
  "hardClear": {
    "enabled": true,
    "placeholder": "[Old tool result content cleared]"
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `mode` | string | `"off"` | `"off"` hoặc `"cache-ttl"` (prune theo tuổi) |
| `keepLastAssistants` | int | `3` | Giữ N lượt assistant gần nhất nguyên vẹn |
| `softTrimRatio` | float | `0.3` | Bắt đầu soft trim khi context vượt quá tỷ lệ này so với cửa sổ context |
| `hardClearRatio` | float | `0.5` | Bắt đầu hard clear khi context vượt quá tỷ lệ này |
| `minPrunableToolChars` | int | `50000` | Tổng ký tự tool tối thiểu trước khi bật pruning |
| `softTrim.maxChars` | int | `4000` | Kết quả tool dài hơn giá trị này sẽ bị cắt ngắn |
| `softTrim.headChars` | int | `1500` | Số ký tự giữ lại từ đầu kết quả bị cắt |
| `softTrim.tailChars` | int | `1500` | Số ký tự giữ lại từ cuối kết quả bị cắt |
| `hardClear.enabled` | bool | `true` | Bật hard clear cho các kết quả tool rất cũ |
| `hardClear.placeholder` | string | `"[Old tool result content cleared]"` | Văn bản thay thế kết quả bị xóa |

## Subagents

Kiểm soát cách các agent có thể tạo agent con.

```jsonc
"subagents": {
  "maxConcurrent": 20,
  "maxSpawnDepth": 1,
  "maxChildrenPerAgent": 5,
  "archiveAfterMinutes": 60,
  "model": "anthropic/claude-haiku-4-5-20251001"
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `maxConcurrent` | int | `20` | Số subagent chạy đồng thời tối đa (fallback khi không có config.json: `8`) |
| `maxSpawnDepth` | int | `1` | Độ sâu lồng nhau tối đa (1–5); `1` = chỉ root mới được tạo |
| `maxChildrenPerAgent` | int | `5` | Số agent con tối đa mỗi agent cha (1–20) |
| `archiveAfterMinutes` | int | `60` | Lưu trữ subagent không hoạt động sau khoảng thời gian này |
| `model` | string | — | Model mặc định cho subagent (ghi đè mặc định agent) |

## Sandbox

Cô lập dựa trên Docker cho thực thi code. Có thể đặt toàn cục hoặc ghi đè theo từng agent.

```jsonc
"sandbox": {
  "mode": "non-main",
  "image": "goclaw-sandbox:bookworm-slim",
  "workspace_access": "rw",
  "scope": "session",
  "memory_mb": 512,
  "cpus": 1.0,
  "timeout_sec": 300,
  "network_enabled": false,
  "read_only_root": true,
  "setup_command": "",
  "env": { "MY_VAR": "value" },
  "user": "",
  "tmpfs_size_mb": 0,
  "max_output_bytes": 1048576,
  "idle_hours": 24,
  "max_age_days": 7,
  "prune_interval_min": 5
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `mode` | string | `"off"` | `"off"`, `"non-main"` (chỉ sandbox subagent), `"all"` |
| `image` | string | `"goclaw-sandbox:bookworm-slim"` | Docker image |
| `workspace_access` | string | `"rw"` | Mount workspace: `"none"`, `"ro"`, `"rw"` |
| `scope` | string | `"session"` | Container lifecycle: `"session"`, `"agent"`, `"shared"` |
| `memory_mb` | int | `512` | Giới hạn bộ nhớ (MB) |
| `cpus` | float | `1.0` | Hạn ngạch CPU |
| `timeout_sec` | int | `300` | Thời gian thực thi tối đa mỗi lệnh |
| `network_enabled` | bool | `false` | Cho phép truy cập mạng bên trong container |
| `read_only_root` | bool | `true` | Filesystem root chỉ đọc |
| `setup_command` | string | — | Lệnh shell chạy khi container khởi động |
| `env` | map | — | Biến môi trường bổ sung |
| `max_output_bytes` | int | `1048576` | Tối đa stdout+stderr mỗi lệnh (mặc định 1 MB) |
| `idle_hours` | int | `24` | Xóa container không hoạt động lâu hơn thời gian này |
| `max_age_days` | int | `7` | Xóa container cũ hơn thời gian này |
| `prune_interval_min` | int | `5` | Tần suất chạy dọn dẹp container |

## Providers

```jsonc
"providers": {
  "anthropic":   { "api_key": "env:GOCLAW_ANTHROPIC_API_KEY" },
  "openai":      { "api_key": "env:GOCLAW_OPENAI_API_KEY" },
  "openrouter":  { "api_key": "env:GOCLAW_OPENROUTER_API_KEY" },
  "groq":        { "api_key": "env:GOCLAW_GROQ_API_KEY" },
  "gemini":      { "api_key": "env:GOCLAW_GEMINI_API_KEY" },
  "deepseek":    { "api_key": "env:GOCLAW_DEEPSEEK_API_KEY" },
  "mistral":     { "api_key": "env:GOCLAW_MISTRAL_API_KEY" },
  "xai":         { "api_key": "env:GOCLAW_XAI_API_KEY" },
  "minimax":     { "api_key": "env:GOCLAW_MINIMAX_API_KEY" },
  "cohere":      { "api_key": "env:GOCLAW_COHERE_API_KEY" },
  "perplexity":  { "api_key": "env:GOCLAW_PERPLEXITY_API_KEY" },
  "dashscope":   { "api_key": "env:GOCLAW_DASHSCOPE_API_KEY" },
  "bailian":     { "api_key": "env:GOCLAW_BAILIAN_API_KEY" },
  "zai":         { "api_key": "env:GOCLAW_ZAI_API_KEY" },
  "zai_coding":  { "api_key": "env:GOCLAW_ZAI_CODING_API_KEY" },
  "ollama":      { "host": "http://localhost:11434" },
  "ollama_cloud":{ "api_key": "env:GOCLAW_OLLAMA_CLOUD_API_KEY" },
  "claude_cli":  {
    "cli_path": "/usr/local/bin/claude",
    "model": "claude-opus-4-5",
    "base_work_dir": "/tmp/claude-work",
    "perm_mode": "bypassPermissions"
  },
  "acp": {
    "binary": "claude",
    "args": [],
    "model": "claude-sonnet-4-5",
    "work_dir": "/tmp/acp-work",
    "idle_ttl": "5m",
    "perm_mode": "approve-all"
  }
}
```

**Lưu ý:**
- `ollama` — Ollama cục bộ; không cần API key, chỉ cần `host`
- `claude_cli` — chạy Claude qua subprocess CLI; các trường đặc biệt: `cli_path`, `base_work_dir`, `perm_mode`
- `acp` — điều phối bất kỳ agent tương thích ACP nào (Claude Code, Codex CLI, Gemini CLI) như một subprocess qua JSON-RPC 2.0 stdio

**Các trường của provider ACP:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `binary` | string | Tên hoặc đường dẫn binary agent (ví dụ: `"claude"`, `"codex"`) |
| `args` | []string | Tham số bổ sung truyền khi spawn |
| `model` | string | Tên model/agent mặc định |
| `work_dir` | string | Thư mục workspace cơ sở cho các tiến trình agent |
| `idle_ttl` | string | Thời gian giữ tiến trình nhàn rỗi (Go duration, ví dụ: `"5m"`) |
| `perm_mode` | string | Chế độ phân quyền công cụ: `"approve-all"` (mặc định), `"approve-reads"`, `"deny-all"` |

## Channels

### Telegram

```jsonc
"telegram": {
  "enabled": true,
  "token": "env:TELEGRAM_BOT_TOKEN",
  "proxy": "",
  "api_server": "",
  "allow_from": ["123456789"],
  "dm_policy": "pairing",
  "group_policy": "allowlist",
  "require_mention": true,
  "history_limit": 50,
  "dm_stream": false,
  "group_stream": false,
  "draft_transport": true,
  "reasoning_stream": true,
  "reaction_level": "full",
  "media_max_bytes": 20971520,
  "link_preview": true,
  "block_reply": false,
  "stt_proxy_url": "",
  "stt_api_key": "env:GOCLAW_STT_API_KEY",
  "stt_tenant_id": "",
  "stt_timeout_seconds": 30,
  "voice_agent_id": "",
  "groups": {
    "-100123456789": { "agent_id": "code-helper", "require_mention": false }
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `token` | string | — | Bot token từ @BotFather |
| `proxy` | string | — | URL proxy HTTP/SOCKS5 |
| `api_server` | string | — | URL máy chủ Telegram Bot API tùy chỉnh (ví dụ: `"http://localhost:8081"`) |
| `allow_from` | []string | — | ID người dùng/chat được phép; để trống = cho phép tất cả |
| `dm_policy` | string | `"pairing"` | Truy cập DM: `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `"open"` | Truy cập nhóm: `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | bool | `true` | Yêu cầu đề cập @bot trong nhóm |
| `history_limit` | int | `50` | Số tin nhắn tải để lấy ngữ cảnh khi bắt đầu hội thoại |
| `dm_stream` | bool | `false` | Phản hồi streaming trong DM |
| `group_stream` | bool | `false` | Phản hồi streaming trong nhóm |
| `draft_transport` | bool | `true` | Dùng `sendMessageDraft` cho DM streaming (xem trước ẩn — không thông báo mỗi lần chỉnh sửa) |
| `reasoning_stream` | bool | `true` | Hiển thị reasoning như tin nhắn riêng khi provider phát ra thinking events |
| `reaction_level` | string | `"full"` | Reaction emoji: `"off"`, `"minimal"`, `"full"` |
| `media_max_bytes` | int | `20971520` | Kích thước file media tối đa (mặc định 20 MB) |
| `link_preview` | bool | `true` | Hiển thị xem trước liên kết |
| `block_reply` | bool | `false` | Ghi đè `block_reply` của gateway cho kênh này |
| `stt_*` | — | — | Cấu hình chuyển giọng nói thành văn bản (proxy URL, API key, tenant, timeout) |
| `voice_agent_id` | string | — | Agent xử lý tin nhắn thoại |
| `groups` | map | — | Ghi đè theo nhóm, khóa theo chat ID |

### Discord

```jsonc
"discord": {
  "enabled": true,
  "token": "env:DISCORD_BOT_TOKEN",
  "allow_from": [],
  "dm_policy": "open",
  "group_policy": "open",
  "require_mention": true,
  "history_limit": 50,
  "block_reply": false,
  "media_max_bytes": 26214400,
  "stt_api_key": "env:GOCLAW_STT_API_KEY",
  "stt_timeout_seconds": 30,
  "voice_agent_id": ""
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `token` | string | — | Token Discord bot |
| `allow_from` | []string | — | ID người dùng được phép |
| `dm_policy` | string | `"open"` | Chính sách DM |
| `group_policy` | string | `"open"` | Chính sách server/kênh |
| `require_mention` | bool | `true` | Yêu cầu @mention trong kênh |
| `history_limit` | int | `50` | Giới hạn lịch sử ngữ cảnh |
| `media_max_bytes` | int | `26214400` | Kích thước media tối đa (mặc định 25 MB) |
| `block_reply` | bool | `false` | Ẩn các phản hồi trung gian |
| `stt_*` | — | — | Cấu hình chuyển giọng nói thành văn bản |
| `voice_agent_id` | string | — | Agent cho tin nhắn thoại |

### Slack

```jsonc
"slack": {
  "enabled": true,
  "bot_token": "env:SLACK_BOT_TOKEN",
  "app_token": "env:SLACK_APP_TOKEN",
  "user_token": "env:SLACK_USER_TOKEN",
  "allow_from": [],
  "dm_policy": "pairing",
  "group_policy": "open",
  "require_mention": true,
  "history_limit": 50,
  "dm_stream": false,
  "group_stream": false,
  "native_stream": false,
  "reaction_level": "minimal",
  "block_reply": false,
  "debounce_delay": 300,
  "thread_ttl": 24,
  "media_max_bytes": 20971520
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `bot_token` | string | — | Bot OAuth token (`xoxb-...`) |
| `app_token` | string | — | App-level token cho Socket Mode (`xapp-...`) |
| `user_token` | string | — | User OAuth token (`xoxp-...`) |
| `allow_from` | []string | — | ID người dùng được phép |
| `dm_policy` | string | `"pairing"` | Chính sách truy cập DM |
| `group_policy` | string | `"open"` | Chính sách truy cập kênh |
| `require_mention` | bool | `true` | Yêu cầu @mention trong kênh |
| `native_stream` | bool | `false` | Dùng Slack native streaming API |
| `debounce_delay` | int | `300` | Debounce tin nhắn tính bằng millisecond |
| `thread_ttl` | int | `24` | Số giờ duy trì ngữ cảnh thread; `0` = vô hiệu hóa (luôn yêu cầu @mention) |
| `media_max_bytes` | int | `20971520` | Kích thước media tối đa (mặc định 20 MB) |

### WhatsApp

```jsonc
"whatsapp": {
  "enabled": true,
  "bridge_url": "http://localhost:8080",
  "allow_from": [],
  "dm_policy": "open",
  "group_policy": "disabled",
  "block_reply": false
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `bridge_url` | string | — | URL dịch vụ bridge WhatsApp |
| `allow_from` | []string | — | Số điện thoại/JID được phép |
| `dm_policy` | string | `"open"` | Chính sách truy cập DM |
| `group_policy` | string | `"disabled"` | Chính sách truy cập nhóm |
| `block_reply` | bool | `false` | Ẩn các phản hồi trung gian |

### Zalo

```jsonc
"zalo": {
  "enabled": true,
  "token": "env:ZALO_OA_TOKEN",
  "allow_from": [],
  "dm_policy": "pairing",
  "webhook_url": "https://example.com/zalo/webhook",
  "webhook_secret": "env:ZALO_WEBHOOK_SECRET",
  "media_max_mb": 5,
  "block_reply": false
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `token` | string | — | Access token Zalo OA |
| `allow_from` | []string | — | ID người dùng được phép |
| `dm_policy` | string | `"pairing"` | Chính sách truy cập DM |
| `webhook_url` | string | — | URL webhook công khai cho callback Zalo |
| `webhook_secret` | string | — | Secret chữ ký webhook |
| `media_max_mb` | int | `5` | Kích thước media tối đa (MB) |
| `block_reply` | bool | `false` | Ẩn các phản hồi trung gian |

### Zalo Personal

```jsonc
"zalo_personal": {
  "enabled": true,
  "allow_from": [],
  "dm_policy": "pairing",
  "group_policy": "disabled",
  "require_mention": false,
  "history_limit": 50,
  "credentials_path": "./zalo-creds.json",
  "block_reply": false
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `allow_from` | []string | — | ID người dùng được phép |
| `dm_policy` | string | `"pairing"` | Chính sách truy cập DM |
| `group_policy` | string | `"disabled"` | Chính sách truy cập nhóm |
| `require_mention` | bool | `false` | Yêu cầu mention trong nhóm |
| `history_limit` | int | `50` | Giới hạn lịch sử ngữ cảnh |
| `credentials_path` | string | — | Đường dẫn đến file thông tin xác thực phiên Zalo |
| `block_reply` | bool | `false` | Ẩn các phản hồi trung gian |

### Larksuite

Khóa JSON: `"feishu"`

```jsonc
"feishu": {
  "enabled": true,
  "app_id": "env:LARK_APP_ID",
  "app_secret": "env:LARK_APP_SECRET",
  "encrypt_key": "env:LARK_ENCRYPT_KEY",
  "verification_token": "env:LARK_VERIFICATION_TOKEN",
  "domain": "lark",
  "connection_mode": "websocket",
  "webhook_port": 3000,
  "webhook_path": "/feishu/events",
  "allow_from": [],
  "dm_policy": "pairing",
  "group_policy": "open",
  "group_allow_from": [],
  "require_mention": true,
  "topic_session_mode": "disabled",
  "text_chunk_limit": 4000,
  "media_max_mb": 30,
  "render_mode": "auto",
  "streaming": true,
  "reaction_level": "minimal",
  "history_limit": 50,
  "block_reply": false,
  "stt_api_key": "env:GOCLAW_STT_API_KEY",
  "stt_timeout_seconds": 30,
  "voice_agent_id": ""
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `app_id` / `app_secret` | string | — | Thông tin xác thực ứng dụng Larksuite |
| `encrypt_key` | string | — | Khóa mã hóa sự kiện |
| `verification_token` | string | — | Token xác minh webhook |
| `domain` | string | `"lark"` | `"lark"`, `"feishu"`, hoặc URL base tùy chỉnh |
| `connection_mode` | string | `"websocket"` | `"websocket"` hoặc `"webhook"` |
| `webhook_port` | int | `3000` | Cổng cho chế độ webhook |
| `webhook_path` | string | `"/feishu/events"` | Đường dẫn cho các sự kiện webhook |
| `group_allow_from` | []string | — | ID nhóm được phép |
| `topic_session_mode` | string | `"disabled"` | Xử lý phiên thread/topic |
| `text_chunk_limit` | int | `4000` | Số ký tự tối đa mỗi khối tin nhắn |
| `render_mode` | string | `"auto"` | Hiển thị tin nhắn: `"auto"`, `"raw"`, `"card"` |
| `streaming` | bool | `true` | Bật phản hồi streaming |
| `media_max_mb` | int | `30` | Kích thước media tối đa (MB) |

### Pending Compaction

Tự động nén lịch sử kênh dài.

```jsonc
"channels": {
  "pending_compaction": {
    "threshold": 50,
    "keep_recent": 15,
    "max_tokens": 4096,
    "provider": "openrouter",
    "model": "anthropic/claude-haiku-4-5-20251001"
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `threshold` | int | `50` | Nén khi tin nhắn đang chờ vượt quá số này |
| `keep_recent` | int | `15` | Luôn giữ số tin nhắn gần nhất này |
| `max_tokens` | int | `4096` | Token tối đa cho bản tóm tắt nén |
| `provider` | string | — | Nhà cung cấp cho lần gọi LLM nén |
| `model` | string | — | Model cho lần gọi LLM nén |

## Tools

```jsonc
"tools": {
  "profile": "coding",
  "allow": ["bash", "read_file"],
  "deny": ["web_search"],
  "alsoAllow": ["special_tool"],
  "rate_limit_per_hour": 500,
  "scrub_credentials": true,
  "execApproval": {
    "security": "allowlist",
    "ask": "on-miss"
  },
  "web": {
    "duckduckgo": { "enabled": true },
    "fetch": {
      "policy": "allow_all",
      "allowed_domains": [],
      "blocked_domains": []
    }
  },
  "browser": { "enabled": true, "headless": true },
  "byProvider": {
    "anthropic": { "profile": "full" }
  },
  "mcp_servers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "enabled": true,
      "tool_prefix": "fs_",
      "timeout_sec": 60
    },
    "remote-api": {
      "transport": "streamable-http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "env:MCP_API_KEY" },
      "enabled": true
    }
  }
}
```

**Các trường chính sách công cụ:**

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `profile` | string | — | Preset công cụ: `"minimal"`, `"coding"`, `"messaging"`, `"full"` |
| `allow` | []string | — | ID công cụ được phép rõ ràng |
| `deny` | []string | — | ID công cụ bị từ chối rõ ràng |
| `alsoAllow` | []string | — | Thêm công cụ trên profile hiện tại |
| `rate_limit_per_hour` | int | — | Số lần gọi công cụ tối đa mỗi giờ trên toàn cục |
| `scrub_credentials` | bool | `true` | Che giấu thông tin xác thực trong đầu ra công cụ |

**Chính sách web fetch (`tools.web.fetch`):**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `policy` | string | `"allow_all"` hoặc `"allowlist"` |
| `allowed_domains` | []string | Các domain được phép khi policy là `"allowlist"` |
| `blocked_domains` | []string | Các domain luôn bị chặn |

**Các trường máy chủ MCP (`tools.mcp_servers.*`):**

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `transport` | string | — | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | — | Tệp thực thi cho transport stdio |
| `args` | []string | — | Tham số cho lệnh stdio |
| `env` | map | — | Biến môi trường cho tiến trình stdio |
| `url` | string | — | URL cho transport SSE/HTTP |
| `headers` | map | — | HTTP headers (hỗ trợ tiền tố `env:`) |
| `enabled` | bool | `true` | Bật/tắt máy chủ này |
| `tool_prefix` | string | — | Tiền tố thêm vào tất cả công cụ từ máy chủ này |
| `timeout_sec` | int | `60` | Timeout yêu cầu |

**Chính sách công cụ theo agent/theo nhà cung cấp** hỗ trợ các trường tương tự cộng thêm:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `vision` | object | `{ "provider": "...", "model": "..." }` cho tác vụ vision |
| `imageGen` | object | `{ "provider": "...", "model": "...", "size": "...", "quality": "..." }` |

## Exec Approval

Kiểm soát bảo mật thực thi code:

**`security`** — Các lệnh được phép:

| Giá trị | Hành vi |
|---------|---------|
| `deny` | Chặn tất cả lệnh shell |
| `allowlist` | Chỉ thực thi các lệnh trong allowlist |
| `full` | Cho phép tất cả lệnh shell |

**`ask`** — Khi nào yêu cầu phê duyệt:

| Giá trị | Hành vi |
|---------|---------|
| `off` | Không bao giờ hỏi, tự động phê duyệt dựa trên mức bảo mật |
| `on-miss` | Hỏi khi lệnh không có trong allowlist |
| `always` | Hỏi cho mỗi lệnh |

```jsonc
// Hạn chế: chỉ lệnh trong allowlist, hỏi cho các lệnh khác
"execApproval": { "security": "allowlist", "ask": "on-miss" }

// Thoải mái: cho phép tất cả, không bao giờ hỏi
"execApproval": { "security": "full", "ask": "off" }

// Khóa chặt: chặn tất cả thực thi
"execApproval": { "security": "deny", "ask": "off" }
```

| Tình huống | Cấu hình khuyến nghị |
|-----------|---------------------|
| Học tập / Cục bộ | `"security": "allowlist", "ask": "on-miss"` |
| Sử dụng cá nhân | `"security": "full", "ask": "always"` |
| Production | `"security": "deny", "ask": "off"` |
| Thử nghiệm | `"security": "full", "ask": "off"` |

## TTS

Chuyển văn bản thành giọng nói cho đầu ra thoại trên các kênh được hỗ trợ.

```jsonc
"tts": {
  "provider": "openai",
  "auto": "off",
  "mode": "final",
  "max_length": 1500,
  "timeout_ms": 30000,
  "openai": {
    "api_key": "env:GOCLAW_OPENAI_API_KEY",
    "api_base": "",
    "model": "gpt-4o-mini-tts",
    "voice": "alloy"
  },
  "elevenlabs": {
    "api_key": "env:ELEVENLABS_API_KEY",
    "base_url": "",
    "voice_id": "",
    "model_id": "eleven_multilingual_v2"
  },
  "edge": {
    "enabled": true,
    "voice": "en-US-MichelleNeural",
    "rate": ""
  },
  "minimax": {
    "api_key": "env:GOCLAW_MINIMAX_API_KEY",
    "group_id": "",
    "api_base": "",
    "model": "speech-02-hd",
    "voice_id": "Wise_Woman"
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `provider` | string | — | Nhà cung cấp TTS đang hoạt động: `"openai"`, `"elevenlabs"`, `"edge"`, `"minimax"` |
| `auto` | string | `"off"` | Chế độ tự động phát: `"off"`, `"always"`, `"inbound"`, `"tagged"` |
| `mode` | string | `"final"` | Phát phản hồi `"final"` hoặc tất cả `"all"` khối |
| `max_length` | int | `1500` | Số ký tự tối đa mỗi yêu cầu TTS |
| `timeout_ms` | int | `30000` | Timeout yêu cầu TTS (ms) |

## Sessions

Kiểm soát cách phiên hội thoại được xác định phạm vi và lưu trữ.

```jsonc
"sessions": {
  "scope": "per-sender",
  "dm_scope": "per-channel-peer",
  "main_key": "main"
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `scope` | string | `"per-sender"` | Phạm vi phiên: `"per-sender"` hoặc `"global"` |
| `dm_scope` | string | `"per-channel-peer"` | Độ chi tiết phiên DM: `"main"`, `"per-peer"`, `"per-channel-peer"`, `"per-account-channel-peer"` |
| `main_key` | string | `"main"` | Khóa dùng cho phiên chính/mặc định |

> **Lưu ý:** Backend lưu trữ (PostgreSQL hoặc Redis) được xác định bằng build flags và biến môi trường (`GOCLAW_POSTGRES_DSN`, `GOCLAW_REDIS_DSN`), không phải bằng trường trong config.json.

## Cron

Tác vụ theo lịch kích hoạt hành động agent.

```jsonc
"cron": [
  {
    "schedule": "0 9 * * *",
    "agent_id": "assistant",
    "message": "Good morning! Summarize today's agenda.",
    "channel": "telegram",
    "target": "123456789"
  }
],
"cron_config": {
  "max_retries": 3,
  "retry_base_delay": "2s",
  "retry_max_delay": "30s",
  "default_timezone": "America/New_York"
}
```

**Các trường cron_config:**

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `max_retries` | int | `3` | Số lần thử lại khi thất bại |
| `retry_base_delay` | string | `"2s"` | Độ trễ backoff ban đầu |
| `retry_max_delay` | string | `"30s"` | Độ trễ backoff tối đa |
| `default_timezone` | string | — | Múi giờ IANA cho biểu thức cron (ví dụ: `"America/New_York"`) |

## Bindings

Định tuyến các kênh/peer cụ thể đến các agent cụ thể.

```jsonc
"bindings": [
  {
    "agentId": "code-helper",
    "match": {
      "channel": "telegram",
      "accountId": "",
      "peer": { "kind": "direct", "id": "123456789" }
    }
  },
  {
    "agentId": "support-bot",
    "match": {
      "channel": "discord",
      "guildId": "987654321"
    }
  }
]
```

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `agentId` | string | ID agent đích từ `agents.list` |
| `match.channel` | string | Tên kênh: `"telegram"`, `"discord"`, `"slack"`, v.v. |
| `match.accountId` | string | ID tài khoản/bot cụ thể (cho cài đặt đa tài khoản) |
| `match.peer.kind` | string | `"direct"` (DM) hoặc `"group"` |
| `match.peer.id` | string | ID người dùng hoặc ID nhóm/chat |
| `match.guildId` | string | ID server Discord |

## Telemetry

Xuất OpenTelemetry cho traces và metrics.

```jsonc
"telemetry": {
  "enabled": false,
  "endpoint": "http://otel-collector:4317",
  "protocol": "grpc",
  "insecure": false,
  "service_name": "goclaw-gateway",
  "headers": {
    "x-api-key": "env:OTEL_API_KEY"
  }
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `enabled` | bool | `false` | Bật xuất OTLP |
| `endpoint` | string | — | Endpoint collector OTLP |
| `protocol` | string | `"grpc"` | `"grpc"` hoặc `"http"` |
| `insecure` | bool | `false` | Bỏ qua xác minh TLS |
| `service_name` | string | `"goclaw-gateway"` | Tên dịch vụ trong traces |
| `headers` | map | — | Headers bổ sung (hỗ trợ tiền tố `env:`) |

## Tailscale

Expose GoClaw trên mạng Tailscale bằng tsnet.

```jsonc
"tailscale": {
  "hostname": "goclaw",
  "state_dir": "./data/tailscale",
  "ephemeral": false,
  "enable_tls": true
}
```

> **Lưu ý:** Auth key phải được đặt qua biến môi trường `GOCLAW_TSNET_AUTH_KEY` — không thể đặt trong config.json.

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|---------|-------|
| `hostname` | string | — | Hostname trên Tailnet của bạn |
| `state_dir` | string | — | Thư mục lưu trữ trạng thái Tailscale |
| `ephemeral` | bool | `false` | Đăng ký như node tạm thời (bị xóa khi ngắt kết nối) |
| `enable_tls` | bool | `false` | Bật HTTPS tự động qua Tailscale |

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|----------|
| Không tải được cấu hình | Kiểm tra đường dẫn `GOCLAW_CONFIG`; đảm bảo cú pháp JSON5 hợp lệ |
| Hot reload không hoạt động | Xác minh file đã được lưu; kiểm tra hỗ trợ fsnotify trên hệ điều hành của bạn |
| Không tìm thấy API key | Đảm bảo biến môi trường đã được export trong phiên shell hiện tại |
| Lỗi hạn mức | Kiểm tra cài đặt `gateway.quota`; xác minh `owner_ids` để bỏ qua |
| Sandbox không khởi động | Đảm bảo Docker đang chạy; xác minh tên image trong `sandbox.image` |
| Máy chủ MCP không kết nối được | Kiểm tra loại `transport`, `command`/`url` và log máy chủ |

## Tiếp theo

- [Web Dashboard Tour](#dashboard-tour) — Cấu hình trực quan thay vì chỉnh sửa JSON
- [Agents Explained](#agents-explained) — Tìm hiểu sâu về cấu hình agent
- [Tools Overview](#tools-overview) — Các tool có sẵn và danh mục

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
