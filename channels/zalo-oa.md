# Zalo OA Channel

Zalo Official Account (OA) integration. DM-only with pairing-based access control and image support.

## Setup

**Create Zalo OA:**

1. Go to https://oa.zalo.me
2. Create Official Account (requires Zalo phone number)
3. Set up OA name, avatar, and cover photo
4. In OA settings, go to "Settings" → "API" → "Bot API"
5. Create API key
6. Copy API key for configuration

**Enable Zalo OA:**

```json
{
  "channels": {
    "zalo": {
      "enabled": true,
      "token": "YOUR_API_KEY",
      "dm_policy": "pairing",
      "allow_from": [],
      "media_max_mb": 5
    }
  }
}
```

## Configuration

All config keys are in `channels.zalo`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | false | Enable/disable channel |
| `token` | string | required | API key from Zalo OA console |
| `allow_from` | list | -- | User ID allowlist |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `webhook_url` | string | -- | Optional webhook URL (override polling) |
| `webhook_secret` | string | -- | Optional webhook signature secret |
| `media_max_mb` | int | 5 | Max image file size (MB) |
| `block_reply` | bool | -- | Override gateway block_reply (nil=inherit) |

## Features

### DM-Only

Zalo OA only supports direct messaging. Group functionality is not available. All messages are treated as DMs.

### Long Polling

Default mode: Bot polls Zalo API every 30 seconds for new messages. Server returns messages and marks them read.

- Poll timeout: 30 seconds (default)
- Error backoff: 5 seconds
- Text limit: 2,000 characters per message
- Image limit: 5 MB

### Webhook Mode (Optional)

Instead of polling, configure Zalo to POST events to your gateway:

```json
{
  "webhook_url": "https://your-gateway.com/zalo/webhook",
  "webhook_secret": "your_webhook_secret"
}
```

Zalo sends a HMAC signature in header `X-Zalo-Signature`. Implementation verifies this before processing.

### Image Support

Bot can receive and send images (JPG, PNG). Max 5 MB by default.

**Receive**: Images are downloaded and stored as temporary files during message processing.

**Send**: Images can be sent as media attachment:

```json
{
  "channel": "zalo",
  "content": "Here's your image",
  "media": [
    { "url": "/tmp/image.jpg", "type": "image" }
  ]
}
```

### Pairing by Default

Default DM policy is `"pairing"`. New users see pairing code instructions with 60-second debounce (no spam). Owner approves via:

```
/pair CODE
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check token from Zalo OA console. Ensure OA is active and Bot API enabled. |
| No messages received | Verify polling is running (check logs). Ensure OA can accept messages (not suspended). |
| Image upload fails | Verify image file exists and is under `media_max_mb`. Check file format (JPG/PNG). |
| Webhook signature mismatch | Ensure `webhook_secret` matches Zalo console. Check timestamp is recent. |
| Pairing codes not sent | Check DM policy is `"pairing"`. Verify owner can send messages to OA. |

## What's Next

- [Overview](#channels-overview) — Channel concepts and policies
- [Zalo Personal](#channel-zalo-personal) — Personal Zalo account integration
- [Telegram](#channel-telegram) — Telegram bot setup
- [Browser Pairing](#channel-browser-pairing) — Pairing flow

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
