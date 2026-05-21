# Vertex AI

> Use Google Cloud Vertex AI's OpenAI-compatible Gemini endpoint with OAuth2 service-account or Application Default Credentials.

## Overview

GoClaw connects to Google Cloud Vertex AI through its OpenAI-compatible API. Internally the provider is an `OpenAIProvider` instance wired with a Google OAuth2 token source — every request is signed with a short-lived bearer token that the gateway refreshes transparently every hour.

The endpoint URL is built from your GCP project and region:

```
https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/endpoints/openapi
```

So with project `acme-prod` and region `us-central1`, requests target `https://us-central1-aiplatform.googleapis.com/v1/projects/acme-prod/locations/us-central1/endpoints/openapi`.

## Prerequisites

- A Google Cloud project with the **Vertex AI API** enabled.
- Either:
  - A service-account JSON key with the `roles/aiplatform.user` role, **or**
  - Application Default Credentials (`gcloud auth application-default login` for local dev, or the metadata server on GCE/GKE/Cloud Run).
- The OAuth scope `https://www.googleapis.com/auth/cloud-platform` is requested automatically — you do not configure it.

## Credential precedence

When the provider starts up it walks credential sources in this order and stops at the first hit:

1. **Inline JSON** — `credentials_json` (DB Settings field) or `providers.vertex.api_key` (config.json). Service-account JSON pasted verbatim.
2. **File path** — `credentials_file` env-resolved path. **Operator-only.** This path is read from disk by the gateway process; never expose it via the admin UI without a strict path allowlist.
3. **Application Default Credentials** — falls back to `GOOGLE_APPLICATION_CREDENTIALS`, gcloud user creds, or the GCP metadata server. ADC discovery is capped at 10 seconds so a missing metadata server cannot stall startup.

## config.json setup

```json
{
  "providers": {
    "vertex": {
      "api_key": "{\"type\":\"service_account\",\"project_id\":\"acme-prod\", ... }",
      "credentials_file": "",
      "project_id": "acme-prod",
      "region": "us-central1",
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

The provider only initializes when **both** `project_id` and `region` are set. `api_key` accepts the entire service-account JSON as a single string. To rely on ADC instead, leave `api_key` and `credentials_file` empty.

## Dashboard setup

Create the provider from **Settings → Providers → Add provider** with `provider_type: "vertex"`. Vertex-specific fields live under `settings`:

```json
{
  "name": "vertex-prod",
  "provider_type": "vertex",
  "api_key": "{\"type\":\"service_account\", ... }",
  "settings": {
    "project_id": "acme-prod",
    "region": "us-central1",
    "model": "google/gemini-2.5-pro-001"
  }
}
```

API keys and settings are encrypted at rest with AES-256-GCM. The DB-driven provider also walks the credential precedence above — leave `api_key` empty to use ADC on the gateway host.

## Supported models

Vertex AI's OpenAI-compatible endpoint accepts any Gemini model that Google publishes under the `google/` namespace, for example:

| Model ID | Notes |
|----------|-------|
| `google/gemini-2.0-flash-001` | Default |
| `google/gemini-2.5-pro-001` | Largest context, supports thinking |
| `google/gemini-2.5-flash-001` | Fast, supports thinking |
| `google/gemini-1.5-pro-002` | Previous generation, 2M context |

Always include the `google/` prefix — Vertex's OpenAI shim requires it. Check the [Vertex model catalog](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) for the current list of regional availability.

## Region and project validation

The provider validates both values before making any network call:

- `project_id` — 6–30 lowercase letters/digits/hyphens, must start with a letter (GCP project ID format).
- `region` — lowercase, hyphen-separated alphanumeric segments (e.g. `us-central1`, `asia-southeast1`).

A malformed value fails fast at startup. If you supply an `api_base_override`, the gateway also rejects URLs whose host is not under `*.googleapis.com` — protection against pointing the provider at an attacker-controlled endpoint while still authenticating to Google.

## Examples

### Quick smoke test from the agent loop

```json
{
  "model": "google/gemini-2.0-flash-001",
  "options": {
    "temperature": 0.2
  }
}
```

### Pinning a per-request model

Because Vertex shares the `OpenAIProvider` adapter, every request honors a per-request `model` override. Inline-message webhooks and the standard agent loop both accept it.

### Inline credentials in config.json

```json
{
  "providers": {
    "vertex": {
      "api_key": "{\n  \"type\": \"service_account\",\n  \"project_id\": \"acme-prod\",\n  \"private_key_id\": \"...\",\n  \"private_key\": \"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\",\n  \"client_email\": \"goclaw-vertex@acme-prod.iam.gserviceaccount.com\",\n  \"token_uri\": \"https://oauth2.googleapis.com/token\"\n}",
      "project_id": "acme-prod",
      "region": "us-central1"
    }
  }
}
```

### ADC on GKE / Cloud Run

Leave both `api_key` and `credentials_file` empty and grant the workload's service account `roles/aiplatform.user`. The provider picks up tokens from the metadata server automatically.

## Streaming, tools, and vision

The Vertex provider speaks OpenAI ChatCompletions through the same code path as the OpenAI and Gemini OpenAI-compatible adapters. Streaming, function/tool calling, and image inputs work the same way they do for `openai` or `gemini`. Extended thinking on Gemini 2.5 models is mapped from `thinking_level` to `reasoning_effort` automatically (see [Gemini](/provider-gemini) for the thinking_signature passback details).

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `vertex: project_id is required` | Project or region missing | Set both `project_id` and `region` |
| `vertex: invalid project_id` | ID has uppercase, underscores, or wrong length | Use the canonical GCP project ID (6–30 lowercase chars) |
| `vertex: application default credentials not found` | No ADC source on host | Set `GOOGLE_APPLICATION_CREDENTIALS`, pass `credentials_file`, or run on GCP |
| `vertex: parse inline credentials` | `api_key` is not valid service-account JSON | Paste the entire JSON file unmodified |
| `403 Permission denied` from Vertex | Service account missing role | Grant `roles/aiplatform.user` |
| `HTTP 429` | Quota exceeded | Request a quota bump in the GCP console; GoClaw retries automatically |
| Model not found | Wrong model ID or wrong region | Confirm the model is available in the configured region; keep the `google/` prefix |

## What's Next

- [Gemini](/provider-gemini) — Gemini via the Google AI Studio OpenAI-compatible endpoint
- [OpenAI](/provider-openai) — shared OpenAI-compatible adapter notes
- [Providers Overview](/providers-overview) — adapter system, retry logic, credential resolver

<!-- goclaw-source: 392f0fda | updated: 2026-05-21 -->
