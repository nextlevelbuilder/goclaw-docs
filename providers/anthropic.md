# Anthropic

> GoClaw's native Claude integration — built directly on the Anthropic HTTP+SSE API with full support for extended thinking and prompt caching.

## Overview

The Anthropic provider is a first-class, hand-written HTTP client (not a third-party SDK). It speaks the Anthropic Messages API directly, handling streaming via SSE, tool use passback, and extended thinking blocks. The default model is `claude-sonnet-4-5-20250929`. Prompt caching is always enabled — GoClaw sets `cache_control: ephemeral` on every request.

## Prerequisites

- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- Sufficient quota for the models you plan to use

## config.json Setup

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-api03-..."
    }
  }
}
```

To use a custom base URL (e.g. a proxy):

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## Dashboard Setup

In the GoClaw dashboard go to **Settings → Providers → Anthropic** and enter your API key. The key is encrypted with AES-256-GCM before being stored. Changes take effect immediately without a restart.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| claude-opus-4-5 | 200k tokens | Most capable, highest cost |
| claude-sonnet-4-5-20250929 | 200k tokens | Default — best balance of speed and quality |
| claude-haiku-4-5 | 200k tokens | Fastest, lowest cost |
| claude-opus-4 | 200k tokens | Previous generation |
| claude-sonnet-4 | 200k tokens | Previous generation |

To override the default model for a specific agent, set `model` in the agent's config.

## Extended Thinking

The Anthropic provider implements `SupportsThinking() bool` and returns `true`. When `thinking_level` is set on a request, GoClaw activates Anthropic's extended thinking feature automatically.

Token budgets by thinking level:

| Level | Budget |
|---|---|
| `low` | 4,096 tokens |
| `medium` | 10,000 tokens (default) |
| `high` | 32,000 tokens |

When thinking is enabled:
- The `anthropic-beta: interleaved-thinking-2025-05-14` header is sent
- Temperature is removed (Anthropic requires this)
- `max_tokens` is automatically raised to `budget + 8192` if the current value is too low
- Thinking blocks are preserved and passed back in tool use loops

Example agent config enabling thinking:

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

## Prompt Caching

Prompt caching is always active. GoClaw sets `cache_control: ephemeral` on the system prompt and the last user turn (corrected in v3 — previously set on every content block, which could conflict with the Anthropic API's 4-checkpoint limit). The `Usage` response includes `cache_creation_input_tokens` and `cache_read_input_tokens` so you can monitor cache hit rates in tracing.

> **v3 correction:** The prompt caching implementation was fixed to correctly target cacheable positions. Agents with long system prompts will see improved cache hit rates after upgrading.

## Model Alias Resolution

GoClaw resolves Anthropic model aliases when listing available models. When `api_base` is set (e.g. for a proxy), model listing respects the custom base URL so alias resolution works correctly with API-compatible proxies.

## Tool Use

Anthropic uses a different tool schema format than OpenAI. GoClaw translates automatically:
- Tools are sent as `input_schema` (not `parameters`)
- Tool results are wrapped in `tool_result` content blocks
- When thinking is active, raw content blocks (including thinking signatures) are preserved and echoed back in subsequent tool loop iterations — required by the Anthropic API

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Check key starts with `sk-ant-` |
| `HTTP 400` with thinking | temperature set alongside thinking | GoClaw removes temperature automatically; don't hard-code it in raw requests |
| `HTTP 529` | Anthropic overloaded | Retry logic handles this; wait and retry |
| Thinking blocks not appearing | Model doesn't support thinking | Use claude-sonnet-4-5 or claude-opus-4-5 |
| High token costs | Cache not hitting | Ensure system prompt is stable across requests |

## What's Next

- [OpenAI](/provider-openai) — GPT-4o and o-series reasoning models
- [Overview](/providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
