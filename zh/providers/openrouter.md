> 翻译自 [English version](/provider-openrouter)

# OpenRouter

> 通过一个 API key 访问来自 Anthropic、Google、Meta、Mistral 等的 100+ 模型。

## 概述

OpenRouter 是一个 LLM 聚合器，提供统一的 OpenAI 兼容端点。GoClaw 对 OpenRouter 使用相同的 `OpenAIProvider` 实现，但有一个重要区别：模型 ID 必须包含 provider 前缀（如 `anthropic/claude-sonnet-4-5-20250929`）。若传入不带前缀的模型名称，GoClaw 会自动回退到配置的默认模型。

## 前提条件

- 从 [openrouter.ai](https://openrouter.ai) 获取 OpenRouter API key
- OpenRouter 账户中有足够额度

## config.json 配置

```json
{
  "providers": {
    "openrouter": {
      "api_key": "sk-or-v1-..."
    }
  }
}
```

默认 base URL 为 `https://openrouter.ai/api/v1`，除非使用代理，否则无需设置 `api_base`。

## 控制台配置

在控制台进入 **Settings → Providers → OpenRouter**，粘贴 API key。key 在存储前使用 AES-256-GCM 加密。

## 模型 ID 格式

OpenRouter 要求模型 ID 格式为 `provider/model-name`。示例：

| Provider | 模型 ID |
|---|---|
| Anthropic Claude Sonnet | `anthropic/claude-sonnet-4-5-20250929` |
| Anthropic Claude Opus | `anthropic/claude-opus-4-5` |
| Google Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Meta Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` |
| Mistral Large | `mistralai/mistral-large` |
| DeepSeek R1 | `deepseek/deepseek-r1` |

在 [openrouter.ai/models](https://openrouter.ai/models) 浏览所有可用模型。

## resolveModel 行为

GoClaw 的 `resolveModel()` 逻辑专门针对 OpenRouter：

- 若模型字符串包含 `/` → 直接使用
- 若模型字符串不含 `/` → 回退到 provider 配置的默认模型

这可防止发送裸模型名称（如 `claude-sonnet-4-5`）而被 OpenRouter 拒绝。

在 agent 配置中为 OpenRouter 设置默认模型：

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4-5-20250929"
}
```

## 支持的功能

OpenRouter 将大多数功能透传给底层模型 provider，可用性取决于模型：

| 功能 | 备注 |
|---|---|
| 流式传输 | 所有模型均支持 |
| 工具调用 / function calling | 大多数模型支持 |
| 视觉 | 取决于模型（如 GPT-4o、Claude Sonnet） |
| 推理 / 思考 | 取决于模型（如 DeepSeek R1、o3） |
| 用量统计 | 在最后一个流式 chunk 中返回 |

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 检查 key 是否以 `sk-or-` 开头 |
| 找不到模型 | 缺少 provider 前缀 | 使用 `provider/model-name` 格式 |
| 无前缀模型回退到默认 | `resolveModel()` 行为 | OpenRouter 的模型 ID 始终包含 `/` |
| `HTTP 402` | 额度不足 | 为 OpenRouter 账户充值 |
| 功能不支持 | 底层模型限制 | 在 openrouter.ai/models 查看模型能力 |

## 下一步

- [Gemini](/provider-gemini) — 直接通过 OpenAI 兼容端点使用 Google Gemini
- [OpenAI](/provider-openai) — 直接 OpenAI 集成
- [概览](/providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
