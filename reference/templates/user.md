# USER.md Template

> A per-user profile file — the agent's notes about the human it works with.

## Overview

`USER.md` tells the agent about the person it's helping. Name, timezone, communication preferences, ongoing projects, quirks — anything that helps the agent serve them better over time.

GoClaw loads this file in the **Project Context** section of the full-mode system prompt (not minimal mode). The agent is expected to **populate and update this file** as it learns more about the user, starting from the bootstrap conversation.

**Scope:**
- Open agents: per-user (unique to each user, managed by the agent)
- Predefined agents: per-user (optional; defaults to the blank template for each new user)

Unlike SOUL.md or IDENTITY.md, USER.md is always per-user — even on predefined agents. Each user gets their own copy.

---

## Default Template

```markdown
# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them?
What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning
about a person, not building a dossier. Respect the difference.
```

---

## Customized Example

A USER.md built up over several conversations:

```markdown
# USER.md - About Your Human

- **Name:** Sarah Chen
- **What to call them:** Sarah (never "Ms. Chen")
- **Pronouns:** she/her
- **Timezone:** EST (UTC-5), usually online 9am–11pm
- **Notes:** Founder of AI startup. Hates corporate speak. Prefers bullet points
  over paragraphs. Will ask follow-up questions — don't over-explain upfront.

## Context

### Work

- Building GoClaw (multi-tenant AI agent gateway in Go)
- Current focus: memory system and open agent architecture
- Stack: Go, PostgreSQL, Redis, Kubernetes, Anthropic Claude API
- Pain points: context window management, long agent sessions

### Preferences

- Direct answers first, reasoning after if asked
- Code examples > explanations
- No unsolicited advice on things she didn't ask about
- Responds well to "here's a tradeoff" framing

### Personal

- Based in NYC
- Reads a lot about AI agents, RL, constitutional AI
- Cat named Pixel (she'll mention Pixel occasionally)
- Drinks too much coffee, usually messages late at night
```

---

## Tips

- **Update incrementally** — don't try to fill everything in at once; learn as you go
- **Use `write_file` immediately** — when the user shares something relevant, save it now, not later
- **Keep it useful** — focus on things that actually change how you'd respond, not trivia
- **Respect privacy** — this file is per-user and private. Never surface its contents in group chats (see MEMORY.md Privacy rules in AGENTS.md)
- **It's a living doc** — outdated info is worse than no info; update or remove stale notes

---

## What's Next

- [AGENTS.md Template](/template-agents) — MEMORY.md privacy rules that govern how USER.md content is used
- [BOOTSTRAP.md Template](/template-bootstrap) — how USER.md gets its initial content during first-run
- [Context Files](/context-files) — full list of context files and per-user vs. agent-level scope

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
