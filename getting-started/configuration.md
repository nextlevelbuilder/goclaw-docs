# Configuration

> How to configure GoClaw with config.json and environment variables.

## Overview

GoClaw uses two layers of configuration: a `config.json` file for structure and environment variables for secrets. The config file supports JSON5 (comments allowed) and hot-reloads on save.

## Config File Location

By default, GoClaw looks for `config.json` in the current directory. Override with:

```bash
export GOCLAW_CONFIG=/path/to/config.json
```

## Config Structure

```jsonc
{
  // Gateway settings
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "max_message_chars": 32000,
    "rate_limit_rpm": 20
  },

  // Agent defaults (apply to all agents unless overridden)
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tokens": 8192,
      "temperature": 0.7,
      "max_tool_iterations": 20,
      "context_window": 200000,
      "agent_type": "open",
      "memory": true
    },
    "list": {
      // Per-agent overrides go here
    }
  },

  // LLM provider credentials
  "providers": {
    "openrouter": { "api_key": "env:GOCLAW_OPENROUTER_API_KEY" },
    "anthropic": { "api_key": "env:GOCLAW_ANTHROPIC_API_KEY" }
  },

  // Channel integrations
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" },
    "discord": { "enabled": false }
  },

  // Tool settings
  "tools": {
    "exec_approval": "light",
    "web": { "engine": "duckduckgo" },
    "browser": { "headless": true }
  },

  // Text-to-speech providers
  "tts": {},

  // Scheduled tasks
  "cron": [],

  // Agent routing by channel
  "bindings": {}
}
```

## Environment Variables

Secrets must **never** go in `config.json`. Use environment variables instead:

### Required

| Variable | Purpose |
|----------|---------|
| `GOCLAW_GATEWAY_TOKEN` | Auth token for API/WebSocket access |
| `GOCLAW_ENCRYPTION_KEY` | AES-256-GCM key for encrypting credentials in DB |
| `GOCLAW_POSTGRES_DSN` | PostgreSQL connection string (non-Docker) |

### Provider API Keys

| Variable | Provider |
|----------|----------|
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic |
| `GOCLAW_OPENAI_API_KEY` | OpenAI |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_MISTRAL_API_KEY` | Mistral |
| `GOCLAW_XAI_API_KEY` | xAI |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `GOCLAW_CONFIG` | `./config.json` | Config file path |
| `GOCLAW_WORKSPACE` | `./workspace` | Agent workspace directory |
| `GOCLAW_DATA_DIR` | `./data` | Data directory |
| `GOCLAW_TRACE_VERBOSE` | `0` | Set to `1` for debug LLM traces |

## Hot Reload

GoClaw watches `config.json` for changes using `fsnotify` with a 300ms debounce. When you save the file:

- Agent configurations update immediately
- Channel settings reload
- Provider credentials refresh

No restart required for most changes. Gateway settings (host, port) require a restart.

## Agent Defaults vs Per-Agent Overrides

Settings in `agents.defaults` apply to all agents. Override them per-agent in `agents.list`:

```jsonc
{
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "temperature": 0.7
    },
    "list": {
      "code-helper": {
        "model": "anthropic/claude-opus-4-20250514",
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  }
}
```

The `code-helper` agent inherits `provider: "openrouter"` from defaults but uses its own model and temperature.

## Exec Approval Levels

The `tools.exec_approval` setting controls code execution safety:

| Level | Behavior |
|-------|----------|
| `full` | User must approve every shell command |
| `light` | Auto-approve safe commands, prompt for risky ones |
| `none` | Auto-approve all commands (use with caution) |

## Common Issues

| Problem | Solution |
|---------|----------|
| Config not loading | Check `GOCLAW_CONFIG` path; ensure valid JSON5 syntax |
| Hot reload not working | Verify file is saved (not just buffered); check fsnotify support on your OS |
| API key not found | Ensure env var is exported in current shell session |

## What's Next

- [Web Dashboard Tour](web-dashboard-tour.md) — Configure visually instead of editing JSON
- [Agents Explained](../core-concepts/agents-explained.md) — Deep dive into agent configuration
- [Tools Overview](../core-concepts/tools-overview.md) — Available tools and categories
