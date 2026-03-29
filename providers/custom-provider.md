# Custom Provider

Connect GoClaw to any OpenAI-compatible API — local models, self-hosted inference servers, or third-party proxies.

## Overview

GoClaw's `OpenAIProvider` works with any server that speaks the OpenAI chat completions format. You configure a name, API base URL, API key (optional for local servers), and default model. This covers local setups like Ollama and vLLM, proxy services like LiteLLM, and any vendor that advertises OpenAI compatibility.

GoClaw also automatically cleans tool schemas for providers that don't accept certain JSON Schema fields — so your tools work even when the downstream model is stricter than OpenAI.

## Setup

Custom providers are registered via the HTTP API or configured at the database level — there's no static config key for arbitrary names. However, you can use any of the built-in named slots with a custom `api_base` to point at a different server:

```json
{
  "providers": {
    "openai": {
      "api_key": "not-required",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

This works because GoClaw only cares about the API base and key — the provider name is just a label for routing.

## Local Ollama

Run models locally with [Ollama](https://ollama.com):

```bash
ollama serve          # starts on http://localhost:11434
ollama pull llama3.2  # download a model
```

```json
{
  "providers": {
    "openai": {
      "api_key": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

Ollama ignores the API key value — pass any non-empty string.

## vLLM

Self-host any HuggingFace model with [vLLM](https://docs.vllm.ai):

```bash
vllm serve meta-llama/Llama-3.2-3B-Instruct --port 8000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "vllm",
      "api_base": "http://localhost:8000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "meta-llama/Llama-3.2-3B-Instruct"
    }
  }
}
```

## LiteLLM Proxy

[LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) proxies 100+ providers behind a single OpenAI-compatible endpoint:

```bash
litellm --model ollama/llama3.2 --port 4000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "$LITELLM_KEY",
      "api_base": "http://localhost:4000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "ollama/llama3.2"
    }
  }
}
```

## Schema Cleaning

GoClaw automatically strips unsupported JSON Schema fields from tool definitions based on the provider name. This happens in `CleanToolSchemas`:

| Provider | Removed fields |
|---|---|
| `gemini` / `gemini-*` | `$ref`, `$defs`, `additionalProperties`, `examples`, `default` |
| `anthropic` | `$ref`, `$defs` |
| All others | Nothing removed |

For custom providers using a non-standard name, no schema cleaning is applied. If your local model rejects certain schema fields, use a provider name that triggers the right cleaning (e.g. name your provider `gemini` to strip Gemini-incompatible fields).

## Tool Format Differences

Not all OpenAI-compatible servers implement tools identically. Common gotchas:

- **Ollama**: Tool support depends on the model. Use models tagged with `tools` support (e.g. `llama3.2`, `qwen2.5`).
- **vLLM**: Tool support is model-dependent. Pass `--enable-auto-tool-choice` and `--tool-call-parser` flags when launching vLLM.
- **LiteLLM**: Handles tool format translation per-provider transparently.

If tool calls fail, try disabling tools for that provider and falling back to plain text with a structured output prompt.

## Examples

**LM Studio (local GUI for running models):**

```json
{
  "providers": {
    "openai": {
      "api_key": "lm-studio",
      "api_base": "http://localhost:1234/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
    }
  }
}
```

**Jan (another local model runner):**

```json
{
  "providers": {
    "openai": {
      "api_key": "jan",
      "api_base": "http://localhost:1337/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2-3b-instruct"
    }
  }
}
```

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `connection refused` | Local server not running | Start Ollama/vLLM/LiteLLM before GoClaw |
| `model not found` | Wrong model name for your server | Check the server's model list (`GET /v1/models`) |
| Tool calls cause errors | Server doesn't support tools | Disable tools in agent config or switch to a tool-capable model |
| Schema validation errors | Server rejects `additionalProperties` or `$ref` | Use a provider name that triggers schema cleaning, or sanitize tool schemas upstream |
| Streaming not working | Server doesn't implement SSE correctly | Try with streaming disabled; some local servers have SSE bugs |

## What's Next

- [Overview](/providers-overview) — compare all providers side by side
- [DashScope](/provider-dashscope) — Alibaba's Qwen models
- [Perplexity](/provider-perplexity) — search-augmented generation

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
