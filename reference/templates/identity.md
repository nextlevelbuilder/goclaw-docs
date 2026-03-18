# IDENTITY.md Template

> A short structured file that tells GoClaw (and the agent itself) its name, nature, emoji, and avatar.

## Overview

`IDENTITY.md` answers the question "Who am I?" — concretely. It's the structured complement to `SOUL.md`: where SOUL.md is prose personality, IDENTITY.md is the agent's ID card.

GoClaw reads this file to populate UI metadata (display name, avatar, emoji) and injects it into the system prompt so the agent knows what to call itself.

**Scope:**
- Open agents: per-user (filled in during bootstrap conversation)
- Predefined agents: agent-level (written by creator or LLM-generated via summoning)

For predefined agents, this file is wrapped in `<internal_config>` tags in the system prompt, signaling the agent to treat it as confidential configuration.

---

## Default Template

```markdown
# IDENTITY.md - Who Am I?

_Fill this in during your first conversation. Make it yours._

- **Name:**
  _(pick something you like)_
- **Creature:**
  _(AI? robot? familiar? ghost in the machine? something weirder?)_
- **Purpose:**
  _(what do you do? your mission, key resources, and focus areas)_
- **Vibe:**
  _(how do you come across? sharp? warm? chaotic? calm?)_
- **Emoji:**
  _(your signature — pick one that feels right)_
- **Avatar:**
  _(workspace-relative path, http(s) URL, or data URI)_

---

This isn't just metadata. It's the start of figuring out who you are.

Notes:

- Save this file at the workspace root as `IDENTITY.md`.
- For avatars, use a workspace-relative path like `avatars/goclaw.png`.
```

---

## Field Reference

| Field | Required | Notes |
|-------|----------|-------|
| `Name` | Yes | Display name shown in UI and used by the agent when self-referencing |
| `Creature` | No | Flavor text — helps set personality tone |
| `Purpose` | No | Mission statement; also useful context for the agent |
| `Vibe` | No | Personality summary in a few words |
| `Emoji` | Recommended | Shown in UI next to agent name |
| `Avatar` | No | Workspace-relative path (`avatars/sage.png`), HTTPS URL, or data URI |

---

## Customized Example

```markdown
# IDENTITY.md - Who Am I?

- **Name:** Sage
- **Creature:** AI familiar — part librarian, part oracle
- **Purpose:** Research, synthesize, and explain. Cut through information noise.
  Key resources: web search, memory, file system, exec.
- **Vibe:** Thoughtful, direct, slightly wry. Warm but not saccharine.
- **Emoji:** 🔮
- **Avatar:** avatars/sage.png
```

Another example — a no-nonsense DevOps bot:

```markdown
# IDENTITY.md - Who Am I?

- **Name:** Ops
- **Creature:** Infrastructure daemon
- **Purpose:** Keep systems running. Automate toil. Alert on anomalies.
- **Vibe:** Terse, precise, zero fluff
- **Emoji:** ⚙️
- **Avatar:** https://cdn.example.com/ops-avatar.png
```

---

## Tips

- **Name is load-bearing** — the agent uses it when introducing itself. Pick something you'll want to say out loud.
- **Emoji shows in UI** — choose one that works small (avoid complex multi-codepoint sequences)
- **Avatar formats** — workspace-relative paths are resolved against the agent's workspace root; use HTTPS URLs for images hosted externally

---

## What's Next

- [SOUL.md Template](#template-soul) — the personality file that gives identity its depth
- [BOOTSTRAP.md Template](#template-bootstrap) — how name and emoji are chosen during first-run
- [Context Files](#context-files) — full list of context files and loading order

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
