# xAI (Grok)

Connect GoClaw to xAI's Grok models using the OpenAI-compatible API.

## Overview

xAI's Grok models are available through an OpenAI-compatible endpoint at `https://api.x.ai/v1`. GoClaw uses the same `OpenAIProvider` it shares with OpenAI, Groq, and others — you just point it at xAI's base URL with your xAI API key. All standard features work: streaming, tool calls, and thinking tokens.

## Setup

Add your xAI API key to `config.json`:

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3"
    }
  }
}
```

Store your key in `.env.local` (never in `config.json` directly):

```bash
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxx
```

GoClaw resolves `$XAI_API_KEY` from your environment at startup.

## Models

Popular Grok models you can use in the `model` field:

| Model | Notes |
|---|---|
| `grok-3` | Latest flagship model |
| `grok-3-mini` | Smaller, faster, cheaper |
| `grok-2-vision-1212` | Multimodal (images + text) |

Set the default in `agents.defaults.model`, or pass `model` per-request via the API.

## Examples

**Minimal config for Grok-3:**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "xai",
      "model": "grok-3",
      "max_tokens": 8192
    }
  }
}
```

**Custom API base (if you proxy xAI traffic):**

```json
{
  "providers": {
    "xai": {
      "api_key": "$XAI_API_KEY",
      "api_base": "https://your-proxy.example.com/xai/v1"
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Wrong or missing API key | Check `XAI_API_KEY` in `.env.local` |
| `404 Not Found` | Wrong model name | Check [xAI model list](https://docs.x.ai/docs/models) |
| Model returns no content | Context too large | Reduce `max_tokens` or shorten history |

## What's Next

- [MiniMax](/provider-minimax) — another OpenAI-compatible provider with a custom chat path
- [Custom Provider](/provider-custom) — connect any OpenAI-compatible API

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
