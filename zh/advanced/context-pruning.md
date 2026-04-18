> 翻译自 [English version](/context-pruning)

# 上下文裁剪

> 自动修剪旧的工具结果，将 agent 上下文保持在 token 限制内。

## 概述

随着 agent 执行长任务，工具结果在对话历史中不断积累。大型工具输出 — 文件读取、API 响应、搜索结果 — 可能占用大部分上下文窗口，为新推理留下的空间所剩无几。

**上下文裁剪**在每次 LLM 请求前在内存中修剪这些旧工具结果，而不触及持久化的会话历史。它采用两阶段策略：

1. **软裁剪** — 截断过大的工具结果，保留头部和尾部，丢弃中间部分。
2. **硬清除** — 如果上下文仍然太满，将整个工具结果替换为简短占位符。

上下文裁剪与[会话压缩](../../core-concepts/sessions-and-history.md)不同。压缩会永久摘要和截断对话历史。裁剪是非破坏性的：原始工具结果保留在会话存储中且从不修改 — 仅修剪发送给 LLM 的消息切片。

---

## 裁剪触发方式

裁剪是**可选启用（opt-in）**的 — 仅在 agent 上设置了 `mode: "cache-ttl"` 时才会运行。流程：

```
历史 → limitHistoryTurns → sanitizeHistory → LLM
```

> **注意：** `pruneContextMessages`（PruneStage）**不在**上述主 pipeline 中。它以 opt-in 方式独立运行 — 仅当设置了 `mode: "cache-ttl"` 时才生效。上图反映的是标准历史处理路径。

每次 LLM 调用前，GoClaw：

1. 使用 tiktoken BPE tokenizer 统计所有消息的 token 数（tiktoken 不可用时回退到 `chars / 4` 启发式方法）。
2. 计算比率：`totalTokens / contextWindowTokens`。
3. 如果比率低于 `softTrimRatio` — 上下文足够小，无需裁剪。
4. **Pass 0（单结果保护）** — 任何单个工具结果超过上下文窗口 30% 时，在主裁剪阶段开始之前强制裁剪。
5. 如果比率达到或超过 `softTrimRatio` — 对符合条件的工具结果进行软裁剪（Pass 1）。
6. 软裁剪后如果比率仍达到或超过 `hardClearRatio`，且可裁剪字符数超过 `minPrunableToolChars` — 对剩余工具结果进行硬清除（Pass 2）。

**受保护的消息：** 最后 `keepLastAssistants` 条助手消息及其后的所有工具结果永远不会被裁剪。第一条用户消息之前的消息也受保护。

---

## 软裁剪

软裁剪保留长工具结果的开头和结尾，丢弃中间部分。

当工具结果的字符数超过 `softTrim.maxChars` 时，符合软裁剪条件。

裁剪后的结果如下所示：

```
<工具输出的前 3000 个字符>
...
<工具输出的后 3000 个字符>

[Tool result trimmed: kept first 3000 chars and last 3000 chars of 38400 chars.]
```

Agent 保留足够的上下文来理解工具返回的内容，而不消耗完整输出。

**媒体工具保护：** `read_image`、`read_document`、`read_audio` 和 `read_video` 的结果拥有更高的软裁剪预算（headChars=4000, tailChars=4000），因为其内容是由专用视觉/音频 provider 生成的不可替代描述。重新生成需要额外的 LLM 调用。媒体工具结果也**免于硬清除** — 它们永远不会被替换为占位符。

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

上下文裁剪为**可选启用（opt-in）**。如需启用，在 agent 配置中设置 `mode: "cache-ttl"`。

```json
{
  "contextPruning": {
    "mode": "cache-ttl"
  }
}
```

其他字段都有合理的默认值，均为可选。

### 完整配置参考

```json
{
  "contextPruning": {
    "mode": "cache-ttl",
    "keepLastAssistants": 3,
    "softTrimRatio": 0.25,
    "hardClearRatio": 0.5,
    "minPrunableToolChars": 50000,
    "softTrim": {
      "maxChars": 6000,
      "headChars": 3000,
      "tailChars": 3000
    },
    "hardClear": {
      "enabled": true,
      "placeholder": "[Old tool result content cleared]"
    }
  }
}
```

| 字段 | 默认值 | 描述 |
|------|--------|------|
| `mode` | *（未设置 — 裁剪禁用）* | 设为 `"cache-ttl"` 启用裁剪。不设置或留空则保持禁用。 |
| `keepLastAssistants` | `3` | 受保护不被裁剪的最近助手轮次数。 |
| `softTrimRatio` | `0.25` | 当上下文填满上下文窗口此比例时触发软裁剪。 |
| `hardClearRatio` | `0.5` | 软裁剪后上下文填满此比例时触发硬清除。 |
| `minPrunableToolChars` | `50000` | 硬清除运行前可裁剪工具结果的最小总字符数。防止在小上下文上过度清除。 |
| `softTrim.maxChars` | `6000` | 超过此长度的工具结果符合软裁剪条件。 |
| `softTrim.headChars` | `3000` | 裁剪后工具结果开头保留的字符数。 |
| `softTrim.tailChars` | `3000` | 裁剪后工具结果结尾保留的字符数。 |
| `hardClear.enabled` | `true` | 设为 `false` 完全禁用硬清除（仅软裁剪）。 |
| `hardClear.placeholder` | `"[Old tool result content cleared]"` | 硬清除工具结果的替换文本。 |

---

## 配置示例

### 启用裁剪（最小配置）

```json
{
  "contextPruning": {
    "mode": "cache-ttl"
  }
}
```

### 激进模式 — 适合长时间重工具工作流

提前触发并为每个工具结果保留更少上下文：

```json
{
  "contextPruning": {
    "mode": "cache-ttl",
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
    "mode": "cache-ttl",
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
    "mode": "cache-ttl",
    "hardClear": {
      "placeholder": "[Tool output removed to save context]"
    }
  }
}
```

---

## 裁剪与整合 Pipeline

上下文裁剪与记忆整合承担互补角色 — 裁剪管理 session 内的实时上下文；整合管理跨 session 的长期记忆。

```
session 内：           裁剪修剪工具结果 → 保持 LLM 上下文精简
session.completed 时： episodic_worker 总结 → L1 episodic 记忆
≥5 个 episode 后：    dreaming_worker 晋升 → L0 长期记忆
```

**关键区别**：裁剪永远不会触及持久化的 session store。Session 完成后，整合 pipeline（而非裁剪）接管并决定哪些内容值得长期保留。这意味着：

- 被裁剪的工具结果在 `episodic_worker` 读取消息进行总结时，仍可通过 session store 访问。
- 从实时上下文中硬清除的内容在 session 完成时仍会被总结进 episodic 记忆 — 裁剪不会造成任何永久性丢失。
- 对于已被 `dreaming_worker` 晋升到 episodic 或长期记忆的内容，**auto-injector** 会在下一个 turn 开始时以简洁的 L0 摘要重新注入。这取代了在上下文中保留大量原始工具结果的需求。

### 实际影响

一旦整合 pipeline 将某批知识晋升到 L0（通过 dreaming）或 L1（通过 episodic），你可以允许该 agent 的裁剪更加激进。Agent 不会丢失信息 — 信息将从记忆中重新注入，而非在原始 session 历史中携带。

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

确认 `mode` 已设置为 `"cache-ttl"` — 裁剪默认禁用，需显式启用。还要确认 agent 上设置了 `contextWindow` — 裁剪需要 token 数量来计算比率。

**Agent 意外地重新运行工具**

硬清除完全删除工具结果内容。如果 agent 需要该内容，它会再次调用工具。降低 `hardClearRatio` 或增大 `minPrunableToolChars` 以延迟硬清除，或用 `hardClear.enabled: false` 禁用它。

**裁剪结果截断了重要内容**

增大 `softTrim.headChars` 和 `softTrim.tailChars`，或提高 `softTrim.maxChars` 使更少结果符合裁剪条件。

**启用裁剪后上下文仍然溢出**

裁剪仅作用于工具结果。如果长用户消息或系统提示词组件主导上下文，裁剪将无济于事。考虑[会话压缩](../../core-concepts/sessions-and-history.md)或减小系统提示词大小。

---

## Pipeline 改进

### Tiktoken BPE Token 计数

GoClaw 现在使用 tiktoken BPE tokenizer 进行精确 token 计数，取代旧版 `chars / 4` 启发式方法。这对 CJK 内容（越南语和中文字符）尤为重要——启发式方法会显著低估 token 使用量。启用 tiktoken 后，所有裁剪比率都基于实际 token 数而非字符估算。

### Pass 0 — 单结果保护

主裁剪阶段开始前，任何超过**上下文窗口 30%** 的单个工具结果会被强制裁剪。这可处理异常大的输出（如读取大文件或超大 API 响应），即使整体上下文比率仍低于 `softTrimRatio`。裁剪结果保留 70/30 的头/尾比例。

### 媒体工具保护

`read_image`、`read_document`、`read_audio` 和 `read_video` 的结果享有特殊处理：

- 拥有更高的软裁剪预算：**headChars=4000, tailChars=4000**（相比标准 3000/3000）。
- **免于硬清除** — 媒体描述由专用视觉/音频 provider（Gemini、Anthropic）生成，无法在不进行额外 LLM 调用的情况下重新生成。

### MediaRefs 压缩

历史压缩时，最多保留 **30 条最近的 `MediaRefs`**。这确保 agent 在压缩后仍能引用之前共享的图片和文档，不丢失媒体上下文。

### 结构化压缩摘要

上下文压缩时，摘要现在以结构化格式保留关键标识符 — agent ID、task ID 和 session key。这确保 agent 在压缩后仍能继续引用其活跃任务和会话，不丢失关键跟踪上下文。

### 在源头限制 tool output 大小

Tool output 现在在加入上下文之前就在源头截断。不再等待 pruning pipeline 事后裁剪过大的结果，GoClaw 在采集时直接限制 tool output 大小。这减少了不必要的内存压力，使 pruning pipeline 更加可预测。

---

## 下一步

- [会话与历史](../../core-concepts/sessions-and-history.md) — 会话压缩、历史限制
- [记忆系统](../../core-concepts/memory-system.md) — 三层记忆架构与整合 pipeline
- [配置参考](/config-reference) — 完整的 agent 配置参考

<!-- goclaw-source: b9670555 | 更新: 2026-04-09 -->
