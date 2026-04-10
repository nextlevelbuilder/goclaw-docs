> 翻译自 [English version](/user-overrides)

# 用户覆盖（User Overrides）

> **部分实现的功能。** 数据库 schema 和 store API 已存在，但运行时尚未应用覆盖配置。本页记录计划中的行为和当前的 store API。

---

> **警告：** 用户覆盖**在 agent 执行期间不生效**。`GetUserOverride()` store 方法已存在，但未在 agent 执行路径中调用。在此功能完全集成之前，设置覆盖对实际使用的 LLM 没有任何影响。

---

## 概述

用户覆盖的目的是让个别用户在不影响他人的情况下，为某个 agent 更改 LLM provider 或模型。例如：Alice 偏好 GPT-4o，而 Bob 继续使用 Claude。

**用户覆盖**是每用户、每 agent 的设置，含义是："当*此用户*运行*此 agent* 时，使用*此 provider/model*，而非 agent 的默认值。"

**当前状态：** Schema 和 store 方法已实现，运行时集成待完成。

## user_agent_overrides 表

Schema 已存在并存储覆盖配置：

```sql
CREATE TABLE user_agent_overrides (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,          -- 如 "anthropic"、"openai"
  model VARCHAR NOT NULL,             -- 如 "claude-sonnet-4-6"、"gpt-4o"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- **agent_id + user_id** 唯一：每个用户每个 agent 只能有一条覆盖记录
- **provider**：LLM provider（必须在 gateway 中已配置）
- **model**：该 provider 下的模型名称

## 计划中的优先级链

> **注意：** 此优先级链是计划中的行为，目前尚未实现——运行时始终使用 agent 配置的 provider/model。

```
1. 是否存在用户覆盖？
   → 是：使用 user_agent_overrides 中的 provider + model  [计划中——未实现]
   → 否：进入步骤 2

2. Agent 配置是否有 provider + model？
   → 是：使用 agent 默认值  [已激活]
   → 否：进入步骤 3

3. 是否有全局默认 provider + model？
   → 是：使用全局默认值  [已激活]
   → 否：报错（未配置 LLM）
```

## Store API（当前可用）

Store 方法已实现，可直接使用：

### 设置覆盖

```go
override := &store.UserAgentOverrideData{
  AgentID:  agentID,
  UserID:   "alice@example.com",
  Provider: "openai",
  Model:    "gpt-4o",
}
err := agentStore.SetUserOverride(ctx, override)
```

### 获取覆盖

```go
override, err := agentStore.GetUserOverride(ctx, agentID, userID)
if override != nil {
  // override.Provider, override.Model 可用
} else {
  // 未存储覆盖
}
```

### 删除覆盖

> **注意：** `DeleteUserOverride()` 已在 store 接口中定义，但尚未在 PostgreSQL store 中实现。调用时将返回错误或空操作，具体取决于构建版本。

```go
// 计划中——pg store 尚未实现：
err := agentStore.DeleteUserOverride(ctx, agentID, userID)
```

## WebSocket RPC — 计划中

> **注意：** 目前不存在用于用户覆盖的 WebSocket RPC 方法。以下是计划中的接口：

```json
{
  "method": "agents.override.set",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

此方法目前在 gateway 中不存在。

## Dashboard 用户设置 — 计划中

用于管理覆盖的 Dashboard **Agent Preferences** UI 已计划，但尚未上线。

## 使用场景（计划中）

以下使用场景描述了运行时集成完成后的预期行为。

### 场景 1：成本控制
- Agent 默认使用昂贵的 GPT-4 以获得最佳质量
- 预算有限的用户可以覆盖为更便宜的 Claude 3 Haiku

### 场景 2：个人偏好
- 研究团队偏好 Claude 做分析
- 营销团队偏好 GPT-4 写文案
- 同一个 agent，两个团队，两种配置

### 场景 3：功能测试
- 团队想在某个 agent 上测试新模型
- 选择加入的用户设置覆盖；其他人继续使用稳定版本

## 支持的 Provider 与模型

查看你的 gateway 配置以了解哪些 provider/model 可用。常见的有：

| Provider | 模型 |
|----------|------|
| **anthropic** | claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6 |
| **openai** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **openai-compat** | 取决于你的自定义 provider（如本地 Ollama） |

如不确定哪些已启用，请询问管理员。

## 用户身份解析

Agent 运行时，GoClaw 必须确定使用哪个 tenant 用户身份进行凭据查询。这与 LLM 覆盖无关——它是关于从传入的 channel 消息中解析*凭据用户*。

`UserIdentityResolver` 接口（位于 `internal/agent/user_identity_resolver.go`）处理此操作：

```go
type UserIdentityResolver interface {
    ResolveTenantUserID(ctx context.Context, channelType, senderID string) (string, error)
}
```

### 解析逻辑

Agent 循环在工具执行前调用 `resolveCredentialUserID()`：

| 场景 | 解析方式 |
|----------|-----------|
| **DM / HTTP / cron** | 通过 channel 类型解析 `UserID` → 使用解析后的 ID，回退到原始 `UserID` |
| **群聊 — 个人发送者** | 先解析数字发送者 ID（去除 `senderID\|suffix` 格式） |
| **群聊 — 群组联系人** | 从 `group:{channel}:{chatID}` 格式提取 `chatID`，通过联系人 store 解析 |

这确保跨 channel 联系人（例如同一人在 Telegram 和 WhatsApp 上）能解析到相同的 tenant 用户身份，实现一致的凭据查询。

### 影响范围

- agent 可访问哪些存储的凭据（API key、token）
- 依赖 tenant 用户身份的每用户工具权限
- **不影响**使用哪个 LLM 模型或 provider（见上文）

## 下一步

- [System Prompt Anatomy — 模型选择如何影响 system prompt 大小](/system-prompt-anatomy)
- [Sharing and Access — 控制谁可以访问 agent](/sharing-and-access)
- [Creating Agents — 创建 agent 时设置默认 provider/model](/creating-agents)

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
