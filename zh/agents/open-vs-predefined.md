> 翻译自 [English version](#open-vs-predefined)

# Open vs. Predefined Agent

> 两种 agent 架构：每用户独立隔离（open）与共享 context（predefined）。

## 概述

GoClaw 支持两种 agent 类型，具有不同的 context 隔离模式。每个用户需要完整独立的 personality 和记忆时选择 **open**；希望共享 agent 配置、每用户单独维护 profile 时选择 **predefined**。

## 决策树

```
每个用户是否需要：
- 各自的 SOUL.md、IDENTITY.md、personality？
- 独立的用户记忆？
- 独立的 tool 配置？
          |
          YES → Open Agent（每用户完全独立）
          |
          NO  → Predefined Agent（共享 context + 每用户仅有 USER.md）
```

## 对比总览

| 方面 | Open | Predefined |
|------|------|-----------|
| **Context 隔离** | 每用户：5 个初始文件 + MEMORY.md（独立） | Agent 级：4 个共享文件 + 每用户 USER.md + BOOTSTRAP.md |
| **SOUL.md** | 每用户（首次对话时从模板初始化） | Agent 级（所有用户共享） |
| **IDENTITY.md** | 每用户（首次对话时从模板初始化） | Agent 级（所有用户共享） |
| **USER.md** | 每用户（首次对话时从模板初始化） | 每用户（从 agent 级备用或模板初始化） |
| **AGENTS.md** | 每用户（从模板初始化） | Agent 级（共享） |
| **TOOLS.md** | 未初始化（运行时从 workspace 加载，若存在） | 未初始化（在 `SeedToStore` 中跳过） |
| **MEMORY.md** | 每用户（独立持久化，不属于初始化流程） | 每用户（独立持久化，不属于初始化流程） |
| **BOOTSTRAP.md** | 每用户（首次运行仪式，从模板初始化） | 每用户（用户向导变体 `BOOTSTRAP_PREDEFINED.md`） |
| **USER_PREDEFINED.md** | 不适用 | Agent 级（基础用户处理规则） |
| **适用场景** | 个人助理、每用户独立 agent | 共享服务：FAQ bot、支持 agent、共享工具 |
| **扩展性** | N 用户 × 5 个初始文件 | 4 个 agent 文件 + N 用户 × 2 个文件 |
| **自定义程度** | 用户可自定义一切 | 用户只能自定义 USER.md |
| **Personality 一致性** | 每个用户有各自的 personality | 所有用户看到相同的 personality |

## Open Agent

最适合：个人助理、每用户独立 workspace、实验性 agent。

新用户与 open agent 首次对话时：

1. **AGENTS.md、SOUL.md、IDENTITY.md、USER.md、BOOTSTRAP.md** 从内嵌模板初始化到 `user_context_files`（TOOLS.md 不初始化——运行时从 workspace 加载，若存在）
2. **BOOTSTRAP.md** 作为首次运行仪式执行（通常询问"我是谁？"和"你是谁？"）
3. 用户填写 **IDENTITY.md、SOUL.md、USER.md**
4. 用户将 **BOOTSTRAP.md** 清空以标记完成
5. **MEMORY.md**（若存在）跨会话持久化

Context 隔离：
- 每用户完全的 personality 隔离
- 用户间无法看到彼此的文件
- 每个用户按需定制 agent

## Predefined Agent

最适合：共享服务、FAQ bot、企业客服 agent、多租户系统。

创建 predefined agent 时：

1. **AGENTS.md、SOUL.md、IDENTITY.md** 初始化到 `agent_context_files`（USER.md 和 TOOLS.md 跳过——USER.md 仅限每用户，TOOLS.md 运行时加载）
2. **USER_PREDEFINED.md** 单独初始化（基础用户处理规则）
3. 可选：LLM "summoning" 根据描述生成 **SOUL.md、IDENTITY.md、USER_PREDEFINED.md**。AGENTS.md 和 TOOLS.md 始终使用内嵌模板——不由 summoning 生成。
4. 所有用户看到相同的 personality 和指令

新用户开始对话时：

1. **USER.md、BOOTSTRAP.md**（用户向导变体）初始化到 `user_context_files`
2. 用户在 **USER.md** 中填写个人 profile（可选）
3. Agent 对所有用户保持一致的 personality

Context 隔离：
- Agent personality 锁定（共享）
- 仅 USER.md 是每用户独立的
- USER_PREDEFINED.md（agent 级）可定义通用用户处理规则

## 示例：个人 vs. 共享

### Open：个人研究助理

```
User: Alice
├── SOUL.md: "I like sarcasm, bold opinions, fast answers"
├── IDENTITY.md: "I'm Alice's research partner, irreverent and brilliant"
├── USER.md: "Alice is a startup founder in biotech"
└── MEMORY.md: "Alice's key research projects, key contacts, funding status..."

User: Bob
├── SOUL.md: "I'm formal, thorough, conservative"
├── IDENTITY.md: "I'm Bob's trusted researcher, careful and methodical"
├── USER.md: "Bob is an academic in philosophy"
└── MEMORY.md: "Bob's papers, collaborators, dissertation status..."
```

同一个 agent（`researcher`），两种完全不同的 personality。每个用户按需定制。

### Predefined：FAQ Bot（共享）

```
Agent: faq-bot (predefined)
├── SOUL.md: "Helpful, patient, empathetic support agent" (SHARED)
├── IDENTITY.md: "FAQ Assistant — always friendly" (SHARED)
├── AGENTS.md: "Answer questions from our knowledge base" (SHARED)

User: Alice → USER.md: "Alice is a premium customer, escalate complex issues"
User: Bob → USER.md: "Bob is a free-tier user, point to self-service docs"
User: Carol → USER.md: "Carol is a beta tester, gather feedback on new features"
```

相同的 agent personality，不同的每用户 context。Agent 根据用户身份调整回复，但保持一致的语调和指令。

## 如何选择

### 选择 Open，当：
- 构建个人助理（单用户单 agent）
- 每个用户希望定制 agent personality
- 需要每用户独立的记忆隔离
- 各用户的 tool 访问权限差异较大
- 希望用户自定义 SOUL.md 和 IDENTITY.md

### 选择 Predefined，当：
- 构建共享服务（FAQ bot、客服 agent、帮助台）
- 需要对所有用户保持一致的 personality
- 每个用户只需一个 profile（姓名、级别、偏好）
- Agent 的核心行为不因用户而变化
- 希望由 LLM 根据描述自动生成 personality

## 技术细节

### Open：每用户文件

初始化到 `user_context_files`（`userSeedFilesOpen`）：
```
AGENTS.md          — 操作方式
SOUL.md            — personality（首次对话时从模板初始化）
IDENTITY.md        — 身份（首次对话时从模板初始化）
USER.md            — 用户信息（首次对话时从模板初始化）
BOOTSTRAP.md       — 首次运行仪式（清空后删除）
```

**不初始化：** TOOLS.md（运行时从 workspace 加载），MEMORY.md（独立记忆系统）

### Predefined：Agent + 用户文件

Agent 级通过 `SeedToStore()` — 遍历 `templateFiles` 但**跳过 USER.md 和 TOOLS.md**：
```
AGENTS.md          — 操作方式
SOUL.md            — personality（可选通过 summoning 生成）
IDENTITY.md        — 身份（可选通过 summoning 生成）
USER_PREDEFINED.md — 基础用户处理规则（单独初始化）
```

每用户通过 `SeedUserFiles()`（`userSeedFilesPredefined`）：
```
USER.md            — 关于该用户（优先使用 agent 级 USER.md 作为种子，若存在）
BOOTSTRAP.md       — 用户向导（使用 BOOTSTRAP_PREDEFINED.md 模板）
```

## 迁移

还没决定？从 **open** 开始。之后你可以：
- 锁定 SOUL.md 和 IDENTITY.md，逐步转向 predefined 行为
- 用 AGENTS.md 定义严格指令

也可以在 agent 超出单用户场景时切换到 **predefined**。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 重启后用户编辑的内容消失 | 你使用的是 predefined 模式——用户对 SOUL.md 的修改会被覆盖。切换到 open 模式，或用 USER.md 进行每用户自定义 |
| 不同用户的 agent 行为不同 | open 模式预期行为——每个用户有各自的 context 文件。如需一致行为，使用 predefined |
| 找不到磁盘上的 context 文件 | Context 文件存储在数据库（`agent_context_files` / `user_context_files`），不在文件系统中 |

## 下一步

- [Context Files](#context-files) — 深入了解每个文件（SOUL.md、IDENTITY.md 等）
- [Summoning & Bootstrap](#summoning-bootstrap) — predefined agent 的 personality 是如何生成的
- [Creating Agents](#creating-agents) — agent 创建完整流程

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
