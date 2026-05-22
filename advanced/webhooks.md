# Webhooks

> Trigger agents or deliver channel messages from external systems via HMAC-authenticated HTTP endpoints.

## Overview

GoClaw webhooks expose two HTTP entry points that let external systems drive the gateway without speaking the WebSocket RPC protocol:

| Kind | Endpoint | Purpose | Editions |
|------|----------|---------|----------|
| `llm` | `POST /v1/webhooks/llm` | Invoke an agent with a user prompt (sync or async) | Standard + Lite |
| `message` | `POST /v1/webhooks/message` | Send a message to a user on a connected channel | Standard only |

Each webhook is a tenant-scoped registry row. An admin creates the row via the CRUD API and receives a one-time bearer secret plus an HMAC signing key; callers then authenticate inbound requests with either credential.

> **Encryption key required.** The webhook subsystem only mounts when `GOCLAW_ENCRYPTION_KEY` is set. Without it, all `/v1/webhooks/*` routes return `404` and the gateway logs `webhook subsystem disabled`. See [Security Hardening](/deploy-security) and [Environment Variables](/env-vars).

## Admin CRUD

All admin endpoints require a tenant-admin gateway token (`Authorization: Bearer <admin-token>`).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/webhooks` | Create a webhook; returns raw secret and HMAC key (once) |
| `GET` | `/v1/webhooks` | List webhooks for the tenant. Optional `?agent_id=<uuid>` filter |
| `GET` | `/v1/webhooks/{id}` | Fetch a single webhook (no secret) |
| `PATCH` | `/v1/webhooks/{id}` | Partial update; `kind` is immutable |
| `POST` | `/v1/webhooks/{id}/rotate` | Issue a new secret (old secret invalidated immediately) |
| `DELETE` | `/v1/webhooks/{id}` | Revoke; subsequent inbound calls return `401` |

See [REST API → Webhooks](/rest-api) and the [Endpoint Catalog](/api-endpoints-catalog) for full request/response shapes.

### Create

```bash
curl -X POST https://gw.example.com/v1/webhooks \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "billing-sync",
    "kind": "llm",
    "agent_id": "9c5a...e4",
    "require_hmac": true,
    "rate_limit_per_min": 60,
    "ip_allowlist": ["10.0.0.0/8"]
  }'
```

Response (201 Created):

```json
{
  "id": "f5a1...",
  "name": "billing-sync",
  "secret_prefix": "wh_ABCD",
  "secret": "wh_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH",
  "hmac_signing_key": "a3f4...hex64chars",
  "kind": "llm",
  "rate_limit_per_min": 60,
  "require_hmac": true,
  "localhost_only": false,
  "ip_allowlist": ["10.0.0.0/8"],
  "created_at": "2026-05-21T12:00:00Z"
}
```

> `secret` and `hmac_signing_key` are returned **once** — on create and on rotate. Store them in your secret manager immediately; they cannot be retrieved again.

### Create payload fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Max 100 chars |
| `kind` | string | yes | `"llm"` or `"message"` |
| `agent_id` | UUID | for `llm` kind | Agent to invoke |
| `channel_id` | UUID | optional | Pin a `message` webhook to one channel instance |
| `require_hmac` | bool | no | Force HMAC-only auth (disables bearer) |
| `localhost_only` | bool | no | Restrict callers to 127.0.0.1/::1. Forced `true` on Lite |
| `rate_limit_per_min` | int | no | Per-webhook cap (0 = use tenant default) |
| `ip_allowlist` | []string | no | IPs or CIDR ranges. Empty allows any source |

## Authentication

The `require_hmac` flag on the webhook row decides which modes are accepted.

### Bearer auth

```
Authorization: Bearer wh_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH
```

The gateway hashes the token with SHA-256, compares it to `secret_hash` via constant-time comparison, then decrypts the stored secret material with `GOCLAW_ENCRYPTION_KEY`. Bearer auth is **rejected** when `require_hmac=true`.

### HMAC auth (recommended)

Send three headers:

```
X-Webhook-Id: <webhook-uuid>
X-GoClaw-Signature: t=<unix_seconds>,v1=<hmac_hex>
Content-Type: application/json
```

Signing algorithm:

```
signing_key = hex.Decode(hmac_signing_key)   // hex_64 → 32 raw bytes
payload     = "{unix_ts}.{request_body_bytes}"
signature   = HMAC_SHA256(signing_key, payload)
header      = "t={unix_ts},v1={hex(signature)}"
```

`hmac_signing_key` equals `hex(SHA-256(raw_secret))`. The gateway never stores the raw secret — only its hash and an AES-256-GCM ciphertext used by background workers to recompute HMAC at delivery time.

**Timestamp skew.** Requests with `|now - t| > 300` seconds are rejected. Synchronize clocks via NTP.

**Replay protection.** After a valid signature is accepted, the gateway records `sha256(tenant_id|signature_hex)` in an in-memory nonce cache (TTL 320s). Replays return `401` with the audit event `security.webhook.hmac_replay`. The cache is per-process — a multi-node deployment can theoretically accept a replay on a sibling node.

**IP allowlist.** When `ip_allowlist` is non-empty, each entry is matched against the request's `RemoteAddr` after authentication. CIDR ranges and bare addresses are supported. `X-Forwarded-For` is **not** trusted.

## POST /v1/webhooks/llm

Triggers an agent with an input prompt. Available in all editions (Standard + Lite).

```bash
curl -X POST https://gw.example.com/v1/webhooks/llm \
  -H "Authorization: Bearer wh_..." \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Summarize the latest metrics",
    "session_key": "user-123-session",
    "mode": "sync"
  }'
```

Request fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `input` | string or array | yes | Plain string, or `[{role, content}]` array |
| `session_key` | string | no | Stable key for multi-turn conversation continuity |
| `user_id` | string | no | External user identifier for scoping |
| `model` | string | no | Per-request model override |
| `mode` | string | no | `"sync"` (default) or `"async"` |
| `callback_url` | string | required when async | HTTPS URL; validated against the SSRF policy |
| `metadata` | object | no | Echoed back to the async callback (max 8 KB) |

**Sync mode** times out at 30 seconds and returns the full agent output:

```json
{
  "call_id": "<uuid>",
  "agent_id": "<uuid>",
  "output": "Here are the metrics: ...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "finish_reason": "stop"
}
```

**Async mode** returns `202 Accepted` with `{"call_id": "...", "status": "queued"}`; the result lands on `callback_url` via outbound delivery (see [Outbound callbacks](#outbound-callbacks)).

Error codes:

| Status | Code | When |
|--------|------|------|
| 400 | `invalid_request` | Missing `input`, bad `mode`, missing `callback_url` for async |
| 401 | — | Bearer invalid, HMAC mismatch, revoked, HMAC replay |
| 403 | `unauthorized` | `localhost_only` violated, IP denied, kind mismatch, tenant mismatch |
| 404 | `not_found` | Agent not found |
| 429 | — | Rate limit exceeded (`Retry-After: 60`) |
| 503 | — | Webhook processing lane at capacity |
| 504 | — | LLM timeout (sync only) |

## POST /v1/webhooks/message

Sends a message to a user on a connected channel. **Standard edition only.**

```json
{
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "content": "Hello from the integration!",
  "media_url": "https://example.com/image.jpg",
  "media_caption": "Optional caption",
  "fallback_to_text": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `channel_name` | string | yes (unless the webhook has a bound `channel_id`) | Channel instance name |
| `chat_id` | string | yes | Channel-specific recipient ID |
| `content` | string | yes (unless `media_url`) | Text body; max 16 KB |
| `media_url` | string | no | HTTPS URL. SSRF-guarded + HEAD-probed before fetch |
| `media_caption` | string | no | Caption for media |
| `fallback_to_text` | bool | no | If true, send text-only when channel cannot handle media |

Response:

```json
{
  "call_id": "<uuid>",
  "status": "sent",
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "warning": ""
}
```

`warning` is set to `"media_not_supported_fallback_text"` when `fallback_to_text=true` and the channel dropped the media. Channels that cannot deliver media (e.g., `zalo_oa`) return `501 Not Implemented` unless `fallback_to_text=true`.

## Idempotency

All webhook endpoints accept an `Idempotency-Key` header (max 255 chars).

- First request with a key: processed normally.
- Same key + identical body: returns the cached response with `200 OK`.
- Same key + different body: returns `409 Conflict` (`webhook.idempotency_conflict`).
- Keys expire after 24 hours (`webhook_calls` table TTL).

Use a UUID or a hash of the request payload. Re-send the **exact same body** on retry.

## Outbound callbacks

Async LLM calls deliver results to `callback_url` via `HTTP POST`. Delivery is **at-least-once** — receivers must be idempotent.

Every attempt carries these headers:

```
X-Webhook-Delivery-Id: <uuid>          ; stable across retries — dedupe on this
X-Webhook-Signature:   t=<unix>,v1=<hex>; same HMAC scheme as inbound
Content-Type:          application/json
User-Agent:            goclaw-webhook/1
```

Payload:

```json
{
  "call_id": "<uuid>",
  "delivery_id": "<uuid>",
  "agent_id": "<uuid>",
  "status": "done",
  "output": "Agent response text...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "metadata": {},
  "error": ""
}
```

`status` is `"done"` on success or `"failed"` on agent error (with `error` populated).

Retry schedule (±10% jitter):

| Attempt | Delay |
|---------|-------|
| 1 | 30 seconds |
| 2 | 2 minutes |
| 3 | 10 minutes |
| 4 | 1 hour |
| 5 | 6 hours |

After 5 failures the row moves to `status=dead`. A `429 Retry-After` from the receiver is respected (capped at 6 hours). `4xx` responses other than `429` are treated as permanent failures. Any `2xx` marks the delivery as done.

## Verifying signatures

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "strings"
    "time"
)

func verify(body []byte, sigHeader, hmacSigningKey string) error {
    var ts int64
    var sigHex string
    for _, part := range strings.Split(sigHeader, ",") {
        switch {
        case strings.HasPrefix(part, "t="):
            fmt.Sscanf(part[2:], "%d", &ts)
        case strings.HasPrefix(part, "v1="):
            sigHex = part[3:]
        }
    }
    if abs(time.Now().Unix()-ts) > 300 {
        return fmt.Errorf("timestamp skew")
    }
    key, err := hex.DecodeString(hmacSigningKey)
    if err != nil {
        return err
    }
    mac := hmac.New(sha256.New, key)
    fmt.Fprintf(mac, "%d.", ts)
    mac.Write(body)
    expected := mac.Sum(nil)
    received, err := hex.DecodeString(sigHex)
    if err != nil || !hmac.Equal(expected, received) {
        return fmt.Errorf("signature mismatch")
    }
    return nil
}
```

### Node.js

```js
const crypto = require('crypto');

function signWebhookRequest(body, hmacSigningKeyHex) {
  const ts = Math.floor(Date.now() / 1000);
  const key = Buffer.from(hmacSigningKeyHex, 'hex');
  const payload = Buffer.concat([Buffer.from(`${ts}.`), Buffer.from(body)]);
  const sig = crypto.createHmac('sha256', key).update(payload).digest('hex');
  return { ts, header: `t=${ts},v1=${sig}` };
}

const body = JSON.stringify({ input: 'hello', mode: 'sync' });
const { header } = signWebhookRequest(body, process.env.WEBHOOK_HMAC_KEY);

await fetch('https://gw.example.com/v1/webhooks/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Id': process.env.WEBHOOK_ID,
    'X-GoClaw-Signature': header,
  },
  body,
});
```

### Python

```python
import hashlib, hmac, json, os, time, requests

def sign(body: bytes, hmac_signing_key_hex: str) -> str:
    ts = int(time.time())
    key = bytes.fromhex(hmac_signing_key_hex)
    payload = f"{ts}.".encode() + body
    sig = hmac.new(key, payload, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"

body = json.dumps({"input": "hello", "mode": "sync"}).encode()
requests.post(
    "https://gw.example.com/v1/webhooks/llm",
    headers={
        "Content-Type": "application/json",
        "X-Webhook-Id": os.environ["WEBHOOK_ID"],
        "X-GoClaw-Signature": sign(body, os.environ["WEBHOOK_HMAC_KEY"]),
    },
    data=body,
)
```

## Rate limits

Two tiers must both pass:

| Tier | Cap | Notes |
|------|-----|-------|
| Per-webhook | `rate_limit_per_min` field (0 = disabled) | Set on the webhook row |
| Per-tenant | Platform default | Shared across all webhooks for one tenant |

A reject from either tier returns `429 Too Many Requests` with `Retry-After: 60`.

## Edition differences

| Feature | Standard | Lite |
|---------|----------|------|
| `/v1/webhooks/llm` | Available | Available (`localhost_only` forced) |
| `/v1/webhooks/message` | Available | Disabled |
| `localhost_only=false` | Configurable | Always `true`; cannot be unset |
| Creating `kind="message"` | Allowed | Rejected (`403`) |

On Lite, every webhook is auto-created with `localhost_only=true`. A `PATCH` that tries to clear it returns `403`.

## Security

- **SSRF protection.** `media_url` and `callback_url` are validated against the SSRF policy and HEAD-probed; callback URLs are re-validated at delivery time to defeat DNS rebinding (`security.webhook.callback_ssrf_blocked`).
- **Secret storage.** Only `SHA-256(secret)` and an AES-256-GCM ciphertext are persisted; raw secrets are never logged.
- **Tenant isolation.** Agents and channels must belong to the webhook's tenant (`security.webhook.tenant_mismatch`).
- **Rotation.** `POST /v1/webhooks/{id}/rotate` invalidates the old secret immediately — there is no grace window. Coordinate the cutover with your callers.
- **Encryption key.** `GOCLAW_ENCRYPTION_KEY` (base64, 32 raw bytes) must be the same across every gateway replica. Rotating it re-encrypts all webhook secrets via the standard key-rotation migration.

## Audit payload

Every call writes one row to `webhook_calls` with `request_payload`:

```json
{
  "body_hash": "<sha256-hex-64-chars>",
  "meta": { /* handler-specific */ }
}
```

`body_hash` is the SHA-256 of the raw request bytes — used by the idempotency checker to detect body-mismatch replays. For `llm` calls, `meta` mirrors the decoded request fields (`input`, `session_key`, `user_id`, `model`, `mode`, `callback_url`, `metadata`). For `message` calls, `meta` is `{channel_name, chat_id, has_media}`.

## Common pitfalls

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `404` on every `/v1/webhooks/*` route | `GOCLAW_ENCRYPTION_KEY` not set | Set the env var and restart the gateway |
| `401 timestamp skew` | Clock drift | Run NTP on the caller |
| `401 hmac_replay` after retry | Re-sending the same signed payload | Re-sign with a fresh timestamp on each retry |
| `409 idempotency_conflict` | Same `Idempotency-Key` with a different body | Always re-send the exact same body, or use a new key |
| `403 unauthorized` from a Lite gateway | Trying to create a `message` webhook or unset `localhost_only` | Use a Standard gateway or change the request |
| Async callback never arrives | `callback_url` failed SSRF validation or returned `4xx` | Inspect `webhook_calls.status` and the worker logs |

## What's Next

- [REST API → Webhooks](/rest-api)
- [Environment Variables → `GOCLAW_ENCRYPTION_KEY`](/env-vars)
- [Security Hardening](/deploy-security)
- [Channels Overview](/channels-overview)

<!-- goclaw-source: 392f0fda | updated: 2026-05-21 -->
