# Personal Assistant

> Single-user AI assistant on Telegram with memory and a custom personality.

## Overview

This recipe walks you from zero to a personal assistant: one gateway, one agent, one Telegram bot. By the end your assistant will remember things across conversations and respond with the personality you give it.

**What you need:**
- GoClaw binary (see [Getting Started](../getting-started/))
- PostgreSQL database with pgvector
- A Telegram bot token from @BotFather
- An API key from any supported LLM provider

## Step 1: Run the setup wizard

```bash
./goclaw onboard
```

The interactive wizard covers everything in one pass:

1. **Provider** — choose your LLM provider (OpenRouter is recommended for access to many models)
2. **Gateway port** — default `18790`
3. **Channel** — select `Telegram`, paste your bot token
4. **Features** — select `Memory` (vector search) and `Browser` (web access)
5. **Database** — paste your Postgres DSN

The wizard saves a `config.json` (no secrets) and a `.env.local` file (secrets only). Start the gateway:

```bash
source .env.local && ./goclaw
```

## Step 2: Understand the default config

After onboarding, `config.json` looks roughly like this:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.goclaw/workspace",
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tokens": 8192,
      "max_tool_iterations": 20,
      "memory": {
        "enabled": true,
        "embedding_provider": ""
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "reaction_level": "minimal"
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "tools": {
    "browser": {
      "enabled": true,
      "headless": true
    }
  }
}
```

`dm_policy: "pairing"` means new users must pair via a browser code before the bot responds. This protects your bot from strangers.

## Step 3: Pair your Telegram account

Open the web dashboard at `http://localhost:18790`. Go to the pairing page and follow the instructions — you'll send a code to your Telegram bot, and the dashboard confirms the link. Once paired, the bot responds to your messages.

Alternatively, use `./goclaw agent chat` to chat directly in the terminal without pairing.

## Step 4: Customize the personality (SOUL.md)

On first chat, the agent seeds a `SOUL.md` file in your user context. Edit it in the dashboard:

Go to **Agents → your agent → Files tab → SOUL.md** and edit inline. For example:

```markdown
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
```

Click **Save** when done.

<details>
<summary><strong>Via API</strong></summary>

```bash
curl -X PUT http://localhost:18790/v1/agents/default/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: your-user-id" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
EOF
```

</details>

See [Editing Personality](#editing-personality) for full SOUL.md reference.

## Step 5: Enable memory

Memory is already on if you selected it in the wizard. The agent uses SQLite + pgvector for hybrid search. Notes are stored with `memory_save` and searched with `memory_search` automatically.

To verify memory is active, send your bot: "Remember that I prefer Python over JavaScript." Then in a later session: "What programming language do I prefer?" — the agent recalls from memory.

You can also check memory status in the dashboard: go to **Agents → your agent** and verify the memory config shows as enabled.

## Optional: Personalize your agent

A few extra touches you can configure in the dashboard under **Agents → your agent**:

- **Emoji:** Set an emoji icon via the emoji selector in the agent detail page — this shows in the agent list and chat UI
- **Skill learning:** (Predefined agents only) Toggle **Skill Learning** to let the agent capture reusable workflows as skills after complex tasks. Set the nudge interval to control how often the agent suggests creating skills.

## Common Issues

| Problem | Solution |
|---------|----------|
| Bot doesn't respond in Telegram | Check `dm_policy`. With `"pairing"`, you must complete browser pairing first. Set `"open"` to skip pairing. |
| Memory not working | Confirm `memory.enabled: true` in config and that an embedding provider has an API key. Check gateway logs for embedding errors. |
| "No provider configured" error | Ensure the API key env var is set. Run `source .env.local` before `./goclaw`. |
| Bot responds to everyone | Set `dm_policy: "allowlist"` and `allow_from: ["your_username"]` in `channels.telegram`. |

## What's Next

- [Editing Personality](#editing-personality) — customize SOUL.md, IDENTITY.md, USER.md
- [Telegram Channel](#channel-telegram) — full Telegram configuration reference
- [Team Chatbot](#recipe-team-chatbot) — add specialist agents for different tasks
- [Multi-Channel Setup](#recipe-multi-channel) — put the same agent on Discord and WebSocket too

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
