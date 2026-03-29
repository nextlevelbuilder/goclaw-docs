> 翻译自 [English version](/provider-openai)

# OpenAI

> 通过标准 OpenAI API 将 GoClaw 连接到 OpenAI 的 GPT-4o 和 o 系列推理模型。

## 概述

GoClaw 使用通用 OpenAI 兼容 provider（`OpenAIProvider`）处理所有 OpenAI API 请求。支持常规对话模型（GPT-4o、GPT-4o-mini）和使用 `reasoning_effort` 代替 temperature 的 o 系列推理模型（o1、o3、o4-mini）。流式传输使用 SSE，并通过 `stream_options.include_usage` 在最后一个 chunk 中包含用量统计。

## 前提条件

- 从 [platform.openai.com](https://platform.openai.com) 获取 OpenAI API key
- 已有额度或按量付费计划

## config.json 配置

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-..."
    }
  }
}
```

默认 base URL 为 `https://api.openai.com/v1`。使用自定义端点（如本地代理）：

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## 控制台配置

在控制台进入 **Settings → Providers → OpenAI**，输入 API key。key 使用 AES-256-GCM 加密存储。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| gpt-4o | 128k tokens | 最佳多模态模型，支持视觉 |
| gpt-4o-mini | 128k tokens | 比 gpt-4o 更快更便宜 |
| o4-mini | 200k tokens | 快速推理模型 |
| o3 | 200k tokens | 高级推理 |
| o1 | 200k tokens | 原始推理模型 |
| o1-mini | 128k tokens | 小型推理模型 |

## 推理模型（o 系列）

对于 o 系列模型，在 agent 选项中设置 `thinking_level`，GoClaw 自动映射到 `reasoning_effort` 参数：

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

`thinking_level` 值直接映射到 `reasoning_effort`：`low`、`medium`、`high`。推理 token 用量从 `completion_tokens_details.reasoning_tokens` 追踪至 `Usage.ThinkingTokens`。

## 视觉

GPT-4o 支持图像输入。在消息的 `images` 字段中以 base64 发送图像，GoClaw 自动转换为 OpenAI 的 `image_url` 内容块格式：

```json
{
  "role": "user",
  "content": "这张图里有什么？",
  "images": [
    {
      "mime_type": "image/jpeg",
      "data": "<base64-encoded-bytes>"
    }
  ]
}
```

## 工具调用

OpenAI function calling 开箱即用。GoClaw 在发送前将内部工具定义转换为 OpenAI 的 wire 格式（带 `type: "function"` 包装，`arguments` 序列化为 JSON 字符串）。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 在 platform.openai.com 验证 key |
| `HTTP 429` | 频率限制 | GoClaw 自动重试；检查你的等级限制 |
| o 系列 `HTTP 400` | 不支持的参数 | 避免对 o 系列模型设置 `temperature` |
| 视觉不工作 | 模型不支持图像 | 使用 gpt-4o 或 gpt-4o-mini |

## 下一步

- [OpenRouter](/provider-openrouter) — 通过一个 API key 访问 100+ 模型
- [Anthropic](/provider-anthropic) — 原生 Claude 集成
- [概览](/providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
