> 翻译自 [English version](#env-vars)

# 环境变量

> GoClaw 识别的所有环境变量，按类别组织。

## 概览

GoClaw 在启动时读取环境变量，并将其叠加在 `config.json` 之上。环境变量始终优先于文件中的值。密钥（API key、token、DSN）不应放在 `config.json` 中——请将其放在 `.env.local` 中或在部署时作为环境变量注入。

```bash
# 加载密钥并启动
source .env.local && ./goclaw

# 或直接传入
GOCLAW_POSTGRES_DSN="postgres://..." GOCLAW_GATEWAY_TOKEN="..." ./goclaw
```

---

## Gateway

| 变量 | 必填 | 说明 |
|----------|----------|-------------|
| `GOCLAW_GATEWAY_TOKEN` | 是 | WebSocket 和 HTTP API 认证的 Bearer token |
| `GOCLAW_ENCRYPTION_KEY` | 是 | 用于加密数据库中 provider API key 的 AES-256-GCM 密钥。用 `openssl rand -hex 32` 生成 |
| `GOCLAW_CONFIG` | 否 | `config.json` 路径。默认：`./config.json` |
| `GOCLAW_HOST` | 否 | Gateway 监听主机。默认：`0.0.0.0` |
| `GOCLAW_PORT` | 否 | Gateway 监听端口。默认：`18790` |
| `GOCLAW_OWNER_IDS` | 否 | 具有管理员/所有者权限的用户 ID（逗号分隔，如 `user1,user2`）|
| `GOCLAW_AUTO_UPGRADE` | 否 | 设为 `true` 时，gateway 启动时自动运行 DB 迁移 |
| `GOCLAW_DATA_DIR` | 否 | Gateway 状态数据目录。默认：`~/.goclaw/data` |
| `GOCLAW_MIGRATIONS_DIR` | 否 | 迁移目录路径。默认：`./migrations` |
| `GOCLAW_GATEWAY_URL` | 否 | `auth` CLI 命令的完整 gateway URL（如 `http://localhost:18790`）|

---

## 数据库

| 变量 | 必填 | 说明 |
|----------|----------|-------------|
| `GOCLAW_POSTGRES_DSN` | 是 | PostgreSQL 连接字符串。示例：`postgres://user:pass@localhost:5432/goclaw?sslmode=disable` |

> DSN 有意不包含在 `config.json` 中——它是密钥，只能通过环境变量设置。

---

## LLM Provider

环境变量中的 API key 会覆盖 `config.json` 中的值。设置 key 同时也会自动启用该 provider。

| 变量 | Provider |
|----------|----------|
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic（Claude）|
| `GOCLAW_ANTHROPIC_BASE_URL` | Anthropic 自定义端点 |
| `GOCLAW_OPENAI_API_KEY` | OpenAI（GPT）|
| `GOCLAW_OPENAI_BASE_URL` | OpenAI 兼容自定义端点 |
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_MISTRAL_API_KEY` | Mistral AI |
| `GOCLAW_XAI_API_KEY` | xAI（Grok）|
| `GOCLAW_MINIMAX_API_KEY` | MiniMax |
| `GOCLAW_COHERE_API_KEY` | Cohere |
| `GOCLAW_PERPLEXITY_API_KEY` | Perplexity |
| `GOCLAW_DASHSCOPE_API_KEY` | 阿里云 DashScope |
| `GOCLAW_BAILIAN_API_KEY` | 阿里云百炼 |
| `GOCLAW_OLLAMA_HOST` | Ollama 服务器 URL（如 `http://localhost:11434`）|
| `GOCLAW_OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key |
| `GOCLAW_OLLAMA_CLOUD_API_BASE` | Ollama Cloud 自定义 base URL |

### Provider 与模型默认值

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_PROVIDER` | 默认 LLM provider 名称（覆盖 config 中的 `agents.defaults.provider`）|
| `GOCLAW_MODEL` | 默认模型 ID（覆盖 config 中的 `agents.defaults.model`）|

---

## Claude CLI Provider

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_CLAUDE_CLI_PATH` | `claude` 二进制路径。默认：`claude`（从 PATH 查找）|
| `GOCLAW_CLAUDE_CLI_MODEL` | Claude CLI 的模型别名（如 `sonnet`、`opus`、`haiku`）|
| `GOCLAW_CLAUDE_CLI_WORK_DIR` | Claude CLI 会话的基础工作目录 |

---

## Channel

设置 token/凭证的环境变量会自动启用对应 channel。

| 变量 | Channel | 说明 |
|----------|---------|-------------|
| `GOCLAW_TELEGRAM_TOKEN` | Telegram | 来自 @BotFather 的 Bot token |
| `GOCLAW_DISCORD_TOKEN` | Discord | Bot token |
| `GOCLAW_ZALO_TOKEN` | Zalo OA | Zalo OA 访问 token |
| `GOCLAW_LARK_APP_ID` | Feishu/Lark | App ID |
| `GOCLAW_LARK_APP_SECRET` | Feishu/Lark | App secret |
| `GOCLAW_LARK_ENCRYPT_KEY` | Feishu/Lark | 事件加密密钥 |
| `GOCLAW_LARK_VERIFICATION_TOKEN` | Feishu/Lark | 事件验证 token |
| `GOCLAW_WHATSAPP_BRIDGE_URL` | WhatsApp | 桥接服务 URL |

---

## 文字转语音（TTS）

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_TTS_OPENAI_API_KEY` | OpenAI TTS API key |
| `GOCLAW_TTS_ELEVENLABS_API_KEY` | ElevenLabs TTS API key |
| `GOCLAW_TTS_MINIMAX_API_KEY` | MiniMax TTS API key |
| `GOCLAW_TTS_MINIMAX_GROUP_ID` | MiniMax group ID |

---

## 工作区与 Skill

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_WORKSPACE` | 默认 agent 工作区目录。默认：`~/.goclaw/workspace` |
| `GOCLAW_SESSIONS_STORAGE` | 会话存储路径（旧版）。默认：`~/.goclaw/sessions` |
| `GOCLAW_SKILLS_DIR` | 全局 skill 目录。默认：`~/.goclaw/skills` |
| `GOCLAW_BUILTIN_SKILLS_DIR` | 内置 skill 定义路径。默认：`./builtin-skills` |
| `GOCLAW_BUNDLED_SKILLS_DIR` | 捆绑 skill 包路径。默认：`./bundled-skills` |

---

## 沙箱（Docker）

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_SANDBOX_MODE` | `"off"`、`"non-main"` 或 `"all"` |
| `GOCLAW_SANDBOX_IMAGE` | 沙箱容器的 Docker 镜像 |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `"none"`、`"ro"` 或 `"rw"` |
| `GOCLAW_SANDBOX_SCOPE` | `"session"`、`"agent"` 或 `"shared"` |
| `GOCLAW_SANDBOX_MEMORY_MB` | 内存限制（MB）|
| `GOCLAW_SANDBOX_CPUS` | CPU 限制（浮点数，如 `"1.5"`）|
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | 执行超时（秒）|
| `GOCLAW_SANDBOX_NETWORK` | 设为 `"true"` 启用容器网络访问 |

---

## 并发 / 调度器

基于 lane 的并发 agent 运行限制。

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `GOCLAW_LANE_MAIN` | `30` | 最大并发主 agent 运行数 |
| `GOCLAW_LANE_SUBAGENT` | `50` | 最大并发子 agent 运行数 |
| `GOCLAW_LANE_DELEGATE` | `100` | 最大并发委派 agent 运行数 |
| `GOCLAW_LANE_CRON` | `30` | 最大并发 cron 任务运行数 |

---

## 遥测（OpenTelemetry）

需要构建标签 `otel`（`go build -tags otel`）。

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_TELEMETRY_ENABLED` | 设为 `"true"` 启用 OTLP 导出 |
| `GOCLAW_TELEMETRY_ENDPOINT` | OTLP 端点（如 `localhost:4317`）|
| `GOCLAW_TELEMETRY_PROTOCOL` | `"grpc"`（默认）或 `"http"` |
| `GOCLAW_TELEMETRY_INSECURE` | 设为 `"true"` 跳过 TLS 验证 |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | OTEL 服务名。默认：`goclaw-gateway` |

---

## Tailscale

需要构建标签 `tsnet`（`go build -tags tsnet`）。

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_TSNET_HOSTNAME` | Tailscale 机器名（如 `goclaw-gateway`）|
| `GOCLAW_TSNET_AUTH_KEY` | Tailscale auth key——永远不存储在 config.json 中 |
| `GOCLAW_TSNET_DIR` | 持久化状态目录 |

---

## 调试与追踪

| 变量 | 说明 |
|----------|-------------|
| `GOCLAW_TRACE_VERBOSE` | 设为 `1` 在 trace span 中记录完整的 LLM 输入 |
| `GOCLAW_BROWSER_REMOTE_URL` | 通过 Chrome DevTools Protocol URL 连接远程浏览器。自动启用浏览器工具 |
| `GOCLAW_REDIS_DSN` | Redis 连接字符串（如 `redis://redis:6379/0`）。需要 `-tags redis` 构建 |

---

## 最小 `.env.local`

由 `goclaw onboard` 生成。请将此文件排除在版本控制之外。

```bash
# 必填
GOCLAW_GATEWAY_TOKEN=your-gateway-token
GOCLAW_ENCRYPTION_KEY=your-32-byte-hex-key
GOCLAW_POSTGRES_DSN=postgres://user:pass@localhost:5432/goclaw?sslmode=disable

# LLM provider（选其一）
GOCLAW_OPENROUTER_API_KEY=sk-or-...
# GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
# GOCLAW_OPENAI_API_KEY=sk-...

# Channel（可选）
# GOCLAW_TELEGRAM_TOKEN=123456789:ABC...

# 调试（可选）
# GOCLAW_TRACE_VERBOSE=1
```

---

## 下一步

- [配置参考](#config-reference) — 各类别对应的 `config.json` 字段
- [CLI 命令](#cli-commands) — `goclaw onboard` 自动生成 `.env.local`
- [数据库 Schema](#database-schema) — 密钥如何加密存储在 PostgreSQL 中

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
