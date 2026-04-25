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

## Reasoning API

GoClaw supports a two-level reasoning configuration: provider-level defaults that apply to all agents, and per-agent overrides. This applies to o-series and GPT-5/Codex models.

### Provider-Level Defaults

Set reusable reasoning defaults on the provider itself using `settings.reasoning_defaults`. Every agent that uses this provider inherits these defaults automatically:

```json
{
  "name": "openai",
  "provider_type": "openai",
  "settings": {
    "reasoning_defaults": {
      "effort": "high",
      "fallback": "downgrade"
    }
  }
}
```

If no `reasoning_defaults` is configured on the provider, `inherit` resolves to reasoning off.

### Agent-Level Overrides

Agents can override or inherit the provider default using `reasoning.override_mode` in `other_config`:

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "inherit"
    }
  }
}
```

```json
{
  "provider": "openai",
  "other_config": {
    "reasoning": {
      "override_mode": "custom",
      "effort": "medium",
      "fallback": "off"
    }
  }
}
```

| `override_mode` | Behavior |
|---|---|
| `inherit` | Uses the provider's `reasoning_defaults` |
| `custom` | Uses the agent's own reasoning policy |

Agents without `override_mode` behave as `custom` (backward compatible).

### Effort Levels and Fallback Policy

Valid effort levels: `off`, `auto`, `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

Valid fallback values when the requested effort is not supported by the model:

| `fallback` | Behavior |
|---|---|
| `downgrade` (default) | Uses the highest supported level below the requested level |
| `off` | Disables reasoning entirely |
| `provider_default` | Falls back to the model's default effort |

### GPT-5 and Codex Effort Normalization

For known GPT-5 and Codex models, GoClaw validates and normalizes effort before sending the request. This avoids API errors when the requested level is not supported by that model variant:

| Model | Supported Levels | Default |
|---|---|---|
| gpt-5 | minimal, low, medium, high | medium |
| gpt-5.1 | none, low, medium, high | none |
| gpt-5.1-codex | low, medium, high | medium |
| gpt-5.2 | none, low, medium, high, xhigh | none |
| gpt-5.2-codex | low, medium, high, xhigh | medium |
| gpt-5.3-codex | low, medium, high, xhigh | medium |
| gpt-5.4 | none, low, medium, high, xhigh | none |
| gpt-5-mini / gpt-5.4-mini | none, low, medium, high, xhigh | none |

For unknown models (e.g. new releases), the requested effort is passed through as-is. Trace metadata exposes the resolved `source` and `effective_effort` so you can see what was actually sent.

### Legacy `thinking_level` (Backward Compat)

The earlier `options.thinking_level` key still works as a shorthand for the reasoning API:

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

This is a shim — GoClaw maps it to `reasoning_effort` internally. New configurations should use `reasoning.override_mode` with `effort` instead. Reasoning token usage is tracked in `Usage.ThinkingTokens` from `completion_tokens_details.reasoning_tokens`.

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

## Native Image Generation (OpenAI-compat)

OpenAI-compatible providers support native image generation directly via a tool object in the request:

```json
{
  "tools": [{ "type": "image_generation" }]
}
```

GoClaw reads results from `choices[0].message.images[]` (or `choices[0].delta.images[]` when streaming) — each element is a data URL of the generated image. Images are saved to `{workspace}/media/{sha256}.{ext}` with embedded PNG metadata (model, prompt, timestamp). Streaming-aware: partial image events are surfaced as the final URL once the chunk is complete.

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Verify key at platform.openai.com |
| `HTTP 429` | Rate limit | GoClaw retries automatically; check your tier limits |
| `HTTP 400` on o-series | Unsupported parameter | Avoid setting `temperature` with o-series models |
| Vision not working | Model doesn't support images | Use gpt-4o or gpt-4o-mini |

### Developer Role (GPT-4o+)

For native OpenAI endpoints (`api.openai.com`), GoClaw automatically maps the `system` role to `developer` when sending requests. The `developer` role has higher instruction priority than `system` for GPT-4o and newer models.

This mapping only applies to native OpenAI infrastructure. Other OpenAI-compatible backends (Azure OpenAI, proxies, Qwen, DeepSeek, etc.) continue to use the standard `system` role.

## What's Next

- [OpenRouter](/provider-openrouter) — access 100+ models through one API key
- [Anthropic](/provider-anthropic) — native Claude integration
- [Overview](/providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 29457bb3 | updated: 2026-04-25 -->
