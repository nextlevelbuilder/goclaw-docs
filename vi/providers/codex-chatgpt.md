> Bản dịch từ [English version](/provider-codex)

# Codex / ChatGPT (OAuth)

Dùng subscription ChatGPT của bạn để chạy GoClaw agent qua OpenAI Responses API với xác thực OAuth.

## Tổng quan

Codex provider cho phép bạn dùng subscription ChatGPT Plus hoặc Pro hiện có với GoClaw — không cần mua thêm API key riêng. GoClaw xác thực qua OAuth bằng PKCE flow của OpenAI, lưu refresh token an toàn trong database, và tự động làm mới access token trước khi hết hạn.

Về mặt kỹ thuật, GoClaw dùng **OpenAI Responses API** (`POST /codex/responses`) thay vì endpoint chat completions chuẩn. API này hỗ trợ streaming, tool call, và reasoning output. Provider được đăng ký với tên `openai-codex` mặc định.

## Cách xác thực hoạt động

1. Bạn kích hoạt OAuth flow qua GoClaw web UI (Settings → Providers → ChatGPT)
2. GoClaw mở trình duyệt tại `https://auth.openai.com/oauth/authorize`
3. Bạn đăng nhập tài khoản ChatGPT và phê duyệt truy cập
4. OpenAI chuyển hướng về `http://localhost:1455/auth/callback` kèm authorization code
5. GoClaw đổi code lấy access + refresh token rồi lưu mã hóa trong database
6. Từ đó trở đi, GoClaw tự động dùng và làm mới token — không cần thao tác thủ công

## Cài đặt

Bạn không thêm provider này vào `config.json` thủ công. Thay vào đó:

1. Khởi động GoClaw: `./goclaw`
2. Mở web dashboard
3. Vào **Settings → Providers**
4. Click **Connect ChatGPT**
5. Hoàn thành OAuth flow trong trình duyệt

Sau khi kết nối, đặt agent dùng nó:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex"
    }
  }
}
```

## Models

Codex provider hỗ trợ các model có trên Responses API:

| Model | Ghi chú |
|---|---|
| `gpt-5.3-codex` | Mặc định; tối ưu cho tác vụ coding agentic |
| `o3` | Reasoning model mạnh |
| `o4-mini` | Reasoning nhanh hơn, chi phí thấp hơn |
| `gpt-4o` | Đa năng, multimodal |

Truyền tên model trong field `model` của agent config hoặc theo từng request.

## Thinking / Reasoning

Với các reasoning model (như `o3`, `o4-mini`), đặt `thinking_level` để kiểm soát mức độ reasoning:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "o3",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw dịch sang field `reasoning.effort` của Responses API (`low`, `medium`, `high`).

## Ghi chú về Wire Format

Codex provider dùng định dạng Responses API, không phải chat completions:

- System prompt trở thành `instructions` trong request body
- Messages được chuyển đổi sang định dạng mảng `input`
- Tool call dùng item type `function_call` và `function_call_output`
- Tool call ID được thêm prefix `fc_` theo yêu cầu của Responses API
- `store: false` luôn được đặt (GoClaw tự quản lý lịch sử hội thoại)

Sự chuyển đổi này hoàn toàn trong suốt — bạn tương tác với GoClaw theo cách giống nhau bất kể provider nào đang hoạt động.

## Ví dụ

**Agent config sau khi thiết lập OAuth:**

```json
{
  "agents": {
    "defaults": {
      "provider": "openai-codex",
      "model": "gpt-5.3-codex",
      "max_tokens": 8192
    }
  }
}
```

**Dùng reasoning với o3:**

```json
{
  "agents": {
    "list": {
      "reasoning-agent": {
        "provider": "openai-codex",
        "model": "o3",
        "thinking_level": "high"
      }
    }
  }
}
```

## Codex OAuth Pool

Nếu bạn có nhiều tài khoản ChatGPT (ví dụ tài khoản cá nhân và tài khoản công việc), bạn có thể gộp chúng vào một pool để GoClaw phân phối request qua tất cả. Điều này hữu ích để trải đều usage hoặc tự động chuyển sang tài khoản khác khi một tài khoản đạt giới hạn.

### Cách hoạt động

Bạn kết nối mỗi tài khoản ChatGPT như một provider `chatgpt_oauth` riêng biệt. Một provider là **pool owner** — nó chứa cấu hình routing. Các provider còn lại là **pool member** được liệt kê trong `extra_provider_names`.

### Cấu hình ở cấp provider (pool owner)

Khi tạo hoặc cập nhật provider qua `POST /v1/providers`, đặt field `settings`:

```json
{
  "name": "openai-codex",
  "provider_type": "chatgpt_oauth",
  "settings": {
    "codex_pool": {
      "strategy": "round_robin",
      "extra_provider_names": ["codex-work", "codex-shared"]
    }
  }
}
```

`strategy` điều khiển cách phân phối request qua pool:

| Strategy | Hành vi |
|----------|---------|
| `round_robin` | Luân phiên request qua tài khoản chính và tất cả extra provider |
| `priority_order` | Thử provider theo thứ tự — chính trước, sau đó extra theo thứ tự (mặc định) |

> **Migration note (v3.11.0):** Trước v3.11.0, API trả strategy `primary_first` cho cấu hình mặc định. Từ v3.11.0, surface chuẩn hoá thành `priority_order` (hành vi giống hệt — chọn primary trước, fallback theo thứ tự). Request body vẫn accept legacy values (`primary_first`, `manual`, `""`) để tương thích ngược; chúng được normalize sang `priority_order` khi đọc.

`extra_provider_names` là danh sách thành viên chính thức của pool. Provider đã được liệt kê trong `extra_provider_names` của pool khác không thể tự quản lý pool của mình.

### Override ở cấp agent

Từng agent có thể override hành vi pool qua `chatgpt_oauth_routing` trong `other_config`:

```json
{
  "other_config": {
    "chatgpt_oauth_routing": {
      "override_mode": "custom",
      "strategy": "priority_order"
    }
  }
}
```

Các giá trị `override_mode`:

| Giá trị | Hành vi |
|---------|---------|
| `inherit` | Dùng cấu hình `codex_pool` của primary provider (mặc định khi không đặt) |
| `custom` | Áp dụng strategy override của agent này |

### Lưu ý về routing

- Các lỗi upstream có thể retry (HTTP 429, 5xx) tự động chuyển sang tài khoản tiếp theo trong cùng một request.
- OAuth login và logout theo từng provider — mỗi tài khoản xác thực độc lập.
- Pool chỉ hoạt động khi provider của agent là kiểu `chatgpt_oauth`. Provider không phải Codex không bị ảnh hưởng.
- Round-robin counter được theo dõi riêng cho từng modality — chat request và image request luân phiên trên counter độc lập. Request sinh ảnh đi qua chuỗi `create_image` và được tính vào counter image riêng.

### Endpoint xem hoạt động pool

Để kiểm tra quyết định routing và sức khỏe từng tài khoản cho một agent:

```
GET /v1/agents/{id}/codex-pool-activity
```

Xem [REST API](/rest-api) để biết cấu trúc response.

---

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | Token hết hạn hoặc bị thu hồi | Xác thực lại qua Settings → Providers → ChatGPT |
| OAuth callback thất bại | Port 1455 bị chặn | Đảm bảo không có gì khác đang lắng nghe port 1455 trong lúc xác thực |
| `model not found` | Model không có trong subscription | Kiểm tra gói ChatGPT; một số model yêu cầu gói Pro |
| Provider không khả dụng sau restart | Token không được persist | GoClaw tự load token từ DB khi khởi động; kiểm tra kết nối DB |
| Field phase trong response | `gpt-5.3-codex` trả về phase `commentary` + `final_answer` | GoClaw xử lý tự động; cả hai phase đều được ghi lại |

## Tiếp theo

- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI kể cả model local
- [Claude CLI](/provider-claude-cli) — dùng subscription Claude thay thế

<!-- goclaw-source: 29457bb3 | cập nhật: 2026-04-25 -->
