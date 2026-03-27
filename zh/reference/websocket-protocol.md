> 翻译自 [English version](#websocket-protocol)

# WebSocket 协议

> GoClaw gateway WebSocket RPC 接口的协议 v3 规范。

## 概览

GoClaw 在 `/ws` 暴露 WebSocket 端点。客户端与 gateway 之间的所有通信使用 JSON 帧，共三种类型：`req`（请求）、`res`（响应）和 `event`（服务器推送）。任何连接上的第一个请求必须是 `connect`，用于认证并协商协议版本。

**连接 URL：** `ws://<host>:<port>/ws`

**协议版本：** `3`

---

## 连接限制

| 参数 | 值 | 说明 |
|-----------|-------|-------------|
| 读取限制 | 512 KB | 单条消息超过此限制时自动关闭连接 |
| 发送缓冲 | 256 条消息 | 缓冲满时消息会被丢弃 |
| 读取截止时间 | 60 秒 | 每条消息或 pong 时重置；超时触发断开 |
| 写入截止时间 | 10 秒 | 单帧写入超时 |
| Ping 间隔 | 30 秒 | 服务器发起的 keepalive ping |

---

## 帧类型

### 请求帧（`req`）

由客户端发送以调用 RPC 方法。

```json
{
  "type": "req",
  "id": "unique-client-id",
  "method": "chat.send",
  "params": { "message": "Hello", "sessionKey": "user:demo" }
}
```

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `type` | string | 始终为 `"req"` |
| `id` | string | 客户端生成的唯一 ID，在响应中匹配 |
| `method` | string | RPC 方法名 |
| `params` | object | 方法参数（可选）|

### 响应帧（`res`）

由服务器回复请求时发送。

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": true,
  "payload": { ... }
}
```

错误响应：

```json
{
  "type": "res",
  "id": "unique-client-id",
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "invalid token",
    "retryable": false
  }
}
```

**错误结构：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `code` | string | 机器可读的错误码 |
| `message` | string | 人类可读的描述 |
| `details` | any | 可选的额外上下文 |
| `retryable` | boolean | 重试是否可能成功 |
| `retryAfterMs` | integer | 建议的重试延迟（毫秒）|

### 事件帧（`event`）

由服务器主动推送，不需要前置请求。

```json
{
  "type": "event",
  "event": "agent",
  "payload": { "type": "chunk", "text": "Hello" },
  "seq": 42,
  "stateVersion": { "presence": 1, "health": 2 }
}
```

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `type` | string | 始终为 `"event"` |
| `event` | string | 事件名称 |
| `payload` | any | 事件特定数据 |
| `seq` | integer | 单调递增的排序号 |
| `stateVersion` | object | 乐观状态同步的版本计数器（`presence`、`health`）|

---

## 连接握手

第一个请求必须是 `connect`。gateway 在认证完成前会拒绝其他任何方法。

```json
// 请求
{
  "type": "req",
  "id": "init",
  "method": "connect",
  "params": {
    "token": "YOUR_GATEWAY_TOKEN",
    "protocol": 3
  }
}

// 成功响应
{
  "type": "res",
  "id": "init",
  "ok": true,
  "payload": { "version": "v1.2.0", "protocol": 3 }
}
```

协议版本错误或 token 无效时立即返回 `ok: false`。

**`user_id` 要求：** `connect` 中的 `user_id` 参数用于按用户范围隔离会话，为必填项。它是不透明的 VARCHAR(255)。多租户部署时，使用复合格式 `tenant.{tenantId}.user.{userId}`——GoClaw 使用身份传播并信任上游服务提供正确的身份。

---

## RPC 方法

### 核心

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `connect` | `{token, user_id, sender_id?, locale?}` | 认证。必须是第一个请求 |
| `health` | — | Ping / 健康检查 |
| `status` | — | Gateway 状态 |
| `providers.models` | — | 列出所有已配置 LLM provider 的可用模型 |

### 聊天

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `chat.send` | `{message, sessionKey?, agentId?}` | 发送消息；响应通过 `agent`/`chat` 事件流式传输 |
| `chat.history` | `{sessionKey}` | 获取消息历史 |
| `chat.abort` | `{sessionKey}` | 中止进行中的运行 |
| `chat.inject` | `{sessionKey, content}` | 注入消息而不触发运行 |

### Agent 管理

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `agents.list` | — | 列出所有 agent |
| `agent.wait` | `{agentId}` | 等待 agent 完成当前运行 |
| `agents.create` | agent 对象 | 创建 agent |
| `agents.update` | `{id, ...fields}` | 更新 agent |
| `agents.delete` | `{id}` | 删除 agent |
| `agents.files.list` | `{agentId}` | 列出 context 文件 |
| `agents.files.get` | `{agentId, fileName}` | 获取 context 文件 |
| `agents.files.set` | `{agentId, fileName, content}` | 创建或更新 context 文件 |
| `agent.identity.get` | `{agentId}` | 获取 agent persona 信息 |

### 会话

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `sessions.list` | `{agentId?}` | 列出会话，可按 agent 过滤 |
| `sessions.preview` | `{sessionKey}` | 获取会话摘要 |
| `sessions.patch` | `{sessionKey, ...fields}` | 修改会话元数据 |
| `sessions.delete` | `{key}` | 删除会话 |
| `sessions.reset` | `{key}` | 清空会话历史 |

### 配置

| 方法 | 说明 |
|--------|-------------|
| `config.get` | 获取当前配置（敏感信息已脱敏）|
| `config.apply` | 完整替换配置 |
| `config.patch` | 修改特定配置字段 |
| `config.schema` | 获取配置的 JSON Schema |

### Cron

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `cron.list` | `{includeDisabled?}` | 列出 cron 任务 |
| `cron.create` | cron 任务对象 | 创建 cron 任务 |
| `cron.update` | `{jobId, ...fields}` | 更新 cron 任务 |
| `cron.delete` | `{jobId}` | 删除 cron 任务 |
| `cron.toggle` | `{jobId, enabled}` | 启用或禁用任务 |
| `cron.run` | `{jobId}` | 立即触发运行 |
| `cron.runs` | `{jobId}` | 列出运行历史 |
| `cron.status` | `{jobId}` | 获取任务状态 |

### Skills

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `skills.list` | — | 列出 skill |
| `skills.get` | `{id}` | 获取 skill 详情 |
| `skills.update` | `{id, ...fields}` | 更新 skill 元数据 |

### Channel

| 方法 | 说明 |
|--------|-------------|
| `channels.list` | 列出活跃 channel |
| `channels.status` | 获取 channel 健康状态 |
| `channels.toggle` | 启用/禁用 channel |
| `channels.instances.list` | 列出数据库中的 channel 实例 |
| `channels.instances.get` | 获取 channel 实例 |
| `channels.instances.create` | 创建 channel 实例 |
| `channels.instances.update` | 更新 channel 实例 |
| `channels.instances.delete` | 删除 channel 实例 |

### 配对

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `device.pair.request` | `{channel, chatId}` | 请求配对码 |
| `device.pair.approve` | `{code, approvedBy}` | 批准配对请求 |
| `device.pair.deny` | `{code}` | 拒绝配对请求 |
| `device.pair.list` | — | 列出待处理和已批准的配对 |
| `device.pair.revoke` | `{channel, senderId}` | 撤销配对 |

### 执行审批

| 方法 | 说明 |
|--------|-------------|
| `exec.approval.list` | 列出待处理的 shell 命令审批 |
| `exec.approval.approve` | 批准命令 |
| `exec.approval.deny` | 拒绝命令 |

### 团队

| 方法 | 说明 |
|--------|-------------|
| `teams.list` | 列出所有团队 |
| `teams.create` | 创建团队（仅管理员）|
| `teams.get` | 获取团队及其成员 |
| `teams.update` | 更新团队属性 |
| `teams.delete` | 删除团队 |
| `teams.members.add` | 向团队添加 agent |
| `teams.members.remove` | 从团队移除 agent |
| `teams.tasks.list` | 列出团队任务（可过滤）|
| `teams.tasks.get` | 获取任务及其评论/事件 |
| `teams.tasks.create` | 创建任务 |
| `teams.tasks.claim` | 认领任务（标记为进行中）|
| `teams.tasks.assign` | 将任务分配给成员 |
| `teams.tasks.approve` | 批准已完成的任务 |
| `teams.tasks.reject` | 拒绝任务提交 |
| `teams.tasks.comment` | 向任务添加评论 |
| `teams.tasks.comments` | 列出任务评论 |
| `teams.tasks.events` | 列出任务事件历史 |
| `teams.tasks.delete` | 删除任务 |
| `teams.tasks.active-by-session` | 获取会话的活跃任务（用于会话切换时恢复状态）|
| `teams.workspace.list` | 列出团队工作区文件 |
| `teams.workspace.read` | 读取工作区文件 |
| `teams.workspace.delete` | 删除工作区文件 |
| `teams.events.list` | 列出团队事件历史（分页）|
| `teams.known_users` | 获取团队中已知用户 ID |
| `teams.scopes` | 获取任务路由的 channel/chat 范围 |

### 用量与配额

| 方法 | 说明 |
|--------|-------------|
| `usage.get` | Token 用量统计 |
| `usage.summary` | 用量摘要卡片 |
| `quota.usage` | 当前用户的配额消耗 |

### 日志

| 方法 | 参数 | 说明 |
|--------|--------|-------------|
| `logs.tail` | `{action: "start"\|"stop", level?}` | 启动或停止实时日志流；活跃时日志条目通过服务器推送事件到达 |

---

## 服务器推送事件

### Agent 事件（`"agent"`）

在 agent 运行期间发出。检查 `payload.type`：

| `payload.type` | 说明 |
|----------------|-------------|
| `run.started` | Agent 运行开始 |
| `run.completed` | 运行成功完成 |
| `run.failed` | 运行遇到错误 |
| `run.retrying` | 运行正在重试 |
| `tool.call` | 工具被调用 |
| `tool.result` | 工具返回结果 |
| `block.reply` | 回复被输入 guard 拦截 |

### 聊天事件（`"chat"`）

| `payload.type` | 说明 |
|----------------|-------------|
| `chunk` | 流式文本 token |
| `message` | 完整消息（非流式）|
| `thinking` | 扩展思考 / 推理输出 |

### 系统及其他事件

| 事件 | 说明 |
|-------|-------------|
| `health` | 定期 gateway 健康 ping |
| `tick` | 心跳 tick |
| `shutdown` | Gateway 正在关闭 |
| `cron` | Cron 任务状态变更 |
| `exec.approval.requested` | Shell 命令需要用户审批 |
| `exec.approval.resolved` | 审批决定已做出 |
| `device.pair.requested` | 来自 channel 用户的新配对请求 |
| `device.pair.resolved` | 配对已批准或拒绝 |
| `agent.summoning` | Predefined agent persona 生成中 |
| `handoff` | Agent 委派给另一个 agent（payload 中含 `from_agent`、`to_agent`、`reason`）|
| `delegation.started/completed/failed` | 委派生命周期 |
| `delegation.progress` | 委派的中间结果 |
| `delegation.announce` | 批量子 agent 结果送达父 agent |
| `team.task.created/completed/claimed/cancelled` | 团队任务生命周期 |
| `team.message.sent` | 团队内点对点消息 |
| `team.created/updated/deleted` | 团队 CRUD 通知 |
| `team.member.added/removed` | 团队成员变更 |
| `activity` | 活动审计日志条目已记录 |

---

## 示例会话

```javascript
const ws = new WebSocket("ws://localhost:18790/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "req", id: "1", method: "connect",
    params: { token: "YOUR_TOKEN", user_id: "user-123", protocol: 3 }
  }));
};

ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);

  // connect 成功后发送聊天消息
  if (frame.type === "res" && frame.id === "1" && frame.ok) {
    ws.send(JSON.stringify({
      type: "req", id: "2", method: "chat.send",
      params: { message: "Hello!", sessionKey: "user:demo" }
    }));
  }

  // 流式接收响应 token
  if (frame.type === "event" && frame.event === "chat") {
    if (frame.payload?.type === "chunk") {
      process.stdout.write(frame.payload.text ?? "");
    }
  }
};
```

---

## 下一步

- [REST API](#rest-api) — agent CRUD、skill 上传、traces 的 HTTP 端点
- [CLI 命令](#cli-commands) — 从终端进行配对和会话管理
- [词汇表](#glossary) — Session、Lane、Compaction 等核心术语

<!-- goclaw-source: 4d31fe0 | 更新: 2026-03-26 -->
