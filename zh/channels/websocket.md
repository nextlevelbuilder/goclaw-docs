> 翻译自 [English version](#channel-websocket)

# WebSocket Channel

通过 WebSocket 与 GoClaw gateway 直接 RPC 通信。无需中间消息平台——非常适合自定义客户端、Web 应用和测试。

## 连接

**端点：**

```
ws://your-gateway.com:8080/ws
wss://your-gateway.com:8080/ws  (TLS)
```

**WebSocket 升级：**

```
GET /ws HTTP/1.1
Host: your-gateway.com:8080
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

服务器响应 `101 Switching Protocols`。

## 认证

第一条消息必须是 `connect` 帧：

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "user_id": "user_123"
  }
}
```

**参数：**

| 字段 | 类型 | 是否必填 | 说明 |
|-------|------|----------|-------------|
| `token` | string | 否 | Gateway API token（为空 = viewer 角色） |
| `user_id` | string | 是 | 客户端/用户标识符（不透明，最大 255 字符） |

**响应：**

```json
{
  "type": "res",
  "id": "1",
  "ok": true,
  "payload": {
    "protocol": 3,
    "role": "admin",
    "user_id": "user_123"
  }
}
```

### 角色

- **viewer**（默认）：只读访问（无 token 或 token 错误）
- **operator**：读取 + 写入 + 聊天
- **admin**：完全控制（持有正确 gateway token）

## 发送消息

认证后，发送 `chat.send` 请求：

```json
{
  "type": "req",
  "id": "2",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "What is 2+2?",
    "channel": "websocket"
  }
}
```

**参数：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `agentId` | string | 要查询的 agent |
| `message` | string | 用户消息 |
| `channel` | string | 通常为 `"websocket"` |
| `sessionId` | string | 可选：恢复已有 session |

**响应：**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "content": "2+2 equals 4.",
    "usage": {
      "input_tokens": 42,
      "output_tokens": 8
    }
  }
}
```

## 流式事件

Agent 处理期间，服务器推送事件：

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "chunk": "2+2 equals",
    "delta": " equals"
  },
  "seq": 1
}
```

**事件类型：**

| 事件 | Payload | 说明 |
|-------|---------|-------------|
| `chat` | `{chunk, delta}` | 流式文本分块 |
| `agent` | `{run_id, status}` | Agent 生命周期（已启动、已完成、失败） |
| `tool.call` | `{tool, input}` | 工具调用 |
| `tool.result` | `{tool, output}` | 工具结果 |

## 最小 JavaScript 客户端

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // 认证
  ws.send(JSON.stringify({
    type: 'req',
    id: '1',
    method: 'connect',
    params: {
      user_id: 'web_client_1'
    }
  }));
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === 'res' && frame.id === '1') {
    // 已连接！发送消息
    ws.send(JSON.stringify({
      type: 'req',
      id: '2',
      method: 'chat.send',
      params: {
        agentId: 'main',
        message: 'Hello!',
        channel: 'websocket'
      }
    }));
  }

  if (frame.type === 'res' && frame.id === '2') {
    console.log('Response:', frame.payload.content);
  }

  if (frame.type === 'event' && frame.event === 'chat') {
    console.log('Chunk:', frame.payload.chunk);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Session 管理

复用 session ID 以继续对话：

```json
{
  "type": "req",
  "id": "3",
  "method": "chat.send",
  "params": {
    "agentId": "main",
    "message": "Add 5 to the result.",
    "sessionId": "session_xyz",
    "channel": "websocket"
  }
}
```

每次响应返回 session ID。存储并传递以维护对话历史。

## 保活

服务器每 30 秒发送 ping 帧。客户端应以 pong 响应。大多数 WebSocket 库自动处理此操作。

## 帧限制

| 限制 | 值 |
|-------|-------|
| 读取消息大小 | 512 KB |
| 读取截止时间 | 60 秒 |
| 写入截止时间 | 10 秒 |
| 发送缓冲区 | 256 条消息 |

超出限制的消息将被丢弃并记录日志。

## 错误处理

失败的请求包含错误详情：

```json
{
  "type": "res",
  "id": "2",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "unknown method",
    "retryable": false
  }
}
```

## 故障排查

| 问题 | 解决方案 |
|-------|----------|
| "Connection refused" | 检查 gateway 是否在正确的 host/port 上运行。 |
| "Unauthorized" | 验证 token 是否正确。检查是否提供了 user_id。 |
| "Message too large" | 减小消息大小（512 KB 限制）。 |
| 无流式事件 | 确保 provider 支持流式输出。检查模型配置。 |
| 连接断开 | 服务器可能达到消息缓冲区限制。重新连接并恢复 session。 |

## 下一步

- [概览](#channels-overview) — Channel 概念和策略
- [WebSocket 协议](#websocket-protocol) — 完整协议文档
- [Browser Pairing](#channel-browser-pairing) — 自定义客户端的配对流程

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
