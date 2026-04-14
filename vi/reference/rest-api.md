> Bản dịch từ [English version](/rest-api)

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
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | Cập nhật user file (admin) |
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` | Cập nhật instance metadata |

### Export / Import Agent

Xuất và nhập cấu hình + dữ liệu agent dưới dạng archive tar.gz. Hỗ trợ xuất từng section tuỳ chọn.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/export/preview` | Xem trước số lượng từng section (không tạo archive) |
| `GET` | `/v1/agents/{id}/export` | Tải xuống archive agent trực tiếp (tar.gz) |
| `GET` | `/v1/agents/{id}/export/download/{token}` | Tải archive đã chuẩn bị qua token ngắn hạn (hết hạn sau 5 phút) |
| `POST` | `/v1/agents/import` | Import archive thành **agent mới** (multipart field `file`) |
| `POST` | `/v1/agents/import/preview` | Parse archive và trả manifest mà không import |
| `POST` | `/v1/agents/{id}/import` | **Merge** dữ liệu archive vào agent hiện có |

**Query params cho export:**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `sections` | string | Danh sách section cách nhau bởi dấu phẩy. Mặc định: `config,context_files`. Có thể chọn: `config`, `context_files`, `memory`, `knowledge_graph`, `cron`, `user_profiles`, `user_overrides`, `workspace` |
| `stream` | `bool` | Khi `true`, trả SSE progress rồi event `complete` kèm `download_url` |

**Import query params (`POST /v1/agents/import`):**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `agent_key` | string | Ghi đè agent key (mặc định lấy từ archive) |
| `display_name` | string | Ghi đè display name |
| `stream` | `bool` | Stream tiến trình import qua SSE |

**Merge import query params (`POST /v1/agents/{id}/import`):**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `include` | string | Danh sách section cần merge, cách nhau bởi dấu phẩy. Mặc định là tất cả section |
| `stream` | `bool` | Stream tiến trình merge qua SSE |

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

> Cron job luôn được import ở trạng thái **disabled**. Job trùng tên sẽ bị bỏ qua. Giới hạn archive: 500 MB.

---

### `GET /v1/agents/{id}/codex-pool-activity`

Trả về hoạt động routing và sức khỏe từng tài khoản cho agent đang dùng [Codex OAuth pool](/provider-codex). Yêu cầu provider của agent là kiểu `chatgpt_oauth` với pool đã được cấu hình.

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

### `POST /v1/providers/{id}/verify-embedding`

Xác minh kết nối embedding model cho một provider.

### `GET /v1/providers/{id}/codex-pool-activity`

Trả về hoạt động routing của Codex OAuth pool ở cấp provider (xem thêm endpoint cấp agent ở trên).

### `GET /v1/embedding/status`

Kiểm tra embedding đã được cấu hình và khả dụng hay chưa.

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

### Skills Export / Import

Xuất và nhập custom skill dưới dạng archive tar.gz.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/skills/export/preview` | Xem trước số lượng trước khi export (không tạo archive) |
| `GET` | `/v1/skills/export` | Tải xuống skills archive trực tiếp (tar.gz) |
| `POST` | `/v1/skills/import` | Import skills archive (multipart field `file`) |

**Query params cho export:**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `stream` | `bool` | Khi `true`, trả SSE progress rồi event `complete` kèm `download_url` |

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

> Skill bị bỏ qua nếu slug đã tồn tại trong tenant. Grant tham chiếu agent theo `agent_key` — key không tìm thấy sẽ bị bỏ qua.

---

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
| `GET` | `/v1/tools/builtin/{name}/tenant-config` | Lấy cấu hình theo tenant của built-in tool |
| `PUT` | `/v1/tools/builtin/{name}` | Cập nhật enabled/settings |
| `PUT` | `/v1/tools/builtin/{name}/tenant-config` | Đặt cấu hình ghi đè theo tenant (admin) |
| `DELETE` | `/v1/tools/builtin/{name}/tenant-config` | Xóa cấu hình ghi đè theo tenant (admin) |

> **Lưu ý:** Custom tools qua REST API hiện chưa được triển khai. MCP servers và skills là cơ chế mở rộng được khuyến nghị.

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

## Khả năng Agent V3

> Tính năng mới trong v3. Bật theo từng agent qua [V3 Feature Flags](#v3-feature-flags).

### Evolution (Tiến hóa agent)

Theo dõi metric sử dụng tool và nhận gợi ý cải thiện tự động.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/evolution/metrics` | Liệt kê metric evolution thô hoặc tổng hợp |
| `GET` | `/v1/agents/{id}/evolution/suggestions` | Liệt kê gợi ý evolution |
| `PATCH` | `/v1/agents/{id}/evolution/suggestions/{suggestionID}` | Cập nhật trạng thái gợi ý (`pending` → `approved`/`rejected`/`rolled_back`) |
| `POST` | `/v1/agents/{id}/evolution/skill-apply` | Áp dụng gợi ý đã duyệt thành skill mới |

**Query params của `GET .../evolution/metrics`:** `type` (lọc: `tool`/`retrieval`/`feedback`), `aggregate` (boolean), `since` (ISO 8601), `limit`

**Query params của `GET .../evolution/suggestions`:** `status`, `limit`

---

### Episodic Memory (Bộ nhớ theo tập)

Tóm tắt cuộc trò chuyện theo session người dùng cho ngữ cảnh dài hạn.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/episodic` | Liệt kê tóm tắt episodic |
| `POST` | `/v1/agents/{id}/episodic/search` | Tìm kiếm hybrid BM25+vector trên episodic |

**Query params:** `user_id`, `limit` (mặc định: 20, tối đa: 500), `offset`

**Body tìm kiếm:** `{ "query": "...", "user_id": "tùy chọn", "max_results": 10, "min_score": 0.5 }`

---

### Knowledge Vault (Kho kiến thức)

Lưu trữ tài liệu bền vững với embedding vector và liên kết đồ thị.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/vault/documents` | Liệt kê tài liệu toàn hệ thống |
| `GET` | `/v1/vault/tree` | Cấu trúc cây phân cấp của vault document |
| `GET` | `/v1/vault/graph` | Dữ liệu đồ thị vault để trực quan hóa (cross-tenant, giới hạn 2000 node) |
| `POST` | `/v1/vault/enrichment/stop` | Dừng enrichment worker cho agent hiện tại |
| `GET` | `/v1/agents/{id}/vault/documents` | Liệt kê tài liệu của agent |
| `GET` | `/v1/agents/{id}/vault/documents/{docID}` | Lấy một tài liệu (nội dung đầy đủ) |
| `POST` | `/v1/agents/{id}/vault/search` | Tìm kiếm hybrid FTS+vector |
| `GET` | `/v1/agents/{id}/vault/documents/{docID}/links` | Lấy outlink và backlink của tài liệu |

**Response dạng danh sách:** `{ "documents": [...], "total": 42 }`

**Body tìm kiếm:** `{ "query": "...", "scope": "team", "doc_types": ["guide"], "max_results": 10 }`

---

### Orchestration (Điều phối)

Kiểm soát cách agent định tuyến yêu cầu.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/orchestration` | Lấy mode và target điều phối hiện tại |

**Giá trị mode:** `standalone` (trực tiếp), `delegate` (qua agent link), `team` (qua hệ thống task team)

---

### V3 Feature Flags

Các cờ tính năng theo từng agent kiểm soát các hệ thống con v3.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/v3-flags` | Lấy tất cả v3 flag của agent |
| `PATCH` | `/v1/agents/{id}/v3-flags` | Cập nhật flag (chấp nhận partial update) |

**Các flag:** `evolution_enabled`, `episodic_enabled`, `vault_enabled`, `orchestration_enabled`, `skill_evolve`, `self_evolve`

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
| `GET` | `/v1/agents/{agentID}/kg/graph/compact` | Biểu diễn đồ thị rút gọn (payload nhẹ hơn full graph) |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` | Quét tìm entity trùng lặp |
| `GET` | `/v1/agents/{agentID}/kg/dedup` | Liệt kê ứng viên dedup |
| `POST` | `/v1/agents/{agentID}/kg/merge` | Gộp entity trùng lặp |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` | Bỏ qua ứng viên dedup |

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

### `POST /v1/mcp/servers/{id}/reconnect`

Buộc kết nối lại MCP server đang chạy.

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

### MCP Export / Import

Xuất và nhập cấu hình MCP server và agent grant dưới dạng archive tar.gz.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/mcp/export/preview` | Xem trước số lượng trước khi export (không tạo archive) |
| `GET` | `/v1/mcp/export` | Tải xuống MCP archive trực tiếp (tar.gz) |
| `POST` | `/v1/mcp/import` | Import MCP archive (multipart field `file`) |

### MCP User Credentials

Lưu trữ credential per-user cho MCP server yêu cầu xác thực riêng.

| Method | Path | Mô tả |
|--------|------|-------|
| `PUT` | `/v1/mcp/servers/{id}/user-credentials` | Đặt credential của user cho server |
| `GET` | `/v1/mcp/servers/{id}/user-credentials` | Lấy credential của user |
| `DELETE` | `/v1/mcp/servers/{id}/user-credentials` | Xóa credential của user |

**Query params cho export:**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `stream` | `bool` | Khi `true`, trả SSE progress rồi event `complete` kèm `download_url` |

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
| `POST` | `/v1/contacts/unmerge` | Tách các contact đã gộp |
| `GET` | `/v1/contacts/merged/{tenantUserId}` | Liệt kê contact đã gộp của tenant user |

### Tenant Users

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/tenant-users` | Liệt kê tenant user |
| `GET` | `/v1/users/search` | Tìm kiếm user trong các channel |

---

## Team Events

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/teams/{id}/events` | Liệt kê team event (có phân trang) |

### Team Workspace

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/teams/{teamId}/workspace/upload` | Upload file vào team workspace |
| `PUT` | `/v1/teams/{teamId}/workspace/move` | Di chuyển/đổi tên file trong team workspace |

### Team Attachments

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/teams/{teamId}/attachments/{attachmentId}/download` | Tải xuống task attachment |

---

## Team Export / Import

Xuất và nhập toàn bộ team (metadata team + tất cả agent thành viên) dưới dạng archive tar.gz.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/teams/{id}/export/preview` | Xem trước số lượng (members, tasks, agent_links) không tạo archive |
| `GET` | `/v1/teams/{id}/export` | Tải xuống team archive trực tiếp (tar.gz) |
| `POST` | `/v1/teams/import` | Import team archive, tạo agent mới và kết nối team (multipart field `file`) |

**Export query params:**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `stream` | `bool` | Khi `true`, trả SSE progress rồi event `complete` kèm `download_url` |

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

> Import yêu cầu **quyền admin**. Agent key trùng sẽ được đổi tên tự động (hậu tố `-2`, `-3`, …). Cron job luôn được import ở trạng thái disabled.

Endpoint tải xuống dùng chung (dùng chung với token export agent):

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/export/download/{token}` | Tải archive qua token ngắn hạn (hết hạn 5 phút, dùng chung cho mọi loại export) |

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
| `POST` | `/v1/cli-credentials/check-binary` | Xác thực đường dẫn binary cho CLI credential |

### Per-User CLI Credentials

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/cli-credentials/{id}/user-credentials` | Liệt kê user credential cho một CLI config |
| `GET` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Lấy credential của user cụ thể |
| `PUT` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Đặt credential của user cụ thể |
| `DELETE` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | Xóa credential của user cụ thể |

### CLI Credential Agent Grants

Per-agent binary grants — kiểm soát agent nào được phép dùng một CLI credential binary cụ thể, với các giới hạn tùy chọn về đối số, verbose output, và timeout. Yêu cầu **admin role**.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/cli-credentials/{id}/agent-grants` | Liệt kê tất cả agent grant cho một credential |
| `POST` | `/v1/cli-credentials/{id}/agent-grants` | Tạo agent grant |
| `GET` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Lấy thông tin một grant cụ thể |
| `PUT` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Cập nhật grant |
| `DELETE` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` | Xóa grant |

**Trường khi tạo/cập nhật grant:**

| Field | Type | Mô tả |
|-------|------|-------|
| `agent_id` | UUID | Agent được cấp quyền truy cập (bắt buộc khi tạo) |
| `deny_args` | JSON | Giới hạn đối số (tùy chọn) |
| `deny_verbose` | JSON | Giới hạn verbose output (tùy chọn) |
| `timeout_seconds` | integer | Ghi đè timeout thực thi cho agent (tùy chọn) |
| `tips` | string | Gợi ý sử dụng cho agent (tùy chọn) |
| `enabled` | boolean | Bật/tắt grant (mặc định: `true`) |

**Response khi tạo** (`201 Created`): đối tượng grant vừa tạo.

Thay đổi grant sẽ phát sự kiện `cache_invalidate` trên message bus để các agent đang kết nối cập nhật ngay lập tức.

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

### `GET /v1/shell-deny-groups`

Liệt kê các nhóm lệnh shell bị từ chối (chính sách bảo mật).

---

## Storage

Quản lý file workspace.

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/storage/files` | Liệt kê file với giới hạn độ sâu |
| `GET` | `/v1/storage/files/{path...}` | Đọc file (JSON hoặc raw) |
| `POST` | `/v1/storage/files` | Upload file vào workspace (admin) |
| `DELETE` | `/v1/storage/files/{path...}` | Xóa file/thư mục |
| `PUT` | `/v1/storage/move` | Di chuyển/đổi tên file hoặc thư mục (admin) |
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
| `POST` | `/v1/files/sign` | Tạo signed URL để truy cập file |

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

### Per-Provider ChatGPT/Codex OAuth

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/auth/chatgpt/{provider}/status` | Kiểm tra trạng thái OAuth của provider |
| `GET` | `/v1/auth/chatgpt/{provider}/quota` | Lấy trạng thái quota Codex/OpenAI |
| `POST` | `/v1/auth/chatgpt/{provider}/start` | Bắt đầu OAuth flow cho provider |
| `POST` | `/v1/auth/chatgpt/{provider}/callback` | Xử lý callback thủ công |
| `POST` | `/v1/auth/chatgpt/{provider}/logout` | Thu hồi OAuth token của provider |

### Legacy OpenAI Aliases

Alias tương thích cho provider mặc định `openai-codex`:

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/auth/openai/status` | Kiểm tra trạng thái OpenAI OAuth |
| `GET` | `/v1/auth/openai/quota` | Lấy trạng thái quota |
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
| `PATCH` | `/v1/tenants/{id}` | Cập nhật tenant |
| `GET` | `/v1/tenants/{id}/users` | Liệt kê user trong tenant |
| `POST` | `/v1/tenants/{id}/users` | Thêm user vào tenant |
| `DELETE` | `/v1/tenants/{id}/users/{userId}` | Xóa user khỏi tenant |

---

## Backup & Restore

### System Backup (Admin)

Backup toàn hệ thống để phục hồi sau sự cố. Yêu cầu quyền admin.

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/system/backup` | Kích hoạt backup hệ thống (trả về archive hoặc SSE progress) |
| `GET` | `/v1/system/backup/preflight` | Kiểm tra điều kiện trước khi backup |
| `GET` | `/v1/system/backup/download/{token}` | Tải archive backup theo token ngắn hạn |

### System Backup S3

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/system/backup/s3/config` | Lấy cấu hình S3 backup |
| `PUT` | `/v1/system/backup/s3/config` | Cập nhật cấu hình S3 backup |
| `GET` | `/v1/system/backup/s3/list` | Liệt kê các backup có trên S3 |
| `POST` | `/v1/system/backup/s3/upload` | Upload backup lên S3 |
| `POST` | `/v1/system/backup/s3/backup` | Kích hoạt backup trực tiếp lên S3 |

### Tenant Backup

Backup và khôi phục theo tenant. Yêu cầu quyền admin.

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/tenant/backup` | Kích hoạt backup tenant |
| `GET` | `/v1/tenant/backup/preflight` | Kiểm tra điều kiện trước khi backup tenant |
| `GET` | `/v1/tenant/backup/download/{token}` | Tải archive backup tenant theo token ngắn hạn |
| `POST` | `/v1/tenant/restore` | Khôi phục tenant từ archive backup |

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

## Edition

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/edition` | Lấy thông tin edition hiện tại và giới hạn tính năng |

---

## MCP Bridge

Mở GoClaw tools cho Claude CLI qua streamable HTTP tại `/mcp/bridge`. Chỉ lắng nghe trên localhost. Được bảo vệ bằng gateway token với context header có chữ ký HMAC.

| Header | Mục đích |
|--------|---------|
| `X-Agent-ID` | Context agent để thực thi tool |
| `X-User-ID` | Context user |
| `X-Channel` | Định tuyến channel |
| `X-Chat-ID` | Định tuyến chat |
| `X-Peer-Kind` | `direct` hoặc `group` |
| `X-Bridge-Sig` | Chữ ký HMAC trên tất cả context field |

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
{
  "error": {
    "code": "ERR_AGENT_NOT_FOUND",
    "message": "Agent not found. Verify the agent ID and try again."
  }
}
```

Error response dùng envelope chuẩn với `code` (mã lỗi machine-readable) và `message` (thông báo cho người dùng, hỗ trợ i18n).

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

- **Sessions:** Liệt kê, xem trước, patch, xóa, reset (`sessions.*`)
- **Cron jobs:** Liệt kê, tạo, cập nhật, xóa, toggle, status, run, runs (`cron.*`)
- **Config management:** Lấy, áp dụng, patch, schema (`config.*`)
- **Config permissions:** Liệt kê, cấp quyền, thu hồi (`config.permissions.*`)
- **Gửi message:** Gửi đến channel (`send`)
- **Chat:** Gửi, lịch sử, hủy, inject, trạng thái session (`chat.*`)
- **Heartbeat:** Lấy, đặt, toggle, test, logs, checklist, targets (`heartbeat.*`)
- **Device pairing:** Yêu cầu, duyệt, từ chối, liệt kê, thu hồi (`device.pair.*`)
- **Exec approvals:** Liệt kê, duyệt, từ chối (`exec.approval.*`)
- **TTS:** Trạng thái, bật, tắt, chuyển đổi, đặt provider, danh sách provider (`tts.*`)
- **Browser automation:** Hành động, snapshot, screenshot (`browser.*`)
- **Logs:** Theo dõi server log (`logs.tail`)

> Xem [WebSocket Protocol](/websocket-protocol) để tham khảo đầy đủ method và frame format.

---

## Tiếp theo

- [WebSocket Protocol](/websocket-protocol) — real-time RPC cho chat và agent event
- [Config Reference](/config-reference) — schema đầy đủ `config.json`
- [Database Schema](/database-schema) — định nghĩa bảng và quan hệ

<!-- goclaw-source: c651cde5 | cập nhật: 2026-04-15 -->
