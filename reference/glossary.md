# Glossary

> Definitions for GoClaw-specific terms used throughout the documentation.

## Agent

An AI assistant instance with its own identity, LLM configuration, workspace, and context files. Every agent has a unique `agent_key` (e.g. `researcher`), a display name, a provider/model pair, and a type (`open` or `predefined`).

Agents are stored in the `agents` table. At runtime, the gateway resolves agent configuration by merging `agents.defaults` with per-agent overrides from `agents.list` in `config.json`, then applying any database-level overrides.

See: [Open vs Predefined Agents](../agents/open-vs-predefined.md)

---

## Open Agent

An agent whose context is **per-user**. Each user who chats with an open agent gets their own private session history and USER.md context file. The system prompt files (SOUL.md, IDENTITY.md) are shared, but the conversation and user-specific memory are isolated.

This is the default agent type (`agent_type: "open"`).

---

## Predefined Agent

An agent whose **core context is shared** across all users. All users interact with the same SOUL.md, IDENTITY.md, and system prompt. Only USER_PREDEFINED.md is per-user. Predefined agents are designed for purpose-built bots (e.g. an FAQ bot or a coding assistant) where consistent persona is more important than per-user isolation.

Set with `agent_type: "predefined"`.

---

## Summon / Summoning

The process of using an LLM to **auto-generate** an agent's personality files (SOUL.md, IDENTITY.md, USER_PREDEFINED.md) from a plain-text description. When you create a predefined agent with a `description` field, the gateway triggers summoning in the background. The agent status shows `summoning` until generation is complete, then transitions to `active`.

Summoning only runs once per agent, or when you trigger `POST /v1/agents/{id}/resummon`.

See: [Summoning & Bootstrap](../agents/summoning-bootstrap.md)

---

## Bootstrap

The set of **context files loaded into the system prompt** at the start of every agent run. Bootstrap files include SOUL.md (personality), IDENTITY.md (capabilities), and optionally USER.md or USER_PREDEFINED.md (user-specific context).

For open agents, bootstrap files are stored per-agent in `agent_context_files` and per-user in `user_context_files`. The gateway loads and concatenates them, applying character limits (`bootstrapMaxChars`, `bootstrapTotalMaxChars`) before inserting them into the LLM's system prompt.

---

## Compaction

**Automatic session history summarization** that fires when a session's token usage exceeds a threshold (default: 75% of the context window). During compaction, the gateway:

1. Optionally flushes recent conversation to memory (Memory Flush).
2. Summarizes the existing history using the LLM.
3. Replaces the full history with the summary, keeping the last few messages intact.

Compaction keeps sessions alive indefinitely without hitting context limits. Tracked by `compaction_count` on the `sessions` table.

Configured via `agents.defaults.compaction` in `config.json`.

---

## Context Pruning

An in-memory optimization that **trims old tool results** to reclaim context space before compaction is needed. Two modes:

- **Soft trim** — truncates oversized tool results to `headChars + tailChars`.
- **Hard clear** — replaces very old tool results with a placeholder string.

Pruning activates when the context exceeds `softTrimRatio` or `hardClearRatio` of the context window. Auto-enabled when Anthropic is configured (mode: `cache-ttl`).

Configured via `agents.defaults.contextPruning` in `config.json`.

---

## Delegation

When one agent **hands off a task to another agent** and waits for the result. The calling (parent) agent invokes a `delegate` or `spawn` tool, which creates a subagent session. The parent resumes once the subagent completes and reports back.

Delegation requires an **Agent Link** between the two agents. The `traces` table records delegations via `parent_trace_id`. Active delegations appear in the `delegations` table and emit `delegation.*` WebSocket events.

---

## Handoff

A one-way **transfer of conversation ownership** from one agent to another, typically triggered mid-conversation when a user's request is better handled by a different agent. Unlike delegation (which returns results to the caller), a handoff permanently routes the session to the new agent.

Emits the `handoff` WebSocket event with `from_agent`, `to_agent`, and `reason` in the payload.

---

## Evaluate Loop

The **think → act → observe** cycle that the agent loop runs repeatedly:

1. **Think** — LLM processes the current context and decides what to do.
2. **Act** — If the LLM emits a tool call, the gateway executes it.
3. **Observe** — The tool result is added to context, and the loop continues.

The loop stops when the LLM produces a final text response (no pending tool calls), or when `max_tool_iterations` is reached.

---

## Lane

A **named execution queue** in the scheduler. GoClaw uses three built-in lanes:

| Lane | Purpose |
|------|---------|
| `main` | User-initiated chat messages from channels |
| `subagent` | Delegated tasks from parent agents |
| `cron` | Scheduled cron job runs |

Lanes provide **backpressure** and **adaptive throttling** — when a session approaches the summarization threshold, per-session concurrency is reduced to prevent races between concurrent runs and compaction.

---

## Pairing

A **trust establishment flow** for channel users. When a Telegram (or other channel) user messages the bot for the first time and `dm_policy` is set to `"pairing"`, the bot asks them to send a pairing code. The gateway generates an 8-character code, and an operator approves it via `goclaw pairing approve` or the web dashboard.

Once paired, the user's `sender_id + channel` is stored in `paired_devices` and they can chat freely. Pairings can be revoked at any time.

---

## Provider

An **LLM backend** registered with the gateway. Providers are stored in the `llm_providers` table with an encrypted API key. At runtime the gateway resolves each agent's effective provider and makes authenticated API calls.

Supported provider types:
- `openai_compat` — any OpenAI-compatible API (OpenAI, Groq, DeepSeek, Mistral, OpenRouter, xAI, etc.)
- `anthropic` — Anthropic native API with streaming SSE
- `claude-cli` — local `claude` CLI binary (no API key required)

Providers can also be added via the web dashboard or `POST /v1/providers`.

---

## Session

A **persistent conversation thread** between a user and an agent. The session key uniquely identifies the thread, typically composed of channel and user identifiers (e.g. `telegram:123456789`).

Sessions store the full message history as JSONB, cumulative token counts, the active model and provider, and compaction metadata. They persist in the `sessions` table and survive gateway restarts.

---

## Skill

A **reusable instruction package** — typically a Markdown file with a `## SKILL` frontmatter block — that agents can discover and apply. Skills teach agents new workflows, personas, or domain knowledge without modifying their core system prompt.

Skills are uploaded as `.zip` files via `POST /v1/skills/upload`, stored in the `skills` table, and indexed for both BM25 full-text and semantic (embedding) search. Access is controlled via `skill_agent_grants` and `skill_user_grants`.

At runtime, agents search for relevant skills using the `skill_search` tool and read their content with `read_file`.

---

## Workspace

The **filesystem directory** where an agent reads and writes files. Tools like `read_file`, `write_file`, `list_files`, and `exec` operate relative to the workspace. When `restrict_to_workspace` is `true` (the default), agents cannot escape this directory.

Each agent has a workspace path configured in `agents.defaults.workspace` or per-agent overrides. The path supports `~` expansion.

---

## Subagent

An agent session **spawned by another agent** to handle a parallel or delegated subtask. Subagents are created via the `spawn` tool and run in the `subagent` lane. They report results back to the parent via the `AnnounceQueue`, which batches and debounces notifications.

Subagent concurrency is controlled by `agents.defaults.subagents` (`maxConcurrent`, `maxSpawnDepth`, `maxChildrenPerAgent`).

---

## Agent Team

A **named group of agents** that collaborate on a shared task list. One agent is designated the `lead`; others are `members`. Teams use:

- **Task list** — a shared `team_tasks` table where agents claim, work on, and complete tasks.
- **Peer messages** — a `team_messages` mailbox for agent-to-agent communication.
- **Agent links** — automatically created between team members to enable delegation.

Teams emit `team.*` WebSocket events for real-time visibility into collaboration.

---

## Agent Link

A **permission record** authorizing one agent to delegate tasks to another. Links are stored in `agent_links` with `source_agent_id` → `target_agent_id`. They can be created manually via `POST /v1/agents/links` or automatically when forming a team.

Without a link, agents cannot delegate to each other — even if they share a team.

---

## MCP (Model Context Protocol)

An open protocol for **connecting external tool servers** to LLM agents. GoClaw can connect to MCP servers via `stdio` (subprocess), `sse`, or `streamable-http` transports. Each server exposes a set of tools that are transparently registered alongside built-in tools.

MCP servers are managed via the `mcp_servers` table and `POST /v1/mcp/servers`. Access is granted per-agent or per-user via `mcp_agent_grants` and `mcp_user_grants`.

---

## What's Next

- [Config Reference](./config-reference.md) — configure agents, compaction, context pruning, sandbox
- [WebSocket Protocol](./websocket-protocol.md) — event names for delegation, handoff, and team activity
- [Database Schema](./database-schema.md) — table definitions for sessions, traces, teams, and more
