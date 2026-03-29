> 翻译自 [English version](/quick-start)

# 快速开始

> 5 分钟内完成你的第一次 AI agent 对话。

## 前提条件

已完成[安装](/installation)，gateway 正在 `http://localhost:18790` 运行。

## 第一步：打开 Dashboard 并完成初始设置

打开 `http://localhost:3000`（Docker）或 `http://localhost:5173`（裸机开发服务器）并登录：

- **用户 ID：** `system`
- **Gateway Token：** 在 `.env.local`（或 Docker 的 `.env`）中查找 `GOCLAW_GATEWAY_TOKEN`

首次登录时，dashboard 会自动跳转到**设置向导**。向导引导你完成：

1. **添加 LLM provider** — 从 OpenRouter、Anthropic、OpenAI、Groq、DeepSeek、Gemini、Mistral、xAI、MiniMax、DashScope（阿里云模型服务 — Qwen API）、Bailian（阿里云模型服务 — Coding Plan）、GLM（智谱）等中选择，输入 API key 并选择模型。
2. **创建第一个 agent** — 填写名称、系统提示词，并选择上面配置的 provider/模型。
3. **连接 channel**（可选）— 绑定 Telegram、Discord、WhatsApp、Zalo、Larksuite 或 Slack。

> **提示：** 点击向导顶部的 **"跳过设置，直接进入 dashboard"** 可跳过向导，稍后手动配置。Channel 步骤（第 3 步）也有 **Skip** 按钮，如果暂时不需要 Telegram/Discord 等，可以之后再添加。

完成向导后即可开始聊天。

## 第二步：添加更多 Provider（可选）

后续添加 provider：

1. 进入侧边栏 **SYSTEM** 下的 **Providers**
2. 点击 **Add Provider**
3. 选择 provider，输入 API key，选择模型

## 第三步：开始聊天

> **注意：** 在发起 API 或 WebSocket 调用前，确保在设置向导（第一步）中至少添加了一个 provider。没有 provider 时请求会返回 `no provider API key found`。

> **提示：** 验证 GoClaw 是否运行：`curl http://localhost:18790/health`

### 通过 Dashboard

进入侧边栏 **CORE** 下的 **Chat**，选择你在设置时创建的 agent。

要创建更多 agent，进入 **Agents**（同在 **CORE** 下）并点击 **Create Agent**。

### 通过 HTTP API

HTTP API 兼容 OpenAI 格式。在 `model` 字段使用 `goclaw:<agent-key>` 格式指定目标 agent：

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "X-GoClaw-User-Id: system" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "goclaw:your-agent-key",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

将 `YOUR_GATEWAY_TOKEN` 替换为 `.env.local`（裸机）或 `.env`（Docker）中的值，`your-agent-key` 替换为 Agents 页面显示的 agent key（例如 `goclaw:my-assistant`）。

> **Agent 标识符提示：** Dashboard 为每个 agent 显示两个标识符——`agent_key`（可读的显示名称）和 `id`（UUID）。HTTP API 调用在 `model` 字段使用 `agent_key`；WebSocket `chat.send` 使用 agent 的 `id`（UUID）作为 `agentId`。两者都在 Agents 页面可见。

### 通过 WebSocket

用任意 WebSocket 客户端连接：

```bash
# 使用 websocat（安装：cargo install websocat）
websocat ws://localhost:18790/ws
```

**首先**，发送 `connect` 帧进行认证：

```json
{"type":"req","id":"1","method":"connect","params":{"token":"YOUR_GATEWAY_TOKEN","user_id":"system"}}
```

**然后**，发送聊天消息：

```json
{"type":"req","id":"2","method":"chat.send","params":{"agentId":"your-agent-key","message":"Hello! What can you do?"}}
```

> **提示：** 省略 `agentId` 时，GoClaw 使用默认 agent。

**响应：**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "runId": "uuid-string",
    "content": "Hello! How can I help you today?",
    "usage": { "input_tokens": 150, "output_tokens": 25 }
  }
}
```

仅当 agent 返回生成的媒体文件时，`media` 字段才出现在 payload 中。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `no provider API key found` | 在 Dashboard 中添加 provider 和 API key |
| WebSocket 提示 `unauthorized` | 检查 `connect` 帧中的 `token` 是否与 `GOCLAW_GATEWAY_TOKEN` 匹配 |
| Dashboard 显示空白页 | 确保 Web UI 服务正在运行 |

## 下一步

- [配置](/configuration) — 精细调整你的设置
- [Dashboard 导览](/dashboard-tour) — 探索可视化界面
- [Agent 详解](/agents-explained) — 了解 agent 类型和上下文

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
