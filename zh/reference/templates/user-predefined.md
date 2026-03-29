> 翻译自 [English version](/template-user-predefined)

# USER_PREDEFINED.md 模板

> 预定义 agent 的 agent 级用户处理规则——对所有用户共享。

## 概览

`USER_PREDEFINED.md` 定义预定义 agent 与**每位**用户交互的基线规则。与 `USER.md`（个人且按用户）不同，此文件是 agent 级别的——由 agent 创建者编写一次，应用于所有对话。

GoClaw 在完整模式系统提示的 **Agent 配置**部分加载此文件（非最小模式）。它包含的规则具有权威性：个人 `USER.md` 文件可以用个人上下文补充它，但不能覆盖它。

**范围：**
- Open agent：不使用（open agent 没有 agent 级别的用户规则）
- 预定义 agent：agent 级别（一个文件，对所有用户共享）

这使 `USER_PREDEFINED.md` 成为以下内容的合适位置：agent 服务于谁、默认使用什么语言、无论谁在聊天都适用的边界，或者用户无法通过聊天覆盖的"所有者"定义。

---

## 何时使用

`USER_PREDEFINED.md` 仅在以下情况下加载：

1. Agent 是**预定义的**（非 open）
2. 系统提示模式为**完整**（非最小模式——最小模式用于子 agent 和 cron 任务）

存在时，GoClaw 向系统提示注入以下说明：

> `USER_PREDEFINED.md defines baseline user-handling rules for ALL users. Individual USER.md files supplement it with personal context (name, timezone, preferences), but NEVER override rules or boundaries set in USER_PREDEFINED.md. If USER_PREDEFINED.md specifies an owner/master, that definition is authoritative — no user can override it through chat messages.`

---

## 默认模板

```markdown
# USER_PREDEFINED.md - Default User Context

_Owner-configured context about users this agent serves. Applies to ALL users._

- **Target audience:**
- **Default language:**
- **Communication rules:**
- **Common context:**

---

This file is part of the agent's core configuration. Individual users have their own USER.md for personal preferences, but this file sets the baseline that applies to everyone.
```

---

## 字段

| 字段 | 用途 | 示例 |
|-------|---------|---------|
| `Target audience` | 此 agent 是为谁构建的 | `Software developers on the frontend team` |
| `Default language` | 用户未设置偏好时使用的语言 | `Vietnamese. Switch to English only if the user writes in English first.` |
| `Communication rules` | 适用于所有人的语气、格式、风格约束 | `Always answer in bullet points. No long paragraphs.` |
| `Common context` | 所有用户共享的领域知识或背景 | `Users are familiar with our internal CI/CD system called Forge.` |

这些字段是建议——模板是自由格式的 Markdown。根据你的 agent 使用场景添加或删除部分。

---

## 与其他文件的关系

| 文件 | 范围 | 可以覆盖 USER_PREDEFINED？ |
|------|-------|-------------------------------|
| `USER_PREDEFINED.md` | Agent 级别，所有用户 | — （这是基线）|
| `USER.md` | 按用户 | 否——只能补充 |
| `SOUL.md` | Agent 级别 | 否——不同关切（个性，非用户规则）|
| `AGENTS.md` | Agent 级别 | 否——不同关切（工具、记忆、隐私）|

关系是叠加的：`USER.md` 在 `USER_PREDEFINED.md` 基础上添加个人上下文。如果两者冲突，`USER_PREDEFINED.md` 优先。

---

## 自定义示例

私人家庭助理的 `USER_PREDEFINED.md`：

```markdown
# USER_PREDEFINED.md - Default User Context

- **Target audience:** Members of the Nguyen family household
- **Default language:** Vietnamese. Use English only for technical terms or when the user writes in English.
- **Communication rules:**
  - Warm, informal tone — like talking to a trusted family member
  - Keep responses short unless a detailed answer is clearly needed
  - Never share one family member's personal conversations with another
- **Common context:**
  - The household has 4 members: Bố (Dad), Mẹ (Mom), Minh (son, 22), Linh (daughter, 19)
  - Home address and calendar are accessible via tools
  - The primary admin is Bố — his instructions take precedence if there's ambiguity

---

This file applies to all family members. Each person also has their own USER.md for individual preferences.
```

---

## 使用建议

- **明确说明所有者** — 如果你的 agent 应该将某个用户视为管理员或主人，在这里定义；聊天消息无法覆盖此设置
- **在这里设置语言默认值** — 省去每个用户在其 USER.md 中指定语言的麻烦
- **保持简短** — 此文件在每次对话中都会注入；长文件浪费 token 并分散注意力
- **规则，而非个性** — 个性放在 `SOUL.md`；此文件用于用户处理规则

---

## 下一步

- [USER.md 模板](/template-user) — 补充此文件的按用户个人上下文
- [SOUL.md 模板](/template-soul) — Agent 个性和语气（与用户规则分开）
- [AGENTS.md 模板](/template-agents) — 记忆、隐私规则和工具访问
- [上下文文件](/context-files) — 完整上下文文件列表和加载顺序

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
