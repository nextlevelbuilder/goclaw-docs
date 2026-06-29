> 翻译自 [English version](/provider-bailian)

# 百炼

> 通过 OpenAI 兼容端点连接阿里云百炼（Bailian）Coding 模型。

## 概述

百炼是阿里云的 AI 模型平台。GoClaw 使用 OpenAI 兼容 API 格式连接到其 **Coding** 端点。`bailian` provider 类型**与 `dashscope` 分离**——它们是不同的端点，具有不同的 base URL 和不同的模型目录。DashScope 的 `enable_thinking`/`thinking_budget` 注入路径**不**适用于百炼；百炼被当作纯 OpenAI 兼容 provider 处理。

- **Provider 类型：** `bailian`
- **默认模型：** `qwen3.5-plus`
- **默认 API base：** `https://coding-intl.dashscope.aliyuncs.com/v1`

## 配置

将你的百炼 API key 添加到 `config.json` 的 `bailian` provider 块中：

```json
{
  "providers": {
    "bailian": {
      "api_key": "$GOCLAW_BAILIAN_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "bailian",
      "model": "qwen3.5-plus"
    }
  }
}
```

将 key 存放在 `.env.local`：

```bash
GOCLAW_BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

`api_base` 字段为可选——默认为 `https://coding-intl.dashscope.aliyuncs.com/v1`。你也可以从 dashboard（**Settings → Providers**）添加百炼；key 在存储时使用 AES-256-GCM 加密。

## 模型

百炼 Coding 平台**不**提供标准的 `/v1/models` 端点，因此 GoClaw 内置了一个**硬编码目录**。以下模型可用：

| 模型 | 备注 |
|---|---|
| `qwen3.7-plus` | Qwen 3.7 Plus——文本生成、深度思考、视觉理解 |
| `qwen3.6-plus` | Qwen 3.6 Plus |
| `qwen3.5-plus` | Qwen 3.5 Plus（默认） |
| `kimi-k2.5` | Kimi K2.5 |
| `GLM-5` | GLM-5 |
| `MiniMax-M2.5` | MiniMax M2.5 |
| `qwen3-max-2026-01-23` | Qwen 3 Max (2026-01-23) |
| `qwen3-coder-next` | Qwen 3 Coder Next |
| `qwen3-coder-plus` | Qwen 3 Coder Plus |
| `glm-4.7` | GLM 4.7 |

## 百炼 vs DashScope

两者都连接阿里基础设施，但是不同的 provider：

| | `bailian` | `dashscope` |
|---|---|---|
| 端点 | `https://coding-intl.dashscope.aliyuncs.com/v1` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 默认模型 | `qwen3.5-plus` | `qwen3-max` |
| 模型列表 | 硬编码目录（无 `/v1/models`） | 实时列出 |
| 思考注入 | 无（纯 OpenAI 兼容） | `enable_thinking` + `thinking_budget` |

如果你想要 DashScope 风格的扩展思考，请改用 [DashScope](/provider-dashscope) provider。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | API key 无效 | 验证 `.env.local` 中的 `GOCLAW_BAILIAN_API_KEY` |
| 模型未列出 | 目录为硬编码 | 使用上表中的模型 ID；Coding API 没有 `/v1/models` 端点 |
| 思考无效 | 百炼是纯 OpenAI 兼容 | DashScope 思考注入不适用；使用 `dashscope` provider 以获得 `enable_thinking` |

## 下一步

- [Provider 概览](/providers-overview)
- [DashScope（通义千问）](/provider-dashscope) — 支持思考的阿里 Qwen 模型
- [Kimi Coding](/provider-kimi) — Moonshot Kimi Coding 端点

<!-- goclaw-source: fabe86b3 | updated: 2026-06-29 -->
