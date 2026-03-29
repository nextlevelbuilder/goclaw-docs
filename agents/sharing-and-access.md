# Sharing and Access Control

> Control who can use your agents. Access is enforced via owner vs. non-owner distinction; role labels are stored for future enforcement.

## Overview

GoClaw's permission system ensures agents stay in the right hands. The core concept:

- **Owner** owns the agent (full control, can delete, share)
- **Default agents** are readable by all users (good for shared utilities)
- **Shares** grant others access with a stored role label

Access is checked in a 4-step pipeline: Does the agent exist? → Is it default? → Are you the owner? → Is it shared with you?

## The agent_shares Table

When you share an agent, a record is created in the `agent_shares` table:

```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,           -- stored label: "admin", "operator", "viewer", "user", etc.
  granted_by VARCHAR NOT NULL,     -- who granted this share
  created_at TIMESTAMP NOT NULL
);
```

Each row represents one user's access to one agent.

## Roles — Stored but Not Yet Enforced

> **Important:** Role labels are stored in `agent_shares` but **not currently enforced** at runtime. The only distinction enforced today is **owner vs. non-owner**. Role-based permission checks are planned for a future release.

| Role | Planned Permissions | Status |
|------|---------------------|--------|
| **admin** | Full control: read, write, delete, reshare, manage team | Planned |
| **operator** | Read + write: run agent, edit context files, but NOT delete/reshare | Planned |
| **viewer** | Read-only: run agent, view files, but NOT edit | Planned |
| **user** | Basic access (default when no role specified) | Stored only |

**What IS enforced today:**
- Owner can share, revoke, and list shares; non-owners cannot
- Any user with a share row can access the agent (regardless of role value)
- Default agents (`is_default = true`) are accessible by everyone

**What is NOT enforced today:**
- Role-based write/delete restrictions for shared users
- Preventing "viewer" role holders from editing
- "admin" role does not grant resharing ability

### Default Role

When sharing without specifying a role, the default is `"user"`:

```
POST /v1/agents/:id/shares
{ "user_id": "alice@example.com" }
→ role stored as "user"
```

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
   → Yes: allow (you get the role stored in that row)
   → No: access denied
```

**Result**: Each access check returns `(allowed: bool, role: string)`. The role string is returned but downstream handlers currently do not restrict behavior based on it.

## Predefined Agents via Channel Instances

Predefined agents can also be accessible through `channel_instances`. If a predefined agent has an enabled channel instance whose `allow_from` list includes your user ID, you can access that agent even without a direct share or default flag.

## Sharing an Agent via HTTP API

Use `POST /v1/agents/:id/shares` to share an agent. Only the owner (or a gateway owner-level user) can share.

**Request:**
```http
POST /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": "alice@example.com",
  "role": "operator"
}
```

**Response (201 Created):**
```json
{ "ok": "true" }
```

If `role` is omitted, it defaults to `"user"`.

## Revoking Access

Use `DELETE /v1/agents/:id/shares/:userID` to remove a share immediately.

**Request:**
```http
DELETE /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares/alice@example.com
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{ "ok": "true" }
```

## Listing Shares

Use `GET /v1/agents/:id/shares` to see who has access. Only the owner can list shares.

**Response:**
```json
{
  "shares": [
    { "id": "...", "agent_id": "...", "user_id": "alice@example.com", "role": "operator", "granted_by": "owner@example.com", "created_at": "..." },
    { "id": "...", "agent_id": "...", "user_id": "bob@example.com", "role": "viewer", "granted_by": "owner@example.com", "created_at": "..." }
  ]
}
```

**Go store method:**
```go
shares, err := agentStore.ListShares(ctx, agentID)
```

## Dashboard Share Management

The Dashboard provides a UI for sharing:

1. Open **Agents** → select your agent
2. Click **Sharing** or **Team** tab
3. Enter a user ID (email, Telegram handle, etc.)
4. Select a role label (note: not enforced at runtime yet)
5. Click **Share**
6. To revoke: find the user in the list, click **Remove**

Changes take effect immediately.

## Use Cases

### Scenario 1: Build → Tune → Deploy

1. **Owner** creates `customer-summary` agent (default: not shared)
2. **Owner** shares with `alice` — she gains access (role stored as "operator")
3. **Alice** accesses the agent and refines settings
4. **Owner** marks agent **default** → all users can now use it
5. **Owner** revokes alice's share (no longer needed)

### Scenario 2: Team Collaboration

1. **Owner** creates `research-agent`
2. Shares with team members — they can all access and run the agent
3. Shares with manager as "viewer" — manager can access (role enforcement planned)
4. Team iterates; owner controls sharing and deletion

### Scenario 3: Shared Utility

1. **Owner** creates `web-search` agent
2. Marks it **default** (no explicit shares needed)
3. All users can use it; owner can still edit it
4. If **owner** unmarks default, only owner can use it again

## ListAccessible — Find Your Agents

When a user loads their agent list, GoClaw returns only agents they can access:

```go
agents, err := agentStore.ListAccessible(ctx, userID)
// Returns:
// - All agents owned by userID
// - All default agents
// - All agents explicitly shared with userID
// - Predefined agents accessible via channel_instances
```

This powers the "My Agents" list in the Dashboard.

## Best Practices

| Practice | Why |
|----------|-----|
| **Share by explicit user ID** | Clear audit trail of who has access |
| **Revoke shares when no longer needed** | Reduces clutter; tightens security |
| **Use default sparingly** | Good for utilities (web search, memory); bad for sensitive agents |
| **Keep track of shares via ListShares** | Especially for multi-team agents; prevents confusion |

## Common Issues

| Problem | Solution |
|---------|----------|
| User can't see the agent | Check: (1) agent exists, (2) user has a share row, or (3) agent is default |
| Revoked but user still has access | Maybe the agent is **default**; unmark it first, then revoke |
| Forgot who has access | Use `GET /v1/agents/:id/shares` or Dashboard → Sharing tab to audit |
| Role restrictions not working | Role-based enforcement is planned, not yet implemented — all shared users have equal access today |

## What's Next

- [User Overrides — Let users customize LLM provider/model per-agent](/user-overrides)
- [System Prompt Anatomy — How permissions affect system prompt sections](/system-prompt-anatomy)
- [Creating Agents — Create an agent and immediately share it](/creating-agents)

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
