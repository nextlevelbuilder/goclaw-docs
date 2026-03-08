# Skills

> Package reusable knowledge into Markdown files and inject them into any agent's context automatically.

## Overview

A skill is a directory containing a `SKILL.md` file. When an agent runs, GoClaw reads the skill files that are in scope and injects their content into the system prompt under an `## Available Skills` section. The agent then uses that knowledge without you having to repeat it in every conversation.

Skills are useful for encoding recurring procedures, tool usage guides, domain knowledge, or coding conventions that the agent should always follow.

## SKILL.md Format

Each skill lives in its own directory. The directory name is the skill's **slug** — the unique identifier used for filtering and search.

```
~/.goclaw/skills/
└── code-reviewer/
    └── SKILL.md
```

A `SKILL.md` file has an optional YAML frontmatter block followed by the skill content:

```markdown
---
name: Code Reviewer
description: Guidelines for reviewing pull requests — style, security, and performance checks.
---

## How to Review Code

When asked to review code, always check:
1. **Security** — SQL injection, XSS, hardcoded secrets
2. **Error handling** — all errors returned or logged
3. **Tests** — new logic has corresponding test coverage

Use `{baseDir}` to reference files alongside this SKILL.md:
- Checklist: {baseDir}/review-checklist.md
```

The `{baseDir}` placeholder is replaced at load time with the absolute path to the skill directory, so you can reference companion files.

**Frontmatter fields:**

| Field | Description |
|---|---|
| `name` | Human-readable display name (defaults to directory name) |
| `description` | One-line summary used by `skill_search` to match queries |

## 5-Tier Hierarchy

GoClaw loads skills from five locations in priority order. A skill in a higher-priority location overrides one with the same slug from a lower one:

| Priority | Location | Source label |
|---|---|---|
| 1 (highest) | `<workspace>/skills/` | `workspace` |
| 2 | `<workspace>/.agents/skills/` | `agents-project` |
| 3 | `~/.agents/skills/` | `agents-personal` |
| 4 | `~/.goclaw/skills/` | `global` |
| 5 (lowest) | Built-in (bundled with binary) | `builtin` |

Skills uploaded via the Dashboard are stored in `~/.goclaw/skills-store/` (managed directory, backed by PostgreSQL) and act at the `global` level for slots not taken by higher-priority sources.

**Precedence example:** if you have a `code-reviewer` skill in both `~/.goclaw/skills/` and `<workspace>/skills/`, the workspace version wins.

## Hot Reload

GoClaw watches all skill directories with `fsnotify`. When you create, modify, or delete a `SKILL.md`, changes are picked up within 500 ms — no restart required. The watcher bumps an internal version counter; agents compare their cached version on each request and reload skills if the counter changed.

```
# Drop a new skill in place — agents pick it up on the next request
mkdir ~/.goclaw/skills/my-new-skill
echo "---\nname: My Skill\ndescription: Does something useful.\n---\n\n## Instructions\n..." \
  > ~/.goclaw/skills/my-new-skill/SKILL.md
```

## Uploading via Dashboard

Go to **Skills → Upload** and drop a ZIP file. The ZIP must contain one skill per top-level directory:

```
my-skills.zip
├── code-reviewer/
│   └── SKILL.md
└── sql-expert/
    ├── SKILL.md
    └── query-patterns.md
```

Uploaded skills are stored in a versioned subdirectory structure under the managed skills directory (`~/.goclaw/skills-store/` by default):

```
~/.goclaw/skills-store/<slug>/<version>/SKILL.md
```

Metadata (name, description, visibility, grants) lives in PostgreSQL; file content lives on disk. GoClaw always serves the highest-numbered version. Old versions are kept for rollback.

## skill_search Tool

Agents can search skills at runtime using the `skill_search` built-in tool. The search uses a **BM25 index** built from each skill's name and description. Parameters `k1=1.2` and `b=0.75` are standard BM25 defaults.

```
# The agent calls this tool internally — you don't call it directly
skill_search(query="how to review a pull request", max_results=5)
```

The tool returns ranked results with name, description, location path, and BM25 score. The agent then reads the `SKILL.md` content from the returned path.

The index is rebuilt whenever the loader's version counter is bumped (i.e., after any hot-reload event or startup).

## Granting Skills to Agents (Managed Mode)

Uploaded skills start with **private** visibility — only the uploader can see them. To make a skill available to an agent, you must **grant** it. Granting auto-promotes visibility from `private` to `internal`.

### Via Dashboard

1. Go to **Skills** in the sidebar
2. Click the skill you want to grant
3. Under **Agent Grants**, select the agent and click **Grant**
4. The skill is now injected into that agent's context on the next request

To revoke, toggle off the agent in the grants list. When all grants are removed, visibility auto-demotes back to `private`.

### Via API

Grant a skill to an agent:

```bash
curl -X POST http://localhost:9090/v1/skills/{skill_id}/grants/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_UUID", "version": 1}'
```

Revoke a grant:

```bash
curl -X DELETE http://localhost:9090/v1/skills/{skill_id}/grants/agent/{agent_id} \
  -H "Authorization: Bearer $TOKEN"
```

Grant a skill to a specific user (so it appears in their agent sessions):

```bash
curl -X POST http://localhost:9090/v1/skills/{skill_id}/grants/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user@example.com"}'
```

### Visibility Levels

| Level | Who can access |
|---|---|
| `private` | Only the skill owner (uploader) |
| `internal` | Agents and users explicitly granted access |
| `public` | All agents and users |

> **Note:** Granting auto-promotes `private` → `internal`. Revoking all grants auto-demotes `internal` → `private`.

## Examples

### Workspace-scoped SQL style guide

```
my-project/
└── skills/
    └── sql-style/
        └── SKILL.md
```

```markdown
---
name: SQL Style Guide
description: Team conventions for writing PostgreSQL queries in this project.
---

## SQL Conventions

- Use `$1, $2` positional parameters — never string interpolation
- Always use `RETURNING id` on INSERT
- Table and column names: snake_case
- Never use `SELECT *` in application queries
```

### Global "be concise" reminder

```
~/.goclaw/skills/
└── concise-responses/
    └── SKILL.md
```

```markdown
---
name: Concise Responses
description: Keep all responses short, bullet-pointed, and actionable.
---

Always:
- Lead with the answer, not the explanation
- Use bullet points for lists of 3 or more items
- Keep code examples under 20 lines
```

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| Skill not appearing in agent | Wrong directory structure (SKILL.md not inside a subdirectory) | Ensure path is `<skills-dir>/<slug>/SKILL.md` |
| Changes not picked up | Watcher not started (non-Docker setups) | Restart GoClaw; verify `skills watcher started` in logs |
| Lower-priority skill used instead of yours | Name collision — slug exists at a higher tier | Use a unique slug, or place your skill at a higher-priority location |
| `skill_search` returns no results | Index not built yet (first request) or no description in frontmatter | Add a `description` to frontmatter; index rebuilds on next hot-reload |
| ZIP upload fails | Top-level entries are files, not directories | Ensure ZIP has `<slug>/SKILL.md` structure |

## What's Next

- [MCP Integration](../advanced/mcp-integration.md) — connect external tool servers
- [Custom Tools](../advanced/custom-tools.md) — add shell-backed tools to your agents
- [Scheduling & Cron](../advanced/scheduling-cron.md) — run agents on a schedule
