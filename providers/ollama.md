# Ollama

> Run open-source models locally with Ollama — no cloud required.

🚧 **This page is under construction.** Content coming soon — contributions welcome!

## Overview

Ollama lets you run large language models on your own machine. GoClaw connects to Ollama using the OpenAI-compatible API it exposes locally, so no data leaves your infrastructure.

## Provider Type

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  }
}
```

## Docker Deployment

When running GoClaw inside Docker, `localhost` and `127.0.0.1` in provider URLs are automatically rewritten to `host.docker.internal` so the container can reach Ollama running on the host machine. No manual configuration needed.

If Ollama is running on a different host, set the full URL explicitly:

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://my-ollama-server:11434/v1"
    }
  }
}
```

## What's Next

- [Provider Overview](/providers-overview)
- [Ollama Cloud](/provider-ollama-cloud) — hosted Ollama option
- [Custom / OpenAI-Compatible](/provider-custom)

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
