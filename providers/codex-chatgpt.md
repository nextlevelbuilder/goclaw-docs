# Codex / ChatGPT (OAuth)

Use your ChatGPT subscription to power GoClaw agents via the OpenAI Responses API and OAuth authentication.

## Overview

The Codex provider lets you use your existing ChatGPT Plus or Pro subscription with GoClaw — no separate API key purchase required. GoClaw authenticates via OAuth using OpenAI's PKCE flow, stores the refresh token securely in the database, and automatically refreshes the access token before it expires.

Under the hood, GoClaw uses the **OpenAI Responses API** (`POST /codex/responses`) rather than the standard chat completions endpoint. This API supports streaming, tool calls, and reasoning output. The provider is registered as `openai-codex` by default.

## How Authentication Works

1. You trigger the OAuth flow through GoClaw's web UI (Settings → Providers → ChatGPT)
2. GoClaw opens a browser at `https://auth.openai.com/oauth/authorize`
3. You log in with your ChatGPT account and approve access
4. OpenAI redirects to `http://localhost:1455/auth/callback` with an authorization code
5. GoClaw exchanges the code for access + refresh tokens and stores them encrypted in the database
6. From that point on, GoClaw automatically uses and refreshes the token — no manual steps needed

## Setup

You do not add this provider to `config.json` manually. Instead:

1. Start GoClaw: `./goclaw`
2. Open the web dashboard
3. Go to **Settings → Providers**
4. Click **Connect ChatGPT**
5. Complete the OAuth flow in your browser

Once connected, set an agent to use it:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex"
    }
  }
}
```

## Models

The Codex provider supports models available through the Responses API:

| Model | Notes |
|---|---|
| `gpt-5.3-codex` | Default; optimized for agentic coding tasks |
| `o3` | Strong reasoning model |
| `o4-mini` | Faster reasoning, lower cost |
| `gpt-4o` | General-purpose, multimodal |

Pass the model name in the `model` field of your agent config or per-request.

## Thinking / Reasoning

For reasoning models (like `o3`, `o4-mini`), set `thinking_level` to control reasoning effort:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "o3",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw translates this to the Responses API `reasoning.effort` field (`low`, `medium`, `high`).

## Wire Format Notes

The Codex provider uses the Responses API format, not chat completions:

- System prompts become `instructions` in the request body
- Messages are converted to the `input` array format
- Tool calls use `function_call` and `function_call_output` item types
- Tool call IDs are prefixed with `fc_` as required by the Responses API
- `store: false` is always set (GoClaw manages its own conversation history)

This conversion is transparent — you interact with GoClaw the same way regardless of which provider is active.

## Examples

**Agent config after OAuth setup:**

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex",
      "max_tokens": 8192
    }
  }
}
```

**Use reasoning with o3:**

```json
{
  "agents": {
    "list": {
      "reasoning-agent": {
        "provider": "openai-codex",
        "model": "o3",
        "thinking_level": "high"
      }
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Token expired or revoked | Re-authenticate via Settings → Providers → ChatGPT |
| OAuth callback fails | Port 1455 blocked | Ensure nothing else is listening on port 1455 during auth |
| `model not found` | Model not in your subscription | Check your ChatGPT plan; some models require Pro |
| Provider not available after restart | Token not persisted | GoClaw auto-loads the token from DB on startup; check DB connectivity |
| Phase field in response | `gpt-5.3-codex` returns `commentary` + `final_answer` phases | GoClaw handles this automatically; both phases are captured |

## What's Next

- [Custom Provider](#provider-custom) — connect any OpenAI-compatible API including local models
- [Claude CLI](#provider-claude-cli) — use your Claude subscription instead

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
