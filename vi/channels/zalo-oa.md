<!-- TODO: translate to VI -->

# Zalo OA Channel

Zalo Official Account integration via OAuth v4. Production-ready, multi-OA, auto-refreshing tokens, with both polling (default) and webhook transports.

## Overview

`zalo_oa` is the OAuth v4 variant of GoClaw's Zalo channel family. Operators connect a verified Zalo Official Account via the standard Zalo developer console; the gateway stores an encrypted refresh token and rotates access tokens automatically. Inbound messages reach the agent through one of two transports — long polling against `listrecentchat` (default) or webhook events POSTed by Zalo.

This channel is meant for production deployments and supports multiple OAs per instance.

## Choosing your Zalo variant

GoClaw exposes three Zalo channel types. They differ in coverage, supportability, and risk — pick by what your deployment can tolerate.

|  | **Zalo OA** *(this page)* | **Zalo Bot** | **Zalo Personal** |
|---|---|---|---|
| **Officially supported** | Yes — Zalo OA API | Yes — `bot.zapps.me` (newer platform, surface still expanding) | **No** — reverse-engineered protocol |
| **Auth** | OAuth v4 (App ID + Secret + consent) | Static bot token | Account credentials |
| **Account type** | Verified Official Account (business) | Bot identity tied to a developer | Personal Zalo account |
| **DMs** | Yes | Yes | Yes |
| **Groups** | No | No | **Yes** |
| **Multi-account per instance** | Yes (multi-OA) | One bot per channel | One account per channel |
| **Token rotation** | Auto (1h access / 90d single-use refresh) | None — static token | Manual re-login when sessions die |
| **Message types** | Full OA suite (text, image, file, list, button, …) | Text, image, sticker, typing — and growing | Broad (whatever the protocol exposes) |
| **Image upload cap** | 1 MB | 5 MB (GoClaw cap) | -- |
| **Quotas** | OA tier (broadcast caps; transactional within 7 days of user msg) | Bot platform quotas | Account-level, informal |
| **Account ban risk** | None — first-party API | None — first-party API | **High** — Zalo can lock the account at any time |
| **Best for** | Production CS / business messaging at scale | Lightweight bots, internal tools, dev / test, low-volume DM | Personal or group automation where no OA exists, accepting ban risk |

> **About Zalo Bot —** the platform (`bot.zapps.me`) is newer than the OA API and Zalo is actively adding endpoints (sticker and typing actions landed recently). Treat it as evolving — re-check the [Bot API docs](https://bot.zapps.me/docs/) before assuming a feature is missing.
>
> **About Zalo Personal —** uses a reverse-engineered protocol; GoClaw logs `security.unofficial_api` on startup. **Not for production.** See [Zalo Personal](/channel-zalo-personal) for the full risk profile.

**Quick decision** — Have an OA → **Zalo OA**. No OA but a bot is enough → [Zalo Bot](/channel-zalo-bot). Need groups, willing to accept ban risk → [Zalo Personal](/channel-zalo-personal).

## Prerequisites

Two things to know first:

- **App** vs **OA** — an *app* (registered at `developers.zalo.me`) holds the App ID and Secret Key. An *OA* (created at `oa.zalo.me`) is the business account users follow. One app can be linked to multiple OAs.
- **Vietnamese phone number** — required to register both the app and the OA.

Then complete these on `developers.zalo.me`:

1. **Create / activate** the app and copy **App ID** + **Secret Key** (the OAuth secret, not the webhook secret).
2. **Link OA** — open the **Liên kết OA** tab and link the Official Account you want this channel to drive.
3. **Verify your gateway domain** (HTML meta tag or DNS TXT). Wait until it appears in **Danh sách domain xác thực**.
4. **Set the OA Callback URL** to the same value you'll paste into GoClaw's Redirect URI field — they must match exactly.
5. **Request permissions** — open the app's Permissions tab and request: `Quản lý tin nhắn` (messages), `Quản lý người quan tâm` (followers), `Upload`, and `Webhook` (only if you'll use webhook mode). Approval can take 1–3 business days. Without these, API calls fail with `-216`.

> **Heads up —** Zalo's `-14003` means the domain isn't verified yet or the callback URL doesn't match what you registered. `-216` means a permission group hasn't been granted to your app.

## GoClaw Setup Wizard

In the GoClaw web UI go to **Channels → Add Channel → Zalo OA**. The wizard asks for three values:

| Field | What to paste |
|-------|---------------|
| **App ID** | Numeric ID from `developers.zalo.me` |
| **Secret Key** | OAuth secret from the same console |
| **Redirect URI** | Same URL you set as the OA Callback URL |

After you save, GoClaw opens the Zalo consent flow in a popup. Approve it with the Zalo account that owns the OA. On success, the OA ID is auto-discovered and stored encrypted; the channel detail page surfaces it read-only.

The **Webhook Secret Key** field can stay empty during creation — you'll fill it in later if you switch to webhook mode (see [Webhook Mode](#webhook-mode)).

> **About tokens —** Zalo issues a 1-hour access token plus a 90-day refresh token. The refresh token is **single-use** — every refresh returns a new one, and GoClaw rotates it automatically. If a refresh fails (e.g. token unused for 90 days, or revoked), the channel goes Degraded and the OA owner needs to re-run the consent flow.

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

## Media Limits

Zalo OA enforces per-endpoint upload caps — these are server-side, not configurable by GoClaw:

| Endpoint | Max size | Allowed types |
|----------|----------|---------------|
| Image | 1 MB | JPEG, PNG |
| File | 5 MB | PDF, DOC, DOCX |
| GIF | 5 MB | GIF |

Auth header for all upload calls is `access_token: <token>` — not a query string. GoClaw compresses oversized images before upload; oversized files fail fast with `-210`.

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
| Refresh token rejected (`-220` / `-118` / `invalid_grant`) | Refresh token unused for 90 days, revoked, or already consumed by another instance | OA owner re-runs OAuth consent; in multi-instance setups, ensure only one instance refreshes a given OA |
| API calls fail with `-216` | Permission group not approved for the app | Request the relevant group (`Quản lý tin nhắn`, `Upload`, etc.) on `developers.zalo.me` |
| `zalo_oa.webhook.bootstrap_drop` count growing | Events arriving during the secret-paste window | Normal during setup; resolves once secret is saved |

### Zalo error code reference

The most common Zalo codes you'll see in `zalo_oa.*.error` logs:

| Code | Meaning | What to do |
| --- | --- | --- |
| `-14003` | Invalid redirect URI or unverified domain | Verify domain on `developers.zalo.me`; align Redirect URI exactly |
| `-201` | App not found / invalid params | Confirm App ID; inspect outbound payload shape |
| `-210` | Invalid `count` (must be ≤ 10) or upload size exceeded | Set `poll_count` ≤ 10; check media against [Media Limits](#media-limits) |
| `-216` | Insufficient permissions | Request the missing permission group on `developers.zalo.me` (1–3 day approval) |
| `-217` | Access token expired | Triggers automatic refresh — no operator action unless it persists |
| `-220` / `-118` | Refresh token expired or already used | OA owner must re-run OAuth consent flow |
| `100` | Invalid parameter | Check API call shape and field types |
| `110`–`112` | Recipient lookup failed; app not linked to OA | Re-link OA in Zalo console (`Liên kết OA` tab) |
| `210` | User not visible | User must follow the OA or grant friend permission |
| `2000`–`2004` | App rate-limited or temporarily disabled | Check app status; request quota increase |
| `12000`–`12012` | Quota / DND / friend-list / not-friend | Adjust outbound dispatch cadence |

Full Social API table: <https://developers.zalo.me/docs/social-api/tham-khao/ma-loi>. GoClaw's internal classification (which codes are retriable vs auth-refresh-triggering) lives in `internal/channels/zalo/oa/errors.go`.

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

<!-- goclaw-source: bb68b750 | cập nhật: 2026-05-01 -->
