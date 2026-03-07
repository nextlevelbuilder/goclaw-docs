# Tài liệu Tham chiếu API

## Các Endpoint HTTP

| Method | Path | Mô tả |
|--------|------|-------------|
| GET | `/health` | Kiểm tra sức khỏe |
| GET | `/ws` | Nâng cấp WebSocket |
| POST | `/v1/chat/completions` | API chat tương thích OpenAI |
| POST | `/v1/responses` | Giao thức Responses |
| POST | `/v1/tools/invoke` | Gọi tool |
| GET/POST | `/v1/agents/*` | Quản lý agent (chế độ managed) |
| GET/POST | `/v1/skills/*` | Quản lý skill (chế độ managed) |
| GET/POST/PUT/DELETE | `/v1/tools/custom/*` | CRUD custom tool (chế độ managed) |
| GET/POST/PUT/DELETE | `/v1/mcp/*` | Quản lý MCP server + grant (chế độ managed) |
| GET | `/v1/traces/*` | Xem trace (chế độ managed) |

## Custom Tool (Chế độ Managed)

Định nghĩa các tool dựa trên shell tại runtime qua HTTP API -- không cần biên dịch lại hay khởi động lại. LLM có thể gọi custom tool giống hệt như các tool tích hợp sẵn.

**Cách hoạt động:**
1. Admin tạo tool qua `POST /v1/tools/custom` với template lệnh shell
2. LLM tạo ra một tool call với tên custom tool
3. GoClaw render template lệnh với các đối số đã được shell-escape, kiểm tra deny pattern và thực thi với timeout

**Khả năng:**
- **Phạm vi** -- Toàn cục (tất cả agent) hoặc theo từng agent (trường `agent_id`)
- **Tham số** -- Định nghĩa JSON Schema cho đối số LLM
- **Bảo mật** -- Tất cả đối số được tự động shell-escape, lọc deny pattern (chặn `curl|sh`, reverse shell, v.v.), timeout có thể cấu hình (mặc định 60s)
- **Biến môi trường được mã hóa** -- Biến môi trường lưu với mã hóa AES-256-GCM trong cơ sở dữ liệu
- **Vô hiệu hóa cache** -- Các thay đổi phát sự kiện để hot-reload không cần khởi động lại

**API:**

| Method | Path | Mô tả |
|---|---|---|
| GET | `/v1/tools/custom` | Liệt kê tool (lọc theo `?agent_id=`) |
| POST | `/v1/tools/custom` | Tạo custom tool |
| GET | `/v1/tools/custom/{id}` | Lấy chi tiết tool |
| PUT | `/v1/tools/custom/{id}` | Cập nhật tool (JSON patch) |
| DELETE | `/v1/tools/custom/{id}` | Xóa tool |

**Ví dụ -- tạo tool kiểm tra bản ghi DNS:**

```json
{
  "name": "dns_lookup",
  "description": "Look up DNS records for a domain",
  "parameters": {
    "type": "object",
    "properties": {
      "domain": { "type": "string", "description": "Domain name to look up" },
      "record_type": { "type": "string", "enum": ["A", "AAAA", "MX", "CNAME", "TXT"] }
    },
    "required": ["domain"]
  },
  "command": "dig +short {{.record_type}} {{.domain}}",
  "timeout_seconds": 10,
  "enabled": true
}
```

## Tích hợp MCP

Kết nối các server [Model Context Protocol](https://modelcontextprotocol.io) bên ngoài để mở rộng khả năng của agent. Các MCP tool được đăng ký minh bạch vào registry tool của GoClaw và được gọi như bất kỳ tool tích hợp nào.

**Transport được hỗ trợ:** `stdio`, `sse`, `streamable-http`

**Chế độ Standalone** -- cấu hình trong `config.json`:

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
      },
      "remote-tools": {
        "transport": "streamable-http",
        "url": "https://mcp.example.com/tools"
      }
    }
  }
}
```

**Chế độ Managed** -- CRUD đầy đủ qua HTTP API với grant truy cập theo agent và theo user:

| Method | Path | Mô tả |
|---|---|---|
| GET | `/v1/mcp/servers` | Liệt kê MCP server đã đăng ký |
| POST | `/v1/mcp/servers` | Đăng ký MCP server mới |
| GET | `/v1/mcp/servers/{id}` | Lấy chi tiết server |
| PUT | `/v1/mcp/servers/{id}` | Cập nhật cấu hình server |
| DELETE | `/v1/mcp/servers/{id}` | Xóa MCP server |
| POST | `/v1/mcp/servers/{id}/grants/agent` | Cấp quyền truy cập cho agent |
| DELETE | `/v1/mcp/servers/{id}/grants/agent/{agentID}` | Thu hồi quyền truy cập của agent |
| GET | `/v1/mcp/grants/agent/{agentID}` | Liệt kê MCP grant của agent |
| POST | `/v1/mcp/servers/{id}/grants/user` | Cấp quyền truy cập cho user |
| DELETE | `/v1/mcp/servers/{id}/grants/user/{userID}` | Thu hồi quyền truy cập của user |
| POST | `/v1/mcp/requests` | Yêu cầu quyền truy cập (user tự phục vụ) |
| GET | `/v1/mcp/requests` | Liệt kê các yêu cầu truy cập đang chờ |
| POST | `/v1/mcp/requests/{id}/review` | Phê duyệt hoặc từ chối yêu cầu |

**Tính năng:**
- **Multi-server** -- Kết nối nhiều MCP server đồng thời
- **Tiền tố tên tool** -- Tùy chọn `{prefix}__{toolName}` để tránh xung đột tên
- **Grant theo agent** -- Kiểm soát agent nào có thể truy cập MCP server nào, với danh sách cho phép/từ chối tool
- **Grant theo user** -- Kiểm soát truy cập chi tiết ở cấp độ user
- **Yêu cầu truy cập** -- User có thể yêu cầu quyền truy cập; admin phê duyệt hoặc từ chối
