# Agent Team Issues

> Troubleshooting team creation, delegation, task routing, and inter-agent communication.

## Overview

Agent teams let a lead agent coordinate work across multiple member agents using a shared task board, messaging, and a shared workspace directory. Most issues fall into four categories: team setup, task lifecycle, dispatch failures, and messaging errors.

## Team Creation

| Problem | Cause | Solution |
|---------|-------|----------|
| Member agent not added to team | Agent key not found during team creation | Verify the agent key exists in the dashboard before creating the team |
| `failed to add member` (in logs) | DB error while adding a member during `teams.create` | Check PostgreSQL connectivity; retry team creation |
| Agent shows wrong role | Role assigned incorrectly at creation | Remove and re-add the member via the dashboard with the correct role |

## Delegation & Subagents

| Problem | Cause | Solution |
|---------|-------|----------|
| Task auto-fails with "auto-failed after N dispatch attempts" | Agent failed to complete the task 3 times in a row (circuit breaker hit) | Check the member agent's logs for repeated errors; fix the underlying issue then re-create the task |
| `team_tasks.dispatch: cannot resolve agent` (log) | Assigned agent ID not found in DB at dispatch time | Confirm the member agent was not deleted; re-assign the task to an active member |
| `team_tasks.dispatch: inbound buffer full` (log) | Message bus inbound queue is saturated | Transient — the dispatcher retries on the next ticker tick (up to 5 min); reduce concurrent team task volume if persistent |
| `spawn` used instead of delegation | Agent cloned itself instead of delegating to a team member | Instruct the lead agent: "Do NOT use `spawn` for team delegation — use `team_tasks` instead" |
| Subagent workspace not created | Workspace directory creation failed at run start | Check `data_dir` permissions; ensure the configured data directory is writable |

## Task Routing

| Problem | Cause | Solution |
|---------|-------|----------|
| Task stuck in `pending` | No owner assigned or blocker tasks not yet completed | Assign an owner via the dashboard, or wait for blocker tasks to finish — unblocked tasks auto-dispatch within 5 minutes |
| `only the team lead can perform this action` | A member agent tried a lead-only operation (create/delete tasks) | Only the lead agent's session can create or delete tasks; check which agent is calling `team_tasks` |
| `only the assigned task owner can update progress` | Lead tried to update progress on a member's task | Progress updates must come from the assigned member agent; the lead receives results automatically on completion |
| `blocked_by contains invalid task ID` | `blocked_by` list references a non-existent or wrong-team task UUID | Create dependency tasks first; use their returned UUIDs in `blocked_by` |
| `assignee not found` or `agent is not a member of this team` | Assignee key typo or agent removed from team | Verify the agent key with `team_tasks(action="list_members")`; re-add the agent if needed |
| `You must check existing tasks first` | Agent called `create` without first searching for duplicates | Call `team_tasks(action="search", query="<keywords>")` before creating a new task |
| Task deleted but still referenced | Task was deleted while in `in_progress` status | Only `completed`, `failed`, or `cancelled` tasks can be deleted; cancel the task first |

## Team Messaging

| Problem | Cause | Solution |
|---------|-------|----------|
| `agent "X" is not a member of your team` | Sending to an agent outside the team | Use `team_tasks(action="list_members")` to get valid agent keys |
| `to parameter is required for send action` | `team_message` called without a recipient | Provide the `to` field with the target agent key |
| `text parameter is required` | Message body missing in `send` or `broadcast` call | Include `text` in the tool arguments |
| `failed to send message` | DB error persisting the message | Check PostgreSQL logs; usually transient |
| `failed to broadcast message` | Bus or DB error during broadcast | Same as above — retry or check server logs |
| `failed to auto-create task` from broadcast (log) | Task auto-creation on broadcast receipt failed | Non-fatal — message is delivered but no task is created; create the task manually if needed |
| `failed to get unread messages` | DB read error for the mailbox | Check PostgreSQL connectivity |

## Subagent Orchestration (v3)

GoClaw v3 adds structured subagent management. These issues appear when using `spawn` with `action=wait` or the automatic retry/concurrency system.

| Problem | Cause | Solution |
|---------|-------|----------|
| `spawn` with `action=wait` never returns | All spawned children failed or timed out | Check subagent logs; the parent unblocks when all children complete or when `timeout` elapses |
| Subagent results lost after context compaction | In-flight tasks not in compaction prompt | Tasks are now persisted in `subagent_tasks` DB table (migration 000034) — results survive summarization |
| `max concurrent subagents reached` | Tenant hit `MaxSubagentConcurrent` edition limit | Reduce parallel spawns or upgrade edition; limit is scoped per tenant to prevent resource exhaustion |
| `max subagent depth reached` | Nested spawn exceeded `MaxSubagentDepth` | Flatten delegation chain; subagents cannot spawn deeper than the configured depth |
| Subagent auto-retried but produced wrong output | Default `MaxRetries=2` with linear backoff ran on LLM failure | Expected — retries improve reliability; if output is wrong, check agent instructions |
| `/subagents` Telegram command shows empty | `subagent_tasks` table not migrated | Run pending DB migrations; migration 000034 creates the table |
| `BatchQueue` results out of order | BatchQueue processes by tenant:agent batch, not insertion order | Expected — use task `blocked_by` dependencies if ordering is required |

**Checking subagent status:**
- Telegram: `/subagents` lists all active tasks; `/subagent <id>` shows detail from DB
- Dashboard: Teams → task board shows subagent task state in real time

## Diagnostics

Use the Dashboard **Teams** view to inspect task status, events, and member state. Server-side events stream in real time — filter by `team_id` to narrow down issues.

For low-level debugging, query the task event log:

```
team_tasks(action="events", task_id="<uuid>")
```

This returns the full state-change history for a task, including dispatch count stored in metadata.

## What's Next

- [Agent Teams guide](/teams-what-are-teams) — team setup, roles, and task board
- [Common Issues](/troubleshoot-common) — general gateway and agent troubleshooting

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
