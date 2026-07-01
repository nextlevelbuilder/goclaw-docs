> 翻译自 [English version](/provider-kimi)

# Kimi Coding（Moonshot）

> 通过 OpenAI 兼容的 Coding 端点将 GoClaw 连接到 Moonshot 的 Kimi Coding 模型。

## 概述

Kimi Coding 是 Moonshot AI 的编程专用端点。GoClaw 将其作为兼容 OpenAI 的 provider（`provider_type: "kimi_coding"`）连接，复用标准的 `OpenAIProvider`，并自动接入三处 Kimi 特有的调整：**固定的 `User-Agent` 头**、**temperature 锁定**，以及 assistant 工具调用消息上的**强制 `reasoning_content`**。这些你都无需配置——GoClaw 会处理好，让你的 agent 开箱即用。

- **Provider 类型：** `kimi_coding`
- **默认模型：** `kimi-k2-turbo-preview`
- **默认 API base：** `https://api.kimi.com/coding/v1`

## 配置

Kimi Coding 从**控制台**添加（它没有静态的 `config.json` provider 块）。在 GoClaw 控制台中：

1. 进入 **Settings → Providers → Add**
2. 选择 **"Kimi Coding (Moonshot)"**——API base 已预填为 `https://api.kimi.com/coding/v1`
3. 粘贴你的 Kimi API key
4. 保存——key 在存储时使用 AES-256-GCM 加密，更改在下一次请求时生效

然后将 agent 指向它：

```json
{
  "agents": {
    "defaults": {
      "provider": "kimi",
      "model": "kimi-k2-turbo-preview"
    }
  }
}
```

> 在 agent 的 `provider` 值中使用你创建 provider 时所取的**名称**（如 `kimi`）。`provider_type`（`kimi_coding`）是从下拉框选定的不可变类型。

## 模型

| 模型 | 备注 |
|---|---|
| `kimi-k2-turbo-preview` | 默认——默认开启服务端思维 |

若 API base 留空，则默认为 `https://api.kimi.com/coding/v1`。

## 非标准行为

Kimi Coding 有三处上游严格强制的特殊之处。GoClaw 会为你全部处理。

### 1. 固定 `User-Agent`

每个请求——包括模型列表调用——都会带上固定的头 `User-Agent: claude-code/0.1.0` 发送。上游会拒绝不携带这个确切 User-Agent 的请求。GoClaw 通过 provider 的额外头自动注入它；你无需设置。

### 2. Temperature 锁定

Kimi 服务端将 `temperature` 锁定为 `1` 并拒绝任何覆盖。因此，GoClaw 对 `kimi_coding` provider **从请求体中省略 `temperature`**（与 OpenAI `o1`/`o3`/`o4` 以及 `gpt-5-mini`/`gpt-5-nano` 同样处理）。向原始 API 传入 temperature 值会返回 `HTTP 400 invalid temperature: only 1 is allowed for this model`。

### 3. 工具调用上需要 `reasoning_content`

`kimi-k2-turbo-preview` 默认开启服务端思维。当一条包含 `tool_calls` 的 assistant 消息在对话历史中被回放时，它**必须**携带 `reasoning_content` 字段——否则上游会返回 `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N`。GoClaw 在捕获到推理内容时予以保留，未捕获时则发出**空 `reasoning_content` 字符串**，从而让多轮工具循环持续正常工作。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 400 invalid temperature: only 1 is allowed for this model` | 发送了 temperature 覆盖值 | GoClaw 对 `kimi_coding` 自动省略 `temperature`；不要在原始请求中硬编码 |
| `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N` | 回放的工具调用消息缺少 `reasoning_content` | GoClaw 自动发出空 `reasoning_content`；确保 assistant 历史未被剥离该字段 |
| 每次调用都被拒绝 / 4xx | 缺少或被修改的 `User-Agent` | GoClaw 自动发送 `claude-code/0.1.0`；不要覆盖 User-Agent 头 |
| `401 Unauthorized` | API key 无效 | 在 Settings → Providers 中重新输入 Kimi key |

## 下一步

- [Provider 概览](/providers-overview) — provider 架构和重试逻辑
- [扩展思维](/extended-thinking) — 思维和 `reasoning_content` 在各 provider 间的工作方式
- [DashScope（通义千问）](/provider-dashscope) — 支持思考的阿里 Qwen 模型

<!-- goclaw-source: fabe86b3 | updated: 2026-06-29 -->
