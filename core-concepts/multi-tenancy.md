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
| Agent access | `agent_shares` | Per-user role string (default: `"user"`) |
| MCP grants | `mcp_user_grants` | Per-user MCP server access |
| Skill grants | `skill_user_grants` | Per-user skill access |

All database queries include `WHERE user_id = $1` — there's no way for one user to see another's data.

## Workspace Isolation

Each user gets their own directory in the agent workspace:

```
workspace/
├── user_user-123/
│   ├── projects/
│   └── downloads/
├── user_user-456/
│   ├── projects/
│   └── downloads/
```

File operations (read_file, write_file, etc.) are scoped to the user's workspace directory.

## Agent Sharing

Agents can be shared with specific users via the `agent_shares` table. The `role` field is a flexible string — the default value is `"user"`. GoClaw does not enforce a fixed role hierarchy; role strings are application-defined.

> **Note:** `admin`, `operator`, and `viewer` are roles used by the WebSocket authentication layer, not by agent sharing.

Agents with `is_default = true` are automatically accessible to all users — no explicit share record is needed. Other agents require either ownership or an explicit entry in `agent_shares`.

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
| Agent not accessible | Check `agent_shares` table; user needs an explicit share for non-default agents (or set `is_default = true`) |
| 401 on HTTP requests | Both `Authorization: Bearer <token>` and `X-GoClaw-User-Id` headers are required |

## Spending Limits

Agents support an optional `budget_monthly_cents` field to cap monthly LLM spending per agent. Set it when creating or editing an agent to enforce cost limits across all users of that agent.

## What's Next

- [How GoClaw Works](how-goclaw-works.md) — Architecture overview
- [Sessions and History](sessions-and-history.md) — Per-user session management
- [Agents Explained](agents-explained.md) — Agent types and access control
