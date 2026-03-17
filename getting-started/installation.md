# Installation

> Get GoClaw running on your machine in minutes. Four paths: quick binary install, bare metal, Docker (local), or Docker on a VPS.

## Overview

GoClaw compiles to a single static binary (~25 MB). Pick the path that fits your setup:

| Path | Best for | What you need |
|------|----------|---------------|
| Quick Install (Binary) | Fastest single-command setup on Linux/macOS | curl, PostgreSQL |
| Bare Metal | Developers who want full control | Go 1.26+, PostgreSQL 15+ with pgvector |
| Docker (Local) | Run everything via Docker Compose | Docker + Docker Compose |
| VPS (Production) | Self-hosted production deployment | VPS $5+, Docker |

---

## Path 1: Quick Install (Binary)

Download and install the latest pre-built GoClaw binary in one command. No Go toolchain required.

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash
```

**Supported platforms:** Linux and macOS, both `amd64` and `arm64`.

**Options:**

```bash
# Install a specific version
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --version v1.30.0

# Install to a custom directory (default: /usr/local/bin)
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --dir /opt/goclaw
```

The script auto-detects your OS and architecture, downloads the matching release tarball from GitHub, and installs the binary. It uses `sudo` automatically if the target directory is not writable.

### After install: set up PostgreSQL

```bash
# Start a PostgreSQL instance with pgvector (Docker is the easiest option)
docker run -d --name goclaw-pg \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=goclaw \
  pgvector/pgvector:pg18
```

### Run the setup wizard

```bash
export GOCLAW_POSTGRES_DSN='postgres://postgres:goclaw@localhost:5432/postgres?sslmode=disable'
goclaw onboard
```

The wizard runs migrations, generates secrets, and saves everything to `.env.local`.

```bash
source .env.local && goclaw
```

---

## Path 2: Bare Metal

Install GoClaw directly on your machine. You manage Go, PostgreSQL, and the binary yourself.

### Step 1: Install PostgreSQL + pgvector

GoClaw requires **PostgreSQL 15+** with the **pgvector** extension (for vector similarity search in memory and skills). Docker deployments use **PostgreSQL 18** with pgvector (`pgvector/pgvector:pg18` image).

<details>
<summary><strong>Ubuntu 24.04+ / Debian 12+</strong></summary>

```bash
sudo apt update
sudo apt install -y postgresql postgresql-common

# Install pgvector (replace 17 with your PG version — check with: pg_config --version)
sudo apt install -y postgresql-17-pgvector

# Create database and enable extension
sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> **Note:** Ubuntu 22.04 and older ship PostgreSQL 14, which is not supported. Please upgrade to Ubuntu 24.04+ or use the Docker installation path.

</details>

<details>
<summary><strong>macOS (Homebrew)</strong></summary>

```bash
brew install postgresql pgvector
brew services start postgresql
createdb goclaw
psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

<details>
<summary><strong>Fedora / RHEL</strong></summary>

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo dnf install -y postgresql-devel git make gcc
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

**Verify installation:**

```bash
psql -d goclaw -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
# Should show: vector | 0.x.x
```

> On Linux, prefix with `sudo -u postgres` if your user doesn't have direct database access.

### Step 2: Clone & Build

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw
go build -o goclaw .
./goclaw version
```

> **Python runtime (optional):** Some built-in skills require Python 3. Install it with `sudo apt install -y python3 python3-pip` (Ubuntu/Debian) or `brew install python` (macOS) if you plan to use those skills.

**Build Tags (Optional):** Enable extra features at compile time:

```bash
go build -tags otel -o goclaw .              # OpenTelemetry tracing
go build -tags tsnet -o goclaw .             # Tailscale networking
go build -tags redis -o goclaw .             # Redis caching
go build -tags "otel,tsnet" -o goclaw .      # Combine multiple
```

### Step 3: Run Setup Wizard

```bash
./goclaw onboard
```

The wizard guides you through:
1. **Database connection** — enter host, port, database name, username, password (defaults work for typical local PostgreSQL)
2. **Connection test** — verifies PostgreSQL is reachable
3. **Migrations** — creates all required tables automatically
4. **Key generation** — auto-generates `GOCLAW_GATEWAY_TOKEN` and `GOCLAW_ENCRYPTION_KEY`
5. **Save secrets** — writes everything to `.env.local`

### Step 4: Start the Gateway

```bash
source .env.local && ./goclaw
```

### Step 5: Open the Dashboard

The web dashboard is a separate React app. In a new terminal:

```bash
cd ui/web
cp .env.example .env    # Required — configures backend connection
pnpm install
pnpm dev
```

Open `http://localhost:5173` and log in:
- **User ID:** `system`
- **Gateway Token:** found in `.env.local` (look for `GOCLAW_GATEWAY_TOKEN`)

After login, follow the [Quick Start](#quick-start) guide to add an LLM provider, create your first agent, and start chatting.

---

## Path 3: Docker (Local)

Run GoClaw with Docker Compose — PostgreSQL and the web dashboard included.

> **Note:** This setup includes PostgreSQL automatically via `docker-compose.postgres.yml`. You don't need to install it separately.

### Step 1: Clone & Configure

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Auto-generate encryption key + gateway token
./prepare-env.sh
```

### Step 2: Start Services

GoClaw uses modular Docker Compose files:
- `docker-compose.yml` — Core GoClaw gateway and API server
- `docker-compose.postgres.yml` — PostgreSQL database with pgvector extension
- `docker-compose.selfservice.yml` — Web dashboard UI (port 3000)

You need all three for a complete local setup. If you want just the gateway without the dashboard, you can skip the selfservice file.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  up -d --build
```

This starts:
- **GoClaw gateway** — `ws://localhost:18790`
- **PostgreSQL** with pgvector — port `5432`
- **Web Dashboard** — `http://localhost:3000`

GoClaw automatically runs pending database migrations on every start. No need to run `goclaw onboard` or `goclaw migrate` manually.

Open `http://localhost:3000` and log in:
- **User ID:** `system`
- **Gateway Token:** found in `.env` (look for `GOCLAW_GATEWAY_TOKEN`)

After login, follow the [Quick Start](#quick-start) guide to add an LLM provider, create your first agent, and start chatting.

### Optional Add-ons

Add more capabilities with Docker Compose overlay files:

| Overlay file | What it adds |
|---|---|
| `docker-compose.sandbox.yml` | Code sandbox for isolated script execution |
| `docker-compose.tailscale.yml` | Secure remote access via Tailscale |
| `docker-compose.otel.yml` | OpenTelemetry tracing (Jaeger UI on `:16686`) |
| `docker-compose.redis.yml` | Redis caching layer |
| `docker-compose.browser.yml` | Browser automation (Chrome sidecar) |
| `docker-compose.upgrade.yml` | Database upgrade service |

Append any overlay with `-f` when starting services:

```bash
# Example: add Redis caching
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.redis.yml \
  up -d --build
```

> **Note:** Redis and OTel overlays require rebuilding the GoClaw image with the corresponding build args (`ENABLE_REDIS=true`, `ENABLE_OTEL=true`). See the overlay files for details.

> **Python runtime:** The default `docker-compose.yml` builds GoClaw with `ENABLE_PYTHON: "true"`, so Python-based skills work out of the box in Docker.

---

## Path 4: VPS (Production)

Deploy GoClaw on a VPS with Docker. Suitable for always-on, internet-accessible setups.

> **Note:** PostgreSQL runs inside Docker. The compose file handles setup — you don't install it on the VPS system.

### Requirements

- **VPS**: 1 vCPU, 1 GB RAM minimum ($5 tier works). 2 vCPU / 2 GB recommended for heavier workloads.
- **OS**: Ubuntu 24.04+ or Debian 12+
- **Domain** (optional): For HTTPS/SSL via reverse proxy

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (official script — includes Compose plugin)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

### Step 2: Firewall

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable
```

### Step 3: Create Working Directory & Clone

```bash
sudo mkdir -p /opt/goclaw
sudo chown $(whoami):$(whoami) /opt/goclaw
git clone https://github.com/nextlevelbuilder/goclaw.git /opt/goclaw
cd /opt/goclaw

# Auto-generate secrets
./prepare-env.sh
```

### Step 4: Start Services

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  up -d --build
```

GoClaw automatically runs pending database migrations on every start. No need to run `goclaw onboard` or `goclaw migrate` manually.

### Step 4.5: Verify Services Started

Before setting up reverse proxy, make sure everything is running:

```bash
docker compose ps
# Should show all services as "Up"

docker compose logs goclaw | grep "gateway starting"
# Should see: "goclaw gateway starting"
```

### Step 5: Reverse Proxy with SSL

**DNS setup:** Create two A records pointing to your VPS IP:

| Record | Type | Value |
|--------|------|-------|
| `yourdomain.com` | A | `YOUR_VPS_IP` |
| `ws.yourdomain.com` | A | `YOUR_VPS_IP` |

**Caddy (Recommended):**

```bash
sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}

ws.yourdomain.com {
    reverse_proxy localhost:18790
}
```

```bash
sudo systemctl reload caddy
```

Caddy auto-provisions SSL certificates via Let's Encrypt.

**Nginx:**

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/goclaw`:

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
    }
}

server {
    server_name ws.yourdomain.com;
    location / {
        proxy_pass http://localhost:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/goclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d ws.yourdomain.com
```

### Step 6: Backup (Recommended)

Add a daily PostgreSQL backup cron job:

```bash
sudo mkdir -p /backup
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/goclaw && docker compose -f docker-compose.yml -f docker-compose.postgres.yml exec -T postgres pg_dump -U goclaw goclaw | gzip > /backup/goclaw-\$(date +\%Y\%m\%d).sql.gz") | crontab -
```

---

## Verify Installation

Works for all three paths:

```bash
# Health check
curl http://localhost:18790/health
# Expected: {"status":"ok"}

# Docker logs (Docker/VPS paths)
docker compose logs goclaw
# Look for: "goclaw gateway starting"

# Diagnostic check (bare metal)
./goclaw doctor
```

## Common Issues

| Problem | Solution |
|---------|----------|
| `go: module requires Go >= 1.26` | Update Go: `go install golang.org/dl/go1.26@latest` |
| `pgvector extension not found` | Run `CREATE EXTENSION vector;` in your goclaw database |
| Port 18790 already in use | Set `GOCLAW_PORT=18791` in `.env` (Docker) or `.env.local` (bare metal) |
| Docker build fails on ARM Mac | Enable Rosetta in Docker Desktop settings |
| `no provider API key found` | Add an LLM provider & API key through the Dashboard |
| `encryption key not set` | Run `./goclaw onboard` (bare metal) or `./prepare-env.sh` (Docker) |

## What's Next

- [Quick Start](#quick-start) — Run your first agent
- [Configuration](configuration.md) — Customize GoClaw settings
