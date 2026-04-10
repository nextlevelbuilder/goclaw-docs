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

## Codex OAuth Pool

If you have multiple ChatGPT accounts (e.g., a personal account and a work account), you can pool them together so GoClaw distributes requests across all of them. This is useful for spreading usage across accounts or providing automatic failover when one account hits a limit.

### How it works

You connect each ChatGPT account as a separate `chatgpt_oauth` provider. One provider is the **pool owner** — it holds the routing configuration. The other providers are **pool members** listed in `extra_provider_names`.

### Provider-level config (pool owner)

When creating or updating a provider via `POST /v1/providers`, set the `settings` field:

```json
{
  "name": "openai-codex",
  "provider_type": "chatgpt_oauth",
  "settings": {
    "codex_pool": {
      "strategy": "round_robin",
      "extra_provider_names": ["codex-work", "codex-shared"]
    }
  }
}
```

`strategy` controls how requests are distributed across the pool:

| Strategy | Behavior |
|----------|----------|
| `primary_first` | Always use the primary account; extras are only tried on retryable failures (default) |
| `round_robin` | Rotate requests across the primary + all extra providers |
| `priority_order` | Try providers in order — primary first, then extras in sequence |

`extra_provider_names` is the authoritative membership list. A provider listed in another pool's `extra_provider_names` cannot manage its own pool.

### Agent-level override

Individual agents can override the pool behavior via `chatgpt_oauth_routing` in their `other_config`:

```json
{
  "other_config": {
    "chatgpt_oauth_routing": {
      "override_mode": "custom",
      "strategy": "priority_order"
    }
  }
}
```

`override_mode` options:

| Value | Behavior |
|-------|----------|
| `inherit` | Use the primary provider's `codex_pool` settings (default when not set) |
| `custom` | Apply this agent's own strategy override |

Setting `override_mode: "custom"` with no `extra_provider_names` and strategy `primary_first` disables the pool for that agent — it will only use the primary account.

### Routing notes

- Retryable upstream failures (HTTP 429, 5xx) automatically fall through to the next eligible account in the same request.
- OAuth login and logout are per-provider — each account authenticates independently.
- The pool is only active when the agent's provider is a `chatgpt_oauth` type. Non-Codex providers are unaffected.

### Pool activity endpoint

To inspect routing decisions and per-account health for an agent, call:

```
GET /v1/agents/{id}/codex-pool-activity
```

See [REST API](/rest-api) for the response shape.

---

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Token expired or revoked | Re-authenticate via Settings → Providers → ChatGPT |
| OAuth callback fails | Port 1455 blocked | Ensure nothing else is listening on port 1455 during auth |
| `model not found` | Model not in your subscription | Check your ChatGPT plan; some models require Pro |
| Provider not available after restart | Token not persisted | GoClaw auto-loads the token from DB on startup; check DB connectivity |
| Phase field in response | `gpt-5.3-codex` returns `commentary` + `final_answer` phases | GoClaw handles this automatically; both phases are captured |

## What's Next

- [Custom Provider](/provider-custom) — connect any OpenAI-compatible API including local models
- [Claude CLI](/provider-claude-cli) — use your Claude subscription instead

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
