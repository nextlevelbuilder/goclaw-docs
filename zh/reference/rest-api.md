> 翻译自 [English version](#rest-api)

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

### `GET /v1/agents/{id}/codex-pool-activity`

返回使用 [Codex OAuth pool](#provider-codex) 的 agent 的路由活动和每账户健康状态。要求 agent 的 provider 为 `chatgpt_oauth` 类型并已配置 pool。

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

---

## 会话

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/sessions` | 列出会话（分页）|
| `GET` | `/v1/sessions/{key}` | 获取会话及其消息 |
| `DELETE` | `/v1/sessions/{key}` | 删除会话 |
| `POST` | `/v1/sessions/{key}/reset` | 清空会话消息 |
| `PATCH` | `/v1/sessions/{key}` | 更新标签、模型、元数据 |

---

## 团队事件

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/teams/{id}/events` | 列出团队事件（分页）|

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

---

## 存储

工作区文件管理。

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/storage/files` | 列出文件（支持深度限制）|
| `GET` | `/v1/storage/files/{path...}` | 读取文件（JSON 或原始格式）|
| `DELETE` | `/v1/storage/files/{path...}` | 删除文件/目录 |
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

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/v1/auth/openai/status` | 检查 OpenAI OAuth 状态 |
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
| `PUT` | `/v1/tenants/{id}` | 更新租户 |
| `DELETE` | `/v1/tenants/{id}` | 删除租户 |

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
{ "error": "agent not found" }
```

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

- **Cron 任务：** 列出、创建、更新、删除、日志（`cron.*`）
- **配置管理：** 获取、应用、修改（`config.*`）
- **发送消息：** 向 channel 发送（`send.*`）

---

## 下一步

- [WebSocket 协议](#websocket-protocol) — 聊天和 agent 事件的实时 RPC
- [配置参考](#config-reference) — 完整的 `config.json` schema
- [数据库 Schema](#database-schema) — 表定义和关系

<!-- goclaw-source: 231bc968 | 更新: 2026-03-27 -->
