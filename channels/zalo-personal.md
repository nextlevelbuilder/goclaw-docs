# Zalo Personal Channel

Unofficial personal Zalo account integration using reverse-engineered protocol (zcago). Supports DMs and groups with restrictive access control.

## Warning: Use at Your Own Risk

Zalo Personal uses an **unofficial, reverse-engineered protocol**. Your account may be locked, banned, or restricted by Zalo at any time. This is NOT recommended for production bots. Use [Zalo OA](#channel-zalo-oa) for official integrations.

A security warning is logged on startup: `security.unofficial_api`.

## Setup

**Prerequisites:**
- Personal Zalo account with credentials
- Credentials stored as JSON file

**Create Credentials JSON:**

```json
{
  "phone": "84987654321",
  "password": "your_password_here",
  "device_id": "your_device_id"
}
```

**Enable Zalo Personal:**

```json
{
  "channels": {
    "zalo_personal": {
      "enabled": true,
      "credentials_path": "/home/goclaw/.goclaw/zalo-creds.json",
      "dm_policy": "allowlist",
      "group_policy": "allowlist",
      "allow_from": ["friend_zalo_id", "group_chat_id"]
    }
  }
}
```

## Configuration

All config keys are in `channels.zalo_personal`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | false | Enable/disable channel |
| `credentials_path` | string | -- | Path to credentials JSON file |
| `allow_from` | list | -- | User/group ID allowlist |
| `dm_policy` | string | `"allowlist"` | `pairing`, `allowlist`, `open`, `disabled` (restrictive default) |
| `group_policy` | string | `"allowlist"` | `open`, `allowlist`, `disabled` (restrictive default) |
| `require_mention` | bool | true | Require bot mention in groups |
| `block_reply` | bool | -- | Override gateway block_reply (nil=inherit) |

## Features

### Comparison with Zalo OA

| Aspect | Zalo OA | Zalo Personal |
|--------|---------|---------------|
| Protocol | Official Bot API | Reverse-engineered (zcago) |
| Account type | Official Account | Personal account |
| DM support | Yes | Yes |
| Group support | No | Yes |
| Default DM policy | `pairing` | `allowlist` (restrictive) |
| Default group policy | N/A | `allowlist` (restrictive) |
| Auth method | API key | Credentials (phone + password) |
| Risk level | None | High (account may be banned) |
| Recommended for | Official bots | Development/testing only |

### DM & Group Support

Unlike Zalo OA, Personal supports both DMs and groups:

- DMs: Direct conversations with individual users
- Groups: Group chats (Zalo chat groups)
- Default policies are **restrictive**: `allowlist` for both DM and group

Explicitly allow users/groups via `allow_from`:

```json
{
  "allow_from": [
    "user_zalo_id_1",
    "user_zalo_id_2",
    "group_chat_id_3"
  ]
}
```

### Authentication

Requires credentials file with phone, password, and device ID. On first connection, account may require QR scan or additional verification from Zalo.

### Media Handling

Media sending includes post-write verification — files are confirmed written to disk before being sent to the Zalo API.

### Resilience

On connection failure:
- Max 10 restart attempts
- Exponential backoff: 1s → 60s max
- Special handling for error code 3000: 60s initial delay (usually rate limiting)
- Typing controller per thread (local key)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Account locked" | Your account was restricted by Zalo. This happens frequently with bot integrations. Use Zalo OA instead. |
| "Invalid credentials" | Verify phone, password, and device ID in credentials file. Re-authenticate if Zalo requires verification. |
| No messages received | Check `allow_from` includes the sender. Verify DM/group policy is not `disabled`. |
| Bot keeps disconnecting | Zalo may be rate limiting. Check logs for error code 3000. Wait 60+ seconds before reconnecting. |
| "Unofficial API" warning | This is expected. Acknowledge the risk and use only for development/testing. |

## What's Next

- [Overview](#channels-overview) — Channel concepts and policies
- [Zalo OA](#channel-zalo-oa) — Official Zalo integration (recommended)
- [Telegram](#channel-telegram) — Telegram bot setup
- [Browser Pairing](#channel-browser-pairing) — Pairing flow

<!-- goclaw-source: 120fc2d | updated: 2026-03-18 -->
