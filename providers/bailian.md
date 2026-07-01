# Bailian

> Connect to Alibaba Cloud Bailian (百炼) Coding models via the OpenAI-compatible endpoint.

## Overview

Bailian is Alibaba Cloud's AI model platform. GoClaw connects to its **Coding** endpoint using the OpenAI-compatible API format. The `bailian` provider type is **distinct from `dashscope`** — they are separate endpoints with different base URLs and different model catalogs. The DashScope `enable_thinking`/`thinking_budget` injection path does **not** apply to Bailian; Bailian is treated as a plain OpenAI-compatible provider.

- **Provider type:** `bailian`
- **Default model:** `qwen3.5-plus`
- **Default API base:** `https://coding-intl.dashscope.aliyuncs.com/v1`

## Setup

Add your Bailian API key to `config.json` under the `bailian` provider block:

```json
{
  "providers": {
    "bailian": {
      "api_key": "$GOCLAW_BAILIAN_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "bailian",
      "model": "qwen3.5-plus"
    }
  }
}
```

Store your key in `.env.local`:

```bash
GOCLAW_BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

The `api_base` field is optional — it defaults to `https://coding-intl.dashscope.aliyuncs.com/v1`. You can also add Bailian from the dashboard (**Settings → Providers**); keys are encrypted with AES-256-GCM at rest.

## Models

The Bailian Coding platform does **not** expose a standard `/v1/models` endpoint, so GoClaw ships a **hardcoded catalog**. The following models are available:

| Model | Notes |
|---|---|
| `qwen3.7-plus` | Qwen 3.7 Plus — Text Generation, Deep Thinking, Visual Understanding |
| `qwen3.6-plus` | Qwen 3.6 Plus |
| `qwen3.5-plus` | Qwen 3.5 Plus (default) |
| `kimi-k2.5` | Kimi K2.5 |
| `GLM-5` | GLM-5 |
| `MiniMax-M2.5` | MiniMax M2.5 |
| `qwen3-max-2026-01-23` | Qwen 3 Max (2026-01-23) |
| `qwen3-coder-next` | Qwen 3 Coder Next |
| `qwen3-coder-plus` | Qwen 3 Coder Plus |
| `glm-4.7` | GLM 4.7 |

## Bailian vs DashScope

Both connect to Alibaba infrastructure, but they are different providers:

| | `bailian` | `dashscope` |
|---|---|---|
| Endpoint | `https://coding-intl.dashscope.aliyuncs.com/v1` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Default model | `qwen3.5-plus` | `qwen3-max` |
| Model listing | Hardcoded catalog (no `/v1/models`) | Live listing |
| Thinking injection | None (plain OpenAI-compatible) | `enable_thinking` + `thinking_budget` |

If you want DashScope-style extended thinking, use the [DashScope](/provider-dashscope) provider instead.

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Verify `GOCLAW_BAILIAN_API_KEY` in `.env.local` |
| Model not listed | Catalog is hardcoded | Use a model ID from the table above; the Coding API has no `/v1/models` endpoint |
| Thinking has no effect | Bailian is plain OpenAI-compatible | DashScope thinking injection does not apply; use the `dashscope` provider for `enable_thinking` |

## What's Next

- [Provider Overview](/providers-overview)
- [DashScope (Qwen)](/provider-dashscope) — Alibaba Qwen models with thinking support
- [Kimi Coding](/provider-kimi) — Moonshot Kimi Coding endpoint

<!-- goclaw-source: fabe86b3 | updated: 2026-06-28 -->
