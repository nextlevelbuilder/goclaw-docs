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
| `--server <url>` | — | Gateway server URL override for HTTP-backed commands (traces, skills, etc.). Falls back to `$GOCLAW_SERVER`, then `$GOCLAW_GATEWAY_URL` |
| `--token <token>` | — | Gateway bearer token override. Falls back to `$GOCLAW_GATEWAY_TOKEN` |

---

## Gateway (default)

Running `goclaw` with no subcommand starts the gateway.

```bash
./goclaw
source .env.local && ./goclaw          # with secrets loaded
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

On first run (no config file), the setup wizard launches automatically.

The `gateway` command is internally decomposed into focused files for maintainability:

| File | Responsibility |
|------|---------------|
| `gateway_deps.go` | Dependency wiring and initialization |
| `gateway_http_wiring.go` | HTTP server setup and route registration |
| `gateway_events.go` | Event bus wiring |
| `gateway_lifecycle.go` | Startup, shutdown, and signal handling |
| `gateway_tools_wiring.go` | Tool registration and exec workspace setup |
| `gateway_providers.go` | Provider registration from config and database |
| `gateway_vault_wiring.go` | Vault and memory store wiring |
| `gateway_evolution_cron.go` | Scheduled evolution and background cron jobs |

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

A TUI-based onboard is available when the terminal supports it (`tui_onboard.go`). Falls back to plain interactive mode automatically.

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

## `backup`

Back up the GoClaw database and config to an archive file.

```bash
goclaw backup
goclaw backup --output /path/to/backup.tar.gz
```

| Flag | Description |
|------|-------------|
| `--output <path>` | Output archive path (default: timestamped file in current dir) |

---

## `restore`

Restore from a backup archive.

```bash
goclaw restore /path/to/backup.tar.gz
```

---

## `tenant_backup`

Back up a single tenant's data.

```bash
goclaw tenant_backup --tenant <tenant-id>
goclaw tenant_backup --tenant <tenant-id> --output /path/to/backup.tar.gz
```

---

## `tenant_restore`

Restore a single tenant from a backup archive.

```bash
goclaw tenant_restore --tenant <tenant-id> /path/to/backup.tar.gz
```

---

## `doctor`

Check system environment and configuration health.

```bash
goclaw doctor
```

Checks: binary version, config file, database connectivity, schema version, providers, channels, external binaries (docker, curl, git), workspace directory. Prints a pass/fail summary for each check.

Provider rows with an empty `display_name` now render the canonical `name` instead of a blank line.

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

## `traces`

Inspect agent execution traces and run timelines through the running gateway. All `traces` subcommands are HTTP-backed — they connect to the gateway resolved from `--server` / `$GOCLAW_SERVER` / `$GOCLAW_GATEWAY_URL` and authenticate with `--token` / `$GOCLAW_GATEWAY_TOKEN`.

| Persistent flag | Default | Description |
|------|---------|-------------|
| `-o`, `--output <table\|json>` | `table` | Output format |

```bash
goclaw traces list --status error --limit 20
goclaw traces get <trace-id> -o json
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces timeline <trace-id>
# remote gateway:
goclaw --server https://goclaw.example.com --token "$GOCLAW_GATEWAY_TOKEN" traces get <trace-id> -o json
```

### `traces list`

List traces with filtering and full-text search.

```bash
goclaw traces list
goclaw traces list -q "payment" --has-tool-calls true --limit 50
```

| Flag | Description |
|------|-------------|
| `-q`, `--query <text>` | Search trace text, IDs, labels, and span previews |
| `--agent-id <uuid>` | Filter by agent UUID |
| `--user <id>` | Filter by user ID (admin callers) |
| `--session <key>` | Filter by session key |
| `--status <status>` | Filter by trace status (`running`, `completed`, `error`, `cancelled`) |
| `--channel <channel>` | Filter by raw channel |
| `--agent <text>` | Search agent display name or key |
| `--channel-query <text>` | Search channel instance labels |
| `--tool <name>` | Search span tool names |
| `--from <rfc3339>` | Start-time lower bound (inclusive) |
| `--to <rfc3339>` | Start-time upper bound (exclusive) |
| `--since <rfc3339>` | Alias for `--from` |
| `--until <rfc3339>` | Alias for `--to` |
| `--has-tool-calls <true\|false>` | Only traces with/without tool calls |
| `--min-input-tokens <n>` | Minimum input tokens |
| `--max-input-tokens <n>` | Maximum input tokens |
| `--min-output-tokens <n>` | Minimum output tokens |
| `--max-output-tokens <n>` | Maximum output tokens |
| `--min-tool-calls <n>` | Minimum tool-call count |
| `--max-tool-calls <n>` | Maximum tool-call count |
| `--limit <n>` | Page size (max 200) |
| `--offset <n>` | Pagination offset |

### `traces get <trace-id>`

Get trace details with spans. Takes exactly one trace ID.

```bash
goclaw traces get <trace-id>
goclaw traces get <trace-id> -o json
```

### `traces export <trace-id>`

Export a gzipped trace tree. Takes exactly one trace ID.

```bash
goclaw traces export <trace-id>                 # writes trace-<short>-<YYYYMMDD>.json.gz
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces export <trace-id> --file -        # gzip to stdout
goclaw traces export <trace-id> -o json         # decompressed JSON to stdout
```

| Flag | Description |
|------|-------------|
| `--file <path>` | Write gzip export to file (use `-` for stdout). Default writes `trace-<short>-<YYYYMMDD>.json.gz` |

### `traces follow`

Poll trace changes for one session or agent. **Requires `--session` OR `--agent-id`.**

```bash
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces follow --agent-id <uuid> --include-spans
```

| Flag | Description |
|------|-------------|
| `--session <key>` | Filter by session key |
| `--agent-id <uuid>` | Filter by agent UUID |
| `--user <id>` | Filter by user ID (admin callers) |
| `--status <status>` | Filter by trace status |
| `--channel <channel>` | Filter by raw channel |
| `--since <rfc3339>` | RFC3339 lower bound for changed traces |
| `--limit <n>` | Page size (max 200) |
| `--include-spans` | Include spans grouped by trace ID |

### `traces timeline <trace-id>`

Show the persisted run timeline linked to a trace. Resolves the trace's `run_id`, then queries the run archive. Takes exactly one trace ID.

```bash
goclaw traces timeline <trace-id>
goclaw traces timeline <trace-id> --limit 100 --offset 0
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Page size (max 500) |
| `--offset <n>` | Pagination offset |

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

## `providers`

Manage LLM providers (requires running gateway).

### `providers list`

List configured providers.

```bash
goclaw providers list
goclaw providers list --json
goclaw providers list --models
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--models` | Also show available models per provider |

Shows provider name, type, enabled status, and whether an API key is configured.

### `providers add`

Add a new provider (interactive).

```bash
goclaw providers add
```

Interactive prompts for provider type, name, API key, and base URL. Offers to verify connectivity after creation.

### `providers update <id>`

Update a provider's name or API key.

```bash
goclaw providers update <id>
```

### `providers delete <id>`

Delete a provider.

```bash
goclaw providers delete <id>
goclaw providers delete <id> --force
```

| Flag | Description |
|------|-------------|
| `--force` | Skip confirmation prompt |

### `providers verify <id>`

Verify provider connectivity or a specific model.

```bash
goclaw providers verify <id>
goclaw providers verify <id> --model anthropic/claude-sonnet-4
```

| Flag | Description |
|------|-------------|
| `--model <alias>` | Model alias to verify (omit for connectivity ping) |

Without `--model`: pings the provider (registered + reachable check) — no LLM call is made.
With `--model`: sends a small chat request to validate the model alias.

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

> The subcommands below are HTTP-backed (require a running gateway). The `<skill>` argument accepts a skill ID, slug, or name — it is resolved against the gateway.

### `skills evolve`

Manage per-skill self-evolution settings.

```bash
goclaw skills evolve status <skill>
goclaw skills evolve enable <skill>
goclaw skills evolve disable <skill>
goclaw skills evolve mode <skill> suggest_only
goclaw skills evolve mode <skill> auto_analyze
```

| Command | Args | Effect |
|---------|------|--------|
| `skills evolve status <skill>` | 1 | Show self-evolution settings |
| `skills evolve enable <skill>` | 1 | Enable self-evolution |
| `skills evolve disable <skill>` | 1 | Disable self-evolution |
| `skills evolve mode <skill> <suggest_only\|auto_analyze>` | 2 | Set the evolution mode |

### `skills metrics <skill>`

Show recorded usage metrics for a skill (Total, Started, Succeeded, Failed, Abandoned, Success rate).

```bash
goclaw skills metrics <skill>
goclaw skills metrics <skill> --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `skills activity <skill>`

Show recent self-evolution activity for a skill (admin-gated detail).

```bash
goclaw skills activity <skill>
goclaw skills activity <skill> --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `skills suggestions`

Manage skill improvement suggestions.

```bash
goclaw skills suggestions list <skill>
goclaw skills suggestions approve <skill> <suggestion-id>
goclaw skills suggestions reject <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id> --approve
```

| Command | Args / Flags | Effect |
|---------|--------------|--------|
| `skills suggestions list <skill>` | 1 | List suggestions for a skill |
| `skills suggestions approve <skill> <suggestion-id>` | 2 | Approve a suggestion |
| `skills suggestions reject <skill> <suggestion-id>` | 2 | Reject a suggestion |
| `skills suggestions apply <skill> <suggestion-id>` | 2, `--approve` | Apply an approved suggestion (`--approve` approves a pending one first) |

### `skills deps`

Scan, check, and install skill dependencies. The argument accepts a local skill path or a gateway skill ID.

```bash
goclaw skills deps status <skill-id-or-path>
goclaw skills deps scan <skill-id-or-path>
goclaw skills deps check <skill-id-or-path>
goclaw skills deps install <skill-id>
```

| Command | Args / Flags | Effect |
|---------|--------------|--------|
| `skills deps status <skill-id-or-path>` | 1, `--json` | Show dependency status |
| `skills deps scan <skill-id-or-path>` | 1, `--json` | Scan dependency declarations |
| `skills deps check <skill-id-or-path>` | 1, `--json` | Check availability |
| `skills deps install <skill-id>` | 1, `--json` | Install missing dependencies (master tenant) |

### `skills access`

Manage skill access mode and effective access.

```bash
goclaw skills access get <skill-id>
goclaw skills access set <skill-id> --mode internal
goclaw skills access effective <skill-id> --agent <agent-id> --user <user-id>
goclaw skills access effective --agent <agent-id> --user <user-id>
```

| Command | Args / Flags | Effect |
|---------|--------------|--------|
| `skills access get <skill-id>` | 1, `--json` | Show access mode and grants |
| `skills access set <skill-id> --mode <private\|internal\|public>` | 1, `--mode` (required), `--json` | Set the access mode |
| `skills access effective [skill-id] --agent <id> --user <id>` | 0–1, `--agent`+`--user` (required), `--json` | Inspect effective access (per-skill when an ID is given, else across skills) |

### `skills grant`

Grant skill access to an agent or user.

```bash
goclaw skills grant agent <skill-id> <agent-id>
goclaw skills grant agent <skill-id> <agent-id> --can-manage --pinned-version 3
goclaw skills grant user <skill-id> <user-id>
```

| Command | Args / Flags | Effect |
|---------|--------------|--------|
| `skills grant agent <skill-id> <agent-id>` | 2, `--can-manage`, `--pinned-version <n>`, `--json` | Grant a skill to an agent |
| `skills grant user <skill-id> <user-id>` | 2, `--json` | Grant a skill to a user |

### `skills revoke`

Revoke skill access from an agent or user.

```bash
goclaw skills revoke agent <skill-id> <agent-id>
goclaw skills revoke user <skill-id> <user-id>
```

| Command | Args | Effect |
|---------|------|--------|
| `skills revoke agent <skill-id> <agent-id>` | 2 | Revoke an agent grant |
| `skills revoke user <skill-id> <user-id>` | 2 | Revoke a user grant |

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

## `setup` commands

Guided setup wizards for individual components. Each runs interactively and writes to `config.json`.

### `setup agent`

Add or reconfigure an agent interactively.

```bash
goclaw setup agent
```

### `setup channel`

Configure a messaging channel (Telegram, Zalo OA, Feishu/Lark, etc.).

```bash
goclaw setup channel
```

### `setup provider`

Add or reconfigure an LLM provider.

```bash
goclaw setup provider
```

### `setup` (general)

Run the full setup flow (equivalent to `onboard` for an existing install).

```bash
goclaw setup
```

---

## TUI commands

Terminal UI versions of the setup and onboard flows. Available when the terminal supports interactive TUI rendering. Falls back to plain CLI automatically on unsupported terminals.

```bash
goclaw tui           # launch TUI app
goclaw tui onboard   # TUI-based onboarding wizard
goclaw tui setup     # TUI-based setup wizard
```

---

## `bitrix-portal`

Manage Bitrix24 portal rows directly in the database (PostgreSQL only). GoClaw expects a `bitrix_portals` row to exist before an operator runs the OAuth install flow at `/bitrix24/install`; this command seeds and maintains that row without requiring raw SQL access.

> Credentials are encrypted at rest using `GOCLAW_ENCRYPTION_KEY`. If the key is unset, the command warns and stores credentials unencrypted.

### `bitrix-portal create`

Create a `bitrix_portals` row with OAuth credentials.

```bash
goclaw bitrix-portal create \
  --tenant-id <uuid> \
  --name <portal> \
  --domain tamgiac.bitrix24.com \
  --client-id <client_id> \
  --client-secret <client_secret>
```

| Flag | Description |
|------|-------------|
| `--tenant-id` | Tenant UUID this portal belongs to (required) |
| `--name` | Short portal name, referenced by `channel_instance.config.portal` (required) |
| `--domain` | Bitrix24 portal host, e.g. `tamgiac.bitrix24.com` (required) |
| `--client-id` | Bitrix24 application `client_id` / `application_id` (required) |
| `--client-secret` | Bitrix24 application `client_secret` / application key (required) |

### `bitrix-portal list`

List `bitrix_portals` rows, optionally scoped to one tenant.

```bash
goclaw bitrix-portal list
goclaw bitrix-portal list --tenant-id <uuid>
```

| Flag | Description |
|------|-------------|
| `--tenant-id` | Filter to one tenant UUID (optional) |

### `bitrix-portal update-credentials`

Replace `client_id`/`client_secret` on an existing portal row. Use when rotating a client secret or migrating from a local app to a marketplace app. The OAuth state token is cleared by default, since state minted under the old credentials cannot refresh under the new ones.

```bash
goclaw bitrix-portal update-credentials \
  --tenant-id <uuid> --name <portal> \
  --client-id <client_id> --client-secret <client_secret>
```

| Flag | Description |
|------|-------------|
| `--tenant-id` | Tenant UUID this portal belongs to (required) |
| `--name` | Portal name to update (required) |
| `--client-id` | New Bitrix24 application `client_id` (required) |
| `--client-secret` | New Bitrix24 application `client_secret` (required) |
| `--keep-state` | Keep the existing OAuth state token (only safe when rotating the secret of the SAME application) |

### `bitrix-portal set-public-url`

Backfill the gateway-public URL used to register Bitrix24 imbot event handlers. A one-shot operation for portals installed before automatic public-URL capture existed.

```bash
goclaw bitrix-portal set-public-url \
  --tenant-id <uuid> --name <portal> \
  --url https://goclaw.example.com
```

| Flag | Description |
|------|-------------|
| `--tenant-id` | Tenant UUID this portal belongs to (required) |
| `--name` | Portal name (required) |
| `--url` | Gateway public URL, e.g. `https://goclaw.example.com` (required) |

---

## What's Next

- [WebSocket Protocol](/websocket-protocol) — wire protocol reference for the gateway
- [REST API](/rest-api) — HTTP API endpoint listing
- [Config Reference](/config-reference) — full `config.json` schema

<!-- goclaw-source: fabe86b3 | updated: 2026-06-28 -->
