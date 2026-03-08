# Larksuite Channel

[Larksuite](https://www.larksuite.com/) messaging integration supporting DMs, groups, streaming cards, and real-time updates via WebSocket or webhook.

## Setup

**Create Larksuite App:**

1. Go to https://open.larksuite.com
2. Create custom app → fill Basic Information
3. Under "Bots" → enable "Bot" capability
4. Set bot name and avatar
5. Copy `App ID` and `App Secret`
6. Grant permissions: `im:message`, `im:message.p2p_msg:send`, `im:message.group_msg:send`, `contact:user.id:readonly`

**Enable Larksuite:**

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "app_id": "YOUR_APP_ID",
      "app_secret": "YOUR_APP_SECRET",
      "connection_mode": "websocket",
      "domain": "lark",
      "dm_policy": "pairing",
      "group_policy": "open"
    }
  }
}
```

## Configuration

All config keys are in `channels.feishu`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | false | Enable/disable channel |
| `app_id` | string | required | App ID from Larksuite Developer Console |
| `app_secret` | string | required | App Secret from Larksuite Developer Console |
| `encrypt_key` | string | -- | Optional message encryption key |
| `verification_token` | string | -- | Optional webhook verification token |
| `domain` | string | `"lark"` | `"lark"` (Larksuite) or custom domain |
| `connection_mode` | string | `"websocket"` | `"websocket"` or `"webhook"` |
| `webhook_port` | int | 3000 | Port for webhook server (0=mount on gateway mux) |
| `webhook_path` | string | `"/feishu/events"` | Webhook endpoint path |
| `allow_from` | list | -- | User ID allowlist (DMs) |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `group_policy` | string | `"open"` | `open`, `allowlist`, `disabled` |
| `group_allow_from` | list | -- | Group ID allowlist |
| `require_mention` | bool | true | Require bot mention in groups |
| `topic_session_mode` | string | `"disabled"` | `"disabled"` or `"enabled"` for thread isolation |
| `text_chunk_limit` | int | 4000 | Max text characters per message |
| `media_max_mb` | int | 30 | Max media file size (MB) |
| `render_mode` | string | `"auto"` | `"auto"` (detect), `"card"`, `"raw"` |
| `streaming` | bool | true | Enable streaming card updates |
| `reaction_level` | string | `"off"` | `off`, `minimal` (⏳ only), `full` |

## Transport Modes

### WebSocket (Default)

Persistent connection with auto-reconnect. Recommended for low latency.

```json
{
  "connection_mode": "websocket"
}
```

### Webhook

Larksuite sends events via HTTP POST. Choose:

1. **Mount on gateway mux** (`webhook_port: 0`): Handler shares main gateway port
2. **Separate server** (`webhook_port: 3000`): Dedicated webhook listener

```json
{
  "connection_mode": "webhook",
  "webhook_port": 0,
  "webhook_path": "/feishu/events"
}
```

Then configure the webhook URL in Larksuite Developer Console:
- Gateway mux: `https://your-gateway.com/feishu/events`
- Separate server: `https://your-webhook-host:3000/feishu/events`

## Features

### Streaming Cards

Real-time updates delivered as interactive card messages with animation:

```mermaid
flowchart TD
    START["Agent starts responding"] --> CREATE["Create streaming card"]
    CREATE --> SEND["Send card message<br/>(streaming_mode: true)"]
    SEND --> UPDATE["Update card text<br/>with accumulated chunks<br/>(throttled: 100ms min)"]
    UPDATE -->|"More chunks"| UPDATE
    UPDATE -->|"Done"| CLOSE["Close stream<br/>(streaming_mode: false)"]
    CLOSE --> FINAL["User sees full response"]
```

Updates throttled to prevent rate limiting. Display uses 50ms animation frequency (2-character steps).

### Media Handling

**Inbound**: Images, files, audio, video, stickers auto-downloaded and saved:

| Type | Extension |
|------|-----------|
| Image | `.png` |
| File | Original extension |
| Audio | `.opus` |
| Video | `.mp4` |
| Sticker | `.png` |

Max 30 MB by default (`media_max_mb`).

**Outbound**: Files auto-detected and uploaded with correct type (opus, mp4, pdf, doc, xls, ppt, or stream).

### Mention Resolution

Larksuite sends placeholder tokens (e.g., `@_user_1`). Bot parses mention list and resolves to `@DisplayName`.

### Thread Session Isolation

When `topic_session_mode: "enabled"`, each thread gets isolated conversation:

```
Session key: "{chatID}:topic:{rootMessageID}"
```

Different threads in same group maintain separate histories.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid app credentials" | Check app_id and app_secret. Ensure app is published. |
| Webhook not receiving events | Verify webhook URL is publicly accessible. Check Larksuite Developer Console event subscriptions. |
| WebSocket keeps disconnecting | Check network. Verify app has `im:message` permission. |
| Streaming cards not updating | Ensure `streaming: true`. Check `render_mode` (auto/card). Messages shorter than limit render as plain text. |
| Media upload fails | Verify file type matches. Check file size under `media_max_mb`. |
| Mention not parsed | Ensure bot is mentioned. Check mention list in webhook payload. |

## What's Next

- [Overview](./overview.md) — Channel concepts and policies
- [Telegram](./telegram.md) — Telegram bot setup
- [Zalo OA](./zalo-oa.md) — Zalo Official Account
- [Browser Pairing](./browser-pairing.md) — Pairing flow
