> Bản dịch từ [English version](/config-reference)

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
| `maxHistoryShare` | float | `0.85` | Trigger khi history > tỷ lệ này của context window |
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

### `agents.defaults` — Evolution

Cài đặt evolution của agent lưu trong trường `other_config` JSONB (đặt qua dashboard) thay vì `config.json`. Ghi lại ở đây để tham khảo.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `self_evolve` | boolean | `false` | Cho phép agent tự viết lại `SOUL.md` của mình (style/tone evolution). Chỉ hoạt động với agent `predefined` có quyền ghi context files cấp agent |
| `skill_evolve` | boolean | `false` | Bật tool `skill_manage` — agent có thể tạo, patch và xóa skill trong các run |
| `skill_nudge_interval` | integer | `15` | Số tool call tối thiểu trước khi skill nudge prompt kích hoạt (0 = tắt). Khuyến khích tạo skill sau các run phức tạp |

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
| `draft_transport` | boolean | `true` | Dùng draft message API cho DM streaming (preview ẩn, không gửi thông báo mỗi lần sửa) |
| `reasoning_stream` | boolean | `true` | Hiển thị extended thinking thành message riêng khi provider emit thinking event |
| `reaction_level` | string | `full` | `"off"`, `"minimal"`, `"full"` — emoji reaction status |
| `media_max_bytes` | integer | `20971520` | Max kích thước tải media (mặc định 20 MB) |
| `link_preview` | boolean | `true` | Bật URL preview |
| `force_ipv4` | boolean | `false` | Buộc dùng IPv4 cho tất cả Telegram API request (dùng khi routing IPv6 bị lỗi) |
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

### `channels.slack`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Slack channel |
| `bot_token` | string | — | Bot User OAuth Token (`xoxb-...`) |
| `app_token` | string | — | App-Level Token cho Socket Mode (`xapp-...`) |
| `user_token` | string | — | User OAuth Token tùy chọn (`xoxp-...`) cho custom bot identity |
| `allow_from` | string[] | — | Allowlist user ID |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"pairing"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Yêu cầu @bot mention trong channel |
| `history_limit` | integer | `50` | Max message đang chờ cho context (0 = tắt) |
| `dm_stream` | boolean | `false` | Progressive streaming cho DM |
| `group_stream` | boolean | `false` | Progressive streaming cho group |
| `native_stream` | boolean | `false` | Dùng Slack ChatStreamer API nếu có |
| `reaction_level` | string | `off` | `"off"`, `"minimal"`, `"full"` — emoji reaction status |
| `block_reply` | boolean | — | Override gateway `block_reply` (không đặt = kế thừa) |
| `debounce_delay` | integer | `300` | Thời gian chờ (ms) trước khi xử lý tin nhắn nhanh liên tiếp (0 = tắt) |
| `thread_ttl` | integer | `24` | Số giờ trước khi thread participation hết hạn (0 = luôn yêu cầu @mention) |
| `media_max_bytes` | integer | `20971520` | Max kích thước tải file (mặc định 20 MB) |

### `channels.zalo_personal`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Zalo Personal channel |
| `allow_from` | string[] | — | Allowlist user ID |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Yêu cầu @bot mention trong group |
| `history_limit` | integer | `50` | Max group message đang chờ cho context (0 = tắt) |
| `credentials_path` | string | — | Đường dẫn đến file JSON cookies đã lưu |
| `block_reply` | boolean | — | Override gateway `block_reply` (không đặt = kế thừa) |

### `channels.pending_compaction`

Khi group tích lũy nhiều hơn `threshold` tin nhắn đang chờ, các tin nhắn cũ sẽ được LLM tóm tắt trước khi gửi đến agent, giữ lại `keep_recent` tin nhắn gần nhất ở dạng nguyên bản.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `threshold` | integer | `50` | Kích hoạt compaction khi số tin nhắn đang chờ vượt ngưỡng này |
| `keep_recent` | integer | `15` | Số tin nhắn gần nhất giữ nguyên sau compaction |
| `max_tokens` | integer | `4096` | Max output token cho LLM khi tóm tắt |
| `provider` | string | — | LLM provider cho tóm tắt (trống = dùng provider của agent) |
| `model` | string | — | Model cho tóm tắt (trống = dùng model của agent) |

---

## `gateway`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `host` | string | `0.0.0.0` | Listen host |
| `port` | integer | `18790` | Listen port |
| `token` | string | — | Bearer token để auth (để trong env) |
| `owner_ids` | string[] | — | User ID có quyền admin/owner |
| `allowed_origins` | string[] | `[]` | Các origin WebSocket CORS được phép (trống = cho phép tất cả) |
| `max_message_chars` | integer | `32000` | Độ dài tin nhắn đến tối đa |
| `inbound_debounce_ms` | integer | `1000` | Gộp các tin nhắn nhanh liên tiếp (ms) |
| `rate_limit_rpm` | integer | `20` | WebSocket rate limit (requests mỗi phút) |
| `injection_action` | string | `warn` | `"off"`, `"log"`, `"warn"`, `"block"` — phản hồi prompt injection |
| `block_reply` | boolean | `false` | Gửi text trung gian cho user trong quá trình tool đang chạy |
| `tool_status` | boolean | `true` | Hiển thị tên tool trong streaming preview khi tool đang thực thi |
| `task_recovery_interval_sec` | integer | `300` | Khoảng thời gian kiểm tra recovery team task |
| `quota` | object | — | Cấu hình request quota mỗi user |

---

## `tools`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `profile` | string | — | Preset tool profile: `"minimal"`, `"coding"`, `"messaging"`, `"full"` |
| `allow` | string[] | — | Allowlist tool tường minh (tên tool hoặc `"group:xxx"`) |
| `deny` | string[] | — | Denylist tool tường minh |
| `alsoAllow` | string[] | — | Allowlist bổ sung — gộp với profile mà không xóa tool hiện có |
| `byProvider` | object | — | Override tool policy theo provider (key là tên provider) |
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
| `scope` | string | `per-sender` | Phạm vi session: `"per-sender"` (mỗi user có session riêng) hoặc `"global"` (tất cả user dùng chung một session) |
| `dm_scope` | string | `per-channel-peer` | Cô lập session DM: `"main"`, `"per-peer"`, `"per-channel-peer"`, `"per-account-channel-peer"` |
| `main_key` | string | `main` | Suffix key session chính (dùng khi `dm_scope` là `"main"`) |

### Concurrency queue per-session

Mỗi session chạy qua một per-session queue. Trường `max_concurrent` kiểm soát số agent run có thể chạy đồng thời cho một session (DM hoặc group). Được cấu hình per-agent-link trong DB (qua dashboard) thay vì `config.json`, nhưng giá trị mặc định của `QueueConfig` là:

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `max_concurrent` | integer | `1` | Số run đồng thời tối đa trong session queue (1 = tuần tự, không overlap). Group thường nên xử lý tuần tự; DM có thể đặt cao hơn cho interactive workload |

---

## `tts`

Cấu hình text-to-speech. Chọn provider và tùy chọn bật auto-TTS.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `provider` | string | — | TTS provider: `"openai"`, `"elevenlabs"`, `"edge"`, `"minimax"` |
| `auto` | string | `off` | Khi nào tự phát âm: `"off"`, `"always"`, `"inbound"` (chỉ khi nhận voice), `"tagged"` |
| `mode` | string | `final` | Phát âm phần nào: `"final"` (chỉ reply hoàn chỉnh) hoặc `"all"` (mỗi chunk stream) |
| `max_length` | integer | `1500` | Độ dài text tối đa trước khi cắt |
| `timeout_ms` | integer | `30000` | Timeout TTS API (milliseconds) |

### `tts.openai`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `api_key` | string | — | OpenAI API key (để trong env: `GOCLAW_TTS_OPENAI_API_KEY`) |
| `api_base` | string | — | URL endpoint tùy chỉnh |
| `model` | string | `gpt-4o-mini-tts` | TTS model |
| `voice` | string | `alloy` | Tên giọng đọc |

### `tts.elevenlabs`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `api_key` | string | — | ElevenLabs API key (để trong env: `GOCLAW_TTS_ELEVENLABS_API_KEY`) |
| `base_url` | string | — | Base URL tùy chỉnh |
| `voice_id` | string | `pMsXgVXv3BLzUgSXRplE` | Voice ID |
| `model_id` | string | `eleven_multilingual_v2` | Model ID |

### `tts.edge`

Microsoft Edge TTS — miễn phí, không cần API key.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `enabled` | boolean | `false` | Bật Edge TTS provider |
| `voice` | string | `en-US-MichelleNeural` | Tên giọng đọc (tương thích SSML) |
| `rate` | string | `+0%` | Điều chỉnh tốc độ nói (ví dụ `"+10%"`, `"-5%"`) |

### `tts.minimax`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `api_key` | string | — | MiniMax API key (để trong env: `GOCLAW_TTS_MINIMAX_API_KEY`) |
| `group_id` | string | — | MiniMax GroupId (bắt buộc; để trong env: `GOCLAW_TTS_MINIMAX_GROUP_ID`) |
| `api_base` | string | `https://api.minimax.io/v1` | Base URL API |
| `model` | string | `speech-02-hd` | TTS model |
| `voice_id` | string | `Wise_Woman` | Voice ID |

---

## `cron`

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `max_retries` | integer | `3` | Số lần retry tối đa khi job lỗi (0 = không retry) |
| `retry_base_delay` | string | `2s` | Backoff retry ban đầu (Go duration, ví dụ `"2s"`) |
| `retry_max_delay` | string | `30s` | Backoff retry tối đa |
| `default_timezone` | string | — | Múi giờ IANA mặc định cho cron expression khi không đặt per-job (ví dụ `"Asia/Ho_Chi_Minh"`, `"America/New_York"`) |

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

## Cài đặt Team (JSONB)

Cài đặt team lưu trong `agent_teams.settings` JSONB và được cấu hình qua dashboard, không phải `config.json`. Các field chính:

### `blocker_escalation`

Kiểm soát xem comment `"blocker"` trên team task có kích hoạt tự động fail và escalation lên lead không.

```json
{
  "blocker_escalation": {
    "enabled": true
  }
}
```

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `blocker_escalation.enabled` | boolean | `true` | Khi true, task comment có `comment_type = "blocker"` tự động fail task và escalate lên team lead |

### `escalation_mode`

Kiểm soát cách gửi thông báo escalation lên team lead.

| Field | Type | Mặc định | Mô tả |
|-------|------|----------|-------|
| `escalation_mode` | string | — | Chế độ gửi event escalation: `"notify"` (đăng vào session của lead) hoặc `""` (im lặng) |
| `escalation_actions` | string[] | — | Hành động thêm khi escalation (ví dụ `["notify"]`) |

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

- [Environment Variables](/env-vars) — tham chiếu đầy đủ biến môi trường
- [CLI Commands](/cli-commands) — `goclaw onboard` để tạo file này tự động
- [Database Schema](/database-schema) — agents và providers lưu trong PostgreSQL như thế nào

<!-- goclaw-source: 6551c2d1 | cập nhật: 2026-03-27 -->
