# Novita AI

> OpenAI-compatible LLM provider with access to a wide range of open-source models.

## Overview

Novita AI is a cloud inference platform providing access to dozens of open-source models via an OpenAI-compatible API. GoClaw connects to Novita using the standard `OpenAIProvider`.

- **Provider type:** `novita`
- **Default API base:** `https://api.novita.ai/openai`
- **Default model:** `moonshotai/kimi-k2.5`
- **Protocol:** OpenAI-compatible (Bearer token)

## Quick Setup

### Static config (config.json)

```json
{
  "providers": {
    "novita": {
      "api_key": "your-novita-api-key"
    }
  }
}
```

The `api_base` defaults to `https://api.novita.ai/openai` — omit it unless you need to override.

### Environment variable

```
GOCLAW_NOVITA_API_KEY=your-novita-api-key
```

### Dashboard (llm_providers table)

```json
{
  "provider_type": "novita",
  "api_key": "your-novita-api-key",
  "api_base": "https://api.novita.ai/openai"
}
```

## Using Novita in an Agent

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

## What's Next

- [Provider Overview](/providers-overview)
- [Custom / OpenAI-Compatible](/provider-custom)
- [OpenRouter](/provider-openrouter) — another multi-model platform

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
