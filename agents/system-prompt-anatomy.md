# System Prompt Anatomy

> Understand how GoClaw builds system prompts: 19+ sections, assembled dynamically, with smart truncation so everything fits in context.

## Overview

Every time an agent runs, GoClaw assembles a **system prompt** from up to 19 sections. Sections are ordered strategically using **primacy and recency bias**: persona files appear both early (section 1.7) and late (section 16) to prevent drift in long conversations. Safety comes first, tooling next, then context. Some sections are always included; others depend on agent configuration.

Two **prompt modes** exist:
- **Full mode** (main agent): all sections, full context
- **Minimal mode** (subagents/cron): reduced sections, faster startup

## All Sections in Order

| # | Section | Full | Minimal | Purpose |
|---|---------|------|---------|---------|
| 1 | Identity | ✓ | ✓ | Channel info (Telegram, Discord, etc.) |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | BOOTSTRAP.md warning (first session only) |
| 1.7 | Persona | ✓ | ✓ | SOUL.md + IDENTITY.md injected early for primacy bias |
| 2 | Tooling | ✓ | ✓ | List of available tools + legacy/Claude Code aliases |
| 3 | Safety | ✓ | ✓ | Core safety rules, limits, confidentiality |
| 3.2 | Identity Anchoring | ✓ | ✓ | Extra guidance against identity manipulation (predefined agents only) |
| 3.5 | Self-Evolution | ✓ | ✓ | Permission to update SOUL.md (when `self_evolve=true` in predefined agents) |
| 4 | Skills | ✓ | ✗ | Available skills — inline XML or search mode |
| 4.5 | MCP Tools | ✓ | ✗ | External MCP integrations — inline or search mode |
| 5 | Memory Recall | ✓ | ✗ | How to search/retrieve memory and knowledge graph |
| 6 | Workspace | ✓ | ✓ | Working directory, file paths |
| 6.5 | Sandbox | ✓ | ✓ | Sandbox-specific guidance (if sandbox enabled) |
| 7 | User Identity | ✓ | ✗ | Owner ID(s) |
| 8 | Time | ✓ | ✓ | Current date/time |
| 9 | Messaging | ✓ | ✗ | Channel routing, language matching |
| 9.5 | Channel Formatting | ✓ | ✓ | Platform-specific formatting hints (e.g. Zalo plain-text-only) |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt (subagent context, etc.) |
| 11 | Project Context | ✓ | ✓ | Remaining context files (AGENTS.md, USER.md, etc.) |
| 12 | Silent Replies | ✓ | ✗ | NO_REPLY instruction |
| 13 | Sub-Agent Spawning | ✓ | ✓ | spawn tool guidance |
| 15 | Runtime | ✓ | ✓ | Agent ID, channel info |
| 16 | Recency Reinforcements | ✓ | ✓ | Persona reminder + memory reminder at end (combats "lost in the middle") |

## Primacy and Recency Strategy

GoClaw uses a deliberate **primacy + recency** pattern to prevent persona drift:

- **Section 1.7 (Persona)** — SOUL.md and IDENTITY.md are injected early so the model internalizes character before receiving any instructions
- **Section 16 (Recency Reinforcements)** — a short persona reminder and memory reminder at the very end of the prompt, because models weight recent context heavily

This means persona files appear **twice**: once at the top, once at the bottom. The ~30-token cost is worth it for long conversations where the middle content can cause the model to "forget" its character.

## Minimal vs. Full Mode

### When Minimal Mode Is Used

Minimal mode is used for:
- **Subagents** spawned via the `spawn` tool
- **Cron sessions** (scheduled/automated tasks)

Why? To reduce startup time and context usage. Subagents don't need user identity, memory recall, or messaging guidance — they just need tooling and safety.

### Section Differences

**Sections Only in Full Mode**:
- Skills (section 4)
- MCP Tools (section 4.5)
- Memory Recall (section 5)
- User Identity (section 7)
- Messaging (section 9)
- Silent Replies (section 12)

**Sections in Both**:
- All others (Identity, First-Run Bootstrap, Persona, Tooling, Safety, Identity Anchoring, Self-Evolution, Workspace, Sandbox, Time, Channel Formatting, Additional Context, Project Context, Sub-Agent Spawning, Runtime, Recency Reinforcements)

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
1.   Identity (channel info)
1.5  First-Run Bootstrap (if BOOTSTRAP.md present)
1.7  Persona (SOUL.md + IDENTITY.md — injected early for primacy bias)
2.   Tooling (available tools)
3.   Safety (core rules)
3.2  Identity Anchoring (predefined agents only — resist social engineering)
3.5  Self-Evolution (predefined agents with self_evolve=true only)
4.   Skills (if full mode + skills available)
4.5  MCP Tools (if full mode + MCP tools registered)
5.   Memory Recall (if full mode + memory enabled)
6.   Workspace (working dir)
6.5  Sandbox (if sandboxed)
7.   User Identity (if full mode + owners defined)
8.   Time (current date/time)
9.   Messaging (if full mode)
9.5  Channel Formatting (if full mode + channel has special hints, e.g. Zalo)
10.  Additional Context (extra prompt)
11.  Project Context (remaining context files: AGENTS.md, USER.md, etc.)
12.  Silent Replies (if full mode)
13.  Sub-Agent Spawning (if spawn tool available)
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
(Legacy aliases: read → read_file, write → write_file, edit → edit)
(Claude Code aliases: Read → read_file, Write → write_file, Edit → edit, ...)

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
The following project context files have been loaded.

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
agent=default | channel=my-telegram-bot

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
│   Assemble 19+ Sections in Order        │
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

- [Editing Personality — Customize SOUL.md and IDENTITY.md](#editing-personality)
- [Context Files — Add project-specific context](#context-files)
- [Creating Agents — Set up system prompt configuration](#creating-agents)

<!-- goclaw-source: 120fc2d | updated: 2026-03-18 -->
