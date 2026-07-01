> Bản dịch từ [English version](/media-generation)

# Tạo Media

> Tạo hình ảnh, video và âm thanh trực tiếp từ agent — với chuỗi provider tự động fallback.

## Tổng quan

GoClaw có ba công cụ tạo media tích hợp: `create_image`, `create_video`, và `create_audio`. Mỗi công cụ sử dụng **chuỗi provider** — danh sách ưu tiên các AI provider mà GoClaw thử lần lượt. Nếu provider đầu tiên lỗi hoặc timeout, nó tự động chuyển sang provider tiếp theo.

File được lưu vào `workspace/generated/{YYYY-MM-DD}/` và trả về dưới dạng đường dẫn `MEDIA:` mà các channel hiển thị trực tiếp (hình ảnh inline, trình phát video, tin nhắn âm thanh).

File được tạo ra sẽ được xác minh sau khi ghi — nếu file không tồn tại trên đĩa, công cụ báo lỗi thay vì trả về đường dẫn bị hỏng.

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

**Model mặc định:** Gemini `veo-3.1-lite-generate-preview`, MiniMax `MiniMax-Hailuo-2.3`, OpenRouter `google/veo-3.1-lite-generate-preview`

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `prompt` | string | bắt buộc | Mô tả video |
| `duration` | int | `8` | Thời lượng (giây): `4`, `6`, hoặc `8` |
| `aspect_ratio` | string | `16:9` | `16:9` hoặc `9:16` |
| `image_path` | string | — | Đường dẫn đến hình ảnh trong workspace để dùng làm khung hình đầu tiên (image-to-video). Bỏ trống cho text-to-video. Định dạng hỗ trợ: PNG, JPEG, WebP, GIF. Tối đa 20 MB. |
| `filename_hint` | string | — | Tên file mô tả ngắn không có phần mở rộng (ví dụ `cat-playing-piano`) |

### Image-to-Video

Cung cấp `image_path` để tạo video bắt đầu từ hình ảnh tham chiếu. Hình ảnh được mã hóa base64 và gửi đến provider. Khi dùng chế độ image-to-video, thời lượng cố định **8 giây** (ràng buộc API).

**Ví dụ prompt agent:** *"Animate this product photo with a slow zoom and subtle lighting changes"* (với `image_path` trỏ đến hình ảnh trong workspace)

> **Lưu ý:** Không phải tất cả provider đều hỗ trợ image-to-video. Gemini (Veo 3.1 Lite) hỗ trợ native. Các provider không hỗ trợ trong chuỗi sẽ tự động bị bỏ qua.

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

## Tạo ảnh native (Codex + OpenAI-compat)

Codex và các provider tương thích OpenAI-compat hỗ trợ tạo ảnh **native** — tool object `image_generation` được đính kèm trực tiếp vào request LLM thay vì đi qua `create_image` trong chuỗi provider thông thường.

### Tri-level gate

Cả ba điều kiện sau đều phải thỏa mãn để `image_generation` được kích hoạt:

| Gate | Nguồn | Mặc định |
|------|-------|---------|
| Provider capability (`ProviderCapabilities.ImageGeneration`) | Tự động set `true` với Codex và OpenAI-compat | — |
| `AgentConfig.AllowImageGeneration` | `other_config.allow_image_generation` trong cấu hình agent | `true` |
| Header opt-out | Client gửi `x-goclaw-no-image-gen` để tắt per-request | không gửi = cho phép |

Để tắt tạo ảnh native cho một agent cụ thể:

```json
{
  "other_config": {
    "allow_image_generation": false
  }
}
```

Để opt-out theo từng request, client gửi header:

```
x-goclaw-no-image-gen: 1
```

### Partial-image streaming

Trong quá trình tạo ảnh, Codex phát event `response.image_generation_call.partial_image` theo SSE stream. GoClaw surface các event này ra ngoài để client có thể hiển thị preview từng phần trước khi ảnh hoàn chỉnh.

### Lưu trữ và metadata

File ảnh được lưu tại `{workspace}/media/{sha256}.{ext}` (ví dụ `media/a3f7bc12.png`). Với file PNG, GoClaw nhúng tEXt metadata chunk ngay trước IEND:

| Chunk key | Giá trị |
|-----------|---------|
| `Description` | Prompt người dùng |
| `Software` | `goclaw` |

Metadata này phục vụ mục đích audit và truy vết lại prompt từ file ảnh.

### Codex pool routing

Khi Codex pool được cấu hình, các yêu cầu tạo ảnh đi qua chain `create_image` với **round-robin counter riêng cho từng modality** — counter chat và counter image hoạt động độc lập. Điều này tránh việc tạo ảnh ảnh hưởng đến phân phối tải chat.

> Xem source: `internal/providers/codex_native_image.go`, `internal/providers/openai_image_url.go`, `internal/agent/media.go`, `internal/agent/png_metadata.go`, `internal/providers/capabilities.go`

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

## Phân tích hình ảnh (read_image)

Công cụ `read_image` có thể được cấu hình với chuỗi vision provider riêng. Khi được cấu hình, hình ảnh sẽ được định tuyến đến vision provider thay vì đính kèm inline vào LLM chính — hữu ích khi model chính không hỗ trợ vision hoặc bạn muốn dùng model chuyên biệt để phân tích ảnh.

Hỗ trợ cùng định dạng chuỗi với các công cụ `create_*`:

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

Cũng hỗ trợ định dạng phẳng cũ:

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

Nếu không cấu hình chuỗi `read_image`, hình ảnh được đính kèm inline vào LLM chính như bình thường.

### Tham số

| Tham số | Kiểu | Mặc định | Mô tả |
|-----------|------|---------|-------------|
| `prompt` | string | bắt buộc | Bạn muốn biết gì về (các) hình ảnh |
| `path` | string | — | Đường dẫn tùy chọn tới ảnh trong workspace (ảnh sinh ra hoặc đính kèm) |
| `url` | string | — | URL tùy chọn tới ảnh được host trực tuyến |

`path` và `url` **loại trừ lẫn nhau** — truyền cả hai sẽ trả về lỗi. Nếu không có cái nào, tool phân tích hình ảnh đã đính kèm trong hội thoại.

> **Ghi chú provider:** Provider Anthropic và `claude-cli` không thể phân tích ảnh trực tiếp từ URL — chúng yêu cầu dữ liệu ảnh mã hóa base64. Nếu ảnh chỉ-có-URL được định tuyến tới một trong số đó, provider đó báo lỗi và chuỗi fallback sang provider kế tiếp. Gemini, OpenRouter, và DashScope chấp nhận URL ảnh trực tiếp. URL được kiểm tra SSRF trước khi fetch.

---

## Phân tích video (read_video)

Công cụ `read_video` phân tích file video bằng chuỗi provider hỗ trợ video (mặc định Gemini → OpenRouter). Dùng khi hội thoại có thẻ `<media:video>`, hoặc trỏ tới file workspace hay URL được host.

### Tham số

| Tham số | Kiểu | Mặc định | Mô tả |
|-----------|------|---------|-------------|
| `prompt` | string | bắt buộc | Cần phân tích gì — ví dụ "Tóm tắt các cảnh chính", "Có chữ gì hiện trên màn hình?" |
| `media_id` | string | — | `media_id` cụ thể tùy chọn từ thẻ `<media:video>`. Nếu bỏ trống, dùng video gần nhất |
| `url` | string | — | URL tùy chọn tới file video được host trực tuyến |

`media_id` và `url` **loại trừ lẫn nhau**. File video cục bộ bị giới hạn **100 MB**.

> **Stream từ URL:** Với video URL, GoClaw pipe stream từ URL qua **Gemini File API** thay vì tải toàn bộ file về cục bộ trước. URL được kiểm tra SSRF và IP đã resolve được ghim (pin) cho lần upload. Ở tầng provider, phần image và video giờ là các kiểu media-content riêng biệt (`ImageContent` và `VideoContent`).

Áp dụng cùng định dạng ghi đè chuỗi như `create_*` và `read_image` dưới `builtin_tools.settings.read_video`.

---

## Phân tích tài liệu (read_document)

Công cụ `read_document` trích xuất và phân tích tài liệu — **PDF, DOCX, và ảnh tài liệu** — bằng chuỗi provider hỗ trợ tài liệu (mặc định Gemini → Anthropic → claude-cli → OpenRouter → DashScope).

### Tham số

| Tham số | Kiểu | Mặc định | Mô tả |
|-----------|------|---------|-------------|
| `prompt` | string | bắt buộc | Cần phân tích gì — ví dụ "Trích xuất tất cả bảng", "Trang 3 nói gì?" |
| `media_id` | string | — | `media_id` cụ thể tùy chọn từ thẻ `<media:document>` |
| `path` | string | — | Đường dẫn file tùy chọn từ thẻ `<media:document path="...">` |

Khác với `read_image` và `read_video`, `read_document` **không có** tham số `url`. Các định dạng văn bản thuần (JSON, CSV, Markdown, HTML, v.v.) được trả về trực tiếp mà không cần gọi LLM. File bị giới hạn **20 MB**.

### Trích xuất Local-First (opt-in)

Mặc định, tài liệu đi thẳng tới chuỗi vision đám mây. Bạn có thể bật trích xuất local chạy `pdftotext` (PDF) và `pandoc --sandbox` (DOCX) trên host *trước* mọi lệnh gọi đám mây, qua block cấu hình `document_parser`:

```json
{
  "local_first": false,
  "max_pages": 200,
  "timeout_sec": 30,
  "min_text_len": 16
}
```

| Trường | Mặc định | Mô tả |
|-------|---------|-------------|
| `local_first` | `false` | Bật trích xuất local. Yêu cầu `pdftotext`/`pandoc` trên PATH — có sẵn trong bản Docker `full` hoặc build với `ENABLE_FULL_SKILLS=true` |
| `max_pages` | `200` | Giới hạn số trang PDF; truyền vào `pdftotext -l` |
| `timeout_sec` | `30` | Timeout mỗi lần trích xuất; process group bị kill khi timeout |
| `min_text_len` | `16` | Số ký tự tối thiểu (sau khi trim) để coi là trích xuất thành công; output ngắn hơn sẽ kích hoạt fallback đám mây |

Cấu hình được nạp lúc khởi động (không hot-reload); tính khả dụng của binary được kiểm tra lại mỗi lần gọi, nên cài đặt lúc runtime được phát hiện mà không cần restart. Mọi trường hợp không trích xuất được — bị tắt, MIME không hỗ trợ, thiếu binary, timeout, hoặc quá ít văn bản (ví dụ PDF chỉ là ảnh scan) — đều fallback minh bạch về chuỗi vision đám mây. Trích xuất PDF dùng `pdftotext -l <max_pages>`; DOCX dùng `pandoc --sandbox` để một tài liệu không tin cậy không thể fetch tài nguyên từ xa trong lúc chuyển đổi.

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

- [TTS & Voice](/tts-voice) — Chuyển văn bản thành giọng nói
- [Custom Tools](/custom-tools) — Tạo công cụ riêng
- [Tổng quan Provider](/providers-overview) — Cấu hình API key

<!-- goclaw-source: fabe86b3 | updated: 2026-06-30 -->
