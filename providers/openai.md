# OpenAI

> Connect GoClaw to OpenAI's GPT-4o and o-series reasoning models using the standard OpenAI API.

## Overview

GoClaw uses a generic OpenAI-compatible provider (`OpenAIProvider`) for all OpenAI API requests. It supports both regular chat models (GPT-4o, GPT-4o-mini) and o-series reasoning models (o1, o3, o4-mini) that use `reasoning_effort` instead of temperature. Streaming uses SSE and includes usage stats in the final chunk via `stream_options.include_usage`.

## Prerequisites

- An OpenAI API key from [platform.openai.com](https://platform.openai.com)
- Credits or a pay-as-you-go billing plan

## config.json Setup

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-..."
    }
  }
}
```

The default base URL is `https://api.openai.com/v1`. To use a custom endpoint (e.g. a local proxy):

```json
{
  "providers": {
    "openai": {
      "api_key": "sk-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## Dashboard Setup

Go to **Settings → Providers → OpenAI** in the dashboard and enter your API key. Keys are encrypted with AES-256-GCM at rest.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| gpt-4o | 128k tokens | Best multimodal model, supports vision |
| gpt-4o-mini | 128k tokens | Faster and cheaper than gpt-4o |
| o4-mini | 200k tokens | Fast reasoning model |
| o3 | 200k tokens | Advanced reasoning |
| o1 | 200k tokens | Original reasoning model |
| o1-mini | 128k tokens | Smaller reasoning model |

## Reasoning Models (o-series)

For o-series models, set `thinking_level` in your agent options. GoClaw maps it to the `reasoning_effort` parameter automatically:

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

The `thinking_level` values map directly to `reasoning_effort`: `low`, `medium`, `high`. Reasoning token usage is tracked in `Usage.ThinkingTokens` from `completion_tokens_details.reasoning_tokens`.

## Vision

GPT-4o supports image input. Send images as base64 in the `images` field of a message. GoClaw converts them to the OpenAI `image_url` content block format automatically:

```json
{
  "role": "user",
  "content": "What's in this image?",
  "images": [
    {
      "mime_type": "image/jpeg",
      "data": "<base64-encoded-bytes>"
    }
  ]
}
```

## Tool Use

OpenAI function calling works out of the box. GoClaw converts internal tool definitions to the OpenAI wire format (with `type: "function"` wrapper and `arguments` serialized as a JSON string) before sending.

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Verify key at platform.openai.com |
| `HTTP 429` | Rate limit | GoClaw retries automatically; check your tier limits |
| `HTTP 400` on o-series | Unsupported parameter | Avoid setting `temperature` with o-series models |
| Vision not working | Model doesn't support images | Use gpt-4o or gpt-4o-mini |

## What's Next

- [OpenRouter](/provider-openrouter) — access 100+ models through one API key
- [Anthropic](/provider-anthropic) — native Claude integration
- [Overview](/providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
