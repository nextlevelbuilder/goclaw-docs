# User Overrides

> **Partially implemented feature.** The database schema and store API exist, but overrides are not yet applied at runtime. This page documents the planned behavior and current store API.

---

> **Warning:** User overrides are **not applied during agent execution**. The `GetUserOverride()` store method exists but is not called in the agent execution path. Setting an override has no effect on which LLM is used until this feature is fully integrated.

---

## Overview

The intent of user overrides is to let individual users change the LLM provider or model for an agent without affecting others. For example: Alice prefers GPT-4o while Bob stays on Claude.

A **user override** would be a per-user, per-agent setting that says: "When *this user* runs *this agent*, use *this provider/model* instead of the agent's defaults."

**Current status:** Schema and store methods are implemented. Runtime integration is pending.

## The user_agent_overrides Table

The schema exists and stores overrides:

```sql
CREATE TABLE user_agent_overrides (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,          -- e.g. "anthropic", "openai"
  model VARCHAR NOT NULL,             -- e.g. "claude-sonnet-4-6", "gpt-4o"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- **agent_id + user_id** is unique: one override per user per agent
- **provider**: The LLM provider (must be configured in the gateway)
- **model**: The model name within that provider

## Planned Precedence Chain

> **Note:** This precedence chain is the planned behavior. It is not currently implemented — the runtime always uses the agent's configured provider/model.

```
1. User override exists?
   → Yes: use provider + model from user_agent_overrides  [PLANNED — not implemented]
   → No: proceed to step 2

2. Agent config has provider + model?
   → Yes: use agent's defaults  [ACTIVE]
   → No: proceed to step 3

3. Global default provider + model?
   → Yes: use global default  [ACTIVE]
   → No: error (no LLM configured)
```

## Store API (Available Now)

The store methods are implemented and usable directly:

### Setting an Override

```go
override := &store.UserAgentOverrideData{
  AgentID:  agentID,
  UserID:   "alice@example.com",
  Provider: "openai",
  Model:    "gpt-4o",
}
err := agentStore.SetUserOverride(ctx, override)
```

### Getting an Override

```go
override, err := agentStore.GetUserOverride(ctx, agentID, userID)
if override != nil {
  // override.Provider, override.Model are available
} else {
  // no override stored
}
```

### Deleting an Override

> **Note:** `DeleteUserOverride()` is defined in the store interface but not yet implemented in the PostgreSQL store. Calling it will return an error or no-op depending on the build.

```go
// Planned — not yet implemented in pg store:
err := agentStore.DeleteUserOverride(ctx, agentID, userID)
```

## WebSocket RPC — Planned

> **Note:** No WebSocket RPC methods for user overrides exist yet. The following is the planned interface:

```json
{
  "method": "agents.override.set",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

This method does not currently exist in the gateway.

## Dashboard User Settings — Planned

The Dashboard **Agent Preferences** UI for managing overrides is planned but not yet available.

## Use Cases (Planned)

These use cases describe the intended behavior once runtime integration is complete.

### Case 1: Cost Control
- Agent defaults to expensive GPT-4 for best quality
- Users on a budget can override to Claude 3 Haiku for cheaper runs

### Case 2: Personal Preference
- Research team prefers Claude for analysis
- Marketing team prefers GPT-4 for copy
- Single agent, two teams, two configurations

### Case 3: Feature Testing
- Team wants to test a new model on one agent
- Opt-in users set override; others stay on stable version

## Supported Providers & Models

Check your gateway config to see which providers/models are available. Common ones:

| Provider | Models |
|----------|--------|
| **anthropic** | claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6 |
| **openai** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **openai-compat** | depends on your custom provider (e.g., local Ollama) |

Ask your admin if you're unsure which are enabled.

## User Identity Resolution

When an agent runs, GoClaw must determine which tenant user identity to use for credential lookups. This is separate from the LLM override — it's about resolving the *credential user* from the incoming channel message.

The `UserIdentityResolver` interface (in `internal/agent/user_identity_resolver.go`) handles this:

```go
type UserIdentityResolver interface {
    ResolveTenantUserID(ctx context.Context, channelType, senderID string) (string, error)
}
```

### Resolution Logic

The agent loop calls `resolveCredentialUserID()` before tool execution:

| Scenario | Resolution |
|----------|-----------|
| **DM / HTTP / cron** | Resolve `UserID` via channel type → use resolved ID, fallback to raw `UserID` |
| **Group chat — individual sender** | Resolve numeric sender ID first (strips `senderID\|suffix` format) |
| **Group chat — group contact** | Extract `chatID` from `group:{channel}:{chatID}` format, resolve via contact store |

This ensures that cross-channel contacts (e.g., the same person on Telegram and WhatsApp) resolve to the same tenant user identity for consistent credential lookups.

### What It Affects

- Which stored credentials (API keys, tokens) the agent can access
- Per-user tool permissions that depend on tenant user identity
- Does **not** affect which LLM model or provider is used (see above)

## What's Next

- [System Prompt Anatomy — How model choice affects system prompt size](/system-prompt-anatomy)
- [Sharing and Access — Control who can access agents](/sharing-and-access)
- [Creating Agents — Set default provider/model when creating an agent](/creating-agents)

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
