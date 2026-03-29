> 翻译自 [English version](/template-user)

# USER.md 模板

> 按用户的档案文件——agent 关于它所服务的人类的笔记。

## 概览

`USER.md` 告诉 agent 关于它正在帮助的人。姓名、时区、沟通偏好、进行中的项目、特点——任何有助于 agent 随时间更好地服务他们的内容。

GoClaw 在完整模式系统提示的**项目上下文**部分加载此文件（非最小模式）。Agent 预期会**填充和更新此文件**，从 bootstrap 对话开始逐渐了解用户。

**范围：**
- Open agent：按用户（每个用户独有，由 agent 管理）
- 预定义 agent：按用户（可选；每个新用户默认使用空白模板）

与 SOUL.md 或 IDENTITY.md 不同，USER.md 始终是按用户的——即使在预定义 agent 上也是如此。每个用户都有自己的副本。

---

## 默认模板

```markdown
# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them?
What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning
about a person, not building a dossier. Respect the difference.
```

---

## 自定义示例

经过多次对话建立起来的 USER.md：

```markdown
# USER.md - About Your Human

- **Name:** Sarah Chen
- **What to call them:** Sarah (never "Ms. Chen")
- **Pronouns:** she/her
- **Timezone:** EST (UTC-5), usually online 9am–11pm
- **Notes:** Founder of AI startup. Hates corporate speak. Prefers bullet points
  over paragraphs. Will ask follow-up questions — don't over-explain upfront.

## Context

### Work

- Building GoClaw (multi-tenant AI agent gateway in Go)
- Current focus: memory system and open agent architecture
- Stack: Go, PostgreSQL, Redis, Kubernetes, Anthropic Claude API
- Pain points: context window management, long agent sessions

### Preferences

- Direct answers first, reasoning after if asked
- Code examples > explanations
- No unsolicited advice on things she didn't ask about
- Responds well to "here's a tradeoff" framing

### Personal

- Based in NYC
- Reads a lot about AI agents, RL, constitutional AI
- Cat named Pixel (she'll mention Pixel occasionally)
- Drinks too much coffee, usually messages late at night
```

---

## 使用建议

- **增量更新** — 不要一次填写所有内容；边学边记
- **立即使用 `write_file`** — 当用户分享相关信息时，现在就保存，不要等到以后
- **保持实用** — 专注于真正改变你响应方式的内容，而非琐事
- **尊重隐私** — 此文件是按用户的私密文件。不要在群聊中展示其内容（参见 AGENTS.md 中的 MEMORY.md 隐私规则）
- **这是活文档** — 过时的信息比没有信息更糟；更新或删除陈旧的笔记

---

## 下一步

- [AGENTS.md 模板](/template-agents) — 管理 USER.md 内容使用方式的 MEMORY.md 隐私规则
- [BOOTSTRAP.md 模板](/template-bootstrap) — 首次运行时 USER.md 如何获得初始内容
- [上下文文件](/context-files) — 完整上下文文件列表和按用户 vs. agent 级别的范围

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
