> 翻译自 [English version](/context-pruning)

# 上下文裁剪

> 自动修剪旧的工具结果，将 agent 上下文保持在 token 限制内。

## 概述

随着 agent 执行长任务，工具结果在对话历史中不断积累。大型工具输出 — 文件读取、API 响应、搜索结果 — 可能占用大部分上下文窗口，为新推理留下的空间所剩无几。

**上下文裁剪**在每次 LLM 请求前在内存中修剪这些旧工具结果，而不触及持久化的会话历史。它采用两阶段策略：

1. **软裁剪** — 截断过大的工具结果，保留头部和尾部，丢弃中间部分。
2. **硬清除** — 如果上下文仍然太满，将整个工具结果替换为简短占位符。

上下文裁剪与[会话压缩](/sessions-and-history)不同。压缩会永久摘要和截断对话历史。裁剪是非破坏性的：原始工具结果保留在会话存储中且从不修改 — 仅修剪发送给 LLM 的消息切片。

---

## 裁剪触发方式

裁剪在每次 agent 请求时自动运行，除非通过 `mode: "off"` 显式禁用。流程：

```
历史 → limitHistoryTurns → pruneContextMessages → sanitizeHistory → LLM
```

每次 LLM 调用前，GoClaw：

1. 估算所有消息的总字符数。
2. 计算比率：`totalChars / (contextWindowTokens × 4)`。
3. 如果比率低于 `softTrimRatio` — 上下文足够小，无需裁剪。
4. 如果比率达到或超过 `softTrimRatio` — 对符合条件的工具结果进行软裁剪。
5. 软裁剪后如果比率仍达到或超过 `hardClearRatio`，且可裁剪字符数超过 `minPrunableToolChars` — 对剩余工具结果进行硬清除。

**受保护的消息：** 最后 `keepLastAssistants` 条助手消息及其后的所有工具结果永远不会被裁剪。第一条用户消息之前的消息也受保护。

---

## 软裁剪

软裁剪保留长工具结果的开头和结尾，丢弃中间部分。

当工具结果的字符数超过 `softTrim.maxChars` 时，符合软裁剪条件。

裁剪后的结果如下所示：

```
<工具输出的前 1500 个字符>
...
<工具输出的后 1500 个字符>

[Tool result trimmed: kept first 1500 chars and last 1500 chars of 38400 chars.]
```

Agent 保留足够的上下文来理解工具返回的内容，而不消耗完整输出。

---

## 硬清除

硬清除将旧工具结果的整个内容替换为简短占位符字符串。仅在软裁剪后上下文比率仍然过高时作为第二阶段运行。

硬清除逐一处理可裁剪的工具结果，每次替换后重新计算比率，一旦比率降至 `hardClearRatio` 以下就停止。

硬清除后的工具结果变为：

```
[Old tool result content cleared]
```

此占位符可配置。硬清除也可以完全禁用。

---

## 配置

上下文裁剪**默认开启**。如需禁用，在 agent 配置中设置 `mode: "off"`。

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

其他字段都有合理的默认值，均为可选。

### 完整配置参考

```json
{
  "contextPruning": {
    "keepLastAssistants": 3,
    "softTrimRatio": 0.3,
    "hardClearRatio": 0.5,
    "minPrunableToolChars": 50000,
    "softTrim": {
      "maxChars": 4000,
      "headChars": 1500,
      "tailChars": 1500
    },
    "hardClear": {
      "enabled": true,
      "placeholder": "[Old tool result content cleared]"
    }
  }
}
```

| 字段 | 默认值 | 描述 |
|-------|---------|-------------|
| `mode` | *（未设置 — 裁剪生效）* | 设为 `"off"` 完全禁用裁剪。 |
| `keepLastAssistants` | `3` | 受保护不被裁剪的最近助手轮次数。 |
| `softTrimRatio` | `0.3` | 当上下文填满上下文窗口此比例时触发软裁剪。 |
| `hardClearRatio` | `0.5` | 软裁剪后上下文填满此比例时触发硬清除。 |
| `minPrunableToolChars` | `50000` | 硬清除运行前可裁剪工具结果的最小总字符数。防止在小上下文上过度清除。 |
| `softTrim.maxChars` | `4000` | 超过此长度的工具结果符合软裁剪条件。 |
| `softTrim.headChars` | `1500` | 裁剪后工具结果开头保留的字符数。 |
| `softTrim.tailChars` | `1500` | 裁剪后工具结果结尾保留的字符数。 |
| `hardClear.enabled` | `true` | 设为 `false` 完全禁用硬清除（仅软裁剪）。 |
| `hardClear.placeholder` | `"[Old tool result content cleared]"` | 硬清除工具结果的替换文本。 |

---

## 配置示例

### 完全禁用裁剪

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

### 激进模式 — 适合长时间重工具工作流

提前触发并为每个工具结果保留更少上下文：

```json
{
  "contextPruning": {
    "softTrimRatio": 0.2,
    "hardClearRatio": 0.4,
    "softTrim": {
      "maxChars": 2000,
      "headChars": 800,
      "tailChars": 800
    }
  }
}
```

### 仅软裁剪 — 禁用硬清除

```json
{
  "contextPruning": {
    "hardClear": {
      "enabled": false
    }
  }
}
```

### 自定义占位符

```json
{
  "contextPruning": {
    "hardClear": {
      "placeholder": "[Tool output removed to save context]"
    }
  }
}
```

---

## 对 Agent 行为的影响

- **不修改会话数据。** 裁剪仅影响传递给 LLM 的消息切片。原始工具结果保留在会话存储中。
- **最近上下文始终受保护。** 最后 `keepLastAssistants` 轮助手对话及其关联的工具结果不会被触碰。
- **软裁剪结果仍提供信号。** Agent 看到长输出的开头和结尾，这通常包含最相关的信息（标题、摘要、最后几行）。
- **硬清除结果可能导致重复工具调用。** 如果 agent 无法再看到工具结果，它可能重新运行工具来恢复信息。这是预期行为。
- **上下文窗口大小很重要。** 裁剪阈值是实际模型上下文窗口的比率。配置了较大上下文窗口的 agent 裁剪会较不激进。

---

## 常见问题

**裁剪从不触发**

确认 `mode` 未设置为 `"off"`。还要确认 agent 上设置了 `contextWindow` — 裁剪需要 token 数量来计算比率。

**Agent 意外地重新运行工具**

硬清除完全删除工具结果内容。如果 agent 需要该内容，它会再次调用工具。降低 `hardClearRatio` 或增大 `minPrunableToolChars` 以延迟硬清除，或用 `hardClear.enabled: false` 禁用它。

**裁剪结果截断了重要内容**

增大 `softTrim.headChars` 和 `softTrim.tailChars`，或提高 `softTrim.maxChars` 使更少结果符合裁剪条件。

**尽管裁剪了上下文仍溢出**

裁剪仅作用于工具结果。如果长用户消息或系统提示词组件主导上下文，裁剪将无济于事。考虑[会话压缩](/sessions-and-history)或减小系统提示词大小。

---

## Pipeline 改进

### 结构化压缩摘要

上下文压缩时，摘要现在以结构化格式保留关键标识符 — agent ID、task ID 和 session key。这确保 agent 在压缩后仍能继续引用其活跃任务和会话，不丢失关键跟踪上下文。

### 在源头限制 tool output 大小

Tool output 现在在加入上下文之前就在源头截断。不再等待 pruning pipeline 事后裁剪过大的结果，GoClaw 在采集时直接限制 tool output 大小。这减少了不必要的内存压力，使 pruning pipeline 更加可预测。

---

## 下一步

- [会话与历史](/sessions-and-history) — 会话压缩、历史限制
- [记忆系统](/memory-system) — 跨会话的持久记忆
- [配置参考](/config-reference) — 完整的 agent 配置参考

<!-- goclaw-source: c388364d | 更新: 2026-04-01 -->
