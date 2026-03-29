> 翻译自 [English version](/provider-groq)

# Groq

> 使用 Groq 的 LPU 推理硬件以极高速度运行开源模型。

## 概述

Groq 提供 OpenAI 兼容 API，token 生成速度比基于 GPU 的 provider 快得多——对于支持的模型通常快 10–20 倍。GoClaw 使用标准 `OpenAIProvider` 连接 Groq，无需特殊处理。Base URL 指向 `https://api.groq.com/openai/v1`。

## 前提条件

- 从 [console.groq.com](https://console.groq.com) 获取 Groq API key
- Groq 免费层级较为慷慨；付费计划提供更高频率限制

## config.json 配置

```json
{
  "providers": {
    "groq": {
      "api_key": "gsk_...",
      "api_base": "https://api.groq.com/openai/v1"
    }
  }
}
```

## 控制台配置

在控制台进入 **Settings → Providers → Groq**，输入 API key 和 base URL。使用 AES-256-GCM 加密存储。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| llama-3.3-70b-versatile | 128k tokens | Groq 上质量最佳 |
| llama-3.1-8b-instant | 128k tokens | 最快，延迟最低 |
| llama3-70b-8192 | 8k tokens | 上一代 70B |
| llama3-8b-8192 | 8k tokens | 上一代 8B |
| mixtral-8x7b-32768 | 32k tokens | Mixtral MoE 模型 |
| gemma2-9b-it | 8k tokens | Google Gemma 2 |

查看 [console.groq.com/docs/models](https://console.groq.com/docs/models) 获取完整且最新的列表——Groq 频繁添加新模型。

## 适用场景

Groq 在对延迟敏感的工作负载中表现出色：

- **交互式 agent**——响应速度比原始能力更重要
- **高吞吐量流水线**——处理大量短请求
- **原型开发**——快速迭代比 per-token 成本更重要

对于复杂推理或超长上下文，建议考虑 [Anthropic](/provider-anthropic) 或 [OpenAI](/provider-openai)。

## 工具调用

Groq 在大多数模型上支持 function calling。GoClaw 以标准 OpenAI 格式发送工具。注意工具调用支持因模型而异——请查阅 Groq 的模型文档。

## 流式传输

流式传输通过标准 OpenAI SSE 实现。GoClaw 在所有流式请求中包含 `stream_options.include_usage`，以在最后一个 chunk 中捕获 token 计数。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 验证 key 是否以 `gsk_` 开头 |
| `HTTP 429` | 频率限制（每分钟 token 数） | GoClaw 重试；降低并发或升级计划 |
| 找不到模型 | 模型已弃用或名称已变更 | 在 console.groq.com 查看当前模型列表 |
| 工具调用不工作 | 模型不支持 function calling | 切换到 llama-3.3-70b-versatile |
| 上下文窗口短 | 选择了旧模型 | 使用 llama-3.3-70b-versatile（128k） |

## 下一步

- [Mistral](/provider-mistral) — Mistral AI 模型
- [DeepSeek](/provider-deepseek) — 带思考内容的推理模型
- [概览](/providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
