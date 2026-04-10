# DashScope (Alibaba Qwen)

Connect GoClaw to Alibaba's Qwen models via the DashScope OpenAI-compatible API.

## Overview

DashScope is Alibaba's model serving platform, offering the Qwen family of models. GoClaw uses a dedicated `DashScopeProvider` that wraps the standard OpenAI-compatible layer and adds one critical workaround: **DashScope does not support tool calls and streaming simultaneously**. When your agent uses tools, GoClaw automatically falls back to a non-streaming request and then synthesizes streaming callbacks for the caller — so your agent works correctly without any code changes.

DashScope also supports extended thinking via `thinking_level`, which GoClaw maps to DashScope-specific `enable_thinking` and `thinking_budget` parameters.

## Setup

Add your DashScope API key to `config.json`:

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max"
    }
  }
}
```

Store your key in `.env.local`:

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

The default API base is `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (international endpoint). For China-region access, set `api_base` to `https://dashscope.aliyuncs.com/compatible-mode/v1`.

## Models

| Model | Notes |
|---|---|
| `qwen3-max` | Best accuracy (default) |
| `qwen3-plus` | Balanced performance and cost |
| `qwen3-turbo` | Fastest Qwen3 model |
| `qwen3-235b-a22b` | Open-weight, MoE architecture |
| `qwq-32b` | Extended thinking / reasoning model |
| `qwen3.5-max` | Qwen 3.5 series, highest capability |
| `qwen3.5-plus` | Qwen 3.5 series, balanced |
| `qwen3.5-turbo` | Qwen 3.5 series, fastest |

## Per-Model Thinking Guard

GoClaw uses a simplified per-model guard to decide whether to send `enable_thinking` and `thinking_budget` parameters. Only models that actually support extended thinking receive these parameters — other models silently ignore the `thinking_level` setting. In v3, this logic was simplified (previously had redundant checks that could cause incorrect behavior for some model names).

**Models that support thinking:** `qwq-32b`, and Qwen 3.5 series models with thinking capability.

## Thinking (Extended Reasoning)

For models that support extended thinking (like `qwq-32b`), set `thinking_level` in your agent options:

```json
{
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwq-32b",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw maps `thinking_level` to DashScope's `thinking_budget`:

| Level | Budget (tokens) |
|---|---|
| `low` | 4,096 |
| `medium` | 16,384 (default) |
| `high` | 32,768 |

## Examples

**Minimal config with international endpoint:**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max",
      "max_tokens": 8192
    }
  }
}
```

**China-region endpoint:**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY",
      "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Verify `DASHSCOPE_API_KEY` in `.env.local` |
| Slow tool call responses | Tools disable streaming; GoClaw uses non-streaming fallback | Expected — DashScope limitation; response is still delivered |
| Thinking content missing | Model doesn't support thinking | Use `qwq-32b` or another thinking-capable model |
| `404` on requests | Wrong region endpoint | Set `api_base` to China or international endpoint as appropriate |

## What's Next

- [Claude CLI](/provider-claude-cli) — unique provider that shells out to the Claude Code CLI binary
- [Custom Provider](/provider-custom) — connect any OpenAI-compatible API

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
