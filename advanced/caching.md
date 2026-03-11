# Caching

> Speed up repeated operations with in-memory or Redis caching.

## Overview

GoClaw uses a generic caching layer for internal operations like tool results, provider responses, and frequently accessed data. Two backends are available:

| Backend | When to use |
|---------|-------------|
| **In-memory** (default) | Single instance, development, small deployments |
| **Redis** | Multi-instance production, shared cache across replicas |

Both backends are **fail-open** — cache errors are logged as warnings but never block operations. A cache miss simply means the operation runs without cache.

---

## In-Memory Cache

The default cache — no configuration needed. Uses a thread-safe concurrent map with TTL-based expiration.

- Entries are checked on read; expired entries are removed automatically
- No background cleanup goroutine — cleanup happens lazily during reads and deletes
- Cache is lost on restart

Best for single-instance deployments where cache persistence isn't required.

---

## Redis Cache

Enable Redis caching by building GoClaw with the `redis` build tag and providing a Redis DSN.

**Key format:** `goclaw:{prefix}:{key}`

**Connection settings:**
- Pool size: 10 connections
- Min idle: 2 connections
- Dial timeout: 5s
- Read timeout: 3s
- Write timeout: 3s
- Health check: PING on connection

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
| `Get` | Returns value + found flag; removes expired entries |
| `Set` | Stores value with TTL |
| `Delete` | Removes single key |
| `DeleteByPrefix` | Removes all keys matching a prefix |
| `Clear` | Removes all cached entries |

**Error handling:** All errors are treated as cache misses. Redis connection failures, serialization errors, and timeouts are logged but never propagated to callers.

---

## What's Next

- [Database Setup](../deployment/database-setup.md) — PostgreSQL configuration
- [Production Checklist](../deployment/production-checklist.md) — Deploy with confidence
