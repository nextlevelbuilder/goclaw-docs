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

## Edition Rate Limits (Sub-Agent)

Starting with v3 (#600), the active **edition** enforces tenant-scoped sub-agent concurrency limits. These prevent a single tenant from monopolizing sub-agent resources.

| Edition field | Lite default | Standard default | Description |
|---|---|---|---|
| `MaxSubagentConcurrent` | 2 | unlimited (0) | Max sub-agents running in parallel per tenant |
| `MaxSubagentDepth` | 1 | uses config default | Max spawn nesting depth (1 = no sub-agents spawning sub-agents) |

A value of `0` means unlimited. Lite edition is the constrained preset; Standard edition ships with no concurrency caps.

When a spawn request would exceed `MaxSubagentConcurrent`, GoClaw rejects the spawn and returns an error to the parent agent. When `MaxSubagentDepth` is exceeded, nested delegation via `team_tasks` is blocked (`SubagentDenyAlways`).

These limits are edition-level — they apply to every tenant on that GoClaw instance regardless of per-agent budget settings.

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

## AI Budget Usage Caps

Separate from the channel-layer request quota above, GoClaw has a **token- and cost-based cap system** that enforces limits on the LLM provider spend itself. Where request quota counts messages, usage caps count *tokens and dollar cost*, and they apply not only to the main agent turn but to every billable LLM call GoClaw makes on a tenant's behalf.

Caps are stored as **policies** in PostgreSQL (migrations `000070`–`000072`) and managed through a REST API. They are always active once at least one policy exists for a tenant — there is no global on/off config flag.

### Policy model

A cap policy answers: *for this scope, in this time window, how many tokens and/or how much cost is allowed?*

**Scope dimensions** — every policy can leave any dimension unset (NULL) to mean "matches everything":

| Dimension | Meaning |
|-----------|---------|
| `tenant_id` | Always set — every policy belongs to one tenant |
| `agent_id` | Limit one agent (unset = all agents in the tenant) |
| `provider_id` | Limit one configured LLM provider record |
| `provider_type` | Limit a provider family, e.g. `anthropic`, `openai` |
| `model_id` | Limit one model, e.g. `claude-sonnet-4-5` |

**Window types** (`window`): `hour`, `day`, `week`, or `month`. Windows are aligned to UTC calendar boundaries — `day` starts at 00:00 UTC, `week` starts Monday, `month` starts on the 1st.

**Limits** — a policy must set `max_tokens`, `max_cost_micros`, or both:

| Field | Unit |
|-------|------|
| `max_tokens` | Total tokens (input + output + cache read + cache write) |
| `max_cost_micros` | Cost in **micro-dollars** (1 USD = 1,000,000 micros). The API also accepts `max_cost_usd` as a convenience and converts it for you |

**How multiple matching policies combine.** When a request comes in, GoClaw finds *every* enabled policy whose scope matches (NULL dimensions match anything, set dimensions must equal the request). A request must fit under **all** matched policies — the most restrictive one wins. The `priority` field (lower number = evaluated first, default `100`) controls evaluation order, which determines which policy is reported as the blocker when a cap is hit.

### Reservation + counter enforcement

Caps use a **reserve-then-settle** model so concurrent calls can't overspend a window:

1. **Preflight (reserve)** — before the LLM call, GoClaw estimates token usage (and cost, if any matched policy has a cost cap), then atomically adds it to each policy's per-window counter. If the reservation would push `used + reserved + estimate` over a policy's `max_tokens` or `max_cost_micros`, the call is **blocked** before it runs.
2. **Reconcile (settle)** — after the call returns, the reservation is replaced with the *actual* tokens and cost from the provider's usage response. The reserved amount is released and the used amount is recorded. Failed calls settle to zero (the reservation is freed) unless a partial response was received.

Cost estimation needs a price for the model. If a cost-capped policy matches but no pricing is known for the model, the call is **blocked** with reason `pricing_unknown` — see [Cost Tracking → Model Pricing](/cost-tracking) for how to populate prices.

### Caps apply to auxiliary LLM calls too

Usage caps are enforced on **every billable LLM call**, not just the user-facing agent turn. This includes auxiliary calls GoClaw makes internally:

- Conversation title generation
- Intent classification
- Mid-loop and history compaction
- Memory flush
- Knowledge-graph extraction
- Memory consolidation (dreaming / episodic workers)
- Vault enrichment
- Provider verification and summoner regeneration

Each of these reserves and reconciles against the same policies, so a tight `day` token cap will also throttle background work, not only chat replies.

> **Subscription / OAuth providers are exempt.** Caps only apply to providers billed by API key. Providers that are flat-rate or subscription-based (Claude CLI, ChatGPT OAuth, Bailian, ACP, Ollama) are skipped, and so are providers configured without an API key.

### Agent monthly budget bridge

The legacy per-agent `budget_monthly_cents` field (see [Cost Tracking → Monthly Budget Enforcement](/cost-tracking)) is automatically mirrored into the cap system. Migration `000072` creates, for every agent with a positive `budget_monthly_cents`, a managed `month`-window cost-cap policy:

- `max_cost_micros` = `budget_monthly_cents × 10,000` (cents → micro-dollars)
- `source` = `agent_budget_monthly_cents`, `priority` = `90`

These bridged policies are **managed** — the REST API refuses to edit or delete them (returns `409 Conflict`). Adjust the agent's `budget_monthly_cents` instead. Manually created policies have `source` = `manual`.

### What happens when a cap is hit

When a reservation is rejected, GoClaw returns a `usage cap exceeded` error from the LLM call. For the main agent turn this surfaces as a failed run — the agent does not produce a reply. A `block` decision is also written to the events log (see below) recording which policy and reason (`cap_exceeded` or `pricing_unknown`) triggered it.

### Decision tracing

Every cap decision is recorded in two places:

- **`usage_cap_events`** — an append-only audit log of `allow` / `block` / `skip` decisions with the policy, reservation key, estimated/actual tokens and cost, and reason. Queryable via the events endpoint.
- **Trace metadata** — each agent trace carries a `usage_caps` block listing the decision, matched policy IDs, reservation key, and estimated vs. actual tokens/cost per LLM attempt, so you can see cap behavior inline with the rest of the trace.

### REST endpoints

All usage-cap endpoints require an admin Bearer token. Write operations (create/update/delete policy, pricing overrides) additionally require tenant-admin scope; the OpenRouter sync endpoint requires master scope.

| Method & path | Scope | Description |
|---------------|-------|-------------|
| `GET /v1/usage-caps/policies` | admin | List all cap policies for the tenant (includes disabled) |
| `POST /v1/usage-caps/policies` | tenant-admin | Create a cap policy |
| `PATCH /v1/usage-caps/policies/{id}` | tenant-admin | Update a policy (managed agent-budget policies are rejected) |
| `DELETE /v1/usage-caps/policies/{id}` | tenant-admin | Delete a policy (managed policies are rejected) |
| `GET /v1/usage-caps/utilization` | admin | Current per-policy usage vs. limit for the active window |
| `GET /v1/usage-caps/events` | admin | Recent cap decisions (`?limit=`, default 50, max 200) |

**Create a policy** — cap one agent to 1M tokens per day:

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/usage-caps/policies" \
  -d '{
    "agent_id": "11111111-1111-1111-1111-111111111111",
    "window": "day",
    "max_tokens": 1000000
  }'
```

**Create a cost cap** — limit Anthropic spend to $20/month tenant-wide (`max_cost_usd` is converted to micros):

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/usage-caps/policies" \
  -d '{
    "provider_type": "anthropic",
    "window": "month",
    "max_cost_usd": 20.00
  }'
```

**Check utilization:**

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage-caps/utilization"
```

Model pricing (which feeds the cost calculation behind cost caps) is configured through a separate set of endpoints — see [Cost Tracking → Model Pricing](/cost-tracking).

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

- [Observability](/deploy-observability) — OpenTelemetry tracing and Jaeger integration
- [Security Hardening](/deploy-security) — rate limiting at the gateway level
- [Database Setup](/deploy-database) — PostgreSQL setup including the quota index

<!-- goclaw-source: d85bf171 | updated: 2026-06-07 -->
