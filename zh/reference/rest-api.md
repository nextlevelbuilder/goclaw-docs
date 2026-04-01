> 翻译自 [English version](/rest-api)

# REST API

> agent 管理、provider、skill、traces 等所有 `/v1` HTTP 端点。

## 概览

GoClaw 的 HTTP API 与 WebSocket gateway 共用同一端口。所有端点需要在 `Authorization` 头中提供与 `GOCLAW_GATEWAY_TOKEN` 匹配的 `Bearer` token。

交互式文档：`/docs`（Swagger UI）· 原始规范：`/v1/openapi.json`

**Base URL：** `http://<host>:<port>`

**认证头：**
```
Authorization: Bearer YOUR_GATEWAY_TOKEN
```

**用户身份头**（可选，用于按用户范围隔离）：
```
X-GoClaw-User-Id: user123
```

### 通用请求头

| 请求头 | 用途 |
|--------|---------|
| `Authorization` | Bearer token |
| `X-GoClaw-User-Id` | 多租户上下文的外部用户 ID |
| `X-GoClaw-Agent-Id` | 范围操作的 agent 标识符 |
| `X-GoClaw-Tenant-Id` | 租户范围——UUID 或 slug |
| `Accept-Language` | 国际化错误消息的语言（`en`、`vi`、`zh`）|

**输入验证：** 所有字符串输入均经过净化——ILIKE 查询中 SQL 特殊字符会被转义，请求体限制为 1 MB，agent/provider/tool 名称通过白名单模式（`[a-zA-Z0-9_-]`）验证。

---

## 聊天补全

OpenAI 兼容的聊天 API，用于以编程方式访问 agent。

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

**响应**（非流式）：

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

设置 `"stream": true` 可获取以 `data: [DONE]` 结尾的 SSE 数据块。

---

## OpenResponses 协议

### `POST /v1/responses`

基于响应的替代协议（与 OpenAI Responses API 兼容）。接受相同的认证方式，返回结构化响应对象。

---

## Agent

agent 管理的 CRUD 操作。多租户上下文需要 `X-GoClaw-User-Id` 头。

### `GET /v1/agents`

列出所有 agent。

```bash
curl http://localhost:18790/v1/agents \
  -H "Authorization: Bearer TOKEN"
```

### `POST /v1/agents`

创建新 agent。

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

按 ID 获取单个 agent。

### `PUT /v1/agents/{id}`

更新 agent。只需发送要修改的字段。

### `DELETE /v1/agents/{id}`

删除 agent。

### `POST /v1/agents/{id}/regenerate`

从模板重新生成 agent context 文件。

### `POST /v1/agents/{id}/resummon`

为 predefined agent 重新触发基于 LLM 的 summoning。

### Agent 共享

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/shares` | 列出 agent 的共享记录 |
| `POST` | `/v1/agents/{id}/shares` | 与用户共享 agent |
| `DELETE` | `/v1/agents/{id}/shares/{userID}` | 撤销共享 |

### Predefined Agent 实例

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/instances` | 列出用户实例 |
| `GET` | `/v1/agents/{id}/instances/{userID}/files` | 列出用户 context 文件 |
| `GET` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | 获取特定 context 文件 |
| `PUT` | `/v1/agents/{id}/instances/{userID}/files/{fileName}` | 更新用户文件（仅 USER.md）|
| `PATCH` | `/v1/agents/{id}/instances/{userID}/metadata` | 更新实例元数据 |

### Agent 导出 / 导入

以 tar.gz 归档格式导出和导入 agent 配置及数据，支持按 section 选择性导出。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/agents/{id}/export/preview` | 预览各 section 数量（不生成归档）|
| `GET` | `/v1/agents/{id}/export` | 直接下载 agent 归档（tar.gz）|
| `GET` | `/v1/agents/{id}/export/download/{token}` | 通过短效 token 下载已准备好的归档（5 分钟有效）|
| `POST` | `/v1/agents/import` | 将归档导入为**新 agent**（multipart 字段 `file`）|
| `POST` | `/v1/agents/import/preview` | 解析归档并返回 manifest，不执行导入 |
| `POST` | `/v1/agents/{id}/import` | 将归档数据**合并**到已有 agent |

**导出查询参数：**

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `sections` | string | 逗号分隔的 section 列表，默认 `config,context_files`。可选：`config`、`context_files`、`memory`、`knowledge_graph`、`cron`、`user_profiles`、`user_overrides`、`workspace` |
| `stream` | `bool` | 为 `true` 时以 SSE 流式推送进度，最后发送含 `download_url` 的 `complete` 事件 |

**导入响应**（`201 Created`）：

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

> Cron 作业始终以**禁用**状态导入。同名作业将被跳过。归档大小上限：500 MB。

---

### `GET /v1/agents/{id}/codex-pool-activity`

返回使用 [Codex OAuth pool](/provider-codex) 的 agent 的路由活动和每账户健康状态。要求 agent 的 provider 为 `chatgpt_oauth` 类型并已配置 pool。

**认证：** 需要 Bearer token。请求用户必须有权访问该 agent。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `limit` | integer | `18` | 返回的最近请求数（最大 50）|

**响应：**

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

如果 agent 未使用 `chatgpt_oauth` provider 或未配置 pool，则 `pool_providers` 为空数组，`provider_counts`/`recent_requests` 也为空。

追踪存储不可用时返回 `503`。

---

### 唤醒（外部触发）

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

响应：`{content, run_id, usage?}`。由编排工具（n8n、Paperclip）用于从外部触发 agent 运行。

---

## Provider

### `GET /v1/providers`

列出所有 LLM provider。

### `POST /v1/providers`

创建 LLM provider。

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

**支持的类型：** `anthropic_native`、`openai_compat`、`chatgpt_oauth`、`gemini_native`、`dashscope`、`bailian`、`minimax`、`claude_cli`、`acp`

### `GET /v1/providers/{id}`

按 ID 获取 provider。

### `PUT /v1/providers/{id}`

更新 provider。

### `DELETE /v1/providers/{id}`

删除 provider。

### `GET /v1/providers/{id}/models`

列出该 provider 可用的模型（代理到上游 API）。

### `POST /v1/providers/{id}/verify`

预检——验证 API key 和模型是否可达。

### `POST /v1/providers/{id}/verify-embedding`

验证 provider 的 embedding 模型连通性。

### `GET /v1/providers/{id}/codex-pool-activity`

返回 provider 级别的 Codex OAuth pool 路由活动（另见上方 agent 级别端点）。

### `GET /v1/embedding/status`

检查 embedding 是否已配置并在各 provider 中可用。

### `GET /v1/providers/claude-cli/auth-status`

检查 Claude CLI 认证状态（全局，非按 provider）。

---

## Skill

### `GET /v1/skills`

列出所有 skill。

### `POST /v1/skills/upload`

以 `.zip` 文件上传 skill（最大 20 MB）。

```bash
curl -X POST http://localhost:18790/v1/skills/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@my-skill.zip"
```

### `GET /v1/skills/{id}`

获取 skill 元数据。

### `PUT /v1/skills/{id}`

更新 skill 元数据。

### `DELETE /v1/skills/{id}`

删除 skill。

### `POST /v1/skills/{id}/toggle`

切换 skill 启用/禁用状态。

### `PUT /v1/skills/{id}/tenant-config`

为 skill 设置租户级覆盖（如为当前租户启用/禁用）。仅管理员。

### `DELETE /v1/skills/{id}/tenant-config`

移除租户级覆盖（恢复默认值）。仅管理员。

### Skills 导出 / 导入

以 tar.gz 归档格式导出和导入自定义 skill。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/skills/export/preview` | 预览导出数量 |
| `GET` | `/v1/skills/export` | 直接下载 skills 归档（tar.gz）|
| `POST` | `/v1/skills/import` | 导入 skills 归档（multipart 字段 `file`）|

**导出查询参数：**

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `stream` | `bool` | 为 `true` 时以 SSE 流式推送进度，最后发送含 `download_url` 的 `complete` 事件 |

**归档格式**（`skills-YYYYMMDD.tar.gz`）：

```
skills/{slug}/metadata.json   — skill 元数据（name、slug、visibility、tags）
skills/{slug}/SKILL.md        — skill 文件内容
skills/{slug}/grants.jsonl    — agent grant（agent_key + pinned version）
```

**导入响应**（`201 Created`）：

```json
{
  "skills_imported": 3,
  "skills_skipped": 1,
  "grants_applied": 5
}
```

> 若 slug 在该租户中已存在则跳过（不覆盖）。Grant 通过 `agent_key` 引用 agent，未匹配的 key 将被静默跳过。

---

### Skill 授权

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `POST` | `/v1/skills/{id}/grants/agent` | 向 agent 授权 skill |
| `DELETE` | `/v1/skills/{id}/grants/agent/{agentID}` | 撤销 agent 授权 |
| `POST` | `/v1/skills/{id}/grants/user` | 向用户授权 skill |
| `DELETE` | `/v1/skills/{id}/grants/user/{userID}` | 撤销用户授权 |
| `GET` | `/v1/agents/{agentID}/skills` | 列出 agent 可访问的 skill |

### Skill 文件与依赖

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/skills/{id}/versions` | 列出可用版本 |
| `GET` | `/v1/skills/{id}/files` | 列出 skill 中的文件 |
| `GET` | `/v1/skills/{id}/files/{path...}` | 读取文件内容 |
| `POST` | `/v1/skills/rescan-deps` | 重新扫描运行时依赖 |
| `POST` | `/v1/skills/install-deps` | 安装所有缺失依赖 |
| `POST` | `/v1/skills/install-dep` | 安装单个依赖 |
| `GET` | `/v1/skills/runtimes` | 检查运行时可用性 |

---

## 工具

### 直接调用

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

设置 `"dryRun": true` 可返回工具 schema 而不执行。

### 内置工具

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/tools/builtin` | 列出所有内置工具 |
| `GET` | `/v1/tools/builtin/{name}` | 获取工具定义 |
| `PUT` | `/v1/tools/builtin/{name}` | 更新启用状态/设置 |
| `PUT` | `/v1/tools/builtin/{name}/tenant-config` | 设置租户级覆盖（管理员）|
| `DELETE` | `/v1/tools/builtin/{name}/tenant-config` | 移除租户级覆盖（管理员）|

### 自定义工具

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/tools/custom` | 列出自定义工具（分页）|
| `POST` | `/v1/tools/custom` | 创建自定义工具 |
| `GET` | `/v1/tools/custom/{id}` | 获取工具详情 |
| `PUT` | `/v1/tools/custom/{id}` | 更新工具 |
| `DELETE` | `/v1/tools/custom/{id}` | 删除工具 |

列表查询参数：`agent_id`、`search`、`limit`、`offset`

---

## 记忆

基于 pgvector 的按 agent 向量记忆。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/memory/documents` | 全局列出所有文档 |
| `GET` | `/v1/agents/{agentID}/memory/documents` | 列出 agent 的文档 |
| `GET` | `/v1/agents/{agentID}/memory/documents/{path...}` | 获取文档详情 |
| `PUT` | `/v1/agents/{agentID}/memory/documents/{path...}` | 写入/更新文档 |
| `DELETE` | `/v1/agents/{agentID}/memory/documents/{path...}` | 删除文档 |
| `GET` | `/v1/agents/{agentID}/memory/chunks` | 列出文档的 chunk |
| `POST` | `/v1/agents/{agentID}/memory/index` | 索引单个文档 |
| `POST` | `/v1/agents/{agentID}/memory/index-all` | 索引所有文档 |
| `POST` | `/v1/agents/{agentID}/memory/search` | 语义搜索 |

可选查询参数 `?user_id=` 用于按用户范围隔离。

---

## 知识图谱

按 agent 的实体-关系图谱。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/kg/entities` | 列出/搜索实体（BM25）|
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` | 获取实体及其关系 |
| `POST` | `/v1/agents/{agentID}/kg/entities` | 更新插入实体 |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` | 删除实体 |
| `POST` | `/v1/agents/{agentID}/kg/traverse` | 遍历图谱（最大深度 3）|
| `POST` | `/v1/agents/{agentID}/kg/extract` | LLM 驱动的实体提取 |
| `GET` | `/v1/agents/{agentID}/kg/stats` | 知识图谱统计 |
| `GET` | `/v1/agents/{agentID}/kg/graph` | 可视化用完整图谱 |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` | 扫描重复实体 |
| `GET` | `/v1/agents/{agentID}/kg/dedup` | 列出去重候选项 |
| `POST` | `/v1/agents/{agentID}/kg/merge` | 合并重复实体 |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` | 忽略去重候选项 |

---

## Trace

### `GET /v1/traces`

列出 LLM traces。支持查询参数：`agentId`、`userId`、`status`、`limit`、`offset`。

```bash
curl "http://localhost:18790/v1/traces?agentId=UUID&limit=50" \
  -H "Authorization: Bearer TOKEN"
```

### `GET /v1/traces/{traceID}`

获取单条 trace 及其所有 span。

### `GET /v1/traces/{traceID}/export`

将 trace 树导出为 gzip 压缩的 JSON。

### 成本

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/costs/summary` | 按 agent/时间范围统计成本 |

---

## 用量与分析

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/usage/timeseries` | 时序用量数据点 |
| `GET` | `/v1/usage/breakdown` | 按 provider/model/channel 分类 |
| `GET` | `/v1/usage/summary` | 含环比对比的摘要 |

**查询参数：** `from`、`to`（RFC 3339）、`agent_id`、`provider`、`model`、`channel`、`group_by`

---

## MCP Server

### `GET /v1/mcp/servers`

列出所有 MCP server 配置。

### `POST /v1/mcp/servers`

注册 MCP server。

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

传输选项：`"stdio"`、`"sse"`、`"streamable-http"`。

### `GET /v1/mcp/servers/{id}`

获取 MCP server。

### `PUT /v1/mcp/servers/{id}`

更新 MCP server。可更新字段：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `name` | string | Server 显示名称 |
| `transport` | string | `"stdio"`、`"sse"`、`"streamable-http"` |
| `command` | string | 运行命令（stdio）|
| `args` | string[] | 命令参数 |
| `url` | string | Server URL（sse/streamable-http）|
| `api_key` | string | Server 的 API key |
| `env` | object | 环境变量 |
| `headers` | object | HTTP 请求头 |
| `enabled` | boolean | 启用/禁用 |
| `tool_prefix` | string | 工具名称前缀 |
| `timeout_sec` | integer | 请求超时（秒）|
| `agent_id` | string | 绑定到特定 agent |
| `config` | object | 额外配置 |
| `settings` | object | Server 设置 |

### `DELETE /v1/mcp/servers/{id}`

删除 MCP server。

### `POST /v1/mcp/servers/test`

保存前测试 MCP server 连通性。

### `POST /v1/mcp/servers/{id}/reconnect`

强制重新连接运行中的 MCP server。

### `GET /v1/mcp/servers/{id}/tools`

列出运行中的 MCP server 发现的工具。

### MCP 授权

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/mcp/servers/{id}/grants` | 列出 server 的授权记录 |
| `POST` | `/v1/mcp/servers/{id}/grants/agent` | 向 agent 授权 server |
| `DELETE` | `/v1/mcp/servers/{id}/grants/agent/{agentID}` | 撤销 agent 授权 |
| `GET` | `/v1/mcp/grants/agent/{agentID}` | 列出 agent 的所有授权 |
| `POST` | `/v1/mcp/servers/{id}/grants/user` | 向用户授权 server |
| `DELETE` | `/v1/mcp/servers/{id}/grants/user/{userID}` | 撤销用户授权 |

### MCP 访问请求

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `POST` | `/v1/mcp/requests` | 提交访问请求 |
| `GET` | `/v1/mcp/requests` | 列出待处理请求 |
| `POST` | `/v1/mcp/requests/{id}/review` | 批准或拒绝请求 |

### MCP 导出 / 导入

以 tar.gz 归档格式导出和导入 MCP server 配置及 agent grant。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/mcp/export/preview` | 预览导出数量（不生成归档）|
| `GET` | `/v1/mcp/export` | 直接下载 MCP 归档（tar.gz）|
| `POST` | `/v1/mcp/import` | 导入 MCP 归档（multipart 字段 `file`）|

### MCP 用户凭证

为需要独立认证的 MCP server 提供按用户凭证存储。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `PUT` | `/v1/mcp/servers/{id}/user-credentials` | 为 server 设置用户凭证 |
| `GET` | `/v1/mcp/servers/{id}/user-credentials` | 获取用户凭证 |
| `DELETE` | `/v1/mcp/servers/{id}/user-credentials` | 删除用户凭证 |

**导出查询参数：**

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `stream` | `bool` | 为 `true` 时以 SSE 流式推送进度，最后发送含 `download_url` 的 `complete` 事件 |

**归档格式**（`mcp-servers-YYYYMMDD.tar.gz`）：

```
servers.jsonl   — MCP server 定义
grants.jsonl    — agent grant（server_name + agent_key）
```

**导入响应**（`201 Created`）：

```json
{
  "servers_imported": 2,
  "servers_skipped": 0,
  "grants_applied": 4
}
```

---

## Channel 实例

### `GET /v1/channels/instances`

列出数据库中的所有 channel 实例。

### `POST /v1/channels/instances`

创建 channel 实例。

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

**支持的 channel：** `telegram`、`discord`、`slack`、`whatsapp`、`zalo_oa`、`zalo_personal`、`feishu`

### `GET /v1/channels/instances/{id}`

获取 channel 实例。

### `PUT /v1/channels/instances/{id}`

更新 channel 实例。可更新字段：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `channel_type` | string | Channel 类型 |
| `credentials` | object | Channel 凭证 |
| `agent_id` | string | 绑定的 agent UUID |
| `enabled` | boolean | 启用/禁用 |
| `display_name` | string | 人类可读名称 |
| `group_policy` | string | 群组消息策略 |
| `allow_from` | string[] | 允许的发送者 ID |
| `metadata` | object | 自定义元数据 |
| `webhook_secret` | string | Webhook 验证密钥 |
| `config` | object | 额外配置 |

### `DELETE /v1/channels/instances/{id}`

删除 channel 实例。

### 群组写入者

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/channels/instances/{id}/writers/groups` | 列出有写入权限的群组 |
| `GET` | `/v1/channels/instances/{id}/writers` | 列出已授权的写入者 |
| `POST` | `/v1/channels/instances/{id}/writers` | 添加写入者 |
| `DELETE` | `/v1/channels/instances/{id}/writers/{userId}` | 移除写入者 |

---

## 联系人

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/contacts` | 列出联系人（分页）|
| `GET` | `/v1/contacts/resolve?ids=...` | 按 ID 解析联系人（最多 100 个）|
| `POST` | `/v1/contacts/merge` | 合并重复联系人记录 |
| `POST` | `/v1/contacts/unmerge` | 取消已合并的联系人 |
| `GET` | `/v1/contacts/merged/{tenantUserId}` | 列出租户用户的已合并联系人 |

### 租户用户

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/tenant-users` | 列出租户用户 |
| `GET` | `/v1/users/search` | 跨 channel 搜索用户 |

---

## 团队事件

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/events` | 列出团队事件（分页）|

### 团队工作区

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `POST` | `/v1/teams/{teamId}/workspace/upload` | 上传文件到团队工作区 |
| `PUT` | `/v1/teams/{teamId}/workspace/move` | 移动/重命名团队工作区中的文件 |

### 团队附件

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/teams/{teamId}/attachments/{attachmentId}/download` | 下载任务附件 |

---

## 团队导出 / 导入

以 tar.gz 归档格式导出和导入完整团队（团队元数据 + 所有成员 agent）。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/export/preview` | 预览导出数量（members、tasks、agent_links），不生成归档 |
| `GET` | `/v1/teams/{id}/export` | 直接下载团队归档（tar.gz）|
| `POST` | `/v1/teams/import` | 导入团队归档，创建新 agent 并建立团队结构（multipart 字段 `file`）|

**导出查询参数：**

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `stream` | `bool` | 为 `true` 时以 SSE 流式推送进度，最后发送含 `download_url` 的 `complete` 事件 |

**归档格式**（`team-{name}-YYYYMMDD.tar.gz`）：

```
manifest.json                          — 归档 manifest（team_name、agent_keys、sections）
team/team.json                         — 团队元数据
team/members.jsonl                     — 团队成员记录
team/tasks.jsonl                       — 团队任务记录
team/comments.jsonl                    — 任务评论
team/events.jsonl                      — 任务事件
team/links.jsonl                       — agent 链接记录
team/workspace/                        — 团队工作区文件
agents/{agent_key}/agent.json          — 每个 agent 的配置
agents/{agent_key}/context_files/      — 每个 agent 的 context 文件
agents/{agent_key}/memory/             — 每个 agent 的记忆文档
agents/{agent_key}/knowledge_graph/    — 每个 agent 的 KG 实体 + 关系
agents/{agent_key}/cron/               — 每个 agent 的 cron 作业
agents/{agent_key}/workspace/          — 每个 agent 的工作区文件
```

**导入响应**（`201 Created`）：

```json
{
  "team_name": "research-team",
  "agents_added": 3,
  "agent_keys": ["researcher", "writer", "reviewer"]
}
```

> 导入需要**管理员权限**。重复的 agent key 会自动重命名（添加后缀 `-2`、`-3`……）。Cron 作业始终以禁用状态导入。

通用下载端点（所有导出类型共用）：

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/export/download/{token}` | 通过短效 token 下载归档（5 分钟有效，所有导出类型共用）|

---

## 委派

### `GET /v1/delegations`

列出委派历史（agent 间任务交接）。

**过滤参数：** `source_agent_id`、`target_agent_id`、`team_id`、`user_id`、`status`、`limit`、`offset`

### `GET /v1/delegations/{id}`

获取单条委派记录。

---

## 待处理消息

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/pending-messages` | 列出所有带标题的消息组 |
| `GET` | `/v1/pending-messages/messages` | 按 channel+key 列出消息 |
| `DELETE` | `/v1/pending-messages` | 删除消息组 |
| `POST` | `/v1/pending-messages/compact` | 基于 LLM 的摘要（异步，202）|

---

## 安全 CLI 凭证

需要**管理员角色**（完整 gateway token，或开发/单用户模式下的空 gateway token）。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/cli-credentials` | 列出所有凭证 |
| `POST` | `/v1/cli-credentials` | 创建新凭证 |
| `GET` | `/v1/cli-credentials/{id}` | 获取凭证详情 |
| `PUT` | `/v1/cli-credentials/{id}` | 更新凭证 |
| `DELETE` | `/v1/cli-credentials/{id}` | 删除凭证 |
| `GET` | `/v1/cli-credentials/presets` | 获取预设凭证模板 |
| `POST` | `/v1/cli-credentials/{id}/test` | 测试凭证连接（演习）|

### 按用户 CLI 凭证

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/cli-credentials/{id}/user-credentials` | 列出某 CLI 配置的用户凭证 |
| `GET` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | 获取用户专属凭证 |
| `PUT` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | 设置用户专属凭证 |
| `DELETE` | `/v1/cli-credentials/{id}/user-credentials/{userId}` | 删除用户专属凭证 |

---

## 运行时与包

管理系统（apk）、Python（pip）和 Node（npm）包。需要认证。

### `GET /v1/packages`

列出按类别（system、pip、npm）分组的所有已安装包。

### `POST /v1/packages/install`

```json
{ "package": "github-cli" }
```

使用前缀 `"pip:pandas"` 或 `"npm:typescript"` 指定包管理器。不带前缀时默认使用系统（apk）。

### `POST /v1/packages/uninstall`

格式与安装相同。

### `GET /v1/packages/runtimes`

检查 Python 和 Node 运行时是否可用。

```json
{ "python": true, "node": true }
```

### `GET /v1/shell-deny-groups`

列出 shell 命令拒绝组（安全策略）。

---

## 存储

工作区文件管理。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/storage/files` | 列出文件（支持深度限制）|
| `GET` | `/v1/storage/files/{path...}` | 读取文件（JSON 或原始格式）|
| `POST` | `/v1/storage/files` | 上传文件到工作区（管理员）|
| `DELETE` | `/v1/storage/files/{path...}` | 删除文件/目录 |
| `PUT` | `/v1/storage/move` | 移动/重命名文件或目录（管理员）|
| `GET` | `/v1/storage/size` | 流式传输存储大小（SSE，缓存 60 分钟）|

`?raw=true`——以原生 MIME 类型提供。`?depth=N`——限制遍历深度。

---

## 媒体

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `POST` | `/v1/media/upload` | 上传文件（multipart，50 MB 限制）|
| `GET` | `/v1/media/{id}` | 按 ID 提供媒体（带缓存）|

通过 Bearer token 或 `?token=` 查询参数认证（用于 `<img>` 和 `<audio>` 标签）。

---

## 文件

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/files/{path...}` | 按路径提供工作区文件 |
| `POST` | `/v1/files/sign` | 生成文件访问的签名 URL |

**查询参数：**

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `download` | `bool` | 为 `true` 时强制 `Content-Disposition: attachment`（浏览器下载而非内联显示）|

---

## API Key

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/api-keys` | 列出所有 API key（已脱敏）|
| `POST` | `/v1/api-keys` | 创建 API key（只返回一次原始 key）|
| `POST` | `/v1/api-keys/{id}/revoke` | 撤销 API key |

### 创建请求

```json
{
  "name": "ci-deploy",
  "scopes": ["operator.read", "operator.write"],
  "expires_in": 2592000
}
```

`key` 字段只在创建响应中返回。后续调用仅显示 `prefix`。

---

## OAuth

### 按 Provider 的 ChatGPT/Codex OAuth

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/auth/chatgpt/{provider}/status` | 检查某 provider 的 OAuth 状态 |
| `GET` | `/v1/auth/chatgpt/{provider}/quota` | 获取 Codex/OpenAI 配额状态 |
| `POST` | `/v1/auth/chatgpt/{provider}/start` | 为某 provider 发起 OAuth 流程 |
| `POST` | `/v1/auth/chatgpt/{provider}/callback` | 手动处理回调 |
| `POST` | `/v1/auth/chatgpt/{provider}/logout` | 撤销某 provider 的 OAuth token |

### 旧版 OpenAI 别名

默认 `openai-codex` provider 的兼容别名：

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/auth/openai/status` | 检查 OpenAI OAuth 状态 |
| `GET` | `/v1/auth/openai/quota` | 获取配额状态 |
| `POST` | `/v1/auth/openai/start` | 发起 OAuth 流程 |
| `POST` | `/v1/auth/openai/callback` | 手动处理 OAuth 回调 |
| `POST` | `/v1/auth/openai/logout` | 移除已存储的 OAuth token |

---

## 租户

多租户管理（仅限 gateway token 范围）。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/tenants` | 列出租户 |
| `POST` | `/v1/tenants` | 创建租户 |
| `GET` | `/v1/tenants/{id}` | 获取租户 |
| `PATCH` | `/v1/tenants/{id}` | 更新租户 |
| `GET` | `/v1/tenants/{id}/users` | 列出租户用户 |
| `POST` | `/v1/tenants/{id}/users` | 将用户添加到租户 |
| `DELETE` | `/v1/tenants/{id}/users/{userId}` | 从租户移除用户 |

---

## 活动与审计

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/activity` | 列出活动审计日志（可过滤）|

---

## 系统配置

按租户的键值配置存储。所有已认证用户可读；写入需要管理员角色。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/system-configs` | 列出当前租户的所有配置项 |
| `GET` | `/v1/system-configs/{key}` | 按 key 获取单个配置值 |
| `PUT` | `/v1/system-configs/{key}` | 设置配置值（仅管理员）|
| `DELETE` | `/v1/system-configs/{key}` | 删除配置项（仅管理员）|

---

## Edition

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/edition` | 获取当前版本信息及功能限制 |

---

## MCP Bridge

通过 `/mcp/bridge` 的 streamable HTTP 将 GoClaw 工具暴露给 Claude CLI。仅监听 localhost，通过 gateway token 保护，并使用 HMAC 签名的 context 请求头。

| 请求头 | 用途 |
|--------|---------|
| `X-Agent-ID` | 工具执行的 agent 上下文 |
| `X-User-ID` | 用户上下文 |
| `X-Channel` | channel 路由 |
| `X-Chat-ID` | 聊天路由 |
| `X-Peer-Kind` | `direct` 或 `group` |
| `X-Bridge-Sig` | 所有 context 字段的 HMAC 签名 |

---

## 系统

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/health` | 健康检查（无需认证）|
| `GET` | `/v1/openapi.json` | OpenAPI 3.0 规范 |
| `GET` | `/docs` | Swagger UI |

---

## 通用响应结构

**成功：**
```json
{ "id": "uuid", "name": "...", ... }
```

**错误：**
```json
{
  "error": {
    "code": "ERR_AGENT_NOT_FOUND",
    "message": "Agent not found. Verify the agent ID and try again."
  }
}
```

错误响应使用标准化的 envelope 结构，包含 `code`（机器可读错误类型）和 `message`（人类可读，支持 i18n 翻译）。

| 状态码 | 含义 |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | 请求错误（无效 JSON、缺少字段）|
| `401` | 未认证 |
| `403` | 禁止访问 |
| `404` | 未找到 |
| `409` | 冲突（重复名称）|
| `429` | 速率限制 |
| `500` | 内部服务器错误 |

错误消息根据 `Accept-Language` 头进行本地化。

---

## 仅 WebSocket 端点

以下功能**只能通过 WebSocket RPC 使用**，不支持 HTTP：

- **会话：** 列出、预览、更新、删除、重置（`sessions.*`）
- **Cron 任务：** 列出、创建、更新、删除、切换、状态、运行、运行记录（`cron.*`）
- **配置管理：** 获取、应用、修改、schema（`config.*`）
- **配置权限：** 列出、授权、撤销（`config.permissions.*`）
- **发送消息：** 向 channel 发送（`send`）
- **聊天：** 发送、历史记录、中断、注入、会话状态（`chat.*`）
- **心跳：** 获取、设置、切换、测试、日志、检查清单、目标（`heartbeat.*`）
- **设备配对：** 请求、批准、拒绝、列出、撤销（`device.pair.*`）
- **执行审批：** 列出、批准、拒绝（`exec.approval.*`）
- **TTS：** 状态、启用、禁用、转换、设置 provider、providers（`tts.*`）
- **浏览器自动化：** 操作、快照、截图（`browser.*`）
- **日志：** 实时追踪服务器日志（`logs.tail`）

> 完整方法参考和帧格式，见 [WebSocket 协议](/websocket-protocol)。

---

## 下一步

- [WebSocket 协议](/websocket-protocol) — 聊天和 agent 事件的实时 RPC
- [配置参考](/config-reference) — 完整的 `config.json` schema
- [数据库 Schema](/database-schema) — 表定义和关系

<!-- goclaw-source: c388364d | 更新: 2026-04-01 -->
