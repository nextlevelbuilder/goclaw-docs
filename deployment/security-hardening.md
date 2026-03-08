# Security Hardening

> GoClaw uses five independent defense layers — transport, input, tools, output, and isolation — so a bypass of one layer doesn't compromise the rest.

## Overview

Each layer operates independently. Together they form a defense-in-depth architecture covering the full request lifecycle from incoming WebSocket connection to agent tool execution output.

```mermaid
flowchart TD
    REQ["Incoming Request"] --> L1["Layer 1: Transport\nCORS · size limits · timing-safe auth · rate limiting"]
    L1 --> L2["Layer 2: Input\nInjection detection · message truncation"]
    L2 --> L3["Layer 3: Tools\nShell deny patterns · path traversal · SSRF · exec approval"]
    L3 --> L4["Layer 4: Output\nCredential scrubbing · web content tagging"]
    L4 --> L5["Layer 5: Isolation\nPer-user workspace · Docker sandbox"]
```

---

## Layer 1: Transport Security

Controls what reaches the gateway at the network and HTTP level.

| Mechanism | Detail |
|-----------|--------|
| CORS | `checkOrigin()` validates against `gateway.allowed_origins`; empty list allows all (backward compatible) |
| WebSocket message limit | 512 KB — gorilla/websocket auto-closes on exceed |
| HTTP body limit | 1 MB — enforced before JSON decode |
| Token auth | `crypto/subtle.ConstantTimeCompare` — timing-safe bearer token check |
| Rate limiting | Token bucket per user/IP; configurable via `gateway.rate_limit_rpm` (0 = disabled) |

**Hardening actions:**

```json
{
  "gateway": {
    "allowed_origins": ["https://your-dashboard.example.com"],
    "rate_limit_rpm": 20
  }
}
```

Set `allowed_origins` to your dashboard's domain in production. Leave empty only if you control all WebSocket clients.

---

## Layer 2: Input — Injection Detection

The input guard scans every user message for 6 prompt injection patterns before it reaches the LLM.

| Pattern ID | Detects |
|-----------|---------|
| `ignore_instructions` | "ignore all previous instructions" |
| `role_override` | "you are now…", "pretend you are…" |
| `system_tags` | `<system>`, `[SYSTEM]`, `[INST]`, `<<SYS>>` |
| `instruction_injection` | "new instructions:", "override:", "system prompt:" |
| `null_bytes` | Null characters `\x00` (obfuscation attempts) |
| `delimiter_escape` | "end of system", `</instructions>`, `</prompt>` |

**Configurable action** via `gateway.injection_action`:

| Value | Behavior |
|-------|----------|
| `"off"` | Disable detection entirely |
| `"log"` | Log at info level, continue |
| `"warn"` (default) | Log at warning level, continue |
| `"block"` | Log warning, return error, stop processing |

For public-facing deployments or shared multi-user agents, set `"block"`.

**Message truncation:** Messages exceeding `gateway.max_message_chars` (default 32,000) are truncated — not rejected — and the LLM is notified of the truncation.

---

## Layer 3: Tool Security

Protects against dangerous command execution, unauthorized file access, and server-side request forgery.

### Shell deny patterns

7 categories of commands are always blocked regardless of exec approval config:

| Category | Examples |
|----------|----------|
| Destructive file ops | `rm -rf`, `del /f`, `rmdir /s` |
| Destructive disk ops | `mkfs`, `dd if=`, `> /dev/sd*` |
| System commands | `shutdown`, `reboot`, `poweroff` |
| Fork bombs | `:(){ ... };:` |
| Remote code execution | `curl \| sh`, `wget -O - \| sh` |
| Reverse shells | `/dev/tcp/`, `nc -e` |
| Eval injection | `eval $()`, `base64 -d \| sh` |

### Path traversal prevention

`resolvePath()` applies `filepath.Clean()` then `HasPrefix()` to ensure all file paths stay within the agent's workspace. With `restrict_to_workspace: true` (the default on agents), any path outside the workspace is blocked.

All four filesystem tools (`read_file`, `write_file`, `list_files`, `edit`) implement the `PathDenyable` interface. The agent loop calls `DenyPaths(".goclaw")` at startup — agents cannot read GoClaw's internal data directory. The `list_files` tool filters denied paths from directory listings entirely, so agents never see them.

### SSRF protection (3-step validation)

Applied to all outbound URL fetches by the `web_fetch` tool:

```mermaid
flowchart TD
    U["URL to fetch"] --> S1["Step 1: Blocked hostnames\nlocalhost · *.local · *.internal\nmetadata.google.internal"]
    S1 --> S2["Step 2: Private IP ranges\n10.0.0.0/8 · 172.16.0.0/12\n192.168.0.0/16 · 127.0.0.0/8\n169.254.0.0/16 · IPv6 loopback"]
    S2 --> S3["Step 3: DNS pinning\nResolve domain · check every resolved IP\nApplied to redirect targets too"]
    S3 --> A["Allow request"]
```

### Exec approval

See [Exec Approval](../advanced/exec-approval.md) for the full interactive approval flow. At minimum, enable `ask: "on-miss"` to prompt before network and infrastructure tools run:

```json
{
  "tools": {
    "execApproval": {
      "security": "full",
      "ask": "on-miss"
    }
  }
}
```

---

## Layer 4: Output Security

Prevents secrets from leaking back through tool output or LLM responses.

### Credential scrubbing (automatic)

All tool output passes through a regex scrubber that redacts known secret formats. Replaced with `[REDACTED]`:

| Pattern | Examples |
|---------|----------|
| OpenAI keys | `sk-...` |
| Anthropic keys | `sk-ant-...` |
| GitHub tokens | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` |
| AWS access keys | `AKIA...` |
| Connection strings | `postgres://...`, `mysql://...` |
| Env var patterns | `KEY=...`, `SECRET=...`, `DSN=...` |
| Long hex strings | 64+ character hex sequences |

Scrubbing is enabled by default. To disable (not recommended):

```json
{ "tools": { "scrub_credentials": false } }
```

You can also register runtime values for dynamic scrubbing (e.g., server IPs discovered at runtime) via `AddDynamicScrubValues()` in custom tool integrations.

### Web content tagging

Content fetched from external URLs is wrapped:

```
<<<EXTERNAL_UNTRUSTED_CONTENT>>>
[fetched content here]
<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>
```

This signals to the LLM that the content is untrusted and should not be treated as instructions.

---

## Layer 5: Isolation

### Per-user workspace isolation

Every user gets a sandboxed directory. Two levels:

| Level | Directory pattern |
|-------|-----------------|
| Per-agent | `~/.goclaw/{agent-key}-workspace/` |
| Per-user | `{agent-workspace}/user_{sanitized_user_id}/` |

User IDs are sanitized — characters outside `[a-zA-Z0-9_-]` become underscores. Example: `group:telegram:-1001234` → `group_telegram_-1001234`.

### Docker sandbox

For agent shell execution, enable the Docker sandbox to run commands in an isolated container:

```bash
# Build the sandbox image
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .
```

```json
{
  "sandbox": {
    "mode": "all",
    "image": "goclaw-sandbox:bookworm-slim",
    "workspace_access": "rw",
    "scope": "session"
  }
}
```

Container hardening applied automatically:

| Setting | Value |
|---------|-------|
| Root filesystem | Read-only (`--read-only`) |
| Capabilities | All dropped (`--cap-drop ALL`) |
| New privileges | Disabled (`--security-opt no-new-privileges`) |
| Memory limit | 512 MB |
| CPU limit | 1.0 |
| Network | Disabled (`--network none`) |
| Max output | 1 MB |
| Timeout | 300 seconds |

Sandbox modes: `off` (direct host exec), `non-main` (sandbox all except the main agent), `all` (sandbox every agent).

---

## Encryption (Managed Mode)

Secrets stored in PostgreSQL are encrypted with AES-256-GCM:

| What | Table | Column |
|------|-------|--------|
| LLM provider API keys | `llm_providers` | `api_key` |
| MCP server API keys | `mcp_servers` | `api_key` |
| Custom tool env vars | `custom_tools` | `env` |
| Channel credentials | `channel_instances` | `credentials` |

Set the encryption key before first run:

```bash
# Generate a strong key
openssl rand -hex 32

# Add to .env
GOCLAW_ENCRYPTION_KEY=your-64-char-hex-key
```

Format stored: `"aes-gcm:" + base64(12-byte nonce + ciphertext + GCM tag)`. Values without the prefix are returned as plaintext for migration compatibility.

---

## RBAC — 3 Roles

WebSocket RPC methods and HTTP endpoints are gated by role. Roles are hierarchical.

| Role | Key permissions |
|------|----------------|
| **Viewer** | `agents.list`, `config.get`, `sessions.list`, `health`, `status`, `skills.list` |
| **Operator** | + `chat.send`, `chat.abort`, `sessions.delete/reset`, `cron.*`, `skills.update` |
| **Admin** | + `config.apply/patch`, `agents.create/update/delete`, `channels.toggle`, `device.pair.approve/revoke` |

Token scopes for narrow access: `operator.admin`, `operator.read`, `operator.write`, `operator.approvals`, `operator.pairing`.

---

## Hardening Checklist

Use this before exposing GoClaw to the internet or shared users:

- [ ] Set `GOCLAW_GATEWAY_TOKEN` to a strong random token
- [ ] Set `GOCLAW_ENCRYPTION_KEY` to a 32-byte (64-char hex) random key
- [ ] Set `gateway.allowed_origins` to your dashboard domain
- [ ] Set `gateway.rate_limit_rpm` (e.g., `20`) to limit per-user request rate
- [ ] Set `gateway.injection_action` to `"block"` for public-facing deployments
- [ ] Enable exec approval with `tools.execApproval.ask: "on-miss"` (or `"always"`)
- [ ] Enable Docker sandbox with `sandbox.mode: "all"` for untrusted agent workloads
- [ ] Set `POSTGRES_PASSWORD` to a strong password (not the default `"goclaw"`)
- [ ] Enable TLS on PostgreSQL (`sslmode=require` in DSN)
- [ ] Review `gateway.owner_ids` — only trusted user IDs should have owner-level access
- [ ] Set `agents.restrict_to_workspace: true` (this is the default — do not disable)

---

## Security Logging

All security events log at `slog.Warn` with a `security.*` prefix:

| Event | Meaning |
|-------|---------|
| `security.injection_detected` | Prompt injection pattern found |
| `security.injection_blocked` | Message rejected (action = block) |
| `security.rate_limited` | Request rejected by rate limiter |
| `security.cors_rejected` | WebSocket connection rejected by CORS policy |
| `security.message_truncated` | Message truncated at `max_message_chars` |

Filter all security events:

```bash
./goclaw 2>&1 | grep '"security\.'
# or with structured logs:
journalctl -u goclaw | grep 'security\.'
```

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Legitimate messages blocked | `injection_action: "block"` too aggressive | Switch to `"warn"` and review logs before re-enabling block |
| Agent can read files outside workspace | `restrict_to_workspace: false` on agent | Re-enable (default is `true`) |
| Credentials appear in tool output | `scrub_credentials: false` | Remove that override — scrubbing is on by default |
| Sandbox not isolating | Sandbox mode is `"off"` | Set `sandbox.mode` to `"non-main"` or `"all"` |
| Encryption key not set | `GOCLAW_ENCRYPTION_KEY` empty | Set before first run; rotating requires re-encrypting stored secrets |

---

## What's Next

- [Exec Approval](../advanced/exec-approval.md) — interactive human-in-the-loop for shell commands
- [Sandbox](../advanced/sandbox.md) — Docker sandbox configuration details
- [Docker Compose](./docker-compose.md) — deploying with security settings via compose overlays
- [Database Setup](./database-setup.md) — PostgreSQL TLS and encrypted secret storage
