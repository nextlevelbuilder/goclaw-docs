# Caching

> Reduce database queries with in-memory or Redis caching for frequently accessed data.

## Overview

GoClaw uses a generic caching layer to reduce repeated database queries. Three cache instances are created at startup:

| Cache instance | Key prefix | What it stores |
|----------------|------------|----------------|
| `ctx:agent` | Agent-level context files | `SOUL.md`, `IDENTITY.md`, etc. per agent |
| `ctx:user` | User-level context files | Per-user context files keyed by `agentID:userID` |
| `grp:writers` | Group file writer lists | Writer permission lists keyed by `agentID:groupID` |

All three instances share the same TTL: **5 minutes**.

Two backends are available:

| Backend | When to use |
|---------|-------------|
| **In-memory** (default) | Single instance, development, small deployments |
| **Redis** | Multi-instance production, shared cache across replicas |

Both backends are **fail-open** — cache errors are logged as warnings but never block operations. A cache miss simply means the operation proceeds with a fresh database query.

---

## In-Memory Cache

The default cache — no configuration needed. Uses a thread-safe `sync.Map` with TTL-based expiration.

- Entries are checked on read; expired entries are deleted lazily on access
- No background cleanup goroutine — cleanup happens on `Get` and `Delete` calls only
- Cache is lost on restart

Best for single-instance deployments where cache persistence isn't required.

---

## Redis Cache

Enable Redis caching by building GoClaw with the `redis` build tag and setting `GOCLAW_REDIS_DSN`.

```bash
go build -tags redis ./...
export GOCLAW_REDIS_DSN="redis://localhost:6379/0"
```

If `GOCLAW_REDIS_DSN` is unset or the connection fails at startup, GoClaw falls back to in-memory cache automatically.

**Key format:** `goclaw:{prefix}:{key}`

For example, an agent context file entry is stored as `goclaw:ctx:agent:<agentUUID>`.

**Connection settings:**
- Pool size: 10 connections
- Min idle: 2 connections
- Dial timeout: 5s
- Read timeout: 3s
- Write timeout: 3s
- Health check: PING on startup

**DSN format:**
```
redis://localhost:6379/0
redis://:password@redis.example.com:6379/1
```

Values are serialized as JSON. Pattern deletion uses SCAN with batch size of 100 keys per iteration.

---

## Cache Behavior

Both backends implement the same interface:

| Operation | Behavior |
|-----------|----------|
| `Get` | Returns value + found flag; for in-memory, deletes expired entries on read |
| `Set` | Stores value with TTL; TTL of `0` means the entry never expires |
| `Delete` | Removes single key |
| `DeleteByPrefix` | Removes all keys matching a prefix (in-memory: range scan; Redis: SCAN + DEL) |
| `Clear` | Removes all entries under the cache instance's key prefix |

**Error handling:** All Redis errors are treated as cache misses. Connection failures, serialization errors, and timeouts are logged but never propagated to callers.

---

## What's Next

- [Database Setup](../deployment/database-setup.md) — PostgreSQL configuration
- [Production Checklist](../deployment/production-checklist.md) — Deploy with confidence
