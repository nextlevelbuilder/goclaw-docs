> 翻译自 [English version](/troubleshoot-websocket)

# WebSocket 问题

> GoClaw 中 WebSocket 连接、认证和消息处理的故障排除。

## 概览

GoClaw 在 `/ws` 暴露单个 WebSocket 端点。客户端与 gateway 之间的所有实时通信——聊天、事件、RPC 调用——都通过此连接传输。本页涵盖最常见的故障模式及其原因和修复方法。

## 认证

连接后发送的第一帧**必须**是 `connect` 方法调用。认证前发送任何其他方法都会返回 `UNAUTHORIZED` 错误。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `UNAUTHORIZED: first request must be 'connect'` | 首先发送了 `connect` 以外的方法 | 始终将 `{"type":"req","method":"connect","params":{...}}` 作为第一帧发送 |
| 每个请求都返回 `UNAUTHORIZED` | Token 缺失或错误 | 检查 connect payload 中的 `Authorization` 头或 token 参数 |
| 浏览器配对卡住 | 等待管理员审批 | 审批完成前只允许 `browser.pairing.status`——轮询该方法 |
| 连接立即被拒绝 | 来源不在白名单中 | 在配置中将前端来源添加到 `gateway.allowed_origins`（参见下方 CORS）|

**Connect 帧示例：**

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_API_KEY",
    "user_id": "user-123"
  }
}
```

## 连接错误

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 从未收到 HTTP 101 | URL 错误或 gateway 未运行 | 端点为 `ws://host:8080/ws`（或带 TLS 的 `wss://`）；验证 gateway 是否运行 |
| 服务器日志中的 `websocket upgrade failed` | 代理未转发 `Upgrade` 头 | 配置 nginx/caddy 传递 `Connection: Upgrade` 和 `Upgrade: websocket` |
| 60 秒无活动后连接断开 | 读取截止时间超时 | Gateway 期望每 60 秒收到一次 pong 回复；在客户端实现 pong 处理 |
| 服务器日志中的 `websocket read error` | 客户端异常关闭（标签关闭、网络断开）| 浏览器客户端的正常现象；使用指数退避实现重连逻辑 |
| `INVALID_REQUEST: unexpected frame type` | 发送了非请求帧类型 | 客户端只支持 `req` 帧 |
| `INVALID_REQUEST: invalid frame` | JSON 格式错误 | 根据协议线协议类型验证 payload 结构 |

### CORS

如果在浏览器控制台中看到 CORS 错误导致连接被拒绝，说明请求来源不在白名单中。

```yaml
# config.json5
gateway: {
  allowed_origins: ["https://app.example.com", "http://localhost:3000"]
}
```

非浏览器客户端（CLI、SDK、channel）不发送 `Origin` 头，始终被允许。

## 消息大小

服务器对每个 WebSocket 帧强制执行 **512 KB** 限制（`maxWSMessageSize = 512 * 1024`）。当帧超过此限制时，gorilla/websocket 触发 `ErrReadLimit` 并由服务器关闭连接。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 发送中途连接断开 | 帧超过 512 KB | 将大型 payload 拆分为多个请求；避免内联发送二进制数据 |
| WebSocket 文件上传失败 | 文件内容嵌入帧中 | 改用 HTTP 媒体上传端点（`/api/media/upload`）|

**经验法则：** 将请求 payload 保持在 100 KB 以下。大型内容使用 HTTP 端点。

## 速率限制

速率限制**默认禁用**。启用后（`gateway.rate_limit_rpm > 0`），gateway 对每个用户强制执行 token bucket 限制器，突发为 5。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 请求被静默丢弃（无响应）| 超过每用户速率限制 | 退避后重试；降低请求频率 |
| 服务器日志中的 `security.rate_limited` | 客户端超过 `rate_limit_rpm` | 增大 `gateway.rate_limit_rpm` 或减少客户端请求量 |

**Ping/pong 帧不计入**速率限制——只有 RPC 请求帧计入。

配置速率限制：

```yaml
# config.json5
gateway: {
  rate_limit_rpm: 60   # 每用户每分钟 60 个请求，突发 5
}
```

设置为 `0` 或省略则禁用（默认）。

## Ping / Pong

Gateway 每 **30 秒**发送一次 WebSocket ping。每次收到 pong 回复时，读取截止时间重置为 **60 秒**。

如果客户端在 60 秒内未回复 ping，服务器认为连接已死并关闭它。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 空闲客户端连接断开 | 客户端未响应 ping 帧 | 在你的 WebSocket 库中启用自动 pong（大多数默认这样做）|
| 恰好 60 秒后连接断开 | 未注册 pong 处理器 | 显式注册一个重置读取截止时间的 pong 处理器 |

大多数 WebSocket 库（浏览器原生、Node.js 的 `ws`、gorilla）自动处理 ping/pong。如果空闲时连接断开，请查阅你的库文档。

## 客户端库

| 库 | 说明 |
|---------|-------|
| 浏览器 `WebSocket` API | Ping/pong 由浏览器处理。无需特殊配置。 |
| Node.js `ws` | 启用 `{ autoPong: true }`（较新版本默认） |
| Python `websockets` | Ping/pong 自动；使用 `ping_interval` / `ping_timeout` 参数 |
| Go `gorilla/websocket` | 手动注册 pong 处理器并重置读取截止时间 |
| CLI / curl | 使用 `websocat`——它自动处理 pong |

**重连模式：** 在任何关闭事件时，等待 1 秒 → 重新连接 → 用 `connect` 重新认证 → 恢复。

## 会话所有权（v2.66+）

所有 5 个 `chat.*` WebSocket 方法（`chat.send`、`chat.history`、`chat.inject`、`chat.abort`、`chat.session.status`）现在通过 `requireSessionOwner` 强制执行会话所有权。非管理员用户只能访问自己的会话。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `FORBIDDEN: session does not belong to user` | 非管理员用户尝试读取或写入他人会话 | 使用属于已认证用户的会话 ID；管理员绕过此检查 |
| 升级后突然出现所有权错误 | 升级到 v2.66+ 时使用了共享会话 ID | 每个用户必须使用自己的会话 ID；管理员 token 绕过所有权检查 |

这是一个安全修复（Session IDOR）。如果你的集成在用户之间共享会话 ID，每个用户必须使用自己的 token 和会话进行认证。

## 下一步

- [常见问题](/troubleshoot-common) — 启动、agent、内存问题
- [Channel 故障排除](/troubleshoot-channels) — Telegram、Discord、WhatsApp 问题

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
