> 翻译自 [English version](/troubleshoot-channels)

# Channel 问题

> Telegram、Discord、Feishu、Zalo 和 WhatsApp 的按 channel 故障排除。

## 概览

每个 channel 都有自己的连接模式、权限模型和消息格式特点。本页涵盖每个 channel 最常见的故障模式。有关 gateway 级别问题（启动、WebSocket、速率限制）参见[常见问题](/troubleshoot-common)。

## 通用 Channel 提示

- Channel 错误出现在 gateway 日志中，以 channel 名称作为上下文（如 `"feishu bot probe failed"`、`"zalo getUpdates error"`）。
- 所有 channel 在短暂故障后自动重连。警告日志不代表 channel 永久损坏。
- 通过仪表盘或 `channels.status` RPC 方法检查 channel 状态。

---

## Telegram

Telegram 使用**长轮询**——无需公开 webhook URL。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 启动时 `create telegram bot: ...` | Bot token 无效 | 通过 `@BotFather` 验证 `GOCLAW_TELEGRAM_TOKEN` |
| `start long polling: ...` | 网络问题或 token 被撤销 | 检查到 `api.telegram.org` 的连通性；如需要重新签发 token |
| Bot 在群组中不响应 | 群组流式传输未启用 | 在 channel 配置中设置 `group_stream: true` |
| 菜单命令未同步 | `setMyCommands` 速率限制 | 自动重试；几秒后重启 gateway |
| 代理无法连接 | 代理 URL 无效 | 在 `proxy` 配置字段中使用 `http://user:pass@host:port` 格式 |
| 表格显示混乱 | Telegram HTML 不支持表格 | 预期行为——GoClaw 在 `<pre>` 块中将表格渲染为 ASCII |

**必填环境变量：** `GOCLAW_TELEGRAM_TOKEN`

---

## Discord

Discord 使用持久的 **gateway WebSocket** 连接。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 启动时 `create discord session: ...` | Bot token 无效 | 在 Discord 开发者门户验证 `GOCLAW_DISCORD_TOKEN` |
| `open discord session: ...` | 无法连接到 Discord gateway | 检查网络；查看 [status.discord.com](https://status.discord.com) |
| Bot 未接收消息 | 缺少 Gateway Intents | 在 Discord 开发者门户 → Bot 中启用 **Message Content Intent** |
| 消息被截断 | Discord 2000 字符限制 | GoClaw 自动分块；检查接近限制的大型代码块 |
| 配对回复未发送 | DM 权限未授予 | Bot 必须与用户共享服务器并具有 DM 权限 |

**必填环境变量：** `GOCLAW_DISCORD_TOKEN`

**Intents 检查清单**（Discord 开发者门户 → Bot → Privileged Gateway Intents）：
- [x] Message Content Intent

---

## Feishu / Lark

Feishu 支持两种模式：**WebSocket**（默认，无需公开 URL）和 **Webhook**（需要公开 HTTPS 端点）。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `feishu app_id and app_secret are required` | 缺少凭证 | 设置 `GOCLAW_LARK_APP_ID` 和 `GOCLAW_LARK_APP_SECRET` |
| `feishu bot probe failed`（仅警告）| Bot 信息获取失败；channel 仍然启动 | 检查 Feishu 控制台中的应用权限；非致命错误 |
| `feishu websocket error`（自动重连）| WebSocket 连接断开 | 自动重连；持续错误说明防火墙阻断了 `*.larksuite.com` |
| Webhook 签名验证失败 | token 或加密密钥错误 | 验证 `GOCLAW_LARK_VERIFICATION_TOKEN` 和 `GOCLAW_LARK_ENCRYPT_KEY` 与应用配置匹配 |
| Webhook 模式下事件未送达 | Feishu 无法访问你的服务器 | 确保有公开 HTTPS 端点；Feishu 需要 SSL |
| `feishu send media failed` | 媒体 URL 不可公开访问 | 将媒体托管在公开 URL 上；Feishu 在投递时获取媒体 |

**必填环境变量：**

```bash
GOCLAW_LARK_APP_ID=cli_xxxx
GOCLAW_LARK_APP_SECRET=your_secret
# 仅 Webhook 模式：
GOCLAW_LARK_ENCRYPT_KEY=your_encrypt_key
GOCLAW_LARK_VERIFICATION_TOKEN=your_token
```

在 channel 配置中设置 `connection_mode: "websocket"`（默认）或 `"webhook"`。

---

## Zalo

Zalo OA Bot **仅支持私信**（不支持群聊），每条消息文本限制 2000 字符。GoClaw 自动分块处理较长的响应。以轮询模式运行。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `zalo token is required` | 缺少 OA token | 用你的 Zalo OA 访问 token 设置 `GOCLAW_ZALO_TOKEN` |
| `zalo getMe failed` | Token 无效或过期 | 在 Zalo 开发者控制台刷新 token；OA token 定期过期 |
| Bot 不响应 | DM policy 配置错误 | 检查 channel 配置中的 `dm_policy` |
| 日志中出现 `zalo getUpdates error` | 轮询错误（不含 HTTP 408）| HTTP 408 正常（超时，无更新）；其他错误 5 秒后重试 |
| 群组消息被忽略 | 平台限制 | Zalo OA 仅支持私信——这是设计行为 |

**必填环境变量：** `GOCLAW_ZALO_TOKEN`

---

## WhatsApp

WhatsApp **直接连接**（原生多设备协议）。无需外部桥接服务。认证状态存储在数据库中。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 没有显示 QR 码 | 无法连接 WhatsApp 服务器 | 检查网络（端口 443、5222） |
| 扫描 QR 但未认证 | 认证状态损坏 | 使用"重新认证"按钮或重启 channel |
| `whatsapp bridge_url is required` | 旧配置仍在 | 删除配置中的 `bridge_url` —— 不再需要 |
| 发送时 `whatsapp not connected` | 未认证 | 先通过 UI 向导扫描 QR 码 |
| 日志中出现 `logged out` | WhatsApp 撤销了会话 | 使用"重新认证"按钮扫描新 QR 码 |
| 群组消息被忽略 | 策略或 @提及 限制 | 检查 `group_policy` 和 `require_mention` 设置 |
| 媒体下载失败 | 网络或文件问题 | 检查日志；确认临时目录可写；每个文件最大 20 MB |

通过 GoClaw UI 进行认证（Channels > WhatsApp > Re-authenticate）。

---

## 下一步

- [Provider 特定问题](/troubleshoot-providers)
- [数据库问题](/troubleshoot-database)
- [常见问题](/troubleshoot-common)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
