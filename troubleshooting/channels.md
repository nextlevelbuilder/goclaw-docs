# Channel Issues

> Per-channel troubleshooting for Telegram, Discord, Feishu, Zalo, and WhatsApp.

## Overview

Each channel has its own connection mode, permission model, and message format quirks. This page covers the most common failure patterns for each channel. For gateway-level issues (startup, WebSocket, rate limiting) see [Common Issues](/troubleshoot-common).

## General Channel Tips

- Channel errors appear in the gateway log with the channel name as context (e.g., `"feishu bot probe failed"`, `"zalo getUpdates error"`).
- All channels reconnect automatically after transient failures. A warning log does not mean the channel is permanently broken.
- Check channel status via the dashboard or `channels.status` RPC method.

---

## Telegram

Telegram uses **long polling** — no public webhook URL required.

| Problem | Cause | Solution |
|---------|-------|----------|
| `create telegram bot: ...` on startup | Invalid bot token | Verify `GOCLAW_TELEGRAM_TOKEN` with `@BotFather` |
| `start long polling: ...` | Network issue or token revoked | Check connectivity to `api.telegram.org`; reissue token if needed |
| Bot not responding in groups | Group streaming not enabled | Set `group_stream: true` in channel config |
| Menu commands not syncing | `setMyCommands` rate limited | Retried automatically; restart gateway after a few seconds |
| Proxy not connecting | Invalid proxy URL | Use `http://user:pass@host:port` format in `proxy` config field |
| Tables look broken | Telegram HTML has no table support | Expected — GoClaw renders tables as ASCII inside `<pre>` blocks |

**Required env var:** `GOCLAW_TELEGRAM_TOKEN`

---

## Discord

Discord uses a persistent **gateway WebSocket** connection.

| Problem | Cause | Solution |
|---------|-------|----------|
| `create discord session: ...` on startup | Invalid bot token | Verify `GOCLAW_DISCORD_TOKEN` in Discord developer portal |
| `open discord session: ...` | Cannot reach Discord gateway | Check network; see [status.discord.com](https://status.discord.com) |
| Bot not receiving messages | Missing Gateway Intents | Enable **Message Content Intent** in Discord developer portal → Bot |
| Messages truncated | Discord 2000-char limit | GoClaw chunks automatically; check for large code blocks near the limit |
| Pairing reply not sent | DM permissions not granted | Bot must share a server with the user and have DM permissions |

**Required env var:** `GOCLAW_DISCORD_TOKEN`

**Intents checklist** (Discord developer portal → Bot → Privileged Gateway Intents):
- [x] Message Content Intent

---

## Feishu / Lark

Feishu supports two modes: **WebSocket** (default, no public URL needed) and **Webhook** (requires public HTTPS endpoint).

| Problem | Cause | Solution |
|---------|-------|----------|
| `feishu app_id and app_secret are required` | Missing credentials | Set `GOCLAW_LARK_APP_ID` and `GOCLAW_LARK_APP_SECRET` |
| `feishu bot probe failed` (warning only) | Bot info fetch failed; channel still starts | Check app permissions in Feishu console; non-fatal |
| `feishu websocket error` (reconnects) | WS connection dropped | Reconnects automatically; persistent errors suggest firewall blocking `*.larksuite.com` |
| Webhook signature verification fails | Wrong token or encrypt key | Verify `GOCLAW_LARK_VERIFICATION_TOKEN` and `GOCLAW_LARK_ENCRYPT_KEY` match app config |
| Events not delivered in webhook mode | Feishu cannot reach your server | Ensure public HTTPS endpoint; Feishu requires SSL |
| `feishu send media failed` | Media URL not publicly reachable | Host media on a public URL; Feishu fetches media at delivery time |

**Required env vars:**

```bash
GOCLAW_LARK_APP_ID=cli_xxxx
GOCLAW_LARK_APP_SECRET=your_secret
# Webhook mode only:
GOCLAW_LARK_ENCRYPT_KEY=your_encrypt_key
GOCLAW_LARK_VERIFICATION_TOKEN=your_token
```

Set `connection_mode: "websocket"` (default) or `"webhook"` in channel config.

---

## Zalo

Zalo OA Bot is **DM only** (no group chats) with a 2000-character text limit per message. GoClaw chunks longer responses automatically. Runs in polling mode.

| Problem | Cause | Solution |
|---------|-------|----------|
| `zalo token is required` | Missing OA token | Set `GOCLAW_ZALO_TOKEN` with your Zalo OA access token |
| `zalo getMe failed` | Token invalid or expired | Refresh token in Zalo Developer Console; OA tokens expire periodically |
| Bot not responding | DM policy misconfigured | Check `dm_policy` in channel config |
| `zalo getUpdates error` in logs | Polling error (excluding HTTP 408) | HTTP 408 is normal (timeout, no updates); other errors retry after 5s |
| Group messages ignored | Platform limitation | Zalo OA only supports DMs — this is by design |

**Required env var:** `GOCLAW_ZALO_TOKEN`

---

## WhatsApp

WhatsApp connects **directly** via native multi-device protocol. No external bridge service required. Auth state is stored in the database (PostgreSQL/SQLite).

| Problem | Cause | Solution |
|---------|-------|----------|
| No QR code appears | Server can't reach WhatsApp | Check network connectivity (ports 443, 5222) |
| QR scanned but no auth | Auth state corrupted | Use "Re-authenticate" in UI or restart channel |
| `whatsapp bridge_url is required` | Old config still present | Remove `bridge_url` from config/credentials — no longer needed |
| `whatsapp not connected` on send | Not yet authenticated | Scan QR code via UI wizard first |
| `logged out` in logs | WhatsApp revoked session | Use "Re-authenticate" button to scan new QR |
| Group messages ignored | Policy or mention gate | Check `group_policy` and `require_mention` settings |
| Media download failed | Network or file issue | Check logs; verify temp dir writable; max 20 MB per file |

Authentication is done via QR scan in the GoClaw UI (Channels > WhatsApp > Re-authenticate).

---

## What's Next

- [Provider-specific issues](/troubleshoot-providers)
- [Database issues](/troubleshoot-database)
- [Common Issues](/troubleshoot-common)

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
