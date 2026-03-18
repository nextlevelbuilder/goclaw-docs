---
name: goclaw-docs-audit
description: "Detect which GoClaw docs pages need updating when source code changes."
argument-hint: "[commit-range|file1 file2 ...]"
metadata:
  author: goclaw
  version: "2.0.0"
---

# GoClaw Docs Audit

> Detect which GoClaw docs need updating when GoClaw source code changes.
> Cross-check accuracy against GoClaw source docs (source of truth).

## Trigger

`/goclaw-docs-audit` or `/goclaw-docs-audit <commit-range>` or `/goclaw-docs-audit <file1> <file2>`

## Usage

- `/goclaw-docs-audit` — audit all changes since last audit (or last commit if first run)
- `/goclaw-docs-audit HEAD~5..HEAD` — audit specific commit range
- `/goclaw-docs-audit internal/agent/loop.go internal/channels/telegram/bot.go` — audit specific files

## GoClaw Source Path

The skill needs access to the GoClaw source repository. Resolution order:

1. **`GOCLAW_SOURCE_PATH`** environment variable (set in shell or `.claude/settings.local.json`)
2. **Fallback:** `../goclaw/` (assumes `goclaw/` and `goclaw-docs/` share the same parent folder)

If neither resolves to a valid git repo, ask the user for the path.

**Contributor setup example:**
```bash
export GOCLAW_SOURCE_PATH=/path/to/my/goclaw
```
Or in `.claude/settings.local.json`:
```json
{ "env": { "GOCLAW_SOURCE_PATH": "/path/to/my/goclaw" } }
```

## Instructions

When this skill is triggered, follow these steps exactly:

### Step 0: Resolve GoClaw Source Path

Determine `$GOCLAW_SOURCE` using the resolution order above:
1. Check if `GOCLAW_SOURCE_PATH` env var is set and points to a valid git repo
2. Otherwise check if `../goclaw/` exists and is a valid git repo
3. If neither works, ask the user to set `GOCLAW_SOURCE_PATH`

Use `$GOCLAW_SOURCE` for all subsequent steps where `../goclaw/` was referenced.

### Step 1: Identify Changed Files

- If argument is a commit range (contains `..` or `HEAD`): run `git diff --name-only <range>` in `$GOCLAW_SOURCE`
- If argument is file paths: use those directly
- If no argument:
  1. Read `.claude/skills/goclaw-docs-audit/.last-audit` for the last audit commit hash
  2. If file exists: run `git diff --name-only <last-audit-hash>..HEAD` in `$GOCLAW_SOURCE`
  3. If file doesn't exist (first run): run `git diff --name-only HEAD~1..HEAD` in `$GOCLAW_SOURCE`

### Step 2: Load Mapping Rules

Read `mapping.json` from the same directory as this SKILL.md file.

The mapping also includes `source_of_truth` pointing to `docs/` (relative to `$GOCLAW_SOURCE`) — use those authoritative docs to verify accuracy of goclaw-docs pages.

### Step 3: Match Changed Files to Docs

For each changed file, check if its path matches any `pattern` in the mapping rules (use glob matching). Collect all matched `docs` pages and their `priority`.

### Step 4: Accuracy Check Against Source of Truth

For each matched docs page, cross-reference with the corresponding `$GOCLAW_SOURCE/docs/*.md` file:
- Read the relevant goclaw internal doc (e.g., `01-agent-loop.md` for agent changes)
- Compare key facts (config fields, API signatures, behavior descriptions) against what the goclaw-docs page says
- Flag any discrepancies as "Needs accuracy update"

Source of truth mapping (`$GOCLAW_SOURCE/docs/`):
| GoClaw Doc | Covers |
|---|---|
| `00-architecture-overview.md` | Overall architecture, component relationships |
| `01-agent-loop.md` | Agent loop, reasoning, tool execution |
| `02-providers.md` | LLM provider integrations |
| `03-tools-system.md` | Tool registration, execution, built-in tools |
| `04-gateway-protocol.md` | WebSocket/RPC protocol |
| `05-channels-messaging.md` | Channel integrations |
| `06-store-data-model.md` | Database schema, data model |
| `07-bootstrap-skills-memory.md` | Bootstrap, skills, memory systems |
| `08-scheduling-cron.md` | Cron jobs, scheduling |
| `09-security.md` | Security, auth, permissions |
| `10-tracing-observability.md` | OpenTelemetry, tracing |
| `11-agent-teams.md` | Agent teams, delegation |
| `12-extended-thinking.md` | Extended thinking feature |
| `13-ws-team-events.md` | WebSocket team events |
| `14-skills-runtime.md` | Skills runtime |
| `15-core-skills-system.md` | Core skills system |
| `16-skill-publishing.md` | Skill publishing |
| `17-changelog.md` | Changelog |
| `18-http-api.md` | HTTP/REST API |
| `19-websocket-rpc.md` | WebSocket RPC methods |
| `20-api-keys-auth.md` | API keys, authentication |

### Step 5: Check EN-VI Sync Status

For each matched docs page in the goclaw-docs repo:
- Get last modification date of the EN file (e.g., `getting-started/quick-start.md`)
- Get last modification date of the VI file (e.g., `vi/getting-started/quick-start.md`)
- If VI is older than EN, or VI doesn't exist: mark as "Outdated"
- If VI is same date or newer: mark as "Synced"

Use `git log -1 --format=%cd --date=short -- <file>` to get last modification dates.

### Step 6: Generate Report

Create a markdown report with this format:

```markdown
# GoClaw Docs Audit Report

**GoClaw changes:** `<commit-range or file list>`
**Date:** YYYY-MM-DD

## Affected Docs Pages

| Changed File | Affected Docs | Priority |
|---|---|---|
| internal/agent/loop.go | agents/*, core-concepts/agents-explained.md | High |

## Accuracy Check (vs $GOCLAW_SOURCE/docs/)

| Docs Page | Source of Truth | Status | Notes |
|---|---|---|---|
| agents/creating-agents.md | 01-agent-loop.md | Accurate | — |
| core-concepts/tools-overview.md | 03-tools-system.md | Discrepancy | Missing new tool type "x" |

## EN-VI Sync Status

| EN Page | Last EN Update | Last VI Update | Status |
|---|---|---|---|
| getting-started/quick-start.md | 2026-03-07 | 2026-03-01 | Outdated |

## Recommended Actions
1. Review `agents/creating-agents.md` — agent creation flow changed
2. Fix accuracy: `core-concepts/tools-overview.md` missing new tool type
3. Sync VI translation for `getting-started/quick-start.md`
```

### Step 7: Save Report

Save to `{goclaw-docs-root}/plans/reports/docs-audit-{YYYY-MM-DD}.md` or to the reports path provided by session context.

### Step 8: Update Last Audit Marker

After saving the report, record the current HEAD commit hash of `$GOCLAW_SOURCE` so the next no-argument run starts from here:

```bash
cd $GOCLAW_SOURCE && git rev-parse HEAD > <goclaw-docs-root>/.claude/skills/goclaw-docs-audit/.last-audit
```

The `.last-audit` file contains a single line: the commit hash. This file is gitignored.

## Key Rules

- GoClaw source path is resolved via `GOCLAW_SOURCE_PATH` env var, fallback to `../goclaw/` (assumes same parent folder)
- `$GOCLAW_SOURCE/docs/` is the **source of truth** for feature accuracy
- Docs live in `goclaw-docs/` (EN at root, VI under `vi/`)
- If no GoClaw repo found, ask user for the path
- Always show: affected docs, accuracy check, AND EN-VI sync status
- Group results by priority (High → Medium → Low)
