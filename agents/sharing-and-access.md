# Sharing and Access Control

> Control who can use your agents with granular role-based permissions: admin (full), operator (read+write), viewer (read-only).

## Overview

GoClaw's permission system ensures agents stay in the right hands. The core concept is simple:

- **Owner** owns the agent (full control, can delete, share)
- **Default agents** are readable by all users (good for shared utilities)
- **Shares** grant others access with a specific role

Access is checked in a 4-step pipeline: Does the agent exist? → Is it default? → Are you the owner? → Is it shared with you?

## The agent_shares Table

When you share an agent, a record is created in the `agent_shares` table:

```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,           -- "admin", "operator", or "viewer"
  granted_by VARCHAR NOT NULL,     -- who granted this share
  created_at TIMESTAMP NOT NULL
);
```

Each row represents one user's access to one agent.

## Roles Explained

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | Full control: read, write, delete, reshare, manage team | Trusted collaborator who helps manage the agent |
| **operator** | Read + write: run the agent, edit context files, but NOT delete/reshare | Team member who uses the agent and refines settings |
| **viewer** | Read-only: run the agent, view files, but NOT edit | Stakeholder who observes outputs only |

### Practical Examples

- **Owner** builds a research agent. Grants **admin** to an assistant who helps tune prompts.
- **Owner** builds a customer service bot. Grants **operator** to support team (they can tweak tone), **viewer** to manager (sees outputs only).
- **Owner** creates a public utility agent and marks it **default**, so all users can use it without explicit shares.

## The 4-Step CanAccess Pipeline

When you try to access an agent, GoClaw checks in this order:

```
1. Does the agent exist?
   → No: access denied

2. Is it marked is_default = true?
   → Yes (and exists): allow (you get "user" role)
   → No: proceed to step 3

3. Are you the owner (owner_id = your_id)?
   → Yes: allow (you get "owner" role)
   → No: proceed to step 4

4. Is there an agent_shares row for (agent_id, your_id)?
   → Yes: allow (you get the role from that row)
   → No: access denied
```

**Result**: Each access check returns `(allowed: bool, role: string)`.

## Sharing an Agent via API

Use the `ShareAgent()` method (go backend) or equivalent RPC:

```go
// Go example
err := agentStore.ShareAgent(ctx, agentID, "user@example.com", "operator", "owner@example.com")
if err != nil {
  log.Fatal(err)
}
```

### WebSocket API

You can share agents via WebSocket RPC (exact method name depends on your gateway implementation):

```json
{
  "method": "agents.share",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "role": "operator",
    "grantedBy": "bob@example.com"
  }
}
```

**Response** (on success):
```json
{
  "ok": true,
  "share": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "role": "operator",
    "grantedBy": "bob@example.com",
    "createdAt": "2026-03-07T15:30:00Z"
  }
}
```

## Revoking Access

Remove a share to immediately deny access:

```go
err := agentStore.RevokeShare(ctx, agentID, "alice@example.com")
```

WebSocket:
```json
{
  "method": "agents.unshare",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com"
  }
}
```

## Listing Shares

See who has access to your agent:

```go
shares, err := agentStore.ListShares(ctx, agentID)
// shares: []AgentShareData with id, agent_id, user_id, role, granted_by, created_at
```

**Example output**:
```
Share 1: user_id="alice@example.com", role="operator"
Share 2: user_id="bob@example.com", role="viewer"
```

## Dashboard Share Management

The Dashboard provides a UI for sharing:

1. Open **Agents** → select your agent
2. Click **Sharing** or **Team** tab
3. Enter a user ID (email, Telegram handle, etc.)
4. Select a role: Admin, Operator, Viewer
5. Click **Share**
6. To revoke: find the user in the list, click **Remove**

Changes take effect immediately.

## Use Cases

### Scenario 1: Build → Tune → Deploy

1. **Owner** creates `customer-summary` agent (default: not shared)
2. **Owner** grants **admin** to `alice` (analyst who refines prompts)
3. **Alice** tweaks SOUL.md, tests with real queries
4. **Owner** marks agent **default** → all users can now use it
5. **Owner** revokes **alice**'s share (no longer needed)

### Scenario 2: Team Collaboration

1. **Owner** creates `research-agent`
2. Grants **operator** to team members → they can run it and tune settings
3. Grants **viewer** to manager → sees outputs, can't edit
4. Team iterates; owner controls major changes

### Scenario 3: Shared Utility

1. **Owner** creates `web-search` agent
2. Marks it **default** (no explicit shares needed)
3. All users can use it; owner can still edit it
4. If **owner** revokes default flag, only owner can use it again

## ListAccessible — Find Your Agents

When a user logs in, GoClaw returns only agents they can access:

```go
agents, err := agentStore.ListAccessible(ctx, userID)
// Returns:
// - All agents owned by userID
// - All default agents
// - All agents explicitly shared with userID
```

This powers the "My Agents" list in the Dashboard.

## Best Practices

| Practice | Why |
|----------|-----|
| **Give viewer role by default** | Safe: read-only access prevents accidental edits |
| **Require admin approval for major changes** | Ensures consistency; owner reviews before deploy |
| **Revoke shares when no longer needed** | Reduces clutter; tightens security |
| **Use default sparingly** | Good for utilities (web search, memory); bad for sensitive agents |
| **Document who has what role** | Especially for multi-team agents; prevents confusion |

## Common Issues

| Problem | Solution |
|---------|----------|
| User can't see the agent | Check: (1) agent exists, (2) you're the owner, (3) user has share, or (4) agent is default |
| Can't change agent settings | You need at least **operator** role; viewer is read-only |
| Revoked but user still has access | Maybe the agent is **default**; unmark it first, then revoke |
| Forgot who has access | Use `ListShares()` or Dashboard → Sharing tab to audit |
| Want to share but unsure on role | Use **viewer** first; upgrade to **operator** if they need to edit |

## What's Next

- [User Overrides — Let users customize LLM provider/model per-agent](user-overrides.md)
- [System Prompt Anatomy — How permissions affect system prompt sections](system-prompt-anatomy.md)
- [Creating Agents — Create an agent and immediately share it](creating-agents.md)
