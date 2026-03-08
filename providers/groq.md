# Groq

> Run open-source models at exceptional speed using Groq's LPU inference hardware.

## Overview

Groq provides an OpenAI-compatible API that delivers dramatically faster token generation than GPU-based providers — often 10–20x faster for supported models. GoClaw connects to Groq using the standard `OpenAIProvider` with no special handling required. The base URL points to `https://api.groq.com/openai/v1`.

## Prerequisites

- A Groq API key from [console.groq.com](https://console.groq.com)
- Groq's free tier is generous; paid plans available for higher rate limits

## config.json Setup

```json
{
  "providers": {
    "groq": {
      "api_key": "gsk_...",
      "api_base": "https://api.groq.com/openai/v1"
    }
  }
}
```

## Managed Mode Setup

Go to **Settings → Providers → Groq** in the dashboard and enter your API key and base URL. Stored encrypted with AES-256-GCM.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| llama-3.3-70b-versatile | 128k tokens | Best quality on Groq |
| llama-3.1-8b-instant | 128k tokens | Fastest, lowest latency |
| llama3-70b-8192 | 8k tokens | Previous generation 70B |
| llama3-8b-8192 | 8k tokens | Previous generation 8B |
| mixtral-8x7b-32768 | 32k tokens | Mixtral MoE model |
| gemma2-9b-it | 8k tokens | Google Gemma 2 |

Check [console.groq.com/docs/models](https://console.groq.com/docs/models) for the full and up-to-date list — Groq frequently adds new models.

## When to Use Groq

Groq excels at latency-sensitive workloads:

- **Interactive agents** where response speed matters more than raw capability
- **High-throughput pipelines** that process many short requests
- **Prototyping** where fast iteration beats per-token cost

For complex reasoning or very long contexts, consider [Anthropic](./anthropic.md) or [OpenAI](./openai.md) instead.

## Tool Use

Groq supports function calling on most models. GoClaw sends tools in standard OpenAI format. Note that tool call support varies by model — check Groq's model docs for the specific model you're using.

## Streaming

Streaming works via standard OpenAI SSE. GoClaw includes `stream_options.include_usage` in all streaming requests to capture token counts in the final chunk.

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Verify key starts with `gsk_` |
| `HTTP 429` | Rate limit (tokens per minute) | GoClaw retries; reduce concurrency or upgrade plan |
| Model not found | Model deprecated or name changed | Check current model list at console.groq.com |
| Tool calls not working | Model doesn't support function calling | Switch to llama-3.3-70b-versatile |
| Short context window | Older model selected | Use llama-3.3-70b-versatile (128k) |

## What's Next

- [Mistral](./mistral.md) — Mistral AI models
- [DeepSeek](./deepseek.md) — reasoning models with thinking content
- [Overview](./overview.md) — provider architecture and retry logic
