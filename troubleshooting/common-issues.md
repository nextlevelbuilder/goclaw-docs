# Common Issues

> Fixes for the most frequent problems when running GoClaw.

## Overview

This page covers issues you're likely to hit when starting GoClaw for the first time or after a configuration change. Problems are grouped by phase: startup, WebSocket connection, agent behavior, and resource usage.

## Gateway Won't Start

| Problem | Cause | Solution |
|---------|-------|----------|
| `failed to load config` | Config file path wrong or malformed JSON5 | Check `GOCLAW_CONFIG` env var; validate JSON5 syntax |
| `No AI provider API key found` | API key env vars not loaded | Run `source .env.local && ./goclaw` or re-run `./goclaw onboard` |
| `ping postgres: dial error` | PostgreSQL not running or wrong DSN | Verify `GOCLAW_POSTGRES_DSN`; check Postgres is up |
| `open discord session` error | Invalid Discord bot token | Recheck `GOCLAW_DISCORD_TOKEN` in your env |
| `sandbox disabled: Docker not available` | Docker not installed/running when sandbox mode is set | Install Docker or set `sandbox.mode: "off"` in config |
| Port already in use | Another process on the same port | Change `GOCLAW_PORT` (default `8080`) or kill the conflicting process |
| `database schema is outdated` | DB migrations not run after binary upgrade | Run `./goclaw upgrade` (or set `GOCLAW_AUTO_UPGRADE=true`) |
| `database schema is dirty` | A previous migration failed partway | Run `./goclaw migrate force <version-1>` then `./goclaw upgrade` |
| `database schema is newer than this binary` | Running an older binary against a newer DB | Upgrade your GoClaw binary to the latest version |

**Quick check:** GoClaw auto-detects missing provider config and prints a helpful message:

```
No AI provider API key found. Did you forget to load your secrets?

  source .env.local && ./goclaw
```

## WebSocket Connection Fails

The WebSocket endpoint is `ws://localhost:8080/ws`. The first frame sent **must** be a `connect` method — any other method returns `ErrUnauthorized: first request must be 'connect'`.

| Problem | Cause | Solution |
|---------|-------|----------|
| `first request must be 'connect'` | Wrong frame order | Send `{"type":"req","method":"connect","params":{...}}` first |
| `invalid frame` / `malformed request` | Bad JSON | Validate your frame against `pkg/protocol` wire types |
| `websocket read error` (log) | Client closed abruptly | Normal for browser tab closes; check client-side reconnect logic |
| Rate limited (no response) | Too many requests per user | Gateway enforces per-user token-bucket rate limiting; back off and retry |
| CORS block in browser | Browser enforcing same-origin | Add your frontend origin to `gateway.allowed_origins` in config |
| Message exceeds 512 KB | WebSocket frame larger than server limit | Split large payloads; GoClaw closes connections with `ErrReadLimit` when exceeded |

## Agent Not Responding

| Problem | Cause | Solution |
|---------|-------|----------|
| `HTTP 401` from provider | Invalid or expired API key | Update the provider's API key in the dashboard or DB |
| `HTTP 429` from provider | Rate limit hit upstream | GoClaw retries automatically (up to 3× with exponential backoff); if persistent, reduce request volume |
| `HTTP 404` / model not found | Model name wrong or unavailable | Check the model name in your agent config against the provider's current model list |
| Agent returns empty reply | System prompt issue or token limit | Check `bootstrap/` files; review context window usage in session tracing |
| Tool calls not executing | Missing tool registration or sandbox misconfigured | Check startup logs for `registered tool:` lines; verify Docker if sandbox is enabled |

GoClaw retries on `429`, `500`, `502`, `503`, `504`, and network errors (connection reset, EOF, timeout) with exponential backoff starting at 300ms, capped at 30s.

## High Memory Usage

| Problem | Cause | Solution |
|---------|-------|----------|
| Memory grows with session count | Many open sessions cached in-memory | Sessions are Postgres-backed; check session cleanup intervals in config |
| Large embeddings footprint | pgvector index loading | Normal for large memory collections; ensure `WORK_MEM` is set in Postgres |
| Log buffer growing | `LogTee` captures all logs for UI streaming | Not a leak; bounded per-client. Check for stuck WS clients |

## Diagnostics

Run `./goclaw doctor` for a quick health check. It verifies:

- Config file presence and parse
- PostgreSQL connectivity and schema version
- Provider API keys (masked)
- Channel credentials
- External tools (Docker, curl, git)
- Workspace directory

```
./goclaw doctor
```

## What's Next

- [Channel-specific issues](#troubleshoot-channels)
- [Provider-specific issues](#troubleshoot-providers)
- [Database issues](#troubleshoot-database)

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
