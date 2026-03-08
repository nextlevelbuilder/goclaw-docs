# MCP Integration

> Connect any Model Context Protocol server to GoClaw and instantly give your agents its full tool catalog.

## Overview

MCP (Model Context Protocol) is an open standard that lets AI tools expose capabilities over a well-defined interface. Instead of writing a custom tool for every external service, you point GoClaw at an MCP server and it automatically discovers and registers all the tools that server exposes.

GoClaw supports three transports:

| Transport | When to use |
|---|---|
| `stdio` | Local process spawned by GoClaw (e.g. a Python script) |
| `sse` | Remote HTTP server using Server-Sent Events |
| `streamable-http` | Remote HTTP server using the newer streamable-HTTP transport |

```mermaid
graph LR
    Agent --> Manager["MCP Manager"]
    Manager -->|stdio| LocalProcess["Local process\n(e.g. python mcp_server.py)"]
    Manager -->|sse| RemoteSSE["Remote SSE server\n(e.g. http://mcp:8000/sse)"]
    Manager -->|streamable-http| RemoteHTTP["Remote HTTP server\n(e.g. http://mcp:8000/mcp)"]
    Manager --> Registry["Tool Registry"]
    Registry --> Agent
```

GoClaw runs a health-check loop every 30 seconds and reconnects with exponential backoff (up to 10 attempts, capped at 60 s between retries) if a server goes down.

## Registering an MCP Server

### Option 1 — config file (shared across all agents)

Add an `mcp_servers` block to your `config.json`:

```json
{
  "mcp_servers": {
    "vnstock": {
      "transport": "streamable-http",
      "url": "http://vnstock-mcp:8000/mcp",
      "tool_prefix": "vnstock_",
      "timeout_sec": 30,
      "enabled": true
    },
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "tool_prefix": "fs_",
      "timeout_sec": 60,
      "enabled": true
    }
  }
}
```

Config-based servers are loaded at startup and shared across all agents and users.

### Option 2 — Dashboard

Go to **Settings → MCP Servers → Add Server** and fill in the transport, URL or command, and optional prefix.

### Option 3 — HTTP API

```bash
curl -X POST http://localhost:8080/v1/mcp/servers \
  -H "Authorization: Bearer $GOCLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vnstock",
    "transport": "streamable-http",
    "url": "http://vnstock-mcp:8000/mcp",
    "tool_prefix": "vnstock_",
    "timeout_sec": 30,
    "enabled": true
  }'
```

### Server config fields

| Field | Type | Description |
|---|---|---|
| `transport` | string | `stdio`, `sse`, or `streamable-http` |
| `command` | string | Executable path (stdio only) |
| `args` | string[] | Arguments for the command (stdio only) |
| `env` | object | Environment variables for the process (stdio only) |
| `url` | string | Server URL (sse / streamable-http only) |
| `headers` | object | HTTP headers (sse / streamable-http only) |
| `tool_prefix` | string | Prefix prepended to all tool names from this server |
| `timeout_sec` | int | Per-call timeout (default 60 s) |
| `enabled` | bool | Set to `false` to disable without removing |

## Tool Prefixes

Two MCP servers might both expose a tool called `search`. GoClaw prevents collisions by prepending the `tool_prefix` to every tool name from that server:

```
vnstock_   → vnstock_search, vnstock_get_price, vnstock_get_financials
filesystem_ → filesystem_read_file, filesystem_write_file
```

If no prefix is set and a name collision is detected, GoClaw logs a warning and skips the duplicate tool. Always set a prefix when connecting servers from different providers.

## Per-Agent Access Grants

DB-backed servers (added via Dashboard or API) support per-agent and per-user access control. You can also restrict which tools an agent can call:

```bash
# Grant agent access to a server, allow only specific tools
curl -X POST http://localhost:8080/v1/mcp/grants \
  -H "Authorization: Bearer $GOCLAW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "3f2a1b4c-...",
    "server_id": "a1b2c3d4-...",
    "tool_allow": ["vnstock_get_price", "vnstock_get_financials"],
    "tool_deny":  []
  }'
```

When `tool_allow` is non-empty, only those tools are visible to the agent. `tool_deny` removes specific tools even when the rest are allowed.

## Per-User Self-Service Access

Users can request access to an MCP server through the self-service portal. Requests are queued for admin approval. Once approved, the server is loaded for that user's sessions automatically via `LoadForAgent`.

## Checking Server Status

```bash
GET /v1/mcp/servers/status
```

Response:

```json
[
  {
    "name": "vnstock",
    "transport": "streamable-http",
    "connected": true,
    "tool_count": 12,
    "error": ""
  }
]
```

## Examples

### Add a stock data MCP server (docker-compose overlay)

```yaml
# docker-compose.vnstock-mcp.yml
services:
  vnstock-mcp:
    build:
      context: ./vnstock-mcp
    environment:
      - MCP_TRANSPORT=http
      - MCP_PORT=8000
      - MCP_HOST=0.0.0.0
      - VNSTOCK_API_KEY=${VNSTOCK_API_KEY}
    networks:
      - default
```

Then register it in `config.json`:

```json
{
  "mcp_servers": {
    "vnstock": {
      "transport": "streamable-http",
      "url": "http://vnstock-mcp:8000/mcp",
      "tool_prefix": "vnstock_",
      "timeout_sec": 30,
      "enabled": true
    }
  }
}
```

Start the stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.vnstock-mcp.yml up -d
```

Your agents can now call `vnstock_get_price`, `vnstock_get_financials`, etc.

### Local stdio server (Python)

```json
{
  "mcp_servers": {
    "my-tools": {
      "transport": "stdio",
      "command": "python3",
      "args": ["/opt/mcp/my_tools_server.py"],
      "env": { "MY_API_KEY": "secret" },
      "tool_prefix": "mytools_",
      "enabled": true
    }
  }
}
```

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| Server shows `connected: false` | Network unreachable or wrong URL/command | Check logs for `mcp.server.connect_failed`; verify URL |
| Tools not visible to agent | No access grant for that agent | Add a grant via Dashboard or API |
| Tool name collision warning in logs | Two servers expose same tool name without prefix | Set `tool_prefix` on one or both servers |
| `unsupported transport` error | Typo in transport field | Use exactly `stdio`, `sse`, or `streamable-http` |
| SSE server reconnects repeatedly | Server does not implement `ping` | This is normal — GoClaw treats `method not found` as healthy |

## What's Next

- [Custom Tools](../advanced/custom-tools.md) — build shell-backed tools without an MCP server
- [Skills](../advanced/skills.md) — inject reusable knowledge into agent system prompts
