# JavaScript Hooks

> Execute sandboxed ES5.1 JavaScript to intercept, audit, or transform agent events in real-time — with full control over blocking decisions and event mutations.

## Overview

The **script** handler type runs user-provided JavaScript in a sandboxed goja ES5.1 runtime. Unlike `http` (external service) or `prompt` (LLM-based) handlers, scripts execute immediately in-process with zero latency — ideal for lightweight filtering, logging, or input transformation.

**Key traits:**
- **Sandboxed** — ES5.1 only, no file I/O, network, or external modules. `console.log()` output is captured and truncated to 4 KiB.
- **Fast** — executes in-process with program caching; repeated invocations reuse compiled bytecode.
- **Simple** — single function signature `handle(event)` that returns a decision object.
- **Available on** — Lite + Standard editions (no edition restrictions).

---

## Handler Signature

```javascript
function handle(event) {
  return {
    decision: "allow",          // "allow" or "block"
    reason: "Reason for decision",
    updatedInput: {},          // optional: mutate tool input / message
    additionalContext: "..."   // optional: logging / audit info
  };
}
```

**Required:**
- `decision` — string: `"allow"` or `"block"`

**Optional:**
- `reason` — explains the decision (logged, visible in audit)
- `updatedInput` — object: mutations to apply to the event (tool_input, message body, etc.)
- `additionalContext` — string: extra metadata for audit trail

---

## Event Payload

The `event` object structure depends on the hook's **event type**:

### `pre_tool_use`
```javascript
{
  toolName: "exec",
  toolInput: { cmd: "ls -la" },
  depth: 0                     // 0 = main agent, 1+ = subagent nesting
}
```

### `user_prompt_submit`
```javascript
{
  message: "What is the weather?",
  sessionKey: "sess-abc123"
}
```

### `post_tool_use`
```javascript
{
  toolName: "exec",
  toolInput: { cmd: "ls" },
  toolOutput: "file1.txt\nfile2.txt",
  exitCode: 0,
  depth: 0
}
```

### `session_start`
```javascript
{
  sessionKey: "sess-abc123",
  agentKey: "assistant"
}
```

### Subagent events (`subagent_start`, `subagent_stop`)
```javascript
{
  parentAgentKey: "main",
  subagentKey: "researcher",
  depth: 1
}
```

---

## Examples

### Example 1: Block dangerous commands

```javascript
function handle(event) {
  const dangerous = /^(rm|dd|mkfs|dd)/i;
  
  if (dangerous.test(event.toolInput.cmd)) {
    return {
      decision: "block",
      reason: "Dangerous command pattern blocked: " + event.toolInput.cmd
    };
  }
  
  return { decision: "allow" };
}
```

### Example 2: Redact PII from user input

```javascript
function handle(event) {
  if (event.toolName !== "web_fetch") {
    return { decision: "allow" };
  }
  
  // Redact email addresses from URLs
  const redacted = event.toolInput.url.replace(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    "[EMAIL]"
  );
  
  return {
    decision: "allow",
    updatedInput: { url: redacted },
    reason: "PII redacted from fetch URL"
  };
}
```

### Example 3: Audit and allow (non-blocking)

```javascript
function handle(event) {
  // For non-blocking events like post_tool_use, always allow
  // and log metadata for compliance audits.
  
  return {
    decision: "allow",
    additionalContext: JSON.stringify({
      timestamp: new Date().toISOString(),
      toolName: event.toolName,
      inputSize: JSON.stringify(event.toolInput).length,
      outputSize: (event.toolOutput || "").length
    })
  };
}
```

### Example 4: Rate limit by pattern

```javascript
function handle(event) {
  // Example: limit recursive API calls
  if (event.depth > 3) {
    return {
      decision: "block",
      reason: "Subagent nesting exceeds depth limit"
    };
  }
  
  return { decision: "allow" };
}
```

---

## Built-in Functions

The sandboxed runtime includes ES5.1 globals:

```javascript
// Math, Object, Array, String, Number, Boolean, Date, RegExp, JSON
JSON.stringify(obj)
JSON.parse(str)
Math.max(1, 2, 3)
new Date().toISOString()
"hello".toUpperCase()
```

**Not available:**
- File I/O (`fs`, `readFile`, etc.)
- Network (`fetch`, `http`, `ws`)
- Child processes (`exec`, `spawn`)
- Modules (`require`, `import`)
- `eval()` or `Function()` constructors
- `setTimeout` / `setInterval` (no async)

---

## Safety & Limits

| Limit | Value | Notes |
|---|---|---|
| Script source size | 32 KiB | Validated at create + execute time |
| Stdout capture | 4 KiB | Excess writes are dropped with `... truncated` marker |
| Global concurrency | 10 slots | Max parallel script executions across all tenants |
| Per-tenant concurrency | 3 slots | Prevents one tenant from starving the pool |
| Program cache size | 500 entries | LRU eviction; keyed by (hookID, version) |
| Execution timeout | 5 s (per hook) | Configurable via `timeout_ms` (max 10 s) |

**Circuit breaker:** 5 consecutive errors (or timeouts) in a 1-minute rolling window auto-disables the hook (`enabled=false`). Fix the underlying issue and re-enable via `hooks.toggle`.

---

## Matcher & Filtering

Scripts run on **all matching events** by default. Use `matcher` or `if_expr` to skip unnecessary invocations:

```json
{
  "handler_type": "script",
  "event": "pre_tool_use",
  "matcher": "^(exec|shell|python_exec)$",
  "config": {
    "source": "function handle(e) { ... }"
  }
}
```

**matcher** — POSIX-ish regex against `toolName`:
```javascript
"^(exec|shell)$"         // matches "exec" or "shell"
"^sql_"                  // matches "sql_query", "sql_execute", etc.
```

**if_expr** — [cel-go](https://github.com/google/cel-go) expression:
```javascript
tool_name == "exec" && size(tool_input.cmd) > 100
tool_name.startsWith("db_")
depth > 0                // subagent only
```

Both are optional but **recommended** to avoid unnecessary script overhead.

---

## Configuration

### Via WebSocket

```json
{
  "type": "req",
  "id": "1",
  "method": "hooks.create",
  "params": {
    "event": "pre_tool_use",
    "handler_type": "script",
    "scope": "tenant",
    "name": "Block dangerous commands",
    "matcher": "^(exec|shell)$",
    "timeout_ms": 3000,
    "config": {
      "source": "function handle(e) { ... }"
    }
  }
}
```

### Via Web UI

1. Navigate to **Hooks** in the sidebar.
2. Click **Create**.
3. Select **Event** (e.g., `pre_tool_use`).
4. Select **Handler Type** → **Script**.
5. Set **Scope** (global / tenant / agent).
6. (Optional) Set **Matcher** regex or **If expr** to filter events.
7. Paste your JavaScript into the **Script Source** field.
8. Set **Timeout** (default 5000 ms, max 10000 ms).
9. Set **On Timeout** (default `block` for blocking events; `allow` for non-blocking).
10. Click **Create**.

---

## Testing

Use the **Test panel** in the Web UI to dry-run your script:

1. Open the hook detail page.
2. Click **Test**.
3. Select an **event type**.
4. Fill sample event data (e.g., `toolName="exec"`, `toolInput={cmd:"ls"}`).
5. Click **Run Test**.

The panel shows:
- ✅ **Decision** badge (allow / block)
- ⏱️ **Duration** (ms)
- 📝 **Stdout** from `console.log()` calls
- 🔄 **Updated input** (if `updatedInput` was returned)
- ❌ **Errors** (if the script threw)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Script hangs (timeout) | Infinite loop in JS; no network wait expected | Rewrite to exit deterministically. Max timeout is 10 s. |
| "return statement not allowed outside function" | Missing outer `function handle(event) {}` wrapper | Wrap code: `function handle(event) { ... }` |
| `updatedInput` not applied | Returned but source is `builtin` | Only `ui` source scripts mutate events (safety). Builtin scripts return read-only recommendations. |
| "SyntaxError: Unexpected token" | ES6+ syntax (arrow functions, const, etc.) | Use ES5.1 only: `function`, `var`, `for`, etc. |
| Hook disabled after errors | Circuit breaker tripped (5 errors in 60 s) | Fix the underlying JS bug, then re-enable via `hooks.toggle { enabled: true }` |
| Script blocked by CORS / auth | Scripts cannot make HTTP requests | Use `http` handler type or `prompt` handler type instead. |

---

## Best Practices

1. **Keep it simple** — short, focused logic. Move complex policy to `prompt` (LLM) or `http` (external service).

2. **Use matchers** — avoid running on every event:
   ```json
   "matcher": "^(exec|shell|python)$"
   ```

3. **Log for audit** — return `additionalContext`:
   ```javascript
   return {
     decision: "allow",
     additionalContext: "Checked tool=" + event.toolName
   };
   ```

4. **Handle missing fields** — be defensive:
   ```javascript
   if (!event.toolInput || !event.toolInput.cmd) {
     return { decision: "allow" };
   }
   ```

5. **Test first** — use the Test panel before enabling on live sessions.

6. **Monitor timeout** — if scripts frequently timeout, increase `timeout_ms` or simplify logic.

---

## What's Next

- [Agent Hooks](/advanced/hooks-quality-gates) — complete hooks overview (command, http, prompt handlers)
- [WebSocket Protocol](/websocket-protocol) — full `hooks.*` method reference
- [Exec Approval](/exec-approval) — human-in-the-loop approval for shell commands

<!-- goclaw-source: hooks-javascript | updated: 2026-01-12 -->
