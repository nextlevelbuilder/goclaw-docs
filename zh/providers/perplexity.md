> 翻译自 [English version](/provider-perplexity)

# Perplexity

通过 OpenAI 兼容 API 将 GoClaw 连接到 Perplexity 的搜索增强 AI 模型。

## 概述

Perplexity 模型将语言模型生成与实时网络搜索结合，非常适合需要最新信息的 agent。GoClaw 通过标准 `OpenAIProvider` 连接 Perplexity——与 OpenAI 和 Groq 使用相同的代码路径——无需任何特殊配置，流式传输和工具调用均可正常工作。

## 配置

在 `config.json` 中添加 Perplexity API key：

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro"
    }
  }
}
```

将 key 存储在 `.env.local` 中：

```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
```

默认 API base 为 `https://api.perplexity.ai`，GoClaw 照常将请求路由到 `/chat/completions`。

## 模型

| 模型 | 备注 |
|---|---|
| `sonar-pro` | 旗舰搜索增强模型，精度最高 |
| `sonar` | 更快更便宜的搜索增强模型 |
| `sonar-reasoning` | 推理 + 搜索，适合复杂查询 |
| `sonar-reasoning-pro` | 带实时搜索的最佳推理 |

Perplexity 的 `sonar` 模型在回答前自动执行网络搜索，无需单独配置搜索功能。

## 示例

**最简配置：**

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro",
      "max_tokens": 2048
    }
  }
}
```

**仅对特定 agent 使用 Perplexity，其他 agent 使用不同 provider：**

```json
{
  "providers": {
    "anthropic": { "api_key": "$ANTHROPIC_API_KEY" },
    "perplexity": { "api_key": "$PERPLEXITY_API_KEY" }
  },
  "agents": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5"
    },
    "list": {
      "research-agent": {
        "provider": "perplexity",
        "model": "sonar-pro"
      }
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 无效 | 在 `.env.local` 中验证 `PERPLEXITY_API_KEY` |
| 搜索结果过时 | 使用了非 sonar 模型 | 切换到 `sonar` 系列以获得实时网络搜索 |
| 延迟高 | 搜索增加了往返时间 | 这是预期行为；`sonar` 比 `sonar-pro` 更快 |
| 工具调用不支持 | Perplexity sonar 模型不支持 function calling | 将 Perplexity 用于研究任务；工具调用交由其他 provider 处理 |

## 下一步

- [DashScope](/provider-dashscope) — 阿里巴巴通过 OpenAI 兼容 API 提供的 Qwen 模型
- [自定义 Provider](/provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
