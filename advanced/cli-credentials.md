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
                            └── enabled
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

When an agent runs a binary, GoClaw resolves settings in this order:
1. Binary defaults
2. Grant overrides (any non-null fields replace the binary default)

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
  "tips": "Use --output json for all commands"
}
```

Omitted fields (`deny_args`, `deny_verbose`, `tips`, `enabled`) default to `null` / `true`.

### Get a grant

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### Update a grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Send only the fields to change. Allowed fields: `deny_args`, `deny_verbose`, `timeout_seconds`, `tips`, `enabled`.

### Delete a grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Deleting a grant from a restricted binary (`is_global = false`) immediately revokes the agent's access to that binary.

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

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
