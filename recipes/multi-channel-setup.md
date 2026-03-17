# Multi-Channel Setup

> Put the same agent on Telegram, Discord, and WebSocket simultaneously.

## Overview

GoClaw runs multiple channels from one gateway process. A single agent can receive messages from Telegram, Discord, and direct WebSocket clients at the same time — each channel has its own session scope, so conversations stay isolated per channel and user.

**What you need:**
- A working gateway with at least one agent created
- Web dashboard access at `http://localhost:18790`
- Bot tokens for each messaging platform

## Step 1: Gather your tokens

You need a bot token for each messaging platform:

**Telegram:** Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token
**Discord:** [discord.com/developers](https://discord.com/developers/applications) → New Application → Bot → Add Bot → copy token. Enable **Message Content Intent** under Privileged Gateway Intents.

WebSocket needs no external token — clients authenticate with your gateway token.

## Step 2: Create channel instances

Open the web dashboard and go to **Channels → Create Instance**. Create one instance per platform:

**Telegram:**
- **Channel type:** Telegram
- **Name:** `main-telegram`
- **Agent:** Select your agent
- **Credentials:** Paste the bot token from @BotFather
- **Config:** Set `dm_policy` to `pairing` (recommended) or `open`

Click **Save**.

**Discord:**
- **Channel type:** Discord
- **Name:** `main-discord`
- **Agent:** Select the same agent
- **Credentials:** Paste the Discord bot token
- **Config:** Set `dm_policy` to `open`, `require_mention` to `true`

Click **Save**.

Both channels are immediately active — no gateway restart needed. WebSocket is built into the gateway and needs no instance creation.

On startup you should see log lines like:
```
channel=telegram status=connected bot=@YourBotName
channel=discord  status=connected guild_count=2
gateway          status=listening addr=0.0.0.0:18790
```

<details>
<summary><strong>Via config.json</strong></summary>

Add all channel configs to `config.json`. Secrets (tokens) go in `.env.local` — not in the config file.

`config.json`:
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true,
      "reaction_level": "minimal"
    },
    "discord": {
      "enabled": true,
      "token": "",
      "dm_policy": "open",
      "group_policy": "open",
      "require_mention": true,
      "history_limit": 50
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "token": ""
  }
}
```

`.env.local` (secrets only — never commit this file):
```bash
export GOCLAW_TELEGRAM_TOKEN="123456:ABCDEFGHIJKLMNOPQRSTUVWxyz"
export GOCLAW_DISCORD_TOKEN="your-discord-bot-token"
export GOCLAW_GATEWAY_TOKEN="your-gateway-token"
export GOCLAW_POSTGRES_DSN="postgres://user:pass@localhost:5432/goclaw"
```

GoClaw reads channel tokens from environment variables when the `token` field in config is empty.

Add bindings to route messages to your agent:

```json
{
  "bindings": [
    {
      "agentId": "my-assistant",
      "match": { "channel": "telegram" }
    },
    {
      "agentId": "my-assistant",
      "match": { "channel": "discord" }
    }
  ]
}
```

Start the gateway:

```bash
source .env.local && ./goclaw
```

</details>

## Step 3: Connect a WebSocket client

WebSocket is built into the gateway — no extra setup needed. Connect and authenticate:

```javascript
const ws = new WebSocket('ws://localhost:18790/ws');

// First frame must be connect
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      token: 'your-gateway-token',
      user_id: 'web-user-alice'
    }
  }));
};

// Send a chat message
function chat(message) {
  ws.send(JSON.stringify({
    type: 'req',
    id: String(Date.now()),
    method: 'chat',
    params: {
      agent: 'my-assistant',
      message: message
    }
  }));
}

// Listen for responses and streaming chunks
ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  if (frame.type === 'event' && frame.event === 'chunk') {
    process.stdout.write(frame.payload.text);
  }
  if (frame.type === 'res' && frame.method === 'chat') {
    console.log('\n[done]');
  }
};
```

See [WebSocket Channel](../channels/websocket.md) for the full protocol reference.

## Step 4: Verify cross-channel isolation

Sessions are isolated by channel and user by default (`dm_scope: "per-channel-peer"`). This means:
- Alice on Telegram and Alice on Discord have **separate** conversation histories
- The agent treats them as different users

Verify isolation in the dashboard: go to **Sessions** and filter by agent — you should see separate sessions for each channel.

If you want a single session across channels for the same user, set `dm_scope: "per-peer"` in `config.json`:

```json
{
  "sessions": {
    "dm_scope": "per-peer"
  }
}
```

This shares conversation history when the same `user_id` connects from any channel.

## Telegram message handling

Telegram has a 4096-character message limit. GoClaw handles long responses automatically:

- Long messages are split into multiple parts at natural boundaries (paragraphs, code blocks)
- HTML formatting is attempted first for rich output
- If HTML parsing fails, the message falls back to plain text
- No configuration needed — this is fully automatic

## Channel comparison

| Feature | Telegram | Discord | WebSocket |
|---------|----------|---------|-----------|
| Setup | @BotFather token | Developer Portal token | None (use gateway token) |
| DM policy default | `pairing` | `open` | Auth via gateway token |
| Group/server support | Yes | Yes | N/A |
| Streaming | Optional (`dm_stream`) | Via message edits | Native (chunk events) |
| Mention required in groups | Yes (default) | Yes (default) | N/A |
| Custom client | No | No | Yes |

## Restrict tools per channel

You can allow different tool sets per channel. Go to **Agents → your agent → Config tab** and configure per-channel tool policies.

<details>
<summary><strong>Via config.json</strong></summary>

```json
{
  "agents": {
    "list": {
      "my-assistant": {
        "tools": {
          "byProvider": {
            "telegram": { "deny": ["exec", "write_file"] },
            "discord":  { "deny": ["exec", "write_file"] }
          }
        }
      }
    }
  }
}
```

</details>

WebSocket clients (usually developers or internal tools) can keep full tool access.

## File attachments

When the agent uses `write_file` to generate a file, it is automatically delivered as a channel attachment. This works across Telegram, Discord, and other supported channels — no extra configuration needed.

## Common Issues

| Problem | Solution |
|---------|----------|
| Telegram bot not responding | Check `dm_policy`. Default is `"pairing"` — complete browser pairing first, or set `"open"` for testing. |
| Discord bot offline in server | Verify the bot has been added to the server via OAuth2 URL Generator with `bot` scope and `Send Messages` permission. |
| WebSocket connect rejected | Ensure `token` in your connect frame matches `GOCLAW_GATEWAY_TOKEN`. Empty token gives viewer-only role. |
| Messages routing to wrong agent | Check channel instance agent assignment in Dashboard → Channels. First matching binding wins when using config.json. |
| Same user gets different sessions on Telegram vs Discord | Expected with default `dm_scope: "per-channel-peer"`. Set `"per-peer"` to share sessions across channels. |

## What's Next

- [Telegram Channel](../channels/telegram.md) — full Telegram config reference including groups, topics, and STT
- [Discord Channel](../channels/discord.md) — Discord gateway intents and streaming setup
- [WebSocket Channel](../channels/websocket.md) — full RPC protocol reference
- [Personal Assistant](./personal-assistant.md) — single-channel starting point
