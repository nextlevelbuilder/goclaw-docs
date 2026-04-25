> 翻译自 [English version](/provider-codex)

# Codex / ChatGPT（OAuth）

通过 OpenAI Responses API 和 OAuth 认证，使用 ChatGPT 订阅驱动 GoClaw agent。

## 概述

Codex provider 让你无需单独购买 API key，即可将现有的 ChatGPT Plus 或 Pro 订阅用于 GoClaw。GoClaw 通过 OpenAI 的 PKCE 流程进行 OAuth 认证，将 refresh token 安全地存储在数据库中，并在 access token 过期前自动刷新。

底层实现中，GoClaw 使用 **OpenAI Responses API**（`POST /codex/responses`）而非标准 chat completions 端点。该 API 支持流式传输、工具调用和推理输出。provider 默认注册为 `openai-codex`。

## 认证流程

1. 在 GoClaw Web UI 中触发 OAuth 流程（Settings → Providers → ChatGPT）
2. GoClaw 打开浏览器访问 `https://auth.openai.com/oauth/authorize`
3. 使用 ChatGPT 账户登录并授权访问
4. OpenAI 携带授权码重定向至 `http://localhost:1455/auth/callback`
5. GoClaw 用授权码换取 access + refresh token，并加密存储在数据库中
6. 此后 GoClaw 自动使用和刷新 token，无需手动操作

## 配置

不需要手动在 `config.json` 中添加此 provider，而是：

1. 启动 GoClaw：`./goclaw`
2. 打开 Web 控制台
3. 进入 **Settings → Providers**
4. 点击 **Connect ChatGPT**
5. 在浏览器中完成 OAuth 流程

连接后，将 agent 设置为使用该 provider：

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex"
    }
  }
}
```

## 模型

Codex provider 支持 Responses API 提供的模型：

| 模型 | 备注 |
|---|---|
| `gpt-5.3-codex` | 默认；针对 agentic 编程任务优化 |
| `o3` | 强推理模型 |
| `o4-mini` | 更快的推理，成本更低 |
| `gpt-4o` | 通用多模态 |

在 agent 配置的 `model` 字段或每次请求中传入模型名称。

## 思考 / 推理

对于推理模型（如 `o3`、`o4-mini`），设置 `thinking_level` 控制推理力度：

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "o3",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw 将其转换为 Responses API 的 `reasoning.effort` 字段（`low`、`medium`、`high`）。

## Wire 格式说明

Codex provider 使用 Responses API 格式，而非 chat completions：

- 系统提示变为请求体中的 `instructions`
- 消息转换为 `input` 数组格式
- 工具调用使用 `function_call` 和 `function_call_output` 条目类型
- 工具调用 ID 以 `fc_` 为前缀（Responses API 要求）
- 始终设置 `store: false`（GoClaw 管理自己的对话历史）

这些转换对调用方透明——无论哪个 provider 处于激活状态，与 GoClaw 的交互方式保持一致。

## 示例

**OAuth 配置完成后的 agent 配置：**

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex",
      "max_tokens": 8192
    }
  }
}
```

**使用 o3 进行推理：**

```json
{
  "agents": {
    "list": {
      "reasoning-agent": {
        "provider": "openai-codex",
        "model": "o3",
        "thinking_level": "high"
      }
    }
  }
}
```

## Codex OAuth 池

若你有多个 ChatGPT 账户（如个人账户和工作账户），可以将它们池化，让 GoClaw 跨账户分发请求。这对于分散各账户用量或在某个账户达到限制时自动故障转移非常有用。

### 工作原理

将每个 ChatGPT 账户连接为独立的 `chatgpt_oauth` provider。其中一个 provider 为**池所有者**——持有路由配置。其他 provider 为**池成员**，列在 `extra_provider_names` 中。

### Provider 级配置（池所有者）

通过 `POST /v1/providers` 创建或更新 provider 时，设置 `settings` 字段：

```json
{
  "name": "openai-codex",
  "provider_type": "chatgpt_oauth",
  "settings": {
    "codex_pool": {
      "strategy": "round_robin",
      "extra_provider_names": ["codex-work", "codex-shared"]
    }
  }
}
```

`strategy` 控制请求在池中的分发方式：

| 策略 | 行为 |
|----------|----------|
| `round_robin` | 在主账户和所有备用 provider 间轮询请求 |
| `priority_order` | 按顺序尝试 provider——先主账户，再依次尝试备用账户（默认） |

> **迁移说明 (v3.11.0)：** 在 v3.11.0 之前，API 对默认路由配置返回 `primary_first` 策略。从 v3.11.0 开始，公开接口标准化为 `priority_order`（行为完全相同——优先使用主账号，按顺序回退）。为保持向后兼容，请求体仍接受旧值（`primary_first`、`manual`、`""`），读取时归一化为 `priority_order`。

`extra_provider_names` 是成员权威列表。已列在其他池的 `extra_provider_names` 中的 provider 不能管理自己的池。

### Agent 级覆盖

单个 agent 可通过 `other_config` 中的 `chatgpt_oauth_routing` 覆盖池行为：

```json
{
  "other_config": {
    "chatgpt_oauth_routing": {
      "override_mode": "custom",
      "strategy": "priority_order"
    }
  }
}
```

`override_mode` 选项：

| 值 | 行为 |
|-------|----------|
| `inherit` | 使用主 provider 的 `codex_pool` 配置（未设置时默认） |
| `custom` | 应用此 agent 自己的策略覆盖 |

### 路由说明

- 可重试的上游失败（HTTP 429、5xx）会自动在同一请求中转移至下一个可用账户。
- OAuth 登录和登出是 per-provider 的——每个账户独立认证。
- 池仅在 agent 的 provider 为 `chatgpt_oauth` 类型时激活，非 Codex provider 不受影响。
- Round-robin 计数器按模态单独跟踪——chat 请求和图片生成请求在各自独立的计数器上轮转。图片生成请求通过 `create_image` 链处理，计入单独的图片计数器。

### 池活动端点

要查看某个 agent 的路由决策和各账户健康状态，调用：

```
GET /v1/agents/{id}/codex-pool-activity
```

响应结构参见 [REST API](/rest-api)。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `401 Unauthorized` | Token 已过期或被撤销 | 通过 Settings → Providers → ChatGPT 重新认证 |
| OAuth 回调失败 | 端口 1455 被占用 | 确保认证期间端口 1455 未被其他程序占用 |
| `model not found` | 模型不在你的订阅中 | 检查 ChatGPT 计划；部分模型需要 Pro |
| 重启后 provider 不可用 | Token 未持久化 | GoClaw 启动时自动从数据库加载 token；检查数据库连通性 |
| 响应中出现 phase 字段 | `gpt-5.3-codex` 返回 `commentary` + `final_answer` 阶段 | GoClaw 自动处理；两个阶段均已捕获 |

## 下一步

- [自定义 Provider](/provider-custom) — 连接任意 OpenAI 兼容 API，包括本地模型
- [Claude CLI](/provider-claude-cli) — 使用 Claude 订阅替代

<!-- goclaw-source: 29457bb3 | 更新: 2026-04-25 -->
