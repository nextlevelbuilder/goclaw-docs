---
name: docs-audit
description: "Detect which GoClaw docs pages need updating when source code changes."
argument-hint: "[commit-range|file1 file2 ...]"
metadata:
  author: clawfamily
  version: "1.0.0"
---

# Docs Audit

> Detect which GoClaw docs need updating when GoClaw source code changes.

## Trigger

`/docs-audit` or `/docs-audit <commit-range>` or `/docs-audit <file1> <file2>`

## Usage

- `/docs-audit` — audit against last commit in `goclaw/` repo
- `/docs-audit HEAD~5..HEAD` — audit specific commit range
- `/docs-audit internal/agent/loop.go internal/channels/telegram/bot.go` — audit specific files

## Instructions

When this skill is triggered, follow these steps exactly:

### Step 1: Identify Changed Files

- If argument is a commit range (contains `..` or `HEAD`): run `git diff --name-only <range>` in the GoClaw repo (`goclaw/` sibling directory or `../goclaw/` from goclaw-docs)
- If argument is file paths: use those directly
- If no argument: run `git diff --name-only HEAD~1..HEAD` in the GoClaw repo

### Step 2: Load Mapping Rules

Read `mapping.json` from the same directory as this SKILL.md file (`~/.claude/skills/docs-audit/mapping.json`).

### Step 3: Match Changed Files to Docs

For each changed file, check if its path matches any `pattern` in the mapping rules (use glob matching). Collect all matched `docs` pages and their `priority`.

### Step 4: Check EN-VI Sync Status

For each matched docs page in the goclaw-docs repo:
- Get last modification date of the EN file (e.g., `getting-started/quick-start.md`)
- Get last modification date of the VI file (e.g., `vi/getting-started/quick-start.md`)
- If VI is older than EN, or VI doesn't exist: mark as "Outdated"
- If VI is same date or newer: mark as "Synced"

Use `git log -1 --format=%cd --date=short -- <file>` to get last modification dates.

### Step 5: Generate Report

Create a markdown report with this format:

```markdown
# Docs Audit Report

**GoClaw changes:** `<commit-range or file list>`
**Date:** YYYY-MM-DD

## Affected Docs Pages

| Changed File | Affected Docs | Priority |
|---|---|---|
| internal/agent/loop.go | agents/*, core-concepts/agents-explained.md | High |

## EN-VI Sync Status

| EN Page | Last EN Update | Last VI Update | Status |
|---|---|---|---|
| getting-started/quick-start.md | 2026-03-07 | 2026-03-01 | Outdated |

## Recommended Actions
1. Review `agents/creating-agents.md` — agent creation flow changed
2. Sync VI translation for `getting-started/quick-start.md`
```

### Step 6: Save Report

Save to `{goclaw-docs-root}/plans/reports/docs-audit-{YYYY-MM-DD}.md` or to the reports path provided by session context.

## Key Rules

- GoClaw source code lives in `goclaw/` (sibling to `goclaw-docs/`)
- Docs live in `goclaw-docs/` (EN at root, VI under `vi/`)
- If no GoClaw repo found, ask user for the path
- Always show both affected docs AND EN-VI sync status
- Group results by priority (High → Medium → Low)
