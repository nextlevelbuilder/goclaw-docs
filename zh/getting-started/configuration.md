> 翻译自 [English version](#configuration)

# 配置

> 如何通过 config.json 和环境变量配置 GoClaw。

## 概述

GoClaw 使用两层配置：`config.json` 文件用于结构性配置，环境变量用于密钥。配置文件支持 JSON5（允许注释），保存后热重载生效。

## 配置文件位置

默认情况下，GoClaw 在当前目录查找 `config.json`。可通过以下方式覆盖：

```bash
export GOCLAW_CONFIG=/path/to/config.json
```

## 配置结构

顶层配置一览：

```jsonc
{
  "gateway": { ... },      // HTTP/WS 服务器设置、认证、配额
  "agents": {              // 默认值 + 每 agent 覆盖
    "defaults": { ... },
    "list": { ... }
  },
  "memory": { ... },       // 语义记忆（embedding、检索）
  "compaction": { ... },   // 上下文压缩阈值
  "context_pruning": { ... }, // 上下文裁剪策略
  "subagents": { ... },    // 子 agent 并发限制
  "sandbox": { ... },      // Docker 沙箱默认值
  "providers": { ... },    // LLM provider API key
  "channels": { ... },     // 消息 channel 集成
  "tools": { ... },        // 工具策略、MCP 服务器
  "tts": { ... },          // 文字转语音
  "sessions": { ... },     // Session 存储和范围
  "cron": [],              // 定时任务
  "bindings": {},          // 按 channel/peer 的 agent 路由
  "telemetry": { ... },    // OpenTelemetry 导出
  "tailscale": { ... }     // Tailscale/tsnet 网络
}
```

**重要：** `env:` 前缀告诉 GoClaw 从环境变量读取值，而非使用字面字符串。

- `"env:GOCLAW_OPENROUTER_API_KEY"` → 读取 `$GOCLAW_OPENROUTER_API_KEY`
- `"my-secret-key"`（无 `env:`）→ 使用字面字符串（**不推荐**用于密钥）

敏感值（如 API key、token、密码）请始终使用 `env:`。

## 环境变量

### 必需

| 变量 | 用途 |
|------|------|
| `GOCLAW_GATEWAY_TOKEN` | API/WebSocket 认证的 Bearer token |
| `GOCLAW_ENCRYPTION_KEY` | 用于加密数据库凭证的 AES-256-GCM 密钥 |
| `GOCLAW_POSTGRES_DSN` | PostgreSQL 连接字符串 |

### Provider API Key

| 变量 | Provider |
|------|----------|
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic |
| `GOCLAW_OPENAI_API_KEY` | OpenAI |
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_MISTRAL_API_KEY` | Mistral |
| `GOCLAW_XAI_API_KEY` | xAI |
| `GOCLAW_MINIMAX_API_KEY` | MiniMax |
| `GOCLAW_COHERE_API_KEY` | Cohere |
| `GOCLAW_PERPLEXITY_API_KEY` | Perplexity |
| `GOCLAW_DASHSCOPE_API_KEY` | DashScope（阿里云模型服务 — Qwen API） |
| `GOCLAW_BAILIAN_API_KEY` | Bailian（阿里云模型服务 — Coding Plan） |
| `GOCLAW_ZAI_API_KEY` | ZAI |
| `GOCLAW_ZAI_CODING_API_KEY` | ZAI Coding |
| `GOCLAW_OLLAMA_CLOUD_API_KEY` | Ollama Cloud |

### 可选

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `GOCLAW_CONFIG` | `./config.json` | 配置文件路径 |
| `GOCLAW_WORKSPACE` | `./workspace` | Agent 工作目录 |
| `GOCLAW_DATA_DIR` | `./data` | 数据目录 |
| `GOCLAW_REDIS_DSN` | — | Redis DSN（使用 Redis session 存储时） |
| `GOCLAW_TSNET_AUTH_KEY` | — | Tailscale 认证密钥 |
| `GOCLAW_TRACE_VERBOSE` | `0` | 设为 `1` 开启调试 LLM trace |

## 热重载

GoClaw 使用 `fsnotify` 监控 `config.json` 的变化，带 300ms 防抖。Agent、channel 和 provider 凭证会自动重载。

**例外：** Gateway 设置（host、port）需要完整重启。

## Gateway 配置

```jsonc
"gateway": {
  "host": "0.0.0.0",
  "port": 18790,
  "token": "env:GOCLAW_GATEWAY_TOKEN",
  "owner_ids": ["user123"],
  "max_message_chars": 32000,
  "rate_limit_rpm": 20,
  "allowed_origins": ["https://app.example.com"],
  "injection_action": "warn",
  "inbound_debounce_ms": 1000,
  "block_reply": false,
  "tool_status": true,
  "quota": {
    "enabled": true,
    "default": { "hour": 100, "day": 500 },
    "providers": { "anthropic": { "hour": 50 } },
    "channels": { "telegram": { "day": 200 } },
    "groups": { "group_vip": { "hour": 0 } }
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `host` | string | `"0.0.0.0"` | 绑定地址 |
| `port` | int | `18790` | HTTP/WS 端口 |
| `token` | string | — | WS/HTTP 认证的 Bearer token |
| `owner_ids` | []string | — | 被视为"所有者"的发送者 ID（绕过配额/限制） |
| `max_message_chars` | int | `32000` | 最大入站消息长度 |
| `rate_limit_rpm` | int | `20` | 全局限速（每分钟请求数） |
| `allowed_origins` | []string | — | WebSocket CORS 白名单；空 = 允许全部 |
| `injection_action` | string | `"warn"` | 提示词注入响应：`"log"`、`"warn"`、`"block"`、`"off"` |
| `inbound_debounce_ms` | int | `1000` | 合并窗口内的快速消息；`-1` = 禁用 |
| `block_reply` | bool | `false` | 为 true 时，工具迭代中抑制中间文本 |
| `tool_status` | bool | `true` | 在流式预览中显示工具名称 |
| `task_recovery_interval_sec` | int | `300` | 检查并恢复停滞团队任务的频率（秒） |
| `quota` | object | — | 每用户/组请求配额（见下方） |

**配额字段**（`quota.default`、`quota.providers.*`、`quota.channels.*`、`quota.groups.*`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `hour` | int | 每小时最大请求数；`0` = 无限制 |
| `day` | int | 每天最大请求数 |
| `week` | int | 每周最大请求数 |

## Agent 配置

### 默认值

`agents.defaults` 中的设置适用于所有 agent，除非被覆盖。

```jsonc
"agents": {
  "defaults": {
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "max_tokens": 8192,
    "temperature": 0.7,
    "max_tool_iterations": 20,
    "max_tool_calls": 25,
    "context_window": 200000,
    "agent_type": "open",
    "workspace": "./workspace",
    "restrict_to_workspace": false,
    "bootstrapMaxChars": 20000,
    "bootstrapTotalMaxChars": 24000,
    "memory": { "enabled": true }
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `provider` | string | — | LLM provider ID |
| `model` | string | — | 模型名称 |
| `max_tokens` | int | — | 最大输出 token 数 |
| `temperature` | float | `0.7` | 采样温度 |
| `max_tool_iterations` | int | `20` | 每次请求最大 LLM→工具循环次数 |
| `max_tool_calls` | int | `25` | 每次请求最大工具调用总次数 |
| `context_window` | int | — | 上下文窗口大小（token） |
| `agent_type` | string | `"open"` | `"open"`（每 session 上下文：identity/soul/user 文件每次刷新）或 `"predefined"`（持久上下文：跨 session 共享 identity/soul 文件 + 每用户 USER.md） |
| `workspace` | string | `"./workspace"` | 文件操作的工作目录 |
| `restrict_to_workspace` | bool | `false` | 阻止访问工作目录外的文件 |
| `bootstrapMaxChars` | int | `20000` | 单个 bootstrap 文档的最大字符数 |
| `bootstrapTotalMaxChars` | int | `24000` | 所有 bootstrap 文档的最大总字符数 |

> **注意：** `intent_classify` 不是 config.json 字段，而是通过 Dashboard 按 agent 配置（Agent 设置 → Behavior & UX 部分），存储在数据库的 agent 记录中。

### 每 Agent 覆盖

```jsonc
"agents": {
  "list": {
    "code-helper": {
      "displayName": "Code Helper",
      "model": "anthropic/claude-opus-4-6",
      "temperature": 0.3,
      "max_tool_iterations": 50,
      "max_tool_calls": 40,
      "default": false,
      "skills": ["git", "code-review"],
      "workspace": "./workspace/code",
      "identity": { "name": "CodeBot", "emoji": "🤖" },
      "tools": {
        "profile": "coding",
        "deny": ["web_search"]
      },
      "sandbox": { "mode": "non-main" }
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `displayName` | string | UI 中显示的可读 agent 名称 |
| `default` | bool | 标记为未匹配请求的默认 agent |
| `skills` | []string | 启用的 skill ID；`null` = 所有可用 |
| `tools` | object | 每 agent 工具策略（见 Tools 部分） |
| `workspace` | string | 覆盖此 agent 的工作目录路径 |
| `sandbox` | object | 覆盖此 agent 的沙箱配置 |
| `identity` | object | `{ "name": "...", "emoji": "..." }` 显示标识 |
| 所有 defaults 字段 | — | 任何 `defaults` 字段都可在此覆盖 |

## Memory（记忆）

语义记忆使用向量 embedding 存储和检索对话上下文。

```jsonc
"memory": {
  "enabled": true,
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "embedding_api_base": "",
  "max_results": 6,
  "max_chunk_len": 1000,
  "vector_weight": 0.7,
  "text_weight": 0.3,
  "min_score": 0.35
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | bool | `true` | 启用语义记忆 |
| `embedding_provider` | string | 自动 | `"openai"`、`"gemini"`、`"openrouter"` 或 `""`（自动检测） |
| `embedding_model` | string | `"text-embedding-3-small"` | Embedding 模型 |
| `embedding_api_base` | string | — | Embedding 的自定义 API base URL |
| `max_results` | int | `6` | 每次查询检索的最大记忆块数 |
| `max_chunk_len` | int | `1000` | 每个记忆块的最大字符数 |
| `vector_weight` | float | `0.7` | 向量相似度分数的权重 |
| `text_weight` | float | `0.3` | 文本（BM25）分数的权重 |
| `min_score` | float | `0.35` | 检索的最低分数阈值 |

## Compaction（压缩）

控制 GoClaw 何时以及如何压缩长对话历史以保持在上下文限制内。

```jsonc
"compaction": {
  "reserveTokensFloor": 20000,
  "maxHistoryShare": 0.75,
  "minMessages": 50,
  "keepLastMessages": 4,
  "memoryFlush": {
    "enabled": true,
    "softThresholdTokens": 4000,
    "prompt": "",
    "systemPrompt": ""
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `reserveTokensFloor` | int | `20000` | 始终为响应保留的最小 token 数 |
| `maxHistoryShare` | float | `0.75` | 历史占上下文窗口的最大比例 |
| `minMessages` | int | `50` | 历史消息达到此数量前不压缩 |
| `keepLastMessages` | int | `4` | 始终保留最近 N 条消息 |
| `memoryFlush.enabled` | bool | `true` | 压缩时将摘要内容刷新到记忆 |
| `memoryFlush.softThresholdTokens` | int | `4000` | 接近此 token 数时触发刷新 |
| `memoryFlush.prompt` | string | — | 自定义摘要用户提示词 |
| `memoryFlush.systemPrompt` | string | — | 自定义摘要系统提示词 |

## Context Pruning（上下文裁剪）

在接近限制时裁剪上下文中的旧工具结果。

```jsonc
"context_pruning": {
  "mode": "cache-ttl",
  "keepLastAssistants": 3,
  "softTrimRatio": 0.3,
  "hardClearRatio": 0.5,
  "minPrunableToolChars": 50000,
  "softTrim": {
    "maxChars": 4000,
    "headChars": 1500,
    "tailChars": 1500
  },
  "hardClear": {
    "enabled": true,
    "placeholder": "[Old tool result content cleared]"
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | string | `"off"` | `"off"` 或 `"cache-ttl"`（按时间裁剪） |
| `keepLastAssistants` | int | `3` | 保留最近 N 个完整的 assistant 轮次 |
| `softTrimRatio` | float | `0.3` | 上下文超过此比例时开始软裁剪 |
| `hardClearRatio` | float | `0.5` | 上下文超过此比例时开始硬清除 |
| `minPrunableToolChars` | int | `50000` | 工具字符总数达到此值前不激活裁剪 |
| `softTrim.maxChars` | int | `4000` | 超过此长度的工具结果被裁剪 |
| `softTrim.headChars` | int | `1500` | 保留裁剪结果开头的字符数 |
| `softTrim.tailChars` | int | `1500` | 保留裁剪结果结尾的字符数 |
| `hardClear.enabled` | bool | `true` | 启用非常旧的工具结果的硬清除 |
| `hardClear.placeholder` | string | `"[Old tool result content cleared]"` | 替换被清除结果的文本 |

## Subagents（子 Agent）

控制 agent 如何生成子 agent。

```jsonc
"subagents": {
  "maxConcurrent": 20,
  "maxSpawnDepth": 1,
  "maxChildrenPerAgent": 5,
  "archiveAfterMinutes": 60,
  "model": "anthropic/claude-haiku-4-5-20251001"
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxConcurrent` | int | `20` | 同时运行的最大子 agent 数 |
| `maxSpawnDepth` | int | `1` | 最大嵌套深度（1–5）；`1` = 只有根 agent 可以生成 |
| `maxChildrenPerAgent` | int | `5` | 每个父 agent 的最大子 agent 数（1–20） |
| `archiveAfterMinutes` | int | `60` | 此时间后归档空闲子 agent |
| `model` | string | — | 子 agent 的默认模型（覆盖 agent 默认值） |

## Sandbox（沙箱）

基于 Docker 的代码执行隔离。可全局设置或每 agent 覆盖。

```jsonc
"sandbox": {
  "mode": "non-main",
  "image": "goclaw-sandbox:bookworm-slim",
  "workspace_access": "rw",
  "scope": "session",
  "memory_mb": 512,
  "cpus": 1.0,
  "timeout_sec": 300,
  "network_enabled": false,
  "read_only_root": true,
  "setup_command": "",
  "env": { "MY_VAR": "value" },
  "max_output_bytes": 1048576,
  "idle_hours": 24,
  "max_age_days": 7,
  "prune_interval_min": 5
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | string | `"off"` | `"off"`、`"non-main"`（仅沙箱子 agent）、`"all"` |
| `image` | string | `"goclaw-sandbox:bookworm-slim"` | Docker 镜像 |
| `workspace_access` | string | `"rw"` | 挂载工作目录：`"none"`、`"ro"`、`"rw"` |
| `scope` | string | `"session"` | 容器生命周期：`"session"`、`"agent"`、`"shared"` |
| `memory_mb` | int | `512` | 内存限制（MB） |
| `cpus` | float | `1.0` | CPU 配额 |
| `timeout_sec` | int | `300` | 每条命令的最大执行时间 |
| `network_enabled` | bool | `false` | 允许容器内网络访问 |
| `read_only_root` | bool | `true` | 只读根文件系统 |
| `setup_command` | string | — | 容器启动时运行的 shell 命令 |
| `env` | map | — | 额外环境变量 |
| `max_output_bytes` | int | `1048576` | 每条命令的最大 stdout+stderr（默认 1 MB） |
| `idle_hours` | int | `24` | 清理空闲超过此时间的容器 |
| `max_age_days` | int | `7` | 清理超过此时间的容器 |
| `prune_interval_min` | int | `5` | 容器清理运行频率 |

## Providers（Provider）

```jsonc
"providers": {
  "anthropic":   { "api_key": "env:GOCLAW_ANTHROPIC_API_KEY" },
  "openai":      { "api_key": "env:GOCLAW_OPENAI_API_KEY" },
  "openrouter":  { "api_key": "env:GOCLAW_OPENROUTER_API_KEY" },
  "groq":        { "api_key": "env:GOCLAW_GROQ_API_KEY" },
  "gemini":      { "api_key": "env:GOCLAW_GEMINI_API_KEY" },
  "deepseek":    { "api_key": "env:GOCLAW_DEEPSEEK_API_KEY" },
  "mistral":     { "api_key": "env:GOCLAW_MISTRAL_API_KEY" },
  "xai":         { "api_key": "env:GOCLAW_XAI_API_KEY" },
  "minimax":     { "api_key": "env:GOCLAW_MINIMAX_API_KEY" },
  "cohere":      { "api_key": "env:GOCLAW_COHERE_API_KEY" },
  "perplexity":  { "api_key": "env:GOCLAW_PERPLEXITY_API_KEY" },
  "dashscope":   { "api_key": "env:GOCLAW_DASHSCOPE_API_KEY" },
  "bailian":     { "api_key": "env:GOCLAW_BAILIAN_API_KEY" },
  "ollama":      { "host": "http://localhost:11434" },
  "claude_cli":  {
    "cli_path": "/usr/local/bin/claude",
    "model": "claude-opus-4-5",
    "base_work_dir": "/tmp/claude-work",
    "perm_mode": "bypassPermissions"
  },
  "acp": {
    "binary": "claude",
    "args": [],
    "model": "claude-sonnet-4-5",
    "work_dir": "/tmp/acp-work",
    "idle_ttl": "5m",
    "perm_mode": "approve-all"
  }
}
```

**说明：**
- `ollama` — 本地 Ollama；不需要 API key，只需 `host`
- `claude_cli` — 通过 CLI 子进程运行 Claude；特殊字段：`cli_path`、`base_work_dir`、`perm_mode`
- `acp` — 通过 JSON-RPC 2.0 stdio 将任意 ACP 兼容 agent（Claude Code、Codex CLI、Gemini CLI）作为子进程编排

## Channels（Channel）

### Telegram

```jsonc
"telegram": {
  "enabled": true,
  "token": "env:TELEGRAM_BOT_TOKEN",
  "allow_from": ["123456789"],
  "dm_policy": "pairing",
  "group_policy": "allowlist",
  "require_mention": true,
  "history_limit": 50,
  "dm_stream": false,
  "group_stream": false,
  "reaction_level": "full"
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `token` | string | — | 来自 @BotFather 的 bot token |
| `allow_from` | []string | — | 白名单用户/聊天 ID；空 = 允许所有 |
| `dm_policy` | string | `"pairing"` | 私聊访问：`"pairing"`、`"allowlist"`、`"open"`、`"disabled"` |
| `group_policy` | string | `"open"` | 群组访问：`"open"`、`"allowlist"`、`"disabled"` |
| `require_mention` | bool | `true` | 在群组中需要 @bot 提及 |
| `history_limit` | int | `50` | 新对话时获取的上下文消息数 |
| `dm_stream` | bool | `false` | 在私聊中流式响应 |
| `group_stream` | bool | `false` | 在群组中流式响应 |
| `reaction_level` | string | `"full"` | Emoji 反应：`"off"`、`"minimal"`、`"full"` |

### Discord

```jsonc
"discord": {
  "enabled": true,
  "token": "env:DISCORD_BOT_TOKEN",
  "allow_from": [],
  "dm_policy": "open",
  "require_mention": true,
  "history_limit": 50
}
```

### Slack

```jsonc
"slack": {
  "enabled": true,
  "bot_token": "env:SLACK_BOT_TOKEN",
  "app_token": "env:SLACK_APP_TOKEN",
  "allow_from": [],
  "dm_policy": "pairing",
  "require_mention": true,
  "thread_ttl": 24
}
```

| 字段 | 说明 |
|------|------|
| `bot_token` | Bot OAuth token（`xoxb-...`） |
| `app_token` | Socket Mode 的 App 级 token（`xapp-...`） |
| `thread_ttl` | 维持 thread 上下文的小时数；`0` = 禁用 |

### WhatsApp

```jsonc
"whatsapp": {
  "enabled": true,
  "bridge_url": "http://localhost:8080",
  "allow_from": [],
  "dm_policy": "open"
}
```

### Zalo

```jsonc
"zalo": {
  "enabled": true,
  "token": "env:ZALO_OA_TOKEN",
  "webhook_url": "https://example.com/zalo/webhook",
  "webhook_secret": "env:ZALO_WEBHOOK_SECRET"
}
```

### Larksuite（Feishu）

JSON key：`"feishu"`

```jsonc
"feishu": {
  "enabled": true,
  "app_id": "env:LARK_APP_ID",
  "app_secret": "env:LARK_APP_SECRET",
  "domain": "lark",
  "connection_mode": "websocket",
  "require_mention": true,
  "streaming": true
}
```

| 字段 | 说明 |
|------|------|
| `domain` | `"lark"`、`"feishu"` 或自定义 base URL |
| `connection_mode` | `"websocket"` 或 `"webhook"` |

## Tools（工具）

```jsonc
"tools": {
  "profile": "coding",
  "allow": ["bash", "read_file"],
  "deny": ["web_search"],
  "alsoAllow": ["special_tool"],
  "rate_limit_per_hour": 500,
  "scrub_credentials": true,
  "execApproval": {
    "security": "allowlist",
    "ask": "on-miss"
  },
  "mcp_servers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "enabled": true,
      "tool_prefix": "fs_",
      "timeout_sec": 60
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `profile` | string | 工具预设：`"minimal"`、`"coding"`、`"messaging"`、`"full"` |
| `allow` | []string | 明确允许的工具 ID |
| `deny` | []string | 明确禁止的工具 ID |
| `alsoAllow` | []string | 在当前 profile 基础上追加工具 |
| `rate_limit_per_hour` | int | 全局每小时最大工具调用次数 |
| `scrub_credentials` | bool | 从工具输出中清除凭证 |

## Exec Approval（执行审批）

控制代码执行安全：

**`security`** — 允许哪些命令：

| 值 | 行为 |
|----|------|
| `deny` | 阻止所有 shell 命令 |
| `allowlist` | 只执行白名单中的命令 |
| `full` | 允许所有 shell 命令 |

**`ask`** — 何时提示审批：

| 值 | 行为 |
|----|------|
| `off` | 从不询问，基于安全级别自动批准 |
| `on-miss` | 命令不在白名单时询问 |
| `always` | 每条命令都询问 |

| 场景 | 推荐设置 |
|------|----------|
| 学习/本地 | `"security": "allowlist", "ask": "on-miss"` |
| 个人使用 | `"security": "full", "ask": "always"` |
| 生产环境 | `"security": "deny", "ask": "off"` |
| 实验性 | `"security": "full", "ask": "off"` |

## TTS（文字转语音）

```jsonc
"tts": {
  "provider": "openai",
  "auto": "off",
  "mode": "final",
  "max_length": 1500,
  "openai": { "model": "gpt-4o-mini-tts", "voice": "alloy" },
  "elevenlabs": { "api_key": "env:ELEVENLABS_API_KEY", "model_id": "eleven_multilingual_v2" },
  "edge": { "enabled": true, "voice": "en-US-MichelleNeural" },
  "minimax": { "model": "speech-02-hd", "voice_id": "Wise_Woman" }
}
```

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `provider` | — | 活跃的 TTS provider：`"openai"`、`"elevenlabs"`、`"edge"`、`"minimax"` |
| `auto` | `"off"` | 自动语音模式：`"off"`、`"always"`、`"inbound"`、`"tagged"` |
| `mode` | `"final"` | 只朗读 `"final"` 响应，或朗读 `"all"` 块 |
| `max_length` | `1500` | 每次 TTS 请求的最大字符数 |
| `timeout_ms` | `30000` | TTS 请求超时（毫秒） |

## Sessions

控制会话的作用域和存储方式。

```jsonc
"sessions": {
  "scope": "per-sender",
  "dm_scope": "per-channel-peer",
  "main_key": "main"
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scope` | string | `"per-sender"` | Session 作用域：`"per-sender"` 或 `"global"` |
| `dm_scope` | string | `"per-channel-peer"` | DM session 粒度：`"main"`、`"per-peer"`、`"per-channel-peer"`、`"per-account-channel-peer"` |
| `main_key` | string | `"main"` | 主/默认 session 使用的 key |

> **注意：** 存储后端（PostgreSQL 或 Redis）由构建标志和环境变量（`GOCLAW_POSTGRES_DSN`、`GOCLAW_REDIS_DSN`）决定，而非 config.json 中的字段。

## Cron

触发 agent 操作的定时任务。

```jsonc
"cron": [
  {
    "schedule": "0 9 * * *",
    "agent_id": "assistant",
    "message": "Good morning! Summarize today's agenda.",
    "channel": "telegram",
    "target": "123456789"
  }
],
"cron_config": {
  "max_retries": 3,
  "retry_base_delay": "2s",
  "retry_max_delay": "30s",
  "default_timezone": "America/New_York"
}
```

**cron_config 字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `max_retries` | int | `3` | 失败重试次数 |
| `retry_base_delay` | string | `"2s"` | 初始退避延迟 |
| `retry_max_delay` | string | `"30s"` | 最大退避延迟 |
| `default_timezone` | string | — | Cron 表达式使用的 IANA 时区（例如 `"America/New_York"`） |

## Bindings

将特定 channel/对端路由到特定 agent。

```jsonc
"bindings": [
  {
    "agentId": "code-helper",
    "match": {
      "channel": "telegram",
      "accountId": "",
      "peer": { "kind": "direct", "id": "123456789" }
    }
  },
  {
    "agentId": "support-bot",
    "match": {
      "channel": "discord",
      "guildId": "987654321"
    }
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `agentId` | string | `agents.list` 中的目标 agent ID |
| `match.channel` | string | Channel 名称：`"telegram"`、`"discord"`、`"slack"` 等 |
| `match.accountId` | string | 特定账号/机器人 ID（多账号场景） |
| `match.peer.kind` | string | `"direct"`（私聊）或 `"group"` |
| `match.peer.id` | string | 用户 ID 或群组/聊天 ID |
| `match.guildId` | string | Discord 服务器 ID |

## Telemetry

用于 trace 和 metrics 的 OpenTelemetry 导出。

```jsonc
"telemetry": {
  "enabled": false,
  "endpoint": "http://otel-collector:4317",
  "protocol": "grpc",
  "insecure": false,
  "service_name": "goclaw-gateway",
  "headers": {
    "x-api-key": "env:OTEL_API_KEY"
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | bool | `false` | 启用 OTLP 导出 |
| `endpoint` | string | — | OTLP collector 端点 |
| `protocol` | string | `"grpc"` | `"grpc"` 或 `"http"` |
| `insecure` | bool | `false` | 跳过 TLS 验证 |
| `service_name` | string | `"goclaw-gateway"` | Trace 中的服务名称 |
| `headers` | map | — | 附加 header（支持 `env:` 前缀） |

## Tailscale

通过 tsnet 在 Tailscale 网络上暴露 GoClaw。

```jsonc
"tailscale": {
  "hostname": "goclaw",
  "state_dir": "./data/tailscale",
  "ephemeral": false,
  "enable_tls": true
}
```

> **注意：** Auth key 必须通过 `GOCLAW_TSNET_AUTH_KEY` 环境变量设置，不能在 config.json 中设置。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `hostname` | string | — | Tailnet 上的主机名 |
| `state_dir` | string | — | Tailscale 状态文件目录 |
| `ephemeral` | bool | `false` | 注册为临时节点（断开连接时移除） |
| `enable_tls` | bool | `false` | 通过 Tailscale 启用自动 HTTPS 证书 |

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 配置未加载 | 检查 `GOCLAW_CONFIG` 路径；确保 JSON5 语法正确 |
| 热重载不工作 | 确认文件已保存；检查操作系统的 fsnotify 支持 |
| API key 未找到 | 确保环境变量已在当前 shell session 中导出 |
| 配额错误 | 检查 `gateway.quota` 设置；验证 `owner_ids` 以跳过限制 |
| Sandbox 未启动 | 确保 Docker 正在运行；验证 `sandbox.image` 中的镜像名 |
| MCP server 无法连接 | 检查 `transport` 类型、`command`/`url` 和服务器日志 |

## 下一步

- [Web Dashboard 导览](#dashboard-tour) — 通过可视化界面配置，无需编辑 JSON
- [Agent 详解](#agents-explained) — 深入了解 agent 配置
- [Tools 概览](#tools-overview) — 可用的 tool 及其分类

<!-- goclaw-source: 0bce640 | 更新: 2026-03-24 -->
