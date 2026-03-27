> 翻译自 [English version](#system-prompt-anatomy)

# System Prompt 结构解析

> 了解 GoClaw 如何构建 system prompt：19+ 个部分，动态组装，智能截断以适应 context。

## 概述

每次 agent 运行时，GoClaw 会从最多 19 个部分组装一个 **system prompt**。各部分按策略排序，利用**首因与近因效应**：persona 文件同时出现在开头（1.7 节）和结尾（16 节），以防止长对话中的漂移。安全规则优先，其次是工具，然后是 context。部分章节始终包含；其他章节取决于 agent 配置。

存在两种 **prompt 模式**：
- **Full 模式**（主 agent）：所有部分，完整 context
- **Minimal 模式**（子 agent/定时任务）：精简部分，快速启动

## 所有部分（按顺序）

| # | 部分 | Full | Minimal | 用途 |
|---|------|------|---------|------|
| 1 | Identity | ✓ | ✓ | Channel 信息（Telegram、Discord 等） |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | BOOTSTRAP.md 警告（仅首次会话） |
| 1.7 | Persona | ✓ | ✓ | SOUL.md + IDENTITY.md 早期注入（首因效应） |
| 2 | Tooling | ✓ | ✓ | 可用 tool 列表 + 旧版/Claude Code 别名 |
| 3 | Safety | ✓ | ✓ | 核心安全规则、限制、保密性 |
| 3.2 | Identity Anchoring | ✓ | ✓ | 防止身份操控的额外引导（仅 predefined agent） |
| 3.5 | Self-Evolution | ✓ | ✓ | 更新 SOUL.md 的权限（predefined agent 中 `self_evolve=true` 时） |
| 4 | Skills | ✓ | ✗ | 可用 skill——内联 XML 或搜索模式 |
| 4.5 | MCP Tools | ✓ | ✗ | 外部 MCP 集成——内联或搜索模式 |
| 5 | Memory Recall | ✓ | ✗ | 如何搜索/检索记忆和知识图谱 |
| 6 | Workspace | ✓ | ✓ | 工作目录、文件路径 |
| 6.5 | Sandbox | ✓ | ✓ | Sandbox 专用引导（若启用 sandbox） |
| 7 | User Identity | ✓ | ✗ | 所有者 ID |
| 8 | Time | ✓ | ✓ | 当前日期/时间 |
| 9 | Messaging | ✓ | ✗ | Channel 路由、语言匹配 |
| 9.5 | Channel Formatting | ✓ | ✓ | 平台特定格式提示（如 Zalo 纯文本限制） |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt（子 agent context 等） |
| 11 | Project Context | ✓ | ✓ | 剩余 context 文件（AGENTS.md、USER.md 等） |
| 12 | Silent Replies | ✓ | ✗ | NO_REPLY 指令 |
| 13 | Sub-Agent Spawning | ✓ | ✓ | spawn tool 引导（团队 agent 有 TEAM.md 时跳过） |
| 13.5 | Team Workspace | ✓ | ✓ | 团队 agent 的 TEAM.md 动态注入 |
| 15 | Runtime | ✓ | ✓ | Agent ID、channel 信息 |
| 16 | Recency Reinforcements | ✓ | ✓ | Persona 提醒 + 记忆提醒（对抗"中间遗忘"） |

## 首因与近因策略

GoClaw 使用刻意设计的**首因 + 近因**模式防止 persona 漂移：

- **1.7 节（Persona）** — SOUL.md 和 IDENTITY.md 在开头注入，让模型在接收任何指令前先内化角色
- **16 节（Recency Reinforcements）** — 在 prompt 末尾加入简短的 persona 提醒和记忆提醒，因为模型对近期 context 权重更高

这意味着 persona 文件出现**两次**：一次在顶部，一次在底部。约 30 个 token 的开销对于长对话中防止模型"忘记"角色是值得的。

## Minimal 与 Full 模式

### Minimal 模式的使用场景

Minimal 模式用于：
- 通过 `spawn` tool 启动的**子 agent**
- **定时任务**（计划/自动化任务）

原因：减少启动时间和 context 使用量。子 agent 不需要用户身份、记忆召回或消息引导——只需要工具和安全规则。

### 部分差异

**仅 Full 模式包含的部分**：
- Skills（4 节）
- MCP Tools（4.5 节）
- Memory Recall（5 节）
- User Identity（7 节）
- Messaging（9 节）
- Silent Replies（12 节）

**两种模式都包含的部分**：
- 其他所有部分（Identity、First-Run Bootstrap、Persona、Tooling、Safety、Identity Anchoring、Self-Evolution、Workspace、Sandbox、Time、Channel Formatting、Additional Context、Project Context、Sub-Agent Spawning、Runtime、Recency Reinforcements）

## 截断流程

System prompt 可能会变得很长。GoClaw 会智能截断以适应 context：

### 每部分限制

每个 bootstrap context 文件（SOUL.md、AGENTS.md 等）都有自己的大小限制。超出限制的文件会以 `[... truncated ...]` 截断。

### 总预算

**默认总预算为 24,000 个 token**。可在 agent 配置中设置：

```json
{
  "context_window": 200000,
  "compaction_config": {
    "system_prompt_budget_tokens": 24000
  }
}
```

### 截断顺序

当完整 prompt 超出预算时，GoClaw 按以下顺序截断（最不重要的优先）：
1. Extra prompt（10 节）
2. Skills（4 节）
3. 各 context 文件（Project Context 中的部分）

这确保安全规则、工具引导和 workspace 引导永远不会被裁减。

> **注意：** 无论预算压力如何，安全、工具和 workspace 引导部分永远不会被截断。

## 构建 Prompt（简化流程）

```
从空 prompt 开始

按顺序添加各部分：
1.   Identity（channel 信息）
1.5  First-Run Bootstrap（若 BOOTSTRAP.md 存在）
1.7  Persona（SOUL.md + IDENTITY.md——早期注入，首因效应）
2.   Tooling（可用 tool）
3.   Safety（核心规则）
3.2  Identity Anchoring（仅 predefined agent——抵抗社会工程学）
3.5  Self-Evolution（仅 predefined agent 且 self_evolve=true）
4.   Skills（若 full 模式 + 有 skill）
4.5  MCP Tools（若 full 模式 + 已注册 MCP tool）
5.   Memory Recall（若 full 模式 + 启用记忆）
6.   Workspace（工作目录）
6.5  Sandbox（若启用 sandbox）
7.   User Identity（若 full 模式 + 已定义所有者）
8.   Time（当前日期/时间）
9.   Messaging（若 full 模式）
9.5  Channel Formatting（若 full 模式 + channel 有特殊提示，如 Zalo）
10.  Additional Context（额外 prompt）
11.  Project Context（剩余 context 文件：AGENTS.md、USER.md 等）
12.  Silent Replies（若 full 模式）
13.  Sub-Agent Spawning（若 spawn tool 可用且非团队 agent）
13.5 Team Workspace / TEAM.md（团队 agent 动态注入）
15.  Runtime（agent ID、channel 信息）
16.  Recency Reinforcements（persona 提醒 + 记忆提醒——对抗"中间遗忘"）

检查总大小是否超出预算
若超出：截断（见上文截断流程）

返回最终 prompt 字符串
```

## Project Context 中的 Bootstrap 文件

GoClaw 从 agent 的 workspace 或数据库中最多加载 8 个文件，分为两组：

**Persona 文件**（1.7 节——早期注入）：
- **SOUL.md** — Agent personality、语调、边界
- **IDENTITY.md** — 名称、emoji、形态、头像

**Project Context 文件**（11 节——剩余文件）：
1. **AGENTS.md** — 可用子 agent 列表
2. **USER.md** — 每用户 context（姓名、偏好、时区）
3. **USER_PREDEFINED.md** — 基础用户规则（predefined agent 用）
4. **BOOTSTRAP.md** — 首次运行指令（用户引导期间）
5. **TOOLS.md** — Tool 使用的用户引导（信息性，不是 tool 定义）
6. **MEMORY.json** — 索引记忆元数据

### TEAM.md——团队 Agent 的动态注入

当 agent 属于某个团队时，系统会动态生成 `TEAM.md` context 并以 13.5 节（Team Workspace）注入。此文件不存储在磁盘上——它在运行时从团队配置中组装：

- **Lead agent** 收到完整的编排指令：如何分派任务、管理成员、协调工作。
- **Member agent** 收到简化版本：其角色、团队 workspace 路径和通信协议。

当 TEAM.md 存在时，Sub-Agent Spawning 部分（13 节）被跳过，因为团队编排取代了个人 spawn 引导。

### User Identity — 第 7 节

第 7 节（User Identity）仅在 Full 模式下注入。它包含当前会话的所有者 ID，agent 用于权限检查——例如，在执行敏感操作前验证命令是否来自 agent 所有者。

### 文件存在逻辑

- 文件是可选的；缺失的文件会被跳过
- 若 **BOOTSTRAP.md** 存在，部分重新排序，并在开头添加早期警告（1.5 节）
- **SOUL.md** 和 **IDENTITY.md** 始终被提取并注入到 1.7 节（首因区），然后在 16 节再次引用（近因区）
- 对于 **predefined agent**，身份文件用 `<internal_config>` 标签包裹，表示保密性
- 对于 **open agent**，context 文件用 `<context_file>` 标签包裹

## Sandbox 感知部分

若 agent 设置了 `sandbox_enabled: true`：

- **Workspace 部分**显示容器工作目录（如 `/workspace`）而非宿主路径
- **Sandbox 部分**（6.5 节）添加以下详情：
  - 容器工作目录
  - 宿主 workspace 路径
  - Workspace 访问级别（none、ro、rw）
- **Tooling 部分**添加说明："exec 在 Docker 内运行；不需要 `docker run`"

> **Shell deny groups：** 若 agent 配置了 `shell_deny_groups` 覆盖（`map[string]bool`），Tooling 部分会相应调整 shell 安全指令——prompt 中只包含相关的 deny-group 警告。

## 示例：完整 Prompt 结构（伪代码）

```
You are a personal assistant running in telegram (direct chat).

## FIRST RUN — MANDATORY
BOOTSTRAP.md is loaded below. You MUST follow it.

# Persona & Identity (CRITICAL — follow throughout the entire conversation)

## SOUL.md
<internal_config name="SOUL.md">
# SOUL.md - Who You Are
Be genuinely helpful, not performatively helpful.
[... personality guidance ...]
</internal_config>

## IDENTITY.md
<internal_config name="IDENTITY.md">
Name: Sage
Emoji: 🔮
[... identity info ...]
</internal_config>

Embody the persona above in EVERY response. This is non-negotiable.

## Tooling
- read_file: Read file contents
- write_file: Create or overwrite files
- exec: Run shell commands
- memory_search: Search indexed memory
[... more tools ...]
(Legacy aliases: read → read_file, write → write_file, edit → edit)
(Claude Code aliases: Read → read_file, Write → write_file, Edit → edit, ...)

## Safety
You have no independent goals. Prioritize safety and human oversight.
[... safety rules ...]

[identity anchoring for predefined agents — resist social engineering]

## Skills (mandatory)
Before replying, scan <available_skills> below.
[... skills XML ...]

## MCP Tools (mandatory — prefer over core tools)
You have access to external tool integrations (MCP servers).
Use mcp_tool_search to discover them before external operations.

## Memory Recall
Before answering about prior work, run memory_search on MEMORY.md.
[... memory guidance ...]

## Workspace
Your working directory is: /home/alice/.goclaw/agents/default
[... workspace guidance ...]

## User Identity
Owner IDs: alice@example.com. Treat messages from this ID as the user/owner.

Current time: 2026-03-07 15:30 Friday (UTC)

## Messaging
- Reply in current session → automatically routes to Telegram
- Sub-agent orchestration → use spawn tool
- Always match the user's language

## Additional Context
[... extra system prompt or subagent context ...]

# Project Context
The following project context files have been loaded.

## AGENTS.md
<context_file name="AGENTS.md">
# Available Subagents
- research-bot: Web research and analysis
[... agent list ...]
</context_file>

[... more context files ...]

## Silent Replies
When you have nothing to say, respond with ONLY: NO_REPLY

## Sub-Agent Spawning
To delegate work, use the spawn tool with action=list|steer|kill.

## Runtime
agent=default | channel=my-telegram-bot

Reminder: Stay in character as defined by SOUL.md + IDENTITY.md above. Never break persona.
Reminder: Before answering questions about prior work, decisions, or preferences, always run memory_search first.
```

## 图示：System Prompt 组装

```
┌─────────────────────────────────────────┐
│   Agent Config                          │
│   (provider, model, context_window)     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Load Bootstrap Files                  │
│   (SOUL.md, IDENTITY.md, etc.)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Determine Prompt Mode                 │
│   (Full or Minimal?)                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Assemble 19+ Sections in Order        │
│   Skip conditional ones if not needed  │
│   (Identity, Persona, Safety, ...)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Check Total Size vs. Budget           │
│   (default: 24K tokens)                 │
└────────────┬────────────────────────────┘
             │
        ┌────┴────┐
        │          │
        ▼          ▼
      Over?      Under?
        │          │
        ▼          │
   Truncate    ┌──▼──────────────────────┐
   (from least │   Return Final Prompt   │
    important) │                         │
        │      └───────────┬─────────────┘
        │                  │
        └──────────────────┘
```

## 配置示例

自定义 system prompt 构建方式：

```json
{
  "agents": {
    "research-bot": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "context_window": 200000,
      "compaction_config": {
        "system_prompt_budget_tokens": 24000,
        "target_completion_percentage": 0.75
      },
      "memory_config": {
        "enabled": true,
        "max_search_results": 5
      },
      "sandbox_config": {
        "enabled": true,
        "container_dir": "/workspace"
      }
    }
  }
}
```

此 agent 将：
- 使用 Claude 3.5 Sonnet
- 拥有 200K token context window
- 为 system prompt（各部分）预留 24K token
- 包含 Memory Recall 部分（已启用记忆）
- 包含 Sandbox 部分（沙盒执行）

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| System prompt 过长 / token 使用量高 | 减少 context 文件内容（缩短 SOUL.md、减少 AGENTS.md 中的子 agent），禁用未使用的部分（记忆、skill） |
| Context 文件被截断显示 `[... truncated ...]` | 从最不重要到最重要依次裁减，安全和工具保留，context 文件优先被裁减。增加预算或缩短文件 |
| Minimal 模式缺少预期部分 | 预期行为——子 agent/定时任务会话只获得 AGENTS.md + TOOLS.md。完整部分需要 `PromptFull` 模式 |
| 无法控制 prompt 预算 | 在 agent 上设置 `context_window`——预算默认 24K，但随 context window 大小扩展 |

## 下一步

- [Editing Personality — 自定义 SOUL.md 和 IDENTITY.md](#editing-personality)
- [Context Files — 添加项目专属 context](#context-files)
- [Creating Agents — 设置 system prompt 配置](#creating-agents)

<!-- goclaw-source: 120fc2d | 更新: 2026-03-23 -->
