# Team Messaging

Team members communicate via a built-in mailbox system. Members can send direct messages and read unread messages. The lead agent does not have access to the `team_message` tool — it is removed from the lead's tool list by policy. Messages flow through the message bus with real-time delivery.

## Mailbox Tool: `team_message`

All team members access the mailbox via the `team_message` tool. Actions:

| Action | Params | Description |
|--------|--------|-------------|
| `send` | `to`, `text`, `media` (optional) | Send direct message to specific teammate |
| `broadcast` | `text` | Send message to all teammates (except self); system/teammate channel only |
| `read` | none | Get unread messages; auto-marks as read |

## Send a Direct Message

**Member sends message to another member**:

```json
{
  "action": "send",
  "to": "analyst_agent",
  "text": "Please review my findings from task 123. I need your input on the methodology."
}
```

**What happens**:
1. Message is persisted to database
2. A "message" task is auto-created on the team task board (visible in Tasks tab)
3. Recipient is notified in real-time via message bus (channel: `system`, sender: `teammate:{sender_key}`)
4. Event broadcast to UI for real-time updates

**Response**:
```
Message sent to analyst_agent.
```

**Cross-team protection**: You can only message team members. Attempting to message someone outside your team fails with `"agent is not a member of your team"`.

## Broadcast to All Members

Broadcast delivers a message to all team members simultaneously. This action is restricted to system/teammate channels (internal operations) — regular member agents cannot call `broadcast` directly.

```json
{
  "action": "broadcast",
  "text": "Important update: We've decided to focus on the top 5 findings. Please adjust your work accordingly."
}
```

**What happens**:
1. Message persisted as broadcast (to_agent_id = NULL)
2. Message type: `broadcast`
3. Each team member (except sender) receives the message
4. Event broadcast to UI for all to see

**Response**:
```
Broadcast sent to all teammates.
```

## Read Unread Messages

**Check mailbox**:

```json
{
  "action": "read"
}
```

**Response**:
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "team_id": "...",
      "from_agent_id": "...",
      "from_agent_key": "researcher_agent",
      "to_agent_key": "analyst_agent",
      "message_type": "chat",
      "content": "Please review my findings...",
      "read": false,
      "created_at": "2025-03-08T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Auto-marking**: Reading messages automatically marks them as read. Next `read` call will only show new unread messages.

**Pagination**: Returns up to 50 unread messages per call. If more exist, the response includes `"has_more": true` and a note to call `read` again after processing.

## Message Routing

Messages flow through the system with special routing:

```mermaid
flowchart TD
    SEND["team_message send/broadcast"] --> PERSIST["Persist to DB"]
    PERSIST --> BUS["Message Bus<br/>Channel: 'system'<br/>SenderID: 'teammate:{sender_key}'"]
    BUS --> TARGET["Route to target agent session"]
    TARGET --> DISPLAY["Display in conversation"]
```

**Message format on delivery**:
```
[Team message from researcher_agent]: Please review my findings...
```

The `teammate:` prefix in the sender ID tells the consumer to route the message to the correct team member's session, not the general user session.

## Event Broadcasting

When messages are sent, real-time events are broadcast to UI:

```json
{
  "event": "team.message.sent",
  "payload": {
    "team_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_agent_key": "researcher_agent",
    "from_display_name": "Research Expert",
    "to_agent_key": "analyst_agent",
    "to_display_name": "Data Analyst",
    "message_type": "chat",
    "preview": "Please review my findings...",
    "user_id": "...",
    "channel": "telegram",
    "chat_id": "..."
  }
}
```

## Use Cases

**Member → Member**: "Task 123 is ready for your review. The data shows..."

**Member → Member**: "I'm blocked on step 2 — do you have the raw dataset I need?"

**Broadcast** (system-level only): "Changing priorities. Focus on tasks 1, 2, 5 instead of 3, 4."

> **Note**: Leads coordinate via `team_tasks`, not `team_message`. Use `team_tasks(action="progress")` to report status updates instead of direct messages.

## Best Practices

1. **Be concise**: Keep messages focused and actionable
2. **Use broadcasts for team-wide info**: Don't send identical messages to multiple members
3. **Direct message for discussion**: Back-and-forth coordination use direct messages
4. **Reference tasks**: Mention task IDs for context ("Task 123 is blocked by...")
5. **Check regularly**: Members should check their mailbox if waiting for updates

## Message Persistence

All messages are persisted to the database:
- Direct messages link sender → specific recipient
- Broadcasts link sender → NULL (means all members)
- Timestamps and read status tracked
- Full message history available for audit/review

<!-- goclaw-source: 941a965 | updated: 2026-03-19 -->
