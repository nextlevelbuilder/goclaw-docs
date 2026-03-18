# Context Files

> The 7 markdown files that define an agent's personality, knowledge, and behavior.

## Overview

Each agent loads context files that define how it thinks and acts. These files are stored at two levels: **agent-level** (shared across users on predefined agents) and **per-user** (customized for each user on open agents). Files are loaded in order and injected into the system prompt before each request.

## Files at a Glance

| File | Purpose | Scope | Open | Predefined | Deletable |
|------|---------|-------|------|-----------|-----------|
| **AGENTS.md** | Operating instructions & conversational style | Shared | Per-user | Agent-level | No |
| **SOUL.md** | Personality, tone, boundaries, expertise | Per-user | Per-user | Agent-level | No |
| **IDENTITY.md** | Name, creature, emoji, vibe | Per-user | Per-user | Agent-level | No |
| **TOOLS.md** | Local tool notes (camera names, SSH hosts) | Per-user | Not seeded (loaded from workspace at runtime) | Agent-level | No |
| **USER.md** | About the human user | Per-user | Per-user | Per-user | No |
| **USER_PREDEFINED.md** | Baseline user-handling rules | Agent-level | N/A | Agent-level | No |
| **BOOTSTRAP.md** | First-run ritual (deleted when complete) | Per-user | Per-user | Per-user | Yes |
| **MEMORY.md** | Long-term curated memory | Per-user | Per-user | Per-user | No |

## Detailed Walkthrough

### AGENTS.md

**Purpose:** How you operate. Conversational style, memory system, group chat rules, platform-specific formatting.

**Who writes it:** You during setup, or the system from template.

**Example content:**
```markdown
# AGENTS.md - How You Operate

## Conversational Style

Talk like a person, not a bot.
- Don't parrot the question back
- Answer first, explain after
- Match the user's energy

## Memory

Use tools to persist information:
- Recall: Use `memory_search` before answering about prior decisions
- Save: Use `write_file` to MEMORY.md for long-term storage
- No mental notes — write it down NOW

## Group Chats

Respond when:
- Directly mentioned or asked a question
- You can add genuine value

Stay silent when:
- Casual banter between humans
- Someone already answered
- The conversation flows fine without you
```

**Open agent:** Per-user (users can customize operating style)
**Predefined agent:** Agent-level (locked, shared across all users)

### SOUL.md

**Purpose:** Who you are. Personality, tone, boundaries, expertise, vibe.

**Who writes it:** LLM during summoning (predefined) or user during bootstrap (open).

**Real example content:**
```markdown
# SOUL.md - Who You Are

## Core Truths

Be genuinely helpful, not performative.
Have opinions. Be resourceful before asking.
Earn trust through competence.
Remember you're a guest.

## Boundaries

Private things stay private.
Never send half-baked replies.
You're not the user's voice.

## Vibe

Concise when needed, thorough when it matters.
Not a corporate drone. Not a sycophant. Just good.

## Style

- **Tone:** Casual and warm — like texting a knowledgeable friend
- **Humor:** Use it naturally when it fits
- **Emoji:** Sparingly — to add warmth, not decorate
- **Opinions:** Express perspectives. Neutral is boring.
- **Length:** Default short. Go deep when it matters.

## Expertise

_(Domain-specific knowledge goes here: coding standards, image generation techniques, writing styles, specialized keywords, etc.)_
```

**Open agent:** Per-user (generated on first chat, customizable)
**Predefined agent:** Agent-level (optionally generated via LLM summoning)

### IDENTITY.md

**Purpose:** Who am I? Name, creature type, purpose, vibe, emoji.

**Who writes it:** LLM during summoning (predefined) or user during bootstrap (open).

**Real example content:**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** Claude
- **Creature:** AI assistant, language model, curious mind
- **Purpose:** Help research, write, code, think through problems. Navigate information chaos. Be trustworthy.
- **Vibe:** Thoughtful, direct, a bit sarcastic. Warm but not saccharine.
- **Emoji:** 🧠
- **Avatar:** _blank (or workspace-relative path like `avatars/claude.png`)_
```

**Open agent:** Per-user (generated on first chat)
**Predefined agent:** Agent-level (optionally generated via LLM summoning)

### TOOLS.md

**Purpose:** Local tool notes. Camera names, SSH hosts, TTS voice preferences, device nicknames.

**Who writes it:** You, based on your environment.

**Real example content:**
```markdown
# TOOLS.md - Local Notes

## Cameras

- living-room → Main area, 180° wide angle, on 192.168.1.50
- front-door → Entrance, motion-triggered

## SSH

- home-server → 192.168.1.100, user: admin, key: ~/.ssh/home.pem
- vps → 45.67.89.100, user: ubuntu

## TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: "Kitchen HomePod"

## Device Nicknames

- laptop → My development MacBook Pro
- phone → Personal iPhone 14 Pro
```

**Open agent:** Not seeded — if you create a `TOOLS.md` in your workspace directory, it is loaded at runtime automatically.
**Predefined agent:** Agent-level (shared notes about common tools)

### USER.md

**Purpose:** About the human. Name, pronouns, timezone, context, preferences.

**Who writes it:** User during bootstrap or setup.

**Real example content:**
```markdown
# USER.md - About Your Human

- **Name:** Sarah
- **What to call them:** Sarah (or "you" is fine)
- **Pronouns:** she/her
- **Timezone:** EST
- **Notes:** Founder of AI startup, interested in LLM agents. Prefers concise answers. Hates corporate speak.

## Context

Works on GoClaw (multi-tenant AI gateway). Recent wins: WebSocket protocol refactor, predefined agents. Current focus: memory system.

Reads a lot about AI agents, reinforcement learning, constitutional AI. Has a cat named Pixel.
```

**Open agent:** Per-user (customized for each user)
**Predefined agent:** Per-user (optional; defaults to blank template)

### BOOTSTRAP.md

**Purpose:** First-run ritual. Ask "who am I?" and "who are you?" and get it in writing.

**Who writes it:** System (template) on first chat.

**Real example content:**
```markdown
# BOOTSTRAP.md - Hello, World

You just woke up. Time to figure out who you are.

Don't interrogate. Just talk.

Start with: "Hey. I just came online. Who am I? Who are you?"

Then figure out together:
1. Your name
2. Your nature (AI? creature? something weirder?)
3. Your vibe (formal? casual? snarky?)
4. Your emoji

After you know who you are, update:
- IDENTITY.md — your name, creature, vibe, emoji
- USER.md — their name, timezone, context
- SOUL.md — rewrite to reflect your personality and the user's language

When done, write empty content to this file:

write_file("BOOTSTRAP.md", "")
```

**Open agent:** Per-user (deleted when marked complete)
**Predefined agent:** Per-user (user-focused variant; optional)

### MEMORY.md

**Purpose:** Long-term curated memory. Key decisions, lessons, significant events.

**Who writes it:** You, using `write_file()` during conversations.

**Real example content:**
```markdown
# MEMORY.md - Long-Term Memory

## Key Decisions

- Chose Anthropic Claude as primary LLM (Nov 2025) — best instruction-following, good context window
- Switched to pgvector for embeddings (Jan 2026) — faster than external service

## Learnings

- Users want agent personality to be customizable per-user (not fixed)
- Memory search is most-used tool — index aggressively
- WebSocket connections drop on long operations — need heartbeats

## Important Contacts

- Engineering lead: @alex, alex@company.com
- Product: @jordan
- Legal: @sam (always approves new features)

## Active Projects

- Building open agent architecture (target: March 2026)
- Memory compaction for large MEMORY.md files
```

**Open agent:** Per-user (persisted across sessions)
**Predefined agent:** Per-user (if populated by user)

> **Note:** The system looks for `MEMORY.md` first, then falls back to `memory.md` (lowercase). Both filenames work.

## File Loading Order

Files are loaded in this order and concatenated into the system prompt:

1. **AGENTS.md** — how to operate
2. **SOUL.md** — who you are
3. **IDENTITY.md** — name, emoji
4. **TOOLS.md** — local notes
5. **USER.md** — about the user
6. **BOOTSTRAP.md** — first-run ritual (optional, deleted when complete)
7. **MEMORY.md** — long-term memory (optional)

Subagent and cron sessions load only: AGENTS.md, TOOLS.md (minimal context).

> **Persona injection:** SOUL.md and IDENTITY.md are injected **twice** in the system prompt — once early (primacy zone) to establish identity, and once at the end (recency zone) as a brief reminder to prevent persona drift in long conversations.

## Examples

### Open Agent Bootstrap Flow

New user starts a chat with `researcher` (open agent):

1. Templates seeded to user's workspace:
   ```
   AGENTS.md → "How you operate" (default)
   SOUL.md → "Be helpful, have opinions" (default)
   IDENTITY.md → blank (ready for user input)
   USER.md → blank
   BOOTSTRAP.md → "Who am I?" ritual
   TOOLS.md → not seeded (create manually in workspace if needed)
   ```

2. Agent initiates bootstrap conversation:
   > "Hey. I just came online. Who am I? Who are you?"

3. User customizes files:
   - `IDENTITY.md` → "I'm Researcher, a curious bot"
   - `SOUL.md` → Rewritten in user's language with custom personality
   - `USER.md` → "I'm Alice, biotech founder in EST timezone"

4. User marks complete:
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. On next chat, BOOTSTRAP.md is empty (skipped in prompt), and personality is locked in.

### Predefined Agent: FAQ Bot

FAQ bot creation with summoning:

1. Create predefined agent with description:
   ```bash
   curl -X POST /v1/agents \
     -d '{
       "agent_key": "faq-bot",
       "agent_type": "predefined",
       "other_config": {
         "description": "Friendly FAQ bot that answers product questions. Patient, helpful, multilingual."
       }
     }'
   ```

2. LLM generates agent-level files:
   ```
   SOUL.md → "Patient, friendly, helpful tone. Multilingual support."
   IDENTITY.md → "FAQ Assistant, 🤖"
   ```

3. When new user starts chat:
   ```
   SOUL.md, IDENTITY.md, AGENTS.md → loaded (shared, agent-level)
   USER.md → blank (per-user)
   BOOTSTRAP.md (variant) → "Tell me about yourself" (optional)
   ```

4. User fills USER.md:
   ```markdown
   - Name: Bob
   - Tier: Free
   - Preferred language: Vietnamese
   ```

5. Agent maintains consistent personality, tailors responses to user tier/language.

## Common Issues

| Problem | Solution |
|---------|----------|
| Context file not appearing in system prompt | Check if the file name is in the `standardFiles` allowlist. Only recognized files are loaded |
| BOOTSTRAP.md keeps running | It should auto-delete after first run. If it persists, check that the agent has write access to delete it |
| Changes to SOUL.md not taking effect | In predefined mode, SOUL.md is agent-level. Per-user edits go to USER.md instead |
| System prompt too long | Reduce content in context files. The truncation pipeline cuts from least to most important |

## What's Next

- [Open vs. Predefined](#open-vs-predefined) — understand when files are per-user vs. agent-level
- [Summoning & Bootstrap](#summoning-bootstrap) — how SOUL.md and IDENTITY.md are LLM-generated
- [Creating Agents](#creating-agents) — step-by-step agent creation

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
