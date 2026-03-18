> Bản dịch từ [English version](#multi-tenancy)

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
| Quyền truy cập agent | `agent_shares` | Role per-user (user/viewer) |
| MCP grant | `mcp_user_grants` | Quyền truy cập MCP server per-user |
| Skill grant | `skill_user_grants` | Quyền truy cập skill per-user |

Tất cả database query đều có `WHERE user_id = $1` — không có cách nào để một user thấy dữ liệu của user khác.

## Cách ly Workspace

Mỗi user có thư mục riêng trong workspace của agent:

```
workspace/
├── user-123/          ← tự tạo khi nhận tin nhắn đầu tiên
│   └── (file được agent tạo trong quá trình hội thoại)
├── user-456/
│   └── ...
```

Thư mục của user được tạo tự động khi nhận tin nhắn đầu tiên (`MkdirAll`). Ban đầu trống — agent tạo file và folder khi cần trong quá trình hội thoại. Các thao tác file (read_file, write_file, v.v.) được giới hạn trong thư mục workspace của user.

> **Làm sạch đường dẫn:** Các ký tự đặc biệt (/, \, :, khoảng trắng, null byte, v.v.) trong user ID được thay bằng dấu gạch dưới khi tạo đường dẫn filesystem, ngăn chặn directory traversal và path injection.

## Chia sẻ Agent

Agent có thể được chia sẻ với user cụ thể qua bảng `agent_shares`:

| Role | Quyền |
|------|-------|
| `user` | Có thể dùng agent, đọc/ghi context file per-user |
| `viewer` | Chỉ đọc, không chỉnh sửa (lưu trong DB; mức độ enforcement có thể khác nhau) |

Agent mặc định có thể truy cập bởi tất cả mọi người với role `user` — người dùng không phải chủ sở hữu tự động nhận quyền `user`. Các agent khác yêu cầu quyền sở hữu hoặc có entry rõ ràng trong bảng `agent_shares`.

> **Lưu ý:** Role `user` và `viewer` trong `agent_shares` kiểm soát quyền chia sẻ agent. Lớp kiểm soát truy cập API (`permissions/policy.go`) kiểm soát các role riêng biệt `admin`/`operator`/`viewer` cho truy cập gateway API — đây là các role khác với role chia sẻ agent ở trên.

## Kiểm soát ngân sách (Budget Enforcement)

GoClaw theo dõi chi phí per-agent cho mục đích phân tích. Mỗi agent có thể có trường `budget_monthly_cents` để đặt hạn mức chi tiêu hàng tháng (đơn vị cent). Ngân sách là **per-agent** — theo dõi tổng chi tiêu của tất cả người dùng của agent đó, không phải từng user riêng lẻ. Truy vấn `GetMonthlyAgentCost(agentID, year, month)` trả về tổng chi tiêu của agent trong kỳ. Khi chi phí tích lũy của agent vượt ngân sách hàng tháng, các request tiếp theo sẽ bị từ chối cho đến khi ngân sách được đặt lại.

## Hạn mức yêu cầu (Request Quotas)

GoClaw hỗ trợ hạn mức yêu cầu per-user với các cửa sổ thời gian có thể cấu hình:

| Cửa sổ | Mô tả |
|--------|-------|
| `hour` | Số yêu cầu tối đa mỗi giờ |
| `day` | Số yêu cầu tối đa mỗi ngày |
| `week` | Số yêu cầu tối đa mỗi tuần |

Hạn mức được đặt per-user và có thể được ghi đè ở cấp group hoặc channel thông qua interface `QuotaChecker`. Khi người dùng vượt hạn mức, yêu cầu bị từ chối trước khi đến agent.

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

- [GoClaw hoạt động như thế nào](#how-goclaw-works) — Tổng quan kiến trúc
- [Sessions and History](#sessions-and-history) — Quản lý session per-user
- [Agents Explained](#agents-explained) — Loại agent và kiểm soát truy cập

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
