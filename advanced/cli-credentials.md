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
```

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

## Typed Credential Adapters

The sections above describe the **legacy env-paste model** — you paste arbitrary environment variables and GoClaw injects them verbatim into the child process. That works for tools that read auth from a single stable env var (`GH_TOKEN`, `AWS_ACCESS_KEY_ID`, …), but it fails for tools like `git` that read credentials from config files, credential helpers, or per-remote URLs — pasting a PAT into `GIT_TOKEN` does nothing.

**Typed credential adapters** solve this. Instead of pasting raw env vars, you choose a credential *type*, and GoClaw routes the credential through a server-side adapter that knows how to inject it correctly and securely for that specific tool.

### Credential types

A typed credential row carries a `credential_type`:

| `credential_type` | Meaning |
|-------------------|---------|
| `NULL` / `env` | Legacy env passthrough — env vars injected verbatim, exactly as before. No host scoping. |
| `pat` | Personal Access Token, for HTTPS git remotes (GitHub/GitLab/Gitea). Requires a `host_scope`. |
| `ssh_key` | SSH private key (PEM), for git over SSH. Requires a `host_scope`. |

`NULL`/`env` rows are never migrated — existing legacy credentials keep working unchanged. Typed adapters are opt-in per credential.

### Agent credentials (default git path)

Agent credentials are the **default** path for git auth. They avoid channel-user ID ambiguity: the selected agent owns the credential, and anyone allowed to use that agent can cause it to run git with the stored credential.

Agent credentials live in the `secure_cli_agent_credentials` table (migration `000077`), which stores the typed secret material **separately** from the `secure_cli_agent_grants` policy row. There is one credential per `(agent, binary)`.

**Add an agent credential (UI):**

1. Open **Packages → CLI Credentials**.
2. Pick the `git` row and open **Agent Access**.
3. On the **Credential** tab, select the agent.
4. Choose **Credential Type**: `Personal Access Token` or `SSH Private Key`.
5. Enter the **Host Scope** (required for PAT/SSH): the hostname the credential authenticates to (e.g. `github.com`, `gitlab.example.com`, `gitea.internal:8443`).
6. Paste the token (PAT) or the unencrypted PEM body (SSH).
7. Save.

The **Agent Access** dialog has two tabs:

- **Credential** — pick the agent, credential type, host scope, and secret (above).
- **Access policy** — change deny args, timeout, tips, or env overrides for that agent (the `secure_cli_agent_grants` row).

Policy and secret storage stay separate internally, but you manage them as one access decision in this single dialog. The stored secret is AES-256-GCM encrypted and can never be read back — editing the row shows a `••••••••` placeholder.

### Effective credential precedence

When git runs, GoClaw resolves which typed credential to inject in this order — the **first** match wins:

1. **User override** — a per-user typed credential (Advanced user overrides, below).
2. **Channel/context credential** — a credential scoped to the channel or group context the run originated from.
3. **Agent credential** — the agent's own `secure_cli_agent_credentials` row. This is the default trust boundary.
4. **Binary-level env defaults** — the legacy passthrough env on the binary definition.

Granting an agent access to git effectively grants use of its stored git credential, so the agent credential is the default boundary unless a higher layer (user override or channel/context credential) is present.

### Advanced user overrides

Per-user credentials remain available for personal overrides and backward compatibility. Use them only when a stable tenant user ID is the intended credential boundary — they sit **above** agent credentials in the precedence order.

Manage them in the dashboard under **Packages → CLI Credentials → Advanced User Overrides → Add**: select the user, choose the credential type (`Personal Access Token` or `SSH Private Key`), enter the **Host Scope**, and paste the secret. The stored secret is AES-256-GCM encrypted and can never be read back — leaving the secret field blank on edit preserves the stored value, typing a new value replaces it.

These rows live in the `secure_cli_user_credentials` table.

### Agent credentials REST API

The agent-credentials endpoints manage the typed secret for one `(binary, agent)` pair. They require the `admin` role.

#### List agent credentials for a binary

```
GET /v1/cli-credentials/{id}/agent-credentials
```

Returns the agents that have a stored credential for this binary, with metadata only (credential type, host scope, key presence) — never the secret.

#### Get one agent's credential

```
GET /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

#### Set (create or replace) an agent's credential

```
PUT /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

Send `credential_type`, `host_scope`, and the secret (`env_vars` for `env`, or the typed PAT/SSH key body). The secret is encrypted at rest and never returned.

#### Delete an agent's credential

```
DELETE /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

Removes the stored secret. The agent's `secure_cli_agent_grants` policy row (deny args, timeout, etc.) is unaffected — delete the grant separately to revoke access.

### The git adapter

The `git` adapter is the first shipped typed adapter. It injects credentials **only** for network subcommands:

```
clone   fetch   pull   push   submodule
```

Any other subcommand (`status`, `log`, `diff`, `commit`, `branch`, …) is a local operation and runs **uncredentialed** — no injection, no audit-log line.

**PAT flow.** The token is injected through environment variables, never on `argv`:

```
GIT_CONFIG_COUNT=1
GIT_CONFIG_KEY_0=http.https://<host>/.extraheader
GIT_CONFIG_VALUE_0=Authorization: Basic base64("x-access-token:<token>")
```

The header value is HTTP Basic auth: the literal username `x-access-token` and your token joined by a colon, base64-encoded. Because the token lives in an env value (not a command-line flag), it never appears in `ps`, `/proc/<pid>/cmdline`, or shell history. The injected vars are scoped to the spawned `git` process only — GoClaw's own environment and sibling exec calls never see them.

The raw token, the base64 payload, **and** the full `Authorization: Basic …` header are all registered with the output scrubber, so none of the three can leak back to the agent through stdout, stderr, error messages, or the audit log.

**SSH flow.** The PEM key is written to a `0600`-mode tmpfile in the system temp dir (prefix `goclaw-gitkey-*`), and `GIT_SSH_COMMAND` is set to:

```
ssh -i <tmpfile> -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new
```

`BatchMode=yes` means SSH never prompts and fails fast in the agent context. `StrictHostKeyChecking=accept-new` accepts unknown host keys on **first contact (TOFU)**. Pre-seed `~/.ssh/known_hosts` to close the window (see [Security Hardening](/deploy-security)). The tmpfile is removed after exec via a deferred cleanup. **SSH private keys are validated twice at save time** — first with Go's SSH parser, then with OpenSSH (`ssh-keygen -y -f <tmpfile>`) when `ssh-keygen` is available — to catch keys that would save but later fail with OpenSSH diagnostics. **Passphrase-protected SSH keys are rejected at save time** — re-export your key without a passphrase, or use a dedicated deploy key.

### Host scope

Both `pat` and `ssh_key` require a **`host_scope`** — the exact ASCII `host` or `host:port` the credential is valid for. It is normalized to lowercase ASCII (via `idna.ToASCII`) and matched **exactly**. v1 has **no wildcards**, and the port is part of the key:

| Stored `host_scope` | `github.com` | `api.github.com` | `github.com:8443` |
|---------------------|:---:|:---:|:---:|
| `github.com` | ✓ | ✗ | ✗ |

If you run a self-hosted server on the scheme's default port (443 HTTPS, 22 SSH), omit the port; if on a non-default port, include it (e.g. `gitea.internal:8443`). When no typed PAT/SSH credential is selected, or the selected credential cannot match the resolved remote host, **adapter-managed remote git commands fail closed with a GoClaw diagnostic**. `git` is **not** allowed to fall through to an interactive username/password prompt in agent runtime.

### Env visibility: sensitive vs non-sensitive

Stored env entries now carry a `kind`. When the dashboard or admin API reads a credential back, the response masks values according to kind:

| `kind` | In API response |
|--------|-----------------|
| `sensitive` (default; legacy string maps decode here) | `value: null`, `masked: true` |
| `value` (explicitly non-sensitive, e.g. a region or profile name) | plain value returned, `masked: false` |

This lets operators see non-secret context (e.g. `AWS_DEFAULT_REGION=us-west-2`) in the UI while secrets stay masked. Secrets are still never returned except via the dedicated `env:reveal` endpoint.

### Migrating from legacy env credentials

There is no forced migration. A row with `credential_type IS NULL` or `= 'env'` keeps emitting its env vars exactly as before. To upgrade a git credential, create a matching **Agent Credential** (or, if a stable user ID is the intended boundary, an Advanced user override), enter the host scope, paste the secret, and save. Existing user overrides remain higher precedence than agent credentials, so you can migrate gradually and remove the user override when it is no longer needed.

### v1 limitations

- **One credential per `(agent, binary)` row**, plus a legacy one credential per `(user, binary)` override.
- **No wildcard hosts** — one credential per exact `host[:port]`; `*.github.com` is not supported.
- **No passphrase-protected SSH keys** — rejected at validation time.
- **No sandbox propagation** — the adapter mutates the forked child's environment, which is incompatible with the bind-mount Docker sandbox path. Credentialed exec runs on the host only in v1.
- **No host-key pinning** — SSH uses TOFU (`accept-new`); pre-seed `known_hosts`.

### Google Workspace CLI (gws)

GoClaw ships a `gws` preset for the Google Workspace CLI (`@googleworkspace/cli`).

**Availability.** The `gws` binary is preinstalled **only in the published `full` Docker image**. On `latest`/`base` images, install `@googleworkspace/cli` from the Packages page (requires a Node-enabled build, `ENABLE_NODE=true`; Node.js 18+).

**Credentials.** Create a SecureCLI credential from the `gws` preset and provide at least one auth source:

| Env var | Purpose |
|---------|---------|
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` | Path to exported `gws` credentials or an OAuth credentials JSON file |
| `GOOGLE_WORKSPACE_CLI_TOKEN` | Pre-obtained Google OAuth access token (optional) |
| `GOOGLE_WORKSPACE_CLI_CLIENT_ID` | OAuth client ID for manual auth flows (optional) |
| `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET` | OAuth client secret for manual auth flows (optional) |

**Blocked commands.** The preset blocks interactive and credential-exporting auth flows:

```
gws auth setup    gws auth login    gws auth export    gws auth logout
```

Run those flows outside agent execution, then store the resulting token or credentials-file path in SecureCLI.

**Usage.** Default usage is read-oriented. Use `--params` for query parameters, `--json` for request bodies, and `--page-all` for paginated reads:

```sh
gws drive files list --params '{"pageSize": 10}'
gws gmail users messages list --params '{"userId": "me", "maxResults": 10}'
gws calendar events list --params '{"calendarId": "primary", "maxResults": 10}'
```

> **Write caution.** Write commands can modify Workspace data. Keep the default preset read-oriented and create a separate, reviewed SecureCLI config for any approved write workflow.

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
| `git clone`/`push` fails with no credential | No typed credential matched the remote host — git fails closed (no prompt). Add an Agent Credential with the exact `host_scope`. |

## What's Next

- [Permission Matrix](/permission-matrix) — full authorization layers, channel/group scopes, and channel-context credentials
- [Database Schema → secure_cli_agent_grants](/database-schema)
- [Exec Approval](/exec-approval)
- [API Keys & RBAC](/api-keys-rbac)
- [Security Hardening](/deploy-security)

<!-- goclaw-source: fabe86b3 | updated: 2026-06-30 -->
