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

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
