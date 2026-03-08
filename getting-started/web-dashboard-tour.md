# Web Dashboard Tour

> A visual guide to the GoClaw management dashboard.

## Overview

The web dashboard gives you a point-and-click interface for everything you can do with config files. It's built with React and connects to GoClaw's HTTP API.

## Accessing the Dashboard

### With Docker Compose

If you started with the self-service overlay, the dashboard is already running:

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

Open `http://localhost:3000` in your browser.

### Building from Source

```bash
cd ui/web
pnpm install
pnpm dev
# Dashboard runs at http://localhost:5173
```

For production:

```bash
pnpm build
# Serve the dist/ folder with any static file server
```

## Dashboard Tabs

### Setup Wizard

First-time setup alternative to `./goclaw onboard`. Walks you through provider selection, API key entry, and channel configuration — all in the browser.

### Agents

Create, edit, and delete agents. Each agent card shows:
- Name and model
- Provider and temperature
- Tool access permissions
- Active sessions count

Click an agent to open a test chat window.

### Channels

Enable and configure messaging channels:
- **Telegram** — Bot token, allowed users/groups
- **Discord** — Bot token, guild settings
- **WhatsApp** — Connection QR code
- **Zalo** — App credentials
- **Feishu/Lark** — App ID and secret

### Skills

Upload `SKILL.md` files that agents can discover and use. Skills are searchable with semantic matching — agents find the right skill based on what the user asks.

### MCP Servers

Connect Model Context Protocol servers to extend agent capabilities. Add server URLs, view available tools, and test connections.

### Custom Tools

Define custom tools beyond the 60+ built-in ones. Set input schemas, execution handlers, and rate limits.

### Cron Jobs

Schedule recurring tasks. Each cron job runs as an agent with a specified prompt on a schedule (standard cron syntax).

### Traces

LLM call history with:
- Token usage and cost tracking
- Request/response pairs
- Tool call sequences
- Latency metrics

### Sessions

View active and historical sessions. See conversation history per user, per agent, per channel.

### Teams

Create agent teams for collaborative tasks:
- Assign agents to teams
- View shared task boards
- Monitor delegation chains

### Agent Links

Configure which agents can delegate to others:
- Set delegation permissions
- Configure concurrency limits
- Define handoff rules

## Common Issues

| Problem | Solution |
|---------|----------|
| Dashboard won't load | Check that the self-service container is running: `docker compose ps` |
| Can't connect to API | Verify `GOCLAW_GATEWAY_TOKEN` is set correctly |
| Changes not reflecting | Hard refresh the browser (Ctrl+Shift+R) |

## What's Next

- [Configuration](configuration.md) — Edit settings via config file instead
- [How GoClaw Works](../core-concepts/how-goclaw-works.md) — Understand the architecture
- [Agents Explained](../core-concepts/agents-explained.md) — Learn about agent types
