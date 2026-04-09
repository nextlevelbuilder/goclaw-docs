# Observability

> Monitor every LLM call, tool use, and agent run — from the built-in dashboard to Jaeger and beyond.

## Overview

GoClaw ships with built-in tracing that records every agent run as a **trace** and each LLM call or tool use as a **span**. Traces are stored in PostgreSQL and visible immediately in the dashboard. If you need to integrate with your existing observability stack (Grafana Tempo, Datadog, Honeycomb, Jaeger), you can export spans over OTLP by building with `-tags otel`.

```mermaid
graph LR
    A[Agent Run] --> B[Collector]
    B --> C[(PostgreSQL)]
    B --> D[OTel Exporter]
    D --> E[Jaeger / Tempo / etc.]
    C --> F[Dashboard UI]
    C --> G[HTTP API]
```

## How Tracing Works

The `tracing.Collector` runs a background flush loop (every 5 seconds) that:

1. Drains a 1000-span in-memory buffer
2. Batch-inserts spans into PostgreSQL
3. Forwards spans to any attached `SpanExporter` (OTel, etc.)
4. Updates per-trace aggregate counters (total tokens, duration, status)

Traces and spans are linked by `trace_id`. Each agent run creates one trace; LLM calls and tool invocations inside that run become child spans.

**Span types recorded:**

| Span type | What it captures |
|-----------|-----------------|
| `llm_call` | Model, tokens in/out, finish reason, latency |
| `tool_call` | Tool name, call ID, duration, status |
| `agent` | Full run lifecycle, output preview |
| `embedding` | Embedding generation for vector store operations |
| `event` | Discrete event marker (no duration) |

## Viewing Traces

### Dashboard

Open the **Traces** section in the web UI (default: `http://localhost:18790`). You can filter by agent, date range, and status.

The Traces UI includes:
- **Timestamps** on each span for precise timing
- **Copy button** on span details for easy export of trace data
- **Syntax highlighting** on JSON payloads in span previews

### Verbose Mode

By default, input messages are truncated to 500 characters in span previews. To store full LLM inputs (useful for debugging):

```bash
export GOCLAW_TRACE_VERBOSE=1
./goclaw
```

In verbose mode, LLM spans store full input/output up to 200 KB; tool spans store full input and output up to 200 KB.

> Use verbose mode only in dev — full messages can be large.

## Trace Export

Individual traces (including all spans and sub-traces) can be exported via HTTP:

```
GET /v1/traces/{traceID}/export
```

The response is **gzip-compressed JSON** containing the trace, its spans, and recursively collected child traces (`sub_traces`). This is useful for offline analysis, bug reports, or archiving long agent runs.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:18790/v1/traces/{traceID}/export \
  --output trace.json.gz

gunzip trace.json.gz
```

## Trace HTTP API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/traces` | List traces with pagination and filters |
| GET | `/v1/traces/{id}` | Get trace details with all spans |
| GET | `/v1/traces/{id}/export` | Export trace + sub-traces as gzip JSON |

### Query Filters (GET /v1/traces)

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | UUID | Filter by agent |
| `user_id` | string | Filter by user |
| `status` | string | `running`, `success`, `error`, `cancelled` |
| `from` / `to` | timestamp | Date range filter |
| `limit` | int | Page size (default 50) |
| `offset` | int | Pagination offset |

## OpenTelemetry Export

The OTel exporter is compiled in only when you add `-tags otel`. The default build has zero OTel dependencies, saving approximately 15–20 MB from the binary.

### Build with OTel support

```bash
go build -tags otel -o goclaw .
```

### Configure via environment

```bash
export GOCLAW_TELEMETRY_ENABLED=true
export GOCLAW_TELEMETRY_ENDPOINT=localhost:4317   # OTLP gRPC endpoint
export GOCLAW_TELEMETRY_PROTOCOL=grpc             # "grpc" (default) or "http"
export GOCLAW_TELEMETRY_INSECURE=true             # skip TLS for local dev
export GOCLAW_TELEMETRY_SERVICE_NAME=goclaw-gateway
```

Or via `config.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "endpoint": "tempo:4317",
    "protocol": "grpc",
    "insecure": false,
    "service_name": "goclaw-gateway"
  }
}
```

Spans are exported using `gen_ai.*` semantic conventions (OpenTelemetry GenAI SIG), plus `goclaw.*` custom attributes for correlation with the PostgreSQL trace store.

The OTel exporter batches spans with a max batch size of 100 and a 5-second timeout.

## Jaeger Integration

The included `docker-compose.otel.yml` overlay spins up Jaeger all-in-one and wires it to GoClaw automatically:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.otel.yml \
  up
```

Jaeger UI is available at **http://localhost:16686**.

The overlay sets:

```yaml
# docker-compose.otel.yml (excerpt)
services:
  jaeger:
    image: jaegertracing/all-in-one:1.68.0
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  goclaw:
    build:
      args:
        ENABLE_OTEL: "true"   # compiles with -tags otel
    environment:
      - GOCLAW_TELEMETRY_ENABLED=true
      - GOCLAW_TELEMETRY_ENDPOINT=jaeger:4317
      - GOCLAW_TELEMETRY_PROTOCOL=grpc
      - GOCLAW_TELEMETRY_INSECURE=true
```

## Key Attributes in Exported Spans

| Attribute | Description |
|-----------|-------------|
| `gen_ai.request.model` | LLM model name |
| `gen_ai.system` | Provider (anthropic, openai, etc.) |
| `gen_ai.usage.input_tokens` | Tokens consumed as input |
| `gen_ai.usage.output_tokens` | Tokens produced as output |
| `gen_ai.response.finish_reason` | Why the model stopped |
| `goclaw.span_type` | `llm_call`, `tool_call`, `agent`, `embedding`, `event` |
| `goclaw.tool.name` | Tool name for tool spans |
| `goclaw.trace_id` | UUID linking back to PostgreSQL |
| `goclaw.duration_ms` | Wall-clock duration |

## Usage Analytics

GoClaw aggregates token counts and costs into hourly snapshots via a background worker (runs at HH:05:00 UTC). These power the dashboard's usage charts and the `/v1/usage` API endpoint.

The `usage_snapshots` table stores pre-computed aggregates per agent, user, and provider — so dashboard queries stay fast even with millions of spans. On startup, the worker backfills any missed hours automatically.

An `activity_logs` table records admin actions, config changes, and security events as an audit trail.

## Real-Time Log Streaming

Connected WebSocket clients can subscribe to live log events. The `LogTee` layer intercepts all `slog` records and:

1. Caches the last 100 entries in a ring buffer (new subscribers get recent history)
2. Broadcasts to subscribed clients at their chosen log level
3. Auto-redacts sensitive fields: `key`, `token`, `secret`, `password`, `dsn`, `credential`, `authorization`, `cookie`

This means dashboard users see real-time logs without SSH access, and secrets never leak through the log stream.

## Common Issues

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| No spans in Jaeger | Binary built without `-tags otel` | Rebuild with `go build -tags otel` |
| `GOCLAW_TELEMETRY_ENABLED` ignored | OTel build tag missing | Check `ENABLE_OTEL: "true"` in docker build args |
| Span buffer full (log warning) | High agent throughput | Increase buffer or reduce flush interval in code |
| Input previews truncated | Normal behavior | Set `GOCLAW_TRACE_VERBOSE=1` for full inputs |
| Spans appear in DB but not Jaeger | Endpoint misconfigured | Check `GOCLAW_TELEMETRY_ENDPOINT` and port reachability |

## What's Next

- [Production Checklist](/deploy-checklist) — monitoring and alerting recommendations
- [Docker Compose Setup](/deploy-docker-compose) — full compose file reference
- [Security Hardening](/deploy-security) — securing your deployment

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
