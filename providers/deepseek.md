# DeepSeek

> Run DeepSeek's powerful reasoning models in GoClaw, with full support for reasoning_content streaming.

## Overview

GoClaw connects to DeepSeek via its OpenAI-compatible API using the generic `OpenAIProvider`. DeepSeek's reasoning models (R1 series) return a separate `reasoning_content` field alongside the standard response content. GoClaw captures this as `Thinking` in the response, and echoes it back as `reasoning_content` on subsequent assistant messages — which DeepSeek requires for correct multi-turn reasoning behavior.

## Prerequisites

- A DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com)
- Credits loaded on your DeepSeek account

## config.json Setup

```json
{
  "providers": {
    "deepseek": {
      "api_key": "sk-...",
      "api_base": "https://api.deepseek.com/v1"
    }
  }
}
```

## Dashboard Setup

Go to **Settings → Providers → DeepSeek** in the dashboard and enter your API key and base URL. Stored encrypted with AES-256-GCM.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| deepseek-chat | 64k tokens | General-purpose chat model (DeepSeek V3) |
| deepseek-reasoner | 64k tokens | R1 reasoning model, returns reasoning_content |

## reasoning_content Support

DeepSeek's R1 model returns thinking as a separate `reasoning_content` field in the response delta. GoClaw handles this in both streaming and non-streaming modes:

- **Streaming:** `delta.reasoning_content` is captured and fired as `StreamChunk{Thinking: ...}` callbacks, then stored in `ChatResponse.Thinking`
- **Non-streaming:** `message.reasoning_content` is mapped to `ChatResponse.Thinking`

On the next turn, GoClaw automatically includes the previous assistant's thinking as `reasoning_content` in the request message — required by DeepSeek for the model to maintain its reasoning chain across turns.

To enable the reasoning model:

```json
{
  "provider": "deepseek",
  "model": "deepseek-reasoner"
}
```

You can also set `thinking_level` to control reasoning effort (maps to `reasoning_effort`):

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

## Tool Use

DeepSeek supports function calling with the standard OpenAI tool format. Tool call arguments arrive as a JSON string and are parsed by GoClaw before being passed to the tool handler.

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 401` | Invalid API key | Verify key at platform.deepseek.com |
| `HTTP 402` | Insufficient credits | Top up your DeepSeek account |
| Reasoning content missing | Using deepseek-chat instead of deepseek-reasoner | Switch model to `deepseek-reasoner` |
| Multi-turn reasoning degrades | reasoning_content not echoed | GoClaw handles this automatically — ensure you're using the built-in agent loop |
| `HTTP 429` | Rate limit | GoClaw retries automatically with exponential backoff |

## What's Next

- [Groq](#provider-groq) — ultra-fast inference for open models
- [Gemini](#provider-gemini) — Google Gemini models
- [Overview](#providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
