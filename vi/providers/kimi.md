> Bản dịch từ [English version](/provider-kimi)

# Kimi Coding (Moonshot)

> Kết nối GoClaw với các model Kimi Coding của Moonshot qua endpoint Coding tương thích OpenAI.

## Tổng quan

Kimi Coding là endpoint tập trung vào lập trình của Moonshot AI. GoClaw kết nối tới nó như một provider tương thích OpenAI (`provider_type: "kimi_coding"`), tái sử dụng `OpenAIProvider` chuẩn cùng ba điều chỉnh đặc thù của Kimi được nối tự động: một **header `User-Agent` cố định**, một **khóa temperature**, và **bắt buộc `reasoning_content`** trên các assistant message chứa tool call. Bạn không cần cấu hình bất kỳ thứ nào — GoClaw xử lý chúng để agent của bạn chạy được ngay.

- **Loại provider:** `kimi_coding`
- **Model mặc định:** `kimi-k2-turbo-preview`
- **API base mặc định:** `https://api.kimi.com/coding/v1`

## Cấu hình

Kimi Coding được thêm từ **dashboard** (không có block provider tĩnh trong `config.json`). Trong GoClaw dashboard:

1. Vào **Settings → Providers → Add**
2. Chọn **"Kimi Coding (Moonshot)"** — API base được điền sẵn `https://api.kimi.com/coding/v1`
3. Dán API key Kimi của bạn
4. Lưu — key được mã hóa AES-256-GCM khi lưu, và thay đổi có hiệu lực ở request tiếp theo

Sau đó trỏ một agent tới nó:

```json
{
  "agents": {
    "defaults": {
      "provider": "kimi",
      "model": "kimi-k2-turbo-preview"
    }
  }
}
```

> Dùng **tên** bạn đặt cho provider khi tạo (ví dụ `kimi`) làm giá trị `provider` của agent. `provider_type` (`kimi_coding`) là loại bất biến được chọn từ dropdown.

## Models

| Model | Ghi chú |
|---|---|
| `kimi-k2-turbo-preview` | Mặc định — thinking phía máy chủ bật mặc định |

API base mặc định là `https://api.kimi.com/coding/v1` nếu bạn để trống.

## Hành vi Phi tiêu chuẩn

Kimi Coding có ba điểm đặc thù mà upstream thực thi nghiêm ngặt. GoClaw xử lý tất cả cho bạn.

### 1. `User-Agent` cố định

Mọi request — bao gồm cả lệnh liệt kê model — được gửi với header cố định `User-Agent: claude-code/0.1.0`. Upstream từ chối các request không mang đúng User-Agent này. GoClaw tự tiêm nó qua extra header của provider; bạn không cần đặt.

### 2. Khóa temperature

Máy chủ Kimi khóa `temperature` ở `1` và từ chối mọi ghi đè. Do đó GoClaw **loại bỏ `temperature`** khỏi body request đối với provider `kimi_coding` (giống cách xử lý cho OpenAI `o1`/`o3`/`o4` và `gpt-5-mini`/`gpt-5-nano`). Truyền giá trị temperature tới raw API trả về `HTTP 400 invalid temperature: only 1 is allowed for this model`.

### 3. `reasoning_content` bắt buộc trên tool call

`kimi-k2-turbo-preview` bật thinking phía máy chủ theo mặc định. Khi một assistant message chứa `tool_calls` được replay trong history, nó **bắt buộc phải** mang trường `reasoning_content` — nếu không upstream trả về `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N`. GoClaw giữ reasoning đã ghi lại khi có, và phát ra một **chuỗi `reasoning_content` rỗng** khi không có, để các vòng lặp tool nhiều turn vẫn hoạt động.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `HTTP 400 invalid temperature: only 1 is allowed for this model` | Một giá trị temperature đã được gửi | GoClaw tự loại bỏ `temperature` cho `kimi_coding`; đừng hard-code trong raw request |
| `HTTP 400 thinking is enabled but reasoning_content is missing in assistant tool call message at index N` | Tool-call message replay thiếu `reasoning_content` | GoClaw tự phát ra `reasoning_content` rỗng; đảm bảo history assistant không bị tước trường này |
| Request bị từ chối / 4xx ở mọi lần gọi | Thiếu hoặc thay đổi `User-Agent` | GoClaw gửi `claude-code/0.1.0` tự động; đừng ghi đè header User-Agent |
| `401 Unauthorized` | API key không hợp lệ | Nhập lại key Kimi trong Settings → Providers |

## Tiếp theo

- [Tổng quan Provider](/providers-overview) — kiến trúc provider và retry logic
- [Extended Thinking](/extended-thinking) — cách thinking và `reasoning_content` hoạt động giữa các provider
- [DashScope (Qwen)](/provider-dashscope) — Alibaba Qwen model với hỗ trợ thinking

<!-- goclaw-source: fabe86b3 | cập nhật: 2026-06-28 -->
