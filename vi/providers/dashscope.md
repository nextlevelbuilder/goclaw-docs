> Bản dịch từ [English version](/provider-dashscope)

# DashScope (Alibaba Qwen)

Kết nối GoClaw với các model Qwen của Alibaba qua DashScope OpenAI-compatible API.

## Tổng quan

DashScope là nền tảng phục vụ model của Alibaba, cung cấp bộ model Qwen. GoClaw dùng `DashScopeProvider` chuyên biệt — bọc lớp tương thích OpenAI chuẩn và thêm một workaround quan trọng: **DashScope không hỗ trợ tool call và streaming đồng thời**. Khi agent của bạn dùng tool, GoClaw tự động fallback sang request non-streaming rồi tổng hợp streaming callback cho caller — agent của bạn hoạt động đúng mà không cần thay đổi code.

DashScope cũng hỗ trợ extended thinking qua `thinking_level`, GoClaw ánh xạ sang các tham số `enable_thinking` và `thinking_budget` đặc thù của DashScope.

## Cài đặt

Thêm DashScope API key vào `config.json`:

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max"
    }
  }
}
```

Lưu key trong `.env.local`:

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

API base mặc định là `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (endpoint quốc tế). Để truy cập từ Trung Quốc, đặt `api_base` thành `https://dashscope.aliyuncs.com/compatible-mode/v1`.

## Models

| Model | Ghi chú |
|---|---|
| `qwen3-max` | Độ chính xác cao nhất (mặc định) |
| `qwen3-plus` | Cân bằng giữa hiệu suất và chi phí |
| `qwen3-turbo` | Model Qwen3 nhanh nhất |
| `qwen3-235b-a22b` | Open-weight, kiến trúc MoE |
| `qwq-32b` | Extended thinking / reasoning model |

## Thinking (Extended Reasoning)

Với các model hỗ trợ extended thinking (như `qwq-32b`), đặt `thinking_level` trong agent options:

```json
{
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwq-32b",
      "thinking_level": "medium"
    }
  }
}
```

GoClaw ánh xạ `thinking_level` sang `thinking_budget` của DashScope:

| Level | Budget (tokens) |
|---|---|
| `low` | 4,096 |
| `medium` | 16,384 (mặc định) |
| `high` | 32,768 |

## Ví dụ

**Config tối giản với endpoint quốc tế:**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY"
    }
  },
  "agents": {
    "defaults": {
      "provider": "dashscope",
      "model": "qwen3-max",
      "max_tokens": 8192
    }
  }
}
```

**Endpoint khu vực Trung Quốc:**

```json
{
  "providers": {
    "dashscope": {
      "api_key": "$DASHSCOPE_API_KEY",
      "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `401 Unauthorized` | API key không hợp lệ | Xác minh `DASHSCOPE_API_KEY` trong `.env.local` |
| Tool call chậm | Tool tắt streaming; GoClaw dùng non-streaming fallback | Đây là giới hạn của DashScope; response vẫn được gửi đầy đủ |
| Thiếu thinking content | Model không hỗ trợ thinking | Dùng `qwq-32b` hoặc model hỗ trợ thinking khác |
| `404` trên request | Sai endpoint khu vực | Đặt `api_base` đúng endpoint Trung Quốc hoặc quốc tế |

## Tiếp theo

- [Claude CLI](/provider-claude-cli) — provider đặc biệt gọi CLI binary của Claude Code
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
