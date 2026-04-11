# TEAM.md (System-Generated)

> Dynamic context file injected for agents in a team — generated at runtime, never manually created or stored on disk.

## Overview

`TEAM.md` is a **virtual context file** that GoClaw generates automatically for every agent that belongs to a team. Unlike `SOUL.md` or `AGENTS.md`, you never write or edit this file — the system builds it fresh on every agent run based on the current team configuration.

It tells the agent who their teammates are, what role they hold, and exactly how to collaborate through the `team_tasks` tool.

**Key facts:**
- Not a file on disk — exists only in the system prompt
- Regenerated every time the agent runs
- Skipped during bootstrap (first run) to reduce noise
- Wrapped in `<system_context>` tags in the prompt (signals "do not read/write this as a file")

---

## When It's Injected

TEAM.md is injected when GoClaw resolves an agent at runtime:

1. **Agent is a team member** — the system checks if the agent belongs to any team
2. **Not already present** — if TEAM.md was somehow pre-loaded, the system skips regeneration
3. **Bootstrap is skipped** — on first run (bootstrap session), TEAM.md is omitted to keep the intro clean

When the agent is **not** part of a team, a different virtual file (`AVAILABILITY.md`) is injected instead — see [AVAILABILITY.md Note](#availabilitymd-note) below.

---

## Generated Content by Role

The content of TEAM.md differs based on the agent's role in the team.

### All Agents (common header)

Every agent sees the team name, description, their own role, and the full member list:

```
# Team: <team-name>
<team-description>
Role: <lead|member|reviewer>

## Members
This is the complete and authoritative list of your team. Do NOT use tools to verify this.

- **you** (lead)
- **Alice** `alice` (member): Researcher, handles data gathering
- **Bob** `bob` (reviewer): Reviews final outputs
```

Each member line includes:
- Display name (bold) and agent key (backtick) for non-self members
- Role in parentheses
- Optional frontmatter description after the colon

### Lead

Leads see the full orchestration guide. The content varies by team version:

**Team V2 (advanced orchestration):**

```
## Workflow

Delegate work to team members using `team_tasks` with `assignee`.

    team_tasks(action="create", subject="...", description="...", assignee="agent-key")

The system auto-dispatches to the assigned member and auto-completes when done.
Do NOT use `spawn` for team delegation — `spawn` is only for self-clone subagent work.

Rules:
- Always specify `assignee` — match member expertise from the list above
- Check task board first — ALWAYS call `team_tasks(action="list")` before creating tasks
- Create all tasks first, then briefly tell the user what you delegated
- Do NOT add confirmations ("Done!", "Got it!") — just state what was assigned
- Results arrive automatically — do NOT present partial results
- Prefer delegation — if the user asks to involve the team, delegate immediately
- Do NOT block on completed tasks — pass results in the new task's description
- For dependency chains: use `blocked_by` to sequence tasks

## Task Decomposition (CRITICAL)

NEVER assign one big task to one member. ALWAYS break user requests into small, atomic tasks:

1. Analyze the request — identify distinct steps, deliverables, and SKILLS needed
2. Match by SKILL, not topic — assign based on what the task DOES, not what it's ABOUT
3. Decompose into tasks where each has ONE clear deliverable
4. Distribute across members — use ALL available members, not just one
5. Sequence with `blocked_by` — if task B needs task A's output, set blocked_by=[task_A_id]
   IMPORTANT: `blocked_by` requires real task UUIDs. Create dependency tasks FIRST, get their IDs,
   THEN create dependent tasks. Do NOT use placeholders like "task_1".

## Orchestration Patterns

- Parallel: Independent tasks → create all with different assignees
- Sequential: Create Task A first → get its UUID → create Task B with blocked_by=[A_id]
- Mixed: Create A+B (parallel) → create C with blocked_by=[A_id, B_id]

## Follow-up Reminders

When you need user input: create+claim task, then ask_user with text=<question>.
ONLY use when you have a question for the user — NOT for waiting on teammates.
System auto-sends reminders. Call clear_ask_user when user replies.
```

**Team V1 (basic):**

```
## Workflow

Create a task with `team_tasks` (with `assignee`), then the system dispatches automatically.
Tasks auto-complete when the member finishes.

Rules:
- Always specify `assignee` when creating tasks
- Create all tasks first, then briefly tell the user what you delegated
- Do NOT add confirmations ("Done!", "Got it!") — just state what was assigned
- Results arrive automatically — do NOT present partial results
```

Leads also see a **Reviewers** section if the team has reviewer-role members:

```
## Reviewers
Reviewers evaluate quality-critical task results.

- **Bob** `bob`: Reviews final outputs
```

### Member

Members see a focused, minimal guide:

```
## Workflow

As a member, focus entirely on your assigned task.

Rules:
- Stay on task — do not deviate from the assignment
- Your final response becomes the task result — make it clear, complete, and actionable
- For long tasks, report progress: team_tasks(action="progress", percent=50, text="status")
- The task_id is auto-resolved — you don't need to specify it
- Task completion is automatic when your run finishes
```

### Reviewer

Reviewers see the member guide plus a one-liner at the top:

```
You are a **reviewer**. When evaluating, respond with **APPROVED** or **REJECTED: <feedback>**.
```

---

## Full Example (Lead, Team V2)

Below is a realistic example of what a lead agent sees in their system prompt:

```
<system_context name="TEAM.md">
# Team: content-team
A multi-agent team for producing long-form content.
Role: lead

## Members
This is the complete and authoritative list of your team. Do NOT use tools to verify this.

- **you** (lead)
- **Alice** `alice` (member): Researcher — handles data gathering and fact-checking
- **Charlie** `charlie` (member): Writer — composes articles and summaries
- **Bob** `bob` (reviewer): Reviews final outputs for accuracy and tone

## Reviewers
Reviewers evaluate quality-critical task results.

- **Bob** `bob`: Reviews final outputs for accuracy and tone

## Workflow

Delegate work to team members using `team_tasks` with `assignee`.
...
</system_context>
```

---

## AVAILABILITY.md Note

When an agent is **not** part of any team, GoClaw injects a small virtual file called `AVAILABILITY.md` instead of TEAM.md. Its entire content is:

```
You are NOT part of any team. Do not use team_tasks or team_message tools.
```

This prevents the agent from wasting tool calls probing for team capabilities that don't exist.

---

## What's Next

- [Agent Teams Overview](/teams-what-are-teams) — how to create and manage teams
- [Delegation & Handoff](/teams-delegation) — how leads delegate tasks to members
- [DELEGATION.md Template](../../agent-teams/delegation-and-handoff.md) — the sibling virtual file for subagent spawning

<!-- goclaw-source: 1296cdbf | updated: 2026-04-11 -->
