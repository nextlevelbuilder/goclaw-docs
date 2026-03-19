# TTS Voice

> Add voice replies to your agents — pick from four providers and control exactly when audio fires.

## Overview

GoClaw's TTS system converts agent text replies into audio and delivers them as voice messages on supported channels (e.g. Telegram voice bubbles). You configure a primary provider, set an auto-apply mode, and GoClaw handles the rest — stripping markdown, truncating long text, and choosing the right audio format per channel.

Four providers are available:

| Provider | Key | Requires |
|----------|-----|---------|
| OpenAI | `openai` | API key |
| ElevenLabs | `elevenlabs` | API key |
| Microsoft Edge TTS | `edge` | `edge-tts` CLI (free) — always available as fallback |
| MiniMax | `minimax` | API key + Group ID |

---

## Auto-apply Modes

The `auto` field controls when TTS fires:

| Mode | When audio is sent |
|------|--------------------|
| `off` | Never (default) |
| `always` | Every eligible reply |
| `inbound` | Only when the user sent a voice/audio message |
| `tagged` | Only when the reply contains `[[tts]]` |

The `mode` field narrows which reply types qualify:

| Value | Behavior |
|-------|----------|
| `final` | Only final replies (default) |
| `all` | All replies including tool results |

Text shorter than 10 characters or containing a `MEDIA:` path is always skipped. Text over `max_length` (default 1500) is truncated with `...`.

---

## Provider Setup

### OpenAI

```json
{
  "tts": {
    "provider": "openai",
    "auto": "inbound",
    "openai": {
      "api_key": "sk-...",
      "model": "gpt-4o-mini-tts",
      "voice": "alloy"
    }
  }
}
```

Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`. Default model: `gpt-4o-mini-tts`.

---

### ElevenLabs

```json
{
  "tts": {
    "provider": "elevenlabs",
    "auto": "always",
    "elevenlabs": {
      "api_key": "xi-...",
      "voice_id": "pMsXgVXv3BLzUgSXRplE",
      "model_id": "eleven_multilingual_v2"
    }
  }
}
```

Find voice IDs in your [ElevenLabs voice library](https://elevenlabs.io/voice-library). Default model: `eleven_multilingual_v2`.

---

### Edge TTS (Free)

Edge TTS uses Microsoft's neural voices via the `edge-tts` Python CLI — no API key needed.

```bash
pip install edge-tts
```

```json
{
  "tts": {
    "provider": "edge",
    "auto": "tagged",
    "edge": {
      "enabled": true,
      "voice": "en-US-MichelleNeural",
      "rate": "+0%"
    }
  }
}
```

The `enabled` field must be `true` to activate the Edge provider — it has no API key to detect automatically.

Browse available voices:

```bash
edge-tts --list-voices
```

Popular voices: `en-US-MichelleNeural`, `en-GB-SoniaNeural`, `vi-VN-HoaiMyNeural`. The `rate` field adjusts speed (e.g. `+20%` faster, `-10%` slower). Output is always MP3.

---

### MiniMax

MiniMax's T2A API supports 300+ system voices and 40+ languages.

```json
{
  "tts": {
    "provider": "minimax",
    "auto": "always",
    "minimax": {
      "api_key": "...",
      "group_id": "your-group-id",
      "model": "speech-02-hd",
      "voice_id": "Wise_Woman"
    }
  }
}
```

Models: `speech-02-hd` (high quality), `speech-02-turbo` (faster). Supported output formats: `mp3`, `opus`, `pcm`, `flac`, `wav`.

---

## Full Config Reference

```json
{
  "tts": {
    "provider": "openai",
    "auto": "inbound",
    "mode": "final",
    "max_length": 1500,
    "timeout_ms": 30000,
    "openai": { "api_key": "sk-...", "voice": "nova" },
    "edge":   { "enabled": true, "voice": "en-US-MichelleNeural" }
  }
}
```

When the primary provider fails, GoClaw automatically tries the other registered providers.

---

## Channel Integration

### Telegram Voice Bubbles

When the originating channel is `telegram`, GoClaw automatically requests `opus` format (Ogg/Opus container) instead of MP3 — Telegram requires this for voice messages. No extra config is needed.

```mermaid
flowchart LR
    REPLY["Agent reply text"] --> AUTO{"Auto mode\ncheck"}
    AUTO -->|passes| STRIP["Strip markdown\n& directives"]
    STRIP --> TRUNC["Truncate if >\nmax_length"]
    TRUNC --> FMT{"Channel?"}
    FMT -->|telegram| OPUS["Request opus"]
    FMT -->|other| MP3["Request mp3"]
    OPUS --> SYNTH["Synthesize"]
    MP3 --> SYNTH
    SYNTH --> SEND["Send as voice message"]
```

### Tagged Mode

Add `[[tts]]` anywhere in an agent reply to trigger synthesis in `tagged` mode:

```
Here's your daily briefing. [[tts]]
```

---

## Examples

**Minimal free setup with Edge TTS:**

```bash
pip install edge-tts
```

```json
{
  "tts": {
    "provider": "edge",
    "auto": "inbound",
    "edge": { "enabled": true, "voice": "en-US-JennyNeural" }
  }
}
```

**OpenAI primary with ElevenLabs fallback:**

```json
{
  "tts": {
    "provider": "openai",
    "auto": "always",
    "openai":     { "api_key": "sk-...", "voice": "alloy" },
    "elevenlabs": { "api_key": "xi-...", "voice_id": "pMsXgVXv3BLzUgSXRplE" }
  }
}
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `tts provider not found: edge` | `enabled` not set | Add `"enabled": true` to `edge` section |
| `edge-tts failed` | CLI not installed | `pip install edge-tts` |
| `all tts providers failed` | All providers errored | Check API keys; inspect gateway logs |
| No voice in Telegram | `auto` is `off` | Set `auto: "inbound"` or `"always"` |
| Voice fires on tool results | `mode` is `all` | Set `mode: "final"` |
| MiniMax returns empty audio | Missing `group_id` | Add `group_id` from MiniMax console |
| Text cut off with `...` | Over `max_length` | Increase `max_length` in config |

---

## What's Next

- [Scheduling & Cron](#scheduling-cron) — trigger agents on a schedule
- [Extended Thinking](#extended-thinking) — deeper reasoning for complex replies

<!-- goclaw-source: 941a965 | updated: 2026-03-19 -->
