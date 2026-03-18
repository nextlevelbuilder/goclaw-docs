# Editing Agent Personality

> Change your agent's tone, identity, and boundaries through two core files: SOUL.md (personality & style) and IDENTITY.md (name, emoji, creature).

## Overview

Your agent's personality emerges from two primary configuration files:

- **SOUL.md**: Defines tone, values, boundaries, expertise, and operational style. This is the "who you are" file.
- **IDENTITY.md**: Contains metadata like name, emoji, creature type, and avatar. This is the "what you look like" file.

**AGENTS.md** also contributes to the overall persona — it defines conversational rules, memory usage, and group chat behavior. While less about "personality," it shapes how the agent expresses itself in practice. See [Context Files](#context-files) for details.

You can edit these files three ways: via the Dashboard UI, the WebSocket API, or directly on disk. Edits made through the UI or API are stored in the database.

## SOUL.md — The Personality File

### What It Contains

SOUL.md is your agent's character sheet. Here's the structure from the bootstrap template:

```markdown
# SOUL.md - Who You Are

## Core Truths
- Be genuinely helpful, not performatively helpful
- Have opinions and personality
- Be resourceful before asking for help
- Earn trust through competence
- Remember you're a guest (in the user's life)

## Boundaries
- What remains private
- When to ask before acting externally
- Messaging guidelines

## Vibe
Overall energy: concise when appropriate, thorough when needed.

## Style
- Tone: (e.g., casual and warm like texting a friend)
- Humor: (natural, not forced)
- Emoji: (sparingly)
- Opinions: Express preferences
- Length: Default short
- Formality: Match the user

## Expertise
Optional domain-specific knowledge and specialized instructions.

## Continuity
Each session, read these files. They are your memory. Update them when you learn who you are.
```

### Editing SOUL.md

To change your agent's personality:

1. **Via Dashboard**:
   - Open the agent's settings
   - Find "Context Files" or "Personality" section
   - Edit the SOUL.md content directly in the editor
   - Click Save

2. **Via WebSocket API** (`agents.files.set`):
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "SOUL.md",
       "content": "# SOUL.md - Who You Are\n\n## Core Truths\n\nBe direct and honest..."
     }
   }
   ```

3. **Filesystem** (development mode):
   - Edit `~/.goclaw/agents/[agentId]/SOUL.md` directly
   - Changes are picked up on next session start

### Example: From Corporate to Casual

**Before** (SOUL.md):
```markdown
## Vibe
Professional and helpful, always courteous.

## Style
- Tone: Formal and respectful
- Humor: Avoid
- Emoji: None
```

**After** (SOUL.md):
```markdown
## Vibe
Approachable and genuine — like chatting with a smart friend.

## Style
- Tone: Casual and warm
- Humor: Natural when appropriate
- Emoji: Sparingly for warmth
```

Your agent's next conversation will reflect this shift immediately.

## IDENTITY.md — Metadata & Avatar

### What It Contains

IDENTITY.md stores the facts about who your agent *is*:

```markdown
# IDENTITY.md - Who Am I?

- **Name:** (agent's name)
- **Creature:** (AI? robot? familiar? something custom?)
- **Purpose:** (mission, key resources, focus areas)
- **Vibe:** (sharp? warm? chaotic? calm?)
- **Emoji:** (signature emoji)
- **Avatar:** (workspace-relative path or URL)
```

### Key Fields

| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Display name in UI | "Sage" or "Claude Companion" |
| **Creature** | What kind of being is the agent | "AI familiar" or "digital assistant" |
| **Purpose** | What the agent does | "Your research partner for coding projects" |
| **Vibe** | Personality descriptor (template only — not parsed by the system) | "thoughtful and patient" |
| **Emoji** | Badge in UI/messages | "🔮" or "🤖" |
| **Avatar** | Profile picture URL or path | "https://example.com/sage.png" or "avatars/sage.png" |

> **Note on parsed fields:** The system only extracts **Name**, **Emoji**, **Avatar**, and **Description** from IDENTITY.md. The `Vibe`, `Creature`, and `Purpose` fields are part of the template for the agent's own reference — they shape how the agent understands itself in the system prompt, but are not parsed by GoClaw for display purposes.

### Editing IDENTITY.md

1. **Via Dashboard**:
   - Open agent settings → Identity section
   - Edit name, emoji, avatar fields
   - Changes sync to IDENTITY.md immediately

2. **Via WebSocket API**:
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "IDENTITY.md",
       "content": "# IDENTITY.md - Who Am I?\n\n- **Name:** Sage\n- **Emoji:** 🔮\n- **Avatar:** avatars/sage.png"
     }
   }
   ```

3. **Via Filesystem**:
   ```bash
   # Edit the file directly
   nano ~/.goclaw/agents/default/IDENTITY.md
   ```

### Avatar Handling

Avatars can be:
- **Workspace-relative path**: `avatars/my-agent.png` (loaded from `~/.goclaw/agents/default/avatars/my-agent.png`)
- **HTTP(S) URL**: `https://example.com/avatar.png` (loaded from web)
- **Data URI**: `data:image/png;base64,...` (inline base64)

## Editing via Dashboard

The Dashboard provides a visual editor for both files:

1. Navigate to **Agents** → your agent
2. Click **Settings** or **Personality**
3. You'll see tabs or sections for:
   - SOUL.md (personality editor)
   - IDENTITY.md (metadata form)
4. Edit content in real-time
5. Click **Save** — files are written to DB (managed) or disk (filesystem mode)

## Editing via WebSocket

The `agents.files.set` method writes context files directly:

```javascript
// JavaScript example
const response = await client.request('agents.files.set', {
  agentId: 'default',
  name: 'SOUL.md',
  content: '# SOUL.md - Who You Are\n\nBe you.'
});

console.log(response.file.name, response.file.size, 'bytes');
```

## Tips for Effective Personality

### SOUL.md Best Practices

1. **Be specific**: "Casual and warm like texting a friend" > "friendly"
2. **Describe boundaries clearly**: What won't you do? When do you ask before acting?
3. **State core values upfront**: Honesty, resourcefulness, respect — whatever matters
4. **Keep it under 1KB**: SOUL.md is read on every session; longer = slower startup

### IDENTITY.md Best Practices

1. **Emoji matters**: Pick one that's memorable. Users will associate it with your agent
2. **Avatar resolution**: Keep under 500x500px if possible; smaller = faster load
3. **Creature type adds flavor**: "ghost in the machine" > just "AI"
4. **Purpose field is optional**: But if you include it, be specific

### Effective Prompt Writing for Personality

1. **Use imperatives**: "Be direct" not "be more direct sometimes"
2. **Give examples**: "Answer in < 3 sentences unless it's complicated" shows the ratio
3. **Describe the user relationship**: "You're a guest in someone's life" frames the tone
4. **Avoid negatives when possible**: "Be resourceful" > "Don't ask for help"
5. **Update SOUL.md as you learn**: After a few sessions, refine based on how the agent actually behaves

## Common Issues

| Problem | Solution |
|---------|----------|
| Changes not showing up | Cache invalidation: refresh dashboard or disconnect/reconnect WebSocket |
| Avatar not loading | Check path is correct or URL is accessible; use absolute URLs if relative paths don't work |
| Personality feels generic | SOUL.md is too broad; add specific examples and tone descriptors |
| Agent is too formal/casual | Edit SOUL.md's Style section; specify Tone and Humor preferences explicitly |
| Name/emoji not updating | Ensure IDENTITY.md is saved; check file format (colon-separated: `Name: ...`) |

## What's Next

- [Context Files — Extending personality with per-user context](#context-files)
- [System Prompt Anatomy — How personality gets injected into prompts](#system-prompt-anatomy)
- [Creating Agents — Set up personality during agent creation](#creating-agents)

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
