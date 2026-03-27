> 翻译自 [English version](#agent-teams)

# Agent 团队文档

Agent 团队支持多 agent 协作，提供共享任务板、mailbox 和协调委派系统。

## 快速导航

1. **[什么是 Agent 团队？](#teams-what-are-teams)**（82 行）
   - 团队模型概述
   - 关键设计原则
   - 真实场景示例
   - 与其他委派模型的对比

2. **[创建与管理团队](#teams-creating)**（169 行）
   - 通过 API/CLI/Dashboard 创建团队
   - 自动委派链接创建
   - 管理成员
   - 团队设置与访问控制
   - TEAM.md 注入

3. **[任务板](#teams-task-board)**（218 行）
   - 任务生命周期与状态
   - 核心 `team_tasks` 工具操作
   - 创建、认领、完成、取消
   - 任务依赖与自动解除阻塞
   - 分页与用户范围

4. **[团队消息](#teams-messaging)**（156 行）
   - `team_message` 工具操作
   - 直接消息与广播
   - 通过消息总线路由
   - 事件广播
   - 最佳实践

5. **[委派与交接](#teams-delegation)**（297 行）
   - 强制任务关联
   - 同步与异步委派
   - 并行批处理
   - 委派搜索（混合 FTS + 语义）
   - Handoff 对话转移
   - 评估循环模式
   - 访问控制与并发限制

## 核心概念

**Lead Agent**：编排工作，创建任务，委派给成员，汇总结果。接收包含完整指令的 `TEAM.md`。

**Member Agent**：执行委派的工作，认领任务，报告结果。通过工具按需获取 context。

**任务板**：共享工作跟踪器，支持优先级、依赖关系和生命周期跟踪。

**Mailbox**：直接消息、广播，通过消息总线实时投递。

**委派（Delegation）**：父级在子 agent 上生成工作，强制关联任务。

**交接（Handoff）**：在不中断用户会话的情况下转移对话控制权。

## 工具参考

| 工具 | 操作 | 使用者 |
|------|------|--------|
| `team_tasks` | list, get, create, claim, complete, cancel, search | 所有团队成员 |
| `team_message` | send, broadcast, read | 所有团队成员 |
| `spawn` | （操作隐式） | 仅 lead |
| `handoff` | transfer, clear | 任意 agent |
| `delegate_search` | （操作隐式） | 有大量委派目标的 agent |

## 实现文件

GoClaw 源文件（只读参考）：

- `internal/tools/team_tool_manager.go` - 共享后端
- `internal/tools/team_tasks_tool.go` - 任务板工具
- `internal/tools/team_message_tool.go` - Mailbox 工具
- `internal/tools/delegate*.go` - 委派系统
- `internal/tools/handoff_tool.go` - Handoff 工具
- `internal/store/pg/teams.go` - PostgreSQL 实现

## 入门指南

1. 从[什么是 Agent 团队？](#teams-what-are-teams)开始，了解概念概述
2. 阅读[创建与管理团队](#teams-creating)，搭建你的第一个团队
3. 学习[任务板](#teams-task-board)，创建和管理工作
4. 阅读[团队消息](#teams-messaging)，了解通信模式
5. 掌握[委派与交接](#teams-delegation)，分配工作

## 常见工作流

### 并行研究（3 个 agent）
1. Lead 创建 3 个任务
2. 并行委派给 analyst、researcher、writer
3. 结果自动一起通报
4. Lead 汇总并响应

### 迭代审核（2 个 agent）
1. Lead 为 generator 创建任务
2. 等待结果
3. 以 generator 的输出为基础，为 reviewer 创建第二个任务
4. 审查反馈
5. 如需要则循环

### 对话交接
1. 用户提出专业问题
2. 当前 agent 识别到专业能力缺口
3. 使用 `handoff` 转移给专家
4. 专家自然地继续对话
5. 用户感知不到切换

## 设计理念

- **以 Lead 为中心**：只有 lead 获得完整 TEAM.md；成员保持精简
- **强制跟踪**：每次委派关联一个任务
- **自动完成**：无需手动状态管理
- **并行批处理**：高效结果聚合
- **开放失败（Fail-open）**：访问控制配置异常时默认开放
