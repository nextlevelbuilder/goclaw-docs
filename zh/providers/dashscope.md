> 翻译自 [English version](/provider-dashscope)

# DashScope（阿里通义千问）

通过 DashScope OpenAI 兼容 API 将 GoClaw 连接到阿里巴巴的 Qwen 模型。

## 概述

DashScope 是阿里巴巴的模型服务平台，提供 Qwen 系列模型。GoClaw 使用专用的 `DashScopeProvider`，在标准 OpenAI 兼容层之上增加了一个关键的变通处理：**DashScope 不支持工具调用与流式传输同时进行**。当 agent 使用工具时，GoClaw 自动回退到非流式请求，然后为调用方合成流式回调——无需任何代码改动，agent 即可正常工作。

DashScope 还通过 `thinking_level` 支持扩展思考，GoClaw 将其映射到 DashScope 特有的 `enable_thinking` 和 `thinking_budget` 参数。

## 配置

在 `config.json` 中添加 DashScope API key：

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max"
    }
  }
}
```

将 key 存储在 `.env.local` 中：

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

默认 API base 为 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`（国际端点）。若需访问中国区，将 `api_base` 设为 `https://dashscope.aliyuncs.com/compatible-mode/v1`。

## 模型

| 模型 | 备注 |
|---|---|
| `qwen3-max` | 最高精度（默认） |
| `qwen3-plus` | 性能与成本均衡 |
| `qwen3-turbo` | 最快的 Qwen3 模型 |
| `qwen3-235b-a22b` | 开放权重，MoE 架构 |
| `qwq-32b` | 扩展思考 / 推理模型 |

## 思考（扩展推理）

对于支持扩展思考的模型（如 `qwq-32b`），在 agent 选项中设置 `thinking_level`：

```json
{
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwq-32b",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw 将 `thinking_level` 映射到 DashScope 的 `thinking_budget`：

| 级别 | 预算（tokens） |
|---|---|
| `low` | 4,096 |
| `medium` | 16,384（默认） |
| `high` | 32,768 |

## 示例

**使用国际端点的最简配置：**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max",
      "max_tokens": 8192
    }
  }
}
```

**中国区端点：**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY",
      "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 无效 | 在 `.env.local` 中验证 `DASHSCOPE_API_KEY` |
| 工具调用响应慢 | 工具禁用流式传输；GoClaw 使用非流式回退 | 预期行为——DashScope 限制；响应仍会送达 |
| 思考内容缺失 | 模型不支持思考 | 使用 `qwq-32b` 或其他支持思考的模型 |
| 请求 `404` | 端点区域错误 | 根据需要将 `api_base` 设为中国区或国际端点 |

## 下一步

- [Claude CLI](/provider-claude-cli) — 调用 Claude Code CLI 二进制文件的独特 provider
- [自定义 Provider](/provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
