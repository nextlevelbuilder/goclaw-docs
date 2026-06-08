> 翻译自 [English version](/cost-tracking)

# 成本追踪

> 使用可配置的按模型定价监控每个 agent 和 provider 的 token 成本。

## 概述

当你在 `telemetry.model_pricing` 中配置定价时，GoClaw 为每次 LLM 调用计算 USD 成本。成本数据存储在各个 trace span 上，并汇总到 `usage_snapshots` 表。你可以通过 REST 用量 API 或 WebSocket `quota.usage` 方法查看。

成本追踪需要：
- 连接 PostgreSQL（`GOCLAW_POSTGRES_DSN`）
- 在 `config.json` 中配置 `telemetry.model_pricing`

如果未配置定价，token 计数仍然追踪 — 只是美元金额将为零。

---

## 定价配置

在 `config.json` 的 `telemetry` 块中添加 `model_pricing` 映射。键为 `"provider/model"` 或仅 `"model"`。查找时先尝试特定键，再回退到裸模型名。

```json
{
  "telemetry": {
    "model_pricing": {
      "anthropic/claude-sonnet-4-5": {
        "input_per_million": 3.00,
        "output_per_million": 15.00,
        "cache_read_per_million": 0.30,
        "cache_create_per_million": 3.75
      },
      "anthropic/claude-haiku-3-5": {
        "input_per_million": 0.80,
        "output_per_million": 4.00
      },
      "openai/gpt-4o": {
        "input_per_million": 2.50,
        "output_per_million": 10.00
      },
      "gemini-2.0-flash": {
        "input_per_million": 0.10,
        "output_per_million": 0.40
      }
    }
  }
}
```

**字段：**

| 字段 | 必填 | 描述 |
|-------|----------|-------------|
| `input_per_million` | 是 | 每百万提示 token 的 USD |
| `output_per_million` | 是 | 每百万完成 token 的 USD |
| `cache_read_per_million` | 否 | 每百万缓存读取 token 的 USD（Anthropic 提示词缓存） |
| `cache_create_per_million` | 否 | 每百万缓存创建 token 的 USD（Anthropic 提示词缓存） |

---

## 成本计算方式

对于每次 LLM 调用，GoClaw 计算：

```
cost = (prompt_tokens × input_per_million / 1_000_000)
     + (completion_tokens × output_per_million / 1_000_000)
     + (cache_read_tokens × cache_read_per_million / 1_000_000)   // 如果 > 0
     + (cache_creation_tokens × cache_create_per_million / 1_000_000)  // 如果 > 0
```

Token 计数直接来自 provider 的 API 响应。成本记录在 LLM 调用 span 上，并汇总到 trace 级别。进行内部 LLM 调用的工具（如 `read_image`、`read_document`）的成本也在其自己的 span 上单独追踪。

---

## 查询成本数据

### REST API

成本包含在标准用量端点中。如果设置了 `gateway.token`，所有端点均需要 `Authorization: Bearer <token>`。

**`GET /v1/usage/summary`** — 当前与上一周期总计对比：

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/summary?period=30d"
```

```json
{
  "current": {
    "requests": 1240,
    "input_tokens": 8420000,
    "output_tokens": 1980000,
    "cost": 42.31,
    "unique_users": 18,
    "errors": 3,
    "llm_calls": 3810,
    "tool_calls": 6200,
    "avg_duration_ms": 3200
  },
  "previous": {
    "requests": 890,
    "cost": 29.17,
    ...
  }
}
```

`period` 值：`24h`（默认）、`today`、`7d`、`30d`。

**`GET /v1/usage/breakdown`** — 按 provider、模型或 channel 分组的成本：

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/breakdown?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=model"
```

```json
{
  "rows": [
    {
      "group": "claude-sonnet-4-5",
      "input_tokens": 6100000,
      "output_tokens": 1400000,
      "total_cost": 35.10,
      "request_count": 820
    },
    {
      "group": "gpt-4o",
      "input_tokens": 2320000,
      "output_tokens": 580000,
      "total_cost": 7.21,
      "request_count": 420
    }
  ]
}
```

`group_by` 选项：`provider`（默认）、`model`、`channel`。

**`GET /v1/usage/timeseries`** — 随时间变化的成本：

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/timeseries?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=hour"
```

```json
{
  "points": [
    {
      "bucket_time": "2026-03-01T00:00:00Z",
      "request_count": 48,
      "input_tokens": 320000,
      "output_tokens": 78000,
      "total_cost": 1.73,
      "llm_call_count": 142,
      "tool_call_count": 230,
      "error_count": 0,
      "unique_users": 5,
      "avg_duration_ms": 2800
    }
  ]
}
```

**常用查询参数**（timeseries 和 breakdown）：

| 参数 | 示例 | 说明 |
|-----------|---------|-------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339，必填 |
| `to` | `2026-03-16T00:00:00Z` | RFC 3339，必填 |
| `group_by` | `hour`、`model`、`provider`、`channel` | 各端点默认值不同 |
| `agent_id` | UUID | 按 agent 过滤 |
| `provider` | `anthropic` | 按 provider 过滤 |
| `model` | `claude-sonnet-4-5` | 按模型过滤 |
| `channel` | `telegram` | 按 channel 过滤 |

### WebSocket

`quota.usage` 方法返回今日成本以及用量计数：

```json
{ "type": "req", "id": "1", "method": "quota.usage" }
```

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [...]
}
```

`costToday` 始终存在。如果未配置定价则为 `0`。

---

## 每子 Agent Token 成本追踪

从 v3（#600）起，token 成本按子 agent 累积并包含在通知消息中。具体表现为：

- 每个 spawn 的子 agent 独立累积自己的 `input_tokens` 和 `output_tokens`
- 子 agent 完成时，其 token 总计包含在发送给父 agent LLM context 的通知消息中
- Token 成本持久化到 `subagent_tasks` 表（迁移 000034），用于计费和可观测性查询
- 子 agent token 成本通过现有 trace span 层级汇总到父 trace 的成本中

子 agent 成本出现在相同的 REST 端点（`/v1/usage/timeseries`、`/v1/usage/breakdown`）下，使用子 agent 自己的 `agent_id`。要查看多 agent 工作流的总成本，需汇总所有共享同一根 trace 的 `agent_id` 的成本。

---

## 月度预算执行

你可以通过在 agent 记录上设置 `budget_monthly_cents` 来限制 agent 的月度支出。设置后，GoClaw 在每次运行前查询当月累计成本，如超出预算则阻止执行。

通过 agents API 或直接在 `agents` 表中设置：

```json
{
  "budget_monthly_cents": 500
}
```

此示例设置每月 $5.00 的限制。当 agent 达到限制时，返回错误：

```
monthly budget exceeded ($5.02 / $5.00)
```

检查在每次请求时、所有 LLM 调用之前运行一次。子 agent 委托在其自己的 agent 记录下运行，有各自的预算。

> agent 的 `budget_monthly_cents` 也会被镜像到 [AI 预算用量上限](/usage-quota) 系统中，作为一个受管理（managed）的 `month` 窗口成本上限策略，因此相同的限制在那里也会被执行。

---

## 模型定价（目录与覆盖）

上面的静态 `telemetry.model_pricing` 映射是为模型定价的最简单方式。对于动态、数据库支持的定价 —— 由 [AI 预算用量上限](/usage-quota) 的成本上限使用 —— GoClaw 还在 PostgreSQL 中维护一个**定价目录**和每租户**覆盖**（迁移 `000070`）。

### OpenRouter 目录同步

GoClaw 可以从 [OpenRouter](https://openrouter.ai) 拉取完整的模型价格列表并存入 `usage_pricing_catalog` 表。每个条目记录 input、output、cache read/write、reasoning、request、image 和 web-search 单位的单价，以高精度 decimal 存储。

```bash
curl -X POST -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/sync-openrouter"
```

此端点需要 **master scope**（它更新共享的全局目录）。目录按 `model_id` upsert，因此重新运行同步会就地刷新价格。

### 每模型价格覆盖

当你希望为特定的 租户 + provider + model 组合设置不同价格（例如协商价，或 OpenRouter 未列出的模型）时，在 `usage_pricing_overrides` 表中设置一个**覆盖**。覆盖的作用域为单个租户，优先级高于全局目录。

```bash
# 列出已同步的目录（可选按模型过滤）
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing?model=claude-sonnet-4-5"

# 设置租户覆盖
curl -X PUT -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/v1/model-pricing/overrides" \
  -d '{
    "provider_id": "22222222-2222-2222-2222-222222222222",
    "provider_type": "anthropic",
    "model_id": "claude-sonnet-4-5",
    "pricing": { "input": "0.000003", "output": "0.000015" }
  }'

# 列出 / 删除覆盖
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/overrides"
curl -X DELETE -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/model-pricing/overrides/{id}"
```

| 方法与路径 | Scope | 描述 |
|---------------|-------|-------|
| `POST /v1/model-pricing/sync-openrouter` | master | 从 OpenRouter 刷新全局价格目录 |
| `GET /v1/model-pricing` | admin | 列出已同步的目录（`?model=`、`?limit=`） |
| `PUT /v1/model-pricing/overrides` | tenant-admin | 创建或更新每租户模型价格覆盖 |
| `GET /v1/model-pricing/overrides` | admin | 列出覆盖（`?provider_id=`） |
| `DELETE /v1/model-pricing/overrides/{id}` | tenant-admin | 删除一个覆盖 |

### 定价如何解析

当成本上限需要某模型的价格时，GoClaw 按以下顺序解析：

1. **租户覆盖**，匹配的 provider + model（最高优先级）
2. **全局 OpenRouter 目录** 按 `model_id` / 规范 id 的条目

若两者均未找到，受成本上限约束的调用会被**阻止**，原因为 `pricing_unknown`。价格以 **每 token/单位** 的 decimal USD 存储，并在上限计算成本时转换为微美元（micro-dollar）。

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|---------|-------|-----|
| API 响应中 `cost` 始终为 `0` | 未配置 `model_pricing` | 在 `config.json` 的 `telemetry.model_pricing` 下添加定价 |
| 只有部分模型记录了成本 | 定价映射中 key 不匹配 | 使用精确的 `"provider/model"` key（如 `"anthropic/claude-sonnet-4-5"`）或裸模型名 |
| 预算检查阻止所有运行 | 月度成本已超过 `budget_monthly_cents` | 增加预算或重置；成本在月份交替时自动重置 |
| Timeseries/breakdown 返回空 | `from`/`to` 缺失或超出快照范围 | 快照是按小时的；超出保留期的数据可能已被清理 |
| `quota.usage` 中的 `costToday` 陈旧 | 快照按小时预聚合 | 当前未完整小时从 traces 实时补充 |

---

## 下一步

- [用量与配额](/usage-quota) — 每用户请求限制和 token 计数
- [可观测性](/deploy-observability) — 包含成本字段的 OpenTelemetry span 导出
- [配置参考](/config-reference) — 完整的 `telemetry` 配置选项

<!-- goclaw-source: d85bf171 | 更新: 2026-06-07 -->
