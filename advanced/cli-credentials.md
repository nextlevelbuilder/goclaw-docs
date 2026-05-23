# CLI Credentials

> Securely store and manage named credential sets for shell tool execution, with per-agent access control via grants.

## Overview

CLI Credentials let you define named credential sets (API keys, tokens, connection strings) that agents can reference when running shell commands via the `exec` tool — without exposing secrets in the system prompt or conversation history.

Each credential is stored as a **secure CLI binary** — a named configuration that maps a binary (e.g. `gh`, `gcloud`, `aws`) to an AES-256-GCM encrypted set of environment variables. When an agent runs the binary, GoClaw decrypts the env vars and injects them into the child process at execution time.

## Global vs Per-Agent Binaries

Since migration 036, the access model uses a **grants system** instead of per-binary agent assignment:

- **Global binaries** (`is_global = true`): available to all agents unless a grant overrides settings
- **Restricted binaries** (`is_global = false`): only accessible to agents that have an explicit grant

This separates credential definition from access control, allowing you to define a binary once and grant it to specific agents with optional per-agent overrides.

```
secure_cli_binaries (credential + defaults)
        │
        ├── is_global = true  → all agents can use it
        └── is_global = false → only agents with a grant
                    │
                    └── secure_cli_agent_grants (per-agent override)
                            ├── deny_args (NULL = use binary default)
                            ├── deny_verbose (NULL = use binary default)
                            ├── timeout_seconds (NULL = use binary default)
                            ├── tips (NULL = use binary default)
                            ├── enabled
                            └── encrypted_env (BYTEA, AES-256-GCM — optional per-grant env override)
```

## Agent Grants

The `secure_cli_agent_grants` table links a binary to a specific agent and optionally overrides any of the binary's default settings. `NULL` fields inherit the binary default.

| Field | Behaviour |
|-------|-----------|
| `deny_args` | Override forbidden argument patterns for this agent |
| `deny_verbose` | Override verbose flag stripping for this agent |
| `timeout_seconds` | Override process timeout for this agent |
| `tips` | Override the hint injected into TOOLS.md for this agent |
| `enabled` | Disable a grant without deleting it |
| `encrypted_env` | Optional per-grant env-var overrides (AES-256-GCM encrypted at rest) |

When an agent runs a binary, GoClaw resolves settings in this order:
1. Binary defaults
2. Grant overrides (any non-null fields replace the binary default)
3. Per-grant `encrypted_env` is decrypted and merged into the child process environment at execution time (overrides binary-level env vars for this agent only)

## Per-Agent Env Overrides

Since migration `000058`, each `secure_cli_agent_grants` row can carry an optional `encrypted_env` column (BYTEA, AES-256-GCM). This lets you give one agent a different set of environment variables for the same binary — for example, a different AWS account, a separate API key, or a staging endpoint — without creating a separate binary definition.

**How it works:**

- On grant create/update, send `env_vars` (a plaintext `string → string` map) in the request body.
- GoClaw validates the keys against the denylist, then encrypts and persists them in `encrypted_env`.
- Plaintext values are never stored or logged; the store layer encrypts before write and decrypts on read.
- List and get responses expose only `env_keys` (sorted list of key names) and `env_set` (boolean). Values are never returned except via the `env:reveal` endpoint.

**Create a grant with env overrides:**

```bash
curl -X POST http://localhost:8080/v1/cli-credentials/{id}/agent-grants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "019...",
    "env_vars": {
      "AWS_PROFILE": "staging",
      "AWS_DEFAULT_REGION": "us-west-2"
    }
  }'
```

Response (`201 Created`) includes `env_keys` but no values:

```json
{
  "id": "019...",
  "binary_id": "019...",
  "agent_id": "019...",
  "env_keys": ["AWS_DEFAULT_REGION", "AWS_PROFILE"],
  "env_set": true,
  "enabled": true,
  "created_at": "2026-05-21T00:00:00Z",
  "updated_at": "2026-05-21T00:00:00Z"
}
```

**Update env vars on an existing grant:**

Send `env_vars` in the `PUT` body. Three-state semantics:
- **Absent** — existing env is unchanged
- **`null`** — clears the env override (removes `encrypted_env`)
- **`{...}`** — replaces the entire env map (empty `{}` treated the same as `null`)

```bash
curl -X PUT http://localhost:8080/v1/cli-credentials/{id}/agent-grants/{grantId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_vars": null}'
```

## Revealing Decrypted Env Vars

`POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal` returns the decrypted plaintext env vars for a specific grant. The endpoint is POST (not GET) to prevent HTTP caching and satisfy CSRF semantics.

**Security controls:**
- Requires `admin` role scoped to the correct tenant — master-scope callers are rejected.
- Rate-limited to **10 reveals per minute per authenticated user** (burst of 3). Returns `429` when exceeded.
- Response headers include `Cache-Control: no-store` to prevent proxy caching.
- Every call is audited: caller ID, tenant ID, grant ID, binary ID, and timestamp are logged at INFO level.

```bash
curl -X POST http://localhost:8080/v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "env_vars": {
    "AWS_PROFILE": "staging",
    "AWS_DEFAULT_REGION": "us-west-2"
  }
}
```

Returns `{"env_vars": {}}` when no env override is set for the grant.

## Env Denylist

Not all environment variable names are accepted. GoClaw rejects keys that could allow privilege escalation, shell injection, TLS bypass, or exfiltration.

**Key shape requirement:** keys must match `^[A-Z_][A-Z0-9_]*$` — uppercase, digits, underscores only. Lowercase, spaces, and special characters (including Shellshock-class function definitions) are rejected.

**Exact-match denials:**

| Key | Reason |
|-----|--------|
| `PATH`, `HOME`, `USER`, `SHELL`, `PWD` | Core shell/user identity |
| `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT` | Dynamic linker hijack |
| `NODE_OPTIONS`, `NODE_PATH` | Node.js code injection |
| `PYTHONPATH`, `PYTHONHOME`, `PYTHONSTARTUP` | Python path/startup injection |
| `GIT_SSH_COMMAND`, `GIT_SSH`, `GIT_EXEC_PATH`, `GIT_CONFIG_SYSTEM` | Git command injection |
| `SSH_AUTH_SOCK` | SSH key forwarding |
| `BASH_ENV`, `ENV` | Non-interactive shell sourcing |
| `PROMPT_COMMAND` | Shell prompt execution |
| `PERL5LIB`, `RUBYOPT` | Perl/Ruby library injection |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` | Exfiltration channel / proxy bypass |
| `SSL_CERT_FILE`, `SSL_CERT_DIR`, `CURL_CA_BUNDLE` | TLS CA override (MitM) |
| `IFS` | Shell Internal Field Separator injection |

**Prefix-match denials:** any key beginning with `DYLD_`, `GOCLAW_`, `LD_`, or `NPM_CONFIG_` is rejected.

**Limits:** maximum 50 keys per grant; maximum 4 096 bytes per value; values must not contain NUL bytes or newlines.

A `400` response on create/update includes the rejected key names in `rejected_keys`:

```json
{
  "error": "env keys denied: LD_PRELOAD, PATH",
  "rejected_keys": "LD_PRELOAD,PATH"
}

## REST API

All grant endpoints are nested under the binary resource and require the `admin` role.

### List grants for a binary

```
GET /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "grants": [
    {
      "id": "019...",
      "binary_id": "019...",
      "agent_id": "019...",
      "deny_args": null,
      "timeout_seconds": 60,
      "enabled": true,
      "env_keys": [],
      "env_set": false,
      "created_at": "2026-04-05T00:00:00Z",
      "updated_at": "2026-04-05T00:00:00Z"
    }
  ]
}
```

### Create a grant

```
POST /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "agent_id": "019...",
  "timeout_seconds": 120,
  "tips": "Use --output json for all commands",
  "env_vars": {
    "MY_API_KEY": "secret-value"
  }
}
```

Omitted fields (`deny_args`, `deny_verbose`, `tips`, `enabled`, `env_vars`) default to `null` / `true`. `env_vars` values are encrypted at rest; only key names are returned in subsequent list/get calls.

### Get a grant

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### Update a grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Send only the fields to change. Allowed fields: `deny_args`, `deny_verbose`, `timeout_seconds`, `tips`, `enabled`, `env_vars`.

### Delete a grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Deleting a grant from a restricted binary (`is_global = false`) immediately revokes the agent's access to that binary.

### Reveal env vars for a grant

```
POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal
```

Returns the decrypted plaintext env vars. Rate-limited to 10 calls/minute per user. See [Revealing Decrypted Env Vars](#revealing-decrypted-env-vars) for full details.

## Common Patterns

### Allow only one agent to use a sensitive CLI tool

1. Create the binary with `is_global = false`
2. Create a grant for the target agent

### Give all agents access but restrict args for one agent

1. Create the binary with `is_global = true`
2. Create a grant for the restricted agent with `deny_args` set to additional blocked patterns

### Temporarily disable an agent's access

Update the grant: `{"enabled": false}`. The binary remains accessible to other agents.

## Common Issues

| Problem | Solution |
|---------|----------|
| Agent cannot run a binary | Check `is_global` on the binary — if `false`, the agent needs an explicit grant |
| Grant overrides not applied | Verify the grant `enabled = true` and that override fields are non-null |
| `403` on grant endpoints | Requires admin role — check API key scopes |

## What's Next

- [Database Schema → secure_cli_agent_grants](/database-schema)
- [Exec Approval](/exec-approval)
- [API Keys & RBAC](/api-keys-rbac)
- [Security Hardening](/deploy-security)

<!-- goclaw-source: 392f0fda | updated: 2026-05-21 -->
