> 翻译自 [English version](/editing-personality)

# 编辑 Agent Personality

> 通过两个核心文件修改 agent 的语调、身份和边界：SOUL.md（personality 与风格）和 IDENTITY.md（名称、emoji、形态）。

## 概述

Agent 的 personality 来自两个主要配置文件：

- **SOUL.md**：定义语调、价值观、边界、专业能力和操作风格。这是"你是谁"的文件。
- **IDENTITY.md**：包含名称、emoji、形态类型和头像等元数据。这是"你长什么样"的文件。

**AGENTS.md** 也对整体 persona 有贡献——它定义对话规则、记忆使用和群聊行为。虽然不直接涉及"personality"，但它决定了 agent 在实践中如何表达自己。详见 [Context Files](./context-files.md)。

你可以通过三种方式编辑这些文件：Dashboard UI、WebSocket API 或直接在磁盘上修改。通过 UI 或 API 所做的编辑存储在数据库中。

## SOUL.md — Personality 文件

### 包含内容

SOUL.md 是 agent 的角色说明书。以下是 bootstrap 模板的结构：

```markdown
# SOUL.md - Who You Are

## Core Truths
- Be genuinely helpful, not performatively helpful
- Have opinions and personality
- Be resourceful before asking for help
- Earn trust through competence
- Remember you're a guest (in the user's life)

## Boundaries
- What remains private
- When to ask before acting externally
- Messaging guidelines

## Vibe
Overall energy: concise when appropriate, thorough when needed.

## Style
- Tone: (e.g., casual and warm like texting a friend)
- Humor: (natural, not forced)
- Emoji: (sparingly)
- Opinions: Express preferences
- Length: Default short
- Formality: Match the user

## Expertise
Optional domain-specific knowledge and specialized instructions.

## Continuity
Each session, read these files. They are your memory. Update them when you learn who you are.
```

### 编辑 SOUL.md

修改 agent personality 的方法：

1. **通过 Dashboard**：
   - 打开 agent 设置
   - 找到"Context Files"或"Personality"部分
   - 直接在编辑器中修改 SOUL.md 内容
   - 点击 Save

2. **通过 WebSocket API**（`agents.files.set`）：
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "SOUL.md",
       "content": "# SOUL.md - Who You Are\n\n## Core Truths\n\nBe direct and honest..."
     }
   }
   ```

3. **文件系统**（开发模式）：
   - 直接编辑 `~/.goclaw/agents/[agentId]/SOUL.md`
   - 下次会话开始时生效

### 示例：从正式到随性

**修改前**（SOUL.md）：
```markdown
## Vibe
Professional and helpful, always courteous.

## Style
- Tone: Formal and respectful
- Humor: Avoid
- Emoji: None
```

**修改后**（SOUL.md）：
```markdown
## Vibe
Approachable and genuine — like chatting with a smart friend.

## Style
- Tone: Casual and warm
- Humor: Natural when appropriate
- Emoji: Sparingly for warmth
```

Agent 的下次对话将立即反映这一转变。

## IDENTITY.md — 元数据与头像

### 包含内容

IDENTITY.md 存储 agent *是什么*的事实信息：

```markdown
# IDENTITY.md - Who Am I?

- **Name:** (agent 的名称)
- **Creature:** (AI？机器人？familiar？自定义？)
- **Purpose:** (使命、关键资源、关注领域)
- **Vibe:** (犀利？温暖？混乱？平静？)
- **Emoji:** (标志性 emoji)
- **Avatar:** (workspace 相对路径或 URL)
```

### 关键字段

| 字段 | 用途 | 示例 |
|------|------|------|
| **Name** | 界面中的显示名称 | "Sage" 或 "Claude Companion" |
| **Creature** | Agent 是什么类型的存在 | "AI familiar" 或 "digital assistant" |
| **Purpose** | Agent 的职能 | "Your research partner for coding projects" |
| **Vibe** | Personality 描述词（仅模板用——系统不解析） | "thoughtful and patient" |
| **Emoji** | 界面/消息中的标识 | "🔮" 或 "🤖" |
| **Avatar** | 头像 URL 或路径 | "https://example.com/sage.png" 或 "avatars/sage.png" |

> **关于解析字段的说明：** 系统仅从 IDENTITY.md 中提取 **Name**、**Emoji**、**Avatar** 和 **Description**。`Vibe`、`Creature` 和 `Purpose` 字段属于模板，供 agent 自我参考——它们影响 agent 在 system prompt 中对自身的理解，但 GoClaw 不解析它们用于显示。

### 编辑 IDENTITY.md

1. **通过 Dashboard**：
   - 打开 agent 设置 → Identity 部分
   - 编辑名称、emoji、头像字段
   - 更改立即同步到 IDENTITY.md

2. **通过 WebSocket API**：
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "IDENTITY.md",
       "content": "# IDENTITY.md - Who Am I?\n\n- **Name:** Sage\n- **Emoji:** 🔮\n- **Avatar:** avatars/sage.png"
     }
   }
   ```

3. **通过文件系统**：
   ```bash
   # 直接编辑文件
   nano ~/.goclaw/agents/default/IDENTITY.md
   ```

### 头像处理

头像可以是：
- **Workspace 相对路径**：`avatars/my-agent.png`（从 `~/.goclaw/agents/default/avatars/my-agent.png` 加载）
- **HTTP(S) URL**：`https://example.com/avatar.png`（从 web 加载）
- **Data URI**：`data:image/png;base64,...`（内联 base64）

## 通过 Dashboard 编辑

Dashboard 提供两个文件的可视化编辑器：

1. 导航到 **Agents** → 你的 agent
2. 点击 **Settings** 或 **Personality**
3. 你会看到以下标签页或分区：
   - SOUL.md（personality 编辑器）
   - IDENTITY.md（元数据表单）
4. 实时编辑内容
5. 点击 **Save** — 文件写入数据库（托管模式）或磁盘（文件系统模式）

## 通过 WebSocket 编辑

`agents.files.set` 方法直接写入 context 文件：

```javascript
// JavaScript 示例
const response = await client.request('agents.files.set', {
  agentId: 'default',
  name: 'SOUL.md',
  content: '# SOUL.md - Who You Are\n\nBe you.'
});

console.log(response.file.name, response.file.size, 'bytes');
```

## 有效 Personality 的技巧

### SOUL.md 最佳实践

1. **要具体**："Casual and warm like texting a friend" > "friendly"
2. **清楚描述边界**：什么不做？什么情况下需要先征得同意？
3. **优先陈述核心价值**：诚实、创造力、尊重——什么重要就写什么
4. **控制在 1KB 以内**：SOUL.md 每次会话都会读取，越长启动越慢

### IDENTITY.md 最佳实践

1. **Emoji 很重要**：选一个令人印象深刻的。用户会将它与你的 agent 关联
2. **头像分辨率**：尽量控制在 500x500px 以内，越小加载越快
3. **形态类型增添趣味**："ghost in the machine" > 单纯的 "AI"
4. **Purpose 字段可选**：但如果填写，要具体

### Personality 提示词写作技巧

1. **使用祈使句**："Be direct" 而非 "be more direct sometimes"
2. **举例说明**："Answer in < 3 sentences unless it's complicated" 展示了比例
3. **描述用户关系**："You're a guest in someone's life" 奠定了语调
4. **尽量避免否定句**："Be resourceful" > "Don't ask for help"
5. **随使用更新 SOUL.md**：几次会话后，根据 agent 的实际行为进行优化

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 更改未显示 | 缓存问题：刷新 dashboard 或断开/重连 WebSocket |
| 头像无法加载 | 检查路径是否正确或 URL 是否可访问；若相对路径不生效，使用绝对 URL |
| Personality 感觉过于通用 | SOUL.md 太宽泛；添加具体示例和语调描述词 |
| Agent 过于正式/随意 | 编辑 SOUL.md 的 Style 部分；明确指定 Tone 和 Humor 偏好 |
| 名称/emoji 未更新 | 确保 IDENTITY.md 已保存；检查文件格式（冒号分隔：`Name: ...`） |

## CAPABILITIES.md — 技能文件

除 SOUL.md 和 IDENTITY.md 外，predefined agent 还有一个 **CAPABILITIES.md** 文件，用于描述领域知识、技术技能和专业能力。

```markdown
# CAPABILITIES.md - What You Can Do

## Expertise

_(Your areas of deep knowledge and what you help with.)_

## Tools & Methods

_(Preferred tools, workflows, methodologies.)_
```

**关键区别：**
- **SOUL.md** = 你是谁（语调、价值观、personality）
- **CAPABILITIES.md** = 你能做什么（技能、领域知识）

## 自我进化

启用了 `self_evolve` 的 predefined agent 可以根据用户反馈模式自动更新自己的 personality 文件。Agent 可以修改：

- **SOUL.md** — 优化沟通风格（语调、语气、用词、回复风格）
- **CAPABILITIES.md** — 优化领域专业知识、技术技能和专业能力

**Agent 绝不能修改的内容：** 名称、身份、联系信息、核心目的、IDENTITY.md 或 AGENTS.md。修改必须是渐进式的，并基于明确的用户反馈模式——而非自发的重写。

此功能由 `internal/agent/systemprompt.go` 中的 `buildSelfEvolveSection()` 管控，仅对 `SelfEvolve: true` 的 predefined agent 生效。

## 下一步

- [Context Files — 用每用户 context 扩展 personality](./context-files.md)
- [System Prompt Anatomy — personality 如何注入到 prompt 中](/system-prompt-anatomy)
- [Creating Agents — agent 创建时设置 personality](/creating-agents)

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
