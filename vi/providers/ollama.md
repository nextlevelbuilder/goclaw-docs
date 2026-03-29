> Bản dịch từ [English version](/provider-ollama)

# Ollama

> Chạy các mô hình mã nguồn mở cục bộ với Ollama — không cần đám mây.

🚧 **Trang này đang được xây dựng.** Nội dung sẽ sớm được cập nhật — đóng góp luôn được chào đón!

## Tổng quan

Ollama cho phép bạn chạy các mô hình ngôn ngữ lớn trên máy của mình. GoClaw kết nối với Ollama thông qua API tương thích OpenAI mà nó expose cục bộ, do đó không có dữ liệu nào rời khỏi hạ tầng của bạn.

## Loại Provider

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  }
}
```

## Triển khai Docker

Khi chạy GoClaw trong Docker, `localhost` và `127.0.0.1` trong URL provider được tự động chuyển thành `host.docker.internal` để container có thể kết nối với Ollama chạy trên máy host. Không cần cấu hình thủ công.

Nếu Ollama chạy trên máy khác, đặt URL đầy đủ:

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://my-ollama-server:11434/v1"
    }
  }
}
```

## Tiếp theo

- [Tổng quan Provider](/providers-overview)
- [Ollama Cloud](/provider-ollama-cloud) — tùy chọn Ollama hosted
- [Custom / OpenAI-Compatible](/provider-custom)

<!-- goclaw-source: 9168e4b4 | cập nhật: 2026-03-26 -->
