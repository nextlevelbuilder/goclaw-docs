# Migrating from OpenClaw

> What's different in GoClaw and how to move your setup over.

## Overview

GoClaw is the multi-tenant evolution of OpenClaw. If you've been running OpenClaw as a personal assistant, GoClaw gives you teams, delegation, encrypted credentials, tracing, and per-user isolation — while keeping the same agent concepts you already know.

## Why Migrate?

| Feature | OpenClaw | GoClaw |
|---------|----------|--------|
| Multi-tenant | No (single user) | Yes (per-user isolation) |
| Agent teams | No | Yes (shared task board, delegation) |
| Credential storage | Plain text in config | AES-256-GCM encrypted in DB |
| Memory | File-based | PostgreSQL with hybrid search |
| Tracing | No | Full LLM call traces with cost tracking |
| MCP support | No | Yes |
| Custom tools | No | Yes (define via dashboard or API) |
| Code sandbox | No | Yes (isolated execution environment) |
| Database | Optional SQLite | PostgreSQL (managed mode) |
| Channels | 37+ | 6 core (Telegram, Discord, WhatsApp, Zalo, Feishu, WebSocket) |
| Dashboard | Basic web UI | Full management dashboard |

## Config Mapping

### Agent Configuration

| OpenClaw | GoClaw | Notes |
|----------|--------|-------|
| `ai.provider` | `agents.defaults.provider` | Same provider names |
| `ai.model` | `agents.defaults.model` | Same model identifiers |
| `ai.maxTokens` | `agents.defaults.max_tokens` | Snake case in GoClaw |
| `ai.temperature` | `agents.defaults.temperature` | Same range (0-2) |
| `commands.*` | `tools.*` | Tools replace commands |

### Channel Setup

Channels work the same conceptually but use a different config format:

**OpenClaw:**
```json
{
  "telegram": {
    "botToken": "123:ABC"
  }
}
```

**GoClaw:**
```jsonc
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "env:TELEGRAM_BOT_TOKEN"
    }
  }
}
```

Note: GoClaw keeps tokens in environment variables, not in the config file.

### Context Files

GoClaw uses 6 context files (similar concepts to OpenClaw):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operating instructions and safety rules |
| `SOUL.md` | Agent personality and behavior |
| `IDENTITY.md` | Name, avatar, greeting |
| `TOOLS.md` | Tool usage guidance |
| `USER.md` | User profile and preferences |
| `BOOTSTRAP.md` | First-run onboarding ritual |

**Key difference:** OpenClaw stores these on the filesystem. GoClaw stores them in PostgreSQL with per-user scoping — each user can have their own version of context files for the same agent.

## Migration Steps

1. **Set up GoClaw** — Follow the [Installation](installation.md) and [Quick Start](quick-start.md) guides
2. **Map your config** — Translate your OpenClaw config using the mapping table above
3. **Move context files** — Copy your `.md` context files; upload via the dashboard or API
4. **Update channel tokens** — Move tokens from config to environment variables
5. **Test** — Verify your agents respond correctly through each channel

## What's New in GoClaw

Features you gain after migrating:

- **Agent Teams** — Multiple agents collaborating on tasks with a shared board
- **Delegation** — Agent A calls Agent B for specialized subtasks
- **Multi-Tenancy** — Each user gets isolated sessions, memory, and context
- **Traces** — See every LLM call, tool use, and token cost
- **Custom Tools** — Define your own tools without touching Go code
- **MCP Integration** — Connect external tool servers
- **Cron Jobs** — Schedule recurring agent tasks
- **Encrypted Credentials** — API keys stored with AES-256-GCM encryption

## Common Issues

| Problem | Solution |
|---------|----------|
| Context files not loading | Upload via dashboard or API; filesystem path differs from OpenClaw |
| Different response behavior | Check `max_tool_iterations` — GoClaw default (20) may differ from your OpenClaw setup |
| Missing channels | GoClaw focuses on 6 core channels; some niche OpenClaw channels aren't ported yet |

## What's Next

- [How GoClaw Works](../core-concepts/how-goclaw-works.md) — Understand the new architecture
- [Multi-Tenancy](../core-concepts/multi-tenancy.md) — Learn about per-user isolation
- [Configuration](configuration.md) — Full config reference
