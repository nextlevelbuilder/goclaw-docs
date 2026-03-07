# Getting Started

**GoClaw** is a multi-agent AI gateway that connects LLMs to your tools, channels, and data — deployed as a single Go binary (~25 MB, ~36 MB with OTel). Zero runtime dependencies, <1s startup. It orchestrates agent teams, inter-agent delegation, and quality-gated workflows across 13+ LLM providers with full multi-tenant isolation.

A Go port of [OpenClaw](https://github.com/openclaw/openclaw) with enhanced security, multi-tenant PostgreSQL, and production-grade observability.

---

## What Makes It Different

- **Agent Teams & Orchestration** — Teams with shared task boards, inter-agent delegation (sync/async), conversation handoff, evaluate-loop quality gates, and hybrid agent discovery
- **Multi-Tenant PostgreSQL** — Per-user context files, encrypted credentials (AES-256-GCM), agent sharing, and complete data isolation
- **5-Layer Security** — Rate limiting, prompt injection detection, SSRF protection, shell deny patterns, and AES-256-GCM encryption
- **13+ LLM Providers** — Anthropic (native HTTP+SSE with prompt caching), OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, Cohere, Perplexity, DashScope (Qwen), Bailian Coding
- **Omnichannel** — WebSocket, HTTP (OpenAI-compatible), Telegram, Discord, Feishu/Lark, Zalo, WhatsApp
- **MCP Integration** — Connect external Model Context Protocol servers (stdio, SSE, streamable-HTTP) with per-agent and per-user access grants
- **Custom Tools** — Define shell-based tools at runtime via HTTP API with encrypted env vars
- **Production Observability** — Built-in LLM call tracing with optional OpenTelemetry OTLP export + Jaeger

---

## Two Operating Modes

| Aspect | Standalone | Managed |
|--------|-----------|---------|
| Storage | JSON files + SQLite | PostgreSQL (pgvector) |
| Dependencies | None (beyond LLM API key) | PostgreSQL 15+ |
| Agents | Defined in `config.json` | CRUD via HTTP API + Web Dashboard |
| Multi-tenancy | Per-user workspace dirs | Full DB isolation |
| Agent Teams | N/A | Shared task board + mailbox |
| Delegation | N/A | Sync/async delegation + quality gates |
| Tracing | N/A | Full LLM call tracing + OTel export |
| Custom Tools | N/A | Runtime-defined shell tools |

---

## Quick Start

### Prerequisites

- Go 1.25+
- At least one LLM API key (Anthropic, OpenAI, OpenRouter, or any supported provider)
- PostgreSQL 15+ with pgvector (managed mode only)

### Build from Source

```bash
# Build
go build -o goclaw .

# Interactive setup (creates config.json + .env.local)
./goclaw onboard

# Load environment and start
source .env.local
./goclaw
```

The `onboard` command auto-detects API keys from environment variables. If found, it runs non-interactively. Otherwise, it launches an interactive wizard to select provider, model, gateway token, and channels.

### Managed Mode (PostgreSQL)

```bash
# Set PostgreSQL DSN (env var only, never in config.json)
export GOCLAW_POSTGRES_DSN="postgres://goclaw:goclaw@localhost:5432/goclaw?sslmode=disable"

# Run database migrations
./goclaw migrate up

# Start gateway
./goclaw
```

---

## Docker Deployment

GoClaw provides **8 composable Docker Compose files** that you can mix and match for your deployment needs.

### Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base service definition (required) |
| `docker-compose.standalone.yml` | File-based storage with persistent volumes |
| `docker-compose.managed.yml` | PostgreSQL pgvector (pg18) for multi-tenant mode |
| `docker-compose.selfservice.yml` | Web dashboard UI (nginx + React SPA, port 3000) |
| `docker-compose.upgrade.yml` | One-shot database schema migration service |
| `docker-compose.sandbox.yml` | Docker-based code execution sandbox (requires docker socket) |
| `docker-compose.otel.yml` | OpenTelemetry + Jaeger tracing (Jaeger UI on port 16686) |
| `docker-compose.tailscale.yml` | Tailscale VPN mesh listener for secure remote access |

### Common Deployments

**Standalone (simplest):**

```bash
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d
```

**Managed + Web Dashboard (recommended):**

```bash
# Prepare environment (auto-generates encryption key + gateway token)
chmod +x prepare-env.sh && ./prepare-env.sh

# Start services
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml up -d
```

**Full Stack (managed + dashboard + tracing):**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.otel.yml up -d
```

**With Code Sandbox:**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.sandbox.yml up -d
```

**Database Schema Upgrade:**

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.upgrade.yml run --rm goclaw-upgrade
```

### Using Makefile

```bash
make up      # Start managed + dashboard (default)
make down    # Stop all services
make logs    # Stream goclaw container logs
make reset   # Stop, delete volumes, rebuild
make build   # Build binary locally
```

### Default Ports

| Service | Port |
|---------|------|
| Gateway (HTTP + WebSocket) | 18790 |
| Web Dashboard | 3000 |
| PostgreSQL | 5432 |
| Jaeger UI (OTel) | 16686 |

---

## Environment Variables

### LLM Provider Keys (at least one required)

```bash
GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
GOCLAW_OPENAI_API_KEY=sk-...
GOCLAW_OPENROUTER_API_KEY=sk-or-...
GOCLAW_GROQ_API_KEY=gsk_...
GOCLAW_DEEPSEEK_API_KEY=sk-...
GOCLAW_GEMINI_API_KEY=...
GOCLAW_MISTRAL_API_KEY=...
GOCLAW_XAI_API_KEY=...
GOCLAW_MINIMAX_API_KEY=...
GOCLAW_COHERE_API_KEY=...
GOCLAW_PERPLEXITY_API_KEY=...
```

### Gateway & Security

```bash
GOCLAW_GATEWAY_TOKEN=           # Auto-generated by prepare-env.sh
GOCLAW_ENCRYPTION_KEY=          # Auto-generated (32-byte hex)
GOCLAW_PORT=18790               # Gateway port
GOCLAW_HOST=0.0.0.0             # Gateway host
```

### Database (managed mode)

```bash
GOCLAW_MODE=managed             # "standalone" or "managed"
GOCLAW_POSTGRES_DSN=postgres://goclaw:goclaw@localhost:5432/goclaw
```

### Channels (optional)

```bash
GOCLAW_TELEGRAM_TOKEN=
GOCLAW_DISCORD_TOKEN=
GOCLAW_LARK_APP_ID=
GOCLAW_LARK_APP_SECRET=
GOCLAW_ZALO_TOKEN=
GOCLAW_WHATSAPP_BRIDGE_URL=
```

### Scheduler Lanes

```bash
GOCLAW_LANE_MAIN=30             # Main lane concurrency
GOCLAW_LANE_SUBAGENT=50         # Subagent lane
GOCLAW_LANE_DELEGATE=100        # Delegation lane
GOCLAW_LANE_CRON=30             # Cron lane
```

### Observability & TTS (optional)

```bash
GOCLAW_TELEMETRY_ENABLED=true
GOCLAW_TELEMETRY_ENDPOINT=      # OTLP endpoint
GOCLAW_TTS_OPENAI_API_KEY=
GOCLAW_TTS_ELEVENLABS_API_KEY=
GOCLAW_TTS_MINIMAX_API_KEY=
```

---

## Configuration

Configuration is loaded from a JSON5 file with environment variable overlay. Secrets are never persisted to the config file.

```json
{
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "token": ""
  },
  "agents": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "context_window": 200000
    }
  },
  "tools": {
    "profile": "full"
  },
  "database": {
    "mode": "standalone"
  }
}
```

### Config Sections

| Section | Purpose |
|---------|---------|
| `gateway` | host, port, token, allowed_origins, rate_limit_rpm |
| `agents` | defaults (provider, model, context_window) + per-agent list |
| `tools` | profile, allow/deny lists, exec_approval, mcp_servers |
| `channels` | Telegram, Discord, Feishu, Zalo, WhatsApp settings |
| `database` | mode (standalone/managed) |
| `sessions` | Session management settings |
| `tts` | Text-to-speech provider settings |
| `cron` | Cron job settings |
| `telemetry` | OpenTelemetry settings |
| `tailscale` | Tailscale listener config |
| `bindings` | Channel-to-agent mappings |

---

## Supported LLM Providers

| Provider | Type | Default Model |
|----------|------|---------------|
| Anthropic | Native HTTP + SSE | `claude-sonnet-4-5-20250929` |
| OpenAI | OpenAI-compatible | `gpt-4o` |
| OpenRouter | OpenAI-compatible | `anthropic/claude-sonnet-4-5-20250929` |
| Groq | OpenAI-compatible | `llama-3.3-70b-versatile` |
| DeepSeek | OpenAI-compatible | `deepseek-chat` |
| Gemini | OpenAI-compatible | `gemini-2.0-flash` |
| Mistral | OpenAI-compatible | `mistral-large-latest` |
| xAI | OpenAI-compatible | `grok-3-mini` |
| MiniMax | OpenAI-compatible | `MiniMax-M2.5` |
| Cohere | OpenAI-compatible | `command-a` |
| Perplexity | OpenAI-compatible | `sonar-pro` |
| DashScope | OpenAI-compatible | `qwen-plus` |
| Bailian Coding | OpenAI-compatible | `bailian-code` |

---

## CLI Commands

```bash
# Gateway
goclaw                          # Start gateway (default)
goclaw onboard                  # Interactive setup wizard
goclaw version                  # Print version & protocol
goclaw doctor                   # Health check

# Agents
goclaw agent list               # List configured agents
goclaw agent chat               # Chat with an agent
goclaw agent add                # Add new agent
goclaw agent delete             # Delete agent

# Database (managed mode)
goclaw migrate up               # Run pending migrations
goclaw migrate down             # Rollback last migration
goclaw migrate version          # Show current schema version
goclaw upgrade                  # Upgrade schema + data hooks
goclaw upgrade --status         # Show schema status
goclaw upgrade --dry-run        # Preview pending changes

# Configuration
goclaw config show              # Display config (secrets redacted)
goclaw config path              # Show config file path
goclaw config validate          # Validate config

# Sessions
goclaw sessions list            # List active sessions
goclaw sessions delete [key]    # Delete session
goclaw sessions reset [key]     # Clear session history

# Skills, Models, Channels
goclaw skills list              # List available skills
goclaw models list              # List AI models and providers
goclaw channels list            # List messaging channels

# Cron & Pairing
goclaw cron list                # List scheduled jobs
goclaw pairing approve [code]   # Approve pairing code
goclaw pairing list             # List paired devices
```

---

## Web Dashboard

GoClaw includes a React 19 SPA dashboard (Vite 6, TypeScript, Tailwind CSS 4, Radix UI) for managing agents, sessions, skills, and configuration.

### Local Development

```bash
cd ui/web
pnpm install    # Must use pnpm, not npm
pnpm dev
```

### Docker (via selfservice compose)

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.managed.yml \
  -f docker-compose.selfservice.yml up -d
```

The dashboard runs on port 3000 and connects to the gateway via WebSocket.

---

## Next Steps

- [Architecture Overview](#architecture) — Component diagram, module map, startup sequence
- [Agent Loop](#agent-loop) — Deep dive into the Think-Act-Observe cycle
- [API Reference](#api-reference) — HTTP and WebSocket endpoints
- [Security](#security) — 5-layer defense-in-depth model
- [Tools System](#tools) — 30+ built-in tools, custom tools, and MCP integration
- [Channels & Messaging](#channels) — Telegram, Discord, Feishu/Lark, Zalo, WhatsApp
