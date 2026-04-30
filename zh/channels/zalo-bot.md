<!-- TODO: translate to ZH -->

# Zalo Bot Channel

Static-token Zalo Bot integration. Single-credential setup, polling by default, DM-only — the simplest way to bring a Zalo bot online when you don't need OAuth.

## Overview

`zalo_bot` is the static-token variant of GoClaw's Zalo channel family. Operators paste a single bot access token from the Zalo developer console and the channel is online — no OAuth flow, no refresh cycle, no domain verification.

This is the right pick for dev/testing, internal bots, single-OA deployments, or any setup where credential rotation is not a concern. For production OAs that need OAuth and auto-refresh, see [Zalo OA](/channel-zalo-oa). For reverse-engineered personal accounts, see [Zalo Personal](/channel-zalo-personal).

| Feature | Zalo Bot | Zalo OA |
|---------|----------|---------|
| Auth | Static token | OAuth v4 |
| Setup fields | 1 (Token) | 3 (App ID, Secret, Redirect URI) |
| Token refresh | None (long-lived) | Automatic |
| Group support | No (DM-only) | No (DM-only) |
| Multi-OA | No | Yes |
| Domain verification | Not required | Required |

## Getting Your Bot Token

1. Go to `developers.zalo.me` and open the app that owns your bot.
2. Navigate to the Bot API section (URL pattern: `developers.zalo.me/app/<app_id>/bot-api`; check the latest Zalo dev docs if the menu has moved).
3. Create a new bot (or open an existing one) and copy the **access token** — it's an alphanumeric string.

The token does not expire automatically the way OAuth refresh tokens do, so you can paste it once and forget about it. If you regenerate the token in the Zalo console, update GoClaw's Credentials tab to match.

## GoClaw Setup

In the GoClaw web UI go to **Channels → Add Channel → Zalo Bot**. The wizard asks for one value:

| Field | What to paste |
|-------|---------------|
| **Token** | Bot access token from the Zalo developer console |

That's it for credentials. Optional runtime knobs (DM policy, transport, webhook secret) live in the channel detail page after creation.

```json
{
  "channels": {
    "zalo": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "dm_policy": "pairing",
      "media_max_mb": 5
    }
  }
}
```

> **Note —** the config block uses the historical key `zalo` for backwards compatibility with the static-token channel. The `zalo_oa` block in `config.json` is the OAuth variant.

## Configuration

All config keys live under `channels.zalo`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | `false` | Enable / disable the channel |
| `token` | string | required | Bot access token from Zalo console |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `allow_from` | list | `[]` | User ID / username allowlist |
| `transport` | string | `"polling"` | `polling` (default) or `webhook` |
| `webhook_path` | string | -- | Override auto-derived routing slug |
| `webhook_secret` | string | -- | Required when `transport: "webhook"` |
| `media_max_mb` | int | `5` | Max image upload size (MB) |
| `block_reply` | bool | -- | Override gateway `block_reply` (nil = inherit) |

## Ingestion Modes

The channel runs in exactly one mode per instance:

| Mode | When to use | What runs |
|------|-------------|-----------|
| **Polling** *(default)* | No public HTTPS endpoint | Long-polling `getUpdates` calls |
| **Webhook** *(opt-in)* | Lower latency, public endpoint available | Zalo POSTs to `/channels/zalo/webhook/<slug>` |

Both produce equivalent inbound message shapes — switching transports does not change agent behavior.

## Webhook Mode

Set `transport: "webhook"` and supply a `webhook_secret`. Then register the URL on the Zalo bot console.

```json
{
  "channels": {
    "zalo": {
      "transport": "webhook",
      "webhook_path": "support-bot",
      "webhook_secret": "PASTE_FROM_ZALO_CONSOLE"
    }
  }
}
```

### Signature verification

Zalo Bot API uses a constant-token header — different from the OA variant's HMAC scheme.

| Property | Value |
|----------|-------|
| Header | `X-Bot-Api-Secret-Token` |
| Compare | Constant-time string match |
| Empty secret | Channel rejects start (Bot API mandates a secret in webhook mode) |
| Replay window | None — bot tokens are long-lived, no timestamp window |

The handler also drops events where `from.id == botID` so the agent doesn't react to its own outbound replies (Zalo redelivers sends through the same webhook).

### Slug rules

Slugs are auto-derived from the channel name. Override via `webhook_path`. Same conventions as Zalo OA: lowercase letters / digits / hyphens, length 2–63, must start with `[a-z0-9]`, reserved words `webhook`, `zalo`, `_health`, `_metrics` rejected.

## Polling Mode

Polling is the default and uses Zalo's `getUpdates` long-polling endpoint. The defaults are tuned for the Bot API and are not operator-configurable.

| Property | Value |
|----------|-------|
| Long-poll timeout | 30 seconds |
| Error backoff | 5 seconds |
| Read marker | Zalo marks downloaded messages as read |

The channel keeps an offset cursor and resumes after restart from the last seen message.

## Text & Media

| Constraint | Value |
|------------|-------|
| Outbound text | 2,000 characters per message (Zalo Bot API limit) |
| Image formats | JPG, PNG |
| Image max size | 5 MB (override via `media_max_mb`) |
| Inbound media | Downloaded to temp files during processing |
| Outbound media | Attached as `media` array in send payload |

```json
{
  "channel": "zalo",
  "content": "Here's your image",
  "media": [
    { "url": "/tmp/image.jpg", "type": "image" }
  ]
}
```

## DM-Only Restriction

Zalo Bot API does not expose group messaging, so the channel is DM-only:

- All inbound is routed as DMs — no `group_id` / `thread_id` plumbing
- No `@bot` mention detection (the API doesn't surface mentions)
- No "broadcast to all followers" mode — GoClaw deliberately doesn't expose it
- Per-group config blocks (like Telegram has) are not applicable

If your use case needs groups, use [Zalo Personal](/channel-zalo-personal) at the cost of running on reverse-engineered protocol.

## Pairing Code Flow

`dm_policy: "pairing"` is the default. New users get a pairing prompt, debounced to avoid spam:

| Behavior | Value |
|----------|-------|
| Prompt frequency | Once per user, then `60s` debounce on subsequent unrecognized contacts |
| Approval syntax | `/pair CODE` (sent by the operator/owner in any DM) |
| Operator visibility | Pairing instructions surface in gateway logs |

Other DM policies:

- `open` — accept all DMs (public bots)
- `allowlist` — only IDs / usernames in `allow_from`
- `disabled` — no DMs at all

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Invalid token` from Zalo | Token typoed, regenerated, or bot disabled | Re-copy from Zalo console; confirm bot is enabled |
| No inbound messages | Polling stalled, bot suspended, or network issue | Check logs for `zalo.poll.error`; verify network reachability |
| Webhook signature mismatch | Token doesn't match Zalo console value | Re-copy and re-save; whitespace counts |
| Webhook receives nothing | URL not registered on Zalo console, or bot disabled | Re-register URL; verify bot status |
| Pairing prompt never sends | `dm_policy` not `"pairing"`, or operator can't DM the bot | Switch policy; check operator permissions |

### Bot API error code reference

| Code | Meaning | What to check |
| --- | --- | --- |
| `400` | Bad request — invalid path or API name | Inspect outbound payload; usually a missing required field |
| `401` | Unauthorized — token expired or invalid, or webhook signature mismatch | Re-paste token / `webhook_secret` in Credentials tab |
| `403` | Internal server error | Transient; retry with backoff. Alert if persistent |
| `404` | Not found — invalid resource (slug not registered or channel stopped) | Re-enable channel; verify URL on Zalo bot console |
| `408` | Request timeout — long-poll idle window | Normal during low-traffic periods; ignore |
| `429` | Quota exceeded | Throttle outbound; check Bot API quota tier |

Source: <https://bot.zapps.me/docs/error-code/>. The Bot API response always includes a `description` field — check it for the specific reason; the numeric code only narrows the category.

## Source Files

- `internal/channels/zalo/bot/channel.go` — channel lifecycle
- `internal/channels/zalo/bot/poll.go` — `getUpdates` long-polling loop
- `internal/channels/zalo/bot/factory.go` — channel factory wiring
- `internal/channels/zalo/common/webhook_router.go` — webhook routing
- `internal/channels/zalo/common/slug.go` — slug validation
- `internal/config/config_channels.go` — `ZaloConfig` struct
- `ui/web/src/pages/channels/zalo/zalo-bot-wizard-step.tsx` — setup wizard UI

## What's Next

- [Channels overview](/channels-overview) — DM policies, pairing, message flow
- [Zalo OA](/channel-zalo-oa) — OAuth variant with auto-refresh, multi-OA
- [Zalo Personal](/channel-zalo-personal) — reverse-engineered personal account (groups supported)

<!-- goclaw-source: 6d0283ce | updated: 2026-05-01 -->
