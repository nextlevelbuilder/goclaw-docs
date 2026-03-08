> Bản dịch từ [English version](../../agents/sharing-and-access.md)

# Chia sẻ và Kiểm soát Truy cập

> Kiểm soát ai có thể dùng agent của bạn với phân quyền chi tiết theo vai trò: admin (toàn quyền), operator (đọc+ghi), viewer (chỉ đọc).

## Tổng quan

Hệ thống phân quyền của GoClaw đảm bảo agent luôn ở đúng tay. Khái niệm cốt lõi rất đơn giản:

- **Owner** sở hữu agent (toàn quyền kiểm soát, có thể xoá, chia sẻ)
- **Default agent** có thể được đọc bởi tất cả user (tốt cho các tiện ích dùng chung)
- **Share** cấp quyền truy cập cho người khác với một vai trò cụ thể

Quyền truy cập được kiểm tra qua pipeline 4 bước: Agent có tồn tại không? → Có phải default không? → Bạn có phải owner không? → Agent có được chia sẻ với bạn không?

## Bảng agent_shares

Khi bạn chia sẻ agent, một bản ghi được tạo trong bảng `agent_shares`:

```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,           -- "admin", "operator", hoặc "viewer"
  granted_by VARCHAR NOT NULL,     -- ai cấp quyền này
  created_at TIMESTAMP NOT NULL
);
```

Mỗi hàng đại diện cho quyền truy cập của một user vào một agent.

## Giải thích các vai trò

| Vai trò | Quyền | Use Case |
|------|-------------|----------|
| **admin** | Toàn quyền: đọc, ghi, xoá, chia sẻ lại, quản lý team | Cộng tác viên đáng tin cậy giúp quản lý agent |
| **operator** | Đọc + ghi: chạy agent, chỉnh sửa context file, nhưng KHÔNG thể xoá/chia sẻ lại | Thành viên team dùng agent và tinh chỉnh cài đặt |
| **viewer** | Chỉ đọc: chạy agent, xem file, nhưng KHÔNG thể chỉnh sửa | Stakeholder chỉ theo dõi kết quả |

### Ví dụ thực tế

- **Owner** xây dựng research agent. Cấp quyền **admin** cho assistant giúp tinh chỉnh prompt.
- **Owner** xây dựng customer service bot. Cấp quyền **operator** cho team support (có thể chỉnh giọng điệu), **viewer** cho manager (chỉ xem kết quả).
- **Owner** tạo utility agent công khai và đánh dấu nó là **default**, để tất cả user có thể dùng mà không cần chia sẻ tường minh.

## Pipeline CanAccess 4 bước

Khi bạn cố truy cập agent, GoClaw kiểm tra theo thứ tự:

```
1. Agent có tồn tại không?
   → Không: từ chối truy cập

2. Nó có được đánh dấu is_default = true không?
   → Có (và tồn tại): cho phép (bạn nhận vai trò "user")
   → Không: chuyển sang bước 3

3. Bạn có phải owner (owner_id = your_id) không?
   → Có: cho phép (bạn nhận vai trò "owner")
   → Không: chuyển sang bước 4

4. Có hàng agent_shares nào cho (agent_id, your_id) không?
   → Có: cho phép (bạn nhận vai trò từ hàng đó)
   → Không: từ chối truy cập
```

**Kết quả**: Mỗi lần kiểm tra trả về `(allowed: bool, role: string)`.

## Chia sẻ Agent qua API

Dùng method `ShareAgent()` (Go backend) hoặc RPC tương đương:

```go
// Ví dụ Go
err := agentStore.ShareAgent(ctx, agentID, "user@example.com", "operator", "owner@example.com")
if err != nil {
  log.Fatal(err)
}
```

### WebSocket API

Bạn có thể chia sẻ agent qua WebSocket RPC (tên method cụ thể phụ thuộc vào implementation gateway của bạn):

```json
{
  "method": "agents.share",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "role": "operator",
    "grantedBy": "bob@example.com"
  }
}
```

**Response** (thành công):
```json
{
  "ok": true,
  "share": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "role": "operator",
    "grantedBy": "bob@example.com",
    "createdAt": "2026-03-07T15:30:00Z"
  }
}
```

## Thu hồi quyền truy cập

Xoá share để từ chối truy cập ngay lập tức:

```go
err := agentStore.RevokeShare(ctx, agentID, "alice@example.com")
```

WebSocket:
```json
{
  "method": "agents.unshare",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com"
  }
}
```

## Liệt kê Share

Xem ai có quyền truy cập agent của bạn:

```go
shares, err := agentStore.ListShares(ctx, agentID)
// shares: []AgentShareData với id, agent_id, user_id, role, granted_by, created_at
```

**Ví dụ kết quả**:
```
Share 1: user_id="alice@example.com", role="operator"
Share 2: user_id="bob@example.com", role="viewer"
```

## Quản lý Share trên Dashboard

Dashboard cung cấp giao diện để chia sẻ:

1. Mở **Agents** → chọn agent của bạn
2. Click tab **Sharing** hoặc **Team**
3. Nhập user ID (email, Telegram handle, v.v.)
4. Chọn vai trò: Admin, Operator, Viewer
5. Click **Share**
6. Để thu hồi: tìm user trong danh sách, click **Remove**

Thay đổi có hiệu lực ngay lập tức.

## Use Cases

### Tình huống 1: Build → Tinh chỉnh → Deploy

1. **Owner** tạo agent `customer-summary` (mặc định: không chia sẻ)
2. **Owner** cấp quyền **admin** cho `alice` (analyst tinh chỉnh prompt)
3. **Alice** chỉnh sửa SOUL.md, kiểm tra với query thực tế
4. **Owner** đánh dấu agent là **default** → tất cả user giờ có thể dùng
5. **Owner** thu hồi quyền của **alice** (không còn cần nữa)

### Tình huống 2: Cộng tác Team

1. **Owner** tạo `research-agent`
2. Cấp quyền **operator** cho thành viên team → họ có thể chạy và tinh chỉnh
3. Cấp quyền **viewer** cho manager → xem kết quả, không thể chỉnh sửa
4. Team lặp lại; owner kiểm soát thay đổi lớn

### Tình huống 3: Utility Dùng chung

1. **Owner** tạo agent `web-search`
2. Đánh dấu nó là **default** (không cần chia sẻ tường minh)
3. Tất cả user có thể dùng; owner vẫn có thể chỉnh sửa
4. Nếu **owner** thu hồi cờ default, chỉ owner mới có thể dùng lại

## ListAccessible — Tìm Agent của bạn

Khi user đăng nhập, GoClaw chỉ trả về các agent họ có thể truy cập:

```go
agents, err := agentStore.ListAccessible(ctx, userID)
// Trả về:
// - Tất cả agent owned bởi userID
// - Tất cả default agent
// - Tất cả agent được chia sẻ tường minh với userID
```

Điều này cung cấp dữ liệu cho danh sách "My Agents" trên Dashboard.

## Best Practices

| Thực hành | Lý do |
|----------|-----|
| **Mặc định cấp vai trò viewer** | An toàn: quyền chỉ đọc ngăn chỉnh sửa vô tình |
| **Yêu cầu admin phê duyệt thay đổi lớn** | Đảm bảo nhất quán; owner xem xét trước khi deploy |
| **Thu hồi share khi không còn cần** | Giảm lộn xộn; tăng cường bảo mật |
| **Dùng default một cách có chọn lọc** | Tốt cho utility (web search, memory); không tốt cho agent nhạy cảm |
| **Ghi lại ai có vai trò gì** | Đặc biệt quan trọng với agent đa team; tránh nhầm lẫn |

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| User không thấy agent | Kiểm tra: (1) agent tồn tại, (2) bạn là owner, (3) user có share, hoặc (4) agent là default |
| Không thể thay đổi cài đặt agent | Bạn cần ít nhất vai trò **operator**; viewer là chỉ đọc |
| Đã thu hồi nhưng user vẫn có quyền | Có thể agent là **default**; bỏ đánh dấu trước, rồi thu hồi |
| Quên ai có quyền truy cập | Dùng `ListShares()` hoặc Dashboard → tab Sharing để kiểm tra |
| Muốn chia sẻ nhưng không chắc về vai trò | Dùng **viewer** trước; nâng cấp lên **operator** nếu họ cần chỉnh sửa |

## Tiếp theo

- [User Overrides — Cho phép user tuỳ chỉnh LLM provider/model theo từng agent](user-overrides.md)
- [System Prompt Anatomy — Cách quyền hạn ảnh hưởng đến phần system prompt](system-prompt-anatomy.md)
- [Creating Agents — Tạo agent và chia sẻ ngay lập tức](creating-agents.md)
