# Creating Agents

> Set up a new AI agent via CLI, dashboard, or managed API.

## Overview

You can create agents three ways: interactively with the CLI, through the web dashboard, or programmatically via HTTP. Each agent needs a unique key, display name, LLM provider, and model. Optional fields include context window, max tool iterations, workspace location, and tools configuration.

## Agent Status Lifecycle

When a predefined agent with a description is created, it goes through these statuses:

| Status | Description |
|--------|-------------|
| `summoning` | LLM is generating personality files (SOUL.md, IDENTITY.md, USER_PREDEFINED.md) |
| `active` | Agent is ready to use |
| `summon_failed` | LLM generation failed; template files are used as fallback |

Open agents are created with `active` status immediately — no summoning step.

## CLI: Interactive Wizard

The easiest way to get started:

```bash
./goclaw agent add
```

This launches a step-by-step wizard. You'll be asked for:

1. **Agent name** — used to generate a normalized ID (lowercase, hyphens). Example: "coder" → `coder`
2. **Display name** — shown in dashboards. Can be "Code Assistant" for the same `coder` agent
3. **Provider** — LLM provider (optional: inherit from defaults, or choose OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral)
4. **Model** — model name (optional: inherit from defaults, or specify like `claude-sonnet-4-6`)
5. **Workspace directory** — where context files live. Defaults to `~/.goclaw/workspace-{agent-id}`

Once created, restart the gateway to activate the agent:

```bash
./goclaw agent list          # see your agents
./goclaw gateway             # restart to activate
```

## Dashboard: Web UI

From the agents page in the web dashboard:

1. Click **"Create Agent"** or **"+"**
2. Fill in the form:
   - **Agent key** — lowercase slug (letters, numbers, hyphens only)
   - **Display name** — human-readable name
   - **Agent type** — "Open" (per-user context) or "Predefined" (shared context)
   - **Provider** — LLM provider
   - **Model** — specific model
   - **Other fields** — context window, max iterations, etc.
3. Click **Save**

If you're creating a **predefined agent with a description**, the system automatically starts LLM-powered "summoning" — it generates SOUL.md, IDENTITY.md, and optionally USER_PREDEFINED.md from your description.

## HTTP API

You can also create agents via the HTTP API:

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "research",
    "display_name": "Research Assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "context_window": 200000,
    "max_tool_iterations": 20,
    "workspace": "~/.goclaw/research-workspace"
  }'
```

**Required fields:**
- `agent_key` — unique identifier (slug format)
- `display_name` — human-readable name
- `provider` — LLM provider name
- `model` — model identifier

**Optional fields:**
- `agent_type` — `"open"` (default) or `"predefined"`
- `context_window` — max context tokens (default: 200,000)
- `max_tool_iterations` — max tool calls per run (default: 20)
- `workspace` — file path for agent files (default: `~/.goclaw/{agent-key}-workspace`)
- `other_config` — JSON object with custom fields (e.g., `{"description": "..."}` for summoning)

**Response:** Returns the created agent object with a unique ID and status.

## Required Fields Reference

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `agent_key` | string | Unique slug (lowercase, alphanumeric, hyphens) | `code-bot`, `faq-helper` |
| `display_name` | string | Human-readable name shown in UI | `Code Assistant` |
| `provider` | string | LLM provider (overrides default) | `anthropic`, `openrouter` |
| `model` | string | Model identifier (overrides default) | `claude-sonnet-4-6` |

## Optional Fields Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agent_type` | string | `open` | `open` (per-user context) or `predefined` (shared) |
| `context_window` | integer | 200,000 | Max tokens in context |
| `max_tool_iterations` | integer | 20 | Max tool calls per request |
| `workspace` | string | `~/.goclaw/{key}-workspace` | Directory for context files |
| `other_config` | JSON | `{}` | Custom fields (e.g., `description` for summoning) |

> **frontmatter field:** After summoning, GoClaw stores a short expertise summary (auto-extracted from SOUL.md) in the agent's `frontmatter` field. This is used for agent discovery and delegation — it is not something you set directly.

## Examples

### CLI: Add a Research Agent

```bash
$ ./goclaw agent add

── Add New Agent ──

Agent name: researcher
Display name: Research Assistant
Provider: (inherit: openrouter)
Model: (inherit: claude-sonnet-4-6)
Workspace directory: ~/.goclaw/workspace-researcher

Agent "researcher" created successfully.
  Display name: Research Assistant
  Provider: (inherit: openrouter)
  Model: (inherit: claude-sonnet-4-6)
  Workspace: ~/.goclaw/workspace-researcher

Restart the gateway to activate this agent.
```

### API: Create a Predefined FAQ Bot with Summoning

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token123" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "faq-bot",
    "display_name": "FAQ Assistant",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "A friendly FAQ bot that answers common questions about our product. Organized, helpful, patient. Answers in the user'\''s language."
    }
  }'
```

The system will trigger background LLM summoning to generate personality files. Poll the agent status to see when it transitions from `summoning` to `active`. If summoning fails, status is set to `summon_failed` and template files are kept as fallback.

> **Note:** The `provider` and `model` fields in the HTTP request set the agent's default LLM. If global defaults are configured in `GOCLAW_CONFIG`, these fields may be overridden at runtime. Summoning itself uses the global default provider/model unless the agent has its own set.
>
> **Summoner service:** Predefined agent summoning requires the summoner service to be enabled. If it is not running, the agent is created with `active` status using template files directly (no LLM generation).

## Common Issues

| Problem | Solution |
|---------|----------|
| "Agent key must be a valid slug" | Use lowercase letters, numbers, and hyphens only. No spaces or special characters. |
| "An agent with key already exists" | Choose a unique key. Use `./goclaw agent list` to see existing agents. |
| "Agent created but not showing up" | Restart the gateway: `./goclaw`. New agents are loaded on startup. |
| Summoning takes a long time or fails | Check LLM provider connectivity and model availability. Failed summoning keeps template files as fallback. |
| Provider or model not recognized | Ensure the provider is configured in `GOCLAW_CONFIG`. Check provider docs for correct model names. |

## What's Next

- [Open vs. Predefined](/open-vs-predefined) — understand context isolation differences
- [Context Files](/context-files) — learn about SOUL.md, IDENTITY.md, and other system files
- [Summoning & Bootstrap](/summoning-bootstrap) — how LLM generates personality files on first use

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
