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

## Reasoning API

GoClaw 支持两级 reasoning 配置：provider 级别的默认值（对所有 agent 生效），以及 agent 级别的覆盖。适用于 o 系列和 GPT-5/Codex 模型。

### Provider 级别默认值

通过 `settings.reasoning_defaults` 在 provider 上设置可复用的 reasoning 默认值，所有使用该 provider 的 agent 自动继承：

```json
{
  "name": "openai",
  "provider_type": "openai",
  "settings": {
    "reasoning_defaults": {
      "effort": "high",
      "fallback": "downgrade"
    }
  }
}
```

如果 provider 未配置 `reasoning_defaults`，`inherit` 模式默认关闭 reasoning。

### Agent 级别覆盖

Agent 可以通过 `other_config` 中的 `reasoning.override_mode` 覆盖或继承 provider 默认值：

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "inherit"
    }
  }
}
```

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "custom",
      "effort": "medium",
      "fallback": "off"
    }
  }
}
```

| `override_mode` | 行为 |
|---|---|
| `inherit` | 使用 provider 的 `reasoning_defaults` |
| `custom` | 使用 agent 自己的 reasoning 策略 |

没有 `override_mode` 的 agent 行为与 `custom` 相同（向后兼容）。

### Effort 级别与 fallback 策略

有效 effort 值：`off`、`auto`、`none`、`minimal`、`low`、`medium`、`high`、`xhigh`。

当请求的 effort 不被模型支持时的 fallback 策略：

| `fallback` | 行为 |
|---|---|
| `downgrade`（默认） | 使用不超过请求级别的最高支持级别 |
| `off` | 完全关闭 reasoning |
| `provider_default` | 使用模型的默认 effort |

### GPT-5 和 Codex 的 effort 归一化

对于已知的 GPT-5 和 Codex 模型，GoClaw 在发送请求前会验证并归一化 effort，避免请求的级别不被该模型变体支持时出现 API 错误：

| 模型 | 支持级别 | 默认值 |
|---|---|---|
| gpt-5 | minimal, low, medium, high | medium |
| gpt-5.1 | none, low, medium, high | none |
| gpt-5.1-codex | low, medium, high | medium |
| gpt-5.2 | none, low, medium, high, xhigh | none |
| gpt-5.2-codex | low, medium, high, xhigh | medium |
| gpt-5.3-codex | low, medium, high, xhigh | medium |
| gpt-5.4 | none, low, medium, high, xhigh | none |
| gpt-5-mini / gpt-5.4-mini | none, low, medium, high, xhigh | none |

对于未知模型（如新发布版本），请求的 effort 直接透传。trace 元数据会记录已解析的 `source` 和 `effective_effort`，便于查看实际发送的值。

### 旧版 `thinking_level`（向后兼容）

旧版 `options.thinking_level` 仍可作为 reasoning API 的简写使用：

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

这是一个兼容 shim — GoClaw 内部将其映射到 `reasoning_effort`。新配置建议改用 `reasoning.override_mode` 配合 `effort`。推理 token 用量从 `completion_tokens_details.reasoning_tokens` 追踪至 `Usage.ThinkingTokens`。

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

## 原生图片生成（OpenAI-compat）

支持 OpenAI-compat 的 provider 可通过在请求中附加 tool object 直接生成图片：

```json
{
  "tools": [{ "type": "image_generation" }]
}
```

GoClaw 从 `choices[0].message.images[]`（或流式时的 `choices[0].delta.images[]`）读取结果——每个元素是生成图片的 data URL。图片保存至 `{workspace}/media/{sha256}.{ext}`，并附带嵌入的 PNG 元数据（model、prompt、timestamp）。流式感知：partial image 事件在 chunk 完成时以最终 URL 形式输出。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 在 platform.openai.com 验证 key |
| `HTTP 429` | 频率限制 | GoClaw 自动重试；检查你的等级限制 |
| o 系列 `HTTP 400` | 不支持的参数 | 避免对 o 系列模型设置 `temperature` |
| 视觉不工作 | 模型不支持图像 | 使用 gpt-4o 或 gpt-4o-mini |

### Developer Role（GPT-4o+）

对于原生 OpenAI 端点（`api.openai.com`），GoClaw 在发送请求时自动将 `system` 角色映射为 `developer`。`developer` 角色对 GPT-4o 及更新模型的指令优先级高于 `system`。

此映射仅适用于原生 OpenAI 基础设施。其他 OpenAI 兼容后端（Azure OpenAI、代理、Qwen、DeepSeek 等）继续使用标准 `system` 角色。

## 下一步

- [OpenRouter](/provider-openrouter) — 通过一个 API key 访问 100+ 模型
- [Anthropic](/provider-anthropic) — 原生 Claude 集成
- [概览](/providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 29457bb3 | 更新: 2026-04-25 -->
