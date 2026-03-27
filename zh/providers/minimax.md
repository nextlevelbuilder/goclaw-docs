> 翻译自 [English version](#provider-minimax)

# MiniMax

通过 OpenAI 兼容 API 将 GoClaw 连接到 MiniMax 模型，使用自定义 chat 端点。

## 概述

MiniMax 提供 OpenAI 兼容 API，但其原生端点路径与标准 `/chat/completions` 不同。GoClaw 在底层自动处理自定义 chat 路径（`/text/chatcompletion_v2`）——只需配置 API key，包括流式传输和工具调用在内的一切功能均可正常工作。

## 配置

在 `config.json` 中添加 MiniMax API key：

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01"
    }
  }
}
```

将 key 存储在 `.env.local` 中：

```bash
MINIMAX_API_KEY=your-minimax-api-key
```

默认 API base 为 `https://api.minimax.chat/v1`，GoClaw 自动路由到 `/text/chatcompletion_v2` 而非标准 `/chat/completions`，无需手动配置。

## 自定义 API Base

若使用 MiniMax 的国际端点：

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY",
      "api_base": "https://api.minimaxi.chat/v1"
    }
  }
}
```

## 模型

| 模型 | 备注 |
|---|---|
| `MiniMax-Text-01` | 大上下文（最多 1M tokens） |
| `abab6.5s-chat` | 快速高效的通用模型 |
| `abab5.5-chat` | 旧一代，成本较低 |

## 示例

**最简配置：**

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01",
      "max_tokens": 4096,
      "temperature": 0.7
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 无效 | 在 `.env.local` 中验证 `MINIMAX_API_KEY` |
| chat 端点 `404` | `api_base` 区域错误 | 使用适合你所在区域的 MiniMax 端点 |
| 空响应 | 模型名称拼写错误 | 查阅 MiniMax 文档获取准确的模型 ID |
| 工具调用失败 | Schema 不兼容 | MiniMax 遵循 OpenAI 工具格式；确保工具 schema 是有效的 JSON Schema |

## 下一步

- [Cohere](#provider-cohere) — 另一个 OpenAI 兼容 provider
- [自定义 Provider](#provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
