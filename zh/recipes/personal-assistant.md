> 翻译自 [English version](/recipe-personal-assistant)

# 个人助理

> 在 Telegram 上搭建一个带记忆和自定义个性的单用户 AI 助理。

## 概览

本教程带你从零开始搭建个人助理：一个 gateway、一个 agent、一个 Telegram bot。完成后，你的助理将能跨会话记住事项，并以你赋予它的个性回应。

**所需条件：**
- GoClaw 二进制（参见[入门指南](../getting-started/)）
- 安装了 pgvector 的 PostgreSQL 数据库
- 来自 @BotFather 的 Telegram bot token
- 任意支持的 LLM provider 的 API key

## 第 1 步：运行设置向导

```bash
./goclaw onboard
```

交互式向导一次覆盖所有配置：

1. **Provider** — 选择你的 LLM provider（OpenRouter 推荐，可访问多种模型）
2. **Gateway 端口** — 默认 `18790`
3. **Channel** — 选择 `Telegram`，粘贴你的 bot token
4. **功能** — 选择 `Memory`（向量搜索）和 `Browser`（网页访问）
5. **数据库** — 粘贴你的 Postgres DSN

向导保存 `config.json`（无密钥）和 `.env.local`（仅密钥）。启动 gateway：

```bash
source .env.local && ./goclaw
```

## 第 2 步：了解默认配置

完成 onboarding 后，`config.json` 大致如下：

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.goclaw/workspace",
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tokens": 8192,
      "max_tool_iterations": 20,
      "memory": {
        "enabled": true,
        "embedding_provider": ""
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "reaction_level": "minimal"
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "tools": {
    "browser": {
      "enabled": true,
      "headless": true
    }
  }
}
```

`dm_policy: "pairing"` 表示新用户必须通过浏览器配对码才能让 bot 响应，可防止陌生人使用你的 bot。

## 第 3 步：配对你的 Telegram 账号

打开 `http://localhost:18790` 的 Web 仪表盘，进入配对页面，按照说明操作——向你的 Telegram bot 发送一个配对码，仪表盘确认链接后即可开始聊天。

也可以使用 `./goclaw agent chat` 直接在终端中聊天，无需配对。

## 第 4 步：自定义个性（SOUL.md）

首次聊天时，agent 会在你的用户上下文中生成一个 `SOUL.md` 文件。可在仪表盘中编辑：

进入**Agents → 你的 agent → Files 标签 → SOUL.md** 并内联编辑。例如：

```markdown
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
```

完成后点击**保存**。

<details>
<summary><strong>通过 API</strong></summary>

```bash
curl -X PUT http://localhost:18790/v1/agents/default/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: your-user-id" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
EOF
```

</details>

完整 SOUL.md 参考参见[编辑个性](/editing-personality)。

## 第 5 步：启用记忆

如果你在向导中选择了记忆功能，它现在已启用。Agent 使用 SQLite + pgvector 进行混合搜索。笔记通过 `memory_save` 存储，通过 `memory_search` 自动检索。

发送消息验证记忆是否工作："记住我更喜欢 Python 而不是 JavaScript。"然后在后续会话中问："我更喜欢哪种编程语言？" — agent 会从记忆中回忆。

也可在仪表盘中查看：进入**Agents → 你的 agent**，确认记忆配置显示为已启用。

## 可选：个性化你的 agent

在仪表盘**Agents → 你的 agent**下还可以配置几项额外设置：

- **Emoji：** 通过 agent 详情页的 emoji 选择器设置图标——显示在 agent 列表和聊天界面
- **技能学习：**（仅限预定义 agent）开启**技能学习**，让 agent 在完成复杂任务后将可复用的工作流捕获为技能。设置提示间隔以控制 agent 建议创建技能的频率。

## 常见问题

| 问题 | 解决方案 |
|---------|----------|
| Bot 在 Telegram 中不响应 | 检查 `dm_policy`。使用 `"pairing"` 时，必须先完成浏览器配对。设置 `"open"` 可跳过配对。 |
| 记忆不工作 | 确认配置中 `memory.enabled: true`，且 embedding provider 有 API key。检查 gateway 日志中的 embedding 错误。 |
| "No provider configured" 错误 | 确保 API key 环境变量已设置。在 `./goclaw` 之前运行 `source .env.local`。 |
| Bot 响应所有人 | 在 `channels.telegram` 中设置 `dm_policy: "allowlist"` 和 `allow_from: ["your_username"]`。 |

## 下一步

- [编辑个性](/editing-personality) — 自定义 SOUL.md、IDENTITY.md、USER.md
- [Telegram Channel](/channel-telegram) — 完整 Telegram 配置参考
- [团队聊天机器人](/recipe-team-chatbot) — 为不同任务添加专家 agent
- [多 Channel 设置](/recipe-multi-channel) — 同时在 Discord 和 WebSocket 上使用同一 agent

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
