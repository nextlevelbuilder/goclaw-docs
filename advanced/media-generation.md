# Media Generation

> Generate images, videos, and audio directly from your agents — with automatic provider fallback chains.

## Overview

GoClaw includes three built-in media generation tools: `create_image`, `create_video`, and `create_audio`. Each tool uses a **provider chain** — a prioritized list of AI providers that GoClaw tries in order. If the first provider fails or times out, it automatically falls back to the next one.

Generated files are saved to `workspace/generated/{YYYY-MM-DD}/` and returned as `MEDIA:` paths that channels render natively (inline images, video players, audio messages).

Generated files are verified after writing — if the file doesn't exist on disk, the tool reports an error instead of returning a broken path.

---

## Image Generation

**Tool:** `create_image`

**Default provider chain:** OpenRouter → Gemini → OpenAI → MiniMax → DashScope

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Text description of the image |
| `aspect_ratio` | string | `1:1` | One of: `1:1`, `3:4`, `4:3`, `9:16`, `16:9` |

**Example agent prompt:** *"Draw a sunset over the ocean in watercolor style"*

### Provider notes

- **OpenRouter** — Default model: `google/gemini-2.5-flash-image` (via chat completions with image modalities)
- **Gemini** — Default model: `gemini-2.5-flash-image` (native `generateContent` API)
- **OpenAI** — Default model: `dall-e-3` (via `/images/generations` endpoint)
- **MiniMax** — Default model: `image-01`, returns base64 directly
- **DashScope** — Alibaba Cloud (Wanx), default model: `wan2.6-image`, async with polling

---

## Video Generation

**Tool:** `create_video`

**Default provider chain:** Gemini → MiniMax → OpenRouter

**Default models:** Gemini `veo-3.1-lite-generate-preview`, MiniMax `MiniMax-Hailuo-2.3`, OpenRouter `google/veo-3.1-lite-generate-preview`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Text description of the video |
| `duration` | int | `8` | Duration in seconds: `4`, `6`, or `8` |
| `aspect_ratio` | string | `16:9` | `16:9` or `9:16` |
| `image_path` | string | — | Path to a workspace image to use as starting frame (image-to-video). Omit for text-to-video. Supported formats: PNG, JPEG, WebP, GIF. Max 20 MB. |
| `filename_hint` | string | — | Short descriptive filename without extension (e.g. `cat-playing-piano`) |

### Image-to-Video

Provide an `image_path` to generate a video starting from a reference image. The image is encoded as base64 and sent to the provider. When using image-to-video mode, duration is fixed at **8 seconds** (API constraint).

**Example agent prompt:** *"Animate this product photo with a slow zoom and subtle lighting changes"* (with `image_path` pointing to a workspace image)

> **Note:** Not all providers support image-to-video. Gemini (Veo 3.1 Lite) supports it natively. Unsupported providers in the chain are skipped automatically.

Video generation is slow — both Gemini and MiniMax poll up to ~6 minutes. The timeout per provider defaults to 120 seconds but can be increased via chain settings.

---

## Audio Generation

**Tool:** `create_audio`

**Default provider:** MiniMax (music, model `music-2.5+`), ElevenLabs (sound effects)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Description or lyrics |
| `type` | string | `music` | `music` or `sound_effect` |
| `duration` | int | — | Duration in seconds — applies to sound effects only; music length is determined by lyrics length |
| `lyrics` | string | — | Lyrics for music generation. Use `[Verse]`, `[Chorus]` tags |
| `instrumental` | bool | `false` | Instrumental only (no vocals) |
| `provider` | string | — | Force a specific provider (e.g. `minimax`) |

- **Sound effects** route directly to ElevenLabs (max 30 seconds)
- **Music** uses MiniMax as the default provider with a 300-second timeout. Duration is controlled by lyrics length, not the `duration` parameter

---

## Native Image Generation (Codex + OpenAI-compat)

Codex and OpenAI-compatible providers support **native** image generation — an `image_generation` tool object is attached directly to the LLM request rather than going through the `create_image` provider chain.

### Tri-Level Gate

All three conditions must be satisfied for `image_generation` to activate:

| Gate | Source | Default |
|------|--------|---------|
| Provider capability (`ProviderCapabilities.ImageGeneration`) | Auto-set `true` for Codex and OpenAI-compat | — |
| `AgentConfig.AllowImageGeneration` | `other_config.allow_image_generation` in agent config | `true` |
| Header opt-out | Client sends `x-goclaw-no-image-gen` to disable per-request | not sent = allowed |

To disable native image generation for a specific agent:

```json
{
  "other_config": {
    "allow_image_generation": false
  }
}
```

To opt out per-request, the client sends the header:

```
x-goclaw-no-image-gen: 1
```

### Partial-Image Streaming

During image generation, Codex emits `response.image_generation_call.partial_image` events over the SSE stream. GoClaw surfaces these events so clients can display incremental previews before the final image is complete.

### Storage and Metadata

Image files are saved to `{workspace}/media/{sha256}.{ext}` (e.g. `media/a3f7bc12.png`). For PNG files, GoClaw embeds a tEXt metadata chunk immediately before IEND:

| Chunk key | Value |
|-----------|-------|
| `Description` | User prompt |
| `Software` | `goclaw` |

This metadata supports audit and prompt traceability directly from the image file.

### Codex Pool Routing

When a Codex pool is configured, image generation requests go through the `create_image` chain with a **per-modality round-robin counter** — the chat counter and image counter operate independently. This prevents image generation from skewing the chat load distribution.

> Source: `internal/providers/codex_native_image.go`, `internal/providers/openai_image_url.go`, `internal/agent/media.go`, `internal/agent/png_metadata.go`, `internal/providers/capabilities.go`

---

## Customizing the Provider Chain

Override the default chain per agent via `builtin_tools.settings` in the agent config:

```json
{
  "builtin_tools": {
    "settings": {
      "create_image": {
        "providers": [
          {
            "provider": "openai",
            "model": "gpt-image-1",
            "enabled": true,
            "timeout": 60,
            "max_retries": 2
          },
          {
            "provider": "minimax",
            "enabled": true,
            "timeout": 30
          }
        ]
      }
    }
  }
}
```

**Chain fields:**

| Field | Default | Description |
|-------|---------|-------------|
| `provider` | — | Provider name (must have API key configured) |
| `model` | auto | Model override |
| `enabled` | `true` | Skip this entry if `false` |
| `timeout` | `120` | Timeout per attempt in seconds |
| `max_retries` | `2` | Retries before moving to next provider |

The chain executes sequentially — first success wins, last error is returned if all fail.

---

## Image Analysis (read_image)

The `read_image` tool can be configured with a dedicated vision provider chain. When configured, images are routed to the vision provider instead of being attached inline to the main LLM — useful when your main model lacks vision capability or you want a specialized model for image analysis.

Supports the same chain format as `create_*` tools:

```json
{
  "builtin_tools": {
    "settings": {
      "read_image": {
        "providers": [
          { "provider": "gemini", "model": "gemini-2.5-flash", "enabled": true },
          { "provider": "openai", "model": "gpt-4o", "enabled": true }
        ]
      }
    }
  }
}
```

Also supports the legacy flat format:

```json
{
  "builtin_tools": {
    "settings": {
      "read_image": {
        "provider": "gemini"
      }
    }
  }
}
```

If no `read_image` chain is configured, images are attached inline to the main LLM as usual.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | What you want to know about the image(s) |
| `path` | string | — | Optional path to an image in the workspace (generated images or attachments) |
| `url` | string | — | Optional URL to an image hosted online |

`path` and `url` are **mutually exclusive** — passing both returns an error. If neither is given, the tool analyzes images already attached to the conversation.

> **Provider note:** Anthropic and `claude-cli` providers cannot analyze images directly from a URL — they require base64-encoded image data. If a URL-only image is routed to one of them, that provider errors and the chain falls back to the next provider. Gemini, OpenRouter, and DashScope accept image URLs directly. URLs are SSRF-validated before any fetch.

---

## Video Analysis (read_video)

The `read_video` tool analyzes video files using a video-capable provider chain (Gemini → OpenRouter by default). Use it when the conversation contains `<media:video>` tags, or point it at a workspace file or a hosted URL.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | What to analyze — e.g. "Summarize the key scenes", "What text appears on screen?" |
| `media_id` | string | — | Optional specific `media_id` from a `<media:video>` tag. If omitted, uses the most recent video |
| `url` | string | — | Optional URL to a video file hosted online |

`media_id` and `url` are **mutually exclusive**. Local video files are capped at **100 MB**.

> **URL streaming:** For video URLs, GoClaw pipes the stream from the URL through the **Gemini File API** rather than downloading the whole file locally first. URLs are SSRF-validated and the resolved IP is pinned for the upload. At the provider layer, image and video parts are now distinct media-content types (`ImageContent` vs `VideoContent`).

The same chain-override format as `create_*` and `read_image` applies under `builtin_tools.settings.read_video`.

---

## Document Analysis (read_document)

The `read_document` tool extracts and analyzes documents — **PDF, DOCX, and images of documents** — using a document-capable provider chain (Gemini → Anthropic → claude-cli → OpenRouter → DashScope by default).

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | What to analyze — e.g. "Extract all tables", "What does page 3 say?" |
| `media_id` | string | — | Optional specific `media_id` from a `<media:document>` tag |
| `path` | string | — | Optional file path from a `<media:document path="...">` tag |

Unlike `read_image` and `read_video`, `read_document` has **no** `url` parameter. Plain-text formats (JSON, CSV, Markdown, HTML, etc.) are returned directly without an LLM call. Files are capped at **20 MB**.

### Local-First Extraction (opt-in)

By default, documents go straight to the cloud vision chain. You can opt into local extraction that runs `pdftotext` (PDF) and `pandoc --sandbox` (DOCX) on the host *before* any cloud call, via the `document_parser` config block:

```json
{
  "local_first": false,
  "max_pages": 200,
  "timeout_sec": 30,
  "min_text_len": 16
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `local_first` | `false` | Enable local extraction. Requires `pdftotext`/`pandoc` on PATH — present in the `full` Docker variant or builds with `ENABLE_FULL_SKILLS=true` |
| `max_pages` | `200` | PDF page limit; passed to `pdftotext -l` |
| `timeout_sec` | `30` | Per-extraction timeout; the process group is killed on timeout |
| `min_text_len` | `16` | Minimum characters (after trim) for a successful extraction; shorter output triggers cloud fallback |

Config is captured at startup (not hot-reloaded); binary availability is re-checked per call, so a runtime install is detected without a restart. Any miss — disabled, unsupported MIME, missing binary, timeout, or too-little text (e.g. a scanned image-only PDF) — falls back transparently to the cloud vision chain. PDF extraction uses `pdftotext -l <max_pages>`; DOCX uses `pandoc --sandbox` so an untrusted document cannot fetch remote resources during conversion.

---

## Required API Keys

Media generation uses your existing provider API keys. Make sure the relevant providers are configured:

| Provider | Used for | Config location |
|----------|----------|-----------------|
| OpenAI | Image, Video | `providers` section |
| OpenRouter | Image, Video | `providers` section |
| Gemini | Image, Video | `providers` section |
| MiniMax | Image, Video, Audio | `providers` section |
| DashScope | Image | `providers` section |
| ElevenLabs | Audio (sound effects) | `tts.providers.elevenlabs` |

---

## File Size Limit

Downloaded media files are capped at **200 MB**. Files exceeding this limit will fail.

---

## What's Next

- [TTS & Voice](/tts-voice) — Text-to-speech for agent replies
- [Custom Tools](/custom-tools) — Build your own tools
- [Provider Overview](/providers-overview) — Configure API keys

<!-- goclaw-source: fabe86b3 | updated: 2026-06-30 -->
