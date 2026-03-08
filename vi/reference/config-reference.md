> Bản dịch từ [English version](../../reference/config-reference.md)

# Config Reference

> Schema đầy đủ của `config.json` — mọi field, type, và giá trị mặc định.

## Tổng quan

GoClaw dùng file config JSON5 (hỗ trợ comments, trailing commas). Đường dẫn file được resolve theo thứ tự:

1. Flag CLI `--config <path>`
2. Biến môi trường `$GOCLAW_CONFIG`
3. `config.json` trong thư mục hiện tại (mặc định)

**Secrets không bao giờ lưu trong `config.json`.** API key, token, và database DSN đặt trong `.env.local` (hoặc biến môi trường). Wizard `onboard` tự động tạo cả hai file.

---

## Cấu trúc top-level

```json
{
  "agents":    { ... },
  "channels":  { ... },
  "providers": { ... },
  "gateway":   { ... },
  "tools":     { ... },
  "sessions":  { ... },
  "database":  { ... },
  "tts":       { ... },
  "cron":      { ... },
  "telemetry": { ... },
  "tailscale": { ... },
  "bindings":  [ ... ]
}
```

---

## `agents`

Agent defaults và per-agent overrides.

```json
{
  "agents": {
    "defaults": { ... },
    "list": {
      "researcher": { ... }
    }
  }
}
```

### `agents.defaults`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `workspace` | string | `~/.goclaw/workspace` | Đường dẫn workspace tuyệt đối hoặc có `~` |
| `restrict_to_workspace` | boolean | `true` | Ngăn file tool thoát khỏi workspace |
| `provider` | string | `anthropic` | Tên LLM provider mặc định |
| `model` | string | `claude-sonnet-4-5-20250929` | Model ID mặc định |
| `max_tokens` | integer | `8192` | Token output tối đa mỗi LLM call |
| `temperature` | float | `0.7` | Sampling temperature |
| `max_tool_iterations` | integer | `20` | Số vòng tool call tối đa mỗi run |
| `max_tool_calls` | integer | `25` | Tổng tool call tối đa mỗi run (0 = không giới hạn) |
| `context_window` | integer | `200000` | Context window của model (tokens) |
| `agent_type` | string | `open` | `"open"` (context per-user) hoặc `"predefined"` (chia sẻ) |
| `bootstrapMaxChars` | integer | `20000` | Max chars mỗi bootstrap file trước khi cắt |
| `bootstrapTotalMaxChars` | integer | `24000` | Tổng char budget cho toàn bộ bootstrap files |
| `subagents` | object | xem bên dưới | Giới hạn concurrency subagent |
| `sandbox` | object | `null` | Cấu hình Docker sandbox (xem Sandbox) |
| `memory` | object | `null` | Cấu hình memory system (xem Memory) |
| `compaction` | object | `null` | Cấu hình session compaction (xem Compaction) |
| `contextPruning` | object | auto | Cấu hình context pruning (xem Context Pruning) |

### `agents.defaults.subagents`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `maxConcurrent` | integer | `20` | Max concurrent subagent session trên toàn gateway |
| `maxSpawnDepth` | integer | `1` | Độ sâu lồng nhau tối đa (1–5) |
| `maxChildrenPerAgent` | integer | `5` | Max subagent mỗi parent (1–20) |
| `archiveAfterMinutes` | integer | `60` | Tự archive subagent session nhàn rỗi |
| `model` | string | — | Override model cho subagents |

### `agents.defaults.memory`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `true` | Bật memory (PostgreSQL-backed) |
| `embedding_provider` | string | auto | `"openai"`, `"gemini"`, `"openrouter"`, hoặc `""` (auto-detect) |
| `embedding_model` | string | `text-embedding-3-small` | Embedding model ID |
| `embedding_api_base` | string | — | URL endpoint embedding tùy chỉnh |
| `max_results` | integer | `6` | Max kết quả memory search |
| `max_chunk_len` | integer | `1000` | Max chars mỗi memory chunk |
| `vector_weight` | float | `0.7` | Vector weight trong hybrid search |
| `text_weight` | float | `0.3` | FTS weight trong hybrid search |
| `min_score` | float | `0.35` | Điểm relevance tối thiểu để trả về |

### `agents.defaults.compaction`

Compaction kích hoạt khi lịch sử session vượt `maxHistoryShare` của context window.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `reserveTokensFloor` | integer | `20000` | Min tokens giữ lại sau compaction |
| `maxHistoryShare` | float | `0.75` | Trigger khi history > tỷ lệ này của context window |
| `minMessages` | integer | `50` | Min messages trước khi compaction có thể kích hoạt |
| `keepLastMessages` | integer | `4` | Messages giữ lại sau compaction |
| `memoryFlush` | object | — | Cấu hình memory flush trước compaction |

### `agents.defaults.compaction.memoryFlush`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `true` | Flush memory trước compaction |
| `softThresholdTokens` | integer | `4000` | Flush khi còn trong N tokens của compaction trigger |
| `prompt` | string | — | User prompt cho flush turn |
| `systemPrompt` | string | — | System prompt cho flush turn |

### `agents.defaults.contextPruning`

Tự bật khi Anthropic được cấu hình. Cắt bỏ tool result cũ để giải phóng context space.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `mode` | string | `cache-ttl` (Anthropic) / `off` | `"off"` hoặc `"cache-ttl"` |
| `keepLastAssistants` | integer | `3` | Bảo vệ N assistant message cuối khỏi bị prune |
| `softTrimRatio` | float | `0.3` | Bắt đầu soft trim ở tỷ lệ này của context window |
| `hardClearRatio` | float | `0.5` | Bắt đầu hard clear ở tỷ lệ này |
| `minPrunableToolChars` | integer | `50000` | Min prunable tool chars trước khi hành động |
| `softTrim.maxChars` | integer | `4000` | Cắt tool result dài hơn ngưỡng này |
| `softTrim.headChars` | integer | `1500` | Giữ N chars đầu của kết quả đã cắt |
| `softTrim.tailChars` | integer | `1500` | Giữ N chars cuối của kết quả đã cắt |
| `hardClear.enabled` | boolean | `true` | Thay thế tool result cũ bằng placeholder |
| `hardClear.placeholder` | string | `[Old tool result content cleared]` | Text thay thế |

### `agents.defaults.sandbox`

Code sandbox dựa trên Docker. Cần Docker và build với sandbox support.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `mode` | string | `off` | `"off"`, `"non-main"` (chỉ subagents), `"all"` |
| `image` | string | `goclaw-sandbox:bookworm-slim` | Docker image |
| `workspace_access` | string | `rw` | `"none"`, `"ro"`, `"rw"` |
| `scope` | string | `session` | `"session"`, `"agent"`, `"shared"` |
| `memory_mb` | integer | `512` | Giới hạn memory (MB) |
| `cpus` | float | `1.0` | Giới hạn CPU |
| `timeout_sec` | integer | `300` | Timeout thực thi (giây) |
| `network_enabled` | boolean | `false` | Bật truy cập mạng container |
| `read_only_root` | boolean | `true` | Root filesystem chỉ đọc |
| `setup_command` | string | — | Lệnh chạy một lần sau khi tạo container |
| `user` | string | — | Container user (ví dụ `"1000:1000"`, `"nobody"`) |
| `tmpfs_size_mb` | integer | `0` | Kích thước tmpfs (MB) (0 = mặc định Docker) |
| `max_output_bytes` | integer | `1048576` | Max output capture (mặc định 1 MB) |
| `idle_hours` | integer | `24` | Prune container nhàn rỗi > N giờ |
| `max_age_days` | integer | `7` | Prune container cũ hơn N ngày |
| `prune_interval_min` | integer | `5` | Khoảng kiểm tra prune (phút) |

### `agents.list`

Per-agent overrides. Tất cả field đều tùy chọn — giá trị zero kế thừa từ `defaults`.

```json
{
  "agents": {
    "list": {
      "researcher": {
        "displayName": "Research Assistant",
        "provider": "openrouter",
        "model": "anthropic/claude-opus-4",
        "max_tokens": 16000,
        "agent_type": "open",
        "workspace": "~/.goclaw/workspace-researcher",
        "default": false
      }
    }
  }
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `displayName` | string | Tên hiển thị trong UI |
| `provider` | string | Override LLM provider |
| `model` | string | Override model ID |
| `max_tokens` | integer | Override giới hạn token output |
| `temperature` | float | Override temperature |
| `max_tool_iterations` | integer | Override giới hạn tool iteration |
| `context_window` | integer | Override context window |
| `max_tool_calls` | integer | Override giới hạn tổng tool call |
| `agent_type` | string | `"open"` hoặc `"predefined"` |
| `skills` | string[] | Skill allowlist (null = tất cả, `[]` = không có) |
| `workspace` | string | Override thư mục workspace |
| `default` | boolean | Đánh dấu là agent mặc định |
| `sandbox` | object | Per-agent sandbox override |
| `identity` | object | Cấu hình persona `{name, emoji}` |

---

## `channels`

Cấu hình messaging channel.

### `channels.telegram`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Telegram channel |
| `token` | string | — | Bot token (để trong env) |
| `proxy` | string | — | HTTP proxy URL |
| `allow_from` | string[] | — | Allowlist user ID |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Yêu cầu @bot mention trong group |
| `history_limit` | integer | `50` | Max group message đang chờ cho context (0 = tắt) |
| `dm_stream` | boolean | `false` | Progressive streaming cho DM |
| `group_stream` | boolean | `false` | Progressive streaming cho group |
| `reaction_level` | string | `full` | `"off"`, `"minimal"`, `"full"` — emoji reaction status |
| `media_max_bytes` | integer | `20971520` | Max kích thước tải media (mặc định 20 MB) |
| `link_preview` | boolean | `true` | Bật URL preview |
| `stt_proxy_url` | string | — | URL proxy speech-to-text cho voice message |
| `voice_agent_id` | string | — | Route voice message đến agent này |
| `groups` | object | — | Per-group overrides theo chat ID |

### `channels.discord`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Discord channel |
| `token` | string | — | Bot token (để trong env) |
| `dm_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Yêu cầu @bot mention |
| `history_limit` | integer | `50` | Max message đang chờ cho context |

### `channels.zalo`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Zalo OA channel |
| `token` | string | — | Zalo OA access token |
| `dm_policy` | string | `pairing` | `"pairing"`, `"open"`, `"disabled"` |

### `channels.feishu`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Feishu/Lark channel |
| `app_id` | string | — | App ID |
| `app_secret` | string | — | App secret (để trong env) |
| `domain` | string | `lark` | `"lark"` (quốc tế) hoặc `"feishu"` (Trung Quốc) |
| `connection_mode` | string | `websocket` | `"websocket"` hoặc `"webhook"` |
| `encrypt_key` | string | — | Encryption key cho event |
| `verification_token` | string | — | Verification token cho event |

### `channels.whatsapp`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật WhatsApp channel |
| `bridge_url` | string | — | URL WhatsApp bridge service |

---

## `gateway`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `host` | string | `0.0.0.0` | Listen host |
| `port` | integer | `18790` | Listen port |
| `token` | string | — | Bearer token để auth (để trong env) |
| `owner_ids` | string[] | — | User ID có quyền admin/owner |
| `max_message_chars` | integer | `32000` | Độ dài tin nhắn đến tối đa |
| `rate_limit_rpm` | integer | `20` | WebSocket rate limit (requests mỗi phút) |
| `injection_action` | string | — | Hành động cho message bị inject |
| `quota` | object | — | Cấu hình request quota mỗi user |

---

## `tools`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `rate_limit_per_hour` | integer | `150` | Max tool call mỗi session mỗi giờ |
| `scrub_credentials` | boolean | `true` | Scrub secrets khỏi tool output |

### `tools.web`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `web.brave.enabled` | boolean | `false` | Bật Brave Search |
| `web.brave.api_key` | string | — | Brave Search API key |
| `web.duckduckgo.enabled` | boolean | `true` | Bật DuckDuckGo fallback |
| `web.duckduckgo.max_results` | integer | `5` | Max kết quả tìm kiếm |

### `tools.web_fetch`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `policy` | string | — | Default policy: `"allow"` hoặc `"block"` |
| `allowed_domains` | string[] | — | Domain luôn được phép |
| `blocked_domains` | string[] | — | Domain luôn bị chặn (bảo vệ SSRF) |

### `tools.browser`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `true` | Bật browser automation tool |
| `headless` | boolean | `true` | Chạy browser ở headless mode |
| `remote_url` | string | — | Kết nối remote browser (Chrome DevTools Protocol URL) |

### `tools.exec_approval`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `security` | string | `full` | `"full"` (deny-list hoạt động), `"none"` |
| `ask` | string | `off` | `"off"`, `"always"`, `"risky"` — khi nào yêu cầu user phê duyệt |
| `allowlist` | string[] | — | Lệnh an toàn bổ sung để whitelist |

### `tools.mcp_servers`

Mảng MCP server config. Mỗi entry:

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | string | Tên server duy nhất |
| `transport` | string | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | Stdio: lệnh để spawn |
| `args` | string[] | Stdio: tham số lệnh |
| `url` | string | SSE/HTTP: server URL |
| `headers` | object | SSE/HTTP: HTTP headers bổ sung |
| `env` | object | Stdio: biến môi trường bổ sung |
| `tool_prefix` | string | Prefix tùy chọn cho tên tool |
| `timeout_sec` | integer | Request timeout (mặc định 60) |
| `enabled` | boolean | Bật/tắt server |

---

## `sessions`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `storage` | string | `~/.goclaw/sessions` | Đường dẫn lưu session (legacy, không dùng ở PostgreSQL mode) |

---

## `cron`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `max_retries` | integer | `3` | Số lần retry tối đa khi job lỗi (0 = không retry) |
| `retry_base_delay` | string | `2s` | Backoff retry ban đầu (Go duration, ví dụ `"2s"`) |
| `retry_max_delay` | string | `30s` | Backoff retry tối đa |

---

## `telemetry`

OpenTelemetry OTLP export. Cần build tag `otel` (`go build -tags otel`).

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật OTLP export |
| `endpoint` | string | — | OTLP endpoint (ví dụ `"localhost:4317"`) |
| `protocol` | string | `grpc` | `"grpc"` hoặc `"http"` |
| `insecure` | boolean | `false` | Bỏ qua TLS verification (local dev) |
| `service_name` | string | `goclaw-gateway` | OTEL service name |
| `headers` | object | — | Extra headers (auth token cho cloud backend) |

---

## `tailscale`

Tailscale tsnet listener. Cần build tag `tsnet` (`go build -tags tsnet`).

| Field | Type | Mô tả |
|-------|------|-------|
| `hostname` | string | Tên máy Tailscale (ví dụ `"goclaw-gateway"`) |
| `state_dir` | string | Thư mục state lâu dài (mặc định: `os.UserConfigDir/tsnet-goclaw`) |
| `ephemeral` | boolean | Xóa node Tailscale khi thoát (mặc định false) |
| `enable_tls` | boolean | Dùng `ListenTLS` cho auto HTTPS certs |

> Auth key không bao giờ trong config.json — chỉ đặt qua env var `GOCLAW_TSNET_AUTH_KEY`.

---

## `bindings`

Route channel/user cụ thể đến một agent cụ thể. Mỗi entry:

```json
{
  "bindings": [
    {
      "agentId": "researcher",
      "match": {
        "channel": "telegram",
        "peer": { "kind": "direct", "id": "123456789" }
      }
    }
  ]
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `agentId` | string | Target agent ID |
| `match.channel` | string | Tên channel: `"telegram"`, `"discord"`, `"slack"`, v.v. |
| `match.accountId` | string | Bot account ID (tùy chọn) |
| `match.peer.kind` | string | `"direct"` hoặc `"group"` |
| `match.peer.id` | string | Chat hoặc group ID |
| `match.guildId` | string | Discord guild ID (tùy chọn) |

---

## Ví dụ tối giản hoạt động được

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.goclaw/workspace",
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tool_iterations": 20
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "channels": {
    "telegram": { "enabled": true }
  }
}
```

Secrets (`GOCLAW_GATEWAY_TOKEN`, `GOCLAW_OPENROUTER_API_KEY`, `GOCLAW_POSTGRES_DSN`) đặt trong `.env.local`.

---

## Tiếp theo

- [Environment Variables](./environment-variables.md) — tham chiếu đầy đủ biến môi trường
- [CLI Commands](./cli-commands.md) — `goclaw onboard` để tạo file này tự động
- [Database Schema](./database-schema.md) — agents và providers lưu trong PostgreSQL như thế nào
