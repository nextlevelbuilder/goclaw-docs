# Database Issues

> Troubleshooting PostgreSQL migrations, pgvector, connection pool, and slow queries.

## Overview

GoClaw requires PostgreSQL 15+ with the `pgvector` and `pgcrypto` extensions. The database connection is configured exclusively via `GOCLAW_POSTGRES_DSN` (never stored in `config.json`). Migrations are managed with `golang-migrate` and run via `./goclaw migrate up`.

## Connection Failures

| Problem | Cause | Solution |
|---------|-------|----------|
| `GOCLAW_POSTGRES_DSN environment variable is not set` | DSN not exported | `export GOCLAW_POSTGRES_DSN=postgres://user:pass@host:5432/goclaw` |
| `open postgres: ...` | Invalid DSN format | Verify DSN; use `psql "$GOCLAW_POSTGRES_DSN"` to test manually |
| `ping postgres: dial error` | Postgres not running or wrong host/port | Start Postgres; check host, port, firewall |
| `ping postgres: password authentication failed` | Wrong credentials | Verify username and password in DSN |
| `ping postgres: database "goclaw" does not exist` | DB not created | `createdb goclaw` or `psql -c "CREATE DATABASE goclaw;"` |

GoClaw uses a fixed connection pool: **25 max open connections**, **10 max idle connections**. Adjust `max_connections` in `postgresql.conf` if you run multiple GoClaw instances.

**Connection pool exhaustion symptoms:** If all 25 connections are in use, new requests queue until a connection frees. Symptoms include sudden query latency spikes, timeout errors, and log lines like `pq: sorry, too many clients already`. To diagnose:

```sql
-- Check active connections to the goclaw database
SELECT count(*) FROM pg_stat_activity WHERE datname = 'goclaw';
```

If running multiple GoClaw instances, ensure `max_connections` in `postgresql.conf` is at least `25 × instances + 5`.

## Migration Failures

Run migrations manually:

```bash
./goclaw migrate up
```

| Problem | Cause | Solution |
|---------|-------|----------|
| `create migrator: ...` | Migrations directory not found | Run from the directory containing `migrations/`, or set `GOCLAW_MIGRATIONS_DIR` |
| `migrate up: ...` | SQL error in migration | Check Postgres logs; fix the underlying SQL issue |
| `dirty: true` in version output | Previous migration failed mid-way | Fix the failed migration manually, then run `./goclaw migrate force <version>` |
| `no change` | All migrations already applied | Normal — nothing to do |
| Data hooks failed (warning) | Post-migration data hook error | Non-fatal warning; check logs for details and re-run if needed |

**Recovering from a dirty state:**

```bash
# Check current version and dirty flag
./goclaw migrate version

# Force-set the version to the last known good migration (no SQL applied)
./goclaw migrate force <version_number>

# Then apply migrations again
./goclaw migrate up
```

## pgvector and pgcrypto Extensions

GoClaw requires **both** `pgvector` and `pgcrypto`. The first migration (`000001_init_schema.up.sql`) creates both extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

`pgcrypto` is used for UUID generation (`gen_random_uuid()`). It is bundled with PostgreSQL's `postgresql-contrib` package on most platforms.

| Problem | Cause | Solution |
|---------|-------|----------|
| `extension "pgcrypto" does not exist` | `postgresql-contrib` not installed | `apt install postgresql-contrib` (Debian) or `brew install postgresql` already includes it |
| Migration fails at `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` | Insufficient privileges | Connect as superuser or grant `CREATE EXTENSION` privilege |

## pgvector Extension

GoClaw uses `pgvector` for semantic memory search (1536-dimension HNSW indexes on `memory_chunks`, `skills`).

| Problem | Cause | Solution |
|---------|-------|----------|
| `extension "vector" does not exist` | pgvector not installed | Install pgvector: `apt install postgresql-15-pgvector` (Debian) or build from source |
| Migration fails at `CREATE EXTENSION IF NOT EXISTS "vector"` | Insufficient privileges | Connect as superuser or grant `CREATE EXTENSION` privilege |
| Vector search returns no results | Embeddings not generated | Check that an embedding-capable provider (Anthropic, OpenAI) is registered and the embedding backfill has run |
| HNSW index build is slow | Large `memory_chunks` table | Normal for first-time index creation; runs once during migration |

**Install pgvector on common platforms:**

```bash
# Debian/Ubuntu
apt install postgresql-15-pgvector

# macOS with Homebrew
brew install pgvector

# Docker (use the pgvector image)
docker pull pgvector/pgvector:pg15
```

## Slow Queries

Key indexes created by GoClaw's schema:

- Sessions: `idx_sessions_updated` (updated_at DESC), `idx_sessions_agent`, `idx_sessions_user`
- Memory: `idx_mem_vec` (HNSW vector cosine), `idx_mem_tsv` (GIN full-text), `idx_mem_agent_user`
- Traces: `idx_traces_agent_time`, `idx_traces_status` (errors only)
- Skills: `idx_skills_embedding` (HNSW), `idx_skills_visibility`

If queries are slow despite indexes:

```sql
-- Check for missing ANALYZE (stale statistics)
ANALYZE memory_chunks;
ANALYZE sessions;

-- Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

For vector search specifically, ensure `work_mem` is high enough for HNSW probes:

```sql
-- Session-level (or add to postgresql.conf)
SET work_mem = '256MB';
```

## Embedding Backfill

GoClaw automatically backfills embeddings at startup. When an embedding-capable provider (Anthropic or OpenAI) is configured, GoClaw launches background goroutines that call `BackfillEmbeddings` (memory chunks) and `BackfillSkillEmbeddings` (skills) for any rows with `embedding IS NULL`. This runs once per startup.

Watch for these startup log lines:

```
INFO memory embeddings enabled provider=anthropic model=text-embedding-3-small
INFO memory embeddings backfill complete chunks_updated=42
INFO skill embeddings backfill complete updated=5
```

If the log shows `memory embeddings disabled (no API key), chunks stored without vectors`, configure an embedding provider first.

If memory documents or skills were inserted before an embedding provider was configured, their `embedding` columns will be NULL and vector search will skip them.

To check for un-embedded rows:

```sql
SELECT COUNT(*) FROM memory_chunks WHERE embedding IS NULL;
SELECT COUNT(*) FROM skills WHERE embedding IS NULL AND status = 'active';
```

If backfill failed (check logs for `memory embeddings backfill failed`), restart GoClaw after fixing the provider — backfill will run again automatically.

## Backup and Restore

GoClaw uses standard PostgreSQL — any standard backup method works.

```bash
# Backup
pg_dump "$GOCLAW_POSTGRES_DSN" -Fc -f goclaw_backup.dump

# Restore
pg_restore -d "$GOCLAW_POSTGRES_DSN" --clean goclaw_backup.dump

# After restore, re-run migrations to ensure schema is current
./goclaw migrate up
```

After restoring, verify the pgvector extension is present:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## What's Next

- [Common Issues](#troubleshoot-common)
- [Provider issues](#troubleshoot-providers)
- [Channel issues](#troubleshoot-channels)

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
