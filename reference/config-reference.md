# Config Reference

> Full `config.json` schema — every field, type, and default value.

## Overview

GoClaw uses a JSON5 config file (supports comments, trailing commas). The file path resolves as:

1. `--config <path>` CLI flag
2. `$GOCLAW_CONFIG` environment variable
3. `config.json` in the working directory (default)

**Secrets are never stored in `config.json`.** API keys, tokens, and the database DSN go in `.env.local` (or environment variables). The `onboard` wizard generates both files automatically.

---

## Top-level Structure

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

Agent defaults and per-agent overrides.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `workspace` | string | `~/.goclaw/workspace` | Absolute or `~`-relative workspace path |
| `restrict_to_workspace` | boolean | `true` | Prevent file tools from escaping workspace |
| `provider` | string | `anthropic` | Default LLM provider name |
| `model` | string | `claude-sonnet-4-5-20250929` | Default model ID |
| `max_tokens` | integer | `8192` | Max output tokens per LLM call |
| `temperature` | float | `0.7` | Sampling temperature |
| `max_tool_iterations` | integer | `20` | Max tool call rounds per run |
| `max_tool_calls` | integer | `25` | Max total tool calls per run (0 = unlimited) |
| `context_window` | integer | `200000` | Model context window in tokens |
| `agent_type` | string | `open` | `"open"` (per-user context) or `"predefined"` (shared) |
| `bootstrapMaxChars` | integer | `20000` | Max chars per bootstrap file before truncation |
| `bootstrapTotalMaxChars` | integer | `24000` | Total char budget across all bootstrap files |
| `subagents` | object | see below | Subagent concurrency limits |
| `sandbox` | object | `null` | Docker sandbox config (see Sandbox) |
| `memory` | object | `null` | Memory system config (see Memory) |
| `compaction` | object | `null` | Session compaction config (see Compaction) |
| `contextPruning` | object | auto | Context pruning config (see Context Pruning) |

### `agents.defaults.subagents`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxConcurrent` | integer | `20` | Max concurrent subagent sessions across the gateway |
| `maxSpawnDepth` | integer | `1` | Max nesting depth (1–5) |
| `maxChildrenPerAgent` | integer | `5` | Max subagents per parent (1–20) |
| `archiveAfterMinutes` | integer | `60` | Auto-archive idle subagent sessions |
| `model` | string | — | Model override for subagents |

### `agents.defaults.memory`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable memory (PostgreSQL-backed) |
| `embedding_provider` | string | auto | `"openai"`, `"gemini"`, `"openrouter"`, or `""` (auto-detect) |
| `embedding_model` | string | `text-embedding-3-small` | Embedding model ID |
| `embedding_api_base` | string | — | Custom embedding endpoint URL |
| `max_results` | integer | `6` | Max memory search results |
| `max_chunk_len` | integer | `1000` | Max chars per memory chunk |
| `vector_weight` | float | `0.7` | Hybrid search vector weight |
| `text_weight` | float | `0.3` | Hybrid search FTS weight |
| `min_score` | float | `0.35` | Minimum relevance score to return |

### `agents.defaults.compaction`

Compaction triggers when session history exceeds `maxHistoryShare` of the context window.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reserveTokensFloor` | integer | `20000` | Min tokens to reserve after compaction |
| `maxHistoryShare` | float | `0.75` | Trigger when history > this fraction of context window |
| `minMessages` | integer | `50` | Min messages before compaction can trigger |
| `keepLastMessages` | integer | `4` | Messages to keep after compaction |
| `memoryFlush` | object | — | Pre-compaction memory flush config |

### `agents.defaults.compaction.memoryFlush`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Flush memory before compaction |
| `softThresholdTokens` | integer | `4000` | Flush when within N tokens of compaction trigger |
| `prompt` | string | — | User prompt for the flush turn |
| `systemPrompt` | string | — | System prompt for the flush turn |

### `agents.defaults.contextPruning`

Auto-enabled when Anthropic is configured. Prunes old tool results to free context space.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `cache-ttl` (Anthropic) / `off` | `"off"` or `"cache-ttl"` |
| `keepLastAssistants` | integer | `3` | Protect last N assistant messages from pruning |
| `softTrimRatio` | float | `0.3` | Start soft trim at this fraction of context window |
| `hardClearRatio` | float | `0.5` | Start hard clear at this fraction |
| `minPrunableToolChars` | integer | `50000` | Min prunable tool chars before acting |
| `softTrim.maxChars` | integer | `4000` | Trim tool results longer than this |
| `softTrim.headChars` | integer | `1500` | Keep first N chars of trimmed results |
| `softTrim.tailChars` | integer | `1500` | Keep last N chars of trimmed results |
| `hardClear.enabled` | boolean | `true` | Replace old tool results with placeholder |
| `hardClear.placeholder` | string | `[Old tool result content cleared]` | Replacement text |

### `agents.defaults.sandbox`

Docker-based code sandbox. Requires Docker and building with sandbox support.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `off` | `"off"`, `"non-main"` (subagents only), `"all"` |
| `image` | string | `goclaw-sandbox:bookworm-slim` | Docker image |
| `workspace_access` | string | `rw` | `"none"`, `"ro"`, `"rw"` |
| `scope` | string | `session` | `"session"`, `"agent"`, `"shared"` |
| `memory_mb` | integer | `512` | Memory limit in MB |
| `cpus` | float | `1.0` | CPU limit |
| `timeout_sec` | integer | `300` | Exec timeout in seconds |
| `network_enabled` | boolean | `false` | Enable container network access |
| `read_only_root` | boolean | `true` | Read-only root filesystem |
| `setup_command` | string | — | Command run once after container creation |
| `user` | string | — | Container user (e.g. `"1000:1000"`, `"nobody"`) |
| `tmpfs_size_mb` | integer | `0` | tmpfs size in MB (0 = Docker default) |
| `max_output_bytes` | integer | `1048576` | Max exec output capture (1 MB default) |
| `idle_hours` | integer | `24` | Prune containers idle > N hours |
| `max_age_days` | integer | `7` | Prune containers older than N days |
| `prune_interval_min` | integer | `5` | Prune check interval in minutes |

### `agents.list`

Per-agent overrides. All fields are optional — zero values inherit from `defaults`.

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

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Human-readable name shown in UI |
| `provider` | string | LLM provider override |
| `model` | string | Model ID override |
| `max_tokens` | integer | Output token limit override |
| `temperature` | float | Temperature override |
| `max_tool_iterations` | integer | Tool iteration limit override |
| `context_window` | integer | Context window override |
| `max_tool_calls` | integer | Total tool call limit override |
| `agent_type` | string | `"open"` or `"predefined"` |
| `skills` | string[] | Skill allowlist (null = all, `[]` = none) |
| `workspace` | string | Workspace directory override |
| `default` | boolean | Mark as the default agent |
| `sandbox` | object | Per-agent sandbox override |
| `identity` | object | `{name, emoji}` persona config |

---

## `channels`

Messaging channel configuration.

### `channels.telegram`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Telegram channel |
| `token` | string | — | Bot token (keep in env) |
| `proxy` | string | — | HTTP proxy URL |
| `allow_from` | string[] | — | Allowlist of user IDs |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Require @bot mention in groups |
| `history_limit` | integer | `50` | Max pending group messages for context (0 = disabled) |
| `dm_stream` | boolean | `false` | Progressive streaming for DMs |
| `group_stream` | boolean | `false` | Progressive streaming for groups |
| `reaction_level` | string | `full` | `"off"`, `"minimal"`, `"full"` — status emoji reactions |
| `media_max_bytes` | integer | `20971520` | Max media download size (20 MB default) |
| `link_preview` | boolean | `true` | Enable URL previews |
| `stt_proxy_url` | string | — | Speech-to-text proxy URL for voice messages |
| `voice_agent_id` | string | — | Route voice messages to this agent |
| `groups` | object | — | Per-group overrides keyed by chat ID |

### `channels.discord`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Discord channel |
| `token` | string | — | Bot token (keep in env) |
| `dm_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Require @bot mention |
| `history_limit` | integer | `50` | Max pending messages for context |

### `channels.zalo`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Zalo OA channel |
| `token` | string | — | Zalo OA access token |
| `dm_policy` | string | `pairing` | `"pairing"`, `"open"`, `"disabled"` |

### `channels.feishu`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Feishu/Lark channel |
| `app_id` | string | — | App ID |
| `app_secret` | string | — | App secret (keep in env) |
| `domain` | string | `lark` | `"lark"` (international) or `"feishu"` (China) |
| `connection_mode` | string | `websocket` | `"websocket"` or `"webhook"` |
| `encrypt_key` | string | — | Event encryption key |
| `verification_token` | string | — | Event verification token |

### `channels.whatsapp`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable WhatsApp channel |
| `bridge_url` | string | — | WhatsApp bridge service URL |

### `channels.slack`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Slack channel |
| `bot_token` | string | — | Bot User OAuth Token (`xoxb-...`) |
| `app_token` | string | — | App-Level Token for Socket Mode (`xapp-...`) |
| `user_token` | string | — | Optional User OAuth Token (`xoxp-...`) for custom bot identity |
| `allow_from` | string[] | — | Allowlist of user IDs |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"pairing"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Require @bot mention in channels |
| `history_limit` | integer | `50` | Max pending messages for context (0 = disabled) |
| `dm_stream` | boolean | `false` | Progressive streaming for DMs |
| `group_stream` | boolean | `false` | Progressive streaming for groups |
| `native_stream` | boolean | `false` | Use Slack ChatStreamer API if available |
| `reaction_level` | string | `off` | `"off"`, `"minimal"`, `"full"` — status emoji reactions |
| `block_reply` | boolean | — | Override gateway `block_reply` (unset = inherit) |
| `debounce_delay` | integer | `300` | Ms delay before dispatching rapid messages (0 = disabled) |
| `thread_ttl` | integer | `24` | Hours before thread participation expires (0 = always require @mention) |
| `media_max_bytes` | integer | `20971520` | Max file download size (20 MB default) |

### `channels.zalo_personal`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Zalo Personal channel |
| `allow_from` | string[] | — | Allowlist of user IDs |
| `dm_policy` | string | `pairing` | `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `open` | `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | boolean | `true` | Require @bot mention in groups |
| `history_limit` | integer | `50` | Max pending group messages for context (0 = disabled) |
| `credentials_path` | string | — | Path to saved session cookies JSON |
| `block_reply` | boolean | — | Override gateway `block_reply` (unset = inherit) |

### `channels.pending_compaction`

When a group accumulates more pending messages than `threshold`, older messages are summarized by an LLM before being sent to the agent, keeping `keep_recent` raw messages at the end.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `threshold` | integer | `50` | Trigger compaction when pending message count exceeds this |
| `keep_recent` | integer | `15` | Number of recent raw messages to keep after compaction |
| `max_tokens` | integer | `4096` | Max output tokens for the LLM summarization call |
| `provider` | string | — | LLM provider for summarization (empty = use agent's provider) |
| `model` | string | — | Model for summarization (empty = use agent's model) |

---

## `gateway`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `host` | string | `0.0.0.0` | Listen host |
| `port` | integer | `18790` | Listen port |
| `token` | string | — | Bearer token for auth (keep in env) |
| `owner_ids` | string[] | — | User IDs with admin/owner access |
| `allowed_origins` | string[] | `[]` | Allowed WebSocket CORS origins (empty = allow all) |
| `max_message_chars` | integer | `32000` | Max incoming message length |
| `inbound_debounce_ms` | integer | `1000` | Merge rapid consecutive messages (ms) |
| `rate_limit_rpm` | integer | `20` | WebSocket rate limit (requests per minute) |
| `injection_action` | string | `warn` | `"off"`, `"log"`, `"warn"`, `"block"` — prompt injection response |
| `block_reply` | boolean | `false` | Deliver intermediate text to users during tool iterations |
| `tool_status` | boolean | `true` | Show tool name in streaming preview during tool execution |
| `task_recovery_interval_sec` | integer | `300` | Team task recovery check interval |
| `quota` | object | — | Per-user request quota config |

---

## `tools`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profile` | string | — | Tool profile preset: `"minimal"`, `"coding"`, `"messaging"`, `"full"` |
| `allow` | string[] | — | Explicit tool allowlist (tool names or `"group:xxx"`) |
| `deny` | string[] | — | Explicit tool denylist |
| `alsoAllow` | string[] | — | Additive allowlist — merged with profile without removing existing tools |
| `byProvider` | object | — | Per-provider tool policy overrides (keyed by provider name) |
| `rate_limit_per_hour` | integer | `150` | Max tool calls per session per hour |
| `scrub_credentials` | boolean | `true` | Scrub secrets from tool outputs |

### `tools.web`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `web.brave.enabled` | boolean | `false` | Enable Brave Search |
| `web.brave.api_key` | string | — | Brave Search API key |
| `web.duckduckgo.enabled` | boolean | `true` | Enable DuckDuckGo fallback |
| `web.duckduckgo.max_results` | integer | `5` | Max search results |

### `tools.web_fetch`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `policy` | string | — | `"allow"` or `"block"` default policy |
| `allowed_domains` | string[] | — | Domains always allowed |
| `blocked_domains` | string[] | — | Domains always blocked (SSRF protection) |

### `tools.browser`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable browser automation tool |
| `headless` | boolean | `true` | Run browser in headless mode |
| `remote_url` | string | — | Connect to remote browser (Chrome DevTools Protocol URL) |

### `tools.exec_approval`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `security` | string | `full` | `"full"` (deny-list active), `"none"` |
| `ask` | string | `off` | `"off"`, `"always"`, `"risky"` — when to request user approval |
| `allowlist` | string[] | — | Additional safe commands to whitelist |

### `tools.mcp_servers`

Array of MCP server configs. Each entry:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique server name |
| `transport` | string | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | Stdio: command to spawn |
| `args` | string[] | Stdio: command arguments |
| `url` | string | SSE/HTTP: server URL |
| `headers` | object | SSE/HTTP: extra HTTP headers |
| `env` | object | Stdio: extra environment variables |
| `tool_prefix` | string | Optional prefix for tool names |
| `timeout_sec` | integer | Request timeout (default 60) |
| `enabled` | boolean | Enable/disable the server |

---

## `sessions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | string | `per-sender` | Session scope: `"per-sender"` (each user gets their own session) or `"global"` (all users share one session) |
| `dm_scope` | string | `per-channel-peer` | DM session isolation: `"main"`, `"per-peer"`, `"per-channel-peer"`, `"per-account-channel-peer"` |
| `main_key` | string | `main` | Main session key suffix (used when `dm_scope` is `"main"`) |

---

## `tts`

Text-to-speech output. Configure a provider and optionally enable auto-TTS.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | — | TTS provider: `"openai"`, `"elevenlabs"`, `"edge"`, `"minimax"` |
| `auto` | string | `off` | When to auto-speak: `"off"`, `"always"`, `"inbound"` (only reply to voice), `"tagged"` |
| `mode` | string | `final` | Which responses to speak: `"final"` (complete reply only) or `"all"` (each streamed chunk) |
| `max_length` | integer | `1500` | Max text length before truncation |
| `timeout_ms` | integer | `30000` | TTS API timeout in milliseconds |

### `tts.openai`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `api_key` | string | — | OpenAI API key (keep in env: `GOCLAW_TTS_OPENAI_API_KEY`) |
| `api_base` | string | — | Custom endpoint URL |
| `model` | string | `gpt-4o-mini-tts` | TTS model |
| `voice` | string | `alloy` | Voice name |

### `tts.elevenlabs`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `api_key` | string | — | ElevenLabs API key (keep in env: `GOCLAW_TTS_ELEVENLABS_API_KEY`) |
| `base_url` | string | — | Custom base URL |
| `voice_id` | string | `pMsXgVXv3BLzUgSXRplE` | Voice ID |
| `model_id` | string | `eleven_multilingual_v2` | Model ID |

### `tts.edge`

Microsoft Edge TTS — free, no API key required.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable Edge TTS provider |
| `voice` | string | `en-US-MichelleNeural` | Voice name (SSML-compatible) |
| `rate` | string | `+0%` | Speech rate adjustment (e.g. `"+10%"`, `"-5%"`) |

### `tts.minimax`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `api_key` | string | — | MiniMax API key (keep in env: `GOCLAW_TTS_MINIMAX_API_KEY`) |
| `group_id` | string | — | MiniMax GroupId (required; keep in env: `GOCLAW_TTS_MINIMAX_GROUP_ID`) |
| `api_base` | string | `https://api.minimax.io/v1` | API base URL |
| `model` | string | `speech-02-hd` | TTS model |
| `voice_id` | string | `Wise_Woman` | Voice ID |

---

## `cron`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_retries` | integer | `3` | Max retry attempts on job failure (0 = no retry) |
| `retry_base_delay` | string | `2s` | Initial retry backoff (Go duration, e.g. `"2s"`) |
| `retry_max_delay` | string | `30s` | Maximum retry backoff |
| `default_timezone` | string | — | IANA timezone for cron expressions when not set per-job (e.g. `"Asia/Ho_Chi_Minh"`, `"America/New_York"`) |

---

## `telemetry`

OpenTelemetry OTLP export. Requires build tag `otel` (`go build -tags otel`).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable OTLP export |
| `endpoint` | string | — | OTLP endpoint (e.g. `"localhost:4317"`) |
| `protocol` | string | `grpc` | `"grpc"` or `"http"` |
| `insecure` | boolean | `false` | Skip TLS verification (local dev) |
| `service_name` | string | `goclaw-gateway` | OTEL service name |
| `headers` | object | — | Extra headers (auth tokens for cloud backends) |

---

## `tailscale`

Tailscale tsnet listener. Requires build tag `tsnet` (`go build -tags tsnet`).

| Field | Type | Description |
|-------|------|-------------|
| `hostname` | string | Tailscale machine name (e.g. `"goclaw-gateway"`) |
| `state_dir` | string | Persistent state directory (default: `os.UserConfigDir/tsnet-goclaw`) |
| `ephemeral` | boolean | Remove Tailscale node on exit (default false) |
| `enable_tls` | boolean | Use `ListenTLS` for auto HTTPS certs |

> Auth key is never in config.json — set via `GOCLAW_TSNET_AUTH_KEY` env var only.

---

## `bindings`

Route specific channels/users to a specific agent. Each entry:

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

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Target agent ID |
| `match.channel` | string | Channel name: `"telegram"`, `"discord"`, `"slack"`, etc. |
| `match.accountId` | string | Bot account ID (optional) |
| `match.peer.kind` | string | `"direct"` or `"group"` |
| `match.peer.id` | string | Chat or group ID |
| `match.guildId` | string | Discord guild ID (optional) |

---

## Minimal Working Example

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

Secrets (`GOCLAW_GATEWAY_TOKEN`, `GOCLAW_OPENROUTER_API_KEY`, `GOCLAW_POSTGRES_DSN`) go in `.env.local`.

---

## What's Next

- [Environment Variables](#env-vars) — full env var reference
- [CLI Commands](#cli-commands) — `goclaw onboard` to generate this file interactively
- [Database Schema](#database-schema) — how agents and providers are stored in PostgreSQL

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
