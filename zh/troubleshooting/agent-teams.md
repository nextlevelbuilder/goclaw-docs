> 翻译自 [English version](#troubleshoot-agent-teams)

# Agent Team 问题

> 团队创建、委派、任务路由和 agent 间通信的故障排除。

## 概览

Agent team 让 lead agent 通过共享任务板、消息和共享工作区目录协调多个 member agent 的工作。大多数问题分为四类：团队设置、任务生命周期、派发失败和消息错误。

## 团队创建

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| Member agent 未加入团队 | 团队创建时未找到 agent key | 创建团队前在仪表盘确认 agent key 存在 |
| 日志中出现 `failed to add member` | `teams.create` 时添加成员的 DB 错误 | 检查 PostgreSQL 连接；重试团队创建 |
| Agent 显示错误角色 | 创建时角色分配错误 | 通过仪表盘移除并以正确角色重新添加该成员 |

## 委派与子 Agent

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 任务自动失败并显示 "auto-failed after N dispatch attempts" | Agent 连续 3 次未完成任务（触发熔断）| 检查 member agent 的日志中是否有重复错误；修复根本问题后重新创建任务 |
| 日志中出现 `team_tasks.dispatch: cannot resolve agent` | 派发时数据库中未找到分配的 agent ID | 确认 member agent 未被删除；将任务重新分配给活跃成员 |
| 日志中出现 `team_tasks.dispatch: inbound buffer full` | 消息总线入站队列已满 | 短暂性——派发器在下一个 ticker tick 时重试（最多 5 分钟）；持续发生时减少并发团队任务量 |
| 使用了 `spawn` 而非委派 | Agent 克隆了自身而非委派给 team member | 指示 lead agent："不要使用 `spawn` 进行团队委派——请改用 `team_tasks`" |
| 子 Agent 工作区未创建 | 运行开始时工作区目录创建失败 | 检查 `data_dir` 权限；确保配置的数据目录可写 |

## 任务路由

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 任务卡在 `pending` 状态 | 未分配 owner 或阻塞任务尚未完成 | 通过仪表盘分配 owner，或等待阻塞任务完成——解除阻塞的任务 5 分钟内自动派发 |
| `only the team lead can perform this action` | Member agent 尝试了仅 lead 可执行的操作（创建/删除任务）| 只有 lead agent 的会话可以创建或删除任务；检查哪个 agent 在调用 `team_tasks` |
| `only the assigned task owner can update progress` | Lead 尝试更新 member 任务的进度 | 进度更新必须来自分配的 member agent；任务完成时 lead 会自动收到结果 |
| `blocked_by contains invalid task ID` | `blocked_by` 列表引用了不存在或不属于本团队的任务 UUID | 先创建依赖任务；在 `blocked_by` 中使用其返回的 UUID |
| `assignee not found` 或 `agent is not a member of this team` | 受托人 key 有误或 agent 已从团队中移除 | 用 `team_tasks(action="list_members")` 验证 agent key；如需要重新添加 agent |
| `You must check existing tasks first` | Agent 未先搜索重复任务就调用了 `create` | 创建新任务前先调用 `team_tasks(action="search", query="<keywords>")` |
| 任务已删除但仍被引用 | 任务在 `in_progress` 状态时被删除 | 只有 `completed`、`failed` 或 `cancelled` 的任务才能删除；先取消任务 |

## 团队消息

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `agent "X" is not a member of your team` | 向团队外的 agent 发送消息 | 用 `team_tasks(action="list_members")` 获取有效的 agent key |
| `to parameter is required for send action` | 调用 `team_message` 时未指定收件人 | 在 `to` 字段中填写目标 agent key |
| `text parameter is required` | `send` 或 `broadcast` 调用中缺少消息正文 | 在工具参数中包含 `text` 字段 |
| `failed to send message` | 持久化消息时 DB 错误 | 检查 PostgreSQL 日志；通常是短暂性错误 |
| `failed to broadcast message` | 广播时总线或 DB 错误 | 同上——重试或检查服务器日志 |
| 广播时日志出现 `failed to auto-create task` | 收到广播后自动创建任务失败 | 非致命——消息已送达但未创建任务；如需要手动创建任务 |
| `failed to get unread messages` | 邮箱 DB 读取错误 | 检查 PostgreSQL 连接 |

## 诊断

使用仪表盘的 **Teams** 视图检查任务状态、事件和成员状态。服务器端事件实时流式传输——按 `team_id` 过滤以缩小排查范围。

如需低级调试，查询任务事件日志：

```
team_tasks(action="events", task_id="<uuid>")
```

该操作返回任务的完整状态变更历史，包括存储在 metadata 中的派发次数。

## 下一步

- [Agent Teams 指南](#teams-what-are-teams) — 团队设置、角色和任务板
- [常见问题](#troubleshoot-common) — 通用 gateway 和 agent 故障排除

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
