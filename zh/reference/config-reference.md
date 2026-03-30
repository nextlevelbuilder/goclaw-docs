> 翻译自 [English version](/config-reference)

# 配置参考

> 完整的 `config.json` schema——每个字段、类型和默认值。

## 概览

GoClaw 使用 JSON5 配置文件（支持注释和尾随逗号）。文件路径解析顺序如下：

1. `--config <path>` CLI 标志
2. `$GOCLAW_CONFIG` 环境变量
3. 工作目录下的 `config.json`（默认）

**密钥永远不存储在 `config.json` 中。** API key、token 和数据库 DSN 请放在 `.env.local`（或环境变量）中。`onboard` 向导会自动生成这两个文件。

---

## 顶层结构

```json
{
  "agents":    { ... },
  "channels":  { ... },
  "providers": { ... },
  "gateway":   { ... },
  "tools":     { ... },
  "sessions":  { ... },
  "database":  { ... },
  "tts":       { ... },
  "cron":      { ... },
  "telemetry": { ... },
  "tailscale": { ... },
  "bindings":  [ ... ]
}
```

---

## `agents`

Agent 默认值与按 agent 覆盖。

```json
{
  "agents": {
    "defaults": { ... },
    "list": {
      "researcher": { ... }
    }
  }
}
```

### `agents.defaults`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `workspace` | string | `~/.goclaw/workspace` | 绝对路径或 `~` 相对工作区路径 |
| `restrict_to_workspace` | boolean | `true` | 防止文件工具逃出工作区 |
| `provider` | string | `anthropic` | 默认 LLM provider 名称 |
| `model` | string | `claude-sonnet-4-5-20250929` | 默认模型 ID |
| `max_tokens` | integer | `8192` | 每次 LLM 调用的最大输出 token |
| `temperature` | float | `0.7` | 采样温度 |
| `max_tool_iterations` | integer | `20` | 每次运行最大工具调用轮数 |
| `max_tool_calls` | integer | `25` | 每次运行最大工具调用总数（0 = 无限制）|
| `context_window` | integer | `200000` | 模型上下文窗口（token）|
| `agent_type` | string | `open` | `"open"`（按用户 context）或 `"predefined"`（共享）|
| `bootstrapMaxChars` | integer | `20000` | 每个 bootstrap 文件截断前的最大字符数 |
| `bootstrapTotalMaxChars` | integer | `24000` | 所有 bootstrap 文件的总字符预算 |
| `subagents` | object | 见下方 | 子 agent 并发限制 |
| `sandbox` | object | `null` | Docker 沙箱配置（见 Sandbox）|
| `memory` | object | `null` | 记忆系统配置（见 Memory）|
| `compaction` | object | `null` | 会话压缩配置（见 Compaction）|
| `contextPruning` | object | 自动 | Context 剪枝配置（见 Context Pruning）|

### `agents.defaults.subagents`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `maxConcurrent` | integer | `20` | 全局最大并发子 agent 会话数 |
| `maxSpawnDepth` | integer | `1` | 最大嵌套深度（1–5）|
| `maxChildrenPerAgent` | integer | `5` | 每个父 agent 最大子 agent 数（1–20）|
| `archiveAfterMinutes` | integer | `60` | 自动归档空闲子 agent 会话 |
| `model` | string | — | 子 agent 模型覆盖 |

### `agents.defaults.memory`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | 启用记忆（PostgreSQL 后端）|
| `embedding_provider` | string | 自动 | `"openai"`、`"gemini"`、`"openrouter"` 或 `""`（自动检测）|
| `embedding_model` | string | `text-embedding-3-small` | Embedding 模型 ID |
| `embedding_api_base` | string | — | 自定义 embedding 端点 URL |
| `max_results` | integer | `6` | 最大记忆搜索结果数 |
| `max_chunk_len` | integer | `1000` | 每个记忆 chunk 的最大字符数 |
| `vector_weight` | float | `0.7` | 混合搜索向量权重 |
| `text_weight` | float | `0.3` | 混合搜索全文搜索权重 |
| `min_score` | float | `0.35` | 返回结果的最低相关性分数 |

### `agents.defaults.compaction`

当会话历史超过 `maxHistoryShare` 倍上下文窗口时触发压缩。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `reserveTokensFloor` | integer | `20000` | 压缩后保留的最少 token 数 |
| `maxHistoryShare` | float | `0.85` | 历史超过此比例的上下文窗口时触发 |
| `minMessages` | integer | `50` | 触发压缩所需的最少消息数 |
| `keepLastMessages` | integer | `4` | 压缩后保留的消息数 |
| `memoryFlush` | object | — | 压缩前记忆刷新配置 |

### `agents.defaults.compaction.memoryFlush`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | 压缩前刷新记忆 |
| `softThresholdTokens` | integer | `4000` | 距压缩触发点 N token 内时刷新 |
| `prompt` | string | — | 刷新轮次的用户 prompt |
| `systemPrompt` | string | — | 刷新轮次的系统 prompt |

### `agents.defaults.contextPruning`

配置 Anthropic 时自动启用。剪除旧工具结果以释放上下文空间。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `mode` | string | `cache-ttl`（Anthropic）/ `off` | `"off"` 或 `"cache-ttl"` |
| `keepLastAssistants` | integer | `3` | 保护最后 N 条 assistant 消息不被剪除 |
| `softTrimRatio` | float | `0.3` | 上下文窗口达此比例时开始软修剪 |
| `hardClearRatio` | float | `0.5` | 上下文窗口达此比例时开始硬清除 |
| `minPrunableToolChars` | integer | `50000` | 执行操作所需的最少可剪除工具字符数 |
| `softTrim.maxChars` | integer | `4000` | 修剪超过此长度的工具结果 |
| `softTrim.headChars` | integer | `1500` | 保留修剪结果的前 N 个字符 |
| `softTrim.tailChars` | integer | `1500` | 保留修剪结果的后 N 个字符 |
| `hardClear.enabled` | boolean | `true` | 用占位符替换旧工具结果 |
| `hardClear.placeholder` | string | `[Old tool result content cleared]` | 替换文本 |

### `agents.defaults.sandbox`

基于 Docker 的代码沙箱。需要 Docker 及沙箱支持构建。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `mode` | string | `off` | `"off"`、`"non-main"`（仅子 agent）、`"all"` |
| `image` | string | `goclaw-sandbox:bookworm-slim` | Docker 镜像 |
| `workspace_access` | string | `rw` | `"none"`、`"ro"`、`"rw"` |
| `scope` | string | `session` | `"session"`、`"agent"`、`"shared"` |
| `memory_mb` | integer | `512` | 内存限制（MB）|
| `cpus` | float | `1.0` | CPU 限制 |
| `timeout_sec` | integer | `300` | 执行超时（秒）|
| `network_enabled` | boolean | `false` | 启用容器网络访问 |
| `read_only_root` | boolean | `true` | 只读根文件系统 |
| `setup_command` | string | — | 容器创建后运行一次的命令 |
| `user` | string | — | 容器用户（如 `"1000:1000"`、`"nobody"`）|
| `tmpfs_size_mb` | integer | `0` | tmpfs 大小（MB，0 = Docker 默认）|
| `max_output_bytes` | integer | `1048576` | 最大执行输出捕获量（默认 1 MB）|
| `idle_hours` | integer | `24` | 清理空闲超过 N 小时的容器 |
| `max_age_days` | integer | `7` | 清理超过 N 天的容器 |
| `prune_interval_min` | integer | `5` | 清理检查间隔（分钟）|

### `agents.defaults` — Evolution

Agent evolution 设置存储在 agent 的 `other_config` JSONB 字段中（通过仪表盘设置），而非 `config.json`。在此记录以供参考。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `self_evolve` | boolean | `false` | 允许 agent 重写自身的 `SOUL.md`（风格/语气演变）。仅对有 agent 级 context 文件写入权限的 `predefined` agent 有效 |
| `skill_evolve` | boolean | `false` | 启用 `skill_manage` 工具——agent 可在运行期间创建、修改和删除 skill |
| `skill_nudge_interval` | integer | `15` | 触发 skill 提示前的最少工具调用次数（0 = 禁用）。鼓励在复杂运行后创建 skill |

### `agents.list`

按 agent 的覆盖配置。所有字段可选——零值继承自 `defaults`。

```json
{
  "agents": {
    "list": {
      "researcher": {
        "displayName": "Research Assistant",
        "provider": "openrouter",
        "model": "anthropic/claude-opus-4",
        "max_tokens": 16000,
        "agent_type": "open",
        "workspace": "~/.goclaw/workspace-researcher",
        "default": false
      }
    }
  }
}
```

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `displayName` | string | UI 中显示的人类可读名称 |
| `provider` | string | LLM provider 覆盖 |
| `model` | string | 模型 ID 覆盖 |
| `max_tokens` | integer | 输出 token 限制覆盖 |
| `temperature` | float | 温度覆盖 |
| `max_tool_iterations` | integer | 工具迭代限制覆盖 |
| `context_window` | integer | 上下文窗口覆盖 |
| `max_tool_calls` | integer | 总工具调用限制覆盖 |
| `agent_type` | string | `"open"` 或 `"predefined"` |
| `skills` | string[] | Skill 白名单（null = 全部，`[]` = 无）|
| `workspace` | string | 工作区目录覆盖 |
| `default` | boolean | 标记为默认 agent |
| `sandbox` | object | 按 agent 的沙箱覆盖 |
| `identity` | object | `{name, emoji}` persona 配置 |

---

## `channels`

消息 channel 配置。

### `channels.telegram`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Telegram channel |
| `token` | string | — | Bot token（放在环境变量中）|
| `proxy` | string | — | HTTP 代理 URL |
| `allow_from` | string[] | — | 用户 ID 白名单 |
| `dm_policy` | string | `pairing` | `"pairing"`、`"allowlist"`、`"open"`、`"disabled"` |
| `group_policy` | string | `open` | `"open"`、`"allowlist"`、`"disabled"` |
| `require_mention` | boolean | `true` | 群组中需要 @bot 提及 |
| `history_limit` | integer | `50` | 上下文待处理群组消息最大数（0 = 禁用）|
| `dm_stream` | boolean | `false` | 私信渐进式流式传输 |
| `group_stream` | boolean | `false` | 群组渐进式流式传输 |
| `draft_transport` | boolean | `true` | 私信流式传输使用草稿消息 API（隐形预览，无逐次编辑通知）|
| `reasoning_stream` | boolean | `true` | provider 发出 thinking 事件时将扩展思考作为单独消息显示 |
| `reaction_level` | string | `full` | `"off"`、`"minimal"`、`"full"` — 状态 emoji 反应 |
| `media_max_bytes` | integer | `20971520` | 最大媒体下载大小（默认 20 MB）|
| `link_preview` | boolean | `true` | 启用 URL 预览 |
| `force_ipv4` | boolean | `false` | 所有 Telegram API 请求强制使用 IPv4（IPv6 路由异常时使用）|
| `stt_proxy_url` | string | — | 语音消息的语音转文字代理 URL |
| `voice_agent_id` | string | — | 将语音消息路由到此 agent |
| `groups` | object | — | 按 chat ID 的群组覆盖 |

### `channels.discord`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Discord channel |
| `token` | string | — | Bot token（放在环境变量中）|
| `dm_policy` | string | `open` | `"open"`、`"allowlist"`、`"disabled"` |
| `group_policy` | string | `open` | `"open"`、`"allowlist"`、`"disabled"` |
| `require_mention` | boolean | `true` | 需要 @bot 提及 |
| `history_limit` | integer | `50` | 上下文待处理消息最大数 |

### `channels.zalo`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Zalo OA channel |
| `token` | string | — | Zalo OA 访问 token |
| `dm_policy` | string | `pairing` | `"pairing"`、`"open"`、`"disabled"` |

### `channels.feishu`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Feishu/Lark channel |
| `app_id` | string | — | App ID |
| `app_secret` | string | — | App secret（放在环境变量中）|
| `domain` | string | `lark` | `"lark"`（国际版）或 `"feishu"`（国内版）|
| `connection_mode` | string | `websocket` | `"websocket"` 或 `"webhook"` |
| `encrypt_key` | string | — | 事件加密密钥 |
| `verification_token` | string | — | 事件验证 token |

### `channels.whatsapp`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 WhatsApp channel |
| `bridge_url` | string | — | WhatsApp 桥接服务 URL |

### `channels.slack`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Slack channel |
| `bot_token` | string | — | Bot User OAuth Token（`xoxb-...`）|
| `app_token` | string | — | Socket Mode 的 App-Level Token（`xapp-...`）|
| `user_token` | string | — | 可选的 User OAuth Token（`xoxp-...`），用于自定义 bot 身份 |
| `allow_from` | string[] | — | 用户 ID 白名单 |
| `dm_policy` | string | `pairing` | `"pairing"`、`"allowlist"`、`"open"`、`"disabled"` |
| `group_policy` | string | `open` | `"open"`、`"pairing"`、`"allowlist"`、`"disabled"` |
| `require_mention` | boolean | `true` | 频道中需要 @bot 提及 |
| `history_limit` | integer | `50` | 上下文待处理消息最大数（0 = 禁用）|
| `dm_stream` | boolean | `false` | 私信渐进式流式传输 |
| `group_stream` | boolean | `false` | 群组渐进式流式传输 |
| `native_stream` | boolean | `false` | 如可用则使用 Slack ChatStreamer API |
| `reaction_level` | string | `off` | `"off"`、`"minimal"`、`"full"` — 状态 emoji 反应 |
| `block_reply` | boolean | — | 覆盖 gateway 的 `block_reply`（未设置 = 继承）|
| `debounce_delay` | integer | `300` | 派发快速消息前的延迟（毫秒，0 = 禁用）|
| `thread_ttl` | integer | `24` | 线程参与过期时间（小时，0 = 始终需要 @提及）|
| `media_max_bytes` | integer | `20971520` | 最大文件下载大小（默认 20 MB）|

### `channels.zalo_personal`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Zalo 个人 channel |
| `allow_from` | string[] | — | 用户 ID 白名单 |
| `dm_policy` | string | `pairing` | `"pairing"`、`"allowlist"`、`"open"`、`"disabled"` |
| `group_policy` | string | `open` | `"open"`、`"allowlist"`、`"disabled"` |
| `require_mention` | boolean | `true` | 群组中需要 @bot 提及 |
| `history_limit` | integer | `50` | 上下文待处理群组消息最大数（0 = 禁用）|
| `credentials_path` | string | — | 已保存的会话 cookie JSON 路径 |
| `block_reply` | boolean | — | 覆盖 gateway 的 `block_reply`（未设置 = 继承）|

### `channels.pending_compaction`

当群组积累的待处理消息数超过 `threshold` 时，由 LLM 对旧消息进行摘要后再发送给 agent，末尾保留 `keep_recent` 条原始消息。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `threshold` | integer | `50` | 待处理消息数超过此值时触发压缩 |
| `keep_recent` | integer | `15` | 压缩后保留的最近原始消息数 |
| `max_tokens` | integer | `4096` | LLM 摘要调用的最大输出 token |
| `provider` | string | — | 摘要使用的 LLM provider（空 = 使用 agent 的 provider）|
| `model` | string | — | 摘要使用的模型（空 = 使用 agent 的模型）|

---

## `gateway`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `host` | string | `0.0.0.0` | 监听主机 |
| `port` | integer | `18790` | 监听端口 |
| `token` | string | — | 认证 Bearer token（放在环境变量中）|
| `owner_ids` | string[] | — | 具有管理员/所有者权限的用户 ID |
| `allowed_origins` | string[] | `[]` | 允许的 WebSocket CORS 来源（空 = 允许所有）|
| `max_message_chars` | integer | `32000` | 最大传入消息长度 |
| `inbound_debounce_ms` | integer | `1000` | 合并快速连续消息（毫秒）|
| `rate_limit_rpm` | integer | `20` | WebSocket 速率限制（每分钟请求数）|
| `injection_action` | string | `warn` | `"off"`、`"log"`、`"warn"`、`"block"` — 提示注入响应方式 |
| `block_reply` | boolean | `false` | 工具迭代期间向用户传送中间文本 |
| `tool_status` | boolean | `true` | 工具执行期间在流式预览中显示工具名称 |
| `task_recovery_interval_sec` | integer | `300` | 团队任务恢复检查间隔 |
| `quota` | object | — | 按用户请求配额配置 |

---

## `tools`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `profile` | string | — | 工具配置预设：`"minimal"`、`"coding"`、`"messaging"`、`"full"` |
| `allow` | string[] | — | 显式工具白名单（工具名或 `"group:xxx"`）|
| `deny` | string[] | — | 显式工具黑名单 |
| `alsoAllow` | string[] | — | 追加白名单——与 profile 合并而不移除现有工具 |
| `byProvider` | object | — | 按 provider 名称的工具策略覆盖 |
| `rate_limit_per_hour` | integer | `150` | 每会话每小时最大工具调用数 |
| `scrub_credentials` | boolean | `true` | 从工具输出中清除密钥 |

### `tools.web`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `web.brave.enabled` | boolean | `false` | 启用 Brave Search |
| `web.brave.api_key` | string | — | Brave Search API key |
| `web.duckduckgo.enabled` | boolean | `true` | 启用 DuckDuckGo 回退 |
| `web.duckduckgo.max_results` | integer | `5` | 最大搜索结果数 |

### `tools.web_fetch`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `policy` | string | — | `"allow"` 或 `"block"` 默认策略 |
| `allowed_domains` | string[] | — | 始终允许的域名 |
| `blocked_domains` | string[] | — | 始终封锁的域名（SSRF 防护）|

### `tools.browser`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | 启用浏览器自动化工具 |
| `headless` | boolean | `true` | 无头模式运行浏览器 |
| `remote_url` | string | — | 连接到远程浏览器（Chrome DevTools Protocol URL）|

### `tools.exec_approval`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `security` | string | `full` | `"full"`（黑名单激活）、`"none"` |
| `ask` | string | `off` | `"off"`、`"always"`、`"risky"` — 何时请求用户审批 |
| `allowlist` | string[] | — | 额外安全命令白名单 |

### `tools.mcp_servers`

MCP server 配置数组。每个条目：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `name` | string | 唯一 server 名称 |
| `transport` | string | `"stdio"`、`"sse"`、`"streamable-http"` |
| `command` | string | Stdio：要执行的命令 |
| `args` | string[] | Stdio：命令参数 |
| `url` | string | SSE/HTTP：server URL |
| `headers` | object | SSE/HTTP：额外 HTTP 请求头 |
| `env` | object | Stdio：额外环境变量 |
| `tool_prefix` | string | 可选的工具名称前缀 |
| `timeout_sec` | integer | 请求超时（默认 60）|
| `enabled` | boolean | 启用/禁用 server |

---

## `providers`

静态 provider 配置。API key 也可通过环境变量设置（如 `GOCLAW_NOVITA_API_KEY`）。

### `providers.novita`

Novita AI — OpenAI 兼容端点。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `api_key` | string | — | Novita AI API key |
| `api_base` | string | `https://api.novita.ai/openai` | API base URL |

```json
{
  "providers": {
    "novita": {
      "api_key": "your-novita-api-key"
    }
  }
}
```

---

## `sessions`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `scope` | string | `per-sender` | 会话范围：`"per-sender"`（每个用户独立会话）或 `"global"`（所有用户共享）|
| `dm_scope` | string | `per-channel-peer` | 私信会话隔离：`"main"`、`"per-peer"`、`"per-channel-peer"`、`"per-account-channel-peer"` |
| `main_key` | string | `main` | 主会话 key 后缀（`dm_scope` 为 `"main"` 时使用）|

### 按会话队列并发

每个会话通过独立队列运行。`max_concurrent` 字段控制单个会话（私信或群组）可同时执行的 agent 运行数。在 DB 中按 agent-link 配置（通过仪表盘），而非 `config.json`，底层 `QueueConfig` 默认值为：

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `max_concurrent` | integer | `1` | 每个会话队列最大并发运行数（1 = 串行，不重叠）。群组通常适合串行处理；私信可以设置更高以支持交互工作负载 |

---

## `tts`

文字转语音输出。配置 provider 并可选择启用自动 TTS。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `provider` | string | — | TTS provider：`"openai"`、`"elevenlabs"`、`"edge"`、`"minimax"` |
| `auto` | string | `off` | 自动朗读时机：`"off"`、`"always"`、`"inbound"`（仅回复语音）、`"tagged"` |
| `mode` | string | `final` | 朗读哪些响应：`"final"`（仅完整回复）或 `"all"`（每个流式 chunk）|
| `max_length` | integer | `1500` | 截断前的最大文本长度 |
| `timeout_ms` | integer | `30000` | TTS API 超时（毫秒）|

### `tts.openai`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `api_key` | string | — | OpenAI API key（放在环境变量：`GOCLAW_TTS_OPENAI_API_KEY`）|
| `api_base` | string | — | 自定义端点 URL |
| `model` | string | `gpt-4o-mini-tts` | TTS 模型 |
| `voice` | string | `alloy` | 声音名称 |

### `tts.elevenlabs`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `api_key` | string | — | ElevenLabs API key（放在环境变量：`GOCLAW_TTS_ELEVENLABS_API_KEY`）|
| `base_url` | string | — | 自定义 base URL |
| `voice_id` | string | `pMsXgVXv3BLzUgSXRplE` | 声音 ID |
| `model_id` | string | `eleven_multilingual_v2` | 模型 ID |

### `tts.edge`

Microsoft Edge TTS——免费，无需 API key。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 Edge TTS provider |
| `voice` | string | `en-US-MichelleNeural` | 声音名称（SSML 兼容）|
| `rate` | string | `+0%` | 语速调整（如 `"+10%"`、`"-5%"`）|

### `tts.minimax`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `api_key` | string | — | MiniMax API key（放在环境变量：`GOCLAW_TTS_MINIMAX_API_KEY`）|
| `group_id` | string | — | MiniMax GroupId（必填；放在环境变量：`GOCLAW_TTS_MINIMAX_GROUP_ID`）|
| `api_base` | string | `https://api.minimax.io/v1` | API base URL |
| `model` | string | `speech-02-hd` | TTS 模型 |
| `voice_id` | string | `Wise_Woman` | 声音 ID |

---

## `cron`

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `max_retries` | integer | `3` | 任务失败时的最大重试次数（0 = 不重试）|
| `retry_base_delay` | string | `2s` | 初始重试退避（Go duration，如 `"2s"`）|
| `retry_max_delay` | string | `30s` | 最大重试退避 |
| `default_timezone` | string | — | 未按任务设置时 cron 表达式的 IANA 时区（如 `"Asia/Shanghai"`、`"America/New_York"`）|

---

## `telemetry`

OpenTelemetry OTLP 导出。需要构建标签 `otel`（`go build -tags otel`）。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | 启用 OTLP 导出 |
| `endpoint` | string | — | OTLP 端点（如 `"localhost:4317"`）|
| `protocol` | string | `grpc` | `"grpc"` 或 `"http"` |
| `insecure` | boolean | `false` | 跳过 TLS 验证（本地开发）|
| `service_name` | string | `goclaw-gateway` | OTEL 服务名称 |
| `headers` | object | — | 额外请求头（云端后端的认证 token）|

---

## `tailscale`

Tailscale tsnet 监听器。需要构建标签 `tsnet`（`go build -tags tsnet`）。

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `hostname` | string | Tailscale 机器名（如 `"goclaw-gateway"`）|
| `state_dir` | string | 持久化状态目录（默认：`os.UserConfigDir/tsnet-goclaw`）|
| `ephemeral` | boolean | 退出时移除 Tailscale 节点（默认 false）|
| `enable_tls` | boolean | 使用 `ListenTLS` 自动获取 HTTPS 证书 |

> Auth key 永远不放在 config.json 中——只能通过 `GOCLAW_TSNET_AUTH_KEY` 环境变量设置。

---

## `bindings`

将特定 channel/用户路由到指定 agent。每个条目：

```json
{
  "bindings": [
    {
      "agentId": "researcher",
      "match": {
        "channel": "telegram",
        "peer": { "kind": "direct", "id": "123456789" }
      }
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `agentId` | string | 目标 agent ID |
| `match.channel` | string | Channel 名称：`"telegram"`、`"discord"`、`"slack"` 等 |
| `match.accountId` | string | Bot 账户 ID（可选）|
| `match.peer.kind` | string | `"direct"` 或 `"group"` |
| `match.peer.id` | string | 聊天或群组 ID |
| `match.guildId` | string | Discord guild ID（可选）|

---

## 团队设置（JSONB）

团队设置存储在 `agent_teams.settings` JSONB 中，通过仪表盘配置，而非 `config.json`。主要字段：

### `blocker_escalation`

控制任务的 `"blocker"` 评论是否触发自动失败并上报给 lead。

```json
{
  "blocker_escalation": {
    "enabled": true
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `blocker_escalation.enabled` | boolean | `true` | 为 true 时，`comment_type = "blocker"` 的任务评论会自动使任务失败并上报给 team lead |

### `escalation_mode`

控制升级消息如何传递给 team lead。

| 字段 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------------|
| `escalation_mode` | string | — | 升级事件的传递方式：`"notify"`（发布到 lead 的会话）或 `""`（静默）|
| `escalation_actions` | string[] | — | 升级时的额外操作（如 `["notify"]`）|

---

## 最小可用示例

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.goclaw/workspace",
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tool_iterations": 20
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "channels": {
    "telegram": { "enabled": true }
  }
}
```

密钥（`GOCLAW_GATEWAY_TOKEN`、`GOCLAW_OPENROUTER_API_KEY`、`GOCLAW_POSTGRES_DSN`）放在 `.env.local` 中。

---

## 下一步

- [环境变量](/env-vars) — 各类别的完整环境变量参考
- [CLI 命令](/cli-commands) — `goclaw onboard` 交互式生成此文件
- [数据库 Schema](/database-schema) — agent 和 provider 在 PostgreSQL 中的存储方式

<!-- goclaw-source: e7afa832 | 更新: 2026-03-30 -->
