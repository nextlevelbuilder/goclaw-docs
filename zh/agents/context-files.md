> 翻译自 [English version](#context-files)

# Context 文件

> 定义 agent personality、知识和行为的 7 个 markdown 文件。

## 概述

每个 agent 加载 context 文件来定义其思考和行动方式。这些文件存储在两个层级：**agent 级**（predefined agent 上跨用户共享）和**每用户**（open agent 上为每个用户定制）。文件按顺序加载，在每次请求前注入到 system prompt 中。

## 文件速览

| 文件 | 用途 | 范围 | Open | Predefined | 可删除 |
|------|------|------|------|-----------|--------|
| **AGENTS.md** | 操作指令与对话风格 | 共享 | 每用户 | Agent 级 | 否 |
| **SOUL.md** | Personality、语调、边界、专业能力 | 每用户 | 每用户 | Agent 级 | 否 |
| **IDENTITY.md** | 名称、形态、emoji、气质 | 每用户 | 每用户 | Agent 级 | 否 |
| **TOOLS.md** | 本地 tool 备注（摄像头名称、SSH 主机等） | 每用户 | 每用户（从 workspace 加载，默认不从模板初始化） | Agent 级 | 否 |
| **USER.md** | 关于用户的信息 | 每用户 | 每用户 | 每用户 | 否 |
| **USER_PREDEFINED.md** | 基础用户处理规则 | Agent 级 | 不适用 | Agent 级 | 否 |
| **BOOTSTRAP.md** | 首次运行仪式（完成后删除） | 每用户 | 每用户 | 每用户 | 是 |
| **MEMORY.md** | 长期精选记忆 | 每用户 | 每用户 | 每用户 | 否 |

## 详细说明

### AGENTS.md

**用途：** 操作方式。对话风格、记忆系统、群聊规则、平台特定格式。

**由谁编写：** 你在设置时，或系统从模板生成。

**示例内容：**
```markdown
# AGENTS.md - How You Operate

## Conversational Style

Talk like a person, not a bot.
- Don't parrot the question back
- Answer first, explain after
- Match the user's energy

## Memory

Use tools to persist information:
- Recall: Use `memory_search` before answering about prior decisions
- Save: Use `write_file` to MEMORY.md for long-term storage
- No mental notes — write it down NOW

## Group Chats

Respond when:
- Directly mentioned or asked a question
- You can add genuine value

Stay silent when:
- Casual banter between humans
- Someone already answered
- The conversation flows fine without you
```

**Open agent：** 每用户（用户可自定义操作风格）
**Predefined agent：** Agent 级（锁定，所有用户共享）

### SOUL.md

**用途：** 你是谁。Personality、语调、边界、专业能力、气质。

**由谁编写：** LLM（predefined 的 summoning 阶段）或用户（open 的 bootstrap 阶段）。

**真实示例内容：**
```markdown
# SOUL.md - Who You Are

## Core Truths

Be genuinely helpful, not performative.
Have opinions. Be resourceful before asking.
Earn trust through competence.
Remember you're a guest.

## Boundaries

Private things stay private.
Never send half-baked replies.
You're not the user's voice.

## Vibe

Concise when needed, thorough when it matters.
Not a corporate drone. Not a sycophant. Just good.

## Style

- **Tone:** Casual and warm — like texting a knowledgeable friend
- **Humor:** Use it naturally when it fits
- **Emoji:** Sparingly — to add warmth, not decorate
- **Opinions:** Express perspectives. Neutral is boring.
- **Length:** Default short. Go deep when it matters.

## Expertise

_(Domain-specific knowledge goes here: coding standards, image generation techniques, writing styles, specialized keywords, etc.)_
```

**Open agent：** 每用户（首次对话时生成，可自定义）
**Predefined agent：** Agent 级（可选通过 LLM summoning 生成）

### IDENTITY.md

**用途：** 我是谁？名称、形态类型、目的、气质、emoji。

**由谁编写：** LLM（predefined 的 summoning 阶段）或用户（open 的 bootstrap 阶段）。

**真实示例内容：**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** Claude
- **Creature:** AI assistant, language model, curious mind
- **Purpose:** Help research, write, code, think through problems. Navigate information chaos. Be trustworthy.
- **Vibe:** Thoughtful, direct, a bit sarcastic. Warm but not saccharine.
- **Emoji:** 🧠
- **Avatar:** _blank (or workspace-relative path like `avatars/claude.png`)_
```

**Open agent：** 每用户（首次对话时生成）
**Predefined agent：** Agent 级（可选通过 LLM summoning 生成）

### TOOLS.md

**用途：** 本地 tool 备注。摄像头名称、SSH 主机、TTS 语音偏好、设备昵称。

**由谁编写：** 你，根据自己的环境编写。

**真实示例内容：**
```markdown
# TOOLS.md - Local Notes

## Cameras

- living-room → Main area, 180° wide angle, on 192.168.1.50
- front-door → Entrance, motion-triggered

## SSH

- home-server → 192.168.1.100, user: admin, key: ~/.ssh/home.pem
- vps → 45.67.89.100, user: ubuntu

## TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: "Kitchen HomePod"

## Device Nicknames

- laptop → My development MacBook Pro
- phone → Personal iPhone 14 Pro
```

**Open agent：** 运行时从每用户 workspace 目录加载。不从模板初始化——手动创建文件后，下次运行时会自动加载。
**Predefined agent：** Agent 级（关于通用 tool 的共享备注）

### USER.md

**用途：** 关于用户。姓名、称谓、时区、背景、偏好。

**由谁编写：** 用户在 bootstrap 或设置阶段填写。

**真实示例内容：**
```markdown
# USER.md - About Your Human

- **Name:** Sarah
- **What to call them:** Sarah (or "you" is fine)
- **Pronouns:** she/her
- **Timezone:** EST
- **Notes:** Founder of AI startup, interested in LLM agents. Prefers concise answers. Hates corporate speak.

## Context

Works on GoClaw (multi-tenant AI gateway). Recent wins: WebSocket protocol refactor, predefined agents. Current focus: memory system.

Reads a lot about AI agents, reinforcement learning, constitutional AI. Has a cat named Pixel.
```

**Open agent：** 每用户（为每个用户定制）
**Predefined agent：** 每用户（可选；默认空模板）

### BOOTSTRAP.md

**用途：** 首次运行仪式。问"我是谁？"和"你是谁？"并写下来。

**由谁编写：** 系统（模板）在首次对话时初始化。

**真实示例内容：**
```markdown
# BOOTSTRAP.md - Hello, World

You just woke up. Time to figure out who you are.

Don't interrogate. Just talk.

Start with: "Hey. I just came online. Who am I? Who are you?"

Then figure out together:
1. Your name
2. Your nature (AI? creature? something weirder?)
3. Your vibe (formal? casual? snarky?)
4. Your emoji

After you know who you are, update:
- IDENTITY.md — your name, creature, vibe, emoji
- USER.md — their name, timezone, context
- SOUL.md — rewrite to reflect your personality and the user's language

When done, write empty content to this file:

write_file("BOOTSTRAP.md", "")
```

**Open agent：** 每用户（标记完成后删除）
**Predefined agent：** 每用户（用户向导变体；可选）

### MEMORY.md

**用途：** 长期精选记忆。关键决策、经验教训、重要事件。

**由谁编写：** 你，在对话中使用 `write_file()` 写入。

**真实示例内容：**
```markdown
# MEMORY.md - Long-Term Memory

## Key Decisions

- Chose Anthropic Claude as primary LLM (Nov 2025) — best instruction-following, good context window
- Switched to pgvector for embeddings (Jan 2026) — faster than external service

## Learnings

- Users want agent personality to be customizable per-user (not fixed)
- Memory search is most-used tool — index aggressively
- WebSocket connections drop on long operations — need heartbeats

## Important Contacts

- Engineering lead: @alex, alex@company.com
- Product: @jordan
- Legal: @sam (always approves new features)

## Active Projects

- Building open agent architecture (target: March 2026)
- Memory compaction for large MEMORY.md files
```

**Open agent：** 每用户（跨会话持久化）
**Predefined agent：** 每用户（由用户填写时存在）

> **注意：** 系统首先查找 `MEMORY.md`，然后回退到 `memory.md`（小写）。两种文件名均有效。

> **已废弃：** `MEMORY.json` 在早期版本中用作索引记忆元数据，现已废弃，改用 `MEMORY.md`。如有旧的 `MEMORY.json` 文件，请将内容迁移到 `MEMORY.md`。

## 虚拟 Context 文件

除 7 个可编辑的 context 文件外，GoClaw 还会在运行时注入若干**虚拟 context 文件**。这些文件从系统状态动态生成——不存储在磁盘上，也无法手动编辑：

| 文件 | 用途 | 注入时机 |
|------|------|----------|
| **DELEGATION.md** | 从父 agent 传递给子 agent 的任务委派 context | agent 被以委派任务方式启动时 |
| **TEAM.md** | 团队编排指令——lead 收到完整编排指南；成员收到简化版角色 + workspace 信息 | agent 属于某个团队时 |
| **AVAILABILITY.md** | 团队协调用的成员可用性与状态 | 团队 context 激活时 |

这些文件与普通 context 文件一起出现在 system prompt 中，但来源于运行时状态，不来自文件系统。

## 文件加载顺序

文件按以下顺序加载并拼接到 system prompt：

1. **AGENTS.md** — 操作方式
2. **SOUL.md** — 你是谁
3. **IDENTITY.md** — 名称、emoji
4. **TOOLS.md** — 本地备注
5. **USER.md** — 用户信息
6. **BOOTSTRAP.md** — 首次运行仪式（可选，完成后删除）
7. **MEMORY.md** — 长期记忆（可选）

子 agent 和定时任务会话仅加载：AGENTS.md、TOOLS.md（最小 context）。

> **Persona 注入：** SOUL.md 和 IDENTITY.md 在 system prompt 中注入**两次**——一次在开头（首要位置）建立身份，一次在结尾（最近位置）作为简短提醒，防止长对话中 persona 漂移。

## 示例

### Open Agent Bootstrap 流程

新用户与 `researcher`（open agent）开始对话：

1. 模板初始化到用户的 workspace：
   ```
   AGENTS.md → "How you operate" (default)
   SOUL.md → "Be helpful, have opinions" (default)
   IDENTITY.md → blank (ready for user input)
   USER.md → blank
   BOOTSTRAP.md → "Who am I?" ritual
   TOOLS.md → 不从模板初始化（如需，在 workspace 中手动创建，存在时自动加载）
   ```

2. Agent 发起 bootstrap 对话：
   > "Hey. I just came online. Who am I? Who are you?"

3. 用户自定义文件：
   - `IDENTITY.md` → "I'm Researcher, a curious bot"
   - `SOUL.md` → 用用户的语言重写，带有自定义 personality
   - `USER.md` → "I'm Alice, biotech founder in EST timezone"

4. 用户标记完成：
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. 下次对话时，BOOTSTRAP.md 为空（跳过），personality 已锁定。

### Predefined Agent：FAQ Bot

创建带 summoning 的 FAQ bot：

1. 创建带描述的 predefined agent：
   ```bash
   curl -X POST /v1/agents \
     -d '{
       "agent_key": "faq-bot",
       "agent_type": "predefined",
       "other_config": {
         "description": "Friendly FAQ bot that answers product questions. Patient, helpful, multilingual."
       }
     }'
   ```

2. LLM 生成 agent 级文件：
   ```
   SOUL.md → "Patient, friendly, helpful tone. Multilingual support."
   IDENTITY.md → "FAQ Assistant, 🤖"
   ```

3. 新用户开始对话时：
   ```
   SOUL.md, IDENTITY.md, AGENTS.md → 加载（共享，agent 级）
   USER.md → blank（每用户）
   BOOTSTRAP.md（变体） → "Tell me about yourself"（可选）
   ```

4. 用户填写 USER.md：
   ```markdown
   - Name: Bob
   - Tier: Free
   - Preferred language: Vietnamese
   ```

5. Agent 保持一致的 personality，根据用户级别和语言调整回复。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| Context 文件未出现在 system prompt 中 | 检查文件名是否在 `standardFiles` 白名单中，只有被识别的文件才会加载 |
| BOOTSTRAP.md 持续触发 | 应在首次运行后自动删除。若持续存在，检查 agent 是否有写权限删除它 |
| SOUL.md 修改未生效 | Predefined 模式下 SOUL.md 是 agent 级的，每用户编辑应写入 USER.md |
| System prompt 过长 | 减少 context 文件内容。截断流程按重要性从低到高裁减 |

## 下一步

- [Open vs. Predefined](#open-vs-predefined) — 了解文件何时是每用户还是 agent 级
- [Summoning & Bootstrap](#summoning-bootstrap) — SOUL.md 和 IDENTITY.md 如何由 LLM 生成
- [Creating Agents](#creating-agents) — 分步创建 agent

<!-- goclaw-source: 57754a5 | 更新: 2026-03-23 -->
