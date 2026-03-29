> 翻译自 [English version](/provider-gemini)

# Gemini

> 通过 OpenAI 兼容端点在 GoClaw 中使用 Google Gemini 模型。

## 概述

GoClaw 通过 Google Gemini 的 OpenAI 兼容 API（`https://generativelanguage.googleapis.com/v1beta/openai/`）连接。使用与 OpenAI 和 OpenRouter 相同的 `OpenAIProvider` 实现，但对 Gemini 的工具调用格式有特殊处理。具体而言，Gemini 2.5+ 要求每次工具调用都回传 `thought_signature` 字段——GoClaw 自动处理。

## 前提条件

- 从 [aistudio.google.com](https://aistudio.google.com) 获取 Google AI Studio API key
- 或启用了 Vertex AI 的 Google Cloud 项目（将 Vertex 端点设为 `api_base`）

## config.json 配置

```json
{
  "providers": {
    "gemini": {
      "api_key": "AIza...",
      "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/"
    }
  }
}
```

## 控制台配置

在控制台进入 **Settings → Providers → Gemini**，输入 API key 和 base URL。两者均使用 AES-256-GCM 加密存储。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| gemini-2.5-pro | 1M tokens | 最强大，支持思考 |
| gemini-2.5-flash | 1M tokens | 快速且便宜，支持思考 |
| gemini-2.0-flash | 1M tokens | 上一代 flash |
| gemini-1.5-pro | 2M tokens | 最大上下文窗口 |
| gemini-1.5-flash | 1M tokens | 上一代 flash |

## Gemini 特殊处理

### thought_signature 回传

Gemini 2.5+ 在工具调用中返回 `thought_signature`。GoClaw 将其存储在 `ToolCall.Metadata["thought_signature"]` 中，并在后续请求中回传。这是必需的——发送没有签名的工具调用会导致 `HTTP 400`。

### 工具调用折叠

若对话历史中的某个工具调用缺少 `thought_signature`（如来自旧模型或恢复的会话），GoClaw 自动折叠该工具调用周期：去除 assistant 的工具调用，将工具结果合并为普通用户消息。这样可以保留上下文，同时避免触发 Gemini 的签名验证错误。

### 空内容处理

当工具调用存在时，Gemini 拒绝 `content` 为空的 assistant 消息。GoClaw 在这种情况下省略 `content` 字段，而不是发送空字符串。

## 思考 / 推理

Gemini 2.5 模型支持扩展思考。在 agent 选项中设置 `thinking_level`：

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

GoClaw 将其映射到请求中的 `reasoning_effort`。思考 token 用量追踪至 `Usage.ThinkingTokens`。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| 工具调用时 `HTTP 400` | 缺少 `thought_signature` | GoClaw 通过折叠逻辑自动处理 |
| 空内容 `HTTP 400` | assistant 消息内容为空 | GoClaw 自动省略空内容 |
| `HTTP 403` | API key 无效或超出配额 | 在 AI Studio 检查 key；验证计费 |
| 找不到模型 | 模型名称错误 | 在 [ai.google.dev](https://ai.google.dev/gemini-api/docs/models) 查看准确的模型 ID |
| 思考不工作 | 模型不支持 | 使用 gemini-2.5-pro 或 gemini-2.5-flash |

## 下一步

- [DeepSeek](/provider-deepseek) — 支持 reasoning_content 的 DeepSeek 模型
- [OpenRouter](/provider-openrouter) — 通过一个 key 访问 Gemini 和 100+ 其他模型
- [概览](/providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
