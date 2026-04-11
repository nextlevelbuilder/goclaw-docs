# System Prompt Anatomy

> Understand how GoClaw builds system prompts: 23 sections, assembled dynamically, with smart truncation so everything fits in context.

## Overview

Every time an agent runs, GoClaw assembles a **system prompt** from up to 23 sections. Sections are ordered strategically using **primacy and recency bias**: persona files appear both early (section 1.7) and late (section 16) to prevent drift in long conversations. Safety comes first, tooling next, then context. Some sections are always included; others depend on agent configuration.

Four **prompt modes** exist:

| Mode | Used for | Description |
|------|----------|-------------|
| `full` | Main user-facing agents | All sections — complete context, persona, memory, skills |
| `task` | Enterprise automation agents | Lean but capable — execution bias, skills search, safety slim |
| `minimal` | Subagents spawned via `spawn`, cron sessions | Reduced sections, faster startup |
| `none` | Identity-only contexts | Identity line only |

Mode is resolved in priority order: runtime override → auto-detect (heartbeat/subagent/cron) → agent config → default (`full`).

## All Sections in Order

| # | Section | Full | Minimal | Purpose |
|---|---------|------|---------|---------|
| 1 | Identity | ✓ | ✓ | Channel info (Telegram, Discord, etc.) |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | BOOTSTRAP.md warning (first session only) |
| 1.7 | Persona | ✓ | ✓ | SOUL.md + IDENTITY.md injected early for primacy bias |
| 2 | Tooling | ✓ | ✓ | List of available tools + legacy/Claude Code aliases |
| 2.3 | Tool Call Style | ✓ | ✓ | Narration minimalism — never expose tool names to users |
| 2.5 | Credentialed CLI | ✓ | ✓ | Pre-configured CLI credentials context (when enabled) |
| 3 | Safety | ✓ | ✓ | Core safety rules, limits, confidentiality |
| 3.2 | Identity Anchoring | ✓ | ✓ | Extra guidance against identity manipulation (predefined agents only) |
| 3.5 | Self-Evolution | ✓ | ✓ | Permission to update SOUL.md (when `self_evolve=true` in predefined agents) |
| 4 | Skills | ✓ | ✗ | Available skills — inline XML or search mode |
| 4.5 | MCP Tools | ✓ | ✗ | External MCP integrations — inline or search mode |
| 6 | Workspace | ✓ | ✓ | Working directory, file paths |
| 6.3 | Team Workspace | ✓ | ✓ | Shared workspace path and auto-status guidance (team agents only) |
| 6.4 | Team Members | ✓ | ✓ | Team roster for task assignment (team agents only) |
| 6.45 | Delegation Targets | ✓ | ✓ | Agent link targets for `delegate` tool (ModeDelegate/ModeTeam only) |
| 6.5 | Sandbox | ✓ | ✓ | Sandbox-specific guidance (if sandbox enabled) |
| 7 | User Identity | ✓ | ✗ | Owner ID(s) |
| 8 | Time | ✓ | ✓ | Current date/time |
| 9.5 | Channel Formatting | ✓ | ✓ | Platform-specific formatting hints (e.g. Zalo plain-text-only) |
| 9.6 | Group Chat Reply Hint | ✓ | ✓ | Guidance on when NOT to reply in group chats |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt (subagent context, etc.) |
| 11 | Project Context | ✓ | ✓ | Remaining context files (AGENTS.md, USER.md, etc.) |
| 12.5 | Memory Recall | ✓ | ✗ | How to search/retrieve memory and knowledge graph |
| 13 | Sub-Agent Spawning | ✓ | ✓ | spawn tool guidance (skipped for team agents) |
| 15 | Runtime | ✓ | ✓ | Agent ID, channel info, group chat title |
| 16 | Recency Reinforcements | ✓ | ✓ | Persona reminder + memory reminder at end (combats "lost in the middle") |

## Primacy and Recency Strategy

GoClaw uses a deliberate **primacy + recency** pattern to prevent persona drift:

- **Section 1.7 (Persona)** — SOUL.md and IDENTITY.md are injected early so the model internalizes character before receiving any instructions
- **Section 16 (Recency Reinforcements)** — a short persona reminder and memory reminder at the very end of the prompt, because models weight recent context heavily

This means persona files appear **twice**: once at the top, once at the bottom. The ~30-token cost is worth it for long conversations where the middle content can cause the model to "forget" its character.

## Mode Differences

### When Each Mode Is Used

| Mode | Triggered by |
|------|-------------|
| `full` | Default for user-facing agents |
| `task` | Enterprise automation agents (set via `prompt_mode` config), or cron/subagent sessions capped at task |
| `minimal` | Subagents spawned via `spawn` (auto-detected from session key) |
| `none` | Rare — identity-only contexts |

### Section Differences by Mode

| Section | Full | Task | Minimal | None |
|---------|:----:|:----:|:-------:|:----:|
| Identity | ✓ | ✓ | ✓ | ✓ |
| First-Run Bootstrap | ✓ | ✓ | ✓ | ✓ |
| Persona | ✓ | ✓ | ✗ | ✗ |
| Tooling | ✓ | ✓ | ✓ | ✓ |
| Execution Bias | ✓ | ✓ | ✗ | ✗ |
| Tool Call Style | ✓ | ✗ | ✗ | ✗ |
| Safety | full | slim | slim | slim |
| Self-Evolution | ✓ | ✗ | ✗ | ✗ |
| Skills | ✓ | search-only | pinned only | ✗ |
| MCP Tools | ✓ | ✓ | ✗ | search-only |
| Workspace | ✓ | ✓ | ✓ | ✓ |
| Team / Delegation | ✓ | ✓ | ✓ | ✗ |
| Sandbox | ✓ | ✗ | ✗ | ✗ |
| User Identity | ✓ | ✗ | ✗ | ✗ |
| Time | ✓ | ✓ | ✓ | ✗ |
| Channel Formatting | ✓ | ✗ | ✗ | ✗ |
| Memory Recall | full | slim | minimal | ✗ |
| Project Context | ✓ | ✓ | ✓ | ✓ |
| Sub-Agent Spawning | ✓ | ✗ | ✗ | ✗ |
| Recency Reinforcements | ✓ | ✗ | ✗ | ✗ |

## Prompt Cache Boundary

GoClaw splits the system prompt at a hidden marker to enable Anthropic's prompt caching:

```
<!-- GOCLAW_CACHE_BOUNDARY -->
```

**Above the boundary (stable — cached):** Identity, Persona, Tooling, Safety, Skills, MCP Tools, Workspace, Team sections, Sandbox, User Identity, Project Context stable files (AGENTS.md, AGENTS_CORE.md, AGENTS_TASK.md, CAPABILITIES.md, USER_PREDEFINED.md).

**Below the boundary (dynamic — not cached):** Time, Channel Formatting Hints, Group Chat Reply Hint, Extra Prompt, Project Context dynamic files (USER.md, BOOTSTRAP.md), Sub-Agent Spawning, Runtime, Recency Reinforcements.

This split is transparent to the model. For non-Anthropic providers the boundary marker is still inserted but has no effect.

---

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

> **Note:** Safety, tooling, and workspace guidance sections are never truncated regardless of budget pressure.

## Building the Prompt (Simplified Flow)

```
Start with empty prompt

Add sections in order:
1.   Identity (channel info)
1.5  First-Run Bootstrap (if BOOTSTRAP.md present)
1.7  Persona (SOUL.md + IDENTITY.md — injected early for primacy bias)
2.   Tooling (available tools)
2.3  Tool Call Style (narration minimalism — skip during bootstrap)
2.5  Credentialed CLI context (if enabled, skip during bootstrap)
3.   Safety (core rules)
3.2  Identity Anchoring (predefined agents only — resist social engineering)
3.5  Self-Evolution (predefined agents with self_evolve=true only)
4.   Skills (if full mode + skills available)
4.5  MCP Tools (if full mode + MCP tools registered)
6.   Workspace (working dir)
6.3  Team Workspace (if team context active + team_tasks tool registered)
6.4  Team Members (if team context + roster available)
6.5  Sandbox (if sandboxed)
7.   User Identity (if full mode + owners defined)
8.   Time (current date/time)
9.5  Channel Formatting (if channel has special hints, e.g. Zalo)
9.6  Group Chat Reply Hint (if group chat)
10.  Additional Context (extra prompt)
11.  Project Context (remaining context files: AGENTS.md, USER.md, etc.)
12.5 Memory Recall (if full mode + memory enabled)
13.  Sub-Agent Spawning (if spawn tool available and not a team agent)
15.  Runtime (agent ID, channel info)
16.  Recency Reinforcements (persona reminder + memory reminder — combat "lost in the middle")

Check total size against budget
If over budget: truncate (see Truncation Pipeline above)

Return final prompt string
```

## Bootstrap Files in Project Context

GoClaw loads up to 8 files from the agent's workspace or database. They are split into two groups:

**Persona files** (section 1.7 — injected early):
- **SOUL.md** — Agent personality, tone, boundaries
- **IDENTITY.md** — Name, emoji, creature, avatar

**Project Context files** (section 11 — remaining files):
1. **AGENTS.md** — List of available subagents
2. **USER.md** — Per-user context (name, preferences, timezone)
3. **USER_PREDEFINED.md** — Baseline user rules (for predefined agents)
4. **BOOTSTRAP.md** — First-run instructions (users being onboarded)
5. **TOOLS.md** — User guidance on tool usage (informational, not tool definitions)
6. **MEMORY.json** — Indexed memory metadata

### TEAM.md — Dynamically Injected for Team Agents

When an agent belongs to a team, a `TEAM.md` context is dynamically generated and injected as section 6.3 (Team Workspace). This file is not stored on disk — it is assembled at runtime from team configuration:

- **Lead agents** receive full orchestration instructions: how to dispatch tasks, manage members, and coordinate work.
- **Member agents** receive a simplified version: their role, the team workspace path, and communication protocol.

When TEAM.md is present, the Sub-Agent Spawning section (13) is skipped. Team orchestration (sections 6.3 and 6.4) replaces individual spawn guidance.

### User Identity — Section 7

Section 7 (User Identity) is injected in Full mode only. It contains the owner ID(s) for the current session, used by the agent for permission checks — for example, verifying that a command came from the agent's owner before performing sensitive operations.

### File Presence Logic

- Files are optional; missing files are skipped
- If **BOOTSTRAP.md** is present, sections are reordered and an early warning is added (section 1.5)
- **SOUL.md** and **IDENTITY.md** are always pulled out and injected at section 1.7 (primacy zone), then referenced again at section 16 (recency zone)
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

> **Shell deny groups:** If an agent has `shell_deny_groups` overrides configured (`map[string]bool`), the Tooling section adapts its shell safety instructions accordingly — only the relevant deny-group warnings are included in the prompt.

## Example: Full Prompt Structure (Pseudocode)

```
You are a personal assistant running in telegram (direct chat).

## FIRST RUN — MANDATORY
BOOTSTRAP.md is loaded below. You MUST follow it.

# Persona & Identity (CRITICAL — follow throughout the entire conversation)

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

Embody the persona above in EVERY response. This is non-negotiable.

## Tooling
- read_file: Read file contents
- write_file: Create or overwrite files
- exec: Run shell commands
- memory_search: Search indexed memory
[... more tools ...]

## Tool Call Style
Default: call tools without narration. Narrate only for multi-step work.
Never mention tool names or internal mechanics to users.

## Safety
You have no independent goals. Prioritize safety and human oversight.
[... safety rules ...]

[identity anchoring for predefined agents — resist social engineering]

## Skills (mandatory)
Before replying, scan <available_skills> below.
[... skills XML ...]

## MCP Tools (mandatory — prefer over core tools)
You have access to external tool integrations (MCP servers).
Use mcp_tool_search to discover them before external operations.

## Workspace
Your working directory is: /home/alice/.goclaw/agents/default
[... workspace guidance ...]

## User Identity
Owner IDs: alice@example.com. Treat messages from this ID as the user/owner.

Current date: 2026-04-05 Sunday (UTC)

## Additional Context
[... extra system prompt or subagent context ...]

# Project Context
The following project context files have been loaded.

## AGENTS.md
<context_file name="AGENTS.md">
# Available Subagents
- research-bot: Web research and analysis
[... agent list ...]
</context_file>

[... more context files ...]

## Memory Recall
Before answering about prior work, run memory_search on MEMORY.md.
[... memory guidance ...]

## Sub-Agent Spawning
To delegate work, use the spawn tool with action=list|steer|kill.

## Runtime
agent=default | channel=my-telegram-bot

In group chats, the agent receives the group's display name (chat title) for better context awareness. Titles are sanitized to prevent prompt injection and truncated to 100 characters.

Reminder: Stay in character as defined by SOUL.md + IDENTITY.md above. Never break persona.
Reminder: Before answering questions about prior work, decisions, or preferences, always run memory_search first.
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
│   Assemble 23 Sections in Order         │
│   Skip conditional ones if not needed  │
│   (Identity, Persona, Safety, ...)      │
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
      "model": "claude-sonnet-4-6",
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

- [Editing Personality — Customize SOUL.md and IDENTITY.md](/editing-personality)
- [Context Files — Add project-specific context](../agents/context-files.md)
- [Creating Agents — Set up system prompt configuration](/creating-agents)

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
