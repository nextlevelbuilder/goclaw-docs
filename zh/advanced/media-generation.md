> 翻译自 [English version](/media-generation)

# 媒体生成

> 直接从 agent 生成图片、视频和音频 — 支持自动 provider 故障转移链。

## 概述

GoClaw 内置三个媒体生成工具：`create_image`、`create_video` 和 `create_audio`。每个工具使用一条 **provider 链** — 一个有优先级的 AI provider 列表，GoClaw 按顺序尝试。如果第一个 provider 失败或超时，自动切换到下一个。

生成的文件保存到 `workspace/generated/{YYYY-MM-DD}/`，并以 `MEDIA:` 路径返回，channel 可原生渲染（内联图片、视频播放器、音频消息）。

文件写入后会验证是否存在 — 如果文件不在磁盘上，工具报告错误而非返回损坏的路径。

---

## 图片生成

**工具：** `create_image`

**默认 provider 链：** OpenRouter → Gemini → OpenAI → MiniMax → DashScope

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `prompt` | string | 必填 | 图片的文字描述 |
| `aspect_ratio` | string | `1:1` | 可选：`1:1`、`3:4`、`4:3`、`9:16`、`16:9` |

**示例 agent 提示词：** *"用水彩风格画一幅海上日落"*

### Provider 说明

- **OpenRouter** — 默认模型：`google/gemini-2.5-flash-image`（通过带图片模态的 chat completions）
- **Gemini** — 默认模型：`gemini-2.5-flash-image`（原生 `generateContent` API）
- **OpenAI** — 默认模型：`dall-e-3`（通过 `/images/generations` 端点）
- **MiniMax** — 默认模型：`image-01`，直接返回 base64
- **DashScope** — 阿里云（万象），默认模型：`wan2.6-image`，异步轮询

---

## 视频生成

**工具：** `create_video`

**默认 provider 链：** Gemini → MiniMax → OpenRouter

**默认模型：** Gemini `veo-3.1-lite-generate-preview`、MiniMax `MiniMax-Hailuo-2.3`、OpenRouter `google/veo-3.1-lite-generate-preview`

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `prompt` | string | 必填 | 视频的文字描述 |
| `duration` | int | `8` | 时长（秒）：`4`、`6` 或 `8` |
| `aspect_ratio` | string | `16:9` | `16:9` 或 `9:16` |
| `image_path` | string | — | 工作区图片路径，用作起始帧（图生视频）。省略则为文生视频。支持格式：PNG、JPEG、WebP、GIF。最大 20 MB。 |
| `filename_hint` | string | — | 简短描述性文件名，不含扩展名（如 `cat-playing-piano`） |

### 图生视频

提供 `image_path` 可生成以参考图片为起始帧的视频。图片以 base64 编码发送给 provider。使用图生视频模式时，时长固定为 **8 秒**（API 限制）。

**示例 agent 提示词：** *"为这张产品照片添加缓慢变焦和微妙光影变化的动画"*（`image_path` 指向工作区中的图片）

> **注意：** 并非所有 provider 都支持图生视频。Gemini（Veo 3.1 Lite）原生支持。链中不支持的 provider 会被自动跳过。

视频生成较慢 — Gemini 和 MiniMax 轮询最多约 6 分钟。每个 provider 的默认超时为 120 秒，可通过链设置增大。

---

## 音频生成

**工具：** `create_audio`

**默认 provider：** MiniMax（音乐，模型 `music-2.5+`）、ElevenLabs（音效）

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `prompt` | string | 必填 | 描述或歌词 |
| `type` | string | `music` | `music` 或 `sound_effect` |
| `duration` | int | — | 时长（秒）— 仅适用于音效；音乐时长由歌词长度决定 |
| `lyrics` | string | — | 音乐生成的歌词，使用 `[Verse]`、`[Chorus]` 标签 |
| `instrumental` | bool | `false` | 纯器乐（无人声） |
| `provider` | string | — | 强制指定 provider（如 `minimax`） |

- **音效** 直接路由到 ElevenLabs（最长 30 秒）
- **音乐** 默认使用 MiniMax，超时 300 秒。时长由歌词长度控制，而非 `duration` 参数

---

## 原生图片生成（Codex + OpenAI-compat）

Codex 及 OpenAI-compat provider 支持**原生**图片生成——`image_generation` tool object 直接附加到 LLM 请求，而非走普通 provider 链中的 `create_image`。

### 三级开关（Tri-level gate）

以下三个条件须同时满足，`image_generation` 才会被激活：

| 开关 | 来源 | 默认值 |
|------|------|--------|
| Provider 能力（`ProviderCapabilities.ImageGeneration`） | Codex 和 OpenAI-compat 自动设为 `true` | — |
| `AgentConfig.AllowImageGeneration` | agent 配置中的 `other_config.allow_image_generation` | `true` |
| Header 退出 | 客户端发送 `x-goclaw-no-image-gen` 可按请求关闭 | 不发送 = 允许 |

为特定 agent 禁用原生图片生成：

```json
{
  "other_config": {
    "allow_image_generation": false
  }
}
```

按请求退出，客户端发送 header：

```
x-goclaw-no-image-gen: 1
```

### Partial-image 流式输出

生成图片过程中，Codex 通过 SSE 流发出 `response.image_generation_call.partial_image` 事件。GoClaw 将这些事件透传给客户端，使其可在最终图片完成前显示预览。

### 存储与元数据

图片文件保存至 `{workspace}/media/{sha256}.{ext}`（例如 `media/a3f7bc12.png`）。对于 PNG 文件，GoClaw 在 IEND 前嵌入 tEXt 元数据 chunk：

| Chunk key | 值 |
|-----------|-----|
| `Description` | 用户 prompt |
| `Software` | `goclaw` |

元数据用于审计，便于从图片文件反向追溯 prompt。

### Codex pool 路由

配置了 Codex pool 时，图片生成请求通过 `create_image` 链处理，使用**按模态独立的 round-robin 计数器**——chat 计数器与图片计数器相互独立，避免图片生成影响 chat 的负载分配。

> 参见源码：`internal/providers/codex_native_image.go`、`internal/providers/openai_image_url.go`、`internal/agent/media.go`、`internal/agent/png_metadata.go`、`internal/providers/capabilities.go`

---

## 自定义 Provider 链

通过 agent config 中的 `builtin_tools.settings` 按 agent 覆盖默认链：

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

**链字段：**

| 字段 | 默认值 | 描述 |
|-------|---------|-------------|
| `provider` | — | Provider 名称（须已配置 API key） |
| `model` | 自动 | 模型覆盖 |
| `enabled` | `true` | `false` 则跳过此条目 |
| `timeout` | `120` | 每次尝试的超时（秒） |
| `max_retries` | `2` | 切换到下一 provider 前的重试次数 |

链按顺序执行 — 第一个成功者胜出，全部失败则返回最后一个错误。

---

## 图片分析（read_image）

`read_image` 工具可配置专用的视觉 provider 链。配置后，图片路由到视觉 provider 而非内联附加到主 LLM — 适用于主模型不具备视觉能力或需要专用模型进行图片分析的场景。

支持与 `create_*` 工具相同的链格式：

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

也支持旧版扁平格式：

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

如果未配置 `read_image` 链，图片照常内联附加到主 LLM。

---

## 所需 API Key

媒体生成使用你现有的 provider API key。确保相关 provider 已配置：

| Provider | 用途 | 配置位置 |
|----------|----------|-----------------|
| OpenAI | 图片、视频 | `providers` 章节 |
| OpenRouter | 图片、视频 | `providers` 章节 |
| Gemini | 图片、视频 | `providers` 章节 |
| MiniMax | 图片、视频、音频 | `providers` 章节 |
| DashScope | 图片 | `providers` 章节 |
| ElevenLabs | 音频（音效） | `tts.providers.elevenlabs` |

---

## 文件大小限制

下载的媒体文件上限为 **200 MB**，超出此限制的文件将失败。

---

## 下一步

- [TTS 与语音](/tts-voice) — agent 回复的文字转语音
- [自定义工具](/custom-tools) — 构建你自己的工具
- [Provider 概览](/providers-overview) — 配置 API key

<!-- goclaw-source: 29457bb3 | 更新: 2026-04-25 -->
