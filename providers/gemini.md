# Gemini

> Use Google's Gemini models in GoClaw via the OpenAI-compatible endpoint.

## Overview

GoClaw connects to Google Gemini through its OpenAI-compatible API (`https://generativelanguage.googleapis.com/v1beta/openai/`). It uses the same `OpenAIProvider` implementation as OpenAI and OpenRouter, but with special handling for Gemini's tool call format. Specifically, Gemini 2.5+ requires a `thought_signature` field echoed back on every tool call — GoClaw handles this automatically.

## Prerequisites

- A Google AI Studio API key from [aistudio.google.com](https://aistudio.google.com)
- Or a Google Cloud project with Vertex AI enabled (use the Vertex endpoint as `api_base`)

## config.json Setup

```json
{
  "providers": {
    "gemini": {
      "api_key": "AIza...",
      "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/"
    }
  }
}
```

## Dashboard Setup

Go to **Settings → Providers → Gemini** in the dashboard and enter your API key and base URL. Both are stored encrypted with AES-256-GCM.

## Supported Models

| Model | Context Window | Notes |
|---|---|---|
| gemini-2.5-pro | 1M tokens | Most capable, supports thinking |
| gemini-2.5-flash | 1M tokens | Fast and cheap, supports thinking |
| gemini-2.0-flash | 1M tokens | Previous generation flash |
| gemini-1.5-pro | 2M tokens | Largest context window |
| gemini-1.5-flash | 1M tokens | Previous generation flash |

## Gemini-Specific Handling

### thought_signature passback

Gemini 2.5+ returns a `thought_signature` on tool calls. GoClaw stores this in `ToolCall.Metadata["thought_signature"]` and echoes it back in subsequent requests. This is required — sending a tool call without its signature causes an `HTTP 400`.

### Tool call collapsing

If a previous tool call in conversation history lacks a `thought_signature` (e.g. from an older model or a resumed session), GoClaw automatically collapses that tool call cycle: the assistant's tool calls are stripped, and the tool results are folded into a plain user message. This preserves context without triggering Gemini's signature validation error.

### Empty content handling

Gemini rejects assistant messages with empty `content` when tool calls are present. GoClaw omits the `content` field in that case rather than sending an empty string.

## Thinking / Reasoning

Gemini 2.5 models support extended thinking. Set `thinking_level` in your agent options:

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

GoClaw maps this to `reasoning_effort` on the request. Thinking tokens are tracked in `Usage.ThinkingTokens`.

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `HTTP 400` on tool use | Missing `thought_signature` | GoClaw handles this automatically via collapse logic |
| `HTTP 400` empty content | Empty assistant message content | GoClaw omits empty content automatically |
| `HTTP 403` | API key invalid or quota exceeded | Check key in AI Studio; verify billing |
| Model not found | Wrong model name | Check exact model IDs at [ai.google.dev](https://ai.google.dev/gemini-api/docs/models) |
| Thinking not working | Model doesn't support it | Use gemini-2.5-pro or gemini-2.5-flash |

## What's Next

- [DeepSeek](/provider-deepseek) — DeepSeek models with reasoning_content support
- [OpenRouter](/provider-openrouter) — access Gemini and 100+ other models through one key
- [Overview](/providers-overview) — provider architecture and retry logic

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
