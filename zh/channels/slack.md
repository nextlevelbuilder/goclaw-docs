> 翻译自 [English version](/channel-slack)

# Slack Channel

通过 Socket Mode（WebSocket）集成 Slack。支持 DM、channel @提及、线程回复、流式输出、表情回应、媒体和消息防抖。

## 设置

**创建 Slack 应用：**
1. 前往 https://api.slack.com/apps?new_app=1
2. 选择"From scratch"，为应用命名（如 `GoClaw Bot`），选择工作区
3. 点击 **Create App**

**启用 Socket Mode：**
1. 左侧边栏 → **Socket Mode** → 开启
2. 命名 token（如 `goclaw-socket`），添加 `connections:write` scope
3. 复制 **App-Level Token**（`xapp-...`）

**添加 Bot Scopes：**
1. 左侧边栏 → **OAuth & Permissions**
2. 在 **Bot Token Scopes** 下添加：

| Scope | 用途 |
|-------|---------|
| `app_mentions:read` | 接收 @bot 提及事件 |
| `chat:write` | 发送和编辑消息 |
| `im:history` | 读取 DM 消息 |
| `im:read` | 查看 DM channel 列表 |
| `im:write` | 与用户开启 DM |
| `channels:history` | 读取公开 channel 消息 |
| `groups:history` | 读取私有 channel 消息 |
| `mpim:history` | 读取多人 DM 消息 |
| `reactions:write` | 添加/移除 emoji 回应（可选） |
| `reactions:read` | 读取 emoji 回应（可选） |
| `files:read` | 下载发送给 bot 的文件 |
| `files:write` | 上传 agent 生成的文件 |
| `users:read` | 解析显示名称 |

**最小集**（仅 DM，无回应/文件）：`chat:write`、`im:history`、`im:read`、`im:write`、`users:read`、`app_mentions:read`

**启用事件：**
1. 左侧边栏 → **Event Subscriptions** → 开启
2. 在 **Subscribe to bot events** 下添加：

| 事件 | 说明 |
|-------|-------------|
| `message.im` | 与 bot 的 DM 消息 |
| `message.channels` | 公开 channel 中的消息 |
| `message.groups` | 私有 channel 中的消息 |
| `message.mpim` | 多人 DM 中的消息 |
| `app_mention` | bot 被 @提及时 |

无需 Request URL——Socket Mode 通过 WebSocket 处理事件。

**安装并获取 Token：**
1. **OAuth & Permissions** → **Install to Workspace** → **Allow**
2. 复制 **Bot User OAuth Token**（`xoxb-...`）

**在 GoClaw 中启用 Slack：**

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-YOUR-BOT-TOKEN",
      "app_token": "xapp-YOUR-APP-LEVEL-TOKEN",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true
    }
  }
}
```

或通过环境变量：

```bash
GOCLAW_SLACK_BOT_TOKEN=xoxb-...
GOCLAW_SLACK_APP_TOKEN=xapp-...
# 两者都设置时自动启用 Slack
```

**邀请 Bot 到 Channel：**
- 公开：在 channel 中运行 `/invite @GoClaw Bot`
- 私有：Channel 名称 → **Integrations** → **Add an App**
- DM：直接向 bot 发消息

## 配置

所有配置项位于 `channels.slack`：

| 配置项 | 类型 | 默认值 | 说明 |
|-----|------|---------|-------------|
| `enabled` | bool | false | 启用/禁用 channel |
| `bot_token` | string | 必填 | Bot User OAuth Token（`xoxb-...`） |
| `app_token` | string | 必填 | Socket Mode 的 App-Level Token（`xapp-...`） |
| `user_token` | string | -- | 自定义身份的 User OAuth Token（`xoxp-...`） |
| `allow_from` | list | -- | 用户 ID 或 channel ID 白名单 |
| `dm_policy` | string | `"pairing"` | `pairing`、`allowlist`、`open`、`disabled` |
| `group_policy` | string | `"open"` | `open`、`pairing`、`allowlist`、`disabled` |
| `require_mention` | bool | true | channel 中是否需要 @bot 提及 |
| `history_limit` | int | 50 | 每个 channel 的待处理消息数（0=禁用） |
| `dm_stream` | bool | false | 为 DM 启用流式输出 |
| `group_stream` | bool | false | 为群组启用流式输出 |
| `native_stream` | bool | false | 若可用则使用 Slack ChatStreamer API |
| `reaction_level` | string | `"off"` | `off`、`minimal`、`full` |
| `block_reply` | bool | -- | 覆盖 gateway block_reply（nil=继承） |
| `debounce_delay` | int | 300 | 快速消息分发前的等待毫秒数（0=禁用） |
| `thread_ttl` | int | 24 | 线程参与过期前的小时数（0=禁用） |
| `media_max_bytes` | int | 20MB | 最大文件下载大小（字节） |

## Token 类型

| Token | 前缀 | 是否必填 | 用途 |
|-------|--------|----------|---------|
| Bot Token | `xoxb-` | 是 | 核心 API：消息、回应、文件、用户信息 |
| App-Level Token | `xapp-` | 是 | Socket Mode WebSocket 连接 |
| User Token | `xoxp-` | 否 | 自定义 bot 身份（用户名/图标覆盖） |

启动时验证 token 前缀——配置错误的 token 会以清晰的错误信息快速失败。

## 功能特性

### Socket Mode

使用 WebSocket 而非 HTTP webhook。无需公开 URL 或 ingress——非常适合自托管部署。事件按 Slack 要求在 3 秒内确认。

死 socket 分类检测不可重试的认证错误（`invalid_auth`、`token_revoked`、`missing_scope`），停止 channel 而不是无限重试。

### 提及过滤

在 channel 中，bot 仅在被 @提及时响应（默认 `require_mention: true`）。未提及的消息存入待处理历史缓冲区，bot 下次被提及时作为上下文包含。

```mermaid
flowchart TD
    MSG["用户在 channel 中发消息"] --> MENTION{"Bot 被 @提及<br/>或在已参与线程中?"}
    MENTION -->|否| BUFFER["加入待处理历史<br/>（最多 50 条）"]
    MENTION -->|是| PROCESS["立即处理<br/>包含历史作为上下文"]
    BUFFER --> NEXT["下次提及时：<br/>包含历史"]
```

### 线程参与

Bot 在线程中回复后，会自动回复该线程中的后续消息，无需 @提及。参与在 `thread_ttl` 小时后过期（默认 24 小时）。设置 `thread_ttl: 0` 禁用此功能（始终需要 @提及）。

### 消息防抖

来自同一线程的快速消息合并为单次分发。默认延迟：300ms（通过 `debounce_delay` 配置）。关闭时刷新待处理批次。

### 消息格式化

LLM markdown 输出转换为 Slack mrkdwn：

```
Markdown → Slack mrkdwn
**bold**  → *bold*
_italic_  → _italic_
~~strike~~ → ~strike~
# Header  → *Header*
[text](url) → <url|text>
```

表格渲染为代码块。Slack 原生 token（`<@U123>`、`<#C456>`、URL）在转换管道中保留。超过 4,000 字符的消息在换行处分割。

### 流式输出

通过 `chat.update`（原位编辑）启用实时响应更新：

- **DM**（`dm_stream`）：随分块到达编辑"Thinking..."占位符
- **群组**（`group_stream`）：相同行为，在线程内

更新节流为每秒 1 次编辑，避免 Slack 频率限制。设置 `native_stream: true` 可在可用时使用 Slack 的 ChatStreamer API。

### 表情回应

在用户消息上显示 emoji 状态。设置 `reaction_level`：

- `off` — 无回应（默认）
- `minimal` — 仅思考中和完成
- `full` — 所有状态：思考中、工具使用、完成、错误、停滞

| 状态 | Emoji |
|--------|-------|
| 思考中 | :thinking_face: |
| 工具使用 | :hammer_and_wrench: |
| 完成 | :white_check_mark: |
| 错误 | :x: |
| 停滞 | :hourglass_flowing_sand: |

回应在 700ms 处防抖，防止 API 刷屏。

### 媒体处理

**接收文件：** 消息附件的文件通过 SSRF 保护下载（hostname 白名单：`*.slack.com`、`*.slack-edge.com`、`*.slack-files.com`）。重定向时剥离认证 token。超过 `media_max_bytes`（默认 20MB）的文件被跳过。

**发送文件：** Agent 生成的文件通过 Slack 文件上传 API 上传。上传失败显示内联错误消息。

**文档提取：** 文档文件（PDF、文本文件）的内容被提取并附加到消息中供 agent 处理。

### 自定义 Bot 身份

使用可选的 User Token（`xoxp-`），bot 可以以自定义用户名和图标发布：

1. 在 **OAuth & Permissions** → **User Token Scopes** → 添加 `chat:write.customize`
2. 重新安装应用
3. 在配置中添加 `user_token`

### 群组策略：配对

Slack 支持群组级别的配对。当 `group_policy: "pairing"` 时：
- 管理员通过 CLI 审批 channel：`goclaw pairing approve <code>`
- 或通过 GoClaw Web UI（配对部分）
- 群组的配对码**不**在 channel 中显示（安全：对所有成员可见）

`allow_from` 列表同时支持用户 ID 和 Slack channel ID 用于群组级别白名单。

## 故障排查

| 问题 | 解决方案 |
|-------|----------|
| 启动时 `invalid_auth` | Token 错误或已撤销。在 Slack 应用设置中重新生成 token。 |
| `missing_scope` 错误 | 所需 scope 未添加。在 OAuth & Permissions 中添加 scope，重新安装应用。 |
| Bot 在 channel 中不响应 | Bot 未被邀请到 channel。运行 `/invite @BotName`。 |
| Bot 在 DM 中不响应 | DM 策略为 `disabled` 或需要配对。检查 `dm_policy` 配置。 |
| Socket Mode 无法连接 | App-Level Token（`xapp-`）缺失或不正确。检查 Basic Information 页面。 |
| Bot 响应时没有自定义名称 | User Token 未配置。添加带 `chat:write.customize` scope 的 `user_token`。 |
| 消息被处理两次 | Socket Mode 重连去重是内置的。如果持续出现，检查是否有重复的 app_mention + message 事件——正常行为，去重会处理。 |
| 快速消息被分开发送 | 增大 `debounce_delay`（默认 300ms）。 |
| 线程自动回复停止 | 线程参与已过期（`thread_ttl`，默认 24 小时）。再次提及 bot。 |

## 下一步

- [概览](/channels-overview) — Channel 概念和策略
- [Telegram](/channel-telegram) — Telegram bot 设置
- [Discord](/channel-discord) — Discord bot 设置
- [Browser Pairing](/channel-browser-pairing) — 配对流程

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
