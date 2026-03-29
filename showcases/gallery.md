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
      "memory": { "enabled": true }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "" // from @BotFather
    }
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
        "model": "claude-opus-4-6",
        "tools": { "profile": "coding" },
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "" // from Discord Developer Portal
    }
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
        "tools": { "profile": "messaging" }
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "" // Telegram bot token
    },
    "discord": {
      "enabled": true,
      "token": "" // Discord bot token
    }
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
        "model": "claude-opus-4-6"
      },
      "researcher": {
        "provider": "openrouter",
        "model": "google/gemini-2.5-pro",
        "tools": { "profile": "coding" }
      },
      "writer": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929",
        "tools": { "profile": "messaging" }
      }
    }
  }
}
```

**What you get:** The lead agent coordinates work, delegating research to a Gemini-powered agent and writing tasks to a Claude-powered agent. Each uses the best model for its role.

## Community

Have a GoClaw deployment you'd like to showcase? Open a pull request to add it here.

## What's Next

- [What Is GoClaw](/what-is-goclaw) — Start from the beginning
- [Quick Start](/quick-start) — Get running in 5 minutes
- [Configuration](/configuration) — Full config reference

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
