> 翻译自 [English version](#provider-yescale)

# YesScale

> 通过 YesScale 的云 AI 平台大规模运行 AI 模型。

🚧 **本页面正在建设中。** 内容即将推出——欢迎贡献！

## 概述

YesScale 是一个云 AI 平台，通过 OpenAI 兼容 API 提供多种语言模型访问。GoClaw 使用标准 `OpenAIProvider` 连接 YesScale。

## Provider 类型

```json
{
  "providers": {
    "yescale": {
      "provider_type": "yescale",
      "api_key": "your-yescale-api-key",
      "api_base": "https://api.yescale.io/v1"
    }
  }
}
```

## 下一步

- [Provider 概览](#providers-overview)
- [自定义 / OpenAI 兼容](#provider-custom)
- [OpenRouter](#provider-openrouter) — 另一个多模型平台

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
