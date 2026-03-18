# WebSocket Channel

Direct RPC communication with the GoClaw gateway over WebSocket. No intermediate messaging platform needed—perfect for custom clients, web apps, and testing.

## Connection

**Endpoint:**

```
ws://your-gateway.com:8080/ws
wss://your-gateway.com:8080/ws  (TLS)
```

**WebSocket Upgrade:**

```
GET /ws HTTP/1.1
Host: your-gateway.com:8080
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

Server responds with `101 Switching Protocols`.

## Authentication

First message must be a `connect` frame:

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "user_id": "user_123"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | No | Gateway API token (empty = viewer role) |
| `user_id` | string | Yes | Client/user identifier (opaque, max 255 chars) |

**Response:**

```json
{
  "type": "res",
  "id": "1",
  "ok": true,
  "payload": {
    "protocol": 3,
    "role": "admin",
    "user_id": "user_123"
  }
}
```

### Roles

- **viewer** (default): Read-only access (no token or wrong token)
- **operator**: Read + write + chat
- **admin**: Full control (with correct gateway token)

## Sending Messages

After authentication, send `chat.send` request:

```json
{
  "type": "req",
  "id": "2",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "What is 2+2?",
    "channel": "websocket"
  }
}
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Agent to query |
| `message` | string | User message |
| `channel` | string | Usually `"websocket"` |
| `sessionId` | string | Optional: resume existing session |

**Response:**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "content": "2+2 equals 4.",
    "usage": {
      "input_tokens": 42,
      "output_tokens": 8
    }
  }
}
```

## Streaming Events

During agent processing, server pushes events:

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "chunk": "2+2 equals",
    "delta": " equals"
  },
  "seq": 1
}
```

**Event Types:**

| Event | Payload | Description |
|-------|---------|-------------|
| `chat` | `{chunk, delta}` | Streaming text chunks |
| `agent` | `{run_id, status}` | Agent lifecycle (started, completed, failed) |
| `tool.call` | `{tool, input}` | Tool invocation |
| `tool.result` | `{tool, output}` | Tool result |

## Minimal JavaScript Client

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      user_id: 'web_client_1'
    }
  }));
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === 'res' && frame.id === '1') {
    // Connected! Now send a message
    ws.send(JSON.stringify({
      type: 'req',
      id: '2',
      method: 'chat.send',
      params: {
        agentId: 'main',
        message: 'Hello!',
        channel: 'websocket'
      }
    }));
  }

  if (frame.type === 'res' && frame.id === '2') {
    console.log('Response:', frame.payload.content);
  }

  if (frame.type === 'event' && frame.event === 'chat') {
    console.log('Chunk:', frame.payload.chunk);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Session Management

Reuse a session ID to continue conversations:

```json
{
  "type": "req",
  "id": "3",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "Add 5 to the result.",
    "sessionId": "session_xyz",
    "channel": "websocket"
  }
}
```

Session ID is returned in each response. Store and pass it to maintain conversation history.

## Keepalive

Server sends ping frames every 30 seconds. Client should respond with pong. Most WebSocket libraries do this automatically.

## Frame Limits

| Limit | Value |
|-------|-------|
| Read message size | 512 KB |
| Read deadline | 60 seconds |
| Write deadline | 10 seconds |
| Send buffer | 256 messages |

Messages exceeding limits are dropped with logging.

## Error Handling

Failed requests include error details:

```json
{
  "type": "res",
  "id": "2",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "unknown method",
    "retryable": false
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check gateway is running on correct host/port. |
| "Unauthorized" | Verify token is correct. Check user_id is provided. |
| "Message too large" | Reduce message size (512 KB limit). |
| No streaming events | Ensure provider supports streaming. Check model config. |
| Connection drops | Server may have hit message buffer limit. Reconnect and resume session. |

## What's Next

- [Overview](#channels-overview) — Channel concepts and policies
- [WebSocket Protocol](#websocket-protocol) — Full protocol documentation
- [Browser Pairing](#channel-browser-pairing) — Pairing flow for custom clients

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
