> 翻译自 [English version](#provider-xai)

# xAI (Grok)

通过 OpenAI 兼容 API 将 GoClaw 连接到 xAI 的 Grok 模型。

## 概述

xAI 的 Grok 模型通过 `https://api.x.ai/v1` 提供 OpenAI 兼容端点。GoClaw 使用与 OpenAI、Groq 等共享的同一 `OpenAIProvider`——只需将其指向 xAI 的 base URL 并配置 xAI API key。所有标准功能均可用：流式传输、工具调用和思考 token。

## 配置

在 `config.json` 中添加 xAI API key：

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3"
    }
  }
}
```

将 key 存储在 `.env.local` 中（不要直接写入 `config.json`）：

```bash
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxx
```

GoClaw 在启动时从环境变量中解析 `$XAI_API_KEY`。

## 模型

可在 `model` 字段中使用的常用 Grok 模型：

| 模型 | 备注 |
|---|---|
| `grok-3` | 最新旗舰模型 |
| `grok-3-mini` | 更小、更快、更便宜 |
| `grok-2-vision-1212` | 多模态（图像 + 文本） |

在 `agents.defaults.model` 中设置默认值，或通过 API 在每个请求中传入 `model`。

## 示例

**Grok-3 最简配置：**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3",
      "max_tokens": 8192
    }
  }
}
```

**自定义 API base（若代理 xAI 流量）：**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY",
      "api_base": "https://your-proxy.example.com/xai/v1"
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 错误或缺失 | 检查 `.env.local` 中的 `XAI_API_KEY` |
| `404 Not Found` | 模型名称错误 | 查看 [xAI 模型列表](https://docs.x.ai/docs/models) |
| 模型无内容返回 | 上下文过长 | 减小 `max_tokens` 或缩短历史记录 |

## 下一步

- [MiniMax](#provider-minimax) — 另一个带自定义 chat 路径的 OpenAI 兼容 provider
- [自定义 Provider](#provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
