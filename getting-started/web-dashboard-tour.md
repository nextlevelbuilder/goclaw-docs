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

## Dashboard Sidebar

The dashboard organizes features into groups in the sidebar.

### Core

#### Overview

System-wide dashboard with key metrics at a glance.

#### Chat

Test chat interface — interact with any agent directly from the browser.

#### Agents

Create, edit, and delete agents. Each agent card shows:
- Name and model
- Provider and temperature
- Tool access permissions
- Active sessions count

Click an agent to open its detail page with these tabs:
- **General** — Agent metadata and basic info
- **Config** — Model, temperature, system prompt, tool permissions
- **Files** — Context files (IDENTITY.md, USER.md, etc.)
- **Shares** — Share agents across tenants
- **Links** — Configure which agents this agent can delegate to (permissions, concurrency limits, handoff rules)
- **Skills** — Agent-specific skill assignments
- **Instances** — Predefined agent instances (only for predefined agents)

#### Agent Teams

Create agent teams for collaborative tasks. Click a team to see:
- **Members** — Assign agents to the team and manage roles
- **Tasks** — Shared task board for the team
- **Delegations** — Tracks which agents delegated tasks to others, with status and results
- **Settings** — Team configuration

### Conversations

#### Sessions

View active and historical sessions. See conversation history per user, per agent, per channel.

#### Pending Messages

Queue of unprocessed user messages waiting for agent response.

#### Contacts

Manage user contacts across all channels.

### Connectivity

#### Channels

Enable and configure messaging channels:
- **Telegram** — Bot token, allowed users/groups
- **Discord** — Bot token, guild settings
- **WhatsApp** — Connection QR code
- **Zalo** — App credentials
- **Zalo Personal** — Personal Zalo account integration
- **Feishu / Lark** — App ID and secret
- **Slack** — Bot token, workspace settings

#### Nodes

Gateway node pairing and management. Pair browser sessions with gateway instances using 8-character pairing codes. Shows a badge with pending pairing count.

### Capabilities

#### Skills

Upload `SKILL.md` files that agents can discover and use. Skills are searchable with semantic matching — agents find the right skill based on what the user asks.

#### Builtin Tools

Browse the 32 built-in tools that come with GoClaw. Enable/disable individual tools and configure their settings.

#### MCP Servers

Connect Model Context Protocol servers to extend agent capabilities beyond built-in tools.

**Example:** If you run a local knowledge base server, you can connect it via MCP so GoClaw agents can query your private documents automatically.

Add server URLs, view available tools, and test connections.

#### TTS (Text-to-Speech)

Configure Text-to-Speech services. Supported providers: OpenAI, ElevenLabs, Edge, MiniMax.

#### Cron Jobs

Schedule tasks via a form dialog. Fill in a name, select an agent, choose a schedule type, and write a message telling the agent what to do. Three schedule types:
- **Every** — run at a fixed interval (in seconds)
- **Cron** — run on a cron expression (e.g. `0 9 * * *`)
- **Once** — run once after a short delay

**Example:**
- **Name:** `daily-feedback`
- **Agent ID:** your assistant agent
- **Schedule Type:** Cron — `0 9 * * *`
- **Message:** "Summarize yesterday's customer feedback and email it to me."

### Data

#### Memory

Vector memory document management powered by pgvector. Store, search, and manage documents that agents can retrieve via semantic search.

#### Knowledge Graph

Knowledge graph management — view and manage entity relationships that agents build over conversations.

#### Storage

File and storage management for agent-uploaded or user-uploaded files.

### Monitoring

#### Traces

LLM call history with:
- Token usage and cost tracking
- Request/response pairs
- Tool call sequences
- Latency metrics

#### Activity

Agent lifecycle history — shows when agents were created, updated, or deleted, with timestamps and actor info.

#### Events

Real-time event stream — watch agent activity, tool calls, and system events as they happen.

#### Usage

Usage metrics and cost tracking — monitor token consumption, API calls, and costs per agent/channel. Accessed via the **Usage** tab on the Overview page, not a separate sidebar item.

#### Logs

System logs for debugging and monitoring gateway operations.

### System

#### Providers

Manage LLM providers (API keys, model configurations). Supports Anthropic (native) and OpenAI-compatible providers.

#### Config

Edit gateway configuration. Same settings available in the JSON5 config file, but with a visual editor.

#### Approvals

Manage Exec Approval workflows — review and approve/reject tool executions that require human confirmation.

#### CLI Credentials

Manage CLI credentials for secure command-line access to GoClaw.

#### API Keys

Manage API keys for programmatic access — create, revoke, and assign roles to keys.

## Common Issues

| Problem | Solution |
|---------|----------|
| Dashboard won't load | Check that the self-service container is running: `docker compose ps` |
| Can't connect to API | Verify `GOCLAW_GATEWAY_TOKEN` is set correctly |
| Changes not reflecting | Hard refresh the browser (Ctrl+Shift+R) |

## What's Next

- [Configuration](#configuration) — Edit settings via config file instead
- [How GoClaw Works](#how-goclaw-works) — Understand the architecture
- [Agents Explained](#agents-explained) — Learn about agent types

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
