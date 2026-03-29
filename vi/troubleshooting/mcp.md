# Sự cố MCP

> Khắc phục sự cố kết nối MCP (Model Context Protocol) server, đăng ký tool, và thực thi.

## Tổng quan

GoClaw kết nối các MCP server bên ngoài vào registry tool của agent. Mỗi server chạy dưới dạng tiến trình riêng (stdio) hoặc dịch vụ từ xa (SSE / streamable-HTTP). Lỗi kết nối, trùng tên tool, và timeout là các vấn đề phổ biến nhất.

Kiểm tra log khởi động để xem các sự kiện MCP — key log chính: `mcp.server.connected`, `mcp.server.connect_failed`, `mcp.server.health_failed`, `mcp.server.reconnect_exhausted`.

## Kết nối Server

### Server từ config file (block `mcp_servers`)

GoClaw kết nối tất cả server được bật trong config file khi khởi động. Server bị lỗi sẽ được ghi log dưới dạng warning; GoClaw tiếp tục chạy — **không** chặn quá trình khởi động.

```
WARN mcp.server.connect_failed server=postgres error=create client: ...
```

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `create client: ...` | `transport` hoặc đường dẫn `command` sai | Kiểm tra `transport` (`stdio`, `sse`, `streamable-http`) và đảm bảo binary/URL có thể truy cập |
| `start transport: ...` (SSE/HTTP) | URL server không thể kết nối hoặc lỗi TLS | Kiểm tra `url` đúng; xác minh network, firewall, và chứng chỉ TLS |
| `initialize: ...` | MCP handshake thất bại | Đảm bảo server implement đúng MCP protocol; kiểm tra log của server |
| `list tools: ...` | Server kết nối được nhưng không trả về tool nào | Server có thể bị crash trong quá trình khởi động; kiểm tra log server |
| Server không xuất hiện trên dashboard | `enabled: false` trong config | Đặt `enabled: true` hoặc bỏ trường này (mặc định là true) |

### Kết nối lại tự động

GoClaw kiểm tra kết nối mỗi 30 giây bằng ping. Khi thất bại sẽ thử lại tối đa **10 lần** với exponential backoff (bắt đầu 2s, tối đa 60s). Sau 10 lần thất bại, server bị đánh dấu ngắt kết nối vĩnh viễn.

```
WARN mcp.server.health_failed server=postgres error=...
INFO mcp.server.reconnecting  server=postgres attempt=3 backoff=8s
ERROR mcp.server.reconnect_exhausted server=postgres
```

Nếu thấy `reconnect_exhausted`, tiến trình server có thể đã bị crash. Khởi động lại MCP server rồi kích hoạt kết nối lại qua dashboard hoặc khởi động lại GoClaw.

## Đăng ký Tool

Tool được đăng ký với tên `{prefix}__{tool_name}`. Prefix mặc định là `mcp_{server_name}` (dấu gạch ngang chuyển thành gạch dưới). Có thể ghi đè bằng `tool_prefix` trong config server.

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `mcp.tool.name_collision` trong log, tool bị bỏ qua | Hai server có tool tạo ra cùng tên sau khi thêm prefix | Đặt `tool_prefix` riêng biệt cho mỗi server trong config |
| Tool không hiển thị với agent | Server đã kết nối nhưng agent không có quyền truy cập | Cấp quyền server cho agent trong dashboard (Agents → tab MCP) |
| >40 tool → chỉ thấy `mcp_tool_search` | Search mode được bật tự động khi vượt ngưỡng 40 tool | Dùng `mcp_tool_search` để tìm và kích hoạt tool theo nhu cầu; đây là hành vi bình thường |

## Lỗi Transport

### stdio

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `exec: command not found` | Binary không có trong PATH hoặc giá trị `command` sai | Dùng đường dẫn tuyệt đối trong `command`; kiểm tra binary đã được cài đặt |
| Tiến trình thoát ngay lập tức | Server bị crash khi khởi động | Chạy lệnh thủ công trong terminal để xem lỗi |
| Biến môi trường không được truyền | Thiếu mục trong map `env` | Thêm các biến cần thiết vào `env` trong block config server |

### SSE / streamable-HTTP

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `connection refused` | Server chưa chạy hoặc sai port | Khởi động server; kiểm tra `url` khớp với địa chỉ lắng nghe |
| `401 Unauthorized` | Thiếu hoặc sai auth header | Thêm token vào `headers` (ví dụ: `Authorization: Bearer <token>`) |
| Lỗi chứng chỉ TLS | Cert tự ký hoặc hết hạn | Dùng cert hợp lệ, hoặc đặt MCP server sau một reverse proxy đáng tin cậy |

## Thực thi Tool

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `MCP server "X" is disconnected` | Server mất kết nối sau lần kết nối đầu tiên | Kiểm tra tiến trình server; GoClaw tự động thử kết nối lại |
| `MCP tool "X" timeout after Ns` | Lệnh gọi tool vượt quá `timeout_sec` (mặc định 60s) | Tăng `timeout_sec` trong config server; mặc định là 60s |
| `MCP tool "X" error: ...` | Server trả về lỗi khi thực thi | Kiểm tra log MCP server để tìm nguyên nhân gốc rễ |
| Tool trả về `[non-text content: ...]` | Server trả về image/audio thay vì text | Bình thường với tool không phải text; loại nội dung được ghi chú trong kết quả |

## Xem thêm

- [Sự cố chung](/troubleshoot-common) — các vấn đề khởi động và kết nối tổng quát
- [Hướng dẫn Dashboard](/dashboard-tour) — quản lý MCP server và quyền truy cập trên giao diện

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
