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

Create agent teams for collaborative tasks. The teams list supports card/list view toggle.

<!-- TODO: Screenshot — Team kanban board with task cards -->

Click a team to see the **kanban board** with drag-and-drop task management:
- **Board** — Visual task board with columns for each status (pending, in_progress, in_review, completed, failed, cancelled, blocked, stale)
- **Members** — Assign agents to the team, view member enrichment with agent metadata and emoji
- **Tasks** — Task list view with filtering, approval workflow (approve/reject), and blocker escalation
- **Workspace** — Shared file workspace with lazy-load folder UI and storage depth control
- **Settings** — Team configuration, blocker escalation, escalation mode, workspace scope

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

#### Custom Tools

Create and manage custom tools with command templates, environment variables, and deny pattern blocking.

#### Builtin Tools

Browse the 50+ built-in tools that come with GoClaw. Enable/disable individual tools and configure their settings (including Knowledge Graph, media provider chain, and web fetch extractor chain settings).

#### MCP Servers

Connect Model Context Protocol servers to extend agent capabilities beyond built-in tools.

**Example:** If you run a local knowledge base server, you can connect it via MCP so GoClaw agents can query your private documents automatically.

Add server URLs, view available tools, and test connections.

#### TTS (Text-to-Speech)

Configure Text-to-Speech services. Supported providers: OpenAI, ElevenLabs, Edge, MiniMax.

#### Cron Jobs

<!-- TODO: Screenshot — Redesigned cron detail page with markdown rendering -->

Schedule tasks via a redesigned detail page with markdown support. Fill in a name, select an agent, choose a schedule type, and write a message telling the agent what to do. Three schedule types:
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

<!-- TODO: Screenshot — Redesigned provider detail page -->

Manage LLM providers with a redesigned modern detail page. Create, configure, and verify providers. Supports Anthropic (native), OpenAI, Azure OpenAI with Foundry headers, and 20+ other providers. Shows server version in the sidebar connection status.

#### Config

Edit gateway configuration. Same settings available in the JSON5 config file, but with a visual editor.

#### Approvals

Manage Exec Approval workflows — review and approve/reject tool executions that require human confirmation.

#### CLI Credentials

Manage CLI credentials for secure command-line access to GoClaw.

#### API Keys

Manage API keys for programmatic access — create, revoke, and assign roles to keys. Keys use the `goclaw_` prefix format and support role-based scopes (admin, operator, viewer).

#### Tenants (Multi-Tenant Mode)

<!-- TODO: Screenshot — Tenant admin page -->

Manage tenants in SaaS deployment mode — create tenants, assign users, configure per-tenant overrides for providers, tools, skills, and MCP servers. Only visible when running in multi-tenant mode.

## Desktop Edition

The Desktop Edition is a native app (built with Wails) that wraps the full dashboard in a standalone window. It includes additional features not available in the web-only dashboard.

### Version Display

The sidebar header shows the current app version next to the GoClaw logo in monospace font (e.g., `v1.2.3`). Click the **Lite** badge to open an edition comparison modal.

### Check for Updates

Next to the version number, there is a refresh button (↻):

- Click it to check if a newer version is available
- While checking, the button shows `...`
- If an update is found, it shows the new version number (e.g., `v1.3.0`)
- If already up to date, it shows `✓`
- If the check fails, it shows `✗`

The Lite edition supports up to 5 agents. When the limit is reached, the "New agent" button is disabled.

### Update Banner

When a new version is detected automatically (via background event), a banner appears at the top of the app:

- **Available** — shows the new version with an "Update Now" button. Click it to download and install.
- **Downloading** — shows a spinner while the update is downloading.
- **Done** — shows a "Restart Now" button. Click to apply the update.
- **Error** — shows a "Retry" button. The banner can be dismissed with the X button.

### Team Settings Modal

Open Team Settings from the Agent Teams view. The modal has three sections:

**Team Info**
- Edit team name and description
- View current status and lead agent

**Members**
- List of all team members with their roles (lead, reviewer, member)
- Add new members by searching agents in a combobox
- Remove non-lead members (hover to reveal the remove button)

**Notifications**
Toggle per-event notifications on or off:
- `dispatched` — task dispatched to an agent
- `progress` — task progress updates
- `failed` — task failed
- `completed` — task completed
- `new_task` — new task added to the team

Notification mode:
- **Direct** — all team members receive notifications
- **Leader** — only the lead agent receives notifications

### Task Detail Modal

Click any task card to open the Task Detail modal. It shows:

- **Identifier** — short task ID (monospace badge)
- **Status badge** — current status with color coding; shows an animated "Running" badge if actively executing
- **Progress bar** — shows percentage and current step (when task is in progress)
- **Metadata grid** — priority, owner agent, task type, created/updated timestamps
- **Blocked by** — list of blocking task IDs shown as amber badges
- **Description** — collapsible section with markdown rendering
- **Result** — collapsible section with markdown rendering (when task completes)
- **Attachments** — collapsible section listing files attached to the task; each entry shows file name, size, and a Download button

Footer actions:
- **Assign to** — combobox to reassign the task to another team member (only shown for non-terminal tasks)
- **Delete** — shown only for completed/failed/cancelled tasks; triggers a confirmation dialog before deletion

## Common Issues

| Problem | Solution |
|---------|----------|
| Dashboard won't load | Check that the self-service container is running: `docker compose ps` |
| Can't connect to API | Verify `GOCLAW_GATEWAY_TOKEN` is set correctly |
| Changes not reflecting | Hard refresh the browser (Ctrl+Shift+R) |

## What's Next

- [Configuration](/configuration) — Edit settings via config file instead
- [How GoClaw Works](/how-goclaw-works) — Understand the architecture
- [Agents Explained](/agents-explained) — Learn about agent types

<!-- goclaw-source: 231bc968 | updated: 2026-03-27 -->
<!-- TODO: Screenshots needed for v2.x UI — run a GoClaw instance and capture:
  1. Team kanban board with task cards in columns
  2. Cron detail page with markdown rendering
  3. Provider detail page (redesigned)
  4. Tenant admin page (multi-tenant mode)
  5. Chat page with media gallery and image download overlay
  6. Sidebar showing server version in connection status
  7. Login page with theme toggle
-->
