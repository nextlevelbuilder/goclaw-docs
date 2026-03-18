# MCP Issues

> Troubleshooting MCP (Model Context Protocol) server connections, tool registration, and execution.

## Overview

GoClaw bridges external MCP servers to agent tool registries. Each server runs as a separate process (stdio) or remote service (SSE / streamable-HTTP). Connection errors, tool name collisions, and timeouts are the most common failure modes.

Check startup logs for MCP events — key log keys: `mcp.server.connected`, `mcp.server.connect_failed`, `mcp.server.health_failed`, `mcp.server.reconnect_exhausted`.

## Server Connection

### Config-file servers (`mcp_servers` block)

GoClaw connects to all enabled config-file servers at startup. A failed server is logged as a warning; GoClaw continues running — it does **not** block startup.

```
WARN mcp.server.connect_failed server=postgres error=create client: ...
```

| Problem | Cause | Solution |
|---------|-------|----------|
| `create client: ...` | Wrong `transport` or `command` path | Verify `transport` (`stdio`, `sse`, `streamable-http`) and that the binary/URL is reachable |
| `start transport: ...` (SSE/HTTP) | Server URL unreachable or TLS error | Check `url` is correct; verify network, firewall, and TLS certificate |
| `initialize: ...` | MCP handshake failed | Ensure server implements MCP protocol; check server logs |
| `list tools: ...` | Server connected but returned no tools | Server may have crashed during startup; check server logs |
| Server missing from dashboard | `enabled: false` in config | Set `enabled: true` or omit the field (default is true) |

### Reconnection

GoClaw health-checks every 30 seconds via ping. On failure it retries up to **10 times** with exponential backoff (2s initial, 60s max). After 10 failures the server is marked permanently disconnected.

```
WARN mcp.server.health_failed server=postgres error=...
INFO mcp.server.reconnecting  server=postgres attempt=3 backoff=8s
ERROR mcp.server.reconnect_exhausted server=postgres
```

If you see `reconnect_exhausted`, the server process has likely crashed. Restart the MCP server and then trigger a dashboard reconnect or restart GoClaw.

## Tool Registration

Tools are registered under the name `{prefix}__{tool_name}`. The prefix defaults to `mcp_{server_name}` (hyphens converted to underscores). You can override it with `tool_prefix` in the server config.

| Problem | Cause | Solution |
|---------|-------|----------|
| `mcp.tool.name_collision` in logs, tool skipped | Two servers expose a tool that resolves to the same registered name | Set a unique `tool_prefix` per server in config |
| Tools not visible to agent | Server connected but agent has no permission grant | Grant the server to the agent in the dashboard (Agents → MCP tab) |
| >40 tools → only `mcp_tool_search` visible | Search mode activated automatically above 40-tool threshold | Use `mcp_tool_search` to find and activate tools on demand; this is expected behavior |

## Transport Errors

### stdio

| Problem | Cause | Solution |
|---------|-------|----------|
| `exec: command not found` | Binary not in PATH or wrong `command` value | Use absolute path in `command`; verify the binary is installed |
| Process exits immediately | Server crashed on startup | Run the command manually in a terminal to see its error output |
| Env vars not passed | Missing entries in `env` map | Add required vars under `env` in the server config block |

### SSE / streamable-HTTP

| Problem | Cause | Solution |
|---------|-------|----------|
| `connection refused` | Server not running or wrong port | Start the server; verify `url` matches the listening address |
| `401 Unauthorized` | Missing or wrong auth header | Add the token under `headers` (e.g., `Authorization: Bearer <token>`) |
| TLS certificate error | Self-signed or expired cert | Use a valid cert, or run the MCP server behind a trusted reverse proxy |

## Tool Execution

| Problem | Cause | Solution |
|---------|-------|----------|
| `MCP server "X" is disconnected` | Server went offline after initial connect | Check server process; GoClaw retries reconnection automatically |
| `MCP tool "X" timeout after Ns` | Tool call exceeded `timeout_sec` (default 60s) | Increase `timeout_sec` in the server config; default is 60s |
| `MCP tool "X" error: ...` | Server returned an error during execution | Check MCP server logs for the root cause |
| Tool returns `[non-text content: ...]` | Server returned image/audio instead of text | Expected for non-text tools; content type is noted in the result |

## What's Next

- [Common Issues](#troubleshoot-common) — general startup and connectivity problems
- [Dashboard Tour](#dashboard-tour) — manage MCP servers and grants in the UI

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
