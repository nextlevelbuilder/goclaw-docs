> Bản dịch từ [English version](/provider-novita)

# Novita AI

> Nhà cung cấp LLM tương thích OpenAI với nhiều mô hình mã nguồn mở đa dạng.

## Tổng quan

Novita AI là nền tảng suy luận đám mây cung cấp quyền truy cập vào hàng chục mô hình mã nguồn mở thông qua API tương thích OpenAI. GoClaw kết nối với Novita bằng `OpenAIProvider` chuẩn.

- **Loại provider:** `novita`
- **API base mặc định:** `https://api.novita.ai/openai`
- **Model mặc định:** `moonshotai/kimi-k2.5`
- **Giao thức:** Tương thích OpenAI (Bearer token)

## Cấu hình nhanh

### Cấu hình tĩnh (config.json)

```json
{
  "providers": {
    "novita": {
      "api_key": "your-novita-api-key"
    }
  }
}
```

`api_base` mặc định là `https://api.novita.ai/openai` — bỏ qua trừ khi cần ghi đè.

### Biến môi trường

```
GOCLAW_NOVITA_API_KEY=your-novita-api-key
```

### Dashboard (bảng llm_providers)

```json
{
  "provider_type": "novita",
  "api_key": "your-novita-api-key",
  "api_base": "https://api.novita.ai/openai"
}
```

## Dùng Novita trong Agent

```json
{
  "agents": {
    "defaults": {
      "provider": "novita",
      "model": "moonshotai/kimi-k2.5"
    }
  }
}
```

## Tiếp theo

- [Tổng quan Provider](/providers-overview)
- [Custom / OpenAI-Compatible](/provider-custom)
- [OpenRouter](/provider-openrouter) — nền tảng đa mô hình khác

<!-- goclaw-source: e7afa832 | cập nhật: 2026-03-30 -->
