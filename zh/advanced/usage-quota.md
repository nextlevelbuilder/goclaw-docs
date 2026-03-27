> 翻译自 [English version](#usage-quota)

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

- [可观测性](#deploy-observability) — OpenTelemetry 追踪和 Jaeger 集成
- [安全加固](#deploy-security) — 网关级速率限制
- [数据库设置](#deploy-database) — 包含配额索引的 PostgreSQL 设置

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
