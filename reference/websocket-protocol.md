# WebSocket Protocol

> Protocol v3 specification for the GoClaw gateway WebSocket RPC interface.

## Overview

GoClaw exposes a WebSocket endpoint at `/ws`. All client-gateway communication uses JSON frames with three types: `req` (request), `res` (response), and `event` (server-push). The first request on any connection must be `connect` to authenticate and negotiate protocol version.

**Connection URL:** `ws://<host>:<port>/ws`

**Protocol version:** `3`

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

---

## RPC Methods

### Core

| Method | Params | Description |
|--------|--------|-------------|
| `connect` | `{token, protocol}` | Authenticate. Must be first request |
| `health` | — | Ping / health check |
| `status` | — | Gateway status |

### Chat

| Method | Params | Description |
|--------|--------|-------------|
| `chat.send` | `{message, sessionKey?, agentId?}` | Send a message; response streams via `agent`/`chat` events |
| `chat.history` | `{sessionKey}` | Retrieve message history |
| `chat.abort` | `{sessionKey}` | Abort an in-progress run |
| `chat.inject` | `{sessionKey, content}` | Inject a message without triggering a run |

### Agents Management

| Method | Params | Description |
|--------|--------|-------------|
| `agents.list` | — | List all agents |
| `agents.create` | agent object | Create an agent |
| `agents.update` | `{id, ...fields}` | Update an agent |
| `agents.delete` | `{id}` | Delete an agent |
| `agents.files.list` | `{agentId}` | List context files |
| `agents.files.get` | `{agentId, fileName}` | Get a context file |
| `agents.files.set` | `{agentId, fileName, content}` | Create or update a context file |
| `agent.identity.get` | `{agentId}` | Get agent persona info |

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

### Exec Approvals

| Method | Description |
|--------|-------------|
| `exec.approval.list` | List pending shell command approvals |
| `exec.approval.approve` | Approve a command |
| `exec.approval.deny` | Deny a command |

### Agent Links & Teams

| Method | Description |
|--------|-------------|
| `agents.links.list/create/update/delete` | Manage inter-agent delegation links |
| `teams.list/create/get/update/delete` | Team CRUD |
| `teams.tasks.list` | List team tasks |
| `teams.members.add/remove` | Manage team membership |

### Usage & Quota

| Method | Description |
|--------|-------------|
| `usage.get` | Token usage stats |
| `usage.summary` | Usage summary cards |
| `quota.usage` | Quota consumption for current user |

---

## Server-Push Events

### Agent Events (`"agent"`)

Emitted during agent runs. Check `payload.type`:

| `payload.type` | Description |
|----------------|-------------|
| `run.started` | Agent run begins |
| `run.completed` | Run finished successfully |
| `run.failed` | Run encountered an error |
| `run.retrying` | Run is being retried |
| `tool.call` | Tool was invoked |
| `tool.result` | Tool returned a result |
| `block.reply` | Reply was blocked by input guard |

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
| `agent.summoning` | Predefined agent persona generation in progress |
| `handoff` | Agent delegated to another agent (`from_agent`, `to_agent`, `reason` in payload) |
| `delegation.started/completed/failed` | Delegation lifecycle |
| `delegation.progress` | Intermediate delegation result |
| `delegation.announce` | Batched subagent results delivered to parent |
| `team.task.created/completed/claimed/cancelled` | Team task lifecycle |
| `team.message.sent` | Peer-to-peer message in team |
| `team.created/updated/deleted` | Team CRUD notifications |
| `team.member.added/removed` | Team membership changes |

---

## Example Session

```javascript
const ws = new WebSocket("ws://localhost:18790/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "req", id: "1", method: "connect",
    params: { token: "YOUR_TOKEN", protocol: 3 }
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

- [REST API](./rest-api.md) — HTTP endpoints for agent CRUD, skill uploads, traces
- [CLI Commands](./cli-commands.md) — pairing and session management from the terminal
- [Glossary](./glossary.md) — Session, Lane, Compaction, and other key terms
