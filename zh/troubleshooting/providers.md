> 翻译自 [English version](/troubleshoot-providers)

# Provider 问题

> API key 错误、速率限制、模型不匹配和 schema 验证失败的修复方法。

## 概览

GoClaw 支持 Anthropic（原生 HTTP+SSE）和大量 OpenAI 兼容的 provider。Provider 仅在其 API key 存在时才在启动时注册。所有 provider 对短暂错误（429、500–504、连接重置、超时）使用指数退避自动重试。

## Provider 未注册

如果 provider 未出现在仪表盘中或返回 `provider not found`，说明它在启动时因 API key 缺失而被跳过。

检查启动日志中的 `registered provider` 行：

```
INFO registered provider name=anthropic
INFO registered provider name=openai
```

如果某个 provider 缺失，设置对应的环境变量并重启：

| Provider | 环境变量 |
|----------|---------|
| Anthropic | `GOCLAW_ANTHROPIC_API_KEY` |
| OpenAI | `GOCLAW_OPENAI_API_KEY` |
| Gemini | `GOCLAW_GEMINI_API_KEY` |
| DashScope / Qwen | `GOCLAW_DASHSCOPE_API_KEY` |
| OpenRouter | `GOCLAW_OPENROUTER_API_KEY` |
| Groq | `GOCLAW_GROQ_API_KEY` |
| DeepSeek | `GOCLAW_DEEPSEEK_API_KEY` |
| Mistral | `GOCLAW_MISTRAL_API_KEY` |
| xAI / Grok | `GOCLAW_XAI_API_KEY` |
| MiniMax | `GOCLAW_MINIMAX_API_KEY` |
| Cohere | `GOCLAW_COHERE_API_KEY` |
| Perplexity | `GOCLAW_PERPLEXITY_API_KEY` |

Provider 也可以在运行时通过仪表盘添加（存储在 `llm_providers` 表中，key 使用 AES-256-GCM 加密）。

## 常见错误

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `HTTP 401` | API key 无效或被撤销 | 从 provider 控制台重新生成 key；更新环境变量或仪表盘 |
| `HTTP 403` | 账户暂停或套餐限制 | 检查 provider 账户状态；如在免费套餐请升级 |
| `HTTP 429` | 速率限制 | GoClaw 自动重试最多 3 次（最小 300ms，最大 30s 退避）；如持续发生，减少并发 |
| `HTTP 404` / 模型未找到 | 模型名称错误或模型已下线 | 在 provider 文档中检查当前模型名称；更新 agent 配置 |
| `HTTP 500/502/503/504` | Provider 故障 | 自动重试；如持续发生检查 provider 状态页 |
| 连接重置 / EOF / 超时 | 网络不稳定 | 自动重试；检查 DNS 和防火墙规则 |

## 重试行为

GoClaw 在 HTTP 429、500、502、503、504 和网络错误时重试。默认配置：

- **尝试次数：** 3
- **初始延迟：** 300ms
- **最大延迟：** 30s
- **退避：** 指数，带 ±10% 抖动
- **Retry-After 头：** 存在时遵守（如 Anthropic/OpenAI 的 429）

## Schema 验证错误（Gemini）

Gemini 拒绝其他 provider 接受的某些 JSON Schema 字段。GoClaw 在发送工具定义前自动移除不兼容的字段。

为 Gemini 移除的字段：`$ref`、`$defs`、`additionalProperties`、`examples`、`default`

如果尽管如此仍看到 Gemini 的 schema 验证错误，工具定义可能使用了未完全解析的深度嵌套引用。简化工具的参数 schema。

为 Anthropic 移除的字段：`$ref`、`$defs`

## 扩展思考（Anthropic）

扩展思考需要兼容的模型（如 `claude-opus-4-5`）以及请求中的 `thinking` 块。GoClaw 在存在思考块时自动添加 `anthropic-beta: interleaved-thinking-2025-05-14` 头。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 思考未出现 | 模型不支持 | 使用 `claude-opus-4-5` 或其他支持思考的模型 |
| `redacted_thinking` 块 | 返回了加密思考 | 正常——这些保留用于上下文传递；不含可读内容 |
| 预算超出 | `budget_tokens` 太低 | 在 agent 配置中增大 `budget_tokens`；最小值通常为 1024 |

## Claude CLI Provider

`claude-cli` provider 通过 shell 调用 `claude` 二进制，而不是直接调用 API。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 二进制未找到 | `claude` 不在 PATH 中 | 将 `GOCLAW_CLAUDE_CLI_PATH` 设置为二进制的完整路径 |
| 认证失败 | CLI 未认证 | 手动运行 `claude login` 进行认证 |
| 模型错误 | 默认模型不匹配 | 将 `GOCLAW_CLAUDE_CLI_MODEL` 设置为所需的模型别名 |
| 工作目录错误 | `GOCLAW_CLAUDE_CLI_WORK_DIR` 路径不存在 | 创建目录或更新环境变量 |

## Codex Provider

`codex` provider（OpenAI Codex CLI）也通过 shell 调用本地二进制。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 二进制未找到 | `codex` 不在 PATH 中 | 安装 Codex CLI 或在 provider 配置中设置路径 |
| 认证失败 | CLI 未认证 | 运行 `codex auth` 或在环境中设置 `OPENAI_API_KEY` |
| 流读取错误 | 二进制在流中途崩溃 | 检查二进制版本兼容性；更新 Codex CLI |

## ACP Provider

`acp` provider（Agent Client Protocol）通过 JSON-RPC 2.0 over stdin/stdout 将任何 ACP 兼容的编程 agent（Claude Code、Codex CLI、Gemini CLI）作为子进程编排。它不需要 API key——agent 二进制自行管理其认证。

在 `config.json` 的 `providers.acp` 下配置：

```json
"acp": {
  "binary": "claude",
  "args": [],
  "model": "claude",
  "work_dir": "",
  "idle_ttl": "5m",
  "perm_mode": "approve-all"
}
```

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `acp: binary not found, skipping` | 二进制路径不存在或不可执行 | 确认二进制已安装，且 `binary` 字段是正确路径或 `$PATH` 中的名称 |
| `acp: spawn failed` | 子进程启动失败 | 检查二进制是否可执行；手动运行以查看启动错误 |
| `acp: prompt failed` | stdin/stdout 上的 JSON-RPC 通信错误 | 检查子进程日志；确认 agent 二进制版本支持 ACP 协议 |
| `acp: session_key required in options` | 请求中无会话 key | ACP 需要会话 key——确保 agent 配置在 options 中传递 `session_key` |
| `acp: no user message in request` | 请求内容为空 | 确保聊天请求包含用户消息 |
| Provider 未出现在仪表盘 | 配置中未设置 `binary` 字段 | 在 `config.json` 中设置 `providers.acp.binary` 并重启 |

**成功注册 ACP 的启动日志：**

```
INFO registered provider name=acp binary=claude
```

## 下一步

- [数据库问题](/troubleshoot-database)
- [常见问题](/troubleshoot-common)
- [Channel 问题](/troubleshoot-channels)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
