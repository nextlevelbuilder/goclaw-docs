# Agent Permission Matrix

> The full set of authorization layers that decide what an agent can do across channels, groups, and workspaces — and how those layers combine.

## Overview

A single agent action (sending a reply, writing a workspace file, editing a context file) passes through several independent permission layers. Each layer can allow or deny, and they stack: an action is only permitted when every applicable layer allows it. This page maps those layers, the agent-config permission rules you can grant from chat, the per-channel matrix, and the rules that most often surprise people (Zalo context writes and channel-context credentials).

If you only need gateway-token roles, see [API Keys & RBAC](/api-keys-rbac) — that is layer 1. This page covers the layers above it.

## Permission Layers

| Layer | Scope | Notes |
|-------|-------|-------|
| Tenant RBAC | Dashboard, HTTP, WebSocket RPC | Viewer / operator / admin / owner. Admin-only methods include `config.permissions.*`. |
| Agent ownership / share | Which agents a user can see and manage | Owner plus explicit shares; see [Sharing & Access Control](/sharing-and-access). |
| Channel membership | Platform delivery | The platform can still reject outbound delivery after GoClaw allows the action. |
| Agent config permissions | Config mutations driven from chat | Matched by `agent_id`, `scope`, `config_type`, and `user_id`, including wildcard rows. |
| Workspace file boundary | Filesystem access | Prevents path escape and unsupported writes. |
| Context file boundary | Agent identity / context files | Protected files are routed to the store and require group writer permission in group contexts. |
| Channel context capabilities | MCP + Secure CLI tool execution | Credential precedence: user credentials > context credentials/grants > agent grants > global defaults. |

## Agent Config Permission Rows

Agents can have parts of their configuration changed from chat (for example, enabling a file writer or a heartbeat). Each permission rule is a row with four fields:

| Field | Examples | Meaning |
|-------|----------|---------|
| `scope` | `agent`, `group:*`, `group:zalo:123`, `group:telegram:-100`, `*` | Where the grant applies. |
| `config_type` | `file_writer`, `heartbeat`, `cron`, `context_files`, `*` | Which family of actions the grant covers. |
| `user_id` | `123456`, `zalo-user-id`, `*` | Who the grant covers. `*` grants every member in the selected scope. |
| `permission` | `allow`, `deny` | The decision. A deny can override a broader allow. |

### Effective precedence

When several rows match a request, GoClaw resolves them top-down and stops at the first that applies:

1. Individual deny.
2. Individual allow.
3. Scope/user wildcard deny.
4. Scope/user wildcard allow.
5. Default deny.

So a specific `deny` for one user always beats a wildcard `allow`, and anything not matched is denied by default.

## Channel Matrix

What an agent can do depends on where the request came from. This table summarizes the common channel contexts.

| Channel context | Read agent output | Send reply | Write workspace file | Write protected context file | Grant all members |
|-----------------|-------------------|------------|----------------------|------------------------------|-------------------|
| Dashboard | RBAC controlled | N/A | Admin/operator path, then workspace boundary | Admin path, then context interceptor | Use the Permissions tab |
| Direct message | Agent/session access | Channel adapter | Allowed by workspace boundary | Allowed by agent/context rules | Usually not needed |
| Telegram group | Group scope + sender ID | Channel adapter | Requires `file_writer` when group-gated | Requires `context_files` or `file_writer` and a real sender | `scope=group:telegram:<chatId>`, `user_id=*` |
| Zalo group | Group scope + sender ID | Channel adapter, group thread metadata | Requires `file_writer` when group-gated | Requires `context_files` or `file_writer` and a real sender | `scope=group:zalo:<chatId>`, `user_id=*` |
| Discord guild/channel | Guild scope + sender ID | Channel adapter | Requires `file_writer` when guild-gated | Requires `context_files` or `file_writer` and a real sender | `scope=guild:<id>` or matching group scope, `user_id=*` |
| Scheduled / proactive run | System sender | Channel adapter | Denied for group-gated writes unless elevated context | Denied for protected group context writes | Configure explicit rules, or run from a dashboard/admin context |

## Zalo Context-Write Rule

A common Zalo group failure is an agent trying to write a protected context file — `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `USER.md`, `USER_PREDEFINED.md`, or `CAPABILITIES.md` — from a group session where the acting sender is missing. Protected context writes go through the group permission gate, which requires:

- `sender_id` is a **real platform user**, not empty or synthetic.
- `user_id` identifies the group scope, for example `group:zalo:<chatId>`.
- The sender matches a `context_files` allow (or a legacy `file_writer` allow), including wildcard rows such as `user_id="*"`.
- Missing tenant context or permission-store errors **fail closed** — the write is denied rather than allowed.

If a Zalo group write is being rejected, check that the message carries a real sender and that a matching `context_files` rule exists for that group scope.

## Permissions Tab (UX)

The dashboard Permissions tab is a full matrix editor for the rows above:

| Control | Behavior |
|---------|----------|
| User/contact picker | Accepts explicit user IDs and contact search results. |
| All members button | Sets `user_id="*"` for the current rule. |
| Config type selector | `file_writer`, `heartbeat`, `cron`, `context_files`, or `*`. |
| Scope selector | Known groups, `group:*`, `agent`, or `*`. |
| Check access | Calls `config.permissions.check` and shows the effective allow/deny decision before or after saving. |

Use **Check access** to preview the effective decision for a specific user and scope without saving — it runs the same precedence resolution the runtime uses.

## Channel Context Capabilities

Channel instances expose stored contexts in the dashboard and API. The base context is the channel instance itself; group contexts come from stored channel contacts. Each capability row combines MCP and Secure CLI visibility for that context — source, enabled state, tool allow/deny lists, and whether a credential is present.

Context credential rows **never return secret material**. They project only metadata such as `has_api_key`, `has_env`, `credential_source`, and key names where available. Writes are tenant-admin gated, and runtime resolution carries a `ChannelContextScope` so grants and credentials apply only to the matching channel/group scope.

### Channel-context credential precedence

When a tool runs in a channel context, GoClaw resolves credentials in this order — first match wins:

1. User credentials.
2. Context credentials / grants.
3. Agent grants.
4. Global defaults.

This mirrors the typed-credential precedence used by the git adapter (see [CLI Credentials](/cli-credentials)).

## Security Notes

- A wildcard `user_id="*"` should be easy to grant but always **visually explicit** — it expands access to every member in scope.
- Synthetic senders stay denied for group file/context writes, so a system turn never inherits permissions from a real user it isn't.
- Permission-store errors **fail closed** at group mutation boundaries.
- Backend validation rejects unknown config types and permissions before any rule is written.
- Platform send permissions are separate from GoClaw permissions: a channel adapter may still reject delivery even when GoClaw allows the agent action.

## Common Issues

| Problem | Solution |
|---------|----------|
| Zalo group context write rejected | Ensure the message has a real `sender_id` and a matching `context_files` (or `file_writer`) allow for `group:zalo:<chatId>`. |
| Wildcard allow not taking effect | An individual `deny` beats a wildcard `allow`. Remove the deny or scope it more narrowly. |
| Scheduled run can't write a group file | Proactive/system runs are denied for group-gated writes — configure an explicit rule or run from a dashboard/admin context. |
| Reply sent by GoClaw never arrives | The channel adapter rejected delivery — GoClaw permissions and platform send permissions are independent. |

## What's Next

- [API Keys & RBAC](/api-keys-rbac) — layer 1: gateway-token roles and scopes
- [Sharing & Access Control](/sharing-and-access) — agent ownership and shares
- [CLI Credentials](/cli-credentials) — typed credentials and channel-context credential precedence
- [Security Hardening](/deploy-security) — the full five-layer security overview

<!-- goclaw-source: fabe86b3 | updated: 2026-06-30 -->
