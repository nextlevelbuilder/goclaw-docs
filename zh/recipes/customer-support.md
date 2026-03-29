> 翻译自 [English version](/recipe-customer-support)

# 客户支持

> 一个为所有用户提供一致服务的预定义 agent，支持专家升级路径。

## 概览

本教程搭建一个具有固定个性（对所有用户相同）、按用户个性化档案和专家升级路径的客服 agent。与个人助理不同，该 agent 是**预定义**的——其 SOUL.md 和 IDENTITY.md 由所有用户共享，确保一致的品牌声音。

**所需条件：**
- 已运行的 gateway（`./goclaw onboard`）
- 访问 `http://localhost:18790` 的 Web 仪表盘
- 已配置至少一个 LLM provider

## 第 1 步：创建支持 agent

打开 Web 仪表盘，进入 **Agents → Create Agent**：

- **Key：** `support`
- **显示名称：** Support Assistant
- **类型：** Predefined
- **Provider / 模型：** 选择你的 provider 和模型
- **描述：** "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user's language."

点击**保存**。`description` 字段触发**召唤**——gateway 使用 LLM 从你的描述自动生成 SOUL.md 和 IDENTITY.md。

等待 agent 状态从 `summoning` 转为 `active`。可在 Agents 列表页面观察。

<details>
<summary><strong>通过 API</strong></summary>

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "support",
    "display_name": "Support Assistant",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user'\''s language."
    }
  }'
```

查询状态：

```bash
curl http://localhost:18790/v1/agents/support \
  -H "Authorization: Bearer YOUR_TOKEN"
```

</details>

## 第 2 步：手动编写 SOUL.md（可选）

如果你希望自己编写个性而不依赖召唤，进入**仪表盘 → Agents → support → Files 标签 → SOUL.md** 并内联编辑：

```markdown
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
```

完成后点击**保存**。

<details>
<summary><strong>通过 API</strong></summary>

```bash
curl -X PUT http://localhost:18790/v1/agents/support/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
EOF
```

</details>

## 第 3 步：添加技术升级专家

创建第二个预定义 agent 处理复杂问题。进入 **Agents → Create Agent**：

- **Key：** `tech-specialist`
- **显示名称：** Technical Specialist
- **类型：** Predefined
- **描述：** "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."

点击**保存**并等待召唤完成。

然后设置升级链接：进入 **Agents → support → Links 标签 → Add Link**：
- **目标 agent：** `tech-specialist`
- **方向：** Outbound
- **描述：** Escalate complex technical issues
- **最大并发：** 3

点击**保存**。支持 agent 现在可以将复杂问题委托给专家。

<details>
<summary><strong>通过 API</strong></summary>

```bash
# 创建专家
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "tech-specialist",
    "display_name": "Technical Specialist",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."
    }
  }'

# 创建委托链接
curl -X POST http://localhost:18790/v1/agents/support/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAgent": "support",
    "targetAgent": "tech-specialist",
    "direction": "outbound",
    "description": "Escalate complex technical issues",
    "maxConcurrent": 3
  }'
```

</details>

## 第 4 步：配置按用户档案

因为 `support` 是预定义的，每个用户在首次聊天时会生成自己的 `USER.md`。可以预先填充档案，为 agent 提供关于用户的上下文。

进入**Agents → support → Instances 标签 → 选择用户 → Files → USER.md** 并编辑：

```markdown
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
```

<details>
<summary><strong>通过 API</strong></summary>

```bash
curl -X PUT http://localhost:18790/v1/agents/support/users/alice123/files/USER.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
EOF
```

</details>

## 第 5 步：限制支持场景的工具

支持 agent 很少需要文件系统或 shell 访问。进入**Agents → support → Config 标签**，配置工具权限：

- **允许的工具：** `web_fetch`、`web_search`、`memory_search`、`memory_save`、`delegate`
- 拒绝其他所有工具

这在保持 agent 功能正常的同时缩小了攻击面。

<details>
<summary><strong>通过 config.json</strong></summary>

```json
{
  "agents": {
    "list": {
      "support": {
        "tools": {
          "allow": ["web_fetch", "web_search", "memory_search", "memory_save", "delegate"]
        }
      }
    }
  }
}
```

配置更改后重启 gateway。

</details>

## 第 6 步：连接 channel

在仪表盘中进入 **Channels → Create Instance**：
- **Channel 类型：** Telegram（或 Discord、Slack、Zalo OA 等）
- **Agent：** 选择 `support`
- **Credentials：** 粘贴你的 bot token
- **Config：** 将 `dm_policy` 设置为 `open`，让所有客户都能给 bot 发消息

点击**保存**。Channel 立即激活。

> **提示：** 对于面向客户的 bot，设置 `dm_policy: "open"` 可使用户无需先通过浏览器配对。

## 文件附件

当支持 agent 使用 `write_file` 生成文档（如故障排除报告或账户摘要）时，文件会自动作为 channel 附件发送给用户。无需额外配置——适用于所有 channel 类型。

## 上下文隔离原理

```
support（预定义）
├── SOUL.md         ← 共享：所有用户相同的个性
├── IDENTITY.md     ← 共享：所有用户相同的"我是谁"
├── AGENTS.md       ← 共享：操作指令
│
├── 用户：alice123
│   ├── USER.md     ← 按用户：Alice 的档案、等级、历史
│   └── BOOTSTRAP.md ← 首次运行 onboarding（运行后自动清空）
│
└── 用户：bob456
    ├── USER.md     ← 按用户：Bob 的档案
    └── BOOTSTRAP.md
```

## 常见问题

| 问题 | 解决方案 |
|---------|----------|
| Agent 在不同用户间个性不同 | 如果 agent 是 `open`，每个用户会塑造自己的个性。切换到 `predefined` 使用共享 SOUL.md。 |
| USER.md 未生成 | 首次聊天触发生成。如果通过 Instances 标签预填充，确保选择了正确的用户。 |
| 召唤失败，无 SOUL.md | 检查 gateway 日志中召唤期间的 LLM 错误。如步骤 2 所示，通过 Files 标签手动编写 SOUL.md。 |
| 支持 agent 过于激进地升级 | 编辑 SOUL.md 添加标准："只在用户报告 API 错误码或集成失败时才委托给 tech-specialist。" |
| 专家不响应 | 检查专家状态为 `active`，以及委托链接是否存在（Agent → Links 标签）。 |

## 下一步

- [Open vs. Predefined](/open-vs-predefined) — 深入了解上下文隔离
- [召唤与 Bootstrap](/summoning-bootstrap) — 个性如何自动生成
- [团队聊天机器人](/recipe-team-chatbot) — 通过团队协调多个专家
- [上下文文件](/context-files) — SOUL.md、USER.md 等文件的完整参考

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
