# REST API

> All `/v1` HTTP endpoints for agent management, providers, skills, traces, and more.

## Overview

GoClaw's HTTP API is served on the same port as the WebSocket gateway. All endpoints require a `Bearer` token in the `Authorization` header matching `GOCLAW_GATEWAY_TOKEN`.

Interactive documentation: `/docs` (Swagger UI) · raw spec: `/v1/openapi.json`

**Base URL:** `http://<host>:<port>`

**Auth header:**
```
Authorization: Bearer YOUR_GATEWAY_TOKEN
```

**User identity header** (optional, for per-user scoping):
```
X-GoClaw-User-Id: user123
```

### Common Headers

| Header | Purpose |
|--------|---------|
| `Authorization` | Bearer token |
| `X-GoClaw-User-Id` | External user ID for multi-tenant context |
| `X-GoClaw-Agent-Id` | Agent identifier for scoped operations |
| `X-GoClaw-Tenant-Id` | Tenant scope — UUID or slug |
| `Accept-Language` | Locale (`en`, `vi`, `zh`) for i18n error messages |

**Input validation:** All string inputs are sanitized — SQL special characters are escaped in ILIKE queries, request bodies are limited to 1 MB, and agent/provider/tool names are validated against allowlist patterns (`[a-zA-Z0-9_-]`).

---

## Chat Completions

OpenAI-compatible chat API for programmatic access to agents.

### `POST /v1/chat/completions`

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "goclaw:agent-id-or-key",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

**Response** (non-streaming):

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
}
```

Set `"stream": true` for SSE chunks terminated by `data: [DONE]`.

---

## OpenResponses Protocol

### `POST /v1/responses`

Alternative response-based protocol (compatible with OpenAI Responses API). Accepts the same auth and returns structured response objects.

---

## Agents

CRUD operations for agent management. Requires `X-GoClaw-User-Id` header for multi-tenant context.

### `GET /v1/agents`

List all agents.

```bash
curl http://localhost:18790/v1/agents \
  -H "Authorization: Bearer TOKEN"
```

### `POST /v1/agents`

Create a new agent.

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "researcher",
    "display_name": "Research Assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "context_window": 200000,
    "max_tool_iterations": 20,
    "workspace": "~/.goclaw/workspace-researcher"
  }'
```

### `GET /v1/agents/{id}`

Get a single agent by ID.

### `PUT /v1/agents/{id}`

Update an agent. Send only the fields to change.

### `DELETE /v1/agents/{id}`

Delete an agent.

### `POST /v1/agents/{id}/regenerate`

Regenerate agent context files from templates.

### `POST /v1/agents/{id}/resummon`

Re-trigger LLM-based summoning for predefined agents.

### Agent Shares

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/shares` | List shares for an agent |
| `POST` | `/v1/agents/{id}/shares` | Share agent with a user |
| `DELETE` | `/v1/agents/{id}/shares/{userID}` | Revoke a share |

### Predefined Agent Instances

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/instances` | List user instances |
| `GET` | `/v1/agents/{id}/instances/{userID}/files` | List user context files |
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Update user context file (admin) |
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` | Update instance metadata (admin) |
| `GET` | `/v1/agents/{id}/system-prompt-preview` | Preview rendered system prompt (admin) |

> To fetch file content, list files via `GET /v1/agents/{id}/instances/{userID}/files` then retrieve through the [Vault](#knowledge-vault) or [Storage](#storage) API.

### Agent Export / Import

Export and import agent configurations and data as a tar.gz archive. Supports selective section export.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/export/preview` | Preview export counts per section (no archive built) |
| `GET` | `/v1/agents/{id}/export` | Download agent archive directly (tar.gz) |
| `GET` | `/v1/agents/{id}/export/download/{token}` | Download a previously prepared archive via short-lived token (valid 5 min) |
| `POST` | `/v1/agents/import` | Import archive as a **new** agent (multipart `file` field) |
| `POST` | `/v1/agents/import/preview` | Parse archive and return manifest without importing |
| `POST` | `/v1/agents/{id}/import` | **Merge** archive data into an existing agent |

**Export query params:**

| Param | Type | Description |
|-------|------|-------------|
| `sections` | string | Comma-separated list of sections to include. Defaults to `config,context_files`. Available: `config`, `context_files`, `memory`, `knowledge_graph`, `cron`, `user_profiles`, `user_overrides`, `workspace` |
| `stream` | `bool` | When `true`, returns SSE progress events then a `complete` event with `download_url` for token-based download |

**Import query params (`POST /v1/agents/import`):**

| Param | Type | Description |
|-------|------|-------------|
| `agent_key` | string | Override agent key (falls back to archive value) |
| `display_name` | string | Override display name |
| `stream` | `bool` | Stream import progress via SSE |

**Merge import query params (`POST /v1/agents/{id}/import`):**

| Param | Type | Description |
|-------|------|-------------|
| `include` | string | Comma-separated sections to merge. Defaults to all sections |
| `stream` | `bool` | Stream merge progress via SSE |

**Archive format** (`agent-{key}-YYYYMMDD.tar.gz`):

```
manifest.json                              — archive manifest (version, sections summary)
agent.json                                 — agent config (sensitive fields stripped)
context_files/{filename}                   — agent-level context files
user_context_files/{user_id}/{filename}    — per-user context files
memory/global.jsonl                        — global memory documents
memory/users/{user_id}.jsonl               — per-user memory documents
knowledge_graph/entities.jsonl             — KG entities (portable external IDs)
knowledge_graph/relations.jsonl            — KG relations
cron/jobs.jsonl                            — cron job definitions
user_profiles.jsonl                        — user profile records
user_overrides.jsonl                       — per-user model overrides
workspace/                                 — workspace directory files
```

**Import response** (`201 Created`):

```json
{
  "agent_id": "uuid",
  "agent_key": "researcher",
  "context_files": 3,
  "memory_docs": 12,
  "kg_entities": 50,
  "kg_relations": 30
}
```

> Cron jobs are always imported as **disabled**. Duplicate jobs (same name) are skipped. Max archive size: 500 MB.

---

### `GET /v1/agents/{id}/codex-pool-activity`

Returns routing activity and per-account health for agents using a [Codex OAuth pool](/provider-codex). Requires the agent's provider to be `chatgpt_oauth` type with a pool configured.

**Auth:** Bearer token required. The requesting user must have access to the agent.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `18` | Number of recent requests to return (max 50) |

**Response:**

```json
{
  "strategy": "round_robin",
  "pool_providers": ["openai-codex", "codex-work"],
  "stats_sample_size": 24,
  "provider_counts": [
    {
      "provider_name": "openai-codex",
      "request_count": 14,
      "direct_selection_count": 10,
      "failover_serve_count": 4,
      "success_count": 13,
      "failure_count": 1,
      "consecutive_failures": 0,
      "success_rate": 92,
      "health_score": 88,
      "health_state": "healthy",
      "last_used_at": "2026-03-27T08:00:00Z"
    }
  ],
  "recent_requests": [
    {
      "span_id": "uuid",
      "trace_id": "uuid",
      "started_at": "2026-03-27T08:00:00Z",
      "status": "success",
      "duration_ms": 1240,
      "provider_name": "openai-codex",
      "selected_provider": "openai-codex",
      "model": "gpt-5.4",
      "attempt_count": 1,
      "used_failover": false
    }
  ]
}
```

If the agent does not use a `chatgpt_oauth` provider or the pool is not configured, `pool_providers` is an empty array and `provider_counts`/`recent_requests` are empty.

Returns `503` if the tracing store is unavailable.

---

### Wake (External Trigger)

```
POST /v1/agents/{id}/wake
```

```json
{
  "message": "Process new data",
  "session_key": "optional-session",
  "user_id": "optional-user",
  "metadata": {}
}
```

Response: `{content, run_id, usage?}`. Used by orchestrators (n8n, Paperclip) to trigger agent runs externally.

---

## Providers

### `GET /v1/providers`

List all LLM providers.

### `POST /v1/providers`

Create an LLM provider.

```bash
curl -X POST http://localhost:18790/v1/providers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-openrouter",
    "display_name": "OpenRouter",
    "provider_type": "openai_compat",
    "api_base": "https://openrouter.ai/api/v1",
    "api_key": "sk-or-...",
    "enabled": true
  }'
```

**Supported types:** `anthropic_native`, `openai_compat`, `chatgpt_oauth`, `gemini_native`, `dashscope`, `bailian`, `minimax`, `claude_cli`, `acp`

### `GET /v1/providers/{id}`

Get a provider by ID.

### `PUT /v1/providers/{id}`

Update a provider.

### `DELETE /v1/providers/{id}`

Delete a provider.

### `GET /v1/providers/{id}/models`

List models available from the provider (proxied to the upstream API).

### `POST /v1/providers/{id}/verify`

Pre-flight check — verify the API key and model are reachable.

### `POST /v1/providers/{id}/verify-embedding`

Verify embedding model connectivity for a provider.

### `GET /v1/providers/{id}/codex-pool-activity`

Returns Codex OAuth pool routing activity at the provider level (see also agent-level endpoint above).

### `GET /v1/embedding/status`

Check if embedding is configured and available across providers.

### `GET /v1/providers/claude-cli/auth-status`

Check Claude CLI authentication status (global, not per-provider).

---

## Skills

### `GET /v1/skills`

List all skills.

### `POST /v1/skills/upload`

Upload a skill as a `.zip` file (max 20 MB).

```bash
curl -X POST http://localhost:18790/v1/skills/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@my-skill.zip"
```

### `GET /v1/skills/{id}`

Get skill metadata.

### `PUT /v1/skills/{id}`

Update skill metadata.

### `DELETE /v1/skills/{id}`

Delete a skill.

### `POST /v1/skills/{id}/toggle`

Toggle skill enabled/disabled state.

### `PUT /v1/skills/{id}/tenant-config`

Set a per-tenant override for a skill (e.g., enable/disable for the current tenant). Admin only.

### `DELETE /v1/skills/{id}/tenant-config`

Remove per-tenant override (revert to default). Admin only.

### Skills Export / Import

Export and import custom skills as a tar.gz archive.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/skills/export/preview` | Preview counts before export (no archive built) |
| `GET` | `/v1/skills/export` | Download skills archive directly (tar.gz) |
| `POST` | `/v1/skills/import` | Import skills archive (multipart `file` field) |

**Query params for export:**

| Param | Type | Description |
|-------|------|-------------|
| `stream` | `bool` | When `true`, returns SSE progress events then a `complete` event with `download_url` |

**Archive format** (`skills-YYYYMMDD.tar.gz`):

```
skills/{slug}/metadata.json   — skill metadata (name, slug, visibility, tags)
skills/{slug}/SKILL.md        — skill file content
skills/{slug}/grants.jsonl    — agent grants (agent_key + pinned version)
```

**Import response** (`201 Created`):

```json
{
  "skills_imported": 3,
  "skills_skipped": 1,
  "grants_applied": 5
}
```

> Skills are skipped (not overwritten) if the slug already exists in the tenant. Grants reference agents by `agent_key` — unmatched keys are silently skipped.

---

### Skill Grants

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/skills/{id}/grants/agent` | Grant skill to an agent |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` | Revoke agent grant |
| `POST` | `/v1/skills/{id}/grants/user` | Grant skill to a user |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` | Revoke user grant |
| `GET` | `/v1/agents/{agentID}/skills` | List skills accessible to an agent |

### Skill Files & Dependencies

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/skills/{id}/versions` | List available versions |
| `GET` | `/v1/skills/{id}/files` | List files in skill |
| `GET` | `/v1/skills/{id}/files/{path...}` | Read file content |
| `POST` | `/v1/skills/rescan-deps` | Rescan runtime dependencies |
| `POST` | `/v1/skills/install-deps` | Install all missing dependencies |
| `POST` | `/v1/skills/install-dep` | Install a single dependency |
| `GET` | `/v1/skills/runtimes` | Check runtime availability |

---

## Tools

### Direct Invocation

```
POST /v1/tools/invoke
```

```json
{
  "tool": "web_fetch",
  "action": "fetch",
  "args": {"url": "https://example.com"},
  "dryRun": false,
  "agentId": "optional",
  "channel": "optional",
  "chatId": "optional",
  "peerKind": "direct"
}
```

Set `"dryRun": true` to return tool schema without execution.

### Built-in Tools

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/tools/builtin` | List all built-in tools |
| `GET` | `/v1/tools/builtin/{name}` | Get tool definition |
| `GET` | `/v1/tools/builtin/{name}/tenant-config` | Get tenant-specific configuration for a built-in tool |
| `PUT` | `/v1/tools/builtin/{name}` | Update enabled/settings |
| `PUT` | `/v1/tools/builtin/{name}/tenant-config` | Set per-tenant override (admin) |
| `DELETE` | `/v1/tools/builtin/{name}/tenant-config` | Remove per-tenant override (admin) |

> **Note:** Custom tools via REST API are not currently implemented. MCP servers and skills provide the recommended extension mechanism.

---

## Memory

Per-agent vector memory using pgvector.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/memory/documents` | List all documents globally |
| `GET` | `/v1/agents/{agentID}/memory/documents` | List documents for agent |
| `GET` | `/v1/agents/{agentID}/memory/documents/{path...}` | Get document details |
| `PUT` | `/v1/agents/{agentID}/memory/documents/{path...}` | Put/update document |
| `DELETE` | `/v1/agents/{agentID}/memory/documents/{path...}` | Delete document |
| `GET` | `/v1/agents/{agentID}/memory/chunks` | List chunks for a document |
| `POST` | `/v1/agents/{agentID}/memory/index` | Index a single document |
| `POST` | `/v1/agents/{agentID}/memory/index-all` | Index all documents |
| `POST` | `/v1/agents/{agentID}/memory/search` | Semantic search |

Optional query parameter `?user_id=` for per-user scoping.

---

## V3 Agent Capabilities

> New in v3. Enable per-agent via [V3 Feature Flags](#v3-feature-flags).

### Evolution

Track tool-usage metrics and receive automated improvement suggestions.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/evolution/metrics` | List raw or aggregated evolution metrics |
| `GET` | `/v1/agents/{id}/evolution/suggestions` | List evolution suggestions |
| `PATCH` | `/v1/agents/{id}/evolution/suggestions/{suggestionID}` | Update suggestion status (`pending` → `approved`/`rejected`/`rolled_back`) |
| `POST` | `/v1/agents/{id}/evolution/skill-apply` | Apply an approved evolution suggestion as a new skill |

**`GET /v1/agents/{id}/evolution/metrics` query params:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter: `tool`, `retrieval`, `feedback` |
| `aggregate` | boolean | Return aggregated metrics grouped by tool/metric (default: `false`) |
| `since` | ISO 8601 | Start timestamp (default: 7 days ago) |
| `limit` | integer | Max results (default: 100, max: 500) |

**`GET /v1/agents/{id}/evolution/suggestions` query params:** `status` (filter: `pending`/`approved`/`applied`/`rejected`/`rolled_back`), `limit`

---

### Episodic Memory

Conversation summaries per user session for long-term context continuity.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/episodic` | List episodic summaries |
| `POST` | `/v1/agents/{id}/episodic/search` | Hybrid BM25+vector search over episodic summaries |

**`GET /v1/agents/{id}/episodic` query params:** `user_id`, `limit` (default: 20, max: 500), `offset`

**`POST /v1/agents/{id}/episodic/search` body:**

```json
{ "query": "Docker optimization", "user_id": "optional", "max_results": 10, "min_score": 0.5 }
```

---

### Knowledge Vault

Persistent document store with vector embeddings and graph link connections.

#### Global Vault Endpoints

Admin-scoped endpoints for cross-agent vault operations.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/vault/documents` | Create a global vault document |
| `PUT` | `/v1/vault/documents/{docID}` | Update a global vault document |
| `DELETE` | `/v1/vault/documents/{docID}` | Delete a global vault document |
| `POST` | `/v1/vault/links` | Create a global document link |
| `DELETE` | `/v1/vault/links/{linkID}` | Delete a global document link |
| `POST` | `/v1/vault/links/batch` | Batch get document links |
| `POST` | `/v1/vault/upload` | Upload file to vault |
| `POST` | `/v1/vault/rescan` | Trigger vault rescan |
| `POST` | `/v1/vault/search` | Global vault semantic search |
| `GET` | `/v1/vault/enrichment/status` | Check enrichment worker status |
| `POST` | `/v1/vault/enrichment/stop` | Stop the enrichment worker for the current agent |
| `GET` | `/v1/vault/documents` | List documents across all agents |
| `GET` | `/v1/vault/tree` | Returns hierarchical tree view of vault document structure |
| `GET` | `/v1/vault/graph` | Returns vault document graph visualization data (cross-tenant, node limit 2000) |

#### Agent-Scoped Vault Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/vault/documents` | List documents for a specific agent |
| `GET` | `/v1/agents/{id}/vault/documents/{docID}` | Get a single document (full content) |
| `POST` | `/v1/agents/{id}/vault/documents` | Create a vault document for an agent |
| `PUT` | `/v1/agents/{id}/vault/documents/{docID}` | Update a vault document |
| `DELETE` | `/v1/agents/{id}/vault/documents/{docID}` | Delete a vault document |
| `POST` | `/v1/agents/{id}/vault/links` | Create a document link |
| `DELETE` | `/v1/agents/{id}/vault/links/{linkID}` | Delete a document link |
| `POST` | `/v1/agents/{id}/vault/search` | Hybrid FTS+vector search |
| `GET` | `/v1/agents/{id}/vault/documents/{docID}/links` | Get outlinks and backlinks for a document |

**List query params:** `scope`, `doc_type` (comma-separated), `limit`, `offset`, `agent_id` (cross-agent only)

**Response shape** (list):

```json
{ "documents": [...], "total": 42 }
```

**Search body:** `{ "query": "...", "scope": "team", "doc_types": ["guide"], "max_results": 10 }`

---

### Orchestration

Controls how an agent routes requests (standalone, delegation, or team-based).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/orchestration` | Get current orchestration mode and targets |

**Response:**

```json
{
  "mode": "delegate",
  "delegate_targets": [{"agent_key": "research-agent", "display_name": "Research Specialist"}],
  "team": null
}
```

**Mode values:** `standalone` (direct), `delegate` (routes to agent links), `team` (routes via team task system)

---

### V3 Feature Flags

Per-agent flags controlling v3 subsystems.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/v3-flags` | Get all v3 flags for an agent |
| `PATCH` | `/v1/agents/{id}/v3-flags` | Update flags (partial update accepted) |

**Flag keys:** `evolution_enabled`, `episodic_enabled`, `vault_enabled`, `orchestration_enabled`, `skill_evolve`, `self_evolve`

---

## Knowledge Graph

Per-agent entity-relation graph.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/kg/entities` | List/search entities (BM25) |
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Get entity with relations |
| `POST` | `/v1/agents/{agentID}/kg/entities` | Upsert entity |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Delete entity |
| `POST` | `/v1/agents/{agentID}/kg/traverse` | Traverse graph (max depth 3) |
| `POST` | `/v1/agents/{agentID}/kg/extract` | LLM-powered entity extraction |
| `GET` | `/v1/agents/{agentID}/kg/stats` | Knowledge graph statistics |
| `GET` | `/v1/agents/{agentID}/kg/graph` | Full graph for visualization |
| `GET` | `/v1/agents/{agentID}/kg/graph/compact` | Compact graph representation (lighter payload than full graph) |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` | Scan for duplicate entities |
| `GET` | `/v1/agents/{agentID}/kg/dedup` | List dedup candidates |
| `POST` | `/v1/agents/{agentID}/kg/merge` | Merge duplicate entities |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` | Dismiss a dedup candidate |

---

## Traces

### `GET /v1/traces`

List LLM traces. Supports query params: `agentId`, `userId`, `status`, `limit`, `offset`.

```bash
curl "http://localhost:18790/v1/traces?agentId=UUID&limit=50" \
  -H "Authorization: Bearer TOKEN"
```

### `GET /v1/traces/{traceID}`

Get a single trace with all its spans.

### `GET /v1/traces/{traceID}/export`

Export trace tree as gzipped JSON.

### Costs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/costs/summary` | Cost summary by agent/time range |

---

## Usage & Analytics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/usage/timeseries` | Time-series usage points |
| `GET` | `/v1/usage/breakdown` | Breakdown by provider/model/channel |
| `GET` | `/v1/usage/summary` | Summary with period comparison |

**Query params:** `from`, `to` (RFC 3339), `agent_id`, `provider`, `model`, `channel`, `group_by`

---

## MCP Servers

### `GET /v1/mcp/servers`

List all MCP server configurations.

### `POST /v1/mcp/servers`

Register an MCP server.

```bash
curl -X POST http://localhost:18790/v1/mcp/servers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    "enabled": true
  }'
```

Transport options: `"stdio"`, `"sse"`, `"streamable-http"`.

### `GET /v1/mcp/servers/{id}`

Get an MCP server.

### `PUT /v1/mcp/servers/{id}`

Update an MCP server. Updatable fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Server display name |
| `transport` | string | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | Command to run (stdio) |
| `args` | string[] | Command arguments |
| `url` | string | Server URL (sse/streamable-http) |
| `api_key` | string | API key for the server |
| `env` | object | Environment variables |
| `headers` | object | HTTP headers |
| `enabled` | boolean | Enable/disable |
| `tool_prefix` | string | Prefix for tool names |
| `timeout_sec` | integer | Request timeout in seconds |
| `agent_id` | string | Bind to specific agent |
| `config` | object | Additional configuration |
| `settings` | object | Server settings |

### `DELETE /v1/mcp/servers/{id}`

Delete an MCP server.

### `POST /v1/mcp/servers/test`

Test connectivity to an MCP server before saving.

### `POST /v1/mcp/servers/{id}/reconnect`

Force reconnect a running MCP server.

### `GET /v1/mcp/servers/{id}/tools`

List tools discovered from a running MCP server.

### MCP Grants

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/mcp/servers/{id}/grants` | List grants for a server |
| `POST` | `/v1/mcp/servers/{id}/grants/agent` | Grant server to an agent |
| `DELETE` | `/v1/mcp/servers/{id}/grants/agent/{agentID}` | Revoke agent grant |
| `GET` | `/v1/mcp/grants/agent/{agentID}` | List all grants for an agent |
| `POST` | `/v1/mcp/servers/{id}/grants/user` | Grant server to a user |
| `DELETE` | `/v1/mcp/servers/{id}/grants/user/{userID}` | Revoke user grant |

### MCP Access Requests

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/mcp/requests` | Submit an access request |
| `GET` | `/v1/mcp/requests` | List pending requests |
| `POST` | `/v1/mcp/requests/{id}/review` | Approve or reject a request |

### MCP Export / Import

Export and import MCP server configurations and agent grants as a tar.gz archive.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/mcp/export/preview` | Preview export counts (no archive built) |
| `GET` | `/v1/mcp/export` | Download MCP archive directly (tar.gz) |
| `POST` | `/v1/mcp/import` | Import MCP archive (multipart `file` field) |

### MCP User Credentials

Per-user credential storage for MCP servers that require individual authentication.

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/v1/mcp/servers/{id}/user-credentials` | Set user credentials for a server |
| `GET` | `/v1/mcp/servers/{id}/user-credentials` | Get user credentials |
| `DELETE` | `/v1/mcp/servers/{id}/user-credentials` | Delete user credentials |

**Query params for export:**

| Param | Type | Description |
|-------|------|-------------|
| `stream` | `bool` | When `true`, returns SSE progress events then a `complete` event with `download_url` |

**Archive format** (`mcp-servers-YYYYMMDD.tar.gz`):

```
servers.jsonl   — MCP server definitions
grants.jsonl    — agent grants (server_name + agent_key)
```

**Import response** (`201 Created`):

```json
{
  "servers_imported": 2,
  "servers_skipped": 0,
  "grants_applied": 4
}
```

---

## Channel Instances

### `GET /v1/channels/instances`

List all channel instances from the database.

### `POST /v1/channels/instances`

Create a channel instance.

```bash
curl -X POST http://localhost:18790/v1/channels/instances \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-telegram-bot",
    "channel_type": "telegram",
    "agent_id": "AGENT_UUID",
    "credentials": { "token": "BOT_TOKEN" },
    "enabled": true
  }'
```

**Supported channels:** `telegram`, `discord`, `slack`, `whatsapp`, `zalo_oa`, `zalo_personal`, `feishu`

### `GET /v1/channels/instances/{id}`

Get a channel instance.

### `PUT /v1/channels/instances/{id}`

Update a channel instance. Updatable fields:

| Field | Type | Description |
|-------|------|-------------|
| `channel_type` | string | Channel type |
| `credentials` | object | Channel credentials |
| `agent_id` | string | Bound agent UUID |
| `enabled` | boolean | Enable/disable |
| `display_name` | string | Human-readable name |
| `group_policy` | string | Group message policy |
| `allow_from` | string[] | Allowed sender IDs |
| `metadata` | object | Custom metadata |
| `webhook_secret` | string | Webhook verification secret |
| `config` | object | Additional configuration |

### `DELETE /v1/channels/instances/{id}`

Delete a channel instance.

### Group Writers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/channels/instances/{id}/writers/groups` | List groups with write permissions |
| `GET` | `/v1/channels/instances/{id}/writers` | List authorized writers |
| `POST` | `/v1/channels/instances/{id}/writers` | Add a writer |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` | Remove a writer |

---

## Contacts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/contacts` | List contacts (paginated) |
| `GET` | `/v1/contacts/resolve?ids=...` | Resolve contacts by IDs (max 100) |
| `POST` | `/v1/contacts/merge` | Merge duplicate contact records |
| `POST` | `/v1/contacts/unmerge` | Unmerge previously merged contacts |
| `GET` | `/v1/contacts/merged/{tenantUserId}` | List merged contacts for a tenant user |

### Tenant Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/tenant-users` | List tenant users |
| `GET` | `/v1/users/search` | Search users across channels |

---

## Team Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/events` | List team events (paginated) |

### Team Workspace

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/teams/{teamId}/workspace/upload` | Upload file to team workspace |
| `PUT` | `/v1/teams/{teamId}/workspace/move` | Move/rename file in team workspace |

### Team Attachments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/teams/{teamId}/attachments/{attachmentId}/download` | Download task attachment |

---

## Team Export / Import

Export and import a complete team (team metadata + all member agents) as a tar.gz archive.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/export/preview` | Preview export counts (members, tasks, agent_links) without building archive |
| `GET` | `/v1/teams/{id}/export` | Download team archive directly (tar.gz) |
| `POST` | `/v1/teams/import` | Import team archive, creating new agents and wiring the team (multipart `file` field) |

**Export query params:**

| Param | Type | Description |
|-------|------|-------------|
| `stream` | `bool` | When `true`, returns SSE progress events then a `complete` event with `download_url` |

**Archive format** (`team-{name}-YYYYMMDD.tar.gz`):

```
manifest.json                          — archive manifest (team_name, agent_keys, sections)
team/team.json                         — team metadata
team/members.jsonl                     — team member records
team/tasks.jsonl                       — team task records
team/comments.jsonl                    — task comments
team/events.jsonl                      — task events
team/links.jsonl                       — agent link records
team/workspace/                        — team workspace files
agents/{agent_key}/agent.json          — per-agent config
agents/{agent_key}/context_files/      — per-agent context files
agents/{agent_key}/memory/             — per-agent memory documents
agents/{agent_key}/knowledge_graph/    — per-agent KG entities + relations
agents/{agent_key}/cron/               — per-agent cron jobs
agents/{agent_key}/workspace/          — per-agent workspace files
```

**Import response** (`201 Created`):

```json
{
  "team_name": "research-team",
  "agents_added": 3,
  "agent_keys": ["researcher", "writer", "reviewer"]
}
```

> Import requires **admin role**. Agent keys are deduplicated if they already exist (suffixed `-2`, `-3`, …). Cron jobs are always imported as disabled.

Also available as a shared download endpoint (shared with agent export tokens):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/export/download/{token}` | Download a prepared archive by short-lived token (valid 5 min, any export type) |

---

## Pending Messages

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/pending-messages` | List all groups with titles |
| `GET` | `/v1/pending-messages/messages` | List messages by channel+key |
| `DELETE` | `/v1/pending-messages` | Delete message group |
| `POST` | `/v1/pending-messages/compact` | LLM-based summarization (async, 202) |

---

## Secure CLI Credentials

Requires **admin role** (full gateway token or empty gateway token in dev/single-user mode).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/cli-credentials` | List all credentials |
| `POST` | `/v1/cli-credentials` | Create new credential |
| `GET` | `/v1/cli-credentials/{id}` | Get credential details |
| `PUT` | `/v1/cli-credentials/{id}` | Update credential |
| `DELETE` | `/v1/cli-credentials/{id}` | Delete credential |
| `GET` | `/v1/cli-credentials/presets` | Get preset credential templates |
| `POST` | `/v1/cli-credentials/{id}/test` | Test credential connection (dry-run) |
| `POST` | `/v1/cli-credentials/check-binary` | Validate a binary path for CLI credential use |

### Per-User CLI Credentials

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/cli-credentials/{id}/user-credentials` | List user credentials for a CLI config |
| `GET` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Get user-specific credentials |
| `PUT` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Set user-specific credentials |
| `DELETE` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Delete user-specific credentials |

### CLI Credential Agent Grants

Per-agent binary grants — control which agents can use a specific CLI credential binary, with optional restrictions on arguments, verbosity, and timeout. Requires **admin role**.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/cli-credentials/{id}/agent-grants` | List all agent grants for a credential |
| `POST` | `/v1/cli-credentials/{id}/agent-grants` | Create an agent grant |
| `GET` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Get a specific grant |
| `PUT` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Update a grant |
| `DELETE` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Delete a grant |

**Create/update grant fields:**

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | UUID | Agent to grant access (required on create) |
| `deny_args` | JSON | Argument restrictions (optional) |
| `deny_verbose` | JSON | Verbose output restrictions (optional) |
| `timeout_seconds` | integer | Per-agent execution timeout override (optional) |
| `tips` | string | Usage hints for the agent (optional) |
| `enabled` | boolean | Enable/disable the grant (default: `true`) |

**Create response** (`201 Created`): the created grant object.

Changes to grants emit a `cache_invalidate` event on the message bus so connected agents pick up the update immediately.

---

## Runtime & Packages

Manage system (apk), Python (pip), and Node (npm) packages. Requires authentication.

### `GET /v1/packages`

List all installed packages grouped by category (system, pip, npm).

### `POST /v1/packages/install`

```json
{ "package": "github-cli" }
```

Use prefix `"pip:pandas"` or `"npm:typescript"` to target a specific manager. Without prefix, defaults to system (apk).

### `POST /v1/packages/uninstall`

Same format as install.

### `GET /v1/packages/runtimes`

Check if Python and Node runtimes are available.

```json
{ "python": true, "node": true }
```

### `GET /v1/shell-deny-groups`

List shell command deny groups (security policy).

---

## Storage

Workspace file management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/storage/files` | List files with depth limiting |
| `GET` | `/v1/storage/files/{path...}` | Read file (JSON or raw) |
| `POST` | `/v1/storage/files` | Upload file to workspace (admin) |
| `DELETE` | `/v1/storage/files/{path...}` | Delete file/directory |
| `PUT` | `/v1/storage/move` | Move/rename a file or directory (admin) |
| `GET` | `/v1/storage/size` | Stream storage size (SSE, cached 60 min) |

`?raw=true` — serve native MIME type. `?depth=N` — limit traversal depth.

---

## Media

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/media/upload` | Upload file (multipart, 50 MB limit) |
| `GET` | `/v1/media/{id}` | Serve media by ID with caching |

Auth via Bearer token or `?token=` query param (for `<img>` and `<audio>` tags).

---

## Files

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/files/{path...}` | Serve workspace file by path |
| `POST` | `/v1/files/sign` | Generate signed URL for file access |

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `download` | `bool` | When `true`, forces `Content-Disposition: attachment` (browser download instead of inline display) |

---

## API Keys

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api-keys` | List all API keys (masked) |
| `POST` | `/v1/api-keys` | Create API key (returns raw key once) |
| `POST` | `/v1/api-keys/{id}/revoke` | Revoke API key |

### Create Request

```json
{
  "name": "ci-deploy",
  "scopes": ["operator.read", "operator.write"],
  "expires_in": 2592000
}
```

The `key` field is only returned in the create response. Subsequent calls show only the `prefix`.

---

## OAuth

### Per-Provider ChatGPT/Codex OAuth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/auth/chatgpt/{provider}/status` | Check OAuth status for a provider |
| `GET` | `/v1/auth/chatgpt/{provider}/quota` | Fetch Codex/OpenAI quota state |
| `POST` | `/v1/auth/chatgpt/{provider}/start` | Start OAuth flow for a provider |
| `POST` | `/v1/auth/chatgpt/{provider}/callback` | Manual callback handler |
| `POST` | `/v1/auth/chatgpt/{provider}/logout` | Revoke OAuth token for a provider |

### Legacy OpenAI Aliases

Compatibility aliases for the default `openai-codex` provider:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/auth/openai/status` | Check OpenAI OAuth status |
| `GET` | `/v1/auth/openai/quota` | Fetch quota state |
| `POST` | `/v1/auth/openai/start` | Initiate OAuth flow |
| `POST` | `/v1/auth/openai/callback` | Handle OAuth callback manually |
| `POST` | `/v1/auth/openai/logout` | Remove stored OAuth tokens |

---

## Tenants

Multi-tenant management (gateway token scope only).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/tenants` | List tenants |
| `POST` | `/v1/tenants` | Create tenant |
| `GET` | `/v1/tenants/{id}` | Get tenant |
| `PATCH` | `/v1/tenants/{id}` | Update tenant |
| `GET` | `/v1/tenants/{id}/users` | List tenant users |
| `POST` | `/v1/tenants/{id}/users` | Add user to tenant |
| `DELETE` | `/v1/tenants/{id}/users/{userId}` | Remove user from tenant |

---

## Backup & Restore

### System Backup (Admin)

Full system backup for disaster recovery. Requires admin role.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/system/backup` | Trigger system backup (returns archive or SSE progress) |
| `GET` | `/v1/system/backup/preflight` | Check backup preconditions |
| `GET` | `/v1/system/backup/download/{token}` | Download backup archive by short-lived token |

### System Restore (Admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/system/restore` | Restore tenant/system from backup archive. Requires admin role. |

### System Backup S3

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/system/backup/s3/config` | Get S3 backup configuration |
| `PUT` | `/v1/system/backup/s3/config` | Update S3 backup configuration |
| `GET` | `/v1/system/backup/s3/list` | List available S3 backup archives |
| `POST` | `/v1/system/backup/s3/upload` | Upload local backup to S3 |
| `POST` | `/v1/system/backup/s3/backup` | Trigger backup directly to S3 |

### Tenant Backup

Per-tenant backup and restore. Admin role required.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/tenant/backup` | Trigger tenant backup (returns archive or SSE progress) |
| `GET` | `/v1/tenant/backup/preflight` | Check tenant backup preconditions |
| `GET` | `/v1/tenant/backup/download/{token}` | Download tenant backup archive by short-lived token |
| `POST` | `/v1/tenant/restore` | Restore tenant from a backup archive |

---

## Activity & Audit

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/activity` | List activity audit logs (filterable) |

---

## System Configs

Per-tenant key-value configuration store. Read access for all authenticated users; write access requires admin role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/system-configs` | List all config entries for current tenant |
| `GET` | `/v1/system-configs/{key}` | Get a single config value by key |
| `PUT` | `/v1/system-configs/{key}` | Set a config value (admin only) |
| `DELETE` | `/v1/system-configs/{key}` | Delete a config entry (admin only) |

---

## Edition

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/edition` | Get current edition info and feature limits |

---

## MCP Bridge

Exposes GoClaw tools to Claude CLI via streamable HTTP at `/mcp/bridge`. Only listens on localhost. Protected by gateway token with HMAC-signed context headers.

| Header | Purpose |
|--------|---------|
| `X-Agent-ID` | Agent context for tool execution |
| `X-User-ID` | User context |
| `X-Channel` | Channel routing |
| `X-Chat-ID` | Chat routing |
| `X-Peer-Kind` | `direct` or `group` |
| `X-Bridge-Sig` | HMAC signature over all context fields |

---

## System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/v1/openapi.json` | OpenAPI 3.0 spec |
| `GET` | `/docs` | Swagger UI |

---

## Common Response Shapes

**Success:**
```json
{ "id": "uuid", "name": "...", ... }
```

**Error:**
```json
{
  "error": {
    "code": "ERR_AGENT_NOT_FOUND",
    "message": "Agent not found. Verify the agent ID and try again."
  }
}
```

Error responses use a structured envelope with `code` (machine-readable error type) and `message` (human-readable, i18n-translated).

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request (invalid JSON, missing fields) |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not found |
| `409` | Conflict (duplicate name) |
| `429` | Rate limited |
| `500` | Internal server error |

Error messages are localized based on the `Accept-Language` header.

---

## WebSocket-Only Endpoints

The following are **only available via WebSocket RPC**, not HTTP:

- **Sessions:** List, preview, patch, delete, reset (`sessions.*`)
- **Cron jobs:** List, create, update, delete, toggle, status, run, runs (`cron.*`)
- **Config management:** Get, apply, patch, schema (`config.*`)
- **Config permissions:** List, grant, revoke (`config.permissions.*`)
- **Send messages:** Send to channels (`send`)
- **Chat:** Send, history, abort, inject, session status (`chat.*`)
- **Heartbeat:** Get, set, toggle, test, logs, checklist, targets (`heartbeat.*`)
- **Device pairing:** Request, approve, deny, list, revoke (`device.pair.*`)
- **Exec approvals:** List, approve, deny (`exec.approval.*`)
- **TTS:** Status, enable, disable, convert, set provider, providers (`tts.*`)
- **Browser automation:** Act, snapshot, screenshot (`browser.*`)
- **Logs:** Tail server logs (`logs.tail`)

> See [WebSocket Protocol](/websocket-protocol) for full method reference and frame format.

---

## What's Next

- [WebSocket Protocol](/websocket-protocol) — real-time RPC for chat and agent events
- [Config Reference](/config-reference) — full `config.json` schema
- [Database Schema](/database-schema) — table definitions and relationships

<!-- goclaw-source: c651cde5 | updated: 2026-04-15 -->
