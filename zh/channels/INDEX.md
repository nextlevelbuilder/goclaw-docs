> 翻译自 [English version](#channels-index)

# GoClaw Channels 文档索引

GoClaw 所有消息平台集成的完整文档。

## 快速开始

1. **[概览](./overview.md)** — 概念、策略、消息流图
2. **[Telegram](./telegram.md)** — 长轮询、论坛话题、STT、流式输出
3. **[Discord](./discord.md)** — Gateway API、占位符编辑、线程
4. **[Slack](./slack.md)** — Socket Mode、线程、流式输出、表情回应、防抖
5. **[Larksuite](./larksuite.md)** — WebSocket/Webhook、流式卡片、媒体
6. **[Zalo OA](./zalo-oa.md)** — 官方账号、仅 DM、配对、图片
7. **[Zalo 个人](./zalo-personal.md)** — 个人账号（非官方）、DM + 群组
8. **[WhatsApp](./whatsapp.md)** — 直连、QR 认证、媒体、输入指示器、配对
9. **[WebSocket](./websocket.md)** — 直接 RPC、自定义客户端、流式事件
10. **[Browser Pairing](./browser-pairing.md)** — 8 位码认证、session token

## Channel 对比表

| 功能 | Telegram | Discord | Slack | Larksuite | Zalo OA | Zalo 个人 | WhatsApp | WebSocket |
|---------|----------|---------|-------|--------|---------|-----------|----------|-----------|
| **设置复杂度** | 简单 | 简单 | 简单 | 中等 | 中等 | 困难 | 中等 | 非常简单 |
| **传输方式** | 轮询 | Gateway | Socket Mode | WS/Webhook | 轮询 | 协议 | 直连 | WebSocket |
| **DM 支持** | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 无 |
| **群组支持** | 是 | 是 | 是 | 是 | 否 | 是 | 是 | 无 |
| **流式输出** | 是 | 是 | 是 | 是 | 否 | 否 | 否 | 是 |
| **富文本格式** | HTML | Markdown | mrkdwn | 卡片 | 纯文本 | 纯文本 | WA 原生 | JSON |
| **表情回应** | 是 | -- | 是 | 是 | -- | -- | -- | -- |
| **媒体** | 图片、语音、文件 | 文件、嵌入 | 文件（20MB） | 图片、文件 | 图片 | -- | 图片、视频、音频、文档 | 无 |
| **认证方式** | Token | Token | 3 Tokens | App ID + Secret | API Key | 凭据 | QR 码 | Token + 配对 |
| **风险等级** | 低 | 低 | 低 | 低 | 低 | 高 | 中 | 低 |

## 配置文件

所有 channel 配置位于根目录 `config.json`：

```json
{
  "channels": {
    "telegram": { ... },
    "discord": { ... },
    "slack": { ... },
    "feishu": { ... },
    "zalo": { ... },
    "zalo_personal": { ... },
    "whatsapp": { ... }
  }
}
```

机密值（token、API key）从环境变量或 `.env.local` 加载，不存储在 `config.json` 中。

## 常用模式

### DM 策略

所有 channel 支持 DM 访问控制：

- `pairing` — 需要 8 位码审批（Telegram、Larksuite、Zalo 的默认值）
- `allowlist` — 仅限列出的用户（限制为团队成员）
- `open` — 接受所有 DM（公开 bot）
- `disabled` — 不接受 DM（仅群组）

### 群组策略

支持群组的 channel：

- `open` — 接受所有群组
- `allowlist` — 仅限列出的群组
- `disabled` — 不接受群组消息

### 消息处理

所有 channel：
1. 监听平台事件
2. 构建 `InboundMessage`（发送者、chat ID、内容、媒体）
3. 发布到消息总线
4. Agent 处理并响应
5. Manager 路由到 channel
6. Channel 格式化并发送（遵守 2K-4K 字符限制）

### 白名单格式

灵活格式支持：

```
"allow_from": [
  "user_id",           # 纯 ID
  "@username",         # 带 @
  "id|username",       # 复合格式
  "123456789"          # 数字 ID
]
```

## 设置清单

### Telegram

- [ ] 通过 @BotFather 创建 bot
- [ ] 复制 token
- [ ] 在配置中启用：`channels.telegram.enabled: true`
- [ ] 可选：配置每组覆盖、STT 代理、流式输出

### Discord

- [ ] 在开发者门户创建应用
- [ ] 启用"Message Content Intent"
- [ ] 复制 bot token
- [ ] 以正确权限将 bot 添加到服务器
- [ ] 在配置中启用

### Slack

- [ ] 在 api.slack.com 创建 Slack 应用
- [ ] 启用 Socket Mode，复制 App-Level Token（`xapp-`）
- [ ] 添加 Bot Token Scopes，安装到工作区
- [ ] 复制 Bot User OAuth Token（`xoxb-`）
- [ ] 在配置中启用两个 token
- [ ] 邀请 bot 到 channel

### Larksuite

- [ ] 创建自定义应用
- [ ] 复制 App ID + Secret
- [ ] 选择传输方式：WebSocket（默认）或 Webhook
- [ ] 若使用 webhook：在 Larksuite 控制台设置 URL
- [ ] 在配置中启用

### Zalo OA

- [ ] 在 oa.zalo.me 创建官方账号
- [ ] 启用 Bot API
- [ ] 复制 API key
- [ ] 在配置中启用（默认轮询）

### Zalo 个人

- [ ] 将账号凭据保存到 JSON 文件
- [ ] 在配置中指向凭据文件
- [ ] **确认账号封禁风险**
- [ ] 在配置中启用

### WhatsApp

- [ ] 在 UI 中创建 channel：Channels > Add Channel > WhatsApp
- [ ] 用 WhatsApp 扫描 QR 码（你 > 已关联的设备 > 关联设备）
- [ ] 根据需要配置 DM/群组策略

### WebSocket

- [ ] 无需设置——内置！
- [ ] 客户端可以请求配对码
- [ ] 或使用 gateway token 连接

## 测试 Channel

### 手动测试（CLI）

```bash
# Telegram：向自己发送
goclaw send telegram 123456 "Hello from GoClaw"

# Discord：发送到 channel
goclaw send discord 987654 "Hello!"

# WebSocket：查看 gateway 协议文档
```

### 检查状态

```bash
goclaw status
# 显示哪些 channel 在运行
```

### 查看日志

```bash
grep -i telegram ~/.goclaw/logs/gateway.log
grep -i discord ~/.goclaw/logs/gateway.log
```

## 故障排查

### Bot 不响应

1. 检查配置中 `enabled: true`
2. 检查策略设置（DM 策略、群组策略）
3. 检查白名单（如适用）
4. 检查日志中的错误

### 媒体未发送

1. 验证文件类型是否受支持
2. 检查文件大小是否在平台限制内
3. 确保临时文件存在
4. 检查 channel 是否有发送媒体的权限

### 连接断开

1. 检查网络连接
2. 验证认证凭据
3. 检查服务频率限制
4. 重启 channel

## 下一步

- **[开发规则](../../development-rules.md)** — Channel 代码风格
- **[系统架构](../../00-architecture-overview.md)** — Channel 在系统中的位置
- **[Gateway 协议](../../04-gateway-protocol.md)** — WebSocket 协议详情
