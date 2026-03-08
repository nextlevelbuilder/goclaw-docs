> Bản dịch từ [English version](../../reference/rest-api.md)

# REST API

> Tất cả HTTP endpoint `/v1` cho quản lý agent, provider, skills, traces, và nhiều hơn.

## Tổng quan

HTTP API của GoClaw được serve trên cùng port với WebSocket gateway. Tất cả endpoint đều yêu cầu `Bearer` token trong header `Authorization` khớp với `GOCLAW_GATEWAY_TOKEN`.

**Base URL:** `http://<host>:<port>`

**Auth header:**
```
Authorization: Bearer YOUR_GATEWAY_TOKEN
```

**User identity header** (tùy chọn, để scope theo từng user):
```
X-GoClaw-User-Id: user123
```

---

## Agents

### `GET /v1/agents`

Liệt kê tất cả agents.

```bash
curl http://localhost:18790/v1/agents \
  -H "Authorization: Bearer TOKEN"
```

### `POST /v1/agents`

Tạo agent mới.

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

Lấy một agent theo ID.

### `PUT /v1/agents/{id}`

Cập nhật agent. Chỉ gửi các field cần thay đổi.

### `DELETE /v1/agents/{id}`

Xóa agent.

### `POST /v1/agents/{id}/regenerate`

Tạo lại context file của agent từ template.

### `POST /v1/agents/{id}/resummon`

Kích hoạt lại LLM-based summoning cho predefined agent.

### Agent Shares

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/shares` | Liệt kê shares của agent |
| `POST` | `/v1/agents/{id}/shares` | Chia sẻ agent với user |
| `DELETE` | `/v1/agents/{id}/shares/{userID}` | Thu hồi share |

---

## Providers

### `GET /v1/providers`

Liệt kê tất cả LLM provider.

### `POST /v1/providers`

Tạo LLM provider.

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

Lấy provider theo ID.

### `PUT /v1/providers/{id}`

Cập nhật provider.

### `DELETE /v1/providers/{id}`

Xóa provider.

### `GET /v1/providers/{id}/models`

Liệt kê model có sẵn từ provider (proxy đến upstream API).

### `POST /v1/providers/{id}/verify`

Pre-flight check — xác minh API key và model có thể kết nối được.

### `GET /v1/providers/claude-cli/auth-status`

Kiểm tra trạng thái Claude CLI authentication (global, không phải per-provider).

---

## Skills

### `GET /v1/skills`

Liệt kê tất cả skills.

### `POST /v1/skills/upload`

Upload skill dưới dạng file `.zip` (tối đa 20 MB).

```bash
curl -X POST http://localhost:18790/v1/skills/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@my-skill.zip"
```

### `GET /v1/skills/{id}`

Lấy skill metadata.

### `PUT /v1/skills/{id}`

Cập nhật skill metadata.

### `DELETE /v1/skills/{id}`

Xóa skill.

### Skill Grants

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/skills/{id}/grants/agent` | Cấp skill cho agent |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` | Thu hồi agent grant |
| `POST` | `/v1/skills/{id}/grants/user` | Cấp skill cho user |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` | Thu hồi user grant |
| `GET` | `/v1/agents/{agentID}/skills` | Liệt kê skills agent có thể truy cập |

---

## Traces

### `GET /v1/traces`

Liệt kê LLM traces. Hỗ trợ query params: `agentId`, `userId`, `status`, `limit`, `offset`.

```bash
curl "http://localhost:18790/v1/traces?agentId=UUID&limit=50" \
  -H "Authorization: Bearer TOKEN"
```

### `GET /v1/traces/{traceID}`

Lấy một trace cùng tất cả spans của nó.

---

## MCP Servers

### `GET /v1/mcp/servers`

Liệt kê tất cả cấu hình MCP server.

### `POST /v1/mcp/servers`

Đăng ký MCP server.

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

Lấy MCP server.

### `PUT /v1/mcp/servers/{id}`

Cập nhật MCP server.

### `DELETE /v1/mcp/servers/{id}`

Xóa MCP server.

### `POST /v1/mcp/servers/test`

Test kết nối đến MCP server trước khi lưu.

### `GET /v1/mcp/servers/{id}/tools`

Liệt kê tool được discover từ MCP server đang chạy.

### MCP Grants

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/mcp/servers/{id}/grants` | Liệt kê grants của server |
| `POST` | `/v1/mcp/servers/{id}/grants/agent` | Cấp server cho agent |
| `DELETE` | `/v1/mcp/servers/{id}/grants/agent/{agentID}` | Thu hồi agent grant |
| `GET` | `/v1/mcp/grants/agent/{agentID}` | Liệt kê tất cả grants của agent |
| `POST` | `/v1/mcp/servers/{id}/grants/user` | Cấp server cho user |
| `DELETE` | `/v1/mcp/servers/{id}/grants/user/{userID}` | Thu hồi user grant |

### MCP Access Requests

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/mcp/requests` | Gửi access request |
| `GET` | `/v1/mcp/requests` | Liệt kê request đang chờ |
| `POST` | `/v1/mcp/requests/{id}/review` | Phê duyệt hoặc từ chối request |

---

## Custom Tools

### `GET /v1/tools/custom`

Liệt kê custom (DB-backed) tools.

### `POST /v1/tools/custom`

Tạo custom tool.

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

Lấy custom tool.

### `PUT /v1/tools/custom/{id}`

Cập nhật custom tool.

### `DELETE /v1/tools/custom/{id}`

Xóa custom tool.

---

## Built-in Tools

### `GET /v1/tools/builtin`

Liệt kê tất cả built-in tool với trạng thái bật/tắt.

### `GET /v1/tools/builtin/{name}`

Lấy built-in tool theo tên.

### `PUT /v1/tools/builtin/{name}`

Bật hoặc tắt built-in tool.

```bash
curl -X PUT http://localhost:18790/v1/tools/builtin/exec \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```

---

## Channel Instances

### `GET /v1/channels/instances`

Liệt kê tất cả channel instance từ database.

### `POST /v1/channels/instances`

Tạo channel instance.

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

Lấy channel instance.

### `PUT /v1/channels/instances/{id}`

Cập nhật channel instance.

### `DELETE /v1/channels/instances/{id}`

Xóa channel instance.

### Telegram Group Writers

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/channels/instances/{id}/writers/groups` | Liệt kê group có quyền ghi |
| `GET` | `/v1/channels/instances/{id}/writers` | Liệt kê writer được phép |
| `POST` | `/v1/channels/instances/{id}/writers` | Thêm writer |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` | Xóa writer |

---

## Delegations

### `GET /v1/delegations`

Liệt kê lịch sử delegation (agent-to-agent task handoff).

### `GET /v1/delegations/{id}`

Lấy một delegation record.

---

## OAuth

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/auth/openai/status` | Kiểm tra trạng thái OpenAI OAuth |
| `POST` | `/v1/auth/openai/start` | Khởi động OAuth flow |
| `POST` | `/v1/auth/openai/callback` | Xử lý OAuth callback thủ công |
| `POST` | `/v1/auth/openai/logout` | Xóa OAuth token đã lưu |

---

## Dạng Response phổ biến

**Thành công:**
```json
{ "id": "uuid", "name": "...", ... }
```

**Lỗi:**
```json
{ "error": "agent not found" }
```

HTTP status code theo quy ước REST: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `404` Not Found, `500` Internal Error.

---

## Tiếp theo

- [WebSocket Protocol](./websocket-protocol.md) — real-time RPC cho chat và agent event
- [Config Reference](./config-reference.md) — schema đầy đủ `config.json`
- [Database Schema](./database-schema.md) — định nghĩa bảng và quan hệ
