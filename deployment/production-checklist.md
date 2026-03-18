# Production Checklist

> Everything you need to verify before taking GoClaw from development to production.

## Overview

This checklist covers the critical steps to harden, secure, and reliably operate a GoClaw gateway in production. Work through each section top to bottom before going live.

---

## 1. Database

- [ ] PostgreSQL 15+ is running with the **pgvector** extension installed
- [ ] `GOCLAW_POSTGRES_DSN` is set via environment — never in `config.json`
- [ ] Connection pool is sized for your expected concurrency
- [ ] Database connection pool uses 25 max open / 10 max idle connections (hard-coded) — ensure your PostgreSQL `max_connections` accommodates this plus other clients
- [ ] Automated backups are configured (daily minimum, test restore quarterly)
- [ ] Schema is up to date: `./goclaw upgrade --status` shows `UP TO DATE`

```bash
# Verify schema status
./goclaw upgrade --status

# Apply any pending migrations
./goclaw upgrade
```

---

## 2. Secrets and Encryption

- [ ] `GOCLAW_ENCRYPTION_KEY` is set to a random 32-byte hex string — **back this up**. Losing it means losing all encrypted API keys stored in the database.
- [ ] `GOCLAW_GATEWAY_TOKEN` is set to a strong random value — required for WebSocket and HTTP auth
- [ ] Neither secret appears in `config.json`, git history, or logs
- [ ] All provider API keys are set via environment (`GOCLAW_ANTHROPIC_API_KEY`, etc.) or added through the dashboard (where they are stored encrypted with AES-256-GCM)

```bash
# Generate secrets if you haven't run onboard/prepare-env.sh
export GOCLAW_ENCRYPTION_KEY=$(openssl rand -hex 32)
export GOCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

> Back up `GOCLAW_ENCRYPTION_KEY` in a secrets manager (e.g. AWS Secrets Manager, 1Password, Vault). If you rotate it, all encrypted API keys in the database become unreadable.

---

## 3. Network and TLS

- [ ] TLS termination is in place (nginx, Caddy, Cloudflare, or load balancer) — GoClaw itself does not terminate TLS in standard mode
- [ ] Gateway is **not** exposed directly on a public port without TLS
- [ ] `gateway.allowed_origins` is set to your actual client origins (empty = allow all WebSocket origins)

```json
{
  "gateway": {
    "allowed_origins": ["https://your-dashboard.example.com"]
  }
}
```

---

## 4. Rate Limiting

- [ ] `gateway.rate_limit_rpm` is set (default: 20 requests/minute per user, 0 = disabled)
- [ ] `tools.rate_limit_per_hour` is set (default: 150 tool executions/hour per session, 0 = disabled)
- [ ] Webhook rate limiting is built-in (30 requests/60s per source, max 4096 tracked sources) — no configuration needed

```json
{
  "gateway": {
    "rate_limit_rpm": 20
  },
  "tools": {
    "rate_limit_per_hour": 150
  }
}
```

---

## 5. Sandbox Configuration

If agents execute code, review the sandbox settings:

- [ ] `sandbox.mode` is set: `"off"` (no sandbox), `"non-main"` (sandbox subagents only), or `"all"` (sandbox everything)
- [ ] `sandbox.memory_mb` and `sandbox.cpus` are tuned for your workload (defaults: 512 MB, 1 CPU)
- [ ] `sandbox.network_enabled` is `false` unless agents explicitly need network access
- [ ] `sandbox.read_only_root` is `true` (default) for immutable container root filesystem
- [ ] `sandbox.timeout_sec` is set to a reasonable limit (default: 300s)
- [ ] `sandbox.idle_hours` tuned (default: 24 — removes containers idle longer than this)
- [ ] `sandbox.max_age_days` set (default: 7 — removes containers older than this)

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "memory_mb": 512,
        "cpus": 1.0,
        "network_enabled": false,
        "read_only_root": true,
        "timeout_sec": 120
      }
    }
  }
}
```

---

## 6. Security Settings

- [ ] `gateway.injection_action` is set to `"warn"` (default) or `"block"` — never `"off"` in production
- [ ] `tools.exec_approval.security` is `"full"` (default) — blocks dangerous shell patterns
- [ ] `agents.defaults.restrict_to_workspace` is `true` (default) — prevents path traversal outside workspace
- [ ] Review `tools.web_fetch` domain allow/deny lists if agents browse the web

---

## 7. Monitoring and Alerting

- [ ] Log output is collected (stdout/stderr) — GoClaw uses structured JSON logging via `slog`
- [ ] Alert on repeated `slog.Warn("security.*")` log entries — these indicate blocked attacks or anomalies
- [ ] Alert on `tracing: span buffer full` — indicates the collector is falling behind under load
- [ ] Uptime monitoring is configured (e.g. ping `/health` or the gateway port)
- [ ] Consider enabling OTel export for trace-level visibility — see [Observability](#deploy-observability)
- [ ] Interactive API documentation is available at `/docs` (Swagger UI) and `/v1/openapi.json` for integration testing

---

## 8. Operational Hygiene

- [ ] Log rotation is configured if writing to files (use `logrotate` or your container runtime's log driver)
- [ ] `GOCLAW_AUTO_UPGRADE=true` is set **only** if you accept automatic schema migrations on startup; otherwise upgrade explicitly with `./goclaw upgrade`
- [ ] A runbook exists for: restart, rollback, DB restore, and encryption key rotation
- [ ] Upgrade procedure is documented and tested — see [Upgrading](#deploy-upgrading)

---

## 9. API Key Management

- [ ] Consider creating scoped API keys instead of sharing the gateway token
- [ ] API keys support fine-grained scopes: `operator.admin`, `operator.read`, `operator.write`, `operator.approvals`, `operator.pairing`
- [ ] Keys are hashed (SHA-256) before storage — the plaintext is shown only at creation time
- [ ] Set up key rotation policy — keys can be revoked individually without affecting others

```json
// Example: create a read-only key for monitoring
// via dashboard or API
{
  "name": "monitoring-readonly",
  "scopes": ["operator.read"]
}
```

---

## 10. Concurrency Tuning

GoClaw uses lane-based scheduling to limit concurrent agent runs by type:

| Environment Variable | Default | Purpose |
|---------------------|---------|---------|
| `GOCLAW_LANE_MAIN` | `30` | Max concurrent main agent runs |
| `GOCLAW_LANE_SUBAGENT` | `50` | Max concurrent subagent runs |
| `GOCLAW_LANE_DELEGATE` | `100` | Max concurrent delegated runs |
| `GOCLAW_LANE_CRON` | `30` | Max concurrent cron job runs |

Tune these based on your server resources and expected load. Lower values reduce memory pressure; higher values improve throughput.

---

## 11. Gateway Tuning

Review these gateway settings for your deployment:

| Setting | Default | Description |
|---------|---------|-------------|
| `gateway.owner_ids` | `[]` | User IDs with owner-level access — keep this list minimal |
| `gateway.max_message_chars` | `32000` | Max user message size before truncation |
| `gateway.inbound_debounce_ms` | `1000` | Merge rapid consecutive messages (ms) |
| `gateway.task_recovery_interval_sec` | `300` | How often team tasks are checked for recovery |

- [ ] `gateway.owner_ids` contains only trusted admin user IDs
- [ ] `gateway.max_message_chars` is appropriate for your use case (lower = less token spend)

---

## Quick Verification

### First-Time Setup

For new installations, the `onboard` command handles initial setup interactively:

```bash
./goclaw onboard
```

It generates encryption and gateway tokens, runs database migrations, and walks you through basic configuration. You can also run `prepare-env.sh` for non-interactive secret generation.

### System Health Check

The `doctor` command runs a comprehensive check of your environment:

```bash
./goclaw doctor
```

It validates: runtime info, config file, database connection and schema version, provider API keys, channel credentials, external tools (docker, curl, git), and workspace directories.

```bash
# Check schema and pending migrations
./goclaw upgrade --status

# Verify gateway starts and connects to DB
./goclaw &
curl http://localhost:18790/health

# Confirm secrets are not exposed in logs
# Look for "***" masking, not raw key values
```

## Common Issues

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| Gateway refuses to start | Schema outdated | Run `./goclaw upgrade` |
| Encrypted API keys unreadable | Wrong `GOCLAW_ENCRYPTION_KEY` | Restore correct key from backup |
| WebSocket connections rejected | `allowed_origins` too restrictive | Add your dashboard origin to the list |
| Rate limit too aggressive | Default 20 RPM for high-traffic use | Increase `gateway.rate_limit_rpm` |
| Agents escape workspace | `restrict_to_workspace` disabled | Set to `true` in config |

## What's Next

- [Upgrading](#deploy-upgrading) — how to upgrade GoClaw safely
- [Observability](#deploy-observability) — set up tracing and alerting
- [Security Hardening](#deploy-security) — deeper security configuration
- [Docker Compose Setup](#deploy-docker-compose) — production compose patterns

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
