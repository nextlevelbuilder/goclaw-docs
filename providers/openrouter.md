# OpenRouter

> Access 100+ models from Anthropic, Google, Meta, Mistral, and more through a single API key.

## Overview

OpenRouter is an LLM aggregator that exposes a unified OpenAI-compatible endpoint. GoClaw uses the same `OpenAIProvider` implementation for OpenRouter, with one important difference: model IDs must include a provider prefix (e.g. `anthropic/claude-sonnet-4-5-20250929`). If you pass an unprefixed model name, GoClaw falls back to the configured default model automatically.

## Prerequisites

- An OpenRouter API key from [openrouter.ai](https://openrouter.ai)
- Credits loaded on your OpenRouter account

## config.json Setup

```json
{
  "providers": {
    "openrouter": {
      "api_key": "sk-or-v1-..."
    }
  }
}
```

The default base URL is `https://openrouter.ai/api/v1`. You do not need to set `api_base` unless you are using a proxy.

## Dashboard Setup

Go to **Settings → Providers → OpenRouter** in the dashboard and paste your API key. It is encrypted with AES-256-GCM before storage.

## Model ID Format

OpenRouter requires model IDs in the format `provider/model-name`. Examples:

| Provider | Model ID |
|---|---|
| Anthropic Claude Sonnet | `anthropic/claude-sonnet-4-5-20250929` |
| Anthropic Claude Opus | `anthropic/claude-opus-4-5` |
| Google Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Meta Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` |
| Mistral Large | `mistralai/mistral-large` |
| DeepSeek R1 | `deepseek/deepseek-r1` |

Browse all available models at [openrouter.ai/models](https://openrouter.ai/models).

## resolveModel Behavior

GoClaw's `resolveModel()` logic applies specifically to OpenRouter:

- If the model string contains `/` → use it as-is
- If the model string has no `/` → fall back to the provider's configured default model

This prevents sending bare model names (like `claude-sonnet-4-5`) that OpenRouter would reject.

To set a default model for OpenRouter in your agent config:

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4-5-20250929"
}
```

## Supported Features

OpenRouter passes through most features to the underlying model provider. Availability depends on the model:

| Feature | Notes |
|---|---|
| Streaming | Supported for all models |
| Tool use / function calling | Supported for most models |
| Vision | Depends on model (e.g. GPT-4o, Claude Sonnet) |
| Reasoning / thinking | Depends on model (e.g. DeepSeek R1, o3) |
| Usage stats | Returned in final streaming chunk |

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Check key starts with `sk-or-` |
| Model not found | Missing provider prefix | Use `provider/model-name` format |
| Unprefixed model falls back to default | `resolveModel()` behavior | Always include `/` in model IDs for OpenRouter |
| `HTTP 402` | Insufficient credits | Top up your OpenRouter account |
| Feature not supported | Underlying model limitation | Check model capabilities at openrouter.ai/models |

## What's Next

- [Gemini](#provider-gemini) — Google Gemini directly via OpenAI-compatible endpoint
- [OpenAI](#provider-openai) — direct OpenAI integration
- [Overview](#providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
