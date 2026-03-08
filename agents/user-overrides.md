# User Overrides

> Let individual users change the LLM provider or model for an agent without affecting others. Perfect for "I prefer GPT-4o" or "Use my custom API key."

## Overview

By default, every user runs an agent with the same provider and model. But what if Alice prefers Claude while Bob wants GPT-4? That's where user overrides come in.

A **user override** is a per-user, per-agent setting that says: "When *this user* runs *this agent*, use *this provider/model* instead of the agent's defaults."

## The user_agent_overrides Table

When a user sets an override, it's stored here:

```sql
CREATE TABLE user_agent_overrides (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,          -- e.g. "anthropic", "openai"
  model VARCHAR NOT NULL,             -- e.g. "claude-3-5-sonnet", "gpt-4o"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- **agent_id + user_id** is unique: one override per user per agent
- **provider**: The LLM provider (must be configured in the gateway)
- **model**: The model name within that provider

## The Precedence Chain

When a user runs an agent, GoClaw picks the LLM in this order:

```
1. User override exists?
   → Yes: use provider + model from user_agent_overrides
   → No: proceed to step 2

2. Agent config has provider + model?
   → Yes: use agent's defaults
   → No: proceed to step 3

3. Global default provider + model?
   → Yes: use global default
   → No: error (no LLM configured)
```

**Example**:
- Agent "research-bot" defaults to Claude 3.5 Sonnet
- Alice sets override: GPT-4o
- When Alice runs research-bot: GPT-4o is used (her override wins)
- When Bob runs research-bot: Claude 3.5 Sonnet (no override, uses agent default)

## Setting an Override

### Via API

```go
// Go example
override := &store.UserAgentOverrideData{
  AgentID:  agentID,
  UserID:   "alice@example.com",
  Provider: "openai",
  Model:    "gpt-4o",
}
err := agentStore.SetUserOverride(ctx, override)
```

### Via WebSocket RPC

Exact method name depends on your gateway. Example:

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

**Response**:
```json
{
  "ok": true,
  "override": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

## Getting an Override

Check if a user has an override configured:

```go
override, err := agentStore.GetUserOverride(ctx, agentID, userID)
if override != nil {
  // User has an override: provider, model
} else {
  // No override; agent defaults apply
}
```

## Dashboard User Settings

The Dashboard typically has a **User Settings** or **Agent Preferences** page:

1. Log in as a user
2. Go to **Settings** → **Agent Preferences**
3. For each agent you use:
   - Toggle "Override provider/model"
   - Select a provider (if multiple are configured)
   - Select a model
4. Click **Save**

Changes take effect on the next run.

## Use Cases

### Case 1: Cost Control
- Agent defaults to expensive GPT-4 for best quality
- Users on a budget can override to Claude 3 Haiku for cheaper runs
- Owner still controls the default for new agents

### Case 2: Personal Preference
- Research team prefers Claude for analysis
- Marketing team prefers GPT-4 for copy
- Single agent, two teams, two configurations

### Case 3: Custom API Keys
- Organization uses shared API key in agent config
- Alice has her own OpenAI key, wants to use it
- Override lets her use her key without affecting others

### Case 4: Feature Testing
- Team wants to test new Claude model (claude-3-7-opus) on one agent
- Don't want to change the agent's default yet
- Opt-in users set override; others stay on stable version

## Clearing an Override

To go back to agent defaults, delete the override:

```go
// No direct delete method shown in source, but typically:
err := agentStore.DeleteUserOverride(ctx, agentID, userID)
```

Or in the Dashboard: toggle off "Override provider/model" and save.

## Supported Providers & Models

Check your gateway config to see which providers/models are available. Common ones:

| Provider | Models |
|----------|--------|
| **anthropic** | claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus |
| **openai** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **openai-compat** | depends on your custom provider (e.g., local Ollama) |

Ask your admin if you're unsure which are enabled.

## Best Practices

| Practice | Why |
|----------|-----|
| **Set agent defaults sensibly** | Most users won't override; defaults matter |
| **Let power users override** | They know their needs; give them control |
| **Document which models fit which tasks** | Claude > analysis, GPT-4 > creative, Haiku > cheap |
| **Don't require overrides** | Should be optional, not mandatory |
| **Test overrides in non-prod** | Verify new model works before going live |

## Common Issues

| Problem | Solution |
|---------|----------|
| Override isn't taking effect | Wait for a new session start; cached agent config might be stale |
| Model not in the list | Admin hasn't configured it; ask your admin to enable it |
| User wants to override but can't find the setting | Check Dashboard → Settings → Agent Preferences; may be under a different name |
| Override cost more than expected | Verify the model; some models are more expensive than others |
| Can't clear override | Delete it via API or Dashboard; "no override" means use agent defaults |

## What's Next

- [System Prompt Anatomy — How model choice affects system prompt size](system-prompt-anatomy.md)
- [Sharing and Access — Control who can set overrides (via role-based permissions)](sharing-and-access.md)
- [Creating Agents — Set default provider/model when creating an agent](creating-agents.md)
