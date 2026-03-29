# API Keys & RBAC

> Manage API keys with role-based access control for multi-user and programmatic access deployments.

## Overview

GoClaw uses a **5-layer permission system**. API keys and roles sit at layer 1 — gateway authentication. When a request arrives, GoClaw checks the `Authorization: Bearer <token>` header, resolves the token to a role, and enforces that role against the method being called.

Three roles exist:

| Role | Level | Description |
|------|-------|-------------|
| `admin` | 3 | Full access — can manage API keys, agents, config, teams, and everything below |
| `operator` | 2 | Read + write — can chat, manage sessions, crons, approvals, pairing |
| `viewer` | 1 | Read-only — can list/get resources but cannot modify anything |

Roles are **not set directly on an API key**. Instead, you assign **scopes** and GoClaw derives the effective role from those scopes at runtime.

---

## Scopes

| Scope | Grants |
|-------|--------|
| `operator.admin` | `admin` role — full access including key management and config |
| `operator.write` | `operator` role — write operations (chat, sessions, crons) |
| `operator.approvals` | `operator` role — exec approval accept/deny |
| `operator.pairing` | `operator` role — device pairing operations |
| `operator.read` | `viewer` role — read-only listing and fetching |

**Role derivation (highest-privilege-wins)** via `RoleFromScopes()` in `permissions/policy.go`:

```
admin scope present              → RoleAdmin
write / approvals / pairing      → RoleOperator
read scope only                  → RoleViewer
default (no scopes)              → RoleViewer
```

A key can hold multiple scopes — the highest-privilege scope wins.

---

## Method Permissions

| Methods | Required role |
|---------|---------------|
| `api_keys.list`, `api_keys.create`, `api_keys.revoke` | admin |
| `config.apply`, `config.patch` | admin |
| `agents.create`, `agents.update`, `agents.delete` | admin |
| `channels.toggle` | admin |
| `teams.list`, `teams.create`, `teams.delete` | admin |
| `pairing.approve`, `pairing.revoke` | admin |
| `chat.send`, `chat.abort` | operator |
| `sessions.delete`, `sessions.reset`, `sessions.patch` | operator |
| `cron.create`, `cron.update`, `cron.delete`, `cron.toggle` | operator |
| `approvals.*`, `exec.approval.*` | operator |
| `pairing.*`, `device.pair.*` | operator |
| `send` | operator |
| Everything else (list, get, read) | viewer |

---

## Backward Compatibility

If `GOCLAW_GATEWAY_TOKEN` is empty (no gateway token configured), all requests — including unauthenticated ones — are granted `RoleOperator` access automatically. This lets self-hosted setups work without strict auth. Once a token is set, all requests must provide valid credentials or they receive `401 Unauthorized`.

---

## Authentication

All API requests use HTTP Bearer token authentication:

```
Authorization: Bearer <your-api-key>
```

The gateway also accepts the static token from `auth.token` in `config.json`. That token acts as a super-admin with no scope restrictions. API keys are the recommended way to grant scoped, revocable access to external systems.

---

## Key Format

API keys follow the format `goclaw_` + 32 lowercase hex characters (16 random bytes, 128-bit entropy):

```
goclaw_a1b2c3d4e5f6789012345678901234567890abcdef
```

The **display prefix** shown in list responses is `goclaw_` + the first 8 hex chars of the random part (e.g., `goclaw_a1b2c3d4`). This lets you identify a key in the UI without storing the secret.

**Show-once pattern:** the raw `key` field is returned only in the create response. All subsequent list/get calls return only `prefix`. Copy the key immediately after creation — it cannot be retrieved again.

---

## Creating an API Key

**Requires: admin role**

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-pipeline",
    "scopes": ["operator.read", "operator.write"],
    "expires_in": 2592000
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Display name, max 100 characters |
| `scopes` | yes | One or more valid scope strings |
| `expires_in` | no | TTL in seconds; omit or set `null` for a non-expiring key |

Response (HTTP 201):

```json
{
  "id": "01944f3a-1234-7abc-8def-000000000001",
  "name": "ci-pipeline",
  "prefix": "goclaw_a1b2c3d4",
  "key": "goclaw_a1b2c3d4e5f6789012345678901234567890abcdef",
  "scopes": ["operator.read", "operator.write"],
  "expires_at": "2026-04-15T00:00:00Z",
  "created_at": "2026-03-16T10:00:00Z"
}
```

**The `key` field is shown only once.** Store it immediately — it cannot be retrieved again. Only the SHA-256 hash is kept in the database.

---

## Listing API Keys

**Requires: admin role**

```bash
curl http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>"
```

Response (HTTP 200):

```json
[
  {
    "id": "01944f3a-1234-7abc-8def-000000000001",
    "name": "ci-pipeline",
    "prefix": "goclaw_a1b2c3d4",
    "scopes": ["operator.read", "operator.write"],
    "expires_at": "2026-04-15T00:00:00Z",
    "last_used_at": "2026-03-16T09:55:00Z",
    "revoked": false,
    "created_at": "2026-03-16T10:00:00Z"
  }
]
```

The `prefix` field (first 8 characters) lets you identify a key without storing the secret. The raw key is never returned after creation.

---

## Revoking an API Key

**Requires: admin role**

```bash
curl -X POST http://localhost:8080/v1/api-keys/<id>/revoke \
  -H "Authorization: Bearer <admin-token>"
```

Response (HTTP 200):

```json
{ "status": "revoked" }
```

Revocation takes effect immediately — the key is marked revoked in the database and the in-process cache is cleared via pubsub.

---

## WebSocket RPC Methods

API key management is also available over the WebSocket connection. All three methods require `operator.admin` scope.

### List keys

```json
{ "type": "req", "id": "1", "method": "api_keys.list" }
```

### Create a key

```json
{
  "type": "req",
  "id": "2",
  "method": "api_keys.create",
  "params": {
    "name": "dashboard-readonly",
    "scopes": ["operator.read"]
  }
}
```

### Revoke a key

```json
{
  "type": "req",
  "id": "3",
  "method": "api_keys.revoke",
  "params": { "id": "01944f3a-1234-7abc-8def-000000000001" }
}
```

---

## Security Details

### SHA-256 hashing

Raw API keys are never stored. On creation, GoClaw generates a random key, stores only its `SHA-256` hex digest, and returns the raw value once. Every inbound request is hashed before the database lookup.

### In-process cache with TTL

After the first lookup, the resolved key data and role are cached in memory for **5 minutes**. This eliminates repeated database round-trips on busy endpoints. The cache is keyed by hash — not the raw token.

### Negative cache

If an unknown token is presented (e.g., a typo or a revoked key that has since been evicted), GoClaw caches the miss as a **negative entry** to avoid hammering the database. The negative cache is capped at **10,000 entries** to prevent memory exhaustion from token-spraying attacks.

### Cache invalidation

When a key is created or revoked, a `cache.invalidate` event is broadcast on the internal message bus. All active HTTP handlers clear their caches immediately — no stale entries survive a revocation.

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` on key management endpoints | Caller is not admin role | Use the gateway token or a key with `operator.admin` scope |
| `400 invalid scope: X` | Scope string is not recognised | Use only: `operator.admin`, `operator.read`, `operator.write`, `operator.approvals`, `operator.pairing` |
| `400 name is required` | `name` field missing or empty | Add `"name": "..."` to the request body |
| `400 scopes is required` | `scopes` array is empty or missing | Include at least one scope |
| Key shows `revoked: false` after revocation | Cache TTL (5 min) not yet expired | Wait up to 5 minutes or restart the gateway |
| Raw key lost after creation | Raw key is only returned once by design | Revoke the key and create a new one |
| `404` on revoke | Key ID is wrong or already revoked | Double-check the UUID from the list endpoint |

---

## What's Next

- [Authentication & OAuth](/authentication) — gateway token and OAuth flow
- [Exec Approval](/exec-approval) — require `operator.approvals` scope
- [Security Hardening](/deploy-security) — full 5-layer permission overview
- [CLI Credentials](./cli-credentials.md) — SecureCLI: inject credentials into CLI tools (gh, aws, gcloud) without exposing secrets to the agent

<!-- goclaw-source: 57754a5 | updated: 2026-03-23 -->
