<!-- TODO: translate to ZH -->

# Zalo OA Channel

Zalo Official Account integration via OAuth v4. Production-ready, multi-OA, auto-refreshing tokens, with both polling (default) and webhook transports.

## Overview

`zalo_oa` is the OAuth v4 variant of GoClaw's Zalo channel family. Operators connect a verified Zalo Official Account via the standard Zalo developer console; the gateway stores an encrypted refresh token and rotates access tokens automatically. Inbound messages reach the agent through one of two transports — long polling against `listrecentchat` (default) or webhook events POSTed by Zalo.

This channel is meant for production deployments and supports multiple OAs per instance. If you only have a single small-scale bot and don't need OAuth, see [Zalo Bot](/channel-zalo-bot). For reverse-engineered personal-account integration (no OA required), see [Zalo Personal](/channel-zalo-personal).

| Variant | Auth | Refresh | Multi-OA | Group support |
|---------|------|---------|----------|---------------|
| **Zalo OA** | OAuth v4 (App ID + Secret + Redirect URI) | Auto | Yes | No (DM-only) |
| Zalo Bot | Static token | None needed | Single | No (DM-only) |
| Zalo Personal | Account credentials | Manual re-login | Single | Yes (groups) |

## Prerequisites

Before adding the channel in GoClaw, you need a verified domain on the Zalo developer console — the OAuth callback will not work without it.

1. Open `https://developers.zalo.me`, pick your app.
2. Verify your gateway domain via HTML meta tag or DNS TXT record. Wait until the domain appears in the **Danh sách domain xác thực** list.
3. Set the **Official Account Callback URL** to the same value you'll paste into GoClaw's Redirect URI field. Both must match exactly.
4. Note your numeric **App ID** and the **Secret Key** (this is the OAuth secret, not the webhook secret).

> **Heads up —** error code `-14003` from Zalo means either the domain isn't verified yet or the callback URL doesn't match what you registered.

## GoClaw Setup Wizard

In the GoClaw web UI go to **Channels → Add Channel → Zalo OA**. The wizard asks for three values:

| Field | What to paste |
|-------|---------------|
| **App ID** | Numeric ID from `developers.zalo.me` |
| **Secret Key** | OAuth secret from the same console |
| **Redirect URI** | Same URL you set as the OA Callback URL |

After you save, GoClaw opens the Zalo consent flow in a popup. Approve it with the Zalo account that owns the OA. On success, the OA ID is auto-discovered and stored encrypted; the channel detail page surfaces it read-only.

The **Webhook Secret Key** field can stay empty during creation — you'll fill it in later if you switch to webhook mode (see [Webhook Mode](#webhook-mode)).

## Ingestion Modes

The channel listens for inbound messages in exactly one of two modes per instance:

| Mode | When to use | What runs |
|------|-------------|-----------|
| **Polling** *(default)* | No public HTTPS endpoint, simpler ops | Periodic `listrecentchat` calls on a timer |
| **Webhook** *(opt-in)* | Lower latency, event-driven, public endpoint available | Zalo POSTs to `/channels/zalo/webhook/<slug>` |

Switching transports does not change agent behavior — both produce equivalent message shapes. Webhook deliveries do not fall back to polling on failure unless you explicitly enable `catch_up_on_restart`.

## Webhook Mode

Webhook mode is opt-in via `transport: "webhook"`. The setup uses a deliberate two-step bootstrap to get around Zalo's chicken-and-egg problem (you can't paste the secret before saving the URL, but Zalo verifies the URL before it shows you the secret).

### Bootstrap flow

1. Create the channel with `transport: "webhook"` and **leave `webhook_secret_key` empty**.
2. The gateway answers Zalo's verification ping with HTTP 200 — signature checking is skipped while the secret is empty (the channel is `Degraded — awaiting webhook secret` during this window).
3. Copy **Khóa bí mật OA** from the Zalo console and paste it into the channel's Credentials tab in GoClaw.
4. Save. The channel transitions to `Healthy` and signature verification activates.

This same flow handles toggling an existing polling channel to webhook — just clear the secret first, save URL on Zalo, then paste the new secret.

### Slug rules

Each channel gets a routing slug derived from its name. Override it via `webhook_path` if you need a stable URL (e.g. `customer-support` instead of an auto-generated one).

- Lowercase letters, digits, hyphens only
- Must start with `[a-z0-9]`
- Length 2–63 chars
- Reserved words rejected: `webhook`, `zalo`, `_health`, `_metrics`

### Signature verification

Zalo signs every event with `X-ZEvent-Signature: hex(SHA256(appID + body + timestamp + secret))`. The gateway verifies this against your saved secret and rejects mismatches.

| Setting | Default | Purpose |
|---------|---------|---------|
| `webhook_signature_mode` | `"strict"` | Reject mismatches (production) |
| `webhook_signature_mode` | `"log_only"` | Warn but allow (testing) |
| `webhook_signature_mode` | `"disabled"` | Accept unsigned (diagnostic only — never in production) |
| `webhook_replay_window_seconds` | `300` (clamp `[60, 3600]`) | Reject events older than this |

The handler also drops events where `sender.id == oa_id` — Zalo redelivers your outbound replies through the same webhook, and you don't want the agent to react to its own messages.

## Polling Mode

Polling is the default. The gateway calls `listrecentchat` on an interval and processes new messages.

| Key | Default | Notes |
|-----|---------|-------|
| `poll_interval_seconds` | `15` | Range `[5, 120]` |
| `poll_count` | `10` | Page size; clamp `[1, 10]` (Zalo API hard cap — error `-210` above) |
| `poll_burndown_max_pages` | `10` | Pages allowed per cycle without sleep; clamp `[1, 20]`; set to `1` to disable burn-down |
| `catch_up_on_restart` | `false` | Single bounded sweep on Start; useful after long downtime |

**Burn-down resilience** lets the gateway clear a backlog. A worst-case cycle of `10 × 10 = 100` messages happens before the next sleep. If 250 messages are pending, the burn-down empties them across 2–3 cycles instead of crawling 10 at a time.

`catch_up_on_restart` is off by default because it can replay stale conversations on every restart. Turn it on if you want a single bounded `listrecentchat` sweep at boot, then normal polling resumes.

When `transport: "webhook"`, all polling parameters are ignored.

## Quoted Replies

`quote_user_message` is **on by default**. Outbound replies quote the user's last inbound message via Zalo's `message.quote_message_id` field — handy in busy CS threads where context matters.

| Behavior | Default | Notes |
|----------|---------|-------|
| Quote first chunk of multi-chunk reply | Yes | Subsequent chunks are unquoted |
| Quote image / file / GIF sends | No | Zalo API restriction — silently dropped |
| Quote source > 48h or deleted | No | Auto-retried without quote; logs `zalo_oa.send.quote_dropped_payload_error` |

Set `quote_user_message: false` to disable globally.

## Status Reactions

Zalo OA can surface agent progress as emoji reactions on the user's inbound message. Reactions don't count against Zalo's monthly active-message quota, and failures never affect channel health.

| Level | What you see |
|-------|--------------|
| `off` *(default)* | No reactions |
| `minimal` | Terminal only — ❤ on success, 😢 on failure |
| `full` | Adds 👍 on first intermediate event (debounced ≤1 per 700ms) |

The `minimal` level is recommended for customer-service OAs — `full` chews through the 50-reaction-per-message cap and looks unprofessional. Mid-run tool / coding / web statuses are deliberately not mapped to Zalo OA. The frontend wizard may show `minimal` as the suggested default; the runtime config default remains `off`.

`ClearReaction` sends a `/-remove` sentinel since Zalo has no separate clear endpoint.

## Common Errors

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Zalo returns `-14003` during OAuth | Domain unverified or callback URL mismatch | Re-verify domain on `developers.zalo.me`; align Redirect URI exactly |
| Console URL-save fails | Gateway not reachable, or `>2s` to respond | Confirm public HTTPS reachability; channel must already exist in GoClaw |
| Channel stuck on `Degraded — awaiting webhook secret` | Operator skipped the secret-paste step | Open Credentials tab, paste **Khóa bí mật OA** |
| Webhook returns `401` | Signature mismatch (typo on paste) | Re-copy from Zalo console, save again |
| Webhook returns `404` | Channel stopped or slug mismatch | Re-enable channel; verify `webhook_path` matches Zalo console URL |
| No inbound events after secret saved | `webhook_signature_mode: "disabled"`, or Zalo auto-disabled webhook after 12h of non-200 retries | Restore mode to `strict`; re-save URL on Zalo console |
| Refresh token rejected | User revoked consent or token aged out | Re-run OAuth flow; user pastes fresh consent code |
| Token refresh fails with `invalid_grant` | Same as above | Re-consent in Zalo app |
| `zalo_oa.webhook.bootstrap_drop` count growing | Events arriving during the secret-paste window | Normal during setup; resolves once secret is saved |

### Zalo error code reference

The most common Zalo Social API codes you'll see in `zalo_oa.*.error` logs:

| Code | Meaning | What to check |
| --- | --- | --- |
| `-14003` | Invalid redirect URI or unverified domain | Verify domain on `developers.zalo.me`; align Redirect URI |
| `-118` | `invalid_grant` — refresh token revoked / expired | Re-run OAuth consent |
| `-201` | Invalid params (payload shape) | Inspect outbound payload against current Zalo spec |
| `-210` | Page-size cap exceeded | Set `poll_count` ≤ 10 (Zalo hard cap) |
| `-216` / `-401` | Access token invalid or expired | Triggers OAuth refresh; if refresh fails, re-consent |
| `100` | Invalid parameter | Check API call shape and field types |
| `110`–`112` | Recipient lookup failed; app not linked to OA | Confirm app is linked to OA in Zalo console |
| `210` | User not visible | User needs to follow OA or grant friend permission |
| `2000`–`2004` | App rate-limited or temporarily disabled | Check app status; request quota increase |
| `12000`–`12012` | Quota / DND / friend-list / not-friend | Adjust outbound dispatch cadence |

Full tables: <https://stc-developers.zdn.vn/docs/v2/social-api/tham-khao/ma-loi?lang=vi>. GoClaw's internal classification (which codes are retriable vs auth-refresh-triggering) lives in `internal/channels/zalo/oa/errors.go`.

## Troubleshooting & Reference

### Slog keys to watch

```
zalo_oa.webhook.event_received
zalo_oa.webhook.bootstrap_drop
zalo_oa.poll.burndown_capped
zalo_oa.send.quote_dropped_payload_error
zalo_webhook.handler_error
zalo_webhook.empty_message_id_streak
security.zalo_webhook_signature_mismatch
```

### Tracing

Set `GOCLAW_ZALO_OA_TRACE=1` to dump raw Zalo response bodies at Debug level. **PII-sensitive** — never enable in production.

### Polling config example

```json
{
  "channels": {
    "zalo_oa": {
      "enabled": true,
      "transport": "polling",
      "poll_interval_seconds": 15,
      "poll_count": 10,
      "poll_burndown_max_pages": 10,
      "reaction_level": "minimal",
      "quote_user_message": true,
      "dm_policy": "pairing"
    }
  }
}
```

### Webhook config example

```json
{
  "channels": {
    "zalo_oa": {
      "enabled": true,
      "transport": "webhook",
      "webhook_path": "customer-support",
      "webhook_signature_mode": "strict",
      "webhook_replay_window_seconds": 300,
      "reaction_level": "minimal",
      "dm_policy": "pairing"
    }
  }
}
```

Credentials (`app_id`, `secret_key`, `redirect_uri`, `webhook_secret_key`) are stored encrypted via the channel's Credentials tab — they are never written to `config.json`.

### Source files

- `internal/channels/zalo/oa/channel.go` — channel lifecycle
- `internal/channels/zalo/oa/poll.go` — polling defaults and burn-down
- `internal/channels/zalo/oa/reactions.go` — reaction levels
- `internal/channels/zalo/oa/errors.go` — Zalo error-code registry
- `internal/channels/zalo/common/webhook_router.go` — webhook routing
- `internal/channels/zalo/common/slug.go` — slug validation
- `internal/config/config_channels.go` — `ZaloOAConfig` struct
- `internal/gateway/methods/zalo_webhook.go` — RPC `webhook_url`
- `ui/web/src/pages/channels/zalo/zalo-oa-wizard-step.tsx` — setup wizard UI
- `ui/web/src/pages/channels/zalo/zalo-webhook-url-section.tsx` — webhook bootstrap card

## What's Next

- [Channels overview](/channels-overview) — DM policies, pairing, message flow
- [Zalo Bot](/channel-zalo-bot) — static-token alternative for small deployments
- [Zalo Personal](/channel-zalo-personal) — reverse-engineered personal account

<!-- goclaw-source: ab129fe9 | updated: 2026-05-01 -->
