# Workstations

> Run agent commands on remote machines through SSH or Docker, with a per-workstation allowlist and a full audit trail.

## Overview

A **workstation** is a remote execution target registered in GoClaw. When an agent calls the built-in `workstation_exec` tool, the gateway opens a session against the linked workstation, runs the command, streams stdout/stderr back as event-bus chunks, and writes one row to the activity log.

Workstations are tenant-scoped and Standard-edition only. Two backend types are shipped:

| Backend | `backendType` | Transport | Notes |
|---------|---------------|-----------|-------|
| SSH | `ssh` | OpenSSH client + pooled sessions | Inline PEM private key or password. TOFU host-key fingerprinting |
| Docker | `docker` | Docker engine API | Image + container name; useful for ephemeral sandbox targets |

The connection pool is shared per workstation row, so repeated `workstation_exec` calls reuse a warm SSH client instead of paying the TCP+TLS handshake every time.

## Lifecycle

1. **Create** the workstation — POST `/v1/workstations` with `workstationKey`, `name`, `backendType`, and `metadata`.
2. **Test** the connection — `POST /v1/workstations/{id}/test`. The SSH backend dials, runs `echo ok`, and tears down within 5 seconds.
3. **Seed the allowlist** — happens automatically on create. See [Permission model](#permission-model).
4. **Link an agent** — over WebSocket: `workstations.linkAgent` with `{agentId, workstationId, isDefault}`.
5. **Use it** — the agent calls the `workstation_exec` tool. Every call passes through the permission checker and is recorded in `workstation_activity`.

`workstationKey` is the stable slug used in API calls; the regex is `^[a-z0-9][a-z0-9-]{0,99}$`.

## Endpoints

All HTTP endpoints require a tenant-admin gateway token (`Authorization: Bearer <admin-token>`).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/workstations` | List active workstations |
| `POST` | `/v1/workstations` | Create a workstation |
| `GET` | `/v1/workstations/{id}` | Fetch one (sanitized view) |
| `PUT` | `/v1/workstations/{id}` | Partial update |
| `DELETE` | `/v1/workstations/{id}` | Hard delete (tenant-scoped) |
| `POST` | `/v1/workstations/{id}/test` | Health-check the backend |
| `GET` | `/v1/workstations/{id}/permissions` | List allowlist patterns |
| `POST` | `/v1/workstations/{id}/permissions` | Add a pattern (default enabled) |
| `DELETE` | `/v1/workstations/{id}/permissions/{permId}` | Remove a pattern |
| `PUT` | `/v1/workstations/{id}/permissions/{permId}/toggle` | Enable/disable a pattern |
| `GET` | `/v1/workstations/{id}/activity` | Paged audit log (`limit`, `cursor`) |

The same operations are also exposed as WebSocket RPC methods under `workstations.*` (see [WebSocket Protocol](/websocket-protocol)). `workstations.linkAgent` / `workstations.unlinkAgent` are only available over WebSocket.

### Create

```bash
curl -X POST https://gw.example.com/v1/workstations \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workstationKey": "build-vm",
    "name": "Build VM (us-west)",
    "backendType": "ssh",
    "metadata": {
      "host": "10.0.4.21",
      "port": 22,
      "user": "deploy",
      "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
      "knownHostsFingerprint": "SHA256:abcdef..."
    },
    "defaultCwd": "/srv/builds",
    "defaultEnv": {"PATH": "/usr/local/bin:/usr/bin"}
  }'
```

Response (201 Created) returns a **sanitized view** — the private key and password are never echoed back. Only a metadata summary (`host`, `port`, `user`, `hasKey`) is included:

```json
{
  "workstation": {
    "id": "1c2d...",
    "workstationKey": "build-vm",
    "tenantId": "...",
    "name": "Build VM (us-west)",
    "backendType": "ssh",
    "defaultCwd": "/srv/builds",
    "active": true,
    "createdAt": "2026-05-21T12:00:00Z",
    "metadataSummary": {"host": "10.0.4.21", "port": 22, "user": "deploy", "hasKey": true}
  }
}
```

### SSH metadata

| Field | Required | Notes |
|-------|----------|-------|
| `host` | yes | DNS name or IP |
| `user` | yes | Remote user |
| `port` | no | Defaults to `22`; must be 1–65535 |
| `privateKey` | one of `privateKey`/`password` | PEM-encoded; stored AES-256-GCM encrypted |
| `password` | one of `privateKey`/`password` | Prefer key auth |
| `knownHostsFingerprint` | recommended | `SHA256:...` of the host key. Empty → TOFU on first connect |
| `connectTimeoutSec` | no | Overrides the 10s TCP dial timeout |

### Docker metadata

| Field | Required | Notes |
|-------|----------|-------|
| `image` | yes | Container image reference |
| `host` | one of `host`/`socketPath` | Remote Docker daemon URL |
| `socketPath` | one of `host`/`socketPath` | Local UNIX socket path |
| `network` | no | Docker network to attach to |

## Permission model

Workstations run a **default-deny** allowlist scoped to `argv[0]` — the binary name. Wildcard `*` is intentionally not supported.

`workstation_permissions` rows live in their own table (migration `000063`) and seed automatically when a workstation is created. The default seed is a small set of read-only or low-risk binaries:

```
echo, pwd, ls, cat, git, whoami, hostname, date, uname, claude
```

Shells (`bash`, `sh`, `zsh`) are deliberately excluded — adding one would bypass the entire model by accepting arbitrary commands as arguments.

Each pattern is either a literal binary name (`git`) or a prefix-glob (`python*`). To extend the allowlist:

```bash
curl -X POST https://gw.example.com/v1/workstations/<id>/permissions \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"pattern": "make"}'
```

Toggle a pattern off without deleting it:

```bash
curl -X PUT https://gw.example.com/v1/workstations/<id>/permissions/<permId>/toggle \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"enabled": false}'
```

A disabled pattern stays in the table but is skipped by the runtime checker.

## Linking an agent

Use the WebSocket RPC method `workstations.linkAgent`:

```json
{
  "id": "req-1",
  "method": "workstations.linkAgent",
  "params": {
    "agentId": "<agent-uuid>",
    "workstationId": "<ws-uuid>",
    "isDefault": true
  }
}
```

The `agent_workstation_links` table allows one default workstation per agent — setting `isDefault=true` clears any prior default. To unlink, call `workstations.unlinkAgent` with the same `agentId` and `workstationId`.

When an agent runs the `workstation_exec` tool without explicitly naming a workstation, the gateway resolves it through this link table.

## Activity audit

Every call to `workstation_exec` writes one row to `workstation_activity` (migration `000064`). The table is append-only and pruned nightly via `Prune(before)` on the store interface.

| Field | Notes |
|-------|-------|
| `action` | `"exec"` or `"deny"` |
| `cmdHash` | SHA-256 of the full command (forensics) |
| `cmdPreview` | First 200 chars with secrets redacted |
| `exitCode`, `durationMs` | Populated for `exec` rows; null for `deny` |
| `denyReason` | Populated for `deny` rows (e.g. `"binary 'curl' not allowed"`) |

Read the log paged from newest to oldest:

```bash
curl "https://gw.example.com/v1/workstations/<id>/activity?limit=50" \
  -H "Authorization: Bearer <admin-token>"
```

The response includes `activity` (array) and `nextCursor` (pass back as `?cursor=...` to page further).

## Using `workstation_exec`

Once a workstation is linked and the allowlist contains the binary you need, an agent can call the tool directly. The tool streams stdout/stderr as event-bus chunks (`execChunkSize` 64 KiB), enforces caps on command length (`4 KiB`), argument bytes (`1 KiB`), env count (`50`) and env value size (`256` bytes each), and returns the exit code plus a 2 KiB tail of each stream.

Each call rebuilds env from `defaultEnv` on the workstation row plus any overrides passed to the tool. Env keys denied by [`env_denylist`](/cli-credentials) (e.g. `LD_PRELOAD`, AWS root creds) are stripped before the SSH session is created.

## Security considerations

- **Encrypted at rest.** `metadata` and `defaultEnv` are stored AES-256-GCM encrypted. The same `GOCLAW_ENCRYPTION_KEY` env var that gates webhooks also encrypts workstation credentials.
- **Sanitized responses.** Every API response uses `SanitizedWorkstation` — private keys, passwords, and the raw `defaultEnv` map never leave the gateway.
- **Tenant isolation.** Every store query is tenant-scoped; the handler also re-checks ownership via `GetByID` before permission and activity operations.
- **Host-key TOFU.** A workstation with an empty `knownHostsFingerprint` accepts the first host key and pins it for all subsequent connections. Pre-populate the fingerprint for production targets.
- **Env denylist.** Forbidden env keys (loader hooks, ambient cloud credentials) are stripped before exec — see [CLI Credentials](/cli-credentials) for the full list.
- **Default-deny allowlist.** Only seeded safe binaries can run until an admin extends the list. There is no `*` shortcut.

## Common workflows

**Wire a remote build host to an agent.**

```bash
# 1. Create the workstation
curl -X POST .../v1/workstations -d @ssh-build-host.json

# 2. Extend the allowlist with the binaries the build needs
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"make"}'
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"npm"}'

# 3. Link the agent (over WebSocket) with isDefault=true
# 4. Ask the agent to run `make build`; the tool streams output back live.
```

**Audit what an agent ran overnight.**

```bash
curl ".../v1/workstations/<id>/activity?limit=200" \
  -H "Authorization: Bearer <admin-token>"
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `501 not implemented` from `/test` | Test connection is a stub; full implementation pending | Validate connectivity with a tiny `echo` exec instead |
| `invalid slug: workstationKey` | Key contains uppercase, underscores, or `>100` chars | Use kebab-case ASCII, e.g. `build-vm-west` |
| `invalid metadata shape: ssh: privateKey or password is required` | Empty creds in SSH metadata | Supply either an inline PEM or a password |
| `binary 'curl' not allowed` deny rows | Allowlist doesn't include the binary | Add a pattern via `POST /v1/workstations/{id}/permissions` |
| `404 workstation not found` after a cross-tenant call | Workstation belongs to a different tenant | Use a token scoped to the correct tenant |
| `ssh: health check dial` errors | Host unreachable, wrong port, or bad fingerprint | Verify network reachability and `knownHostsFingerprint` |

## What's Next

- [Tools Overview](/tools-overview) — how `workstation_exec` fits among the built-in tools
- [CLI Credentials](/cli-credentials) — env denylist, secret injection
- [REST API → Workstations](/rest-api)
- [WebSocket Protocol → workstations.*](/websocket-protocol)
- [Database Schema](/database-schema) — `workstations`, `workstation_permissions`, `workstation_activity`

<!-- goclaw-source: 392f0fda | updated: 2026-05-21 -->
