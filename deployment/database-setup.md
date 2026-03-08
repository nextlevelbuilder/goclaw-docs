# Database Setup

> GoClaw requires PostgreSQL 15+ with the `pgvector` extension for multi-tenant storage, memory search, and usage tracking.

## Overview

All persistent state lives in PostgreSQL: agents, sessions, memory, traces, skills, cron jobs, and channel configs. The schema is managed via numbered migration files in `migrations/`. Two extensions are required: `pgcrypto` (UUID generation) and `vector` (semantic memory search via pgvector).

---

## Quick Start with Docker

The fastest path uses the provided compose overlay:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d
```

This starts `pgvector/pgvector:pg18` with a health check and wires `GOCLAW_POSTGRES_DSN` automatically. Skip to [Run Migrations](#run-migrations).

---

## Manual Setup

### 1. Install PostgreSQL 15+ with pgvector

On Ubuntu/Debian:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install pgvector (choose your PG version)
sudo apt install postgresql-16-pgvector
```

Using the official pgvector Docker image (recommended):

```bash
docker run -d \
  --name goclaw-postgres \
  -e POSTGRES_USER=goclaw \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=goclaw \
  -p 5432:5432 \
  pgvector/pgvector:pg18
```

### 2. Create the database and enable extensions

```sql
-- Connect as superuser
CREATE DATABASE goclaw;
\c goclaw

-- Required extensions (both are enabled by migration 000001 automatically)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

> The `vector` extension provides HNSW vector indexes used for memory similarity search. `pgcrypto` provides UUID v7 generation via `gen_random_bytes()`.

### 3. Set the connection string

Add to your `.env` file or shell environment:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:your-secure-password@localhost:5432/goclaw?sslmode=disable
```

For production with TLS:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@db.example.com:5432/goclaw?sslmode=require
```

The DSN is a standard `lib/pq` / `pgx` connection string. All standard PostgreSQL parameters are supported (`connect_timeout`, `pool_max_conns`, etc.).

---

## Run Migrations

GoClaw uses [golang-migrate](https://github.com/golang-migrate/migrate) with numbered SQL files.

```bash
# Apply all pending migrations
./goclaw migrate up

# Check current migration version
./goclaw migrate status

# Roll back one step
./goclaw migrate down

# Roll back to a specific version
./goclaw migrate down 3
```

With Docker (using the upgrade overlay):

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade
```

### Migration files

| File | What it creates |
|------|----------------|
| `000001_init_schema` | All core tables: agents, sessions, memory, traces, spans, skills, cron, pairing, MCP, custom tools, channels |
| `000002_agent_links` | `agent_links` table for agent-to-agent delegation |
| `000003_agent_teams` | Team and task tables for multi-agent teams |
| `000004_teams_v2` | Team metadata and task status improvements |
| `000005_phase4` | Additional phase-4 schema changes |
| `000006_builtin_tools` | Built-in tool configuration storage |
| `000007_team_metadata` | Team metadata JSONB fields |
| `000008_team_tasks_user_scope` | Per-user task scoping |
| `000009_add_quota_index` | Partial index for quota checker performance |
| `000010_agents_md_v2` | Agent metadata v2 schema |

Run `./goclaw migrate status` after deployment to confirm the current version.

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `agents` | Agent definitions, model config, tool config |
| `sessions` | Conversation history, token counts per session |
| `traces` / `spans` | LLM call tracing, token usage, costs |
| `memory_chunks` | Semantic memory (pgvector HNSW index, `vector(1536)`) |
| `memory_documents` | Memory document metadata |
| `embedding_cache` | Cached embeddings keyed by content hash + model |
| `llm_providers` | LLM provider configs (API keys encrypted AES-256-GCM) |
| `mcp_servers` | External MCP server connections |
| `custom_tools` | Dynamic shell-backed tools |
| `cron_jobs` / `cron_run_logs` | Scheduled tasks and run history |
| `skills` | Skill files with BM25 + vector search |
| `channel_instances` | Messaging channel configs (Telegram, Discord, etc.) |

---

## Backup and Restore

### Backup

```bash
# Full database dump (recommended — includes schema + data)
pg_dump -h localhost -U goclaw -d goclaw -Fc -f goclaw-backup.dump

# Schema only (for inspecting structure)
pg_dump -h localhost -U goclaw -d goclaw --schema-only -f goclaw-schema.sql

# Exclude large tables if needed (e.g., skip spans for smaller backups)
pg_dump -h localhost -U goclaw -d goclaw -Fc \
  --exclude-table=spans \
  -f goclaw-backup-no-spans.dump
```

### Restore

```bash
# Restore to a fresh database
createdb -h localhost -U postgres goclaw_restore
pg_restore -h localhost -U goclaw -d goclaw_restore goclaw-backup.dump
```

### Docker volume backup

```bash
# Backup the postgres-data volume
docker run --rm \
  -v goclaw_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Performance

### Connection pooling

GoClaw uses `pgx/v5` with `database/sql`. For high-concurrency deployments, set pool parameters in the DSN:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@localhost:5432/goclaw?sslmode=disable&pool_max_conns=20
```

Or use PgBouncer in front of PostgreSQL for connection pooling at scale.

### Key indexes

The schema includes these performance-critical indexes out of the box:

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_traces_quota` | `traces` | Per-user quota window queries (partial, top-level only) |
| `idx_mem_vec` | `memory_chunks` | HNSW cosine similarity search (`vector_cosine_ops`) |
| `idx_mem_tsv` | `memory_chunks` | Full-text BM25 search via `tsvector` GIN index |
| `idx_traces_user_time` | `traces` | Usage queries by user + time |
| `idx_sessions_updated` | `sessions` | Listing recent sessions |

The `idx_traces_quota` index is added as `CONCURRENTLY` in migration `000009` — it can be created without locking the table on live systems.

### Disk growth

The `spans` table grows quickly under heavy use (one row per LLM call span). Consider periodic pruning:

```sql
-- Delete spans older than 30 days
DELETE FROM spans WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete traces older than 90 days (cascades to spans)
DELETE FROM traces WHERE created_at < NOW() - INTERVAL '90 days';

VACUUM ANALYZE traces, spans;
```

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `extension "vector" does not exist` | pgvector not installed | Install `postgresql-XX-pgvector` or use the `pgvector/pgvector` Docker image |
| `migrate up` fails on first run | Extensions not enabled | Ensure the DB user has `SUPERUSER` or `CREATE EXTENSION` privilege |
| Connection refused | Wrong host/port in DSN | Check `GOCLAW_POSTGRES_DSN`; verify PostgreSQL is running |
| Memory search returns no results | Embedding model dimension mismatch | Schema uses `vector(1536)` — ensure your embedding model outputs 1536 dims |
| High disk usage | `spans` table unbounded growth | Schedule periodic `DELETE` + `VACUUM` on `spans` and `traces` |

---

## What's Next

- [Docker Compose](./docker-compose.md) — compose-based deployment with the postgres overlay
- [Security Hardening](./security-hardening.md) — AES-256-GCM encryption for secrets in the database
- [Observability](./observability.md) — querying traces and spans for LLM cost monitoring
