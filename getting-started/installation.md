# Installation

> Get GoClaw running on your machine in minutes.

## Overview

GoClaw compiles to a single static binary. You can build from source, use Docker, or download a pre-built release. Choose whichever fits your workflow.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Go | 1.25+ | Only for building from source |
| PostgreSQL | 15+ | Required for managed mode; needs `pgvector` extension |
| Docker | Latest | Only for Docker-based setup |

## Option 1: Build from Source

```bash
# Clone the repo
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Build the binary
go build -o goclaw .

# Verify
./goclaw --version
```

The output is a single ~25 MB binary with zero runtime dependencies.

### Build Tags (Optional)

Enable extra features at compile time:

```bash
# With OpenTelemetry tracing (~36 MB)
go build -tags otel -o goclaw .

# With Tailscale networking
go build -tags tsnet -o goclaw .

# With code sandbox
go build -tags sandbox -o goclaw .

# Combine multiple tags
go build -tags "otel,tsnet,sandbox" -o goclaw .
```

## Option 2: Docker

```bash
# Clone and build
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Build the image
docker build -t goclaw .
```

The Docker image is based on Alpine 3.22, runs as non-root user `goclaw` (UID 1000), and weighs ~50 MB.

### Docker Compose (Recommended)

The easiest way to run GoClaw with PostgreSQL and the web dashboard:

```bash
# Start all services
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

This starts:
- **GoClaw** on port `18790`
- **PostgreSQL** with pgvector extension
- **Web Dashboard** for visual management

### Environment Variables

Create a `.env` file before starting:

```bash
# Required
GOCLAW_GATEWAY_TOKEN=your-secure-token-here
GOCLAW_ENCRYPTION_KEY=your-encryption-key-here

# Provider API key (at least one)
GOCLAW_OPENROUTER_API_KEY=sk-or-...
# or GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
# or GOCLAW_OPENAI_API_KEY=sk-...
```

## Verify Installation

### Health Check

```bash
curl http://localhost:18790/health
# Expected: {"status":"ok"}
```

### Docker Logs

```bash
docker compose logs goclaw
# Look for: "gateway listening on :18790"
```

## Common Issues

| Problem | Solution |
|---------|----------|
| `go: module requires Go >= 1.25` | Update Go: `go install golang.org/dl/go1.25@latest` |
| `pgvector extension not found` | Install pgvector: `CREATE EXTENSION vector;` in PostgreSQL |
| Port 18790 already in use | Change port: set `GOCLAW_PORT=18791` in `.env` |
| Docker build fails on ARM Mac | Ensure Docker Desktop has Rosetta enabled |

## What's Next

- [Quick Start](quick-start.md) — Run your first agent
- [Configuration](configuration.md) — Customize GoClaw settings
