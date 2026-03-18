# Tailscale Integration

> Expose your GoClaw gateway securely on your Tailscale network — no port forwarding, no public IP required.

## Overview

GoClaw can join your [Tailscale](https://tailscale.com) network as a named node, making the gateway reachable from any of your devices without opening firewall ports. This is ideal for self-hosted setups where you want private remote access from your laptop, phone, or CI runners.

The Tailscale listener runs **alongside** the regular HTTP listener on the same handler — you get both local and Tailscale access simultaneously.

This feature is opt-in and compiled in only when you build with `-tags tsnet`. The default binary has zero Tailscale dependencies.

## How It Works

```mermaid
graph LR
    A[Your laptop] -->|Tailscale network| B[goclaw-gateway node]
    C[Your phone] -->|Tailscale network| B
    B --> D[Gateway handler]
    E[Local network] -->|Port 18790| D
```

When `GOCLAW_TSNET_HOSTNAME` is set, GoClaw starts a `tsnet.Server` that connects to Tailscale and listens on port 80 (or 443 with TLS). The Tailscale node appears in your Tailscale admin console as a regular device.

## Build with Tailscale Support

```bash
go build -tags tsnet -o goclaw .
```

Or with Docker Compose using the provided overlay:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.tailscale.yml \
  up
```

The overlay passes `ENABLE_TSNET: "true"` as a build arg, which compiles the binary with `-tags tsnet`.

## Configuration

### Required

```bash
# From https://login.tailscale.com/admin/settings/keys
# Use a reusable auth key for long-lived deployments
export GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
```

### Optional

```bash
# Tailscale device name (default: goclaw-gateway)
export GOCLAW_TSNET_HOSTNAME=my-goclaw

# Directory for Tailscale state (persisted across restarts)
# Default: OS user config dir
export GOCLAW_TSNET_DIR=/app/tsnet-state
```

Or via `config.json` (auth key is **never** stored in config — env only):

```json
{
  "tailscale": {
    "hostname": "my-goclaw",
    "state_dir": "/app/tsnet-state",
    "ephemeral": false,
    "enable_tls": false
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `hostname` | `goclaw-gateway` | Tailscale device name |
| `state_dir` | OS user config dir | Persists Tailscale identity across restarts |
| `ephemeral` | `false` | If true, node is automatically removed from your tailnet when GoClaw stops — useful for CI/CD or short-lived containers |
| `enable_tls` | `false` | Use Tailscale-managed HTTPS certs via Let's Encrypt (listens on `:443` instead of `:80`) |

## Docker Compose Setup

The `docker-compose.tailscale.yml` overlay mounts a named volume for Tailscale state so the node identity survives container restarts:

```yaml
# docker-compose.tailscale.yml (full file)
services:
  goclaw:
    build:
      args:
        ENABLE_TSNET: "true"
    environment:
      - GOCLAW_TSNET_HOSTNAME=${GOCLAW_TSNET_HOSTNAME:-goclaw-gateway}
      - GOCLAW_TSNET_AUTH_KEY=${GOCLAW_TSNET_AUTH_KEY}
    volumes:
      - tsnet-state:/app/tsnet-state

volumes:
  tsnet-state:
```

Set your auth key in `.env`:

```bash
GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
GOCLAW_TSNET_HOSTNAME=my-goclaw
```

Then bring it up:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.tailscale.yml up -d
```

## Accessing the Gateway

Once running, your gateway is reachable at:

```
http://my-goclaw.your-tailnet.ts.net     # HTTP (default)
https://my-goclaw.your-tailnet.ts.net    # HTTPS (if enable_tls: true)
```

You can find the full hostname in your [Tailscale admin console](https://login.tailscale.com/admin/machines).

## Common Issues

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| Node not appearing in Tailscale console | Invalid or expired auth key | Generate a new reusable key at admin/settings/keys |
| Tailscale listener not starting | Binary built without `-tags tsnet` | Rebuild with `go build -tags tsnet` |
| `GOCLAW_TSNET_HOSTNAME` ignored | Tag missing from build | Check `ENABLE_TSNET: "true"` in docker build args |
| State lost on container restart | Missing volume mount | Ensure `tsnet-state` volume is mounted to `state_dir` |
| Connection refused from Tailscale | `enable_tls` mismatch | Check whether you're using HTTP or HTTPS |

## What's Next

- [Production Checklist](#deploy-checklist) — secure your deployment end to end
- [Security Hardening](#deploy-security) — CORS, rate limits, and token auth
- [Docker Compose Setup](#deploy-docker-compose) — full compose overlay reference

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
