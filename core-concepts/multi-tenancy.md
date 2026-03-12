# Multi-Tenancy

> How GoClaw isolates data per user without requiring its own auth system.

## Overview

GoClaw is multi-tenant by design: every user gets isolated sessions, memory, context files, and traces. Instead of managing users itself, GoClaw trusts an upstream service to identify users — a pattern called identity propagation.

## Identity Propagation

GoClaw doesn't authenticate users. Your application tells GoClaw who the user is:

### HTTP API

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "X-GoClaw-User-Id: user-123" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "default", "messages": [...]}'
```

### WebSocket

```json
{
  "type": "connect",
  "user_id": "user-123",
  "token": "YOUR_GATEWAY_TOKEN"
}
```

### Messaging Channels

For Telegram, Discord, etc., the user ID comes from the channel itself (e.g., Telegram user ID `386246614`).

## User ID Format

The user ID is an **opaque string** (up to 255 characters). GoClaw never validates its format — you decide the convention.

**Recommended for multi-tenant apps:**

```
tenant.{tenantId}.user.{userId}
```

Example: `tenant.acme-corp.user.john` — this naturally scopes all data to both the tenant and the user.

## What's Isolated

Every piece of user data is scoped by user ID:

| Data | Table | Isolation |
|------|-------|-----------|
| Context files | `user_context_files` | Per-user per-agent |
| Agent profiles | `user_agent_profiles` | Per-user per-agent |
| Agent overrides | `user_agent_overrides` | Per-user provider/model preferences |
| Sessions | `sessions` | Per-user per-agent per-channel |
| Memory | `memory_documents` | Per-user per-agent |
| Traces | `traces` | Per-user filterable |
| Agent access | `agent_shares` | Per-user role (user/viewer) |
| MCP grants | `mcp_user_grants` | Per-user MCP server access |
| Skill grants | `skill_user_grants` | Per-user skill access |

All database queries include `WHERE user_id = $1` — there's no way for one user to see another's data.

## Workspace Isolation

Each user gets their own directory in the agent workspace:

```
workspace/
├── user-123/          ← auto-created on first message
│   └── (files created by the agent during conversations)
├── user-456/
│   └── ...
```

The user's directory is created automatically on their first message (`MkdirAll`). It starts empty — the agent creates files and folders as needed during conversations. File operations (read_file, write_file, etc.) are scoped to the user's workspace directory.

> **Path sanitization:** Special characters (/, \, :, spaces, null bytes, etc.) in user IDs are replaced with underscores when creating filesystem paths, preventing directory traversal and path injection.

## Agent Sharing

Agents can be shared with specific users via the `agent_shares` table:

| Role | Permissions |
|------|------------|
| `user` | Can use the agent, read/write per-user context files |
| `viewer` | Read-only access to the agent (stored in DB; enforcement may vary) |

The default agent is accessible to everyone with `user` role — non-owners automatically receive `user` access. Other agents require either ownership or an explicit share entry in `agent_shares`.

> **Note:** The `user` and `viewer` roles in `agent_shares` control agent sharing access. The API access control layer (`permissions/policy.go`) enforces separate `admin`/`operator`/`viewer` roles for gateway API access — these are distinct from the agent sharing roles above.

## Budget Enforcement

GoClaw tracks spending per agent for cost analytics. Each agent can have a `budget_monthly_cents` field that sets a monthly spending cap (in cents). The budget is **per-agent** — it tracks the total spend across all users of that agent, not per individual user. The query `GetMonthlyAgentCost(agentID, year, month)` returns the total agent spend for the period. When the agent's accumulated spend exceeds the monthly budget, further requests are rejected until the budget resets.

## Request Quotas

GoClaw supports per-user request quotas with configurable time windows:

| Window | Description |
|--------|-------------|
| `hour` | Max requests per hour |
| `day` | Max requests per day |
| `week` | Max requests per week |

Quotas are set per user and can be overridden at the group or channel level via the `QuotaChecker` interface. When a user exceeds their quota, the request is rejected before reaching the agent.

## Per-User Overrides

Users can override agent settings for themselves without affecting others:

```json
{
  "user_id": "user-123",
  "agent_id": "code-helper",
  "provider": "anthropic",
  "model": "claude-opus-4-20250514"
}
```

This lets users pick their preferred LLM provider while the agent owner controls the default.

## Common Issues

| Problem | Solution |
|---------|----------|
| Users seeing each other's data | Verify `X-GoClaw-User-Id` is set correctly per request |
| No user isolation | Ensure you're sending the user ID header; without it, all requests share a session |
| Agent not accessible | Check `agent_shares` table; user needs an explicit share for non-default agents |

## What's Next

- [How GoClaw Works](how-goclaw-works.md) — Architecture overview
- [Sessions and History](sessions-and-history.md) — Per-user session management
- [Agents Explained](agents-explained.md) — Agent types and access control
