# GoClaw Channels Documentation Index

Complete documentation for all messaging platform integrations in GoClaw.

## Quick Start

1. **[Overview](./overview.md)** — Concepts, policies, message flow diagram
2. **[Telegram](./telegram.md)** — Long polling, forum topics, STT, streaming
3. **[Discord](./discord.md)** — Gateway API, placeholder editing, threads
4. **[Larksuite](./larksuite.md)** — WebSocket/Webhook, streaming cards, media
5. **[Zalo OA](./zalo-oa.md)** — Official Account, DM-only, pairing, images
6. **[Zalo Personal](./zalo-personal.md)** — Personal account (unofficial), DM + groups
7. **[WhatsApp](./whatsapp.md)** — External bridge, JSON protocol, auto-reconnect
8. **[WebSocket](./websocket.md)** — Direct RPC, custom clients, streaming events
9. **[Browser Pairing](./browser-pairing.md)** — 8-char code auth, session tokens

## Channel Comparison Table

| Feature | Telegram | Discord | Larksuite | Zalo OA | Zalo Pers | WhatsApp | WebSocket |
|---------|----------|---------|--------|---------|-----------|----------|-----------|
| **Setup Complexity** | Easy | Easy | Medium | Medium | Hard | Hard | Very Easy |
| **Transport** | Polling | Gateway | WS/Webhook | Polling | Protocol | Bridge | WebSocket |
| **DM Support** | Yes | Yes | Yes | Yes | Yes | Yes | N/A |
| **Group Support** | Yes | Yes | Yes | No | Yes | Yes | N/A |
| **Streaming** | Yes | Yes | Yes | No | No | No | Yes |
| **Rich Format** | HTML | Markdown | Cards | Plain | Plain | JSON | JSON |
| **Reactions** | Yes | -- | Yes | -- | -- | -- | -- |
| **Media** | Photos, Voice, Files | Files, Embeds | Images, Files | Images | -- | JSON | N/A |
| **Auth Method** | Token | Token | App ID + Secret | API Key | Credentials | Bridge | Token + Pairing |
| **Risk Level** | Low | Low | Low | Low | High | Medium | Low |

## Configuration Files

All channel config lives in the root `config.json`:

```json
{
  "channels": {
    "telegram": { ... },
    "discord": { ... },
    "feishu": { ... },
    "zalo": { ... },
    "zalo_personal": { ... },
    "whatsapp": { ... }
  }
}
```

Secret values (tokens, API keys) are loaded from environment variables or `.env.local`, never stored in `config.json`.

## Common Patterns

### DM Policies

All channels support DM access control:

- `pairing` — Require 8-char code approval (default for Telegram, Larksuite, Zalo)
- `allowlist` — Only listed users (restrict to team members)
- `open` — Accept all DMs (public bots)
- `disabled` — No DMs (groups only)

### Group Policies

For channels supporting groups:

- `open` — Accept all groups
- `allowlist` — Only listed groups
- `disabled` — No group messages

### Message Handling

All channels:
1. Listen for platform events
2. Build `InboundMessage` (sender, chat ID, content, media)
3. Publish to message bus
4. Agent processes and responds
5. Manager routes to channel
6. Channel formats and delivers (respecting 2K-4K char limits)

### Allowlist Format

Flexible format supporting:

```
"allow_from": [
  "user_id",           # Plain ID
  "@username",         # With @
  "id|username",       # Compound
  "123456789"          # Numeric
]
```

## Setup Checklist

### Telegram

- [ ] Create bot with @BotFather
- [ ] Copy token
- [ ] Enable in config: `channels.telegram.enabled: true`
- [ ] Optionally: Configure per-group overrides, STT proxy, streaming

### Discord

- [ ] Create app at developer portal
- [ ] Enable "Message Content Intent"
- [ ] Copy bot token
- [ ] Add bot to servers with correct permissions
- [ ] Enable in config

### Larksuite

- [ ] Create custom app
- [ ] Copy App ID + Secret
- [ ] Choose transport: WebSocket (default) or Webhook
- [ ] If webhook: Set URL in Larksuite console
- [ ] Enable in config

### Zalo OA

- [ ] Create Official Account at oa.zalo.me
- [ ] Enable Bot API
- [ ] Copy API key
- [ ] Enable in config (polling by default)

### Zalo Personal

- [ ] Save account credentials to JSON file
- [ ] Point config to credentials file
- [ ] **Acknowledge account ban risk**
- [ ] Enable in config

### WhatsApp

- [ ] Deploy WhatsApp bridge service (e.g., whatsapp-web.js)
- [ ] Copy WebSocket URL
- [ ] Enable in config

### WebSocket

- [ ] Nothing to set up — built-in!
- [ ] Clients can request pairing codes
- [ ] Or connect with gateway token

## Testing Channels

### Manual Test (CLI)

```bash
# Telegram: send to yourself
goclaw send telegram 123456 "Hello from GoClaw"

# Discord: send to channel
goclaw send discord 987654 "Hello!"

# WebSocket: see gateway protocol docs
```

### Check Status

```bash
goclaw status
# Shows which channels are running
```

### View Logs

```bash
grep -i telegram ~/.goclaw/logs/gateway.log
grep -i discord ~/.goclaw/logs/gateway.log
```

## Troubleshooting

### Bot Not Responding

1. Check channel is `enabled: true` in config
2. Check policy settings (DM policy, group policy)
3. Check allowlist (if applicable)
4. Check logs for errors

### Media Not Sent

1. Verify file type is supported
2. Check file size under platform limits
3. Ensure temp file exists
4. Check channel has permission to send media

### Connection Drops

1. Check network connectivity
2. Verify auth credentials
3. Check service rate limits
4. Restart channel

## What's Next

- **[Development Rules](../../development-rules.md)** — Code style for channels
- **[System Architecture](../../00-architecture-overview.md)** — How channels fit in
- **[Gateway Protocol](../../04-gateway-protocol.md)** — WebSocket protocol details
