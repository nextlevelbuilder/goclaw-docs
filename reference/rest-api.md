# REST API

> All `/v1` HTTP endpoints for agent management, providers, skills, traces, and more.

## Overview

GoClaw's HTTP API is served on the same port as the WebSocket gateway. All endpoints require a `Bearer` token in the `Authorization` header matching `GOCLAW_GATEWAY_TOKEN`.

**Base URL:** `http://<host>:<port>`

**Auth header:**
```
Authorization: Bearer YOUR_GATEWAY_TOKEN
```

**User identity header** (optional, for per-user scoping):
```
X-GoClaw-User-Id: user123
```

**Input validation:** All string inputs are sanitized before use — SQL special characters are escaped in ILIKE queries, request bodies are limited to 1 MB, and agent/provider/tool names are validated against allowlist patterns (`[a-zA-Z0-9_-]`).

---

## Agents

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

### Skill Grants

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/skills/{id}/grants/agent` | Grant skill to an agent |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` | Revoke agent grant |
| `POST` | `/v1/skills/{id}/grants/user` | Grant skill to a user |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` | Revoke user grant |
| `GET` | `/v1/agents/{agentID}/skills` | List skills accessible to an agent |

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

Update an MCP server.

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

---

## Custom Tools

### `GET /v1/tools/custom`

List custom (DB-backed) tools.

### `POST /v1/tools/custom`

Create a custom tool.

```bash
curl -X POST http://localhost:18790/v1/tools/custom \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "run_tests",
    "description": "Run the test suite",
    "parameters": {},
    "command": "npm test",
    "working_dir": "/app",
    "timeout_seconds": 120,
    "enabled": true
  }'
```

### `GET /v1/tools/custom/{id}`

Get a custom tool.

### `PUT /v1/tools/custom/{id}`

Update a custom tool.

### `DELETE /v1/tools/custom/{id}`

Delete a custom tool.

---

## Built-in Tools

### `GET /v1/tools/builtin`

List all built-in tools with their enabled/disabled status.

### `GET /v1/tools/builtin/{name}`

Get a built-in tool by name.

### `PUT /v1/tools/builtin/{name}`

Enable or disable a built-in tool.

```bash
curl -X PUT http://localhost:18790/v1/tools/builtin/exec \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
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

### `GET /v1/channels/instances/{id}`

Get a channel instance.

### `PUT /v1/channels/instances/{id}`

Update a channel instance.

### `DELETE /v1/channels/instances/{id}`

Delete a channel instance.

### Telegram Group Writers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/channels/instances/{id}/writers/groups` | List groups with write permissions |
| `GET` | `/v1/channels/instances/{id}/writers` | List authorized writers |
| `POST` | `/v1/channels/instances/{id}/writers` | Add a writer |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` | Remove a writer |

---

## Delegations

### `GET /v1/delegations`

List delegation history (agent-to-agent task handoffs).

### `GET /v1/delegations/{id}`

Get a single delegation record.

---

## OAuth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/auth/openai/status` | Check OpenAI OAuth status |
| `POST` | `/v1/auth/openai/start` | Initiate OAuth flow |
| `POST` | `/v1/auth/openai/callback` | Handle OAuth callback manually |
| `POST` | `/v1/auth/openai/logout` | Remove stored OAuth tokens |

---

## Common Response Shapes

**Success:**
```json
{ "id": "uuid", "name": "...", ... }
```

**Error:**
```json
{ "error": "agent not found" }
```

HTTP status codes follow REST conventions: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `404` Not Found, `500` Internal Error.

---

## What's Next

- [WebSocket Protocol](#websocket-protocol) — real-time RPC for chat and agent events
- [Config Reference](#config-reference) — full `config.json` schema
- [Database Schema](#database-schema) — table definitions and relationships

<!-- goclaw-source: 120fc2d | updated: 2026-03-18 -->
