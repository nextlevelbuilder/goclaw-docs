# Provider Issues

> Fixes for API key errors, rate limiting, model mismatches, and schema validation failures.

## Overview

GoClaw supports Anthropic (native HTTP+SSE) and a wide set of OpenAI-compatible providers. Providers are registered at startup only if their API key is present. All providers use automatic retry with exponential backoff for transient errors (429, 500–504, connection resets, timeouts).

## Provider Not Registered

If a provider does not appear in the dashboard or returns `provider not found`, it was skipped at startup because its API key was missing.

Check startup logs for `registered provider` lines:

```
INFO registered provider name=anthropic
INFO registered provider name=openai
```

If a provider is missing, set the corresponding env var and restart:

| Provider | Env var |
|----------|---------|
| Anthropic | `GOCLAW_ANTHROPIC_API_KEY` |
| OpenAI | `GOCLAW_OPENAI_API_KEY` |
| Gemini | `GOCLAW_GEMINI_API_KEY` |
| DashScope / Qwen | `GOCLAW_DASHSCOPE_API_KEY` |
| OpenRouter | `GOCLAW_OPENROUTER_API_KEY` |
| Groq | `GOCLAW_GROQ_API_KEY` |
| DeepSeek | `GOCLAW_DEEPSEEK_API_KEY` |
| Mistral | `GOCLAW_MISTRAL_API_KEY` |
| xAI / Grok | `GOCLAW_XAI_API_KEY` |
| MiniMax | `GOCLAW_MINIMAX_API_KEY` |
| Cohere | `GOCLAW_COHERE_API_KEY` |
| Perplexity | `GOCLAW_PERPLEXITY_API_KEY` |

Providers can also be added at runtime via the dashboard (stored in `llm_providers` table with AES-256-GCM encrypted keys).

## Common Errors

| Problem | Cause | Solution |
|---------|-------|----------|
| `HTTP 401` | Invalid or revoked API key | Regenerate the key from the provider's console; update env var or dashboard |
| `HTTP 403` | Account suspended or plan restriction | Check provider account status; upgrade plan if on free tier |
| `HTTP 429` | Rate limit hit | GoClaw retries automatically up to 3× with backoff (min 300ms, max 30s); if persistent, reduce concurrency |
| `HTTP 404` / model not found | Wrong model name or model removed | Check current model names in provider docs; update agent config |
| `HTTP 500/502/503/504` | Provider outage | Retried automatically; check provider status page if persistent |
| Connection reset / EOF / timeout | Network instability | Retried automatically; check DNS and firewall rules |

## Retry Behavior

GoClaw retries on HTTP 429, 500, 502, 503, 504, and network errors. Default config:

- **Attempts:** 3
- **Initial delay:** 300ms
- **Max delay:** 30s
- **Backoff:** exponential with ±10% jitter
- **Retry-After header:** honored when present (e.g., on 429 from Anthropic/OpenAI)

## Schema Validation Errors (Gemini)

Gemini rejects JSON Schema fields that other providers accept. GoClaw automatically strips incompatible fields before sending tool definitions.

Fields removed for Gemini: `$ref`, `$defs`, `additionalProperties`, `examples`, `default`

If you see schema validation errors from Gemini despite this, the tool definition likely uses a deeply nested reference that wasn't fully resolved. Simplify the tool's parameter schema.

Fields removed for Anthropic: `$ref`, `$defs`

## Extended Thinking (Anthropic)

Extended thinking requires a compatible model (e.g., `claude-opus-4-5`) and a `thinking` block in the request. GoClaw automatically adds the `anthropic-beta: interleaved-thinking-2025-05-14` header when a thinking block is present.

| Problem | Cause | Solution |
|---------|-------|----------|
| Thinking not appearing | Model doesn't support it | Use `claude-opus-4-5` or another thinking-capable model |
| `redacted_thinking` blocks | Encrypted thinking returned | Normal — these are preserved for context passback; they contain no readable content |
| Budget exceeded | `budget_tokens` too low | Increase `budget_tokens` in agent config; minimum is typically 1024 |

## Claude CLI Provider

The `claude-cli` provider shells out to the `claude` binary instead of calling the API directly.

| Problem | Cause | Solution |
|---------|-------|----------|
| Binary not found | `claude` not in PATH | Set `GOCLAW_CLAUDE_CLI_PATH` to the full path of the binary |
| Auth failure | CLI not authenticated | Run `claude login` manually to authenticate |
| Wrong model | Default model mismatch | Set `GOCLAW_CLAUDE_CLI_MODEL` to the desired model alias |
| Work dir errors | `GOCLAW_CLAUDE_CLI_WORK_DIR` path doesn't exist | Create the directory or update the env var |

## Codex Provider

The `codex` provider (OpenAI Codex CLI) also shells out to a local binary.

| Problem | Cause | Solution |
|---------|-------|----------|
| Binary not found | `codex` not in PATH | Install Codex CLI or set the path in provider config |
| Auth failure | CLI not authenticated | Run `codex auth` or set `OPENAI_API_KEY` in the environment |
| Stream read error | Binary crashed mid-stream | Check binary version compatibility; update Codex CLI |

## ACP Provider

The `acp` provider (Agent Client Protocol) orchestrates any ACP-compatible coding agent (Claude Code, Codex CLI, Gemini CLI) as a subprocess using JSON-RPC 2.0 over stdin/stdout. It does not require an API key — the agent binary manages its own authentication.

Configure in `config.json` under `providers.acp`:

```json
"acp": {
  "binary": "claude",
  "args": [],
  "model": "claude",
  "work_dir": "",
  "idle_ttl": "5m",
  "perm_mode": "approve-all"
}
```

| Problem | Cause | Solution |
|---------|-------|----------|
| `acp: binary not found, skipping` | Binary path doesn't exist or isn't executable | Verify the binary is installed and the `binary` field is the correct path or name in `$PATH` |
| `acp: spawn failed` | Subprocess failed to start | Check that the binary is executable; run it manually to see startup errors |
| `acp: prompt failed` | JSON-RPC communication error on stdin/stdout | Check subprocess logs; ensure the agent binary version supports ACP protocol |
| `acp: session_key required in options` | No session key in request | ACP requires a session key — ensure the agent config passes `session_key` in options |
| `acp: no user message in request` | Empty request content | Ensure the chat request contains a user message |
| Provider not in dashboard | `binary` field not set in config | Set `providers.acp.binary` in `config.json` and restart |

**Startup log for successful ACP registration:**

```
INFO registered provider name=acp binary=claude
```

## Provider Adapter System (v3)

GoClaw v3 introduces a unified `SSEScanner` (`providers/sse_reader.go`) shared by OpenAI, Anthropic, and Codex streaming providers. This eliminates per-provider SSE parsing differences.

| Problem | Cause | Solution |
|---------|-------|----------|
| Streaming cuts off mid-token | Upstream SSE frame split across scanner buffer boundary | Rare — the scanner uses a 512 KB buffer; if reproducible, check for extremely large tool result payloads |
| Streaming works for OpenAI but not Anthropic | Custom proxy stripping `event:` lines | Ensure your proxy passes raw SSE lines; GoClaw now uses the same parser for all providers |

Provider credentials added at runtime (dashboard) are stored in `llm_providers` with AES-256-GCM encryption and resolved at request time via the credential resolver. Per-agent overrides in agent config take precedence over global provider settings.

## What's Next

- [Database issues](/troubleshoot-database)
- [Common Issues](/troubleshoot-common)
- [Channel issues](/troubleshoot-channels)

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
