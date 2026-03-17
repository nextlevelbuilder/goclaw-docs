# Configuration

> How to configure GoClaw with config.json and environment variables.

## Overview

GoClaw uses two layers of configuration: a `config.json` file for structure and environment variables for secrets. The config file supports JSON5 (comments allowed) and hot-reloads on save.

## Config File Location

By default, GoClaw looks for `config.json` in the current directory. Override with:

```bash
export GOCLAW_CONFIG=/path/to/config.json
```

## Config Structure

Top-level sections at a glance:

```jsonc
{
  "gateway": { ... },      // HTTP/WS server settings, auth, quotas
  "agents": {              // Defaults + per-agent overrides
    "defaults": { ... },
    "list": { ... }
  },
  "memory": { ... },       // Semantic memory (embedding, retrieval)
  "compaction": { ... },   // Context compaction thresholds
  "context_pruning": { ... }, // Context pruning policy
  "subagents": { ... },    // Subagent concurrency limits
  "sandbox": { ... },      // Docker sandbox defaults
  "providers": { ... },    // LLM provider API keys
  "channels": { ... },     // Messaging channel integrations
  "tools": { ... },        // Tool policies, MCP servers
  "tts": { ... },          // Text-to-speech
  "sessions": { ... },     // Session storage & scoping
  "cron": [],              // Scheduled tasks
  "bindings": {},          // Agent routing by channel/peer
  "telemetry": { ... },    // OpenTelemetry export
  "tailscale": { ... }     // Tailscale/tsnet networking
}
```

**Important:** The `env:` prefix tells GoClaw to read the value from an environment variable instead of using a literal string.

- `"env:GOCLAW_OPENROUTER_API_KEY"` → reads `$GOCLAW_OPENROUTER_API_KEY`
- `"my-secret-key"` (no `env:`) → uses the literal string (**not recommended** for secrets)

Always use `env:` for sensitive values like API keys, tokens, and passwords.

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `GOCLAW_GATEWAY_TOKEN` | Bearer token for API/WebSocket auth |
| `GOCLAW_ENCRYPTION_KEY` | AES-256-GCM key for encrypting credentials in DB |
| `GOCLAW_POSTGRES_DSN` | PostgreSQL connection string |

### Provider API Keys

| Variable | Provider |
|----------|----------|
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

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `GOCLAW_CONFIG` | `./config.json` | Config file path |
| `GOCLAW_WORKSPACE` | `./workspace` | Agent workspace directory |
| `GOCLAW_DATA_DIR` | `./data` | Data directory |
| `GOCLAW_REDIS_DSN` | — | Redis DSN (if using Redis session storage) |
| `GOCLAW_TSNET_AUTH_KEY` | — | Tailscale auth key |
| `GOCLAW_TRACE_VERBOSE` | `0` | Set to `1` for debug LLM traces |

## Hot Reload

GoClaw watches `config.json` for changes using `fsnotify` with a 300ms debounce. Agents, channels, and provider credentials reload automatically.

**Exception:** Gateway settings (host, port) require a full restart.

## Gateway Configuration

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `host` | string | `"0.0.0.0"` | Bind address |
| `port` | int | `18790` | HTTP/WS port |
| `token` | string | — | Bearer token for WS/HTTP auth |
| `owner_ids` | []string | — | Sender IDs treated as "owner" (bypass quotas/limits) |
| `max_message_chars` | int | `32000` | Max inbound message length |
| `rate_limit_rpm` | int | `20` | Global rate limit (requests per minute) |
| `allowed_origins` | []string | — | WebSocket CORS whitelist; empty = allow all |
| `injection_action` | string | `"warn"` | Prompt-injection response: `"log"`, `"warn"`, `"block"`, `"off"` |
| `inbound_debounce_ms` | int | `1000` | Merge rapid messages within window; `-1` = disabled |
| `block_reply` | bool | `false` | If true, suppress intermediate text during tool iterations |
| `tool_status` | bool | `true` | Show tool name in streaming preview |
| `task_recovery_interval_sec` | int | `300` | How often (seconds) to check for and recover stalled team tasks |
| `quota` | object | — | Per-user/group request quotas (see below) |

**Quota fields** (`quota.default`, `quota.providers.*`, `quota.channels.*`, `quota.groups.*`):

| Field | Type | Description |
|-------|------|-------------|
| `hour` | int | Max requests per hour; `0` = unlimited |
| `day` | int | Max requests per day |
| `week` | int | Max requests per week |

## Agent Configuration

### Defaults

Settings in `agents.defaults` apply to all agents unless overridden.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | — | LLM provider ID |
| `model` | string | — | Model name |
| `max_tokens` | int | — | Max output tokens |
| `temperature` | float | `0.7` | Sampling temperature |
| `max_tool_iterations` | int | `20` | Max LLM→tool loops per request |
| `max_tool_calls` | int | `25` | Max total tool calls per request |
| `context_window` | int | — | Context window size in tokens |
| `agent_type` | string | `"open"` | `"open"` (per-session context: identity/soul/user files refresh each session) or `"predefined"` (persistent context: shared identity/soul files + per-user USER.md across sessions) |
| `workspace` | string | `"./workspace"` | Working directory for file ops |
| `restrict_to_workspace` | bool | `false` | Block file access outside workspace |
| `bootstrapMaxChars` | int | `20000` | Max chars for a single bootstrap doc |
| `bootstrapTotalMaxChars` | int | `24000` | Max total chars across all bootstrap docs |

> **Note:** `intent_classify` is not a config.json field. It is configured per-agent via the Dashboard (Agent settings → Behavior & UX section) and stored on the agent record in the database.

### Per-Agent Overrides

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

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Human-readable agent name shown in UI |
| `default` | bool | Mark as default agent for unmatched requests |
| `skills` | []string | Skill IDs to enable; `null` = all available |
| `tools` | object | Per-agent tool policy (see Tools section) |
| `workspace` | string | Override workspace path for this agent |
| `sandbox` | object | Override sandbox config for this agent |
| `identity` | object | `{ "name": "...", "emoji": "..." }` display identity |
| All defaults fields | — | Any `defaults` field can be overridden here |

## Memory

Semantic memory stores and retrieves conversation context using vector embeddings.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `true` | Enable semantic memory |
| `embedding_provider` | string | auto | `"openai"`, `"gemini"`, `"openrouter"`, or `""` (auto-detect) |
| `embedding_model` | string | `"text-embedding-3-small"` | Embedding model |
| `embedding_api_base` | string | — | Custom API base URL for embeddings |
| `max_results` | int | `6` | Max memory chunks retrieved per query |
| `max_chunk_len` | int | `1000` | Max characters per memory chunk |
| `vector_weight` | float | `0.7` | Weight for vector similarity score |
| `text_weight` | float | `0.3` | Weight for text (BM25) score |
| `min_score` | float | `0.35` | Minimum score threshold for retrieval |

## Compaction

Controls when and how GoClaw compacts long conversation histories to stay within context limits.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reserveTokensFloor` | int | `20000` | Minimum tokens always reserved for response |
| `maxHistoryShare` | float | `0.75` | Max fraction of context window used by history |
| `minMessages` | int | `50` | Don't compact until history has this many messages |
| `keepLastMessages` | int | `4` | Always keep the N most recent messages |
| `memoryFlush.enabled` | bool | `true` | Flush summarized content to memory on compaction |
| `memoryFlush.softThresholdTokens` | int | `4000` | Trigger flush when approaching this token count |
| `memoryFlush.prompt` | string | — | Custom user prompt for summarization |
| `memoryFlush.systemPrompt` | string | — | Custom system prompt for summarization |

## Context Pruning

Prunes old tool results from context when approaching limits.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `"off"` | `"off"` or `"cache-ttl"` (prune by age) |
| `keepLastAssistants` | int | `3` | Keep N most recent assistant turns intact |
| `softTrimRatio` | float | `0.3` | Start soft trim when context exceeds this ratio of context window |
| `hardClearRatio` | float | `0.5` | Start hard clear when context exceeds this ratio |
| `minPrunableToolChars` | int | `50000` | Minimum total tool chars before pruning activates |
| `softTrim.maxChars` | int | `4000` | Tool results longer than this are trimmed |
| `softTrim.headChars` | int | `1500` | Chars to keep from the start of a trimmed result |
| `softTrim.tailChars` | int | `1500` | Chars to keep from the end of a trimmed result |
| `hardClear.enabled` | bool | `true` | Enable hard clear of very old tool results |
| `hardClear.placeholder` | string | `"[Old tool result content cleared]"` | Text to replace cleared results |

## Subagents

Controls how agents can spawn child agents.

```jsonc
"subagents": {
  "maxConcurrent": 20,
  "maxSpawnDepth": 1,
  "maxChildrenPerAgent": 5,
  "archiveAfterMinutes": 60,
  "model": "anthropic/claude-haiku-4-5-20251001"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxConcurrent` | int | `20` | Max subagents running simultaneously (code fallback when no config.json: `8`) |
| `maxSpawnDepth` | int | `1` | Max nesting depth (1–5); `1` = only root can spawn |
| `maxChildrenPerAgent` | int | `5` | Max children per parent agent (1–20) |
| `archiveAfterMinutes` | int | `60` | Archive idle subagents after this duration |
| `model` | string | — | Default model for subagents (overrides agent defaults) |

## Sandbox

Docker-based isolation for code execution. Can be set globally or overridden per agent.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `"off"` | `"off"`, `"non-main"` (sandbox subagents only), `"all"` |
| `image` | string | `"goclaw-sandbox:bookworm-slim"` | Docker image |
| `workspace_access` | string | `"rw"` | Mount workspace: `"none"`, `"ro"`, `"rw"` |
| `scope` | string | `"session"` | Container lifetime: `"session"`, `"agent"`, `"shared"` |
| `memory_mb` | int | `512` | Memory limit (MB) |
| `cpus` | float | `1.0` | CPU quota |
| `timeout_sec` | int | `300` | Max execution time per command |
| `network_enabled` | bool | `false` | Allow network access inside container |
| `read_only_root` | bool | `true` | Read-only root filesystem |
| `setup_command` | string | — | Shell command run on container start |
| `env` | map | — | Extra environment variables |
| `max_output_bytes` | int | `1048576` | Max stdout+stderr per command (default 1 MB) |
| `idle_hours` | int | `24` | Prune containers idle longer than this |
| `max_age_days` | int | `7` | Prune containers older than this |
| `prune_interval_min` | int | `5` | How often to run container pruning |

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

**Notes:**
- `ollama` — local Ollama; no API key required, only `host`
- `claude_cli` — runs Claude via CLI subprocess; special fields: `cli_path`, `base_work_dir`, `perm_mode`
- `acp` — orchestrates any ACP-compatible agent (Claude Code, Codex CLI, Gemini CLI) as a subprocess over JSON-RPC 2.0 stdio

**ACP provider fields:**

| Field | Type | Description |
|-------|------|-------------|
| `binary` | string | Agent binary name or path (e.g. `"claude"`, `"codex"`) |
| `args` | []string | Extra arguments passed on spawn |
| `model` | string | Default model/agent name |
| `work_dir` | string | Base workspace directory for agent processes |
| `idle_ttl` | string | How long an idle process is kept alive (Go duration, e.g. `"5m"`) |
| `perm_mode` | string | Tool permission mode: `"approve-all"` (default), `"approve-reads"`, `"deny-all"` |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | — | Bot token from @BotFather |
| `proxy` | string | — | HTTP/SOCKS5 proxy URL |
| `api_server` | string | — | Custom Telegram Bot API server URL (e.g. `"http://localhost:8081"`) |
| `allow_from` | []string | — | Allowlisted user/chat IDs; empty = allow all |
| `dm_policy` | string | `"pairing"` | DM access: `"pairing"`, `"allowlist"`, `"open"`, `"disabled"` |
| `group_policy` | string | `"open"` | Group access: `"open"`, `"allowlist"`, `"disabled"` |
| `require_mention` | bool | `true` | Require @bot mention in groups |
| `history_limit` | int | `50` | Messages fetched for context on new conversation |
| `dm_stream` | bool | `false` | Stream responses in DMs |
| `group_stream` | bool | `false` | Stream responses in groups |
| `draft_transport` | bool | `true` | Use `sendMessageDraft` for DM streaming (stealth preview — no per-edit notifications) |
| `reasoning_stream` | bool | `true` | Show reasoning as a separate message when the provider emits thinking events |
| `reaction_level` | string | `"full"` | Emoji reactions: `"off"`, `"minimal"`, `"full"` |
| `media_max_bytes` | int | `20971520` | Max media file size (default 20 MB) |
| `link_preview` | bool | `true` | Show link previews |
| `block_reply` | bool | `false` | Override gateway `block_reply` for this channel |
| `stt_*` | — | — | Speech-to-text config (proxy URL, API key, tenant, timeout) |
| `voice_agent_id` | string | — | Agent to handle voice messages |
| `groups` | map | — | Per-group overrides keyed by chat ID |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | — | Discord bot token |
| `allow_from` | []string | — | Allowlisted user IDs |
| `dm_policy` | string | `"open"` | DM policy |
| `group_policy` | string | `"open"` | Server/channel policy |
| `require_mention` | bool | `true` | Require @mention in channels |
| `history_limit` | int | `50` | Context history limit |
| `media_max_bytes` | int | `26214400` | Max media size (default 25 MB) |
| `block_reply` | bool | `false` | Suppress intermediate replies |
| `stt_*` | — | — | Speech-to-text config |
| `voice_agent_id` | string | — | Agent for voice messages |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `bot_token` | string | — | Bot OAuth token (`xoxb-...`) |
| `app_token` | string | — | App-level token for Socket Mode (`xapp-...`) |
| `user_token` | string | — | User OAuth token (`xoxp-...`) |
| `allow_from` | []string | — | Allowlisted user IDs |
| `dm_policy` | string | `"pairing"` | DM access policy |
| `group_policy` | string | `"open"` | Channel access policy |
| `require_mention` | bool | `true` | Require @mention in channels |
| `native_stream` | bool | `false` | Use Slack native streaming API |
| `debounce_delay` | int | `300` | Message debounce in milliseconds |
| `thread_ttl` | int | `24` | Hours to maintain thread context; `0` = disabled (always require @mention) |
| `media_max_bytes` | int | `20971520` | Max media size (default 20 MB) |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `bridge_url` | string | — | WhatsApp bridge service URL |
| `allow_from` | []string | — | Allowlisted phone numbers/JIDs |
| `dm_policy` | string | `"open"` | DM access policy |
| `group_policy` | string | `"disabled"` | Group access policy |
| `block_reply` | bool | `false` | Suppress intermediate replies |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | — | Zalo OA access token |
| `allow_from` | []string | — | Allowlisted user IDs |
| `dm_policy` | string | `"pairing"` | DM access policy |
| `webhook_url` | string | — | Public webhook URL for Zalo callbacks |
| `webhook_secret` | string | — | Webhook signature secret |
| `media_max_mb` | int | `5` | Max media size (MB) |
| `block_reply` | bool | `false` | Suppress intermediate replies |

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `allow_from` | []string | — | Allowlisted user IDs |
| `dm_policy` | string | `"pairing"` | DM access policy |
| `group_policy` | string | `"disabled"` | Group access policy |
| `require_mention` | bool | `false` | Require mention in groups |
| `history_limit` | int | `50` | Context history limit |
| `credentials_path` | string | — | Path to Zalo session credentials file |
| `block_reply` | bool | `false` | Suppress intermediate replies |

### Larksuite

JSON key: `"feishu"`

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `app_id` / `app_secret` | string | — | Larksuite app credentials |
| `encrypt_key` | string | — | Event encryption key |
| `verification_token` | string | — | Webhook verification token |
| `domain` | string | `"lark"` | `"lark"`, `"feishu"`, or custom base URL |
| `connection_mode` | string | `"websocket"` | `"websocket"` or `"webhook"` |
| `webhook_port` | int | `3000` | Port for webhook mode |
| `webhook_path` | string | `"/feishu/events"` | Path for webhook events |
| `group_allow_from` | []string | — | Allowlisted group IDs |
| `topic_session_mode` | string | `"disabled"` | Thread/topic session handling |
| `text_chunk_limit` | int | `4000` | Max characters per message chunk |
| `render_mode` | string | `"auto"` | Message rendering: `"auto"`, `"raw"`, `"card"` |
| `streaming` | bool | `true` | Enable streaming responses |
| `media_max_mb` | int | `30` | Max media size (MB) |

### Pending Compaction

Auto-compacts long channel histories.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `threshold` | int | `50` | Compact when pending messages exceed this count |
| `keep_recent` | int | `15` | Always keep this many recent messages |
| `max_tokens` | int | `4096` | Max tokens for compaction summary |
| `provider` | string | — | Provider for compaction LLM call |
| `model` | string | — | Model for compaction LLM call |

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

**Tool policy fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profile` | string | — | Tool preset: `"minimal"`, `"coding"`, `"messaging"`, `"full"` |
| `allow` | []string | — | Explicitly allowed tool IDs |
| `deny` | []string | — | Explicitly denied tool IDs |
| `alsoAllow` | []string | — | Add tools on top of current profile |
| `rate_limit_per_hour` | int | — | Max tool calls per hour globally |
| `scrub_credentials` | bool | `true` | Redact credentials from tool outputs |

**Web fetch policy (`tools.web.fetch`):**

| Field | Type | Description |
|-------|------|-------------|
| `policy` | string | `"allow_all"` or `"allowlist"` |
| `allowed_domains` | []string | Domains allowed when policy is `"allowlist"` |
| `blocked_domains` | []string | Domains always blocked |

**MCP server fields (`tools.mcp_servers.*`):**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `transport` | string | — | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | — | Executable for stdio transport |
| `args` | []string | — | Args for stdio command |
| `env` | map | — | Environment variables for stdio process |
| `url` | string | — | URL for SSE/HTTP transport |
| `headers` | map | — | HTTP headers (supports `env:` prefix) |
| `enabled` | bool | `true` | Enable/disable this server |
| `tool_prefix` | string | — | Prefix added to all tools from this server |
| `timeout_sec` | int | `60` | Request timeout |

**Per-agent/per-provider tool policy** supports the same fields plus:

| Field | Type | Description |
|-------|------|-------------|
| `vision` | object | `{ "provider": "...", "model": "..." }` for vision tasks |
| `imageGen` | object | `{ "provider": "...", "model": "...", "size": "...", "quality": "..." }` |

## Exec Approval

Controls code execution safety:

**`security`** — What commands are allowed:

| Value | Behavior |
|-------|----------|
| `deny` | Block all shell commands |
| `allowlist` | Only execute allowlisted commands |
| `full` | Allow all shell commands |

**`ask`** — When to prompt for approval:

| Value | Behavior |
|-------|----------|
| `off` | Never ask, auto-approve based on security level |
| `on-miss` | Ask when command is not in the allowlist |
| `always` | Ask for every command |

```jsonc
// Restrictive: only allowlisted commands, ask for anything else
"execApproval": { "security": "allowlist", "ask": "on-miss" }

// Permissive: allow all, never ask
"execApproval": { "security": "full", "ask": "off" }

// Locked down: block all execution
"execApproval": { "security": "deny", "ask": "off" }
```

| Scenario | Recommended setting |
|----------|---------------------|
| Learning / Local | `"security": "allowlist", "ask": "on-miss"` |
| Personal Use | `"security": "full", "ask": "always"` |
| Production | `"security": "deny", "ask": "off"` |
| Experimental | `"security": "full", "ask": "off"` |

## TTS

Text-to-speech for voice output on supported channels.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | — | Active TTS provider: `"openai"`, `"elevenlabs"`, `"edge"`, `"minimax"` |
| `auto` | string | `"off"` | Auto-speak mode: `"off"`, `"always"`, `"inbound"`, `"tagged"` |
| `mode` | string | `"final"` | Speak `"final"` response only, or `"all"` chunks |
| `max_length` | int | `1500` | Max characters per TTS request |
| `timeout_ms` | int | `30000` | TTS request timeout (ms) |

## Sessions

Controls how conversation sessions are scoped and stored.

```jsonc
"sessions": {
  "scope": "per-sender",
  "dm_scope": "per-channel-peer",
  "main_key": "main"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | string | `"per-sender"` | Session scope: `"per-sender"` or `"global"` |
| `dm_scope` | string | `"per-channel-peer"` | DM session granularity: `"main"`, `"per-peer"`, `"per-channel-peer"`, `"per-account-channel-peer"` |
| `main_key` | string | `"main"` | Key used for the primary/default session |

> **Note:** The storage backend (PostgreSQL or Redis) is determined by build flags and environment variables (`GOCLAW_POSTGRES_DSN`, `GOCLAW_REDIS_DSN`), not by a field in config.json.

## Cron

Scheduled tasks that trigger agent actions.

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

**cron_config fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_retries` | int | `3` | Retry count on failure |
| `retry_base_delay` | string | `"2s"` | Initial backoff delay |
| `retry_max_delay` | string | `"30s"` | Max backoff delay |
| `default_timezone` | string | — | IANA timezone for cron expressions (e.g. `"America/New_York"`) |

## Bindings

Routes specific channels/peers to specific agents.

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

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Target agent ID from `agents.list` |
| `match.channel` | string | Channel name: `"telegram"`, `"discord"`, `"slack"`, etc. |
| `match.accountId` | string | Specific account/bot ID (for multi-account setups) |
| `match.peer.kind` | string | `"direct"` (DM) or `"group"` |
| `match.peer.id` | string | User ID or group/chat ID |
| `match.guildId` | string | Discord server ID |

## Telemetry

OpenTelemetry export for traces and metrics.

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

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `false` | Enable OTLP export |
| `endpoint` | string | — | OTLP collector endpoint |
| `protocol` | string | `"grpc"` | `"grpc"` or `"http"` |
| `insecure` | bool | `false` | Skip TLS verification |
| `service_name` | string | `"goclaw-gateway"` | Service name in traces |
| `headers` | map | — | Additional headers (supports `env:` prefix) |

## Tailscale

Expose GoClaw on a Tailscale network using tsnet.

```jsonc
"tailscale": {
  "hostname": "goclaw",
  "state_dir": "./data/tailscale",
  "ephemeral": false,
  "enable_tls": true
}
```

> **Note:** Auth key must be set via `GOCLAW_TSNET_AUTH_KEY` environment variable — it cannot be set in config.json.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hostname` | string | — | Hostname on your Tailnet |
| `state_dir` | string | — | Directory for Tailscale state files |
| `ephemeral` | bool | `false` | Register as ephemeral node (removed on disconnect) |
| `enable_tls` | bool | `false` | Enable automatic HTTPS certs via Tailscale |

## Common Issues

| Problem | Solution |
|---------|----------|
| Config not loading | Check `GOCLAW_CONFIG` path; ensure valid JSON5 syntax |
| Hot reload not working | Verify file is saved; check fsnotify support on your OS |
| API key not found | Ensure env var is exported in current shell session |
| Quota errors | Check `gateway.quota` settings; verify `owner_ids` for bypass |
| Sandbox not starting | Ensure Docker is running; verify image name in `sandbox.image` |
| MCP server not connecting | Check `transport` type, `command`/`url`, and server logs |

## What's Next

- [Web Dashboard Tour](#dashboard-tour) — Configure visually instead of editing JSON
- [Agents Explained](#agents-explained) — Deep dive into agent configuration
- [Tools Overview](#tools-overview) — Available tools and categories
