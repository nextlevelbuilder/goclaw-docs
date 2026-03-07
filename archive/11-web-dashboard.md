# Web Dashboard

The GoClaw Web Dashboard is a React 19 single-page application (SPA) built with Vite 6, TypeScript, Tailwind CSS 4, and Radix UI. It connects to the GoClaw gateway via WebSocket and provides a full management interface for agents, teams, tools, providers, and observability.

---

## 1. Core

### Chat (`/chat`)

Interactive chat interface for direct agent conversation.

![Chat](../images/dashboard/chat.png)

- **Agent selector** — dropdown to switch active agent
- **Session list** — shows message count and timestamp per session
- **New Chat** button — starts a fresh session
- Message input with send action

---

## 2. Management

### Agents (`/agents`)

Card grid of all registered AI agents.

![Agents](../images/dashboard/agent.png)

Each card shows: name, slug, provider/model, description, status badge (`active`/`inactive`), access type (`predefined` / `open`), and context window size.

Actions: **Create Agent**, search by name/slug, edit, delete.

### Agent Teams (`/teams`)

Manages multi-agent team configurations.

![Agent Teams](../images/dashboard/agent%20team.png)

Each team card shows: team name, status, lead agent. Actions: **Create Team**, search, edit, delete.

### Sessions (`/sessions`)

Lists all conversation sessions across agents and channels. Supports filtering and deletion.

![Sessions](../images/dashboard/session.png)

### Channels (`/channels`)

Configuration for external messaging channels (Telegram, Slack, etc.) connected to the gateway.

![Channels](../images/dashboard/channels.png)

### Skills (`/skills`)

Manages agent skill packages (ZIP uploads). Actions: **Upload**, **Refresh**, search by name.

![Skills](../images/dashboard/skills.png)

### Built-in Tools (`/builtin-tools`)

26 built-in tools across 13 categories. Each tool can be individually enabled or disabled.

![Built-in Tools](../images/dashboard/build%20in%20tool.png)

| Category | Tools |
|---|---|
| Filesystem | `edit`, `list_files`, `read_file`, `write_file` |
| Runtime | `exec` |
| Web | `web_fetch`, `web_search` |
| Memory | `memory_get`, `memory_search` |
| (+ 9 more categories) | — |

---

## 3. Monitoring

### Traces (`/traces`)

Table of LLM call traces.

![Traces](../images/dashboard/traces.png)

| Column | Description |
|---|---|
| Name | Trace / run label |
| Status | `completed`, `error`, etc. |
| Duration | Wall-clock time |
| Tokens | Input / output / cached token counts |
| Spans | Number of child spans |
| Time | Timestamp |

Filter by agent ID. **Refresh** button for manual reload.

### Delegations (`/delegations`)

Tracks inter-agent delegation events — which agent delegated a task to which sub-agent, with status and timing.

![Delegations](../images/dashboard/Delegations.png)

---

## 4. System

### Providers (`/providers`)

LLM provider management table.

![Providers](../images/dashboard/providers.png)

| Column | Description |
|---|---|
| Name | Provider label |
| Type | `dashscope`, `bailian`, `gemini`, `openrouter`, `openai_compat` |
| API Base URL | Endpoint |
| API Key | Masked |
| Status | `Enabled` / `Disabled` |

Actions: **Add Provider**, **Refresh**, edit, delete per row.

### Config (`/config`)

Gateway configuration editor with two modes: **UI form** and **Raw Editor**.

![Config](../images/dashboard/config.png)

Sections:

- **Gateway** — host, port, token, owner IDs, allowed origins, rate limit (RPM), max message chars, inbound debounce, injection action
- **LLM Providers** — inline provider list
- **Agent Defaults** — default model settings

> A yellow info banner reminds that environment variables take precedence over UI-set values and that secrets should be configured via env, not stored in the config file.

---

## 5. Accessing the Dashboard

The dashboard is bundled with GoClaw and automatically available when the gateway starts. No separate setup required.

- **URL**: `http://localhost:3000` (default)
- **Connection**: Connects to the gateway via WebSocket automatically
- See [Getting Started](#getting-started) for installation and startup instructions
