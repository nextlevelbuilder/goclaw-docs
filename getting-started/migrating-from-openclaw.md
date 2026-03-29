# Migrating from OpenClaw

> What's different in GoClaw and how to move your setup over.

## Overview

GoClaw is the multi-tenant evolution of OpenClaw. If you've been running OpenClaw as a personal assistant, GoClaw gives you teams, delegation, encrypted credentials, tracing, and per-user isolation — while keeping the same agent concepts you already know.

## Why Migrate?

| Feature | OpenClaw | GoClaw |
|---------|----------|--------|
| Multi-tenant | No (single user) | Yes (per-user isolation) |
| Agent teams | Sub-agent delegation | Full team collaboration (shared task board, delegation) |
| Credential storage | Plain text in config | AES-256-GCM encrypted in DB |
| Memory | SQLite + QMD semantic search | PostgreSQL + SQLite (FTS5 hybrid search) |
| Tracing | No | Full LLM call traces with cost tracking |
| MCP support | Yes (via mcporter bridge) | Yes (stdio, SSE, streamable-http) |
| Custom tools | Yes (52+ built-in skills) | Yes (define via dashboard or API) |
| Code sandbox | Yes (Docker-based) | Yes (Docker-based with per-agent config) |
| Database | SQLite | PostgreSQL |
| Channels | 6 core (Telegram, Discord, Slack, Signal, iMessage, Web) + 35+ extension channels | 7 (Telegram, Discord, Slack, WhatsApp, Zalo OA, Zalo Personal, Feishu) |
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

GoClaw uses context files (similar concepts to OpenClaw). The 6 core files loaded every session:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operating instructions and safety rules |
| `SOUL.md` | Agent personality and behavior |
| `IDENTITY.md` | Name, avatar, greeting |
| `USER.md` | User profile and preferences |
| `BOOTSTRAP.md` | First-run onboarding ritual (auto-deleted after completion) |

> **Note:** `TOOLS.md` is not used in GoClaw — tool configuration is managed via the Dashboard. Do not migrate this file.

Additional context files for advanced features:

| File | Purpose |
|------|---------|
| `MEMORY.md` | Long-term curated memory |
| `DELEGATION.md` | Delegation instructions for sub-agents |
| `TEAM.md` | Team coordination rules |

GoClaw supports both agent-level (shared) and per-user context file overrides. The file names listed are conventions, not requirements.

**Key difference:** OpenClaw stores these on the filesystem. GoClaw stores them in PostgreSQL with per-user scoping — each user can have their own version of context files for the same agent.

## What Migrates (and What Doesn't)

| Migrates | Doesn't Migrate |
|----------|----------------|
| Agent config (provider, model, tools) | Message history (fresh start) |
| Context files (manual upload) | Session state |
| Channel tokens (via env vars) | User profiles (recreated on first login) |

## Migration Steps

1. **Set up GoClaw** — Follow the [Installation](/installation) and [Quick Start](/quick-start) guides
2. **Map your config** — Translate your OpenClaw config using the mapping table above
3. **Move context files** — Copy your `.md` context files (excluding `TOOLS.md` — not used in GoClaw); upload via the dashboard or API
4. **Update channel tokens** — Move tokens from config to environment variables
5. **Test** — Verify your agents respond correctly through each channel

> **Security note:** GoClaw encrypts all credentials with AES-256-GCM in the database, which is more secure than OpenClaw's plaintext config approach. Once you move your API keys and tokens to GoClaw, they are stored encrypted at rest.

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
| Missing channels | GoClaw focuses on 7 core channels; some OpenClaw channels (IRC, Signal, iMessage, LINE, etc.) aren't ported yet |

## What's Next

- [How GoClaw Works](/how-goclaw-works) — Understand the new architecture
- [Multi-Tenancy](/multi-tenancy) — Learn about per-user isolation
- [Configuration](/configuration) — Full config reference

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
