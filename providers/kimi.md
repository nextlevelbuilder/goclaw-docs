# Kimi Coding (Moonshot)

> Connect GoClaw to Moonshot's Kimi Coding models via the OpenAI-compatible Coding endpoint.

## Overview

Kimi Coding is Moonshot AI's coding-focused endpoint. GoClaw connects to it as an OpenAI-compatible provider (`provider_type: "kimi_coding"`), reusing the standard `OpenAIProvider` with three Kimi-specific adjustments wired in automatically: a **fixed `User-Agent` header**, a **temperature lock**, and **mandatory `reasoning_content`** on assistant tool-call messages. You don't configure any of these — GoClaw handles them so your agent works out of the box.

- **Provider type:** `kimi_coding`
- **Default model:** `kimi-k2-turbo-preview`
- **Default API base:** `https://api.kimi.com/coding/v1`

## Setup

Kimi Coding is added from the **dashboard** (it has no static `config.json` provider block). In the GoClaw dashboard:

1. Go to **Settings → Providers → Add**
2. Choose **"Kimi Coding (Moonshot)"** — the API base is pre-filled with `https://api.kimi.com/coding/v1`
3. Paste your Kimi API key
4. Save — the key is encrypted with AES-256-GCM at rest, and changes take effect on the next request

Then point an agent at it:

```json
{
  "agents": {
    "defaults": {
      "provider": "kimi",
      "model": "kimi-k2-turbo-preview"
    }
  }
}
```

> Use the **name** you gave the provider when you created it (e.g. `kimi`) as the agent's `provider` value. The `provider_type` (`kimi_coding`) is the immutable type selected from the dropdown.

## Models

| Model | Notes |
|---|---|
| `kimi-k2-turbo-preview` | Default — server-side thinking is on by default |

The API base defaults to `https://api.kimi.com/coding/v1` if you leave it blank.

## Non-Standard Behaviors

Kimi Coding has three quirks that upstream enforces strictly. GoClaw handles all of them for you.

### 1. Fixed `User-Agent`

Every request — including the model-listing call — is sent with a fixed header `User-Agent: claude-code/0.1.0`. Upstream rejects requests that don't carry this exact User-Agent. GoClaw injects it automatically via the provider's extra headers; you don't set it.

### 2. Temperature lock

The Kimi server locks `temperature` to `1` and rejects any override. GoClaw therefore **omits `temperature`** from the request body for `kimi_coding` providers (the same treatment given to OpenAI `o1`/`o3`/`o4` and `gpt-5-mini`/`gpt-5-nano`). Passing a temperature value to the raw API returns `HTTP 400 invalid temperature: only 1 is allowed for this model`.

### 3. `reasoning_content` required on tool calls

`kimi-k2-turbo-preview` has server-side thinking enabled by default. When an assistant message that contains `tool_calls` is replayed in conversation history, it **must** carry a `reasoning_content` field — otherwise upstream returns `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N`. GoClaw preserves captured reasoning when it has it, and emits an **empty `reasoning_content` string** when none was captured, so multi-turn tool loops keep working.

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `HTTP 400 invalid temperature: only 1 is allowed for this model` | A temperature override was sent | GoClaw omits `temperature` for `kimi_coding` automatically; don't hard-code it in raw requests |
| `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N` | Replayed tool-call message lacks `reasoning_content` | GoClaw auto-emits an empty `reasoning_content`; ensure assistant history isn't stripped of the field |
| Requests rejected / 4xx on every call | Missing or altered `User-Agent` | GoClaw sends `claude-code/0.1.0` automatically; don't override the User-Agent header |
| `401 Unauthorized` | Invalid API key | Re-enter the Kimi key in Settings → Providers |

## What's Next

- [Provider Overview](/providers-overview) — provider architecture and retry logic
- [Extended Thinking](/extended-thinking) — how thinking and `reasoning_content` work across providers
- [DashScope (Qwen)](/provider-dashscope) — Alibaba Qwen models with thinking support

<!-- goclaw-source: fabe86b3 | updated: 2026-06-28 -->
