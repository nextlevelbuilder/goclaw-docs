# WebSocket Issues

> Troubleshooting WebSocket connections, authentication, and message handling in GoClaw.

## Overview

GoClaw exposes a single WebSocket endpoint at `/ws`. All real-time communication between clients and the gateway — chat, events, RPC calls — flows through this connection. This page covers the most common failure patterns with causes and fixes.

## Authentication

The first frame sent after connecting **must** be a `connect` method call. Any other method before authentication returns an `UNAUTHORIZED` error.

| Problem | Cause | Solution |
|---------|-------|----------|
| `UNAUTHORIZED: first request must be 'connect'` | Sent a method other than `connect` first | Always send `{"type":"req","method":"connect","params":{...}}` as the very first frame |
| `UNAUTHORIZED` on every request | Token missing or wrong | Check `Authorization` header or token param in connect payload |
| Browser pairing stuck | Waiting for admin approval | Only `browser.pairing.status` is allowed before approval completes — poll that method |
| Connection rejected immediately | Origin not in allowlist | Add your frontend origin to `gateway.allowed_origins` in config (see CORS below) |

**Connect frame example:**

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_API_KEY",
    "user_id": "user-123"
  }
}
```

## Connection Errors

| Problem | Cause | Solution |
|---------|-------|----------|
| HTTP 101 never received | Wrong URL or gateway not running | Endpoint is `ws://host:8080/ws` (or `wss://` with TLS); verify gateway is up |
| `websocket upgrade failed` in server logs | Proxy not forwarding `Upgrade` header | Configure nginx/caddy to pass `Connection: Upgrade` and `Upgrade: websocket` |
| Connection drops after 60 seconds of silence | Read deadline timeout | Gateway expects a pong reply every 60 s; implement pong handling in your client |
| `websocket read error` in server logs | Client closed abruptly (tab close, network drop) | Normal for browser clients; implement reconnect logic with exponential backoff |
| `INVALID_REQUEST: unexpected frame type` | Sent a non-request frame type | Only `req` frames are supported from clients |
| `INVALID_REQUEST: invalid frame` | Malformed JSON | Validate payload structure against the protocol wire types |

### CORS

If you see the connection rejected in the browser console with a CORS error, the request origin is not in the allowlist.

```yaml
# config.json5
gateway: {
  allowed_origins: ["https://app.example.com", "http://localhost:3000"]
}
```

Non-browser clients (CLI, SDK, channels) send no `Origin` header and are always allowed.

## Message Size

The server enforces a **512 KB** limit per WebSocket frame (`maxWSMessageSize = 512 * 1024`). When a frame exceeds this limit, gorilla/websocket raises `ErrReadLimit` and the server closes the connection.

| Problem | Cause | Solution |
|---------|-------|----------|
| Connection drops mid-send | Frame exceeds 512 KB | Split large payloads across multiple requests; avoid sending binary blobs inline |
| File upload fails over WebSocket | File content embedded in frame | Use the HTTP media upload endpoint (`/api/media/upload`) instead |

**Rule of thumb:** keep request payloads under 100 KB. Reserve large content for HTTP endpoints.

## Rate Limiting

Rate limiting is **disabled by default**. When enabled (`gateway.rate_limit_rpm > 0`), the gateway enforces a per-user token-bucket limiter with a burst of 5.

| Problem | Cause | Solution |
|---------|-------|----------|
| Requests silently dropped (no response) | Per-user rate limit exceeded | Back off and retry; reduce request frequency |
| `security.rate_limited` in server logs | Client exceeding `rate_limit_rpm` | Increase `gateway.rate_limit_rpm` or reduce client request volume |

**Ping/pong frames do not count** toward rate limiting — only RPC request frames do.

To configure rate limiting:

```yaml
# config.json5
gateway: {
  rate_limit_rpm: 60   # 60 requests per minute per user, burst 5
}
```

Set to `0` or omit to disable (default).

## Ping / Pong

The gateway sends a WebSocket ping every **30 seconds**. The read deadline resets to **60 seconds** on each pong reply.

If the client fails to reply to pings within 60 seconds, the server considers the connection dead and closes it.

| Problem | Cause | Solution |
|---------|-------|----------|
| Connection drops on idle clients | Client not responding to ping frames | Enable automatic pong in your WebSocket library (most do this by default) |
| Connection drops after exactly 60 s | Pong handler not registered | Explicitly register a pong handler that resets your read deadline |

Most WebSocket libraries (browser native, `ws` for Node.js, gorilla) handle ping/pong automatically. Check your library's docs if connections drop on idle.

## Client Libraries

| Library | Notes |
|---------|-------|
| Browser `WebSocket` API | Ping/pong handled by browser. No special config needed. |
| Node.js `ws` | Enable `{ autoPong: true }` (default in recent versions) |
| Python `websockets` | Ping/pong automatic; use `ping_interval` / `ping_timeout` params |
| Go `gorilla/websocket` | Register pong handler and reset read deadline manually |
| CLI / curl | Use `websocat` — it handles pong automatically |

**Reconnect pattern:** on any close event, wait 1 s → re-connect → re-authenticate with `connect` → resume.

## Session Ownership (v2.66+)

All 5 `chat.*` WebSocket methods (`chat.send`, `chat.history`, `chat.inject`, `chat.abort`, `chat.session.status`) now enforce session ownership via `requireSessionOwner`. Non-admin users can only access their own sessions.

| Problem | Cause | Solution |
|---------|-------|----------|
| `FORBIDDEN: session does not belong to user` | Non-admin user tried to read or write another user's session | Use the session ID that belongs to the authenticated user; admins bypass this check |
| Suddenly getting ownership errors after upgrade | Upgraded to v2.66+ with shared session IDs | Each user must use their own session ID; admin tokens bypass ownership checks |

This is a security fix (Session IDOR). If your integration uses shared session IDs across users, each user must authenticate with their own token and session.

## What's Next

- [Common Issues](/troubleshoot-common) — startup, agent, memory problems
- [Channels Troubleshooting](/troubleshoot-channels) — Telegram, Discord, WhatsApp issues

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
