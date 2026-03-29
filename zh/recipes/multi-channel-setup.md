> 翻译自 [English version](/recipe-multi-channel)

# 多 Channel 设置

> 同时将同一 agent 部署在 Telegram、Discord 和 WebSocket 上。

## 概览

GoClaw 从一个 gateway 进程运行多个 channel。一个 agent 可以同时接收来自 Telegram、Discord 和直接 WebSocket 客户端的消息——每个 channel 有自己的会话范围，所以对话按 channel 和用户保持隔离。

**所需条件：**
- 已运行的 gateway，至少创建了一个 agent
- 访问 `http://localhost:18790` 的 Web 仪表盘
- 每个消息平台的 bot token

## 第 1 步：获取 token

每个消息平台需要一个 bot token：

**Telegram：** 联系 [@BotFather](https://t.me/BotFather) → `/newbot` → 复制 token
**Discord：** 进入 [discord.com/developers](https://discord.com/developers/applications) → New Application → Bot → Add Bot → 复制 token。在 Privileged Gateway Intents 下启用 **Message Content Intent**。

WebSocket 无需外部 token——客户端使用你的 gateway token 认证。

## 第 2 步：创建 channel 实例

打开 Web 仪表盘，进入 **Channels → Create Instance**，每个平台创建一个实例：

**Telegram：**
- **Channel 类型：** Telegram
- **名称：** `main-telegram`
- **Agent：** 选择你的 agent
- **Credentials：** 粘贴来自 @BotFather 的 bot token
- **Config：** 将 `dm_policy` 设置为 `pairing`（推荐）或 `open`

点击**保存**。

**Discord：**
- **Channel 类型：** Discord
- **名称：** `main-discord`
- **Agent：** 选择同一 agent
- **Credentials：** 粘贴 Discord bot token
- **Config：** 将 `dm_policy` 设置为 `open`，`require_mention` 设置为 `true`

点击**保存**。

两个 channel 立即激活——无需重启 gateway。WebSocket 内置于 gateway，无需创建实例。

启动后应看到如下日志：
```
channel=telegram status=connected bot=@YourBotName
channel=discord  status=connected guild_count=2
gateway          status=listening addr=0.0.0.0:18790
```

<details>
<summary><strong>通过 config.json</strong></summary>

将所有 channel 配置添加到 `config.json`。密钥（token）放入 `.env.local`——不放在配置文件中。

`config.json`：
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true,
      "reaction_level": "minimal"
    },
    "discord": {
      "enabled": true,
      "token": "",
      "dm_policy": "open",
      "group_policy": "open",
      "require_mention": true,
      "history_limit": 50
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "token": ""
  }
}
```

`.env.local`（仅密钥——永远不要提交此文件）：
```bash
export GOCLAW_TELEGRAM_TOKEN="123456:ABCDEFGHIJKLMNOPQRSTUVWxyz"
export GOCLAW_DISCORD_TOKEN="your-discord-bot-token"
export GOCLAW_GATEWAY_TOKEN="your-gateway-token"
export GOCLAW_POSTGRES_DSN="postgres://user:pass@localhost:5432/goclaw"
```

当配置中 `token` 字段为空时，GoClaw 从环境变量读取 channel token。

添加绑定将消息路由到你的 agent：

```json
{
  "bindings": [
    {
      "agentId": "my-assistant",
      "match": { "channel": "telegram" }
    },
    {
      "agentId": "my-assistant",
      "match": { "channel": "discord" }
    }
  ]
}
```

启动 gateway：

```bash
source .env.local && ./goclaw
```

</details>

## 第 3 步：连接 WebSocket 客户端

WebSocket 内置于 gateway——无需额外设置。连接并认证：

```javascript
const ws = new WebSocket('ws://localhost:18790/ws');

// 第一帧必须是 connect
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      token: 'your-gateway-token',
      user_id: 'web-user-alice'
    }
  }));
};

// 发送聊天消息
function chat(message) {
  ws.send(JSON.stringify({
    type: 'req',
    id: String(Date.now()),
    method: 'chat',
    params: {
      agent: 'my-assistant',
      message: message
    }
  }));
}

// 监听响应和流式 chunk
ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  if (frame.type === 'event' && frame.event === 'chunk') {
    process.stdout.write(frame.payload.text);
  }
  if (frame.type === 'res' && frame.method === 'chat') {
    console.log('\n[done]');
  }
};
```

完整协议参考参见 [WebSocket Channel](/channel-websocket)。

## 第 4 步：验证跨 channel 隔离

会话默认按 channel 和用户隔离（`dm_scope: "per-channel-peer"`）。这意味着：
- Telegram 上的 Alice 和 Discord 上的 Alice 有**独立的**对话历史
- Agent 将她们视为不同的用户

在仪表盘中验证隔离：进入 **Sessions** 并按 agent 过滤——你应该看到每个 channel 的独立会话。

如果你希望同一用户跨 channel 共享一个会话，在 `config.json` 中设置 `dm_scope: "per-peer"`：

```json
{
  "sessions": {
    "dm_scope": "per-peer"
  }
}
```

当相同的 `user_id` 从任何 channel 连接时，这会共享对话历史。

## Telegram 消息处理

Telegram 有 4096 字符消息限制。GoClaw 自动处理长响应：

- 长消息在自然边界（段落、代码块）处拆分为多部分
- 首先尝试 HTML 格式以获得富文本输出
- 如果 HTML 解析失败，消息回退到纯文本
- 无需配置——完全自动

## Channel 对比

| 特性 | Telegram | Discord | WebSocket |
|---------|----------|---------|-----------|
| 设置 | @BotFather token | Developer Portal token | 无（使用 gateway token）|
| 默认 DM policy | `pairing` | `open` | 通过 gateway token 认证 |
| 群组/服务器支持 | 是 | 是 | 不适用 |
| 流式传输 | 可选（`dm_stream`）| 通过消息编辑 | 原生（chunk 事件）|
| 群组中需要 @ | 是（默认）| 是（默认）| 不适用 |
| 自定义客户端 | 否 | 否 | 是 |

## 按 channel 限制工具

可以为每个 channel 设置不同的工具集。进入**Agents → 你的 agent → Config 标签**，配置按 channel 的工具策略。

<details>
<summary><strong>通过 config.json</strong></summary>

```json
{
  "agents": {
    "list": {
      "my-assistant": {
        "tools": {
          "byProvider": {
            "telegram": { "deny": ["exec", "write_file"] },
            "discord":  { "deny": ["exec", "write_file"] }
          }
        }
      }
    }
  }
}
```

</details>

WebSocket 客户端（通常是开发者或内部工具）可以保留完整的工具访问权限。

## 文件附件

当 agent 使用 `write_file` 生成文件时，它会自动作为 channel 附件发送。适用于 Telegram、Discord 和其他支持的 channel——无需额外配置。

## 常见问题

| 问题 | 解决方案 |
|---------|----------|
| Telegram bot 不响应 | 检查 `dm_policy`。默认是 `"pairing"`——先完成浏览器配对，或设置 `"open"` 用于测试。 |
| Discord bot 在服务器中离线 | 确认 bot 已通过 OAuth2 URL 生成器（含 `bot` scope 和 `Send Messages` 权限）添加到服务器。 |
| WebSocket 连接被拒绝 | 确保 connect 帧中的 `token` 与 `GOCLAW_GATEWAY_TOKEN` 匹配。空 token 只获得只读角色。 |
| 消息路由到错误的 agent | 在仪表盘 → Channels 中检查 channel 实例的 agent 分配。使用 config.json 时，第一个匹配的绑定优先。 |
| 同一用户在 Telegram 和 Discord 上获得不同会话 | 默认 `dm_scope: "per-channel-peer"` 的预期行为。设置 `"per-peer"` 以跨 channel 共享会话。 |

## 下一步

- [Telegram Channel](/channel-telegram) — 完整 Telegram 配置参考，包括群组、话题和 STT
- [Discord Channel](/channel-discord) — Discord gateway intents 和流式设置
- [WebSocket Channel](/channel-websocket) — 完整 RPC 协议参考
- [个人助理](/recipe-personal-assistant) — 单 channel 起点

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
