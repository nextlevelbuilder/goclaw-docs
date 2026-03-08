# Mistral

> Use Mistral AI's models in GoClaw via the OpenAI-compatible API.

## Overview

GoClaw connects to Mistral AI using the generic `OpenAIProvider` pointed at Mistral's OpenAI-compatible endpoint (`https://api.mistral.ai/v1`). No special handling is required — standard chat, streaming, and tool use all work out of the box. Mistral offers a range of models from the lightweight Mistral 7B to the frontier-class Mistral Large.

## Prerequisites

- A Mistral API key from [console.mistral.ai](https://console.mistral.ai)
- A Mistral account with an active subscription or credits

## config.json Setup

```json
{
  "providers": {
    "mistral": {
      "api_key": "...",
      "api_base": "https://api.mistral.ai/v1"
    }
  }
}
```

## Managed Mode Setup

Go to **Settings → Providers → Mistral** in the dashboard and enter your API key and base URL. Stored encrypted with AES-256-GCM.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| mistral-large-latest | 128k tokens | Most capable Mistral model |
| mistral-medium-latest | 128k tokens | Balanced performance and cost |
| mistral-small-latest | 128k tokens | Fast and affordable |
| codestral-latest | 256k tokens | Optimized for code generation |
| open-mistral-7b | 32k tokens | Open-weight, lowest cost |
| open-mixtral-8x7b | 32k tokens | Open-weight MoE model |
| open-mixtral-8x22b | 64k tokens | Open-weight large MoE model |

Check [docs.mistral.ai/getting-started/models](https://docs.mistral.ai/getting-started/models/) for the current model list and pricing.

## Tool Use

Mistral supports function calling on `mistral-large`, `mistral-small`, and `codestral`. GoClaw sends tools in standard OpenAI format — no conversion needed. Smaller open-weight models do not support tool use.

## Streaming

Streaming is supported on all Mistral models. GoClaw uses `stream_options.include_usage` to capture token counts at the end of each stream.

## Code Generation

For code-heavy agents, `codestral-latest` is optimized for programming tasks and has a 256k token context window — the largest in Mistral's lineup. Point your agent at it directly:

```json
{
  "provider": "mistral",
  "model": "codestral-latest"
}
```

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Verify key at console.mistral.ai |
| `HTTP 422` on tool use | Model doesn't support function calling | Use mistral-large or mistral-small |
| `HTTP 429` | Rate limit | GoClaw retries automatically; check your plan limits |
| Model not found | Name changed or deprecated | Check current names at docs.mistral.ai |
| High latency | Large model selected | Switch to mistral-small-latest for faster responses |

## What's Next

- [Overview](./overview.md) — provider architecture and retry logic
- [Groq](./groq.md) — ultra-fast inference for open models
- [OpenRouter](./openrouter.md) — access Mistral and 100+ other models through one key
