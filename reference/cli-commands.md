# CLI Commands

> Complete reference for every `goclaw` command, subcommand, and flag.

## Overview

The `goclaw` binary is a single executable that starts the gateway and provides management subcommands. Global flags apply to all commands.

```bash
goclaw [global flags] <command> [subcommand] [flags] [args]
```

**Global flags**

| Flag | Default | Description |
|------|---------|-------------|
| `--config <path>` | `config.json` | Config file path. Also read from `$GOCLAW_CONFIG` |
| `-v`, `--verbose` | false | Enable debug logging |

---

## Gateway (default)

Running `goclaw` with no subcommand starts the gateway.

```bash
./goclaw
source .env.local && ./goclaw          # with secrets loaded
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

On first run (no config file), the setup wizard launches automatically.

---

## `version`

Print version and protocol number.

```bash
goclaw version
# goclaw v1.2.0 (protocol 3)
```

---

## `onboard`

Interactive setup wizard — configure provider, model, gateway port, channels, features, and database.

```bash
goclaw onboard
```

Steps:
1. AI provider + API key (OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, Cohere, Perplexity, Claude CLI, Custom)
2. Gateway port (default: 18790)
3. Channels (Telegram, Zalo OA, Feishu/Lark)
4. Features (memory, browser automation)
5. TTS provider
6. PostgreSQL DSN

Saves `config.json` (no secrets) and `.env.local` (secrets only).

**Environment-based auto-onboard** — if the required env vars are set, the wizard is skipped and setup runs non-interactively (useful for Docker/CI).

---

## `agent`

Manage agents — add, list, delete, and chat.

### `agent list`

List all configured agents.

```bash
goclaw agent list
goclaw agent list --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `agent add`

Interactive wizard to add a new agent.

```bash
goclaw agent add
```

Prompts: agent name, display name, provider (or inherit), model (or inherit), workspace directory. Saves to `config.json`. Restart gateway to activate.

### `agent delete`

Delete an agent from config.

```bash
goclaw agent delete <agent-id>
goclaw agent delete researcher --force
```

| Flag | Description |
|------|-------------|
| `--force` | Skip confirmation prompt |

Also removes bindings referencing the deleted agent.

### `agent chat`

Send a one-shot message to an agent via the running gateway.

```bash
goclaw agent chat "What files are in the workspace?"
goclaw agent chat --agent researcher "Summarize today's news"
goclaw agent chat --session my-session "Continue where we left off"
```

| Flag | Default | Description |
|------|---------|-------------|
| `--agent <id>` | `default` | Target agent ID |
| `--session <key>` | auto | Session key to resume |
| `--json` | false | Output response as JSON |

---

## `migrate`

Database migration management. All subcommands require `GOCLAW_POSTGRES_DSN`.

```bash
goclaw migrate [--migrations-dir <path>] <subcommand>
```

| Flag | Description |
|------|-------------|
| `--migrations-dir <path>` | Path to migrations directory (default: `./migrations`) |

### `migrate up`

Apply all pending migrations.

```bash
goclaw migrate up
```

After SQL migrations, runs pending Go-based data hooks.

### `migrate down`

Roll back migrations.

```bash
goclaw migrate down           # roll back 1 step
goclaw migrate down -n 3      # roll back 3 steps
```

| Flag | Default | Description |
|------|---------|-------------|
| `-n`, `--steps <n>` | 1 | Number of steps to roll back |

### `migrate version`

Show current migration version.

```bash
goclaw migrate version
# version: 10, dirty: false
```

### `migrate force <version>`

Force-set the migration version without applying SQL (use after manual fixes).

```bash
goclaw migrate force 9
```

### `migrate goto <version>`

Migrate to a specific version (up or down).

```bash
goclaw migrate goto 5
```

### `migrate drop`

**DANGEROUS.** Drop all tables.

```bash
goclaw migrate drop
```

---

## `upgrade`

Upgrade database schema and run data migrations. Idempotent — safe to run multiple times.

```bash
goclaw upgrade
goclaw upgrade --dry-run    # preview without applying
goclaw upgrade --status     # show current upgrade status
```

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be done without applying |
| `--status` | Show current schema version and pending hooks |

Gateway startup also checks schema compatibility. Set `GOCLAW_AUTO_UPGRADE=true` to auto-upgrade on startup.

---

## `pairing`

Manage device pairing — approve, list, and revoke paired devices.

### `pairing list`

List pending pairing requests and paired devices.

```bash
goclaw pairing list
```

### `pairing approve [code]`

Approve a pairing code. Interactive selection if no code given.

```bash
goclaw pairing approve              # interactive picker
goclaw pairing approve ABCD1234    # approve specific code
```

### `pairing revoke <channel> <senderId>`

Revoke a paired device.

```bash
goclaw pairing revoke telegram 123456789
```

---

## `sessions`

View and manage chat sessions. Requires gateway to be running.

### `sessions list`

List all sessions.

```bash
goclaw sessions list
goclaw sessions list --agent researcher
goclaw sessions list --json
```

| Flag | Description |
|------|-------------|
| `--agent <id>` | Filter by agent ID |
| `--json` | Output as JSON |

### `sessions delete <key>`

Delete a session.

```bash
goclaw sessions delete "telegram:123456789"
```

### `sessions reset <key>`

Clear session history while keeping the session record.

```bash
goclaw sessions reset "telegram:123456789"
```

---

## `cron`

Manage scheduled cron jobs. Requires gateway to be running.

### `cron list`

List cron jobs.

```bash
goclaw cron list
goclaw cron list --all      # include disabled jobs
goclaw cron list --json
```

| Flag | Description |
|------|-------------|
| `--all` | Include disabled jobs |
| `--json` | Output as JSON |

### `cron delete <jobId>`

Delete a cron job.

```bash
goclaw cron delete 3f5a8c2b
```

### `cron toggle <jobId> <true|false>`

Enable or disable a cron job.

```bash
goclaw cron toggle 3f5a8c2b true
goclaw cron toggle 3f5a8c2b false
```

---

## `config`

View and manage configuration.

### `config show`

Display current configuration with secrets redacted.

```bash
goclaw config show
```

### `config path`

Print the config file path being used.

```bash
goclaw config path
# /home/user/goclaw/config.json
```

### `config validate`

Validate the config file syntax and structure.

```bash
goclaw config validate
# Config at config.json is valid.
```

---

## `channels`

List and manage messaging channels.

### `channels list`

List configured channels and their status.

```bash
goclaw channels list
goclaw channels list --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

Output columns: `CHANNEL`, `ENABLED`, `CREDENTIALS` (ok/missing).

---

## `skills`

List and inspect skills.

**Store directories** (searched in order):

1. `{workspace}/skills/` — agent-specific skills (workspace is per-agent, file-based)
2. `~/.goclaw/skills/` — global skills shared across all agents (file-based)
3. `~/.goclaw/skills-store/` — managed skills uploaded via API/dashboard (file content stored here, metadata in PostgreSQL)

### `skills list`

List all available skills.

```bash
goclaw skills list
goclaw skills list --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `skills show <name>`

Show content and metadata for a specific skill.

```bash
goclaw skills show sequential-thinking
```

---

## `models`

List configured AI models and providers.

### `models list`

```bash
goclaw models list
goclaw models list --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

Shows default model, per-agent overrides, and which providers have API keys configured.

---

## `doctor`

Check system environment and configuration health.

```bash
goclaw doctor
```

Checks: binary version, config file, database connectivity, schema version, providers, channels, external binaries (docker, curl, git), workspace directory.

---

## `auth`

Manage OAuth authentication for LLM providers. Requires the gateway to be running.

### `auth status`

Show OAuth authentication status (currently: OpenAI OAuth).

```bash
goclaw auth status
```

Uses `GOCLAW_GATEWAY_URL`, `GOCLAW_HOST`, `GOCLAW_PORT`, and `GOCLAW_TOKEN` env vars to connect.

### `auth logout [provider]`

Remove stored OAuth tokens.

```bash
goclaw auth logout          # removes openai OAuth tokens
goclaw auth logout openai
```

---

## What's Next

- [WebSocket Protocol](#websocket-protocol) — wire protocol reference for the gateway
- [REST API](#rest-api) — HTTP API endpoint listing
- [Config Reference](#config-reference) — full `config.json` schema

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
