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

## What's Next

- [Provider Overview](overview.md)
- [Ollama Cloud](ollama-cloud.md) — hosted Ollama option
- [Custom / OpenAI-Compatible](custom-provider.md)
