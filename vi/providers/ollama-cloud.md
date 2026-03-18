> Bản dịch từ [English version](#provider-ollama-cloud)

# Ollama Cloud

> Dùng các mô hình tương thích Ollama qua hosting đám mây — tiện lợi của inference hosted với hệ sinh thái mô hình mở của Ollama.

🚧 **Trang này đang được xây dựng.** Nội dung sẽ sớm được cập nhật — đóng góp luôn được chào đón!

## Tổng quan

Ollama Cloud cung cấp inference hosted cho các mô hình tương thích Ollama. GoClaw kết nối thông qua API tương thích OpenAI, cho phép truy cập các mô hình mã nguồn mở mà không cần quản lý phần cứng cục bộ.

## Loại Provider

```json
{
  "providers": {
    "ollama-cloud": {
      "provider_type": "ollama-cloud",
      "api_key": "your-ollama-cloud-api-key",
      "api_base": "https://api.ollama.ai/v1"
    }
  }
}
```

## Tiếp theo

- [Tổng quan Provider](#providers-overview)
- [Ollama](#provider-ollama) — chạy mô hình cục bộ thay thế
- [Custom / OpenAI-Compatible](#provider-custom)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
