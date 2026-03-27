> 翻译自 [English version](#provider-deepseek)

# DeepSeek

> 在 GoClaw 中运行 DeepSeek 强大的推理模型，完整支持 reasoning_content 流式传输。

## 概述

GoClaw 通过 DeepSeek 的 OpenAI 兼容 API，使用通用 `OpenAIProvider` 连接。DeepSeek 的推理模型（R1 系列）在标准响应内容之外返回单独的 `reasoning_content` 字段。GoClaw 将其捕获为响应中的 `Thinking`，并在后续 assistant 消息中以 `reasoning_content` 回传——DeepSeek 要求这样做以保证多轮推理的正确性。

## 前提条件

- 从 [platform.deepseek.com](https://platform.deepseek.com) 获取 DeepSeek API key
- DeepSeek 账户中有足够额度

## config.json 配置

```json
{
  "providers": {
    "deepseek": {
      "api_key": "sk-...",
      "api_base": "https://api.deepseek.com/v1"
    }
  }
}
```

## 控制台配置

在控制台进入 **Settings → Providers → DeepSeek**，输入 API key 和 base URL。使用 AES-256-GCM 加密存储。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| deepseek-chat | 64k tokens | 通用对话模型（DeepSeek V3） |
| deepseek-reasoner | 64k tokens | R1 推理模型，返回 reasoning_content |

## reasoning_content 支持

DeepSeek 的 R1 模型在响应 delta 中以单独的 `reasoning_content` 字段返回思考过程。GoClaw 在流式和非流式模式下均处理：

- **流式：** 捕获 `delta.reasoning_content` 并作为 `StreamChunk{Thinking: ...}` 回调触发，然后存储在 `ChatResponse.Thinking` 中
- **非流式：** `message.reasoning_content` 映射到 `ChatResponse.Thinking`

在下一轮中，GoClaw 自动将前一条 assistant 的思考内容以 `reasoning_content` 包含在请求消息中——DeepSeek 要求这样做以维持跨轮次的推理链。

启用推理模型：

```json
{
  "provider": "deepseek",
  "model": "deepseek-reasoner"
}
```

也可设置 `thinking_level` 控制推理力度（映射到 `reasoning_effort`）：

```json
{
  "options": {
    "thinking_level": "high"
  }
}
```

## 工具调用

DeepSeek 支持标准 OpenAI 工具格式的 function calling。工具调用参数以 JSON 字符串形式到达，GoClaw 在传递给工具处理器前进行解析。

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 在 platform.deepseek.com 验证 key |
| `HTTP 402` | 额度不足 | 为 DeepSeek 账户充值 |
| 推理内容缺失 | 使用了 deepseek-chat 而非 deepseek-reasoner | 将模型切换为 `deepseek-reasoner` |
| 多轮推理质量下降 | reasoning_content 未回传 | GoClaw 自动处理——确保使用内置 agent 循环 |
| `HTTP 429` | 频率限制 | GoClaw 自动指数退避重试 |

## 下一步

- [Groq](#provider-groq) — 开源模型的超快推理
- [Gemini](#provider-gemini) — Google Gemini 模型
- [概览](#providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
