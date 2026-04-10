# Environment Variables

> All environment variables recognized by GoClaw, organized by category.

## Overview

GoClaw reads environment variables at startup and applies them on top of `config.json`. Environment variables always take precedence over file values. Secrets (API keys, tokens, DSN) should never go in `config.json` — put them in `.env.local` or inject them as environment variables in your deployment.

```bash
# Load secrets and start
source .env.local && ./goclaw

# Or pass inline
GOCLAW_POSTGRES_DSN="postgres://..." GOCLAW_GATEWAY_TOKEN="..." ./goclaw
```

---

## Gateway

| Variable | Required | Description |
|----------|----------|-------------|
| `GOCLAW_GATEWAY_TOKEN` | Yes | Bearer token for WebSocket and HTTP API authentication |
| `GOCLAW_ENCRYPTION_KEY` | Yes | AES-256-GCM key for encrypting provider API keys in the database. Generate with `openssl rand -hex 32` |
| `GOCLAW_CONFIG` | No | Path to `config.json`. Default: `./config.json` |
| `GOCLAW_HOST` | No | Gateway listen host. Default: `0.0.0.0` |
| `GOCLAW_PORT` | No | Gateway listen port. Default: `18790` |
| `GOCLAW_OWNER_IDS` | No | Comma-separated user IDs with admin/owner access (e.g. `user1,user2`) |
| `GOCLAW_AUTO_UPGRADE` | No | Set to `true` to auto-run DB migrations on gateway startup |
| `GOCLAW_DATA_DIR` | No | Data directory for gateway state. Default: `~/.goclaw/data` |
| `GOCLAW_MIGRATIONS_DIR` | No | Path to migrations directory. Default: `./migrations` |
| `GOCLAW_GATEWAY_URL` | No | Full gateway URL for `auth` CLI commands (e.g. `http://localhost:18790`) |
| `GOCLAW_ALLOWED_ORIGINS` | No | Comma-separated CORS allowed origins (overrides config file). Example: `https://app.example.com,https://admin.example.com` |

---

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `GOCLAW_POSTGRES_DSN` | Yes | PostgreSQL connection string. Example: `postgres://user:pass@localhost:5432/goclaw?sslmode=disable` |

> The DSN is intentionally excluded from `config.json` — it is a secret. Set it via environment only.

---

## LLM Providers

API keys from environment override any values in `config.json`. Setting a key here also auto-enables the provider.

| Variable | Provider |
|----------|----------|
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `GOCLAW_ANTHROPIC_BASE_URL` | Anthropic custom endpoint |
| `GOCLAW_OPENAI_API_KEY` | OpenAI (GPT) |
| `GOCLAW_OPENAI_BASE_URL` | OpenAI-compatible custom endpoint |
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_MISTRAL_API_KEY` | Mistral AI |
| `GOCLAW_XAI_API_KEY` | xAI (Grok) |
| `GOCLAW_MINIMAX_API_KEY` | MiniMax |
| `GOCLAW_COHERE_API_KEY` | Cohere |
| `GOCLAW_PERPLEXITY_API_KEY` | Perplexity |
| `GOCLAW_DASHSCOPE_API_KEY` | Alibaba DashScope |
| `GOCLAW_BAILIAN_API_KEY` | Alibaba Bailian |
| `GOCLAW_OLLAMA_HOST` | Ollama server URL (e.g. `http://localhost:11434`) |
| `GOCLAW_OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key |
| `GOCLAW_OLLAMA_CLOUD_API_BASE` | Ollama Cloud custom base URL |

### Provider & Model Defaults

| Variable | Description |
|----------|-------------|
| `GOCLAW_PROVIDER` | Default LLM provider name (overrides `agents.defaults.provider` in config) |
| `GOCLAW_MODEL` | Default model ID (overrides `agents.defaults.model` in config) |

---

## Claude CLI Provider

| Variable | Description |
|----------|-------------|
| `GOCLAW_CLAUDE_CLI_PATH` | Path to the `claude` binary. Default: `claude` (from PATH) |
| `GOCLAW_CLAUDE_CLI_MODEL` | Model alias for Claude CLI (e.g. `sonnet`, `opus`, `haiku`) |
| `GOCLAW_CLAUDE_CLI_WORK_DIR` | Base working directory for Claude CLI sessions |

---

## Channels

Setting a token/credential via environment auto-enables that channel.

| Variable | Channel | Description |
|----------|---------|-------------|
| `GOCLAW_TELEGRAM_TOKEN` | Telegram | Bot token from @BotFather |
| `GOCLAW_DISCORD_TOKEN` | Discord | Bot token |
| `GOCLAW_ZALO_TOKEN` | Zalo OA | Zalo OA access token |
| `GOCLAW_LARK_APP_ID` | Feishu/Lark | App ID |
| `GOCLAW_LARK_APP_SECRET` | Feishu/Lark | App secret |
| `GOCLAW_LARK_ENCRYPT_KEY` | Feishu/Lark | Event encryption key |
| `GOCLAW_LARK_VERIFICATION_TOKEN` | Feishu/Lark | Event verification token |
| `GOCLAW_WHATSAPP_ENABLED` | WhatsApp | Enable WhatsApp channel (`true`/`false`) |
| `GOCLAW_SLACK_BOT_TOKEN` | Slack | Bot User OAuth Token (`xoxb-...`) — auto-enables Slack |
| `GOCLAW_SLACK_APP_TOKEN` | Slack | App-Level Token for Socket Mode (`xapp-...`) |
| `GOCLAW_SLACK_USER_TOKEN` | Slack | Optional User OAuth Token (`xoxp-...`) |

---

## Text-to-Speech (TTS)

| Variable | Description |
|----------|-------------|
| `GOCLAW_TTS_OPENAI_API_KEY` | OpenAI TTS API key |
| `GOCLAW_TTS_ELEVENLABS_API_KEY` | ElevenLabs TTS API key |
| `GOCLAW_TTS_MINIMAX_API_KEY` | MiniMax TTS API key |
| `GOCLAW_TTS_MINIMAX_GROUP_ID` | MiniMax group ID |

---

## Workspace & Skills

| Variable | Description |
|----------|-------------|
| `GOCLAW_WORKSPACE` | Default agent workspace directory. Default: `~/.goclaw/workspace` |
| `GOCLAW_SESSIONS_STORAGE` | Session storage path (legacy). Default: `~/.goclaw/sessions` |
| `GOCLAW_SKILLS_DIR` | Global skills directory. Default: `~/.goclaw/skills` |
| `GOCLAW_BUILTIN_SKILLS_DIR` | Path to built-in skill definitions. Default: `./builtin-skills` |
| `GOCLAW_BUNDLED_SKILLS_DIR` | Path to bundled skill packages. Default: `./bundled-skills` |

## Runtime Packages (Docker v3)

These variables configure where on-demand runtime packages (pip/npm) are installed inside the container. Set automatically by the Docker entrypoint — only override if you have a custom install layout.

| Variable | Default (Docker) | Description |
|----------|-----------------|-------------|
| `PIP_TARGET` | `/app/data/.runtime/pip` | Directory where pip installs Python packages at runtime |
| `PYTHONPATH` | `/app/data/.runtime/pip` | Python module search path — must include `PIP_TARGET` so installed packages are importable |
| `NPM_CONFIG_PREFIX` | `/app/data/.runtime/npm-global` | npm global prefix for runtime Node.js package installs |

> These directories are mounted on the data volume so packages survive container recreation. The `pkg-helper` binary (runs as root) manages system (`apk`) packages; pip/npm installs run as the `goclaw` user.

---

## Sandbox (Docker)

| Variable | Description |
|----------|-------------|
| `GOCLAW_SANDBOX_MODE` | `"off"`, `"non-main"`, or `"all"` |
| `GOCLAW_SANDBOX_IMAGE` | Docker image for sandbox containers |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `"none"`, `"ro"`, or `"rw"` |
| `GOCLAW_SANDBOX_SCOPE` | `"session"`, `"agent"`, or `"shared"` |
| `GOCLAW_SANDBOX_MEMORY_MB` | Memory limit in MB |
| `GOCLAW_SANDBOX_CPUS` | CPU limit (float, e.g. `"1.5"`) |
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | Exec timeout in seconds |
| `GOCLAW_SANDBOX_NETWORK` | `"true"` to enable container network access |

---

## Concurrency / Scheduler

Lane-based limits for concurrent agent runs.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOCLAW_LANE_MAIN` | `30` | Max concurrent main agent runs |
| `GOCLAW_LANE_SUBAGENT` | `50` | Max concurrent subagent runs |
| `GOCLAW_LANE_DELEGATE` | `100` | Max concurrent delegated agent runs |
| `GOCLAW_LANE_CRON` | `30` | Max concurrent cron job runs |

---

## Telemetry (OpenTelemetry)

Requires build tag `otel` (`go build -tags otel`).

| Variable | Description |
|----------|-------------|
| `GOCLAW_TELEMETRY_ENABLED` | `"true"` to enable OTLP export |
| `GOCLAW_TELEMETRY_ENDPOINT` | OTLP endpoint (e.g. `localhost:4317`) |
| `GOCLAW_TELEMETRY_PROTOCOL` | `"grpc"` (default) or `"http"` |
| `GOCLAW_TELEMETRY_INSECURE` | `"true"` to skip TLS verification |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | OTEL service name. Default: `goclaw-gateway` |

---

## Tailscale

Requires build tag `tsnet` (`go build -tags tsnet`).

| Variable | Description |
|----------|-------------|
| `GOCLAW_TSNET_HOSTNAME` | Tailscale machine name (e.g. `goclaw-gateway`) |
| `GOCLAW_TSNET_AUTH_KEY` | Tailscale auth key — never stored in config.json |
| `GOCLAW_TSNET_DIR` | Persistent state directory |

---

## Debugging & Tracing

| Variable | Description |
|----------|-------------|
| `GOCLAW_TRACE_VERBOSE` | Set to `1` to log full LLM input in trace spans |
| `GOCLAW_BROWSER_REMOTE_URL` | Connect to a remote browser via Chrome DevTools Protocol URL. Auto-enables browser tool |
| `GOCLAW_REDIS_DSN` | Redis connection string (e.g. `redis://redis:6379/0`). Requires build with `-tags redis` |

---

## Minimal `.env.local`

Generated by `goclaw onboard`. Keep this file out of version control.

```bash
# Required
GOCLAW_GATEWAY_TOKEN=your-gateway-token
GOCLAW_ENCRYPTION_KEY=your-32-byte-hex-key
GOCLAW_POSTGRES_DSN=postgres://user:pass@localhost:5432/goclaw?sslmode=disable

# LLM provider (one of these)
GOCLAW_OPENROUTER_API_KEY=sk-or-...
# GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
# GOCLAW_OPENAI_API_KEY=sk-...

# Channels (optional)
# GOCLAW_TELEGRAM_TOKEN=123456789:ABC...

# Debug (optional)
# GOCLAW_TRACE_VERBOSE=1
```

---

## What's Next

- [Config Reference](/config-reference) — corresponding `config.json` fields for each category
- [CLI Commands](/cli-commands) — `goclaw onboard` generates `.env.local` automatically
- [Database Schema](/database-schema) — how secrets are stored encrypted in PostgreSQL

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
