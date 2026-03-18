# GoClaw Docs Audit Skill

Detect which GoClaw documentation pages need updating when the GoClaw source code changes. Cross-checks accuracy against GoClaw source docs (source of truth).

## Quick Start

```
/goclaw-docs-audit
```

## Usage

| Command | Description |
|---------|-------------|
| `/goclaw-docs-audit` | Audit all changes since last audit (or last commit if first run) |
| `/goclaw-docs-audit HEAD~5..HEAD` | Audit a specific commit range |
| `/goclaw-docs-audit HEAD~10..HEAD` | Audit last 10 commits |
| `/goclaw-docs-audit internal/agent/loop.go` | Audit specific file(s) |
| `/goclaw-docs-audit internal/agent/loop.go internal/tools/registry.go` | Audit multiple files |

## What It Does

1. **Identifies changed files** in the GoClaw source repo (resolved via `GOCLAW_SOURCE_PATH` env var, fallback `../goclaw/`)
2. **Maps changes to docs pages** using `mapping.json` (40 glob rules covering all `internal/` packages)
3. **Accuracy check** — compares goclaw-docs content against GoClaw source docs (source of truth) for factual correctness
4. **EN-VI sync check** — detects outdated Vietnamese translations
5. **Generates report** with affected pages, accuracy status, and recommended actions

## Report Output

Reports are saved to `plans/reports/docs-audit-YYYY-MM-DD.md` with three sections:

- **Affected Docs Pages** — which docs need review, grouped by priority (High/Medium/Low)
- **Accuracy Check** — discrepancies between goclaw-docs and `../goclaw/docs/` source of truth
- **EN-VI Sync Status** — which Vietnamese translations are outdated

## Last Audit Tracking

The skill automatically tracks when you last ran an audit via `.last-audit` file (gitignored). When you run `/goclaw-docs-audit` without arguments:
- **First run**: audits the last commit only (`HEAD~1..HEAD`)
- **Subsequent runs**: audits all changes since the previous audit's commit hash

This means you can just run `/goclaw-docs-audit` periodically and it will only show new changes.

## File Structure

```
.claude/skills/goclaw-docs-audit/
├── SKILL.md        # Skill definition and step-by-step instructions
├── mapping.json    # 40 glob rules mapping Go source paths → doc pages
├── .last-audit     # Last audit commit hash (gitignored, auto-generated)
└── README.md       # This file
```

## Mapping Rules

`mapping.json` maps GoClaw source code paths to documentation pages with priority levels:

| Priority | Source Packages | Example Docs |
|----------|----------------|--------------|
| **High** | `agent`, `tools`, `gateway`, `memory`, `tasks`, `migrations` | `agents/*`, `core-concepts/*`, `reference/websocket-protocol.md` |
| **Medium** | `providers`, `channels/*`, `bootstrap`, `config`, `sessions`, `tracing`, `http`, `knowledgegraph` | `providers/*.md`, `channels/*.md`, `deployment/observability.md` |
| **Low** | `scheduler`, `cron`, `sandbox`, `tts`, `skills`, `cache`, `media`, `i18n`, `crypto` | `advanced/scheduling-cron.md`, `advanced/sandbox.md` |

## Source of Truth

The GoClaw source repo's `docs/` directory contains authoritative technical documents. During accuracy checks, the skill compares goclaw-docs user-facing pages against these internal docs:

| GoClaw Internal Doc | Topic |
|---------------------|-------|
| `00-architecture-overview.md` | Overall architecture |
| `01-agent-loop.md` | Agent loop, reasoning |
| `02-providers.md` | LLM providers |
| `03-tools-system.md` | Tools registration & execution |
| `04-gateway-protocol.md` | WebSocket/RPC protocol |
| `05-channels-messaging.md` | Channel integrations |
| `06-store-data-model.md` | Database schema |
| `07-bootstrap-skills-memory.md` | Bootstrap, skills, memory |
| `08-scheduling-cron.md` | Cron & scheduling |
| `09-security.md` | Security & permissions |
| `10-tracing-observability.md` | OpenTelemetry |
| `11-agent-teams.md` | Agent teams |
| `12-extended-thinking.md` | Extended thinking |
| `13-ws-team-events.md` | WebSocket team events |
| `14-skills-runtime.md` | Skills runtime |
| `15-core-skills-system.md` | Core skills |
| `16-skill-publishing.md` | Skill publishing |
| `17-changelog.md` | Changelog |
| `18-http-api.md` | HTTP/REST API |
| `19-websocket-rpc.md` | WebSocket RPC methods |
| `20-api-keys-auth.md` | API keys & auth |

## Prerequisites

- GoClaw source repo must be accessible. The skill resolves the path in this order:
  1. `GOCLAW_SOURCE_PATH` environment variable (set in shell or `.claude/settings.local.json`)
  2. Fallback: `../goclaw/` (assumes `goclaw/` and `goclaw-docs/` share the same parent folder)
- Both repos should have git history available

**Contributor setup** (if goclaw is not at `../goclaw/`):
```bash
export GOCLAW_SOURCE_PATH=/path/to/my/goclaw
```
Or in `.claude/settings.local.json`:
```json
{ "env": { "GOCLAW_SOURCE_PATH": "/path/to/my/goclaw" } }
```

## Examples

### After merging a PR that changes agent logic
```
/goclaw-docs-audit HEAD~1..HEAD
```

### Before a docs release — check all recent changes
```
/goclaw-docs-audit HEAD~20..HEAD
```

### Spot-check specific files you're about to modify
```
/goclaw-docs-audit internal/gateway/handler.go internal/agent/loop.go
```
