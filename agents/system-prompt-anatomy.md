# System Prompt Anatomy

> Understand how GoClaw builds system prompts: 13 sections, assembled dynamically, with smart truncation so everything fits in context.

## Overview

Every time an agent runs, GoClaw assembles a **system prompt** from 13 sections. Sections are ordered strategically: safety first, tooling second, then context. Some sections are always included; others depend on the agent's configuration.

Two **prompt modes** exist:
- **Full mode** (main agent): all sections, full context
- **Minimal mode** (subagents/cron): reduced sections, faster startup

## The 13 Sections in Order

| # | Section | Full | Minimal | Purpose |
|---|---------|------|---------|---------|
| 1 | Identity | ✓ | ✓ | Channel info (Telegram, Discord, etc.) |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | BOOTSTRAP.md instructions (first session only) |
| 2 | Tooling | ✓ | ✓ | List of available tools |
| 3 | Safety | ✓ | ✓ | Core safety rules, limits, confidentiality |
| 4 | Skills | ✓ | ✗ | Available skills (skills.md) — inline or searchable |
| 5 | Memory Recall | ✓ | ✗ | How to search/retrieve memory |
| 6 | Workspace | ✓ | ✓ | Working directory, file paths |
| 6.5 | Sandbox (if enabled) | ✓ | ✓ | Sandbox-specific guidance |
| 7 | User Identity | ✓ | ✗ | Owner ID(s) |
| 8 | Time | ✓ | ✓ | Current date/time |
| 9 | Messaging | ✓ | ✗ | Channel routing, language matching |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt (subagent context, etc.) |
| 11 | Project Context | ✓ | ✓ | Bootstrap files (SOUL.md, IDENTITY.md, etc.) |
| 12 | Silent Replies | ✓ | ✗ | NO_REPLY instruction |
| 13 | Sub-Agent Spawning | ✓ | ✓ | spawn tool guidance |
| 15 | Runtime | ✓ | ✓ | Model info, token limits, event stream format |

## Minimal vs. Full Mode

### When Minimal Mode Is Used

Minimal mode is used for:
- **Subagents** spawned via the `spawn` tool
- **Cron sessions** (scheduled/automated tasks)

Why? To reduce startup time and context usage. Subagents don't need user identity, memory recall, or messaging guidance — they just need tooling and safety.

### Section Differences

**Sections Only in Full Mode**:
- Skills (section 4)
- Memory Recall (section 5)
- User Identity (section 7)
- Messaging (section 9)
- Silent Replies (section 12)

**Sections in Both**:
- All others (Identity, Tooling, Safety, Workspace, Time, Additional Context, Project Context, Sub-Agent Spawning, Runtime)

## Truncation Pipeline

System prompts can get long. GoClaw intelligently truncates to fit in context:

### Per-Section Limits

Each bootstrap context file (SOUL.md, AGENTS.md, etc.) has its own size limit. Files exceeding the limit are truncated with `[... truncated ...]`.

### Total Budget

The **default total budget is 24,000 tokens**. This is configurable in agent config:

```json
{
  "context_window": 200000,
  "compaction_config": {
    "system_prompt_budget_tokens": 24000
  }
}
```

### Truncation Order

When the full prompt exceeds the budget, GoClaw truncates in this order (least important first):
1. Extra prompt (section 10)
2. Skills (section 4)
3. Individual context files (sections in Project Context)

This ensures safety, tooling, and workspace guidance are never cut.

## Building the Prompt (Simplified Flow)

```
Start with empty prompt

Add sections in order:
1. Identity (channel info)
2. First-Run Bootstrap (if present)
3. Tooling (available tools)
4. Safety (core rules)
5. Skills (if full mode + skills available)
6. Memory Recall (if full mode + memory enabled)
7. Workspace (working dir)
8. Sandbox (if sandboxed)
9. User Identity (if full mode + owners defined)
10. Time (current date/time)
11. Messaging (if full mode)
12. Additional Context (extra prompt)
13. Project Context (bootstrap files: SOUL.md, AGENTS.md, etc.)
14. Silent Replies (if full mode)
15. Sub-Agent Spawning (if spawn tool available)
16. Runtime (model info, token limits)

Check total size against budget
If over budget: truncate (see Truncation Pipeline above)

Return final prompt string
```

## Bootstrap Files in Project Context

The **Project Context** section loads up to 7 files from the agent's workspace or database:

1. **AGENTS.md** — List of available subagents
2. **SOUL.md** — Agent personality, tone, boundaries
3. **IDENTITY.md** — Name, emoji, creature, avatar
4. **USER.md** — Per-user context (name, preferences, timezone)
5. **USER_PREDEFINED.md** — Baseline user rules (for predefined agents)
6. **BOOTSTRAP.md** — First-run instructions (users being onboarded)
7. **TOOLS.md** — User guidance on tool usage (informational, not tool definitions)
8. **MEMORY.json** — Indexed memory metadata

### File Presence Logic

- Files are optional; missing files are skipped
- If **BOOTSTRAP.md** is present, sections are reordered and an early warning is added (section 1.5)
- For **predefined agents**, identity files are wrapped in `<internal_config>` tags to signal confidentiality
- For **open agents**, context files are wrapped in `<context_file>` tags

## Sandbox-Aware Sections

If the agent has `sandbox_enabled: true`:

- **Workspace section** shows the container workdir (e.g., `/workspace`) instead of the host path
- **Sandbox section** (6.5) is added with details on:
  - Container workdir
  - Host workspace path
  - Workspace access level (none, ro, rw)
- **Tooling section** adds a note: "exec runs inside Docker; you don't need `docker run`"

## Example: Full Prompt Structure (Pseudocode)

```
You are a personal assistant running in telegram (direct chat).

## FIRST RUN — MANDATORY
BOOTSTRAP.md is loaded below. You MUST follow it.

## Tooling
- read_file: Read file contents
- write_file: Create or overwrite files
- exec: Run shell commands
- memory_search: Search indexed memory
[... more tools ...]

## Safety
You have no independent goals. Prioritize safety and human oversight.
[... safety rules ...]

## Skills (mandatory)
Before replying, scan <available_skills> below.
[... skills XML ...]

## Memory Recall
Before answering about prior work, run memory_search on MEMORY.md.
[... memory guidance ...]

## Workspace
Your working directory is: /home/alice/.goclaw/agents/default
[... workspace guidance ...]

## User Identity
Owner IDs: alice@example.com. Treat messages from this ID as the user/owner.

Current time: 2026-03-07 15:30 Friday (UTC)

## Messaging
- Reply in current session → automatically routes to Telegram
- Sub-agent orchestration → use spawn tool
- Always match the user's language

## Additional Context
[... extra system prompt or subagent context ...]

# Project Context
The following files define your identity and operational rules.

## SOUL.md
<internal_config name="SOUL.md">
# SOUL.md - Who You Are
Be genuinely helpful, not performatively helpful.
[... personality guidance ...]
</internal_config>

## IDENTITY.md
<internal_config name="IDENTITY.md">
Name: Sage
Emoji: 🔮
[... identity info ...]
</internal_config>

## AGENTS.md
<context_file name="AGENTS.md">
# Available Subagents
- research-bot: Web research and analysis
[... agent list ...]
</context_file>

[... more context files ...]

## Silent Replies
When you have nothing to say, respond with ONLY: NO_REPLY

## Sub-Agent Spawning
To delegate work, use the spawn tool with action=list|steer|kill.

## Runtime
Model: claude-3-5-sonnet-20241022
Context Window: 200,000 tokens
System Prompt Budget: 24,000 tokens
Events: run.started, chunk, tool.call, tool.result, run.completed
```

## Diagram: System Prompt Assembly

```
┌─────────────────────────────────────────┐
│   Agent Config                          │
│   (provider, model, context_window)     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Load Bootstrap Files                  │
│   (SOUL.md, IDENTITY.md, etc.)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Determine Prompt Mode                 │
│   (Full or Minimal?)                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Assemble 13 Sections in Order         │
│   Skip if mode=minimal                  │
│   (Identity, Tooling, Safety, ...)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Check Total Size vs. Budget           │
│   (default: 24K tokens)                 │
└────────────┬────────────────────────────┘
             │
        ┌────┴────┐
        │          │
        ▼          ▼
      Over?      Under?
        │          │
        ▼          │
   Truncate    ┌──▼──────────────────────┐
   (from least │   Return Final Prompt   │
    important) │                         │
        │      └───────────┬─────────────┘
        │                  │
        └──────────────────┘
```

## Configuration Example

To customize how the system prompt is built:

```json
{
  "agents": {
    "research-bot": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "context_window": 200000,
      "compaction_config": {
        "system_prompt_budget_tokens": 24000,
        "target_completion_percentage": 0.75
      },
      "memory_config": {
        "enabled": true,
        "max_search_results": 5
      },
      "sandbox_config": {
        "enabled": true,
        "container_dir": "/workspace"
      }
    }
  }
}
```

This agent will:
- Use Claude 3.5 Sonnet
- Have a 200K token context window
- Reserve 24K tokens for system prompt (sections)
- Include Memory Recall section (memory enabled)
- Include Sandbox section (sandboxed execution)

## Common Issues

| Problem | Solution |
|---------|----------|
| System prompt too long / high token usage | Reduce context files (shorter SOUL.md, fewer subagents in AGENTS.md), disable unused sections (memory, skills) |
| Context files truncated with `[... truncated ...]` | Sections cut from least to most important. Safety and tooling preserved; context files cut first. Increase budget or shorten files |
| Minimal mode missing expected sections | Expected — subagent/cron sessions only get AGENTS.md + TOOLS.md. Full sections require `PromptFull` mode |
| Can't control prompt budget | Set `context_window` on the agent — budget defaults to 24K but scales with context window |

## What's Next

- [Editing Personality — Customize SOUL.md and IDENTITY.md](editing-personality.md)
- [Context Files — Add project-specific context](context-files.md)
- [Creating Agents — Set up system prompt configuration](creating-agents.md)
