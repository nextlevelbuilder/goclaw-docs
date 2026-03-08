> Bản dịch từ [English version](../../core-concepts/multi-tenancy.md)

# Multi-Tenancy

> Cách GoClaw cách ly dữ liệu per-user mà không cần hệ thống auth riêng.

## Tổng quan

GoClaw được thiết kế đa tenant từ đầu: mỗi người dùng có session, memory, context file, và trace cách ly. Thay vì tự quản lý user, GoClaw tin tưởng một service upstream để xác định user — một pattern gọi là identity propagation.

## Identity Propagation

GoClaw không xác thực người dùng. Ứng dụng của bạn nói với GoClaw ai là người dùng:

### HTTP API

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "X-GoClaw-User-Id: user-123" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "default", "messages": [...]}'
```

### WebSocket

```json
{
  "type": "connect",
  "user_id": "user-123",
  "token": "YOUR_GATEWAY_TOKEN"
}
```

### Messaging Channel

Với Telegram, Discord, v.v., user ID đến từ chính channel đó (ví dụ: Telegram user ID `386246614`).

## Định dạng User ID

User ID là một **chuỗi không rõ nghĩa** (tối đa 255 ký tự). GoClaw không bao giờ xác thực định dạng — bạn quyết định quy ước.

**Khuyến nghị cho ứng dụng đa tenant:**

```
tenant.{tenantId}.user.{userId}
```

Ví dụ: `tenant.acme-corp.user.john` — cách này tự nhiên phân phạm vi tất cả dữ liệu theo cả tenant và user.

## Những gì được cách ly

Mọi dữ liệu người dùng được phân phạm vi bởi user ID:

| Dữ liệu | Bảng | Cách ly |
|---------|-------|---------|
| Context file | `user_context_files` | Per-user per-agent |
| Agent profile | `user_agent_profiles` | Per-user per-agent |
| Agent override | `user_agent_overrides` | Tùy chọn provider/model per-user |
| Session | `sessions` | Per-user per-agent per-channel |
| Memory | `memory_documents` | Per-user per-agent |
| Trace | `traces` | Có thể lọc per-user |
| Quyền truy cập agent | `agent_shares` | Role per-user (admin/operator/viewer) |
| MCP grant | `mcp_user_grants` | Quyền truy cập MCP server per-user |
| Skill grant | `skill_user_grants` | Quyền truy cập skill per-user |

Tất cả database query đều có `WHERE user_id = $1` — không có cách nào để một user thấy dữ liệu của user khác.

## Cách ly Workspace

Mỗi user có thư mục riêng trong workspace của agent:

```
workspace/
├── user_user-123/
│   ├── projects/
│   └── downloads/
├── user_user-456/
│   ├── projects/
│   └── downloads/
```

Các thao tác file (read_file, write_file, v.v.) được giới hạn trong thư mục workspace của user.

## Chia sẻ Agent

Agent có thể được chia sẻ với user cụ thể qua bảng `agent_shares`:

| Role | Quyền |
|------|-------|
| `admin` | Toàn quyền: sửa agent, quản lý share, xóa |
| `operator` | Dùng agent, sửa context file |
| `viewer` | Chỉ đọc |

Agent mặc định có thể truy cập bởi tất cả mọi người. Các agent khác yêu cầu quyền sở hữu hoặc share rõ ràng.

## Per-User Override

User có thể ghi đè cài đặt agent cho bản thân mà không ảnh hưởng đến người khác:

```json
{
  "user_id": "user-123",
  "agent_id": "code-helper",
  "provider": "anthropic",
  "model": "claude-opus-4-20250514"
}
```

Điều này cho phép user chọn LLM provider ưa thích trong khi chủ agent kiểm soát mặc định.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| User thấy dữ liệu của nhau | Xác minh `X-GoClaw-User-Id` được đặt đúng mỗi request |
| Không có cách ly user | Đảm bảo bạn gửi user ID header; nếu không, tất cả request chia sẻ một session |
| Không truy cập được agent | Kiểm tra bảng `agent_shares`; user cần share rõ ràng cho các agent không phải mặc định |

## Tiếp theo

- [GoClaw hoạt động như thế nào](how-goclaw-works.md) — Tổng quan kiến trúc
- [Sessions and History](sessions-and-history.md) — Quản lý session per-user
- [Agents Explained](agents-explained.md) — Loại agent và kiểm soát truy cập
