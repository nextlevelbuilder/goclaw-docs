# Slack Channel

Slack integration via Socket Mode (WebSocket). Supports DMs, channel @mentions, threaded replies, streaming, reactions, media, and message debouncing.

## Setup

**Create a Slack App:**
1. Go to https://api.slack.com/apps?new_app=1
2. Select "From scratch", name your app (e.g., `GoClaw Bot`), pick workspace
3. Click **Create App**

**Enable Socket Mode:**
1. Left sidebar → **Socket Mode** → toggle ON
2. Name the token (e.g., `goclaw-socket`), add `connections:write` scope
3. Copy the **App-Level Token** (`xapp-...`)

**Add Bot Scopes:**
1. Left sidebar → **OAuth & Permissions**
2. Under **Bot Token Scopes**, add:

| Scope | Purpose |
|-------|---------|
| `app_mentions:read` | Receive @bot mention events |
| `chat:write` | Send and edit messages |
| `im:history` | Read DM messages |
| `im:read` | View DM channel list |
| `im:write` | Open DMs with users |
| `channels:history` | Read public channel messages |
| `groups:history` | Read private channel messages |
| `mpim:history` | Read multi-party DM messages |
| `reactions:write` | Add/remove emoji reactions (optional) |
| `reactions:read` | Read emoji reactions (optional) |
| `files:read` | Download files sent to bot |
| `files:write` | Upload files from agent |
| `users:read` | Resolve display names |

**Minimal set** (DM-only, no reactions/files): `chat:write`, `im:history`, `im:read`, `im:write`, `users:read`, `app_mentions:read`

**Enable Events:**
1. Left sidebar → **Event Subscriptions** → toggle ON
2. Under **Subscribe to bot events**, add:

| Event | Description |
|-------|-------------|
| `message.im` | Messages in DMs with the bot |
| `message.channels` | Messages in public channels |
| `message.groups` | Messages in private channels |
| `message.mpim` | Messages in multi-party DMs |
| `app_mention` | When bot is @mentioned |

No Request URL needed — Socket Mode handles events over WebSocket.

**Install & Get Token:**
1. **OAuth & Permissions** → **Install to Workspace** → **Allow**
2. Copy the **Bot User OAuth Token** (`xoxb-...`)

**Enable Slack in GoClaw:**

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-YOUR-BOT-TOKEN",
      "app_token": "xapp-YOUR-APP-LEVEL-TOKEN",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true
    }
  }
}
```

Or via environment variables:

```bash
GOCLAW_SLACK_BOT_TOKEN=xoxb-...
GOCLAW_SLACK_APP_TOKEN=xapp-...
# Auto-enables Slack when both are set
```

**Invite Bot to Channels:**
- Public: `/invite @GoClaw Bot` in the channel
- Private: Channel name → **Integrations** → **Add an App**
- DMs: Message the bot directly

## Configuration

All config keys are in `channels.slack`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | false | Enable/disable channel |
| `bot_token` | string | required | Bot User OAuth Token (`xoxb-...`) |
| `app_token` | string | required | App-Level Token for Socket Mode (`xapp-...`) |
| `user_token` | string | -- | User OAuth Token for custom identity (`xoxp-...`) |
| `allow_from` | list | -- | User ID or channel ID allowlist |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `group_policy` | string | `"open"` | `open`, `pairing`, `allowlist`, `disabled` |
| `require_mention` | bool | true | Require @bot mention in channels |
| `history_limit` | int | 50 | Pending messages per channel for context (0=disabled) |
| `dm_stream` | bool | false | Enable streaming for DMs |
| `group_stream` | bool | false | Enable streaming for groups |
| `native_stream` | bool | false | Use Slack ChatStreamer API if available |
| `reaction_level` | string | `"off"` | `off`, `minimal`, `full` |
| `block_reply` | bool | -- | Override gateway block_reply (nil=inherit) |
| `debounce_delay` | int | 300 | Milliseconds before dispatching rapid messages (0=disabled) |
| `thread_ttl` | int | 24 | Hours before thread participation expires (0=disabled) |
| `media_max_bytes` | int | 20MB | Max file download size in bytes |

## Token Types

| Token | Prefix | Required | Purpose |
|-------|--------|----------|---------|
| Bot Token | `xoxb-` | Yes | Core API: messages, reactions, files, user info |
| App-Level Token | `xapp-` | Yes | Socket Mode WebSocket connection |
| User Token | `xoxp-` | No | Custom bot identity (username/icon override) |

Token prefix is validated on startup — misconfigured tokens fail fast with a clear error.

## Features

### Socket Mode

Uses WebSocket instead of HTTP webhooks. No public URL or ingress required — ideal for self-hosted deployments. Events are acknowledged within 3 seconds per Slack requirements.

Dead socket classification detects non-retryable auth errors (`invalid_auth`, `token_revoked`, `missing_scope`) and stops the channel instead of retrying infinitely.

### Mention Gating

In channels, the bot responds only when @mentioned (default `require_mention: true`). Unmentioned messages are stored in a pending history buffer and included as context when the bot is next mentioned.

```mermaid
flowchart TD
    MSG["User posts in channel"] --> MENTION{"Bot @mentioned<br/>or in participated thread?"}
    MENTION -->|No| BUFFER["Add to pending history<br/>(max 50 messages)"]
    MENTION -->|Yes| PROCESS["Process now<br/>Include history as context"]
    BUFFER --> NEXT["Next mention:<br/>history included"]
```

When `require_mention: false`, Slack delivers both a `message` event and an `app_mention` event for the same message. GoClaw uses a shared dedup key (`channel:timestamp`) so whichever event arrives first processes the message; the duplicate is dropped. With `require_mention: false`, the `app_mention` handler exits before storing the dedup key, ensuring the `message` handler takes ownership.

### Thread Participation

After the bot replies in a thread, it auto-replies to subsequent messages in that thread without requiring @mention. Participation expires after `thread_ttl` hours (default 24). Set `thread_ttl: 0` to disable (always require @mention).

### Message Debouncing

Rapid messages from the same thread are batched into a single dispatch. Default delay: 300ms (configurable via `debounce_delay`). Pending batches are flushed on shutdown.

### Message Formatting

LLM markdown output is converted to Slack mrkdwn:

```
Markdown → Slack mrkdwn
**bold**  → *bold*
_italic_  → _italic_
~~strike~~ → ~strike~
# Header  → *Header*
[text](url) → <url|text>
```

Tables render as code blocks. Slack-native tokens (`<@U123>`, `<#C456>`, URLs) are preserved through the conversion pipeline. Messages exceeding 4,000 characters are split at newline boundaries.

### Streaming

Enable live response updates via `chat.update` (edit-in-place):

- **DMs** (`dm_stream`): Edits the "Thinking..." placeholder as chunks arrive
- **Groups** (`group_stream`): Same behavior, within threads

Updates are throttled to 1 edit per second to avoid Slack rate limits. Set `native_stream: true` to use Slack's ChatStreamer API when available.

### Reactions

Show emoji status on user messages. Set `reaction_level`:

- `off` — No reactions (default)
- `minimal` — Only thinking and done
- `full` — All statuses: thinking, tool use, done, error, stall

| Status | Emoji |
|--------|-------|
| Thinking | :thinking_face: |
| Tool use | :hammer_and_wrench: |
| Done | :white_check_mark: |
| Error | :x: |
| Stall | :hourglass_flowing_sand: |

Reactions are debounced at 700ms to prevent API spam.

### Media Handling

**Receiving files:** Files attached to messages are downloaded with SSRF protection (hostname allowlist: `*.slack.com`, `*.slack-edge.com`, `*.slack-files.com`). Auth tokens are stripped on redirect. Files exceeding `media_max_bytes` (default 20MB) are skipped.

**Sending files:** Agent-generated files are uploaded via Slack's file upload API. Failed uploads show an inline error message.

**Document extraction:** Document files (PDFs, text files) have their content extracted and appended to the message for the agent to process.

### Custom Bot Identity

With an optional User Token (`xoxp-`), the bot can post with a custom username and icon:

1. In **OAuth & Permissions** → **User Token Scopes** → add `chat:write.customize`
2. Re-install the app
3. Add `user_token` to config

### Group Policy: Pairing

Slack supports group-level pairing. When `group_policy: "pairing"`:
- Admin approves channels via CLI: `goclaw pairing approve <code>`
- Or via the GoClaw web UI (Pairing section)
- Pairing codes for groups are **not** shown in the channel (security: visible to all members)

The `allow_from` list supports both user IDs and Slack channel IDs for group-level allowlisting.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `invalid_auth` on startup | Wrong token or revoked. Re-generate token in Slack app settings. |
| `missing_scope` error | Required scope not added. Add scope in OAuth & Permissions, reinstall app. |
| Bot doesn't respond in channel | Bot not invited to channel. Run `/invite @BotName`. |
| Bot doesn't respond in DM | DM policy is `disabled` or pairing required. Check `dm_policy` config. |
| Socket Mode won't connect | App-Level Token (`xapp-`) missing or incorrect. Check Basic Information page. |
| Bot responds without custom name | User Token not configured. Add `user_token` with `chat:write.customize` scope. |
| Messages processed twice | Socket Mode reconnect dedup is built-in. If persists, check for duplicate app_mention + message events — normal behavior, dedup handles it. |
| Rapid messages sent separately | Increase `debounce_delay` (default 300ms). |
| Thread auto-reply stopped | Thread participation expired (`thread_ttl`, default 24h). Mention bot again. |

## What's Next

- [Overview](/channels-overview) — Channel concepts and policies
- [Telegram](/channel-telegram) — Telegram bot setup
- [Discord](/channel-discord) — Discord bot setup
- [Browser Pairing](/channel-browser-pairing) — Pairing flow

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
