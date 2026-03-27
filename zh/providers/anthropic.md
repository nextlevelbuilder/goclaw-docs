> 翻译自 [English version](#provider-anthropic)

# Anthropic

> GoClaw 原生 Claude 集成——直接基于 Anthropic HTTP+SSE API 构建，完整支持扩展思考和 prompt 缓存。

## 概述

Anthropic provider 是一个一流的手写 HTTP 客户端（非第三方 SDK）。它直接调用 Anthropic Messages API，通过 SSE 处理流式传输、工具调用回传和扩展思考块。默认模型为 `claude-sonnet-4-5-20250929`。Prompt 缓存始终启用——GoClaw 在每次请求中设置 `cache_control: ephemeral`。

## 前提条件

- 从 [console.anthropic.com](https://console.anthropic.com) 获取 Anthropic API key
- 所用模型需有足够的配额

## config.json 配置

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-api03-..."
    }
  }
}
```

使用自定义 base URL（如代理）：

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-...",
      "api_base": "https://your-proxy.example.com/v1"
    }
  }
}
```

## 控制台配置

在 GoClaw 控制台进入 **Settings → Providers → Anthropic**，输入 API key。key 在存储前使用 AES-256-GCM 加密。修改立即生效，无需重启。

## 支持的模型

| 模型 | 上下文窗口 | 备注 |
|---|---|---|
| claude-opus-4-5 | 200k tokens | 最强大，成本最高 |
| claude-sonnet-4-5-20250929 | 200k tokens | 默认——速度与质量最佳平衡 |
| claude-haiku-4-5 | 200k tokens | 最快，成本最低 |
| claude-opus-4 | 200k tokens | 上一代 |
| claude-sonnet-4 | 200k tokens | 上一代 |

要为特定 agent 覆盖默认模型，在 agent 配置中设置 `model`。

## 扩展思考

Anthropic provider 实现 `SupportsThinking() bool` 并返回 `true`。当请求中设置 `thinking_level` 时，GoClaw 自动启用 Anthropic 的扩展思考功能。

各思考级别对应的 token 预算：

| 级别 | 预算 |
|---|---|
| `low` | 4,096 tokens |
| `medium` | 10,000 tokens（默认） |
| `high` | 32,000 tokens |

启用思考时：
- 发送 `anthropic-beta: interleaved-thinking-2025-05-14` 头
- 移除 temperature（Anthropic 要求）
- 若当前 `max_tokens` 不足，自动提升至 `budget + 8192`
- 思考块被保留并在工具调用循环中回传

启用思考的 agent 配置示例：

```json
{
  "options": {
    "thinking_level": "medium"
  }
}
```

## Prompt 缓存

Prompt 缓存始终启用。GoClaw 在每次请求体中设置 `cache_control: ephemeral`。`Usage` 响应包含 `cache_creation_input_tokens` 和 `cache_read_input_tokens`，可在追踪中监控缓存命中率。

## 工具调用

Anthropic 使用与 OpenAI 不同的工具 schema 格式，GoClaw 自动转换：
- 工具以 `input_schema`（而非 `parameters`）发送
- 工具结果包装在 `tool_result` 内容块中
- 思考启用时，原始内容块（包括思考签名）被保留，并在后续工具循环迭代中回传——这是 Anthropic API 的要求

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `HTTP 401` | API key 无效 | 检查 key 是否以 `sk-ant-` 开头 |
| 思考时出现 `HTTP 400` | temperature 与思考同时设置 | GoClaw 自动移除 temperature；不要在原始请求中硬编码 |
| `HTTP 529` | Anthropic 过载 | 重试逻辑会处理；等待后重试 |
| 思考块未出现 | 模型不支持思考 | 使用 claude-sonnet-4-5 或 claude-opus-4-5 |
| token 成本高 | 缓存未命中 | 确保系统提示在各请求间保持稳定 |

## 下一步

- [OpenAI](#provider-openai) — GPT-4o 和 o 系列推理模型
- [概览](#providers-overview) — provider 架构和重试逻辑

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
