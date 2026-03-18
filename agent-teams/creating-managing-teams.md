# Creating & Managing Teams

Create teams via API, Dashboard, or CLI. The system automatically establishes delegation links between the lead and all members, injects `TEAM.md` into their system prompts, and wires up task board access.

## Quick Start

**Create a team** with lead agent and members:

```bash
# CLI
./goclaw team create \
  --name "Research Team" \
  --lead researcher_agent \
  --members analyst_agent,writer_agent \
  --description "Parallel research and writing"
```

**Via WebSocket RPC** (`teams.create`):

```json
{
  "name": "Research Team",
  "lead": "researcher_agent",
  "members": ["analyst_agent", "writer_agent"],
  "description": "Parallel research and writing"
}
```

**Dashboard**: Teams → Create Team → Select Lead → Add Members → Save

## What Happens on Creation

When you create a team, the system:

1. **Validates** lead and member agents exist
2. **Creates team record** with `status=active`
3. **Adds lead as a member** with `role=lead`
4. **Adds each member** with `role=member` (or `role=reviewer` if specified)
5. **Auto-creates delegation links** from lead → each member:
   - Direction: `outbound` (lead can delegate to members)
   - Max concurrent delegations per link: `3`
   - Marked with `team_id` (system knows these are team-managed)
6. **Injects TEAM.md** into all members' system prompts
7. **Enables task board** for all team members

## Team Lifecycle

```mermaid
flowchart TD
    CREATE["Admin creates team<br/>(name, lead, members)"] --> LINK["Auto-create delegation links<br/>Lead → each member"]
    LINK --> INJECT["TEAM.md auto-injected<br/>into all members' system prompts"]
    INJECT --> READY["Team ready for use"]

    READY --> MANAGE["Admin manages team"]
    MANAGE --> ADD["Add member<br/>→ auto-link lead→member"]
    MANAGE --> REMOVE["Remove member<br/>→ team links auto-deleted"]
    MANAGE --> DELETE["Delete team<br/>→ record hard-deleted from DB"]
```

## Managing Team Membership

**Add a member** (role is `member` by default; can also be `reviewer`):

```bash
./goclaw team add-member \
  --team-id 550e8400-e29b-41d4-a716-446655440000 \
  --agent analyst_agent \
  --role member

# When added, a delegation link is automatically created
# from lead → new member
```

**Remove a member**:

```bash
./goclaw team remove-member \
  --team-id 550e8400-e29b-41d4-a716-446655440000 \
  --agent-id <agent-uuid>

# Team-specific delegation links are automatically cleaned up on removal
```

**List team members**:

```bash
./goclaw team list-members --team-id 550e8400-e29b-41d4-a716-446655440000

# Output:
# Agent Key        Role        Display Name
# researcher_agent lead        Research Expert
# analyst_agent    member      Data Analyst
# writer_agent     reviewer    Content Reviewer
```

## Team Settings & Access Control

Teams support fine-grained access control via settings JSON:

```json
{
  "allow_user_ids": ["user_123", "user_456"],
  "deny_user_ids": [],
  "allow_channels": ["telegram", "slack"],
  "deny_channels": [],
  "progress_notifications": true,
  "followup_interval_minutes": 30,
  "followup_max_reminders": 3,
  "escalation_mode": "",
  "escalation_actions": [],
  "workspace_scope": "",
  "workspace_quota_mb": 500
}
```

**Fields**:
- `allow_user_ids`: Only these users can trigger team work (empty = open)
- `deny_user_ids`: Block these users (deny takes priority)
- `allow_channels`: Only these channels trigger team work (empty = open)
- `deny_channels`: Block these channels
- `progress_notifications`: Send periodic updates during async delegations
- `followup_interval_minutes`: Minutes between auto follow-up reminders on in-progress tasks
- `followup_max_reminders`: Maximum number of follow-up reminders per task
- `escalation_mode`: Escalation behavior when tasks stall (optional)
- `escalation_actions`: List of escalation actions to take (optional)
- `workspace_scope`: Scope restriction for shared workspace files (optional)
- `workspace_quota_mb`: Disk quota for team workspace in megabytes (optional)

**Set team settings**:

```bash
./goclaw team update \
  --team-id 550e8400-e29b-41d4-a716-446655440000 \
  --settings '{
    "allow_user_ids": ["user_123"],
    "allow_channels": ["telegram"]
  }'
```

System channels (`delegate`, `system`) always pass access checks.

## Team Status

Teams have a `status` field:

- `active`: Team is operational
- `archived`: Team exists but disabled

To fully remove a team, use the delete operation — it hard-deletes the record from the database. There is no `deleted` status.

**Change team status**:

```bash
./goclaw team update \
  --team-id 550e8400-e29b-41d4-a716-446655440000 \
  --status archived
```

## TEAM.md Injection

When a team is created or modified, `TEAM.md` is generated and injected into members' system prompts. It contains:

**Lead's TEAM.md** includes:
- Team name and description
- Teammate list with roles and expertise
- **Mandatory workflow**: create task first, then delegate with task ID
- **Orchestration patterns**: sequential, iterative, parallel, mixed

**Members' TEAM.md** includes:
- Team name and teammate list
- Instructions to focus on delegated work
- How to report progress via `team_tasks(action="progress", percent=50, text="...")`
- Task board actions available: `claim`, `complete`, `list`, `get`, `search`, `progress`, `comment`, `attach`, `retry` (no `create`, `cancel`, `approve`, `reject`)

The context is wrapped in `<system_context>` tags and refreshed automatically when team configuration changes.

## Next Steps

- [Task Board](#teams-task-board) - Create and manage tasks
- [Team Messaging](#teams-messaging) - Communicate between members
- [Delegation & Handoff](#teams-delegation) - Orchestrate work

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
