> Bản dịch từ [English version](#rest-api)

# REST API

> Tất cả HTTP endpoint `/v1` cho quản lý agent, provider, skills, traces, và nhiều hơn.

## Tổng quan

HTTP API của GoClaw được serve trên cùng port với WebSocket gateway. Tất cả endpoint đều yêu cầu `Bearer` token trong header `Authorization` khớp với `GOCLAW_GATEWAY_TOKEN`.

Tài liệu tương tác: `/docs` (Swagger UI) · spec thô: `/v1/openapi.json`

**Base URL:** `http://<host>:<port>`

**Auth header:**
```
Authorization: Bearer YOUR_GATEWAY_TOKEN
```

**User identity header** (tùy chọn, để scope theo từng user):
```
X-GoClaw-User-Id: user123
```

### Header phổ biến

| Header | Mục đích |
|--------|---------|
| `Authorization` | Bearer token |
| `X-GoClaw-User-Id` | External user ID cho multi-tenant context |
| `X-GoClaw-Agent-Id` | Agent identifier cho scoped operation |
| `X-GoClaw-Tenant-Id` | Tenant scope — UUID hoặc slug |
| `Accept-Language` | Locale (`en`, `vi`, `zh`) cho i18n error message |

**Kiểm tra input:** Tất cả string input được sanitize — ký tự đặc biệt SQL được escape trong ILIKE query, request body giới hạn 1 MB, tên agent/provider/tool được kiểm tra theo allowlist pattern (`[a-zA-Z0-9_-]`).

---

## Chat Completions

API chat tương thích OpenAI để truy cập agent theo chương trình.

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

Đặt `"stream": true` để nhận SSE chunk kết thúc bằng `data: [DONE]`.

---

## OpenResponses Protocol

### `POST /v1/responses`

Protocol dựa trên response thay thế (tương thích OpenAI Responses API). Nhận cùng auth và trả về response object có cấu trúc.

---

## Agents

CRUD để quản lý agent. Yêu cầu header `X-GoClaw-User-Id` cho multi-tenant context.

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

### Predefined Agent Instances

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/instances` | Liệt kê user instance |
| `GET` | `/v1/agents/{id}/instances/{userID}/files` | Liệt kê context file của user |
| `GET` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Lấy context file cụ thể |
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Cập nhật user file (chỉ USER.md) |
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` | Cập nhật instance metadata |

### `GET /v1/agents/{id}/codex-pool-activity`

Trả về hoạt động routing và sức khỏe từng tài khoản cho agent đang dùng [Codex OAuth pool](#provider-codex). Yêu cầu provider của agent là kiểu `chatgpt_oauth` với pool đã được cấu hình.

**Xác thực:** Cần Bearer token. Người dùng phải có quyền truy cập agent.

**Query parameter:**

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `limit` | integer | `18` | Số request gần đây trả về (tối đa 50) |

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

Nếu agent không dùng provider `chatgpt_oauth` hoặc pool chưa được cấu hình, `pool_providers` là mảng rỗng và `provider_counts`/`recent_requests` cũng rỗng.

Trả về `503` nếu tracing store không khả dụng.

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

Response: `{content, run_id, usage?}`. Dùng bởi orchestrator (n8n, Paperclip) để kích hoạt agent run từ bên ngoài.

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

**Loại được hỗ trợ:** `anthropic_native`, `openai_compat`, `chatgpt_oauth`, `gemini_native`, `dashscope`, `bailian`, `minimax`, `claude_cli`, `acp`

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

### `POST /v1/skills/{id}/toggle`

Bật/tắt skill.

### `PUT /v1/skills/{id}/tenant-config`

Đặt cấu hình ghi đè cho skill theo tenant (ví dụ: bật/tắt cho tenant hiện tại). Chỉ admin.

### `DELETE /v1/skills/{id}/tenant-config`

Xóa cấu hình ghi đè theo tenant (khôi phục về mặc định). Chỉ admin.

### Skill Grants

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/skills/{id}/grants/agent` | Cấp skill cho agent |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` | Thu hồi agent grant |
| `POST` | `/v1/skills/{id}/grants/user` | Cấp skill cho user |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` | Thu hồi user grant |
| `GET` | `/v1/agents/{agentID}/skills` | Liệt kê skills agent có thể truy cập |

### Skill Files & Dependencies

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/skills/{id}/versions` | Liệt kê version có sẵn |
| `GET` | `/v1/skills/{id}/files` | Liệt kê file trong skill |
| `GET` | `/v1/skills/{id}/files/{path...}` | Đọc nội dung file |
| `POST` | `/v1/skills/rescan-deps` | Rescan runtime dependency |
| `POST` | `/v1/skills/install-deps` | Cài đặt tất cả dependency còn thiếu |
| `POST` | `/v1/skills/install-dep` | Cài đặt một dependency đơn lẻ |
| `GET` | `/v1/skills/runtimes` | Kiểm tra runtime có sẵn |

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

Đặt `"dryRun": true` để trả về tool schema mà không thực thi.

### Built-in Tools

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/tools/builtin` | Liệt kê tất cả built-in tool |
| `GET` | `/v1/tools/builtin/{name}` | Lấy định nghĩa tool |
| `PUT` | `/v1/tools/builtin/{name}` | Cập nhật enabled/settings |

### Custom Tools

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/tools/custom` | Liệt kê custom tool (có phân trang) |
| `POST` | `/v1/tools/custom` | Tạo custom tool |
| `GET` | `/v1/tools/custom/{id}` | Lấy chi tiết tool |
| `PUT` | `/v1/tools/custom/{id}` | Cập nhật tool |
| `DELETE` | `/v1/tools/custom/{id}` | Xóa tool |

Query param cho list: `agent_id`, `search`, `limit`, `offset`

---

## Memory

Vector memory per-agent sử dụng pgvector.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/memory/documents` | Liệt kê tất cả document globally |
| `GET` | `/v1/agents/{agentID}/memory/documents` | Liệt kê document của agent |
| `GET` | `/v1/agents/{agentID}/memory/documents/{path...}` | Lấy chi tiết document |
| `PUT` | `/v1/agents/{agentID}/memory/documents/{path...}` | Tạo/cập nhật document |
| `DELETE` | `/v1/agents/{agentID}/memory/documents/{path...}` | Xóa document |
| `GET` | `/v1/agents/{agentID}/memory/chunks` | Liệt kê chunk của document |
| `POST` | `/v1/agents/{agentID}/memory/index` | Index một document |
| `POST` | `/v1/agents/{agentID}/memory/index-all` | Index tất cả document |
| `POST` | `/v1/agents/{agentID}/memory/search` | Semantic search |

Query param tùy chọn `?user_id=` để scope theo user.

---

## Knowledge Graph

Đồ thị entity-relation per-agent.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{agentID}/kg/entities` | Liệt kê/tìm kiếm entity (BM25) |
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Lấy entity kèm relation |
| `POST` | `/v1/agents/{agentID}/kg/entities` | Upsert entity |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Xóa entity |
| `POST` | `/v1/agents/{agentID}/kg/traverse` | Duyệt đồ thị (tối đa độ sâu 3) |
| `POST` | `/v1/agents/{agentID}/kg/extract` | Trích xuất entity bằng LLM |
| `GET` | `/v1/agents/{agentID}/kg/stats` | Thống kê knowledge graph |
| `GET` | `/v1/agents/{agentID}/kg/graph` | Toàn bộ đồ thị để trực quan hóa |

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

### `GET /v1/traces/{traceID}/export`

Xuất cây trace dưới dạng gzipped JSON.

### Costs

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/costs/summary` | Tóm tắt chi phí theo agent/khoảng thời gian |

---

## Usage & Analytics

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/usage/timeseries` | Điểm dữ liệu usage theo thời gian |
| `GET` | `/v1/usage/breakdown` | Phân tích theo provider/model/channel |
| `GET` | `/v1/usage/summary` | Tóm tắt với so sánh kỳ trước |

**Query param:** `from`, `to` (RFC 3339), `agent_id`, `provider`, `model`, `channel`, `group_by`

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

Transport: `"stdio"`, `"sse"`, `"streamable-http"`.

### `GET /v1/mcp/servers/{id}`

Lấy MCP server.

### `PUT /v1/mcp/servers/{id}`

Cập nhật MCP server. Các field có thể cập nhật:

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | string | Tên hiển thị server |
| `transport` | string | `"stdio"`, `"sse"`, `"streamable-http"` |
| `command` | string | Lệnh chạy (stdio) |
| `args` | string[] | Tham số lệnh |
| `url` | string | URL server (sse/streamable-http) |
| `api_key` | string | API key cho server |
| `env` | object | Biến môi trường |
| `headers` | object | HTTP headers |
| `enabled` | boolean | Bật/tắt |
| `tool_prefix` | string | Tiền tố cho tên tool |
| `timeout_sec` | integer | Timeout request (giây) |
| `agent_id` | string | Gắn với agent cụ thể |
| `config` | object | Cấu hình bổ sung |
| `settings` | object | Cài đặt server |

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

**Channel được hỗ trợ:** `telegram`, `discord`, `slack`, `whatsapp`, `zalo_oa`, `zalo_personal`, `feishu`

### `GET /v1/channels/instances/{id}`

Lấy channel instance.

### `PUT /v1/channels/instances/{id}`

Cập nhật channel instance. Các field có thể cập nhật:

| Field | Type | Mô tả |
|-------|------|-------|
| `channel_type` | string | Loại channel |
| `credentials` | object | Thông tin xác thực channel |
| `agent_id` | string | UUID agent gắn kết |
| `enabled` | boolean | Bật/tắt |
| `display_name` | string | Tên hiển thị |
| `group_policy` | string | Chính sách tin nhắn nhóm |
| `allow_from` | string[] | Danh sách sender ID được phép |
| `metadata` | object | Metadata tùy chỉnh |
| `webhook_secret` | string | Secret xác minh webhook |
| `config` | object | Cấu hình bổ sung |

### `DELETE /v1/channels/instances/{id}`

Xóa channel instance.

### Group Writers

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/channels/instances/{id}/writers/groups` | Liệt kê group có quyền ghi |
| `GET` | `/v1/channels/instances/{id}/writers` | Liệt kê writer được phép |
| `POST` | `/v1/channels/instances/{id}/writers` | Thêm writer |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` | Xóa writer |

---

## Contacts

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/contacts` | Liệt kê contact (có phân trang) |
| `GET` | `/v1/contacts/resolve?ids=...` | Resolve contact theo ID (tối đa 100) |
| `POST` | `/v1/contacts/merge` | Gộp các contact trùng lặp |

---

## Sessions

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/sessions` | Liệt kê session (có phân trang) |
| `GET` | `/v1/sessions/{key}` | Lấy session kèm message |
| `DELETE` | `/v1/sessions/{key}` | Xóa session |
| `POST` | `/v1/sessions/{key}/reset` | Xóa tất cả message của session |
| `PATCH` | `/v1/sessions/{key}` | Cập nhật label, model, metadata |

---

## Team Events

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/teams/{id}/events` | Liệt kê team event (có phân trang) |

---

## Delegations

### `GET /v1/delegations`

Liệt kê lịch sử delegation (agent-to-agent task handoff).

**Filter:** `source_agent_id`, `target_agent_id`, `team_id`, `user_id`, `status`, `limit`, `offset`

### `GET /v1/delegations/{id}`

Lấy một delegation record.

---

## Pending Messages

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/pending-messages` | Liệt kê tất cả group kèm tiêu đề |
| `GET` | `/v1/pending-messages/messages` | Liệt kê message theo channel+key |
| `DELETE` | `/v1/pending-messages` | Xóa message group |
| `POST` | `/v1/pending-messages/compact` | Tóm tắt bằng LLM (async, 202) |

---

## Secure CLI Credentials

Yêu cầu **admin role** (full gateway token hoặc gateway token rỗng ở chế độ dev/single-user).

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/cli-credentials` | Liệt kê tất cả credential |
| `POST` | `/v1/cli-credentials` | Tạo credential mới |
| `GET` | `/v1/cli-credentials/{id}` | Lấy chi tiết credential |
| `PUT` | `/v1/cli-credentials/{id}` | Cập nhật credential |
| `DELETE` | `/v1/cli-credentials/{id}` | Xóa credential |
| `GET` | `/v1/cli-credentials/presets` | Lấy preset credential template |
| `POST` | `/v1/cli-credentials/{id}/test` | Test kết nối credential (dry-run) |

---

## Runtime & Packages

Quản lý package system (apk), Python (pip), và Node (npm). Yêu cầu authentication.

### `GET /v1/packages`

Liệt kê tất cả package đã cài, nhóm theo category (system, pip, npm).

### `POST /v1/packages/install`

```json
{ "package": "github-cli" }
```

Dùng prefix `"pip:pandas"` hoặc `"npm:typescript"` để chỉ định package manager. Không có prefix thì mặc định là system (apk).

### `POST /v1/packages/uninstall`

Cùng format với install.

### `GET /v1/packages/runtimes`

Kiểm tra Python và Node runtime có sẵn hay không.

```json
{ "python": true, "node": true }
```

---

## Storage

Quản lý file workspace.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/storage/files` | Liệt kê file với giới hạn độ sâu |
| `GET` | `/v1/storage/files/{path...}` | Đọc file (JSON hoặc raw) |
| `DELETE` | `/v1/storage/files/{path...}` | Xóa file/thư mục |
| `GET` | `/v1/storage/size` | Stream kích thước storage (SSE, cache 60 phút) |

`?raw=true` — serve MIME type gốc. `?depth=N` — giới hạn độ sâu traversal.

---

## Media

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/media/upload` | Upload file (multipart, tối đa 50 MB) |
| `GET` | `/v1/media/{id}` | Serve media theo ID kèm cache |

Auth qua Bearer token hoặc query param `?token=` (dùng cho tag `<img>` và `<audio>`).

---

## Files

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/files/{path...}` | Serve workspace file theo path |

**Query parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `download` | `bool` | Khi `true`, ép `Content-Disposition: attachment` (tải về thay vì hiển thị inline) |

---

## API Keys

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/api-keys` | Liệt kê tất cả API key (đã che) |
| `POST` | `/v1/api-keys` | Tạo API key (trả về key thô một lần) |
| `POST` | `/v1/api-keys/{id}/revoke` | Thu hồi API key |

### Create Request

```json
{
  "name": "ci-deploy",
  "scopes": ["operator.read", "operator.write"],
  "expires_in": 2592000
}
```

Field `key` chỉ được trả về trong response tạo mới. Các lần gọi sau chỉ hiển thị `prefix`.

---

## OAuth

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/auth/openai/status` | Kiểm tra trạng thái OpenAI OAuth |
| `POST` | `/v1/auth/openai/start` | Khởi động OAuth flow |
| `POST` | `/v1/auth/openai/callback` | Xử lý OAuth callback thủ công |
| `POST` | `/v1/auth/openai/logout` | Xóa OAuth token đã lưu |

---

## Tenants

Quản lý multi-tenant (chỉ gateway token scope).

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/tenants` | Liệt kê tenant |
| `POST` | `/v1/tenants` | Tạo tenant |
| `GET` | `/v1/tenants/{id}` | Lấy tenant |
| `PUT` | `/v1/tenants/{id}` | Cập nhật tenant |
| `DELETE` | `/v1/tenants/{id}` | Xóa tenant |

---

## Activity & Audit

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/activity` | Liệt kê activity audit log (có thể filter) |

---

## System Configs

Kho cấu hình key-value theo tenant. Đọc cho tất cả user đã xác thực; ghi yêu cầu quyền admin.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/system-configs` | Liệt kê config cho tenant hiện tại |
| `GET` | `/v1/system-configs/{key}` | Lấy giá trị config theo key |
| `PUT` | `/v1/system-configs/{key}` | Đặt giá trị config (chỉ admin) |
| `DELETE` | `/v1/system-configs/{key}` | Xóa config entry (chỉ admin) |

---

## System

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/health` | Health check (không cần auth) |
| `GET` | `/v1/openapi.json` | OpenAPI 3.0 spec |
| `GET` | `/docs` | Swagger UI |

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

| Code | Ý nghĩa |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request (JSON không hợp lệ, thiếu field) |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not found |
| `409` | Conflict (tên trùng lặp) |
| `429` | Rate limited |
| `500` | Internal server error |

Error message được localize theo header `Accept-Language`.

---

## Endpoint chỉ có trên WebSocket

Các endpoint sau **chỉ có trên WebSocket RPC**, không có HTTP:

- **Cron jobs:** Liệt kê, tạo, cập nhật, xóa, logs (`cron.*`)
- **Config management:** Lấy, áp dụng, patch (`config.*`)
- **Gửi message:** Gửi đến channel (`send.*`)

---

## Tiếp theo

- [WebSocket Protocol](#websocket-protocol) — real-time RPC cho chat và agent event
- [Config Reference](#config-reference) — schema đầy đủ `config.json`
- [Database Schema](#database-schema) — định nghĩa bảng và quan hệ

<!-- goclaw-source: 231bc968 | cập nhật: 2026-03-27 -->
