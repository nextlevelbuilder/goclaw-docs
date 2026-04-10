> Bản dịch từ [English version](/cli-credentials)

# CLI Credentials

> Lưu trữ và quản lý bộ thông tin xác thực có tên cho thực thi lệnh shell, với kiểm soát truy cập per-agent qua grants.

## Tổng quan

CLI Credentials cho phép định nghĩa bộ thông tin xác thực có tên (API key, token, connection string) mà agent có thể tham chiếu khi chạy lệnh shell qua tool `exec` — mà không lộ secret trong system prompt hay lịch sử hội thoại.

Mỗi credential được lưu dưới dạng **secure CLI binary** — cấu hình có tên ánh xạ một binary (ví dụ `gh`, `gcloud`, `aws`) với bộ biến môi trường mã hóa AES-256-GCM. Khi agent chạy binary đó, GoClaw giải mã env var và inject vào child process lúc thực thi.

## Binary Global và Per-Agent

Từ migration 036, mô hình truy cập dùng **grants system** thay vì gán agent per-binary:

- **Binary global** (`is_global = true`): tất cả agent đều dùng được trừ khi grant override cài đặt
- **Binary hạn chế** (`is_global = false`): chỉ agent có grant tường minh mới truy cập được

Cách này tách biệt định nghĩa credential khỏi kiểm soát truy cập, cho phép định nghĩa binary một lần và cấp cho agent cụ thể với override per-agent tùy chọn.

```
secure_cli_binaries (credential + mặc định)
        │
        ├── is_global = true  → tất cả agent đều dùng được
        └── is_global = false → chỉ agent có grant
                    │
                    └── secure_cli_agent_grants (override per-agent)
                            ├── deny_args (NULL = dùng mặc định binary)
                            ├── deny_verbose (NULL = dùng mặc định binary)
                            ├── timeout_seconds (NULL = dùng mặc định binary)
                            ├── tips (NULL = dùng mặc định binary)
                            └── enabled
```

## Agent Grants

Bảng `secure_cli_agent_grants` liên kết binary với agent cụ thể và tùy chọn override các cài đặt mặc định của binary. Trường `NULL` sẽ kế thừa giá trị mặc định của binary.

| Trường | Hành vi |
|--------|---------|
| `deny_args` | Override pattern argument bị cấm cho agent này |
| `deny_verbose` | Override loại bỏ verbose flag cho agent này |
| `timeout_seconds` | Override timeout process cho agent này |
| `tips` | Override gợi ý inject vào TOOLS.md cho agent này |
| `enabled` | Vô hiệu hóa grant mà không xóa |

Khi agent chạy binary, GoClaw áp dụng cài đặt theo thứ tự:
1. Mặc định của binary
2. Override từ grant (trường khác null sẽ thay thế mặc định binary)

## REST API

Tất cả endpoint grant được lồng dưới resource binary và yêu cầu role `admin`.

### Liệt kê grant của binary

```
GET /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "grants": [
    {
      "id": "019...",
      "binary_id": "019...",
      "agent_id": "019...",
      "deny_args": null,
      "timeout_seconds": 60,
      "enabled": true,
      "created_at": "2026-04-05T00:00:00Z",
      "updated_at": "2026-04-05T00:00:00Z"
    }
  ]
}
```

### Tạo grant

```
POST /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "agent_id": "019...",
  "timeout_seconds": 120,
  "tips": "Dùng --output json cho tất cả lệnh"
}
```

Các trường bỏ qua (`deny_args`, `deny_verbose`, `tips`, `enabled`) mặc định là `null` / `true`.

### Lấy thông tin grant

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### Cập nhật grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Chỉ gửi các trường muốn thay đổi. Các trường được phép: `deny_args`, `deny_verbose`, `timeout_seconds`, `tips`, `enabled`.

### Xóa grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Xóa grant của binary hạn chế (`is_global = false`) sẽ lập tức thu hồi quyền truy cập binary đó của agent.

## Pattern phổ biến

### Chỉ cho phép một agent dùng CLI tool nhạy cảm

1. Tạo binary với `is_global = false`
2. Tạo grant cho agent mục tiêu

### Cho tất cả agent dùng nhưng hạn chế args với một agent

1. Tạo binary với `is_global = true`
2. Tạo grant cho agent bị hạn chế với `deny_args` bổ sung pattern bị chặn

### Tạm thời vô hiệu hóa quyền truy cập của agent

Cập nhật grant: `{"enabled": false}`. Binary vẫn dùng được với các agent khác.

## Sự cố thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Agent không chạy được binary | Kiểm tra `is_global` của binary — nếu `false`, agent cần có grant tường minh |
| Override của grant không được áp dụng | Kiểm tra grant `enabled = true` và các trường override khác null |
| `403` ở endpoint grant | Cần role admin — kiểm tra scope của API key |

## Tiếp theo

- [Database Schema → secure_cli_agent_grants](/database-schema)
- [Exec Approval](/exec-approval)
- [API Keys & RBAC](/api-keys-rbac)
- [Security Hardening](/deploy-security)

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
