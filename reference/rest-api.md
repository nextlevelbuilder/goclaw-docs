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
| `GET` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Get specific context file |
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Update user file (USER.md only) |
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` | Update instance metadata |

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
| `PUT` | `/v1/tools/builtin/{name}` | Update enabled/settings |

### Custom Tools

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/tools/custom` | List custom tools (paginated) |
| `POST` | `/v1/tools/custom` | Create custom tool |
| `GET` | `/v1/tools/custom/{id}` | Get tool details |
| `PUT` | `/v1/tools/custom/{id}` | Update tool |
| `DELETE` | `/v1/tools/custom/{id}` | Delete tool |

Query parameters for list: `agent_id`, `search`, `limit`, `offset`

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

---

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/sessions` | List sessions (paginated) |
| `GET` | `/v1/sessions/{key}` | Get session with messages |
| `DELETE` | `/v1/sessions/{key}` | Delete session |
| `POST` | `/v1/sessions/{key}/reset` | Clear session messages |
| `PATCH` | `/v1/sessions/{key}` | Update label, model, metadata |

---

## Team Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/events` | List team events (paginated) |

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

## Delegations

### `GET /v1/delegations`

List delegation history (agent-to-agent task handoffs).

**Filters:** `source_agent_id`, `target_agent_id`, `team_id`, `user_id`, `status`, `limit`, `offset`

### `GET /v1/delegations/{id}`

Get a single delegation record.

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

---

## Storage

Workspace file management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/storage/files` | List files with depth limiting |
| `GET` | `/v1/storage/files/{path...}` | Read file (JSON or raw) |
| `DELETE` | `/v1/storage/files/{path...}` | Delete file/directory |
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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/auth/openai/status` | Check OpenAI OAuth status |
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
| `PUT` | `/v1/tenants/{id}` | Update tenant |
| `DELETE` | `/v1/tenants/{id}` | Delete tenant |

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

- **Cron jobs:** List, create, update, delete, logs (`cron.*`)
- **Config management:** Get, apply, patch (`config.*`)
- **Send messages:** Send to channels (`send.*`)

---

## What's Next

- [WebSocket Protocol](/websocket-protocol) — real-time RPC for chat and agent events
- [Config Reference](/config-reference) — full `config.json` schema
- [Database Schema](/database-schema) — table definitions and relationships

<!-- goclaw-source: e7afa832 | updated: 2026-03-30 -->
