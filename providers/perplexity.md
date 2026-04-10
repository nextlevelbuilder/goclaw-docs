# Perplexity

Connect GoClaw to Perplexity's search-augmented AI models via their OpenAI-compatible API.

## Overview

Perplexity models combine language model generation with live web search, making them ideal for agents that need up-to-date information. GoClaw connects to Perplexity through the standard `OpenAIProvider` — the same code path used by OpenAI and Groq — so streaming and tool calls work without any special configuration.

## Setup

Add your Perplexity API key to `config.json`:

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro"
    }
  }
}
```

Store your key in `.env.local`:

```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
```

The default API base is `https://api.perplexity.ai`. GoClaw routes requests to `/chat/completions` as usual.

## Models

| Model | Notes |
|---|---|
| `sonar-pro` | Flagship search-augmented model, highest accuracy |
| `sonar` | Faster and cheaper search-augmented model |
| `sonar-reasoning` | Reasoning + search, good for complex queries |
| `sonar-reasoning-pro` | Best reasoning with live search |

Perplexity's `sonar` models automatically perform web searches before answering. You don't need to configure search separately.

## Examples

**Minimal config:**

```json
{
  "providers": {
    "perplexity": {
      "api_key": "$PERPLEXITY_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "perplexity",
      "model": "sonar-pro",
      "max_tokens": 2048
    }
  }
}
```

**Use Perplexity only for a specific agent while others use a different provider:**

```json
{
  "providers": {
    "anthropic": { "api_key": "$ANTHROPIC_API_KEY" },
    "perplexity": { "api_key": "$PERPLEXITY_API_KEY" }
  },
  "agents": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5"
    },
    "list": {
      "research-agent": {
        "provider": "perplexity",
        "model": "sonar-pro"
      }
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Verify `PERPLEXITY_API_KEY` in `.env.local` |
| Search results seem stale | Using a non-sonar model | Switch to a `sonar` variant for live web search |
| High latency | Search adds round-trip time | Expected behavior; `sonar` is faster than `sonar-pro` |
| Tool calls not supported | Perplexity sonar models don't support function calling | Use Perplexity for research tasks; handle tool calls with a different provider |

## What's Next

- [DashScope](/provider-dashscope) — Alibaba's Qwen models via OpenAI-compatible API
- [Custom Provider](/provider-custom) — connect any OpenAI-compatible API

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
