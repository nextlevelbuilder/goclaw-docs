# Usage & Quota

> Track token consumption per agent and session, and enforce per-user request limits across hour, day, and week windows.

## Overview

GoClaw gives you two related but distinct features:

- **Usage tracking** — how many tokens each agent/session consumed, queryable via the dashboard or WebSocket.
- **Quota enforcement** — optional per-user/group message limits (e.g., 10 requests/hour for Telegram users) backed by the traces table.

Both are always available when PostgreSQL is connected. Quota enforcement is opt-in via config.

---

## Usage Tracking

Token counts are accumulated in the session store as the agent loop runs. Every LLM call adds to the session's `input_tokens` and `output_tokens` totals. You can query this data via two WebSocket methods.

### `usage.get` — per-session records

```json
{
  "type": "req",
  "id": "1",
  "method": "usage.get",
  "params": {
    "agentId": "my-agent",
    "limit": 20,
    "offset": 0
  }
}
```

`agentId` is optional — omit it to get records across all agents. Results are sorted most-recent first.

Response:

```json
{
  "records": [
    {
      "agentId": "my-agent",
      "sessionKey": "agent:my-agent:user_telegram_123",
      "model": "claude-sonnet-4-5",
      "provider": "anthropic",
      "inputTokens": 14200,
      "outputTokens": 3100,
      "totalTokens": 17300,
      "timestamp": 1741234567000
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `usage.summary` — aggregate by agent

```json
{ "type": "req", "id": "2", "method": "usage.summary" }
```

Response:

```json
{
  "byAgent": {
    "my-agent": {
      "inputTokens": 892000,
      "outputTokens": 210000,
      "totalTokens": 1102000,
      "sessions": 37
    }
  },
  "totalRecords": 37
}
```

Sessions with zero tokens are excluded from both responses.

### HTTP REST API — analytics from snapshots

GoClaw also exposes a REST API for historical usage analytics, backed by the `usage_snapshots` table (pre-aggregated hourly). All endpoints require a Bearer token if `gateway.token` is set.

| Endpoint | Description |
|----------|-------------|
| `GET /v1/usage/timeseries` | Token and request counts over time, bucketed by hour (default) |
| `GET /v1/usage/breakdown` | Aggregated breakdown grouped by `provider`, `model`, or `channel` |
| `GET /v1/usage/summary` | Current vs previous period summary with delta stats |

**Common query parameters:**

| Parameter | Example | Notes |
|-----------|---------|-------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339, required for timeseries/breakdown |
| `to` | `2026-03-15T23:59:59Z` | RFC 3339, required for timeseries/breakdown |
| `group_by` | `hour`, `provider`, `model`, `channel` | Defaults vary per endpoint |
| `agent_id` | UUID | Filter by agent |
| `provider` | `anthropic` | Filter by provider |
| `model` | `claude-sonnet-4-5` | Filter by model |
| `channel` | `telegram` | Filter by channel |

**`GET /v1/usage/summary`** additionally accepts `period`:

| `period` value | Description |
|----------------|-------------|
| `24h` (default) | Last 24 hours vs preceding 24 hours |
| `today` | Calendar day vs previous calendar day |
| `7d` | Last 7 days vs preceding 7 days |
| `30d` | Last 30 days vs preceding 30 days |

The timeseries endpoint gap-fills the current incomplete hour by querying live traces directly, so the latest data point is always up to date.

---

## Quota Enforcement

Quota is checked against the `traces` table (top-level traces only — sub-agent delegations don't count against user quota). Counts are cached in memory for 60 seconds to avoid hammering the database on every request.

### Config

Add a `quota` block inside `gateway` in your `config.json`:

```json
{
  "gateway": {
    "quota": {
      "enabled": true,
      "default": { "hour": 20, "day": 100, "week": 500 },
      "channels": {
        "telegram": { "hour": 10, "day": 50 }
      },
      "providers": {
        "anthropic": { "day": 200 }
      },
      "groups": {
        "group:telegram:-1001234567": { "hour": 5, "day": 20 }
      }
    }
  }
}
```

All limits are optional — a value of `0` (or omitting the field) means unlimited.

**Priority order (most specific wins):** `groups` > `channels` > `providers` > `default`

| Field | Key format | Description |
|-------|-----------|-------------|
| `default` | — | Fallback for any user not matched by a more specific rule |
| `channels` | Channel name, e.g. `"telegram"` | Applies to all users on that channel |
| `providers` | Provider name, e.g. `"anthropic"` | Applies when that LLM provider is used |
| `groups` | User/group ID, e.g. `"group:telegram:-100123"` | Per-user or per-group override |

### What happens when quota is exceeded

The channel layer checks quota before dispatching a message to the agent. If the user is over limit, the agent never runs and the user receives an error message. The response includes which window was exceeded and the current counts:

```
Quota exceeded: 10/10 requests this hour. Try again later.
```

### `quota.usage` — dashboard view

```json
{ "type": "req", "id": "3", "method": "quota.usage" }
```

Response when quota is enabled:

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [
    {
      "userId": "user:telegram:123456",
      "hour": { "used": 3, "limit": 10 },
      "day":  { "used": 47, "limit": 100 },
      "week": { "used": 200, "limit": 500 }
    }
  ]
}
```

`entries` is capped at 50 users (the top 50 by weekly request count).

When quota is disabled (`"enabled": false`), the response still includes today's aggregate stats (`requestsToday`, `inputTokensToday`, `costToday`, etc.) — the `entries` array is empty and `"enabled": false`.

---

## Webhook Rate Limiting (Channel Layer)

Separate from per-user quota, there is a webhook-level rate limiter that protects against incoming webhook floods. It uses a fixed 60-second window with a hard cap of **30 requests per key** per window. Up to **4096 unique keys** are tracked simultaneously; beyond that, oldest entries are evicted.

This rate limiter operates at the HTTP webhook receiver layer, before messages reach the agent. It is not configurable — it is a fixed DoS protection measure.

---

## Database Index

Quota lookups use a partial index added in migration `000009`:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traces_quota
ON traces (user_id, created_at DESC)
WHERE parent_trace_id IS NULL AND user_id IS NOT NULL;
```

This index covers 89% of traces (top-level only) and makes hourly/daily/weekly window queries fast even with large trace tables.

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `quota.usage` returns `enabled: false` | `quota.enabled` not set to `true` in config | Set `"enabled": true` in `gateway.quota` |
| Users hit quota despite low usage | Cache TTL is 60s — counts lag by up to 1 minute | Expected behavior; the optimistic increment mitigates rapid bursts |
| `requestsToday` is 0 even with activity | No traces written — tracing may be disabled | Ensure PostgreSQL is connected and `GOCLAW_POSTGRES_DSN` is set |
| Quota not enforced on a channel | Channel name in config doesn't match actual channel key | Use exact channel name: `telegram`, `discord`, `feishu`, `zalo`, `whatsapp` |
| Sub-agent messages count against user quota | They shouldn't — only top-level traces count | Verify `parent_trace_id IS NULL` filter; check if agent is delegating via subagent tool |

---

## What's Next

- [Observability](#deploy-observability) — OpenTelemetry tracing and Jaeger integration
- [Security Hardening](#deploy-security) — rate limiting at the gateway level
- [Database Setup](#deploy-database) — PostgreSQL setup including the quota index

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
