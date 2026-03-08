# Cohere

Connect GoClaw to Cohere's Command models using their OpenAI-compatible API.

## Overview

Cohere offers an OpenAI-compatible endpoint, which means GoClaw's standard `OpenAIProvider` handles all communication — streaming, tool calls, and usage tracking work out of the box. Cohere's Command R and Command R+ models are particularly strong at retrieval-augmented generation (RAG) and tool use.

## Setup

Add your Cohere API key to `config.json`:

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus"
    }
  }
}
```

Store your key in `.env.local`:

```bash
COHERE_API_KEY=your-cohere-api-key
```

The default API base is `https://api.cohere.com/compatibility/v1`. GoClaw sets this automatically when you configure the `cohere` provider.

## Models

| Model | Notes |
|---|---|
| `command-r-plus` | Best accuracy, best for complex tasks and RAG |
| `command-r` | Balanced performance and cost |
| `command-light` | Fastest and cheapest, good for simple tasks |

## Examples

**Minimal config:**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "cohere",
      "model": "command-r-plus",
      "max_tokens": 4096
    }
  }
}
```

**Custom API base (if you proxy Cohere):**

```json
{
  "providers": {
    "cohere": {
      "api_key": "$COHERE_API_KEY",
      "api_base": "https://your-proxy.example.com/cohere/v1"
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Missing or invalid API key | Check `COHERE_API_KEY` in `.env.local` |
| `model not found` | Wrong model ID | Use exact model IDs from [Cohere docs](https://docs.cohere.com/docs/models) |
| Tool calls return errors | Schema issues | Cohere's tool format is OpenAI-compatible; verify your tool parameter schemas |
| Slow responses | Large context window | Command R models are slower on long contexts; consider `command-light` for speed |

## What's Next

- [Perplexity](./perplexity.md) — search-augmented AI via OpenAI-compatible API
- [Custom Provider](./custom-provider.md) — connect any OpenAI-compatible API
