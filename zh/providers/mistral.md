> 翻译自 [English version](#provider-mistral)

# Mistral

> 通过 OpenAI 兼容 API 在 GoClaw 中使用 Mistral AI 模型。

## 概述

GoClaw 使用通用 `OpenAIProvider` 连接 Mistral AI，指向 Mistral 的 OpenAI 兼容端点（`https://api.mistral.ai/v1`）。无需特殊处理——标准对话、流式传输和工具调用均开箱即用。Mistral 提供从轻量级 Mistral 7B 到前沿级 Mistral Large 的多种模型。

## 前提条件

- 从 [console.mistral.ai](https://console.mistral.ai) 获取 Mistral API key
- 有效订阅或额度的 Mistral 账户

## config.json 配置

```json
{
  "providers": {
    "mistral": {
      "api_key": "...",
      "api_base": "https://api.mistral.ai/v1"
    }
  }
}
```

## 控制台配置

在控制台进入 **Settings → Providers → Mistral**，输入 API key 和 base URL。使用 AES-256-GCM 加密存储。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| mistral-large-latest | 128k tokens | 最强大的 Mistral 模型 |
| mistral-medium-latest | 128k tokens | 性能与成本均衡 |
| mistral-small-latest | 128k tokens | 快速且实惠 |
| codestral-latest | 256k tokens | 针对代码生成优化 |
| open-mistral-7b | 32k tokens | 开放权重，成本最低 |
| open-mixtral-8x7b | 32k tokens | 开放权重 MoE 模型 |
| open-mixtral-8x22b | 64k tokens | 开放权重大型 MoE 模型 |

查看 [docs.mistral.ai/getting-started/models](https://docs.mistral.ai/getting-started/models/) 获取当前模型列表和定价。

## 工具调用

Mistral 在 `mistral-large`、`mistral-small` 和 `codestral` 上支持 function calling。GoClaw 以标准 OpenAI 格式发送工具，无需转换。较小的开放权重模型不支持工具调用。

## 流式传输

所有 Mistral 模型均支持流式传输。GoClaw 使用 `stream_options.include_usage` 在每个流结束时捕获 token 计数。

## 代码生成

对于代码密集型 agent，`codestral-latest` 针对编程任务进行了优化，拥有 256k token 上下文窗口——Mistral 产品线中最大的。直接指向该模型：

```json
{
  "provider": "mistral",
  "model": "codestral-latest"
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 在 console.mistral.ai 验证 key |
| 工具调用 `HTTP 422` | 模型不支持 function calling | 使用 mistral-large 或 mistral-small |
| `HTTP 429` | 频率限制 | GoClaw 自动重试；检查计划限制 |
| 找不到模型 | 名称已变更或已弃用 | 在 docs.mistral.ai 检查当前名称 |
| 延迟高 | 选择了大型模型 | 切换到 mistral-small-latest 以获得更快响应 |

## 下一步

- [概览](#providers-overview) — provider 架构和重试逻辑
- [Groq](#provider-groq) — 开源模型的超快推理
- [OpenRouter](#provider-openrouter) — 通过一个 key 访问 Mistral 和 100+ 其他模型

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
