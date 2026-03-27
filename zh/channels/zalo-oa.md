> 翻译自 [English version](#channel-zalo-oa)

# Zalo OA Channel

Zalo 官方账号（OA）集成。仅支持 DM，基于配对的访问控制，支持图片。

## 设置

**创建 Zalo OA：**

1. 前往 https://oa.zalo.me
2. 创建官方账号（需要 Zalo 手机号）
3. 设置 OA 名称、头像和封面照片
4. 在 OA 设置中，进入"Settings" → "API" → "Bot API"
5. 创建 API key
6. 复制 API key 用于配置

**启用 Zalo OA：**

```json
{
  "channels": {
    "zalo": {
      "enabled": true,
      "token": "YOUR_API_KEY",
      "dm_policy": "pairing",
      "allow_from": [],
      "media_max_mb": 5
    }
  }
}
```

## 配置

所有配置项位于 `channels.zalo`：

| 配置项 | 类型 | 默认值 | 说明 |
|-----|------|---------|-------------|
| `enabled` | bool | false | 启用/禁用 channel |
| `token` | string | 必填 | 来自 Zalo OA 控制台的 API key |
| `allow_from` | list | -- | 用户 ID 白名单 |
| `dm_policy` | string | `"pairing"` | `pairing`、`allowlist`、`open`、`disabled` |
| `webhook_url` | string | -- | 可选 webhook URL（覆盖轮询） |
| `webhook_secret` | string | -- | 可选 webhook 签名密钥 |
| `media_max_mb` | int | 5 | 最大图片文件大小（MB） |
| `block_reply` | bool | -- | 覆盖 gateway block_reply（nil=继承） |

## 功能特性

### 仅限 DM

Zalo OA 只支持直接消息。群组功能不可用。所有消息均视为 DM。

### 长轮询

默认模式：Bot 每 30 秒轮询 Zalo API 获取新消息。服务器返回消息并标记为已读。

- 轮询超时：30 秒（默认）
- 错误退避：5 秒
- 文本限制：每条消息 2,000 字符
- 图片限制：5 MB

### Webhook 模式（可选）

不使用轮询，改为配置 Zalo 将事件 POST 到你的 gateway：

```json
{
  "webhook_url": "https://your-gateway.com/zalo/webhook",
  "webhook_secret": "your_webhook_secret"
}
```

Zalo 在请求头 `X-Zalo-Signature` 中发送 HMAC 签名。处理前先验证签名。

### 图片支持

Bot 可以接收和发送图片（JPG、PNG）。默认最大 5 MB。

**接收**：图片在消息处理期间下载并以临时文件保存。

**发送**：图片作为媒体附件发送：

```json
{
  "channel": "zalo",
  "content": "Here's your image",
  "media": [
    { "url": "/tmp/image.jpg", "type": "image" }
  ]
}
```

### 默认配对

默认 DM 策略为 `"pairing"`。新用户看到配对码说明，带 60 秒防抖（不会被刷屏）。管理员通过以下方式审批：

```
/pair CODE
```

## 故障排查

| 问题 | 解决方案 |
|-------|----------|
| "Invalid API key" | 检查来自 Zalo OA 控制台的 token。确保 OA 处于活跃状态且 Bot API 已启用。 |
| 未收到消息 | 验证轮询是否运行中（检查日志）。确保 OA 可以接收消息（未被暂停）。 |
| 图片上传失败 | 验证图片文件存在且在 `media_max_mb` 以内。检查文件格式（JPG/PNG）。 |
| Webhook 签名不匹配 | 确保 `webhook_secret` 与 Zalo 控制台一致。检查时间戳是否最新。 |
| 配对码未发送 | 检查 DM 策略是否为 `"pairing"`。验证管理员可以向 OA 发送消息。 |

## 下一步

- [概览](#channels-overview) — Channel 概念和策略
- [Zalo 个人](#channel-zalo-personal) — 个人 Zalo 账号集成
- [Telegram](#channel-telegram) — Telegram bot 设置
- [Browser Pairing](#channel-browser-pairing) — 配对流程

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
