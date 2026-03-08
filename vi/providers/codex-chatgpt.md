> Bản dịch từ [English version](../../providers/codex-chatgpt.md)

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

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | Token hết hạn hoặc bị thu hồi | Xác thực lại qua Settings → Providers → ChatGPT |
| OAuth callback thất bại | Port 1455 bị chặn | Đảm bảo không có gì khác đang lắng nghe port 1455 trong lúc xác thực |
| `model not found` | Model không có trong subscription | Kiểm tra gói ChatGPT; một số model yêu cầu gói Pro |
| Provider không khả dụng sau restart | Token không được persist | GoClaw tự load token từ DB khi khởi động; kiểm tra kết nối DB |
| Field phase trong response | `gpt-5.3-codex` trả về phase `commentary` + `final_answer` | GoClaw xử lý tự động; cả hai phase đều được ghi lại |

## Tiếp theo

- [Custom Provider](./custom-provider.md) — kết nối bất kỳ API nào tương thích OpenAI kể cả model local
- [Claude CLI](./claude-cli.md) — dùng subscription Claude thay thế
