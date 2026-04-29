# Danh mục Endpoint REST API

> Danh sách auto-gen đầy đủ tất cả REST endpoint. Để xem chi tiết request/response, ví dụ và xác thực, xem [REST API Reference](rest-api.md).

**Total endpoints:** 260 — generated from goclaw `364d2d34` on `2026-04-29`.

## Cách sử dụng trang này

- Đây là danh sách phẳng — mỗi hàng là một endpoint.
- Endpoint được nhóm theo domain handler (file nguồn trong `goclaw/internal/http/`).
- Để xem schema request/response đầy đủ của các endpoint tương thích OpenAI (`/v1/chat/completions`, `/v1/responses`), xem [REST API Reference](rest-api.md).
- Xác thực: tất cả endpoint `/v1/*` yêu cầu `Authorization: Bearer <api-key>` trừ khi có ghi chú khác.

## Endpoint theo Domain

### Activity (`internal/http/activity.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/activity` |

### Agents (`internal/http/agents.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents` |
| `POST` | `/v1/agents` |
| `DELETE` | `/v1/agents/{id}` |
| `GET` | `/v1/agents/{id}` |
| `PUT` | `/v1/agents/{id}` |
| `POST` | `/v1/agents/{id}/cancel-summon` |
| `GET` | `/v1/agents/{id}/codex-pool-activity` |
| `GET` | `/v1/agents/{id}/export` |
| `GET` | `/v1/agents/{id}/export/download/{token}` |
| `GET` | `/v1/agents/{id}/export/preview` |
| `POST` | `/v1/agents/{id}/import` |
| `GET` | `/v1/agents/{id}/instances` |
| `GET` | `/v1/agents/{id}/instances/{userID}/files` |
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` |
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` |
| `POST` | `/v1/agents/{id}/regenerate` |
| `POST` | `/v1/agents/{id}/resummon` |
| `GET` | `/v1/agents/{id}/shares` |
| `POST` | `/v1/agents/{id}/shares` |
| `DELETE` | `/v1/agents/{id}/shares/{userID}` |
| `GET` | `/v1/agents/{id}/system-prompt-preview` |
| `POST` | `/v1/agents/import` |
| `POST` | `/v1/agents/import/preview` |
| `POST` | `/v1/agents/sync-workspace` |
| `GET` | `/v1/export/download/{token}` |
| `GET` | `/v1/teams/{id}/export` |
| `GET` | `/v1/teams/{id}/export/preview` |
| `POST` | `/v1/teams/import` |

### API Keys (`internal/http/api_keys.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/api-keys` |
| `POST` | `/v1/api-keys` |
| `POST` | `/v1/api-keys/{id}/revoke` |

### Backup (`internal/http/backup_handler.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/system/backup` |
| `GET` | `/v1/system/backup/download/{token}` |
| `GET` | `/v1/system/backup/preflight` |

### Backup (S3) (`internal/http/backup_s3_handler.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/system/backup/s3/backup` |
| `GET` | `/v1/system/backup/s3/config` |
| `PUT` | `/v1/system/backup/s3/config` |
| `GET` | `/v1/system/backup/s3/list` |
| `POST` | `/v1/system/backup/s3/upload` |

### Builtin Tools (`internal/http/builtin_tools.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/tools/builtin` |
| `GET` | `/v1/tools/builtin/{name}` |
| `PUT` | `/v1/tools/builtin/{name}` |
| `DELETE` | `/v1/tools/builtin/{name}/tenant-config` |
| `GET` | `/v1/tools/builtin/{name}/tenant-config` |
| `PUT` | `/v1/tools/builtin/{name}/tenant-config` |

### Channels (`internal/http/channel_instances.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/channels/instances` |
| `POST` | `/v1/channels/instances` |
| `DELETE` | `/v1/channels/instances/{id}` |
| `GET` | `/v1/channels/instances/{id}` |
| `PUT` | `/v1/channels/instances/{id}` |
| `GET` | `/v1/channels/instances/{id}/writers` |
| `POST` | `/v1/channels/instances/{id}/writers` |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` |
| `GET` | `/v1/channels/instances/{id}/writers/groups` |
| `GET` | `/v1/contacts` |
| `POST` | `/v1/contacts/merge` |
| `GET` | `/v1/contacts/merged/{tenantUserId}` |
| `GET` | `/v1/contacts/resolve` |
| `POST` | `/v1/contacts/unmerge` |
| `GET` | `/v1/tenant-users` |
| `GET` | `/v1/users/search` |

### Edition (`internal/http/edition.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/edition` |

### Episodic Memory (`internal/http/episodic_handlers.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/episodic` |
| `POST` | `/v1/agents/{agentID}/episodic/search` |

### Evolution (`internal/http/evolution_handlers.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/evolution/metrics` |
| `GET` | `/v1/agents/{agentID}/evolution/suggestions` |
| `PATCH` | `/v1/agents/{agentID}/evolution/suggestions/{suggestionID}` |

### Feature Flags (`internal/http/v3_flags_handlers.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/v3-flags` |
| `PATCH` | `/v1/agents/{agentID}/v3-flags` |

### Files (`internal/http/files.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/files/{path...}` |
| `POST` | `/v1/files/sign` |

### Knowledge Graph (`internal/http/knowledge_graph.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/kg/dedup` |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` |
| `GET` | `/v1/agents/{agentID}/kg/entities` |
| `POST` | `/v1/agents/{agentID}/kg/entities` |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` |
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` |
| `POST` | `/v1/agents/{agentID}/kg/extract` |
| `GET` | `/v1/agents/{agentID}/kg/graph` |
| `POST` | `/v1/agents/{agentID}/kg/merge` |
| `GET` | `/v1/agents/{agentID}/kg/stats` |
| `POST` | `/v1/agents/{agentID}/kg/traverse` |

### MCP Servers (`internal/http/mcp.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/mcp/export` |
| `GET` | `/v1/mcp/export/preview` |
| `GET` | `/v1/mcp/grants/agent/{agentID}` |
| `POST` | `/v1/mcp/import` |
| `GET` | `/v1/mcp/requests` |
| `POST` | `/v1/mcp/requests` |
| `POST` | `/v1/mcp/requests/{id}/review` |
| `GET` | `/v1/mcp/servers` |
| `POST` | `/v1/mcp/servers` |
| `DELETE` | `/v1/mcp/servers/{id}` |
| `GET` | `/v1/mcp/servers/{id}` |
| `PUT` | `/v1/mcp/servers/{id}` |
| `GET` | `/v1/mcp/servers/{id}/grants` |
| `POST` | `/v1/mcp/servers/{id}/grants/agent` |
| `DELETE` | `/v1/mcp/servers/{id}/grants/agent/{agentID}` |
| `POST` | `/v1/mcp/servers/{id}/grants/user` |
| `DELETE` | `/v1/mcp/servers/{id}/grants/user/{userID}` |
| `POST` | `/v1/mcp/servers/{id}/reconnect` |
| `GET` | `/v1/mcp/servers/{id}/tools` |
| `POST` | `/v1/mcp/servers/test` |

### MCP User Credentials (`internal/http/mcp_user_credentials.go`)

| Method | Path |
|---|---|
| `DELETE` | `/v1/mcp/servers/{id}/user-credentials` |
| `GET` | `/v1/mcp/servers/{id}/user-credentials` |
| `PUT` | `/v1/mcp/servers/{id}/user-credentials` |

### Media (`internal/http/media_serve.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/media/{id}` |
| `POST` | `/v1/media/upload` |

### Memory (`internal/http/memory.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/memory/chunks` |
| `GET` | `/v1/agents/{agentID}/memory/documents` |
| `DELETE` | `/v1/agents/{agentID}/memory/documents/{path...}` |
| `GET` | `/v1/agents/{agentID}/memory/documents/{path...}` |
| `PUT` | `/v1/agents/{agentID}/memory/documents/{path...}` |
| `POST` | `/v1/agents/{agentID}/memory/index` |
| `POST` | `/v1/agents/{agentID}/memory/index-all` |
| `POST` | `/v1/agents/{agentID}/memory/search` |
| `GET` | `/v1/memory/documents` |

### OAuth (`internal/http/oauth.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/auth/chatgpt/{provider}/callback` |
| `POST` | `/v1/auth/chatgpt/{provider}/logout` |
| `GET` | `/v1/auth/chatgpt/{provider}/quota` |
| `POST` | `/v1/auth/chatgpt/{provider}/start` |
| `GET` | `/v1/auth/chatgpt/{provider}/status` |
| `POST` | `/v1/auth/openai/callback` |
| `POST` | `/v1/auth/openai/logout` |
| `GET` | `/v1/auth/openai/quota` |
| `POST` | `/v1/auth/openai/start` |
| `GET` | `/v1/auth/openai/status` |

### OpenAPI (`internal/http/openapi.go`)

| Method | Path |
|---|---|
| `GET` | `/docs` |
| `GET` | `/docs/` |
| `GET` | `/v1/openapi.json` |

### Orchestration (`internal/http/orchestration_handlers.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/orchestration` |

### Packages (`internal/http/packages.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/packages` |
| `GET` | `/v1/packages/github-releases` |
| `POST` | `/v1/packages/install` |
| `GET` | `/v1/packages/runtimes` |
| `POST` | `/v1/packages/uninstall` |
| `GET` | `/v1/shell-deny-groups` |

### Pending Messages (`internal/http/pending_messages.go`)

| Method | Path |
|---|---|
| `DELETE` | `/v1/pending-messages` |
| `GET` | `/v1/pending-messages` |
| `POST` | `/v1/pending-messages/compact` |
| `GET` | `/v1/pending-messages/messages` |

### Providers (`internal/http/providers.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/embedding/status` |
| `GET` | `/v1/providers` |
| `POST` | `/v1/providers` |
| `DELETE` | `/v1/providers/{id}` |
| `GET` | `/v1/providers/{id}` |
| `PUT` | `/v1/providers/{id}` |
| `GET` | `/v1/providers/{id}/codex-pool-activity` |
| `GET` | `/v1/providers/{id}/models` |
| `POST` | `/v1/providers/{id}/verify` |
| `POST` | `/v1/providers/{id}/verify-embedding` |
| `GET` | `/v1/providers/claude-cli/auth-status` |

### Restore (`internal/http/restore_handler.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/system/restore` |

### Secure CLI (`internal/http/secure_cli.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/cli-credentials` |
| `POST` | `/v1/cli-credentials` |
| `DELETE` | `/v1/cli-credentials/{id}` |
| `GET` | `/v1/cli-credentials/{id}` |
| `PUT` | `/v1/cli-credentials/{id}` |
| `GET` | `/v1/cli-credentials/{id}/agent-grants` |
| `POST` | `/v1/cli-credentials/{id}/agent-grants` |
| `DELETE` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` |
| `GET` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` |
| `PUT` | `/v1/cli-credentials/{id}/agent-grants/{grantId}` |
| `POST` | `/v1/cli-credentials/{id}/test` |
| `GET` | `/v1/cli-credentials/{id}/user-credentials` |
| `DELETE` | `/v1/cli-credentials/{id}/user-credentials/{userId}` |
| `GET` | `/v1/cli-credentials/{id}/user-credentials/{userId}` |
| `PUT` | `/v1/cli-credentials/{id}/user-credentials/{userId}` |
| `POST` | `/v1/cli-credentials/check-binary` |
| `GET` | `/v1/cli-credentials/presets` |

### Skills (`internal/http/skills.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/skills` |
| `GET` | `/v1/skills` |
| `DELETE` | `/v1/skills/{id}` |
| `GET` | `/v1/skills/{id}` |
| `PUT` | `/v1/skills/{id}` |
| `GET` | `/v1/skills/{id}/files` |
| `GET` | `/v1/skills/{id}/files/{path...}` |
| `POST` | `/v1/skills/{id}/grants/agent` |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` |
| `POST` | `/v1/skills/{id}/grants/user` |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` |
| `DELETE` | `/v1/skills/{id}/tenant-config` |
| `PUT` | `/v1/skills/{id}/tenant-config` |
| `POST` | `/v1/skills/{id}/toggle` |
| `GET` | `/v1/skills/{id}/versions` |
| `GET` | `/v1/skills/export` |
| `GET` | `/v1/skills/export/preview` |
| `POST` | `/v1/skills/import` |
| `POST` | `/v1/skills/install-dep` |
| `POST` | `/v1/skills/install-deps` |
| `POST` | `/v1/skills/rescan-deps` |
| `GET` | `/v1/skills/runtimes` |
| `POST` | `/v1/skills/upload` |

### Storage (`internal/http/storage.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/storage/files` |
| `POST` | `/v1/storage/files` |
| `DELETE` | `/v1/storage/files/{path...}` |
| `GET` | `/v1/storage/files/{path...}` |
| `PUT` | `/v1/storage/move` |
| `GET` | `/v1/storage/size` |

### System Config (`internal/http/system_configs.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/system-configs` |
| `DELETE` | `/v1/system-configs/{key}` |
| `GET` | `/v1/system-configs/{key}` |
| `PUT` | `/v1/system-configs/{key}` |

### Teams (`internal/http/team_attachments.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/teams/{id}/events` |
| `GET` | `/v1/teams/{teamId}/attachments/{attachmentId}/download` |

### Tenant Backup (`internal/http/tenant_backup_handler.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/tenant/backup` |
| `GET` | `/v1/tenant/backup/download/{token}` |
| `GET` | `/v1/tenant/backup/preflight` |
| `POST` | `/v1/tenant/restore` |

### Tenants (`internal/http/tenants.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/tenants` |
| `POST` | `/v1/tenants` |
| `GET` | `/v1/tenants/{id}` |
| `PATCH` | `/v1/tenants/{id}` |
| `GET` | `/v1/tenants/{id}/users` |
| `POST` | `/v1/tenants/{id}/users` |
| `DELETE` | `/v1/tenants/{id}/users/{userId}` |

### Traces (`internal/http/traces.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/costs/summary` |
| `GET` | `/v1/traces` |
| `GET` | `/v1/traces/{traceID}` |
| `GET` | `/v1/traces/{traceID}/export` |

### TTS (`internal/http/tts.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/tts/capabilities` |
| `GET` | `/v1/tts/config` |
| `POST` | `/v1/tts/config` |
| `POST` | `/v1/tts/synthesize` |
| `POST` | `/v1/tts/test-connection` |
| `GET` | `/v1/voices` |
| `POST` | `/v1/voices/refresh` |

### Usage (`internal/http/usage.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/usage/breakdown` |
| `GET` | `/v1/usage/summary` |
| `GET` | `/v1/usage/timeseries` |

### Vault (`internal/http/vault_graph_handler.go`)

| Method | Path |
|---|---|
| `GET` | `/v1/agents/{agentID}/kg/graph/compact` |
| `GET` | `/v1/agents/{agentID}/vault/documents` |
| `POST` | `/v1/agents/{agentID}/vault/documents` |
| `DELETE` | `/v1/agents/{agentID}/vault/documents/{docID}` |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}` |
| `PUT` | `/v1/agents/{agentID}/vault/documents/{docID}` |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}/links` |
| `POST` | `/v1/agents/{agentID}/vault/links` |
| `DELETE` | `/v1/agents/{agentID}/vault/links/{linkID}` |
| `POST` | `/v1/agents/{agentID}/vault/search` |
| `GET` | `/v1/vault/documents` |
| `POST` | `/v1/vault/documents` |
| `DELETE` | `/v1/vault/documents/{docID}` |
| `GET` | `/v1/vault/documents/{docID}` |
| `PUT` | `/v1/vault/documents/{docID}` |
| `GET` | `/v1/vault/documents/{docID}/links` |
| `GET` | `/v1/vault/enrichment/status` |
| `POST` | `/v1/vault/enrichment/stop` |
| `GET` | `/v1/vault/graph` |
| `POST` | `/v1/vault/links` |
| `DELETE` | `/v1/vault/links/{linkID}` |
| `POST` | `/v1/vault/links/batch` |
| `POST` | `/v1/vault/rescan` |
| `POST` | `/v1/vault/search` |
| `GET` | `/v1/vault/tree` |
| `POST` | `/v1/vault/upload` |

### Wake (`internal/http/wake.go`)

| Method | Path |
|---|---|
| `POST` | `/v1/agents/{id}/wake` |

### Workspace (`internal/http/workspace_upload.go`)

| Method | Path |
|---|---|
| `PUT` | `/v1/teams/{teamId}/workspace/move` |
| `POST` | `/v1/teams/{teamId}/workspace/upload` |

---

<!-- goclaw-source: 364d2d34 -->
<!-- last-updated: 2026-04-29 -->
<!-- total-endpoints: 260 -->
