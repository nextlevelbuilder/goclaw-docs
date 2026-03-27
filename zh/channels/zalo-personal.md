> 翻译自 [English version](#channel-zalo-personal)

# Zalo 个人 Channel

使用逆向工程协议（zcago）的非官方个人 Zalo 账号集成。支持 DM 和群组，采用严格访问控制。

## 警告：使用风险自负

Zalo 个人使用**非官方逆向工程协议**。你的账号随时可能被 Zalo 锁定、封禁或限制。**不建议**用于生产 bot。正式集成请使用 [Zalo OA](#channel-zalo-oa)。

启动时会记录安全警告：`security.unofficial_api`。

## 设置

**前置条件：**
- 持有凭据的个人 Zalo 账号
- 凭据以 JSON 文件形式存储

**创建凭据 JSON：**

```json
{
  "phone": "84987654321",
  "password": "your_password_here",
  "device_id": "your_device_id"
}
```

**启用 Zalo 个人：**

```json
{
  "channels": {
    "zalo_personal": {
      "enabled": true,
      "credentials_path": "/home/goclaw/.goclaw/zalo-creds.json",
      "dm_policy": "allowlist",
      "group_policy": "allowlist",
      "allow_from": ["friend_zalo_id", "group_chat_id"]
    }
  }
}
```

## 配置

所有配置项位于 `channels.zalo_personal`：

| 配置项 | 类型 | 默认值 | 说明 |
|-----|------|---------|-------------|
| `enabled` | bool | false | 启用/禁用 channel |
| `credentials_path` | string | -- | 凭据 JSON 文件路径 |
| `allow_from` | list | -- | 用户/群组 ID 白名单 |
| `dm_policy` | string | `"allowlist"` | `pairing`、`allowlist`、`open`、`disabled`（严格默认值） |
| `group_policy` | string | `"allowlist"` | `open`、`allowlist`、`disabled`（严格默认值） |
| `require_mention` | bool | true | 群组中是否需要提及 bot |
| `block_reply` | bool | -- | 覆盖 gateway block_reply（nil=继承） |

## 功能特性

### 与 Zalo OA 的对比

| 方面 | Zalo OA | Zalo 个人 |
|--------|---------|---------------|
| 协议 | 官方 Bot API | 逆向工程（zcago） |
| 账号类型 | 官方账号 | 个人账号 |
| DM 支持 | 是 | 是 |
| 群组支持 | 否 | 是 |
| 默认 DM 策略 | `pairing` | `allowlist`（严格） |
| 默认群组策略 | 无 | `allowlist`（严格） |
| 认证方式 | API key | 凭据（手机号 + 密码） |
| 风险等级 | 无 | 高（账号可能被封禁） |
| 推荐用途 | 正式 bot | 仅限开发/测试 |

### DM 和群组支持

与 Zalo OA 不同，个人版支持 DM 和群组：

- DM：与个人用户的直接对话
- 群组：群聊（Zalo 聊天群组）
- 默认策略**严格**：DM 和群组均为 `allowlist`

通过 `allow_from` 显式允许用户/群组：

```json
{
  "allow_from": [
    "user_zalo_id_1",
    "user_zalo_id_2",
    "group_chat_id_3"
  ]
}
```

### 认证

需要包含手机号、密码和设备 ID 的凭据文件。首次连接时，账号可能需要 Zalo 的 QR 扫描或额外验证。

**QR 重新认证**：通过 QR 扫描重新认证（如 session 过期后），GoClaw 在启动新 QR 流程前安全取消上一个 session。此竞态安全取消防止重复 session 同时运行，避免登录尝试冲突。

### 媒体处理

媒体发送包含写入后验证——文件在发送到 Zalo API 前确认已写入磁盘。

### 韧性

连接失败时：
- 最多 10 次重启尝试
- 指数退避：1s → 最大 60s
- 错误码 3000 的特殊处理：60 秒初始延迟（通常是频率限制）
- 每个线程的 Typing 控制器（本地 key）

## 故障排查

| 问题 | 解决方案 |
|-------|----------|
| "Account locked" | 你的账号被 Zalo 限制。这在 bot 集成中经常发生。请改用 Zalo OA。 |
| "Invalid credentials" | 验证凭据文件中的手机号、密码和设备 ID。如果 Zalo 需要验证则重新认证。 |
| 未收到消息 | 检查 `allow_from` 是否包含发送者。验证 DM/群组策略不是 `disabled`。 |
| Bot 持续断连 | Zalo 可能在进行频率限制。检查日志中的错误码 3000。等待 60 秒以上再重连。 |
| "Unofficial API"警告 | 此为预期行为。承认风险后仅用于开发/测试。 |

## 下一步

- [概览](#channels-overview) — Channel 概念和策略
- [Zalo OA](#channel-zalo-oa) — 官方 Zalo 集成（推荐）
- [Telegram](#channel-telegram) — Telegram bot 设置
- [Browser Pairing](#channel-browser-pairing) — 配对流程

<!-- goclaw-source: 120fc2d | 更新: 2026-03-18 -->
