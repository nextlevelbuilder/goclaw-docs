# WebSocket Protocol

> Protocol v3 specification for the GoClaw gateway WebSocket RPC interface.

## Overview

GoClaw exposes a WebSocket endpoint at `/ws`. All client-gateway communication uses JSON frames with three types: `req` (request), `res` (response), and `event` (server-push). The first request on any connection must be `connect` to authenticate and negotiate protocol version.

**Connection URL:** `ws://<host>:<port>/ws`

**Protocol version:** `3`

---

## Connection Limits

| Parameter | Value | Description |
|-----------|-------|-------------|
| Read limit | 512 KB | Connection auto-closed if a single message exceeds this |
| Send buffer | 256 messages | Messages dropped when the buffer is full |
| Read deadline | 60 s | Reset on each message or pong; triggers disconnect on timeout |
| Write deadline | 10 s | Per-write timeout for individual frames |
| Ping interval | 30 s | Server-initiated keepalive pings |
| Rate limit | configurable | `rate_limit_rpm` in gateway config (0 = disabled, >0 = requests per minute, burst size 5) |

### CORS & Origin Control

- **`allowed_origins`** — string array in gateway config. Empty = all origins allowed (dev mode). Supports `"*"` wildcard. Non-browser clients (empty `Origin` header) always allowed.
- **Desktop mode** — set `GOCLAW_DESKTOP=1` env var for permissive CORS (`Access-Control-Allow-Origin: *`). Adds custom headers: `X-GoClaw-Tenant-Id`, `X-GoClaw-User-Id`.

---

## Frame Types

### Request Frame (`req`)

Sent by the client to invoke an RPC method.

```json
{
  "type": "req",
  "id": "unique-client-id",
  "method": "chat.send",
  "params": { "message": "Hello", "sessionKey": "user:demo" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"req"` |
| `id` | string | Client-generated unique ID, matched in response |
| `method` | string | RPC method name |
| `params` | object | Method parameters (optional) |

### Response Frame (`res`)

Sent by the server in reply to a request.

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": true,
  "payload": { ... }
}
```

Error response:

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "invalid token",
    "retryable": false
  }
}
```

**Error shape:**

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `details` | any | Optional extra context |
| `retryable` | boolean | Whether retrying may succeed |
| `retryAfterMs` | integer | Suggested retry delay in milliseconds |

### Event Frame (`event`)

Server-pushed without a preceding request.

```json
{
  "type": "event",
  "event": "agent",
  "payload": { "type": "chunk", "text": "Hello" },
  "seq": 42,
  "stateVersion": { "presence": 1, "health": 2 }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"event"` |
| `event` | string | Event name |
| `payload` | any | Event-specific data |
| `seq` | integer | Monotonically increasing ordering number |
| `stateVersion` | object | Version counters for optimistic state sync (`presence`, `health`) |

---

## Connection Handshake

The first request must be `connect`. The gateway rejects any other method until authenticated.

```json
// Request
{
  "type": "req",
  "id": "init",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "protocol": 3
  }
}

// Success response
{
  "type": "res",
  "id": "init",
  "ok": true,
  "payload": { "version": "v1.2.0", "protocol": 3 }
}
```

A wrong protocol version or invalid token returns `ok: false` immediately.

**`user_id` requirement:** The `user_id` parameter in `connect` is required for per-user session scoping. It is an opaque VARCHAR(255). For multi-tenant deployments, use the compound format `tenant.{tenantId}.user.{userId}` — GoClaw uses identity propagation and trusts the upstream service to supply the correct identity.

---

## RPC Methods

### Core

| Method | Params | Description |
|--------|--------|-------------|
| `connect` | `{token, user_id, sender_id?, locale?}` | Authenticate. Must be first request |
| `health` | — | Ping / health check |
| `status` | — | Gateway status |
| `agent` | `{agentId?}` | Get runtime status of a single agent (defaults to `"default"`) |
| `send` | `{channel, to, message}` | Route an outbound message to an external channel |

### Chat

| Method | Params | Description |
|--------|--------|-------------|
| `chat.send` | `{message, sessionKey?, agentId?}` | Send a message; response streams via `agent`/`chat` events |
| `chat.history` | `{sessionKey}` | Retrieve message history |
| `chat.abort` | `{sessionKey}` | Abort an in-progress run |
| `chat.inject` | `{sessionKey, content}` | Inject a message without triggering a run |
| `chat.session.status` | `{sessionKey}` | Get live run state + activity phase of a session |

### Agents Management

| Method | Params | Description |
|--------|--------|-------------|
| `agents.list` | — | List all agents |
| `agent.wait` | `{agentId}` | Wait for agent to finish current run |
| `agents.create` | agent object | Create an agent |
| `agents.update` | `{id, ...fields}` | Update an agent |
| `agents.delete` | `{id}` | Delete an agent |
| `agents.files.list` | `{agentId}` | List context files |
| `agents.files.get` | `{agentId, fileName}` | Get a context file |
| `agents.files.set` | `{agentId, fileName, content}` | Create or update a context file |
| `agent.identity.get` | `{agentId}` | Get agent persona info |
| `agents.links.list` | `{agentId, direction?}` | List delegation links (`"from"`, `"to"`, `"all"`) |
| `agents.links.create` | `{sourceAgent, targetAgent, direction?, description?, maxConcurrent?, settings?}` | Create a delegation link between agents |
| `agents.links.update` | `{linkId, direction?, description?, maxConcurrent?, settings?, status?}` | Update a delegation link |
| `agents.links.delete` | `{linkId}` | Delete a delegation link |

### Sessions

| Method | Params | Description |
|--------|--------|-------------|
| `sessions.list` | `{agentId?}` | List sessions, optionally filtered by agent |
| `sessions.preview` | `{sessionKey}` | Get session summary |
| `sessions.patch` | `{sessionKey, ...fields}` | Patch session metadata |
| `sessions.delete` | `{key}` | Delete a session |
| `sessions.reset` | `{key}` | Clear session history |

### Config

| Method | Description |
|--------|-------------|
| `config.get` | Get current config (secrets redacted) |
| `config.apply` | Replace config entirely |
| `config.patch` | Patch specific config fields |
| `config.schema` | Get JSON schema for config |
| `config.permissions.list` | `{agentId, configType?}` | List permissions for an agent |
| `config.permissions.grant` | `{agentId, scope, configType, userId, permission, grantedBy?, metadata?}` | Grant a permission |
| `config.permissions.revoke` | `{agentId, scope, configType, userId}` | Revoke a permission |

### Cron

| Method | Params | Description |
|--------|--------|-------------|
| `cron.list` | `{includeDisabled?}` | List cron jobs |
| `cron.create` | cron job object | Create a cron job |
| `cron.update` | `{jobId, ...fields}` | Update a cron job |
| `cron.delete` | `{jobId}` | Delete a cron job |
| `cron.toggle` | `{jobId, enabled}` | Enable or disable a job |
| `cron.run` | `{jobId}` | Trigger immediate run |
| `cron.runs` | `{jobId}` | List run history |
| `cron.status` | `{jobId}` | Get job status |

### Skills

| Method | Params | Description |
|--------|--------|-------------|
| `skills.list` | — | List skills |
| `skills.get` | `{id}` | Get skill details |
| `skills.update` | `{id, ...fields}` | Update skill metadata |

### Channels

| Method | Description |
|--------|-------------|
| `channels.list` | List active channels |
| `channels.status` | Get channel health |
| `channels.toggle` | Enable/disable a channel |
| `channels.instances.list` | List DB channel instances |
| `channels.instances.get` | Get a channel instance |
| `channels.instances.create` | Create a channel instance |
| `channels.instances.update` | Update a channel instance |
| `channels.instances.delete` | Delete a channel instance |

### Pairing

| Method | Params | Description |
|--------|--------|-------------|
| `device.pair.request` | `{channel, chatId}` | Request pairing code |
| `device.pair.approve` | `{code, approvedBy}` | Approve a pairing request |
| `device.pair.deny` | `{code}` | Deny a pairing request |
| `device.pair.list` | — | List pending and approved pairings |
| `device.pair.revoke` | `{channel, senderId}` | Revoke a pairing |
| `browser.pairing.status` | `{sender_id}` | Poll pairing approval status (unauthenticated, rate-limited) |

### Exec Approvals

| Method | Description |
|--------|-------------|
| `exec.approval.list` | List pending shell command approvals |
| `exec.approval.approve` | Approve a command |
| `exec.approval.deny` | Deny a command |

### Teams

| Method | Description |
|--------|-------------|
| `teams.list` | List all teams |
| `teams.create` | Create team (admin only) |
| `teams.get` | Get team with members |
| `teams.update` | Update team properties |
| `teams.delete` | Delete team |
| `teams.members.add` | Add agent to team |
| `teams.members.remove` | Remove agent from team |
| `teams.tasks.list` | List team tasks (filterable) |
| `teams.tasks.get` | Get task with comments/events |
| `teams.tasks.create` | Create task |
| `teams.tasks.assign` | Assign task to member |
| `teams.tasks.approve` | Approve completed task |
| `teams.tasks.reject` | Reject task submission |
| `teams.tasks.comment` | Add comment to task |
| `teams.tasks.comments` | List task comments |
| `teams.tasks.events` | List task event history |
| `teams.tasks.get-light` | Get task without comments/events/attachments |
| `teams.tasks.delete` | Delete task |
| `teams.tasks.delete-bulk` | `{teamId, taskIds}` | Bulk-delete terminal-status tasks |
| `teams.tasks.active-by-session` | Get active tasks for a session (used to restore state on session switch) |
| `teams.workspace.list` | List team workspace files |
| `teams.workspace.read` | Read workspace file |
| `teams.workspace.delete` | Delete workspace file |
| `teams.events.list` | List team event history (paginated) |
| `teams.known_users` | Get known user IDs in team |
| `teams.scopes` | Get channel/chat scopes for task routing |

### Usage & Quota

| Method | Description |
|--------|-------------|
| `usage.get` | Token usage stats |
| `usage.summary` | Usage summary cards |
| `quota.usage` | Quota consumption for current user |

### Logs

| Method | Params | Description |
|--------|--------|-------------|
| `logs.tail` | `{action: "start"\|"stop", level?}` | Start or stop live log streaming; log entries arrive as server-push events while active |

### Heartbeat

| Method | Params | Description |
|--------|--------|-------------|
| `heartbeat.get` | `{agentId}` | Get heartbeat config for an agent |
| `heartbeat.set` | `{agentId, enabled?, intervalSec?, prompt?, providerName?, model?, ...}` | Upsert heartbeat config (intervalSec min 300) |
| `heartbeat.toggle` | `{agentId, enabled}` | Enable or disable heartbeat |
| `heartbeat.test` | `{agentId}` | Trigger an immediate heartbeat run |
| `heartbeat.logs` | `{agentId, limit?, offset?}` | List heartbeat execution logs |
| `heartbeat.checklist.get` | `{agentId}` | Read the HEARTBEAT.md context file |
| `heartbeat.checklist.set` | `{agentId, content}` | Write/replace the HEARTBEAT.md context file |
| `heartbeat.targets` | `{agentId}` | List delivery targets for heartbeat notifications |

### API Keys

| Method | Params | Description |
|--------|--------|-------------|
| `api_keys.list` | — | List API keys (non-admin sees own only) |
| `api_keys.create` | `{name, scopes, expires_in?, owner_id?, tenant_id?}` | Create an API key; returns raw key once |
| `api_keys.revoke` | `{id}` | Revoke an API key (non-admin can revoke own only) |

### Tenants

| Method | Params | Description |
|--------|--------|-------------|
| `tenants.list` | — | List all tenants (owner only) |
| `tenants.get` | `{id}` | Get a tenant by ID |
| `tenants.create` | `{name, slug, settings?}` | Create a tenant and its workspace |
| `tenants.update` | `{id, name?, status?, settings?}` | Update tenant properties |
| `tenants.users.list` | `{tenant_id}` | List users in a tenant |
| `tenants.users.add` | `{tenant_id, user_id, role?}` | Add user (roles: owner/admin/operator/member/viewer) |
| `tenants.users.remove` | `{tenant_id, user_id}` | Remove user and broadcast access-revoked event |
| `tenants.mine` | — | Get current user's tenant memberships |

### Messaging

| Method | Params | Description |
|--------|--------|-------------|
| `zalo.personal.qr.start` | `{instance_id}` | Start Zalo Personal QR login flow |
| `zalo.personal.contacts` | `{instance_id}` | Fetch Zalo friends and groups |

---

## Server-Push Events

### Agent Events (`"agent"`)

Emitted during agent runs. Check `payload.type`:

| `payload.type` | Description |
|----------------|-------------|
| `run.started` | Agent run begins |
| `run.completed` | Run finished successfully |
| `run.failed` | Run encountered an error |
| `run.cancelled` | Run was cancelled before completion |
| `run.retrying` | Run is being retried |
| `tool.call` | Tool was invoked |
| `tool.result` | Tool returned a result |
| `block.reply` | Reply was blocked by input guard |
| `activity` | Agent activity update |

### Chat Events (`"chat"`)

| `payload.type` | Description |
|----------------|-------------|
| `chunk` | Streaming text token |
| `message` | Full message (non-streaming) |
| `thinking` | Extended thinking / reasoning output |

### System & Other Events

| Event | Description |
|-------|-------------|
| `health` | Periodic gateway health ping |
| `tick` | Heartbeat tick |
| `shutdown` | Gateway shutting down |
| `cron` | Cron job status change |
| `exec.approval.requested` | Shell command needs user approval |
| `exec.approval.resolved` | Approval decision made |
| `device.pair.requested` | New pairing request from channel user |
| `device.pair.resolved` | Pairing approved or denied |
| `presence` | User presence change |
| `agent.summoning` | Predefined agent persona generation in progress |
| `delegation.started` | Delegation to subagent started |
| `delegation.completed` | Delegation completed successfully |
| `delegation.failed` | Delegation failed |
| `delegation.cancelled` | Delegation was cancelled |
| `delegation.progress` | Intermediate delegation result |
| `delegation.announce` | Batched subagent results delivered to parent |
| `delegation.accumulated` | Accumulated delegation results |
| `connect.challenge` | Authentication challenge issued |
| `voicewake.changed` | Voice wake word setting changed |
| `talk.mode` | Talk mode state change |
| `node.pair.requested` | Node pairing request received |
| `node.pair.resolved` | Node pairing resolved |
| `session.updated` | Chat session metadata updated |
| `trace.updated` | Agent trace updated |
| `heartbeat` | Heartbeat execution event |
| `workspace.file.changed` | Team workspace file changed |
| `agent_link.created` | Delegation link created |
| `agent_link.updated` | Delegation link updated |
| `agent_link.deleted` | Delegation link deleted |
| `tenant.access.revoked` | Tenant access revoked for a user |
| `zalo.personal.qr.code` | Zalo QR code generated |
| `zalo.personal.qr.done` | Zalo QR login completed |

### Skill Events

| Event | Description |
|-------|-------------|
| `skill.deps.checked` | Skill dependencies check started |
| `skill.deps.complete` | All skill dependencies resolved |
| `skill.deps.installing` | Skill dependency installation started |
| `skill.deps.installed` | Skill dependency installation completed |
| `skill.dep.item.installing` | Individual dependency item installing |
| `skill.dep.item.installed` | Individual dependency item installed |

### Team Events

| Event | Description |
|-------|-------------|
| `team.created` | Team created |
| `team.updated` | Team updated |
| `team.deleted` | Team deleted |
| `team.member.added` | Member added to team |
| `team.member.removed` | Member removed from team |
| `team.message.sent` | Peer-to-peer message in team |
| `team.leader.processing` | Team leader processing request |
| `team.task.created` | Task created |
| `team.task.completed` | Task completed |
| `team.task.claimed` | Task claimed |
| `team.task.cancelled` | Task cancelled |
| `team.task.failed` | Task failed |
| `team.task.reviewed` | Task reviewed |
| `team.task.approved` | Task approved |
| `team.task.rejected` | Task rejected |
| `team.task.progress` | Task progress update |
| `team.task.commented` | Comment added to task |
| `team.task.assigned` | Task assigned to member |
| `team.task.dispatched` | Task dispatched |
| `team.task.updated` | Task updated |
| `team.task.deleted` | Task deleted |
| `team.task.stale` | Task marked stale |
| `team.task.attachment_added` | Attachment added to task |

---

## Example Session

```javascript
const ws = new WebSocket("ws://localhost:18790/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "req", id: "1", method: "connect",
    params: { token: "YOUR_TOKEN", user_id: "user-123", protocol: 3 }
  }));
};

ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);

  // After connect succeeds, send a chat message
  if (frame.type === "res" && frame.id === "1" && frame.ok) {
    ws.send(JSON.stringify({
      type: "req", id: "2", method: "chat.send",
      params: { message: "Hello!", sessionKey: "user:demo" }
    }));
  }

  // Stream response tokens
  if (frame.type === "event" && frame.event === "chat") {
    if (frame.payload?.type === "chunk") {
      process.stdout.write(frame.payload.text ?? "");
    }
  }
};
```

---

## What's Next

- [REST API](/rest-api) — HTTP endpoints for agent CRUD, skill uploads, traces
- [CLI Commands](/cli-commands) — pairing and session management from the terminal
- [Glossary](/glossary) — Session, Lane, Compaction, and other key terms

<!-- goclaw-source: 04dc34e3 | updated: 2026-04-02 -->
