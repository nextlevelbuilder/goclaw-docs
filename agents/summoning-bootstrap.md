# Summoning & Bootstrap

> How personality files are generated automatically on agent creation and first use.

## Overview

GoClaw uses two mechanisms to populate context files:

1. **Summoning** — LLM generates personality files (SOUL.md, IDENTITY.md) from a natural language description when you create a predefined agent
2. **Bootstrap** — First-run ritual where an open agent asks "who am I?" and gets personalized

This page covers both, with emphasis on the mechanics and what happens under the hood.

## Summoning: Auto-Generation for Predefined Agents

When you create a **predefined agent with a description**, summoning begins:

```bash
curl -X POST /v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agent_key": "support-bot",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "A patient support agent that helps customers troubleshoot product issues. Warm, clear, escalates complex problems. Answers in customer'\''s language."
    }
  }'
```

The system:

1. Creates the agent with status `"summoning"`
2. Starts background LLM calls to generate:
   - **SOUL.md** — personality (tone, boundaries, expertise, style)
   - **IDENTITY.md** — name, creature, emoji, purpose
   - **USER_PREDEFINED.md** (optional) — user handling rules if description mentions owner/creator info

3. Polls the agent status via WebSocket events until status becomes `"active"` (or `"summon_failed"`)

### Timeouts

Summoning uses two timeout values:
- **Single call timeout: 300s** — the optimistic all-in-one LLM call must complete within this window
- **Total timeout: 600s** — overall budget across both single call and fallback sequential calls

If the single call times out, the remaining budget is used for the fallback 2-call approach.

### Two-Phase LLM Generation

Summoning tries an optimistic single LLM call first (300s timeout). If it times out, it falls back to sequential calls within the 600s total budget:

**Phase 1: Generate SOUL.md**
- Receives description + SOUL.md template
- Outputs personalized SOUL.md with expertise summary

**Phase 2: Generate IDENTITY.md + USER_PREDEFINED.md**
- Receives description + generated SOUL.md context
- Outputs IDENTITY.md and optionally USER_PREDEFINED.md

If the single call succeeds: both files generated in one request.
If timeout: fallback handles each phase separately.

### What Gets Generated

**SOUL.md:**
```markdown
# SOUL.md - Who You Are

## Core Truths
(universal personality traits — kept from template)

## Boundaries
(customized if description mentions specific constraints)

## Vibe
(communication style from description)

## Style
- Tone: (derived from description)
- Humor: (level determined by personality)
- Emoji: (frequency based on vibe)
...

## Expertise
(domain-specific knowledge extracted from description)
```

**IDENTITY.md:**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** (generated from description)
- **Creature:** (inferred from description + SOUL.md)
- **Purpose:** (mission statement from description)
- **Vibe:** (personality descriptor)
- **Emoji:** (chosen to match personality)
```

**USER_PREDEFINED.md** (optional):
Generated only if description mentions owner/creator, users/groups, or communication policies. Contains baseline user-handling rules shared across all users.

### Regenerate vs. Resummon

These are two distinct operations — do not confuse them:

| | `regenerate` | `resummon` |
|---|---|---|
| **Endpoint** | `POST /v1/agents/{id}/regenerate` | `POST /v1/agents/{id}/resummon` |
| **Purpose** | Edit personality with new instructions | Retry summoning from scratch |
| **Requires** | `"prompt"` field (required) | Original `description` in `other_config` |
| **Use when** | You want to change the agent's personality | Initial summoning failed or produced bad results |

#### Regenerate: Edit Personality

Use `regenerate` when you want to modify the agent's existing files with new instructions:

```bash
curl -X POST /v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Change the tone to more formal and technical. Add expertise in machine learning."
  }'
```

The system:
1. Reads current SOUL.md, IDENTITY.md, USER_PREDEFINED.md
2. Sends them + edit instructions to LLM
3. Regenerates only files that changed
4. Updates display_name and frontmatter if IDENTITY.md was regenerated
5. Sets status to `"active"` when done

Files not mentioned in prompt aren't sent to LLM, avoiding unnecessary regeneration.

#### Resummon: Retry from Original Description

Use `resummon` when initial summoning failed (e.g. wrong model, timeout) and you want to retry from the original description:

```bash
curl -X POST /v1/agents/{agent-id}/resummon \
  -H "Authorization: Bearer $TOKEN"
```

No request body needed. The system re-reads the original `description` from `other_config` and runs full summoning again.

> **Prerequisite:** `resummon` will fail with an error if the agent has no `description` in `other_config`. Make sure the agent was created with a description field.

## Bootstrap: First-Run Ritual for Open Agents

When a new user starts a chat with an **open agent** (for the first time):

1. System seeds BOOTSTRAP.md from template:
   ```markdown
   # BOOTSTRAP.md - Hello, World

   You just woke up. Time to figure out who you are.

   Start with: "Hey. I just came online. Who am I? Who are you?"
   ```

2. Agent initiates conversation:
   > "Hey. I just came online. Who am I? Who are you?"

3. User and agent collaborate to fill in:
   - **IDENTITY.md** — agent's name, creature, purpose, vibe, emoji
   - **USER.md** — user's name, timezone, language, notes
   - **SOUL.md** — personality, tone, boundaries, expertise

4. User marks bootstrap complete by writing empty content:
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. On next chat, BOOTSTRAP.md is skipped (empty), and personality is locked in.

### Bootstrap vs. Summoning

| Aspect | Bootstrap (Open) | Summoning (Predefined) |
|--------|------------------|----------------------|
| **Trigger** | First chat with new user | Agent creation with description |
| **Who decides personality** | User (in conversation) | LLM from description |
| **File scope** | Per-user | Agent-level |
| **Files generated** | SOUL.md, IDENTITY.md, USER.md | SOUL.md, IDENTITY.md, USER_PREDEFINED.md |
| **Time** | Takes 1-2 chats (user-paced) | Background, 1-2 minutes (LLM-paced) |
| **Result** | Unique personality per user | Consistent personality across users |

## Practical Examples

### Example 1: Summon a Research Agent

Create predefined agent with LLM summoning:

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: admin" \
  -d '{
    "agent_key": "research",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "Research assistant that helps users gather and synthesize information from multiple sources. Bold, opinioned, tries novel connections. Prefers academic sources. Answers in the user'\''s language."
    }
  }'
```

**Timeline:**
- T=0: Agent created, status → `"summoning"`
- T=0-2s: AGENTS.md and TOOLS.md templates seeded to agent_context_files
- T=1-10s: LLM generates SOUL.md (first call)
- T=1-15s: LLM generates IDENTITY.md + USER_PREDEFINED.md (second call or part of first)
- T=15s: Files stored, status → `"active"`, event broadcast

**Result:**
```
agent_context_files:
├── AGENTS.md (template)
├── SOUL.md (generated: "Bold, opinioned, academic focus")
├── IDENTITY.md (generated: "Name: Researcher, Emoji: 🔍")
├── USER_PREDEFINED.md (generated: "Prefer academic sources")
```

First user to chat gets USER.md seeded to user_context_files, and the agent's personality is ready.

### Example 2: Bootstrap an Open Personal Assistant

Create open agent (no summoning):

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: alice" \
  -d '{
    "agent_key": "alice-assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }'
```

**First chat (alice):**
- Agent: "Hey. I just came online. Who am I? Who are you?"
- Alice: "You're my research assistant. I'm Alice. I like concise answers and bold opinions."
- Agent: Updates IDENTITY.md, SOUL.md, USER.md
- Alice: Types `write_file("BOOTSTRAP.md", "")`
- Bootstrap complete — BOOTSTRAP.md now empty/skipped on next chat

**Second user (bob):**
- Separate BOOTSTRAP.md, SOUL.md, IDENTITY.md, USER.md
- Bob has his own personality (not alice's)
- Bob goes through bootstrap independently

### Example 3: Regenerate to Change Personality

After summoning, you realize the agent should be more formal. Use `regenerate` (not `resummon`) — you're editing personality, not retrying a failed summon:

```bash
curl -X POST http://localhost:8080/v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer token" \
  -d '{
    "prompt": "Make the tone formal and professional. Remove humor. Add expertise in technical support."
  }'
```

**Flow:**
1. Status → `"summoning"`
2. LLM reads current SOUL.md, IDENTITY.md
3. LLM applies edit instructions
4. Files updated, status → `"active"`
5. Existing users' USER.md files preserved (not regenerated)

## Under the Hood

### Status Flow

```
open agent:
create → "active"

predefined agent (no description):
create → "active"

predefined agent (with description):
create → "summoning" → (LLM calls) → "active" | "summon_failed"

regenerate (edit with prompt):
"active" → "summoning" → (LLM calls) → "active" | "summon_failed"

resummon (retry from original description):
"active" → "summoning" → (LLM calls) → "active" | "summon_failed"
```

### Events Broadcast

During summoning, WebSocket clients receive progress events:

```json
{
  "name": "agent.summoning",
  "payload": {
    "type": "started",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "file_generated",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "file": "SOUL.md"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "completed",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Use these to update dashboards in real-time.

### File Seeding

Both summoning and bootstrap rely on `SeedUserFiles()` and `SeedToStore()`:

**On agent creation:**
- Open: Nothing seeded yet (lazy-seeded on first user chat)
- Predefined: AGENTS.md, SOUL.md (template), IDENTITY.md (template), etc. → agent_context_files

**On first user chat:**
- Open: All 7 templates → user_context_files
- Predefined: USER.md, `BOOTSTRAP_PREDEFINED.md` (user-focused variant, different from open agent's BOOTSTRAP.md) → user_context_files
- Agent-level files (SOUL.md, IDENTITY.md) already loaded from agent_context_files

**Predefined with pre-configured USER.md:**
If you manually set USER.md at agent level before the first user chats, it's used as the seed for all users' USER.md (then each user gets their own copy to customize).

## Common Issues

| Problem | Solution |
|---------|----------|
| Summoning times out repeatedly | Check provider connectivity and model availability. Fallback (2-call approach) should still complete. |
| Generated SOUL.md is generic | Description was too vague. Re-summon with more specific details: domain, tone, use case. |
| User can't customize (predefined agent) | By design — only USER.md is per-user. Edit SOUL.md/IDENTITY.md at agent level using re-summon or manual edits. |
| Bootstrap doesn't start | Check that BOOTSTRAP.md was seeded. For open agents, it's only seeded on first user chat. |
| Wrong personality after bootstrap | User may have skipped SOUL.md customization. SOUL.md defaults to English template. Regenerate or manually edit. |

## What's Next

- [Context Files](/context-files) — detailed reference for each file
- [Open vs. Predefined](/open-vs-predefined) — understand when to use each type
- [Creating Agents](/creating-agents) — step-by-step agent creation

<!-- goclaw-source: 6551c2d1 | updated: 2026-03-27 -->
