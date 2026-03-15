> Bản dịch từ [English version](../../advanced/media-generation.md)

# Tạo Media

> Tạo hình ảnh, video và âm thanh trực tiếp từ agent — với chuỗi provider tự động fallback.

## Tổng quan

GoClaw có ba công cụ tạo media tích hợp: `create_image`, `create_video`, và `create_audio`. Mỗi công cụ sử dụng **chuỗi provider** — danh sách ưu tiên các AI provider mà GoClaw thử lần lượt. Nếu provider đầu tiên lỗi hoặc timeout, nó tự động chuyển sang provider tiếp theo.

File được lưu vào `workspace/generated/{YYYY-MM-DD}/` và trả về dưới dạng đường dẫn `MEDIA:` mà các channel hiển thị trực tiếp (hình ảnh inline, trình phát video, tin nhắn âm thanh).

---

## Tạo hình ảnh

**Công cụ:** `create_image`

**Chuỗi provider mặc định:** OpenRouter → Gemini → OpenAI → MiniMax → DashScope

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `prompt` | string | bắt buộc | Mô tả hình ảnh |
| `aspect_ratio` | string | `1:1` | Một trong: `1:1`, `3:4`, `4:3`, `9:16`, `16:9` |

### Ghi chú provider

- **OpenRouter** — Model mặc định: `google/gemini-2.5-flash-image` (qua chat completions với image modalities)
- **Gemini** — Model mặc định: `gemini-2.5-flash-image` (API `generateContent` native)
- **OpenAI** — Model mặc định: `dall-e-3` (qua endpoint `/images/generations`)
- **MiniMax** — Model mặc định: `image-01`, trả về base64 trực tiếp
- **DashScope** — Alibaba Cloud (Wanx), model mặc định: `wan2.6-image`, bất đồng bộ với polling

---

## Tạo video

**Công cụ:** `create_video`

**Chuỗi provider mặc định:** Gemini → MiniMax → OpenRouter

**Model mặc định:** Gemini `veo-3.0-generate-preview`, MiniMax `MiniMax-Hailuo-2.3`, OpenRouter `google/veo-3.0-generate-preview`

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `prompt` | string | bắt buộc | Mô tả video |
| `duration` | int | `8` | Thời lượng (giây): `4`, `6`, hoặc `8` |
| `aspect_ratio` | string | `16:9` | `16:9` hoặc `9:16` |

Tạo video khá chậm — cả Gemini và MiniMax đều có thể polling đến ~6 phút. Timeout mỗi provider mặc định 120 giây nhưng có thể tăng qua cài đặt chuỗi.

---

## Tạo âm thanh

**Công cụ:** `create_audio`

**Provider mặc định:** MiniMax (nhạc, model `music-2.5+`), ElevenLabs (hiệu ứng âm thanh)

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `prompt` | string | bắt buộc | Mô tả hoặc lời bài hát |
| `type` | string | `music` | `music` hoặc `sound_effect` |
| `duration` | int | — | Thời lượng (giây) — chỉ áp dụng cho hiệu ứng âm thanh; thời lượng nhạc do độ dài lời bài hát quyết định |
| `lyrics` | string | — | Lời bài hát. Dùng thẻ `[Verse]`, `[Chorus]` |
| `instrumental` | bool | `false` | Chỉ nhạc nền (không lời) |
| `provider` | string | — | Chỉ định provider cụ thể (vd: `minimax`) |

- **Hiệu ứng âm thanh** chuyển trực tiếp đến ElevenLabs (tối đa 30 giây)
- **Nhạc** sử dụng MiniMax làm provider mặc định với timeout 300 giây. Thời lượng được kiểm soát bởi độ dài lời bài hát, không phải tham số `duration`

---

## Tùy chỉnh chuỗi provider

Ghi đè chuỗi mặc định cho mỗi agent qua `builtin_tools.settings` trong cấu hình agent:

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

**Các trường chuỗi:**

| Trường | Mặc định | Mô tả |
|--------|----------|-------|
| `provider` | — | Tên provider (phải có API key đã cấu hình) |
| `model` | tự động | Ghi đè model |
| `enabled` | `true` | Bỏ qua nếu `false` |
| `timeout` | `120` | Timeout mỗi lần thử (giây) |
| `max_retries` | `2` | Số lần thử lại trước khi chuyển provider |

Chuỗi thực thi tuần tự — thành công đầu tiên thắng, lỗi cuối cùng được trả về nếu tất cả đều thất bại.

---

## API Key cần thiết

Tạo media sử dụng API key provider hiện có. Đảm bảo các provider liên quan đã được cấu hình:

| Provider | Dùng cho | Vị trí cấu hình |
|----------|----------|-----------------|
| OpenAI | Hình ảnh, Video | Mục `providers` |
| OpenRouter | Hình ảnh, Video | Mục `providers` |
| Gemini | Hình ảnh, Video | Mục `providers` |
| MiniMax | Hình ảnh, Video, Âm thanh | Mục `providers` |
| DashScope | Hình ảnh | Mục `providers` |
| ElevenLabs | Âm thanh (hiệu ứng) | `tts.providers.elevenlabs` |

---

## Giới hạn kích thước file

File media tải về giới hạn tối đa **200 MB**. File vượt quá sẽ thất bại.

---

## Tiếp theo

- [TTS & Voice](tts-voice.md) — Chuyển văn bản thành giọng nói
- [Custom Tools](custom-tools.md) — Tạo công cụ riêng
- [Tổng quan Provider](../providers/overview.md) — Cấu hình API key
