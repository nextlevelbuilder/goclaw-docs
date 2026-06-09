> 翻译自 [English version](/usage-quota)

# 用量与配额

> 追踪每个 agent 和会话的 token 消耗，并在小时、天、周窗口内对每用户请求数量执行限制。

## 概述

GoClaw 提供两个相关但不同的功能：

- **用量追踪** — 每个 agent/会话消耗了多少 token，可通过 Dashboard 或 WebSocket 查询。
- **配额执行** — 可选的每用户/群组消息限制（如 Telegram 用户每小时 10 次请求），基于 traces 表。

只要连接了 PostgreSQL，两者始终可用。配额执行通过 config 按需开启。

---

## 用量追踪

Token 计数在 agent 循环运行时累积到会话存储中。每次 LLM 调用都会增加会话的 `input_tokens` 和 `output_tokens` 总计。可通过两个 WebSocket 方法查询此数据。

### `usage.get` — 按会话记录

```json
{
  "type": "req",
  "id": "1",
  "method": "usage.get",
  "params": {
    "agentId": "my-agent",
    "limit": 20,
    "offset": 0
  }
}
```

`agentId` 是可选的 — 省略则获取所有 agent 的记录。结果按最新优先排序。

响应：

```json
{
  "records": [
    {
      "agentId": "my-agent",
      "sessionKey": "agent:my-agent:user_telegram_123",
      "model": "claude-sonnet-4-5",
      "provider": "anthropic",
      "inputTokens": 14200,
      "outputTokens": 3100,
      "totalTokens": 17300,
      "timestamp": 1741234567000
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `usage.summary` — 按 agent 汇总

```json
{ "type": "req", "id": "2", "method": "usage.summary" }
```

响应：

```json
{
  "byAgent": {
    "my-agent": {
      "inputTokens": 892000,
      "outputTokens": 210000,
      "totalTokens": 1102000,
      "sessions": 37
    }
  },
  "totalRecords": 37
}
```

两个响应中均排除零 token 的会话。

### HTTP REST API — 从快照获取分析数据

GoClaw 还暴露了历史用量分析的 REST API，基于 `usage_snapshots` 表（按小时预聚合）。如果设置了 `gateway.token`，所有端点均需要 Bearer token。

| 端点 | 描述 |
|----------|-------------|
| `GET /v1/usage/timeseries` | 按时间的 token 和请求数，默认按小时分桶 |
| `GET /v1/usage/breakdown` | 按 `provider`、`model` 或 `channel` 分组的聚合细分 |
| `GET /v1/usage/summary` | 含差值统计的当前与上一周期摘要对比 |

**常用查询参数：**

| 参数 | 示例 | 说明 |
|-----------|---------|-------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339，timeseries/breakdown 必填 |
| `to` | `2026-03-15T23:59:59Z` | RFC 3339，timeseries/breakdown 必填 |
| `group_by` | `hour`、`provider`、`model`、`channel` | 各端点默认值不同 |
| `agent_id` | UUID | 按 agent 过滤 |
| `provider` | `anthropic` | 按 provider 过滤 |
| `model` | `claude-sonnet-4-5` | 按模型过滤 |
| `channel` | `telegram` | 按 channel 过滤 |

**`GET /v1/usage/summary`** 额外支持 `period`：

| `period` 值 | 描述 |
|----------------|-------------|
| `24h`（默认） | 最近 24 小时 vs 前 24 小时 |
| `today` | 当日 vs 前一天 |
| `7d` | 最近 7 天 vs 前 7 天 |
| `30d` | 最近 30 天 vs 前 30 天 |

timeseries 端点通过直接查询实时 traces 来填补当前未完整小时的数据，确保最新数据点始终最新。

---

## 版本并发限制（子 Agent）

从 v3（#600）起，当前**版本（edition）**对 tenant 范围的子 agent 并发施加限制，防止单个 tenant 独占子 agent 资源。

| 版本字段 | Lite 默认值 | Standard 默认值 | 描述 |
|---|---|---|---|
| `MaxSubagentConcurrent` | 2 | 无限制（0） | 每个 tenant 并行运行的最大子 agent 数 |
| `MaxSubagentDepth` | 1 | 使用配置默认值 | 最大嵌套深度（1 = 子 agent 不能再启动子 agent） |

值为 `0` 表示无限制。Lite 版本是受限预设；Standard 版本不设并发上限。

当某次 spawn 请求超出 `MaxSubagentConcurrent` 时，GoClaw 拒绝该 spawn 并向父 agent 返回错误。当 `MaxSubagentDepth` 被超出时，通过 `team_tasks` 进行的嵌套委托将被阻止（`SubagentDenyAlways`）。

这些限制是版本级别的——适用于该 GoClaw 实例上的每个 tenant，与每 agent 的预算设置无关。

---

## 配额执行

配额针对 `traces` 表进行检查（仅顶层 trace — 子 agent 委托不计入用户配额）。计数在内存中缓存 60 秒，避免每次请求都查询数据库。

### 配置

在 `config.json` 的 `gateway` 中添加 `quota` 块：

```json
{
  "gateway": {
    "quota": {
      "enabled": true,
      "default": { "hour": 20, "day": 100, "week": 500 },
      "channels": {
        "telegram": { "hour": 10, "day": 50 }
      },
      "providers": {
        "anthropic": { "day": 200 }
      },
      "groups": {
        "group:telegram:-1001234567": { "hour": 5, "day": 20 }
      }
    }
  }
}
```

所有限制均为可选 — 值为 `0`（或省略字段）表示不限制。

**优先级顺序（最具体优先）：** `groups` > `channels` > `providers` > `default`

| 字段 | Key 格式 | 描述 |
|-------|-----------|-------------|
| `default` | — | 不匹配更具体规则的任何用户的回退 |
| `channels` | Channel 名称，如 `"telegram"` | 适用于该 channel 上的所有用户 |
| `providers` | Provider 名称，如 `"anthropic"` | 使用该 LLM provider 时适用 |
| `groups` | 用户/群组 ID，如 `"group:telegram:-100123"` | 每用户或每群组覆盖 |

### 超出配额时的行为

channel 层在将消息分发给 agent 前检查配额。如果用户超出限制，agent 永远不会运行，用户收到错误消息。响应包含超出的窗口和当前计数：

```
Quota exceeded: 10/10 requests this hour. Try again later.
```

### `quota.usage` — Dashboard 视图

```json
{ "type": "req", "id": "3", "method": "quota.usage" }
```

配额启用时的响应：

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [
    {
      "userId": "user:telegram:123456",
      "hour": { "used": 3, "limit": 10 },
      "day":  { "used": 47, "limit": 100 },
      "week": { "used": 200, "limit": 500 }
    }
  ]
}
```

`entries` 上限为 50 个用户（按周请求数前 50 名）。

配额禁用（`"enabled": false`）时，响应仍包含今日汇总统计（`requestsToday`、`inputTokensToday`、`costToday` 等）— `entries` 数组为空且 `"enabled": false`。

---

## AI 预算用量上限

独立于上面 channel 层的请求配额，GoClaw 有一套**基于 token 和成本的上限系统**，对 LLM provider 支出本身执行限制。请求配额计数的是消息，而用量上限计数的是 *token 和美元成本*，并且不仅适用于主 agent 回合，还适用于 GoClaw 代表某租户进行的每一次计费 LLM 调用。

上限以 **策略（policy）** 的形式存储在 PostgreSQL 中（迁移 `000070`–`000072`），通过 REST API 管理。一旦某租户存在至少一条策略，它们就始终生效 —— 没有全局开/关 config 标志。

### 策略模型

一条上限策略回答：*对于此作用域、在此时间窗口内，允许多少 token 和/或多少成本？*

**作用域维度** —— 每条策略都可以将任意维度留空（NULL），表示"匹配所有"：

| 维度 | 含义 |
|-----------|---------|
| `tenant_id` | 始终设置 —— 每条策略属于一个租户 |
| `agent_id` | 限制单个 agent（未设置 = 租户内所有 agent） |
| `provider_id` | 限制单个已配置的 LLM provider 记录 |
| `provider_type` | 限制一个 provider 系列，如 `anthropic`、`openai` |
| `model_id` | 限制单个模型，如 `claude-sonnet-4-5` |

**窗口类型**（`window`）：`hour`、`day`、`week` 或 `month`。窗口对齐到 UTC 日历边界 —— `day` 从 00:00 UTC 开始，`week` 从周一开始，`month` 从 1 号开始。

**限制** —— 一条策略必须设置 `max_tokens`、`max_cost_micros` 或两者：

| 字段 | 单位 |
|-------|------|
| `max_tokens` | 总 token（input + output + cache read + cache write） |
| `max_cost_micros` | 成本，以**微美元**计（1 USD = 1,000,000 微美元）。API 也接受 `max_cost_usd` 作为便利项并自动转换 |

**多条匹配策略如何组合。** 当请求到来时，GoClaw 找出 scope 匹配的*每一条*已启用策略（NULL 维度匹配任意值，已设置的维度必须与请求相等）。一个请求必须满足**所有**匹配的策略 —— 最严格的那条获胜。`priority` 字段（数字越小越先评估，默认 `100`）控制评估顺序，从而决定命中上限时哪条策略被报告为阻止者。

### 预留 + 计数器执行

上限采用 **reserve-then-settle（先预留后结算）** 模型，使并发调用无法在一个窗口内超支：

1. **Preflight（预留）** —— 在 LLM 调用之前，GoClaw 估算 token 用量（如有匹配策略含成本上限则还估算成本），然后原子地将其加到每条策略的 per-window 计数器上。若预留会使 `used + reserved + estimate` 超过某策略的 `max_tokens` 或 `max_cost_micros`，调用在运行前被**阻止**。
2. **Reconcile（结算）** —— 调用返回后，预留被替换为来自 provider usage 响应的*实际* token 和成本。预留量被释放，已用量被记录。失败的调用结算为 0（预留被释放），除非收到了部分响应。

成本估算需要模型的价格。若一条含成本上限的策略匹配但模型价格未知，调用被**阻止**，原因为 `pricing_unknown` —— 参见 [成本追踪 → 模型定价](/cost-tracking) 了解如何填充价格。

### 上限同样适用于辅助 LLM 调用

用量上限在**每一次计费 LLM 调用**上执行，而不仅是面向用户的 agent 回合。这包括 GoClaw 内部进行的辅助调用：

- 会话标题生成
- 意图分类
- 循环中和历史压缩
- Memory flush
- 知识图谱抽取
- Memory 合并（dreaming / episodic worker）
- Vault enrichment
- Provider 验证和 summoner 重生成

这些调用各自针对相同的策略进行预留和结算，因此一个严格的 `day` token 上限也会节流后台工作，而不仅是聊天回复。

> **Subscription / OAuth provider 豁免。** 上限仅适用于按 API key 计费的 provider。按固定费率或订阅计费的 provider（Claude CLI、ChatGPT OAuth、Bailian、ACP、Ollama）会被跳过，未配置 API key 的 provider 同样如此。

### Agent 月度预算桥接

旧的 per-agent `budget_monthly_cents` 字段（参见 [成本追踪 → 月度预算执行](/cost-tracking)）会自动镜像到上限系统中。迁移 `000072` 为每个 `budget_monthly_cents` 为正值的 agent 创建一条受管理的 `month` 窗口成本上限策略：

- `max_cost_micros` = `budget_monthly_cents × 10,000`（分 → 微美元）
- `source` = `agent_budget_monthly_cents`，`priority` = `90`

这些桥接策略是**受管理（managed）**的 —— REST API 拒绝编辑或删除它们（返回 `409 Conflict`）。请改为调整 agent 的 `budget_monthly_cents`。手动创建的策略的 `source` = `manual`。

### 命中上限时会发生什么

当预留被拒绝时，GoClaw 从该 LLM 调用返回 `usage cap exceeded` 错误。对于主 agent 回合，这表现为一次失败的运行 —— agent 不产生回复。一个 `block` 决策也会写入事件日志（见下文），记录哪条策略以及触发原因（`cap_exceeded` 或 `pricing_unknown`）。

### 决策追踪

每个上限决策记录在两处：

- **`usage_cap_events`** —— 一个仅追加（append-only）的审计日志，记录 `allow` / `block` / `skip` 决策，含策略、预留 key、估算/实际 token 和成本，以及原因。可通过 events 端点查询。
- **Trace 元数据** —— 每个 agent trace 携带一个 `usage_caps` 块，列出决策、匹配的策略 ID、预留 key，以及每次 LLM 尝试的估算与实际 token/成本，使你能在 trace 的其余部分内联看到上限行为。

### REST 端点

所有 usage-cap 端点都需要 admin Bearer token。写操作（创建/更新/删除策略、定价覆盖）额外需要 tenant-admin scope；OpenRouter 同步端点需要 master scope。

| 方法与路径 | Scope | 描述 |
|---------------|-------|-------|
| `GET /v1/usage-caps/policies` | admin | 列出租户的所有上限策略（含已禁用） |
| `POST /v1/usage-caps/policies` | tenant-admin | 创建一条上限策略 |
| `PATCH /v1/usage-caps/policies/{id}` | tenant-admin | 更新一条策略（受管理的 agent 预算策略会被拒绝） |
| `DELETE /v1/usage-caps/policies/{id}` | tenant-admin | 删除一条策略（受管理的策略会被拒绝） |
| `GET /v1/usage-caps/utilization` | admin | 当前活动窗口的 per-policy 用量与限制对比 |
| `GET /v1/usage-caps/events` | admin | 最近的上限决策（`?limit=`，默认 50，最大 200） |

**创建一条策略** —— 将一个 agent 限制为每天 1M token：

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/usage-caps/policies" \
  -d '{
    "agent_id": "11111111-1111-1111-1111-111111111111",
    "window": "day",
    "max_tokens": 1000000
  }'
```

**创建一个成本上限** —— 将 Anthropic 支出限制为全租户每月 $20（`max_cost_usd` 会被转换为微美元）：

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/usage-caps/policies" \
  -d '{
    "provider_type": "anthropic",
    "window": "month",
    "max_cost_usd": 20.00
  }'
```

**检查 utilization：**

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage-caps/utilization"
```

模型定价（为成本上限背后的成本计算提供数据）通过一组独立的端点配置 —— 参见 [成本追踪 → 模型定价](/cost-tracking)。

---

## Webhook 速率限制（Channel 层）

独立于每用户配额，还有一个 webhook 级别的速率限制器，用于防止入站 webhook 洪水。它使用固定 60 秒窗口，每个 key 每个窗口硬上限 **30 次请求**。同时最多追踪 **4096 个唯一 key**；超出后驱逐最旧条目。

此速率限制器在 HTTP webhook 接收层运行，在消息到达 agent 之前。它不可配置 — 是固定的 DoS 防护措施。

---

## 数据库索引

配额查询使用迁移 `000009` 中添加的部分索引：

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traces_quota
ON traces (user_id, created_at DESC)
WHERE parent_trace_id IS NULL AND user_id IS NOT NULL;
```

此索引覆盖 89% 的 trace（仅顶层），使小时/天/周窗口查询即使在大型 trace 表上也很快。

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|---------|-------|-----|
| `quota.usage` 返回 `enabled: false` | `quota.enabled` 未在 config 中设为 `true` | 在 `gateway.quota` 中设置 `"enabled": true` |
| 用量较低但用户仍触发配额 | 缓存 TTL 为 60 秒 — 计数最多滞后 1 分钟 | 预期行为；乐观增量缓解了快速突发 |
| 即使有活动 `requestsToday` 仍为 0 | 未写入 trace — 追踪可能已禁用 | 确保 PostgreSQL 已连接且 `GOCLAW_POSTGRES_DSN` 已设置 |
| 某 channel 未执行配额 | config 中的 channel 名称与实际 channel key 不匹配 | 使用精确 channel 名称：`telegram`、`discord`、`feishu`、`zalo`、`whatsapp` |
| 子 agent 消息计入用户配额 | 不应该 — 只有顶层 trace 才计入 | 验证 `parent_trace_id IS NULL` 过滤；检查 agent 是否通过 subagent 工具委托 |

---

## 下一步

- [可观测性](/deploy-observability) — OpenTelemetry 追踪和 Jaeger 集成
- [安全加固](/deploy-security) — 网关级速率限制
- [数据库设置](/deploy-database) — 包含配额索引的 PostgreSQL 设置

<!-- goclaw-source: d85bf171 | 更新: 2026-06-07 -->
