> 翻译自 [English version](/providers-overview)

# Provider 概览

> Provider 是 GoClaw 与 LLM API 之间的接口——配置一个（或多个），所有 agent 即可使用。

## 概述

Provider 封装了一个 LLM API，并暴露统一接口：`Chat()`、`ChatStream()`、`DefaultModel()` 和 `Name()`。GoClaw 有两种 provider 实现：一个原生 Anthropic 客户端（自定义 HTTP+SSE），以及一个通用 OpenAI 兼容客户端，涵盖 OpenAI、OpenRouter、Gemini、DeepSeek、Groq、Mistral 等。通过 agent 配置选择使用哪个 provider，系统其余部分与 provider 无关。

## Provider 接口

每个 provider 实现相同的 Go 接口：

```
Chat()        — 阻塞调用，返回完整响应
ChatStream()  — 流式调用，每个 token 触发 onChunk 回调
DefaultModel() — 返回配置的默认模型名称
Name()        — 返回 provider 标识符（如 "anthropic"、"openai"）
```

支持扩展思考的 provider 还实现 `SupportsThinking() bool`。

## 添加 Provider

### 静态配置（config.json）

在 `providers.<name>` 下添加 API key：

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-..."
    },
    "openai": {
      "api_key": "sk-...",
      "api_base": "https://api.openai.com/v1"
    },
    "openrouter": {
      "api_key": "sk-or-..."
    }
  }
}
```

`api_base` 字段可选——每个 provider 都有内置的默认端点。

### 控制台（llm_providers 表）

Provider 也可存储在 `llm_providers` PostgreSQL 表中。API key 使用 AES-256-GCM 加密存储。可以在控制台中添加、编辑或删除 provider，无需重启 GoClaw，修改在下一次请求时生效。

## 重试逻辑

所有 provider 通过 `RetryDo()` 共享相同的重试行为：

| 设置 | 值 |
|---|---|
| 最大尝试次数 | 3 |
| 初始延迟 | 300ms |
| 最大延迟 | 30s |
| 抖动 | ±10% |
| 可重试状态码 | 429, 500, 502, 503, 504 |
| 可重试网络错误 | 超时、连接重置、broken pipe、EOF |

当 API 返回 `Retry-After` 头（常见于 429 响应）时，GoClaw 使用该值而非计算指数退避。

## Provider 架构

```mermaid
graph TD
    Agent --> Registry
    Registry --> Anthropic[AnthropicProvider\nnative HTTP+SSE]
    Registry --> OAI[OpenAIProvider\nOpenAI-compat]
    OAI --> OpenAI
    OAI --> OpenRouter
    OAI --> Gemini
    OAI --> DeepSeek
    OAI --> Groq
    OAI --> Mistral
```

## 自动限制 max_tokens

当模型因 `max_tokens` 过大而拒绝请求时，GoClaw 会自动使用限制后的值重试。根据 provider 不同，处理 `max_tokens` 和 `max_completion_tokens` 两种参数名。重试对 agent 透明——agent 不会看到错误。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `provider not found: X` | Provider 名称拼写错误或缺少配置 | 检查 config.json 中的拼写是否与 provider 名称一致 |
| `HTTP 401` | API key 无效或缺失 | 验证 API key 是否正确 |
| `HTTP 429` | 达到频率限制 | GoClaw 自动重试；降低请求并发 |
| Provider 未列出 | 未设置 key | 在 provider 配置块中添加 `api_key` |

## 下一步

- [Anthropic](/provider-anthropic) — 原生 Claude 集成，支持扩展思考
- [OpenAI](/provider-openai) — GPT-4o、o 系列推理模型
- [OpenRouter](/provider-openrouter) — 通过一个 API 访问 100+ 模型
- [Gemini](/provider-gemini) — 通过 OpenAI 兼容端点使用 Google Gemini
- [DeepSeek](/provider-deepseek) — 支持 reasoning_content 的 DeepSeek
- [Groq](/provider-groq) — 超快推理
- [Mistral](/provider-mistral) — Mistral AI 模型

<!-- goclaw-source: 941a965 | 更新: 2026-03-19 -->

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
