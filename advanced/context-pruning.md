# Context Pruning

> Automatically trim old tool results to keep agent context within token limits.

## Overview

As agents run long tasks, tool results accumulate in the conversation history. Large tool outputs — file reads, API responses, search results — can consume most of the context window, leaving little room for new reasoning.

**Context pruning** trims these old tool results in-memory before each LLM request, without touching the persisted session history. It uses a two-pass strategy:

1. **Soft trim** — truncate oversized tool results to head + tail, dropping the middle.
2. **Hard clear** — if the context is still too full, replace entire tool results with a short placeholder.

Context pruning is distinct from [session compaction](/sessions-and-history). Compaction permanently summarizes and truncates conversation history. Pruning is non-destructive: the original tool results remain in the session store and are never modified — only the message slice sent to the LLM is trimmed.

---

## How Pruning Triggers

Pruning runs automatically on every agent request unless explicitly disabled with `mode: "off"`. The flow:

```
history → limitHistoryTurns → pruneContextMessages → sanitizeHistory → LLM
```

Before each LLM call, GoClaw:

1. Estimates total character count of all messages.
2. Calculates the ratio: `totalChars / (contextWindowTokens × 4)`.
3. If ratio is below `softTrimRatio` — context is small enough, no pruning needed.
4. If ratio meets or exceeds `softTrimRatio` — soft trim eligible tool results.
5. If ratio still meets or exceeds `hardClearRatio` after soft trim, and prunable chars exceed `minPrunableToolChars` — hard clear remaining tool results.

**Protected messages:** The last `keepLastAssistants` assistant messages and all tool results after them are never pruned. Messages before the first user message are also protected.

---

## Soft Trim

Soft trim keeps the beginning and end of a long tool result, dropping the middle.

A tool result is eligible for soft trim when its character count exceeds `softTrim.maxChars`.

The trimmed result looks like:

```
<first 1500 chars of tool output>
...
<last 1500 chars of tool output>

[Tool result trimmed: kept first 1500 chars and last 1500 chars of 38400 chars.]
```

The agent retains enough context to understand what the tool returned without consuming the full output.

---

## Hard Clear

Hard clear replaces the entire content of old tool results with a short placeholder string. It runs as a second pass only if the context ratio is still too high after soft trim.

Hard clear processes prunable tool results one by one, recalculating the ratio after each replacement, and stops as soon as the ratio drops below `hardClearRatio`.

A hard-cleared tool result becomes:

```
[Old tool result content cleared]
```

This placeholder is configurable. Hard clear can also be disabled entirely.

---

## Configuration

Context pruning is **on by default**. To disable it, set `mode: "off"` in the agent config.

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

All other fields have sensible defaults and are optional.

### Full configuration reference

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

| Field | Default | Description |
|-------|---------|-------------|
| `mode` | *(unset — pruning active)* | Set to `"off"` to disable pruning entirely. |
| `keepLastAssistants` | `3` | Number of recent assistant turns to protect from pruning. |
| `softTrimRatio` | `0.3` | Trigger soft trim when context fills this fraction of the context window. |
| `hardClearRatio` | `0.5` | Trigger hard clear when context fills this fraction after soft trim. |
| `minPrunableToolChars` | `50000` | Minimum total chars in prunable tool results before hard clear runs. Prevents aggressive clearing on small contexts. |
| `softTrim.maxChars` | `4000` | Tool results longer than this are eligible for soft trim. |
| `softTrim.headChars` | `1500` | Characters to keep from the start of a trimmed tool result. |
| `softTrim.tailChars` | `1500` | Characters to keep from the end of a trimmed tool result. |
| `hardClear.enabled` | `true` | Set to `false` to disable hard clear entirely (soft trim only). |
| `hardClear.placeholder` | `"[Old tool result content cleared]"` | Replacement text for hard-cleared tool results. |

---

## Configuration Examples

### Disable pruning entirely

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

### Aggressive — for long tool-heavy workflows

Trigger earlier and keep less context per tool result:

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

### Soft trim only — disable hard clear

```json
{
  "contextPruning": {
    "hardClear": {
      "enabled": false
    }
  }
}
```

### Custom placeholder

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

## Impact on Agent Behavior

- **No session data is modified.** Pruning only affects the message slice passed to the LLM. The original tool results remain in the session store.
- **Recent context is always preserved.** The last `keepLastAssistants` assistant turns and their associated tool results are never touched.
- **Soft-trimmed results still provide signal.** The agent sees the beginning and end of long outputs, which usually contain the most relevant information (headers, summaries, final lines).
- **Hard-cleared results may cause repeated tool calls.** If an agent can no longer see a tool result, it may re-run the tool to recover the information. This is expected behavior.
- **Context window size matters.** Pruning thresholds are ratios of the actual model context window. Agents configured with larger context windows will prune less aggressively.

---

## Common Issues

**Pruning never triggers**

Confirm that `mode` is not set to `"off"`. Also confirm that `contextWindow` is set on the agent — pruning needs a token count to calculate ratios.

**Agent re-runs tools unexpectedly**

Hard clear removes tool result content entirely. If the agent needs that content, it will call the tool again. Lower `hardClearRatio` or increase `minPrunableToolChars` to delay hard clear, or disable it with `hardClear.enabled: false`.

**Trimmed results cut off important content**

Increase `softTrim.headChars` and `softTrim.tailChars`, or raise `softTrim.maxChars` so fewer results are eligible for trimming.

**Context still overflows despite pruning**

Pruning only acts on tool results. If long user messages or system prompt components dominate the context, pruning will not help. Consider [session compaction](/sessions-and-history) or reduce the system prompt size.

---

## Pipeline Improvements

### Structured Compaction Summary

When context is compacted, the summary now preserves key identifiers — agent IDs, task IDs, and session keys — in a structured format. This ensures that agents can continue referencing their active tasks and sessions after compaction without losing critical tracking context.

### Tool Output Capping at Source

Tool output is now capped at the source before being added to context. Rather than waiting for the pruning pipeline to trim oversized results after the fact, GoClaw limits tool output size at ingestion time. This reduces unnecessary memory pressure and makes the pruning pipeline more predictable.

---

## What's Next

- [Sessions & History](/sessions-and-history) — session compaction, history limits
- [Memory System](/memory-system) — persistent memory across sessions
- [Configuration Reference](/config-reference) — full agent config reference

<!-- goclaw-source: c388364d | updated: 2026-04-01 -->
