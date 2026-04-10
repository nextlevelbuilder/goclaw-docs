> 翻译自 [English version](/provider-cohere)

# Cohere

通过 OpenAI 兼容 API 将 GoClaw 连接到 Cohere 的 Command 模型。

## 概述

Cohere 提供 OpenAI 兼容端点，GoClaw 的标准 `OpenAIProvider` 可处理所有通信——流式传输、工具调用和用量追踪均开箱即用。Cohere 的 Command R 和 Command R+ 模型在检索增强生成（RAG）和工具使用方面尤为出色。

## 配置

在 `config.json` 中添加 Cohere API key：

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus"
    }
  }
}
```

将 key 存储在 `.env.local` 中：

```bash
COHERE_API_KEY=your-cohere-api-key
```

默认 API base 为 `https://api.cohere.com/compatibility/v1`，配置 `cohere` provider 时 GoClaw 自动设置。

## 模型

| 模型 | 备注 |
|---|---|
| `command-r-plus` | 最高精度，适合复杂任务和 RAG |
| `command-r` | 性能与成本均衡 |
| `command-light` | 最快最便宜，适合简单任务 |

## 示例

**最简配置：**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus",
      "max_tokens": 4096
    }
  }
}
```

**自定义 API base（若代理 Cohere）：**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY",
      "api_base": "https://your-proxy.example.com/cohere/v1"
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 缺失或无效 | 在 `.env.local` 中检查 `COHERE_API_KEY` |
| `model not found` | 模型 ID 错误 | 使用 [Cohere 文档](https://docs.cohere.com/docs/models)中的准确模型 ID |
| 工具调用返回错误 | Schema 问题 | Cohere 的工具格式兼容 OpenAI；验证工具参数 schema |
| 响应慢 | 上下文窗口过大 | Command R 模型在长上下文下较慢；考虑用 `command-light` 提速 |

## 下一步

- [Perplexity](/provider-perplexity) — 通过 OpenAI 兼容 API 使用搜索增强 AI
- [自定义 Provider](/provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
