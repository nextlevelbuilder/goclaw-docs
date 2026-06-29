# Bailian

> Kết nối với các model Bailian (百炼) Coding của Alibaba Cloud qua endpoint tương thích OpenAI.

## Tổng quan

Bailian là nền tảng mô hình AI của Alibaba Cloud. GoClaw kết nối tới endpoint **Coding** của Bailian bằng định dạng API tương thích OpenAI. Loại provider `bailian` **tách biệt với `dashscope`** — chúng là các endpoint khác nhau với base URL khác nhau và catalog model khác nhau. Đường tiêm `enable_thinking`/`thinking_budget` của DashScope **không** áp dụng cho Bailian; Bailian được xử lý như một provider tương thích OpenAI thuần túy.

- **Loại provider:** `bailian`
- **Model mặc định:** `qwen3.5-plus`
- **API base mặc định:** `https://coding-intl.dashscope.aliyuncs.com/v1`

## Cấu hình

Thêm API key Bailian của bạn vào `config.json` trong block provider `bailian`:

```json
{
  "providers": {
    "bailian": {
      "api_key": "$GOCLAW_BAILIAN_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "bailian",
      "model": "qwen3.5-plus"
    }
  }
}
```

Lưu key trong `.env.local`:

```bash
GOCLAW_BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

Trường `api_base` là tùy chọn — mặc định là `https://coding-intl.dashscope.aliyuncs.com/v1`. Bạn cũng có thể thêm Bailian từ dashboard (**Settings → Providers**); key được mã hóa AES-256-GCM khi lưu.

## Models

Nền tảng Bailian Coding **không** cung cấp endpoint `/v1/models` chuẩn, nên GoClaw đi kèm một **catalog cố định (hardcoded)**. Các model sau đây khả dụng:

| Model | Ghi chú |
|---|---|
| `qwen3.7-plus` | Qwen 3.7 Plus — Sinh văn bản, Deep Thinking, Hiểu hình ảnh |
| `qwen3.6-plus` | Qwen 3.6 Plus |
| `qwen3.5-plus` | Qwen 3.5 Plus (mặc định) |
| `kimi-k2.5` | Kimi K2.5 |
| `GLM-5` | GLM-5 |
| `MiniMax-M2.5` | MiniMax M2.5 |
| `qwen3-max-2026-01-23` | Qwen 3 Max (2026-01-23) |
| `qwen3-coder-next` | Qwen 3 Coder Next |
| `qwen3-coder-plus` | Qwen 3 Coder Plus |
| `glm-4.7` | GLM 4.7 |

## Bailian vs DashScope

Cả hai đều kết nối tới hạ tầng Alibaba, nhưng là các provider khác nhau:

| | `bailian` | `dashscope` |
|---|---|---|
| Endpoint | `https://coding-intl.dashscope.aliyuncs.com/v1` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Model mặc định | `qwen3.5-plus` | `qwen3-max` |
| Liệt kê model | Catalog cố định (không có `/v1/models`) | Liệt kê trực tiếp |
| Tiêm thinking | Không (tương thích OpenAI thuần túy) | `enable_thinking` + `thinking_budget` |

Nếu bạn muốn extended thinking kiểu DashScope, hãy dùng provider [DashScope](/provider-dashscope) thay thế.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key không hợp lệ | Xác minh `GOCLAW_BAILIAN_API_KEY` trong `.env.local` |
| Model không được liệt kê | Catalog là cố định | Dùng một model ID từ bảng trên; Coding API không có endpoint `/v1/models` |
| Thinking không có tác dụng | Bailian là OpenAI-compatible thuần túy | Tiêm thinking của DashScope không áp dụng; dùng provider `dashscope` cho `enable_thinking` |

## Tiếp theo

- [Tổng quan Provider](/providers-overview)
- [DashScope (Qwen)](/provider-dashscope) — Alibaba Qwen model với hỗ trợ thinking
- [Kimi Coding](/provider-kimi) — endpoint Moonshot Kimi Coding

<!-- goclaw-source: fabe86b3 | cập nhật: 2026-06-28 -->
