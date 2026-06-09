# Cost Tracking

> Monitor token costs per agent and provider using configurable per-model pricing.

## Overview

GoClaw calculates USD costs for every LLM call when you configure pricing in `telemetry.model_pricing`. Cost data is stored on individual trace spans and aggregated into the `usage_snapshots` table. You can view it via the REST usage API or the WebSocket `quota.usage` method.

Cost tracking requires:
- PostgreSQL connected (`GOCLAW_POSTGRES_DSN`)
- `telemetry.model_pricing` configured in `config.json`

If pricing is not configured, token counts are still tracked — only dollar amounts will be zero.

---

## Pricing Configuration

Add a `model_pricing` map inside the `telemetry` block in `config.json`. Keys are either `"provider/model"` or just `"model"`. The lookup tries the specific key first, then falls back to the bare model name.

```json
{
  "telemetry": {
    "model_pricing": {
      "anthropic/claude-sonnet-4-5": {
        "input_per_million": 3.00,
        "output_per_million": 15.00,
        "cache_read_per_million": 0.30,
        "cache_create_per_million": 3.75
      },
      "anthropic/claude-haiku-3-5": {
        "input_per_million": 0.80,
        "output_per_million": 4.00
      },
      "openai/gpt-4o": {
        "input_per_million": 2.50,
        "output_per_million": 10.00
      },
      "gemini-2.0-flash": {
        "input_per_million": 0.10,
        "output_per_million": 0.40
      }
    }
  }
}
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `input_per_million` | Yes | USD per 1M prompt tokens |
| `output_per_million` | Yes | USD per 1M completion tokens |
| `cache_read_per_million` | No | USD per 1M cache-read tokens (Anthropic prompt caching) |
| `cache_create_per_million` | No | USD per 1M cache-creation tokens (Anthropic prompt caching) |

---

## How Cost Is Calculated

For each LLM call, GoClaw computes:

```
cost = (prompt_tokens × input_per_million / 1_000_000)
     + (completion_tokens × output_per_million / 1_000_000)
     + (cache_read_tokens × cache_read_per_million / 1_000_000)   // if > 0
     + (cache_creation_tokens × cache_create_per_million / 1_000_000)  // if > 0
```

Token counts come directly from the provider's API response. Cost is recorded on the LLM call span and rolled up to the trace level. Tools that make internal LLM calls (e.g., `read_image`, `read_document`) also have their costs tracked separately on their own spans.

---

## Querying Cost Data

### REST API

Cost is included in the standard usage endpoints. All endpoints require `Authorization: Bearer <token>` if `gateway.token` is set.

**`GET /v1/usage/summary`** — current vs. previous period totals:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/summary?period=30d"
```

```json
{
  "current": {
    "requests": 1240,
    "input_tokens": 8420000,
    "output_tokens": 1980000,
    "cost": 42.31,
    "unique_users": 18,
    "errors": 3,
    "llm_calls": 3810,
    "tool_calls": 6200,
    "avg_duration_ms": 3200
  },
  "previous": {
    "requests": 890,
    "cost": 29.17,
    ...
  }
}
```

`period` values: `24h` (default), `today`, `7d`, `30d`.

**`GET /v1/usage/breakdown`** — cost grouped by provider, model, or channel:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/breakdown?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=model"
```

```json
{
  "rows": [
    {
      "group": "claude-sonnet-4-5",
      "input_tokens": 6100000,
      "output_tokens": 1400000,
      "total_cost": 35.10,
      "request_count": 820
    },
    {
      "group": "gpt-4o",
      "input_tokens": 2320000,
      "output_tokens": 580000,
      "total_cost": 7.21,
      "request_count": 420
    }
  ]
}
```

`group_by` options: `provider` (default), `model`, `channel`.

**`GET /v1/usage/timeseries`** — cost over time:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/timeseries?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=hour"
```

```json
{
  "points": [
    {
      "bucket_time": "2026-03-01T00:00:00Z",
      "request_count": 48,
      "input_tokens": 320000,
      "output_tokens": 78000,
      "total_cost": 1.73,
      "llm_call_count": 142,
      "tool_call_count": 230,
      "error_count": 0,
      "unique_users": 5,
      "avg_duration_ms": 2800
    }
  ]
}
```

**Common query parameters** (timeseries and breakdown):

| Parameter | Example | Notes |
|-----------|---------|-------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339, required |
| `to` | `2026-03-16T00:00:00Z` | RFC 3339, required |
| `group_by` | `hour`, `model`, `provider`, `channel` | Defaults vary per endpoint |
| `agent_id` | UUID | Filter by agent |
| `provider` | `anthropic` | Filter by provider |
| `model` | `claude-sonnet-4-5` | Filter by model |
| `channel` | `telegram` | Filter by channel |

### WebSocket

The `quota.usage` method returns today's cost alongside usage counters:

```json
{ "type": "req", "id": "1", "method": "quota.usage" }
```

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [...]
}
```

`costToday` is always present. If pricing is not configured it will be `0`.

---

## Per-Sub-Agent Token Cost Tracking

As of v3 (#600), token costs are accumulated per sub-agent and included in announce messages. This means:

- Each spawned sub-agent accumulates its own `input_tokens` and `output_tokens` independently
- When a sub-agent completes, its token totals are included in the announce message sent to the parent agent's LLM context
- Token costs are persisted to the `subagent_tasks` table (migration 000034) for billing and observability queries
- Sub-agent token costs roll up to the parent trace's cost via the existing trace span hierarchy

Sub-agent costs appear in the same REST endpoints (`/v1/usage/timeseries`, `/v1/usage/breakdown`) under the sub-agent's own `agent_id`. To see the total cost of a multi-agent workflow, sum costs across all `agent_id` values that share the same root trace.

---

## Monthly Budget Enforcement

You can cap an agent's monthly spend by setting `budget_monthly_cents` on the agent record. When set, GoClaw queries the current month's accumulated cost before each run and blocks execution if the budget is exceeded.

Set via the agents API or directly in the `agents` table:

```json
{
  "budget_monthly_cents": 500
}
```

This example sets a $5.00/month limit. When the agent hits the limit, it returns an error:

```
monthly budget exceeded ($5.02 / $5.00)
```

The check runs once per request, before any LLM calls. Sub-agent delegations run under their own agent records with their own budgets.

> The agent's `budget_monthly_cents` is also mirrored into the [AI Budget Usage Caps](/usage-quota) system as a managed `month`-window cost-cap policy, so the same limit is enforced there too.

---

## Model Pricing (Catalog & Overrides)

The static `telemetry.model_pricing` map above is the simplest way to price models. For dynamic, database-backed pricing — used by the [AI Budget Usage Caps](/usage-quota) cost caps — GoClaw also keeps a **pricing catalog** and per-tenant **overrides** in PostgreSQL (migration `000070`).

### OpenRouter catalog sync

GoClaw can pull a full model price list from [OpenRouter](https://openrouter.ai) and store it in the `usage_pricing_catalog` table. Each entry captures per-unit prices for input, output, cache read/write, reasoning, request, image, and web-search units, stored as high-precision decimals.

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/sync-openrouter"
```

This endpoint requires **master scope** (it updates the shared global catalog). The catalog is upserted by `model_id`, so re-running the sync refreshes prices in place.

### Per-model price overrides

When you want different prices for a specific tenant + provider + model (e.g. a negotiated rate, or a model OpenRouter doesn't list), set an **override** in the `usage_pricing_overrides` table. Overrides are scoped to one tenant and take priority over the global catalog.

```bash
# List the synced catalog (optionally filter by model)
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing?model=claude-sonnet-4-5"

# Set a tenant override
curl -X PUT -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/model-pricing/overrides" \
  -d '{
    "provider_id": "22222222-2222-2222-2222-222222222222",
    "provider_type": "anthropic",
    "model_id": "claude-sonnet-4-5",
    "pricing": { "input": "0.000003", "output": "0.000015" }
  }'

# List / delete overrides
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/overrides"
curl -X DELETE -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/overrides/{id}"
```

| Method & path | Scope | Description |
|---------------|-------|-------------|
| `POST /v1/model-pricing/sync-openrouter` | master | Refresh the global price catalog from OpenRouter |
| `GET /v1/model-pricing` | admin | List the synced catalog (`?model=`, `?limit=`) |
| `PUT /v1/model-pricing/overrides` | tenant-admin | Create or update a per-tenant model price override |
| `GET /v1/model-pricing/overrides` | admin | List overrides (`?provider_id=`) |
| `DELETE /v1/model-pricing/overrides/{id}` | tenant-admin | Remove an override |

### How pricing resolves

When a cost cap needs a price for a model, GoClaw resolves in this order:

1. **Tenant override** for the matching provider + model (highest priority)
2. **Global OpenRouter catalog** entry by `model_id` / canonical id

If neither is found, a cost-capped call is blocked with reason `pricing_unknown`. Prices are stored as decimal USD **per token/unit** and converted to micro-dollars when caps compute cost.

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `cost` is always `0` in API responses | `model_pricing` not configured | Add pricing under `telemetry.model_pricing` in `config.json` |
| Cost recorded for some models only | Key mismatch in pricing map | Use exact `"provider/model"` key (e.g., `"anthropic/claude-sonnet-4-5"`) or bare model name |
| Budget check blocks all runs | Monthly cost already exceeds `budget_monthly_cents` | Increase the budget or reset it; costs reset automatically at month rollover |
| Timeseries/breakdown returns empty | `from`/`to` missing or outside snapshot range | Snapshots are hourly; data older than retention period may be pruned |
| `costToday` in `quota.usage` is stale | Snapshots are pre-aggregated hourly | The current incomplete hour is gap-filled live from traces |

---

## What's Next

- [Usage & Quota](/usage-quota) — per-user request limits and token counts
- [Observability](/deploy-observability) — OpenTelemetry export for spans including cost fields
- [Configuration Reference](/config-reference) — full `telemetry` config options

<!-- goclaw-source: d85bf171 | updated: 2026-06-07 -->
