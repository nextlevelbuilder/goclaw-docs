# Quick Start

> Your first AI agent running in 5 minutes.

## Overview

This guide walks you through building GoClaw, running the onboard wizard, starting the gateway, and chatting with your first agent.

## Step 1: Build

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw
go build -o goclaw .
```

## Step 2: Set Up PostgreSQL

GoClaw needs PostgreSQL for managed mode:

```bash
# Using Docker (quickest)
docker run -d --name goclaw-db \
  -e POSTGRES_USER=goclaw \
  -e POSTGRES_PASSWORD=goclaw \
  -e POSTGRES_DB=goclaw \
  -p 5432:5432 \
  pgvector/pgvector:pg17

# Set the connection string
export GOCLAW_POSTGRES_DSN="postgres://goclaw:goclaw@localhost:5432/goclaw?sslmode=disable"
```

## Step 3: Run the Onboard Wizard

```bash
./goclaw onboard
```

The wizard guides you through:

1. **Choose an LLM provider** — OpenRouter (recommended for beginners), Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, and more
2. **Enter your API key** — The key is stored encrypted, never in plain text
3. **Pick a model** — Pre-filled based on your provider (e.g., `anthropic/claude-sonnet-4-5-20250929` for OpenRouter)
4. **Set up channels** (optional) — Telegram, Discord, WhatsApp, Zalo, Feishu/Lark
5. **Enable features** (optional) — Memory, browser automation, text-to-speech

The wizard creates two files:
- `config.json` — Your agent and gateway configuration
- `.env.local` — Secrets (gateway token, encryption key)

## Step 4: Start the Gateway

```bash
source .env.local
./goclaw
```

You should see:

```
GoClaw gateway listening on :18790
```

## Step 5: Chat with Your Agent

### Using the Web Dashboard

If you enabled the dashboard during setup, open `http://localhost:3000` in your browser.

### Using WebSocket

Connect with any WebSocket client:

```bash
# Using websocat (install: cargo install websocat)
websocat ws://localhost:18790/ws \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN"
```

Send a JSON message:

```json
{
  "type": "chat",
  "agent_id": "default",
  "content": "Hello! What can you do?"
}
```

### Using the HTTP API

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "default",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Docker Compose (Alternative)

Skip steps 1-4 with Docker Compose:

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Set up environment
cp .env.example .env
# Edit .env with your API key

# Start everything
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

## Common Issues

| Problem | Solution |
|---------|----------|
| `no provider API key found` | Set at least one `GOCLAW_*_API_KEY` env var |
| `connection refused on :5432` | Ensure PostgreSQL is running and DSN is correct |
| `unauthorized` on WebSocket | Check `GOCLAW_GATEWAY_TOKEN` matches your auth header |

## What's Next

- [Configuration](configuration.md) — Fine-tune your setup
- [Web Dashboard Tour](web-dashboard-tour.md) — Explore the visual interface
- [Agents Explained](../core-concepts/agents-explained.md) — Understand agent types and context
