# MiniMax

Connect GoClaw to MiniMax models using their OpenAI-compatible API with a custom chat endpoint.

## Overview

MiniMax provides an OpenAI-compatible API, but their native endpoint path differs from the standard `/chat/completions`. GoClaw handles this automatically using a custom chat path (`/text/chatcompletion_v2`) under the hood — you just configure your API key and everything works, including streaming and tool calls.

## Setup

Add your MiniMax API key to `config.json`:

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01"
    }
  }
}
```

Store your key in `.env.local`:

```bash
MINIMAX_API_KEY=your-minimax-api-key
```

The default API base is `https://api.minimax.chat/v1` and GoClaw automatically routes to `/text/chatcompletion_v2` instead of the standard `/chat/completions`. You don't need to configure this manually.

## Custom API Base

If you use MiniMax's international endpoint:

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY",
      "api_base": "https://api.minimaxi.chat/v1"
    }
  }
}
```

## Models

| Model | Notes |
|---|---|
| `MiniMax-Text-01` | Large context (up to 1M tokens) |
| `abab6.5s-chat` | Fast, efficient general-purpose model |
| `abab5.5-chat` | Older generation, lower cost |

## Examples

**Minimal config:**

```json
{
  "providers": {
    "minimax": {
      "api_key": "$MINIMAX_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "minimax",
      "model": "MiniMax-Text-01",
      "max_tokens": 4096,
      "temperature": 0.7
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Verify `MINIMAX_API_KEY` in `.env.local` |
| `404` on chat endpoint | Wrong `api_base` region | Use the correct MiniMax endpoint for your region |
| Empty response | Model name typo | Check MiniMax docs for exact model IDs |
| Tool calls fail | Schema incompatibility | MiniMax follows OpenAI tool format; ensure your tool schemas are valid JSON Schema |

## What's Next

- [Cohere](/provider-cohere) — another OpenAI-compatible provider
- [Custom Provider](/provider-custom) — connect any OpenAI-compatible API

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
