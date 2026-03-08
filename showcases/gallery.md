# Gallery

> Real-world examples and deployment scenarios for GoClaw.

## Overview

This page showcases how GoClaw can be deployed in different scenarios — from a personal Telegram bot to a multi-tenant team platform. Use these as starting points for your own setup.

## Deployment Scenarios

### Personal AI Assistant

A single agent on Telegram for personal use.

```jsonc
{
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "agent_type": "open",
      "memory": true
    }
  },
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" }
  }
}
```

**What you get:** A personal assistant that remembers your preferences, searches the web, runs code, and manages files — all through Telegram.

### Team Coding Bot

A predefined agent shared across a development team on Discord.

```jsonc
{
  "agents": {
    "list": {
      "code-bot": {
        "agent_type": "predefined",
        "provider": "anthropic",
        "model": "claude-opus-4-20250514",
        "tools_profile": "coding",
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  },
  "channels": {
    "discord": { "enabled": true, "token": "env:DISCORD_BOT_TOKEN" }
  }
}
```

**What you get:** A shared coding assistant with consistent personality (predefined), low temperature for precise code, and extended tool iterations for complex tasks. Each team member gets personal context via USER.md.

### Multi-Channel Support Bot

One agent available on Telegram, Discord, and WebSocket simultaneously.

```jsonc
{
  "agents": {
    "list": {
      "support-bot": {
        "agent_type": "predefined",
        "tools_profile": "messaging"
      }
    }
  },
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" },
    "discord": { "enabled": true, "token": "env:DISCORD_BOT_TOKEN" }
  }
}
```

**What you get:** Consistent support experience across channels. Users on Telegram and Discord talk to the same agent with the same knowledge base.

### Agent Team with Delegation

A lead agent that delegates specialized tasks to other agents.

```jsonc
{
  "agents": {
    "list": {
      "lead": {
        "provider": "anthropic",
        "model": "claude-opus-4-20250514"
      },
      "researcher": {
        "provider": "openrouter",
        "model": "google/gemini-2.5-pro",
        "tools_profile": "coding"
      },
      "writer": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929",
        "tools_profile": "messaging"
      }
    }
  }
}
```

**What you get:** The lead agent coordinates work, delegating research to a Gemini-powered agent and writing tasks to a Claude-powered agent. Each uses the best model for its role.

## Dashboard Screenshots

The GoClaw web dashboard provides visual management for all features:

- **Agent Management** — Create, configure, and test agents
- **Channel Configuration** — Connect messaging platforms
- **Traces Viewer** — Monitor LLM calls, costs, and performance
- **Team Board** — Manage agent teams and task delegation
- **Skills Browser** — Upload and search agent skills

Screenshots are available in the `images/dashboard/` directory.

## Community

Have a GoClaw deployment you'd like to showcase? Open a pull request to add it here.

## What's Next

- [What Is GoClaw](../getting-started/what-is-goclaw.md) — Start from the beginning
- [Quick Start](../getting-started/quick-start.md) — Get running in 5 minutes
- [Configuration](../getting-started/configuration.md) — Full config reference
