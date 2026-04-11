> 翻译自 [English version](/template-team)

# TEAM.md（系统生成）

> 为团队中的 agent 注入的动态上下文文件——在运行时生成，永远不会手动创建或存储在磁盘上。

## 概览

`TEAM.md` 是 GoClaw 为每个属于团队的 agent 自动生成的**虚拟上下文文件**。与 `SOUL.md` 或 `AGENTS.md` 不同，你永远不需要编写或编辑此文件——系统根据当前团队配置在每次 agent 运行时重新构建它。

它告诉 agent 他们的队友是谁、他们担任什么角色，以及如何通过 `team_tasks` 工具进行协作。

**关键事实：**
- 不是磁盘上的文件——仅存在于系统提示中
- 每次 agent 运行时重新生成
- 在 bootstrap（首次运行）期间跳过以减少噪音
- 在提示中用 `<system_context>` 标签包裹（标示"不要将此读写为文件"）

---

## 何时注入

TEAM.md 在 GoClaw 运行时解析 agent 时注入：

1. **Agent 是团队成员** — 系统检查 agent 是否属于任何团队
2. **尚未存在** — 如果 TEAM.md 以某种方式已预加载，系统跳过重新生成
3. **Bootstrap 时跳过** — 在首次运行（bootstrap 会话）时，省略 TEAM.md 以保持介绍简洁

当 agent **不**属于任何团队时，会注入另一个虚拟文件（`AVAILABILITY.md`）——参见下方 [AVAILABILITY.md 说明](#availabilitymd-说明)。

---

## 按角色生成的内容

TEAM.md 的内容因 agent 在团队中的角色而不同。

### 所有 Agent（公共标头）

每个 agent 都能看到团队名称、描述、自己的角色和完整成员列表：

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

每个成员行包括：
- 非自身成员的显示名称（加粗）和 agent key（反引号）
- 括号中的角色
- 冒号后的可选 frontmatter 描述

### Lead

Lead 看到完整的编排指南。内容因团队版本而异：

**Team V2（高级编排）：**

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

**Team V1（基础）：**

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

如果团队有 reviewer 角色成员，lead 还会看到 **Reviewers** 部分：

```
## Reviewers
Reviewers evaluate quality-critical task results.

- **Bob** `bob`: Reviews final outputs
```

### Member（成员）

成员看到专注、精简的指南：

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

### Reviewer（审查员）

审查员看到成员指南加顶部的一行说明：

```
You are a **reviewer**. When evaluating, respond with **APPROVED** or **REJECTED: <feedback>**.
```

---

## 完整示例（Lead，Team V2）

以下是 lead agent 在系统提示中看到的真实示例：

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

## AVAILABILITY.md 说明

当 agent **不**属于任何团队时，GoClaw 注入一个名为 `AVAILABILITY.md` 的小型虚拟文件，而不是 TEAM.md。其全部内容为：

```
You are NOT part of any team. Do not use team_tasks or team_message tools.
```

这防止 agent 浪费工具调用去探测不存在的团队功能。

---

## 下一步

- [Agent 团队概述](/teams-what-are-teams) — 如何创建和管理团队
- [委托与移交](/teams-delegation) — lead 如何向成员委托任务
- [DELEGATION.md 模板](../../agent-teams/delegation-and-handoff.md) — 子 agent 派生的兄弟虚拟文件

<!-- goclaw-source: 1296cdbf | 更新: 2026-04-11 -->
