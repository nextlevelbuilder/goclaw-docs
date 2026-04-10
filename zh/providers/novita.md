> 翻译自 [English version](/provider-novita)

# Novita AI

> 支持多种开源模型的 OpenAI 兼容 LLM 服务商。

## 概述

Novita AI 是一个云推理平台，通过 OpenAI 兼容 API 提供数十种开源模型访问。GoClaw 使用标准 `OpenAIProvider` 连接 Novita。

- **Provider 类型：** `novita`
- **默认 API base：** `https://api.novita.ai/openai`
- **默认模型：** `moonshotai/kimi-k2.5`
- **协议：** OpenAI 兼容（Bearer token）

## 快速配置

### 静态配置（config.json）

```json
{
  "providers": {
    "novita": {
      "api_key": "your-novita-api-key"
    }
  }
}
```

`api_base` 默认为 `https://api.novita.ai/openai`——除非需要覆盖，否则可省略。

### 环境变量

```
GOCLAW_NOVITA_API_KEY=your-novita-api-key
```

### 控制台（llm_providers 表）

```json
{
  "provider_type": "novita",
  "api_key": "your-novita-api-key",
  "api_base": "https://api.novita.ai/openai"
}
```

## 在 Agent 中使用 Novita

```json
{
  "agents": {
    "defaults": {
      "provider": "novita",
      "model": "moonshotai/kimi-k2.5"
    }
  }
}
```

## 下一步

- [Provider 概览](/providers-overview)
- [自定义 / OpenAI 兼容](/provider-custom)
- [OpenRouter](/provider-openrouter) — 另一个多模型平台

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
