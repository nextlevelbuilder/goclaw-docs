> 翻译自 [English version](/sharing-and-access)

# 共享与访问控制

> 控制谁可以使用你的 agent。访问权限通过所有者与非所有者的区分来执行；角色标签存储供未来使用。

## 概述

GoClaw 的权限系统确保 agent 只被合适的人访问。核心概念：

- **Owner（所有者）** 拥有 agent（完全控制，可删除、共享）
- **Default agent** 对所有用户开放（适合共享工具）
- **Share（共享）** 向他人授予访问权限，并存储角色标签

访问检查遵循 4 步流程：agent 是否存在？→ 是否为 default？→ 你是否是所有者？→ 是否已共享给你？

## agent_shares 表

共享 agent 时，会在 `agent_shares` 表中创建一条记录：

```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,           -- 存储的标签："admin"、"operator"、"viewer"、"user" 等
  granted_by VARCHAR NOT NULL,     -- 由谁授予此共享
  created_at TIMESTAMP NOT NULL
);
```

每行代表一个用户对一个 agent 的访问权限。

## 角色——已存储但尚未执行

> **重要：** 角色标签存储在 `agent_shares` 中，但**目前在运行时不执行**。今天唯一执行的区别是**所有者与非所有者**。基于角色的权限检查计划在未来版本中实现。

| 角色 | 计划权限 | 状态 |
|------|---------|------|
| **admin** | 完全控制：读、写、删除、再共享、管理团队 | 计划中 |
| **operator** | 读 + 写：运行 agent、编辑 context 文件，但不能删除/再共享 | 计划中 |
| **viewer** | 只读：运行 agent、查看文件，但不能编辑 | 计划中 |
| **user** | 基本访问权限（未指定角色时的默认值） | 仅存储 |

**目前已执行的：**
- 所有者可以共享、撤销和列出共享；非所有者不能
- 拥有共享记录的任何用户均可访问 agent（无论角色值如何）
- Default agent（`is_default = true`）对所有人开放

**目前未执行的：**
- 基于角色的写入/删除限制（针对共享用户）
- 阻止"viewer"角色持有者进行编辑
- "admin"角色不授予再共享能力

### 默认角色

共享时未指定角色，默认为 `"user"`：

```
POST /v1/agents/:id/shares
{ "user_id": "alice@example.com" }
→ 角色存储为 "user"
```

## 4 步 CanAccess 流程

访问 agent 时，GoClaw 按以下顺序检查：

```
1. Agent 是否存在？
   → 否：拒绝访问

2. 是否标记为 is_default = true？
   → 是（且存在）：允许（获得 "user" 角色）
   → 否：进入步骤 3

3. 你是否是所有者（owner_id = 你的 ID）？
   → 是：允许（获得 "owner" 角色）
   → 否：进入步骤 4

4. 是否存在针对（agent_id, 你的 ID）的 agent_shares 记录？
   → 是：允许（获得该记录中存储的角色）
   → 否：拒绝访问
```

**结果**：每次访问检查返回 `(allowed: bool, role: string)`。角色字符串会被返回，但下游处理程序目前不基于它限制行为。

## 通过 Channel Instance 访问 Predefined Agent

Predefined agent 也可以通过 `channel_instances` 访问。若 predefined agent 有一个已启用的 channel instance，其 `allow_from` 列表包含你的用户 ID，则即使没有直接共享或 default 标志，你也可以访问该 agent。

## 通过 HTTP API 共享 Agent

使用 `POST /v1/agents/:id/shares` 共享 agent。只有所有者（或 gateway 所有者级别的用户）才能共享。

**请求：**
```http
POST /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": "alice@example.com",
  "role": "operator"
}
```

**响应（201 Created）：**
```json
{ "ok": "true" }
```

若省略 `role`，默认为 `"user"`。

## 撤销访问

使用 `DELETE /v1/agents/:id/shares/:userID` 立即移除共享。

**请求：**
```http
DELETE /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares/alice@example.com
Authorization: Bearer <token>
```

**响应（200 OK）：**
```json
{ "ok": "true" }
```

## 列出共享

使用 `GET /v1/agents/:id/shares` 查看谁有访问权限。只有所有者才能列出共享。

**响应：**
```json
{
  "shares": [
    { "id": "...", "agent_id": "...", "user_id": "alice@example.com", "role": "operator", "granted_by": "owner@example.com", "created_at": "..." },
    { "id": "...", "agent_id": "...", "user_id": "bob@example.com", "role": "viewer", "granted_by": "owner@example.com", "created_at": "..." }
  ]
}
```

**Go store 方法：**
```go
shares, err := agentStore.ListShares(ctx, agentID)
```

## Dashboard 共享管理

Dashboard 提供共享 UI：

1. 打开 **Agents** → 选择你的 agent
2. 点击 **Sharing** 或 **Team** 标签页
3. 输入用户 ID（邮箱、Telegram 账号等）
4. 选择角色标签（注意：运行时尚未执行）
5. 点击 **Share**
6. 撤销：在列表中找到该用户，点击 **Remove**

更改立即生效。

## 使用场景

### 场景 1：构建 → 调优 → 部署

1. **所有者**创建 `customer-summary` agent（默认：未共享）
2. **所有者**共享给 `alice` — 她获得访问权（角色存储为 "operator"）
3. **Alice** 访问 agent 并优化设置
4. **所有者**将 agent 标记为 **default** → 所有用户现在都可以使用
5. **所有者**撤销 alice 的共享（不再需要）

### 场景 2：团队协作

1. **所有者**创建 `research-agent`
2. 共享给团队成员 — 所有人都可以访问和运行 agent
3. 共享给经理，角色为 "viewer" — 经理可以访问（角色执行计划中）
4. 团队迭代；所有者控制共享和删除

### 场景 3：共享工具

1. **所有者**创建 `web-search` agent
2. 标记为 **default**（无需显式共享）
3. 所有用户都可以使用；所有者仍可编辑
4. 若**所有者**取消 default 标记，只有所有者可以使用

## ListAccessible — 查找你的 Agent

用户加载 agent 列表时，GoClaw 只返回他们可以访问的 agent：

```go
agents, err := agentStore.ListAccessible(ctx, userID)
// 返回：
// - userID 拥有的所有 agent
// - 所有 default agent
// - 显式共享给 userID 的所有 agent
// - 通过 channel_instances 可访问的 predefined agent
```

这驱动 Dashboard 中的"My Agents"列表。

## 最佳实践

| 实践 | 原因 |
|------|------|
| **通过显式用户 ID 共享** | 清晰的审计记录，便于追踪谁有访问权限 |
| **不再需要时撤销共享** | 减少混乱，提高安全性 |
| **谨慎使用 default** | 适合工具类（web 搜索、记忆）；不适合敏感 agent |
| **通过 ListShares 跟踪共享** | 特别是多团队 agent，避免混乱 |

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 用户看不到 agent | 检查：(1) agent 存在，(2) 用户有共享记录，或 (3) agent 是 default |
| 撤销后用户仍有访问权 | 可能 agent 是 **default**；先取消 default 标记，再撤销 |
| 忘记谁有访问权 | 使用 `GET /v1/agents/:id/shares` 或 Dashboard → Sharing 标签审计 |
| 角色限制不起作用 | 基于角色的执行计划中，尚未实现——今天所有共享用户具有相同访问权限 |

## 下一步

- [User Overrides — 让用户按 agent 自定义 LLM provider/model](/user-overrides)
- [System Prompt Anatomy — 权限如何影响 system prompt 各部分](/system-prompt-anatomy)
- [Creating Agents — 创建 agent 并立即共享](/creating-agents)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
