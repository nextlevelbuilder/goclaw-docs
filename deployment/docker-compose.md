# Docker Compose Deployment

> GoClaw ships 9 compose files — a base plus 8 overlays you mix and match to build the exact stack you need.

## Overview

The compose setup is modular. You always start with `docker-compose.yml` (the base) and stack overlays on top with `-f`. Each overlay extends or overrides only what it needs.

```
docker-compose.yml            # Base: goclaw binary, ports, volumes, security hardening
docker-compose.postgres.yml   # PostgreSQL 18 + pgvector
docker-compose.selfservice.yml # Web dashboard UI (nginx + React, port 3000)
docker-compose.sandbox.yml    # Docker-in-Docker sandbox for agent code execution
docker-compose.browser.yml    # Headless Chrome sidecar (CDP, port 9222)
docker-compose.otel.yml       # Jaeger for OpenTelemetry trace visualization
docker-compose.tailscale.yml  # Tailscale tsnet for secure remote access
docker-compose.upgrade.yml    # One-shot DB migration runner
docker-compose.vnstock-mcp.yml # Example: vnstock MCP sidecar (community overlay)
```

---

## Recipes

### Minimal — core + PostgreSQL only

No dashboard, no sandbox. Good for headless/API-only deployments.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

### Standard — + dashboard + sandbox

The recommended starting point for most self-hosted setups.

```bash
# 1. Build the sandbox image first (one-time)
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .

# 2. Start the stack
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  up -d --build
```

Dashboard: [http://localhost:3000](http://localhost:3000)

### Standard + browser automation

Adds a headless Chrome sidecar for the browser tool.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.browser.yml \
  up -d --build
```

### Full — everything including OTel tracing

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  -f docker-compose.otel.yml \
  up -d --build
```

Jaeger UI: [http://localhost:16686](http://localhost:16686)

---

## Overlay Reference

### `docker-compose.postgres.yml`

Starts `pgvector/pgvector:pg18` and wires `GOCLAW_POSTGRES_DSN` automatically. GoClaw waits for the health check before starting.

Environment variables (set in `.env` or shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `goclaw` | Database user |
| `POSTGRES_PASSWORD` | `goclaw` | Database password — **change for production** |
| `POSTGRES_DB` | `goclaw` | Database name |
| `POSTGRES_PORT` | `5432` | Host port to expose |

### `docker-compose.selfservice.yml`

Builds the React SPA from `ui/web/` and serves it via nginx on port 3000.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOCLAW_UI_PORT` | `3000` | Host port for the dashboard |

### `docker-compose.sandbox.yml`

Mounts `/var/run/docker.sock` so GoClaw can spin up isolated containers for agent shell execution. Requires the sandbox image to be built first.

> **Security note:** Mounting the Docker socket gives the container control over host Docker. Only use in trusted environments.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOCLAW_SANDBOX_MODE` | `all` | `off`, `non-main`, or `all` |
| `GOCLAW_SANDBOX_IMAGE` | `goclaw-sandbox:bookworm-slim` | Image to use for sandbox containers |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `rw` | `none`, `ro`, or `rw` |
| `GOCLAW_SANDBOX_SCOPE` | `session` | `session`, `agent`, or `shared` |
| `GOCLAW_SANDBOX_MEMORY_MB` | `512` | Memory limit per sandbox container |
| `GOCLAW_SANDBOX_CPUS` | `1.0` | CPU limit per sandbox container |
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | `300` | Max execution time in seconds |
| `GOCLAW_SANDBOX_NETWORK` | `false` | Enable network access in sandbox |
| `DOCKER_GID` | `999` | GID of the `docker` group on the host |

### `docker-compose.browser.yml`

Starts `zenika/alpine-chrome:124` with CDP enabled on port 9222. GoClaw connects via `GOCLAW_BROWSER_REMOTE_URL=ws://chrome:9222`.

### `docker-compose.otel.yml`

Starts Jaeger (`jaegertracing/all-in-one:1.68.0`) and rebuilds GoClaw with the `ENABLE_OTEL=true` build arg to include the OTel exporter.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOCLAW_TELEMETRY_ENABLED` | `true` | Enable OTel export |
| `GOCLAW_TELEMETRY_ENDPOINT` | `jaeger:4317` | OTLP gRPC endpoint |
| `GOCLAW_TELEMETRY_PROTOCOL` | `grpc` | `grpc` or `http` |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | `goclaw-gateway` | Service name in traces |

### `docker-compose.tailscale.yml`

Rebuilds with `ENABLE_TSNET=true` to embed Tailscale directly in the binary (no sidecar needed).

| Variable | Required | Description |
|----------|----------|-------------|
| `GOCLAW_TSNET_AUTH_KEY` | Yes | Tailscale auth key from the admin console |
| `GOCLAW_TSNET_HOSTNAME` | No (default: `goclaw-gateway`) | Device name on the tailnet |

### `docker-compose.upgrade.yml`

A one-shot service that runs `goclaw upgrade` and exits. Use it to apply database migrations without downtime.

```bash
# Preview what will change (dry-run)
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --dry-run

# Apply upgrade
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# Check migration status
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --status
```

---

## Volumes

| Volume | Mount path | Contents |
|--------|-----------|----------|
| `goclaw-data` | `/app/data` | `config.json` and runtime data |
| `goclaw-workspace` | `/app/workspace` or `/app/.goclaw` | Agent workspaces |
| `goclaw-skills` | `/app/skills` | Skill files |
| `postgres-data` | `/var/lib/postgresql` | PostgreSQL data |
| `tsnet-state` | `/app/tsnet-state` | Tailscale node state |

---

## Base Container Hardening

The base `docker-compose.yml` applies these security settings to the `goclaw` service:

```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
read_only: true
tmpfs:
  - /tmp:rw,noexec,nosuid,size=256m
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '2.0'
      pids: 200
```

> The sandbox overlay (`docker-compose.sandbox.yml`) overrides `cap_drop` and `security_opt` because Docker socket access requires relaxed capabilities.

---

## Update / Upgrade Procedure

```bash
# 1. Pull latest images / rebuilt code
docker compose -f docker-compose.yml -f docker-compose.postgres.yml pull

# 2. Run DB migrations before starting new binary
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# 3. Restart the stack
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build
```

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `goclaw` exits immediately on start | PostgreSQL not ready | The postgres overlay adds a health check dependency; ensure you include it |
| Sandbox containers not starting | Docker socket not mounted or wrong GID | Add the sandbox overlay and set `DOCKER_GID` to match `stat -c %g /var/run/docker.sock` |
| Dashboard returns 502 | `goclaw` service not healthy yet | Check `docker compose logs goclaw`; dashboard depends on `goclaw` being up |
| OTel traces not appearing in Jaeger | Binary built without `ENABLE_OTEL=true` | Add `--build` flag when using the otel overlay; it rebuilds with the build arg |
| Port 5432 already in use | Local Postgres running | Set `POSTGRES_PORT=5433` in `.env` |

---

## What's Next

- [Database Setup](./database-setup.md) — manual PostgreSQL setup and migrations
- [Security Hardening](./security-hardening.md) — five-layer security overview
- [Observability](./observability.md) — OpenTelemetry and Jaeger configuration
- [Tailscale](./tailscale.md) — secure remote access via Tailscale
