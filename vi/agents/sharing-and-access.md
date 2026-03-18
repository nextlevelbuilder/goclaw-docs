> Bản dịch từ [English version](#sharing-and-access)

# Chia sẻ và Kiểm soát Truy cập

> Kiểm soát ai có thể dùng agent của bạn. Quyền truy cập được thực thi dựa trên phân biệt owner vs. non-owner; nhãn vai trò được lưu để thực thi trong tương lai.

## Tổng quan

Hệ thống phân quyền của GoClaw đảm bảo agent luôn ở đúng tay. Khái niệm cốt lõi:

- **Owner** sở hữu agent (toàn quyền kiểm soát, có thể xoá, chia sẻ)
- **Default agent** có thể được truy cập bởi tất cả user (tốt cho các tiện ích dùng chung)
- **Share** cấp quyền truy cập cho người khác với một nhãn vai trò được lưu

Quyền truy cập được kiểm tra qua pipeline 4 bước: Agent có tồn tại không? → Có phải default không? → Bạn có phải owner không? → Agent có được chia sẻ với bạn không?

## Bảng agent_shares

Khi bạn chia sẻ agent, một bản ghi được tạo trong bảng `agent_shares`:

```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,           -- nhãn được lưu: "admin", "operator", "viewer", "user", v.v.
  granted_by VARCHAR NOT NULL,     -- ai cấp quyền này
  created_at TIMESTAMP NOT NULL
);
```

Mỗi hàng đại diện cho quyền truy cập của một user vào một agent.

## Vai trò — Được lưu nhưng chưa được thực thi

> **Quan trọng:** Nhãn vai trò được lưu trong `agent_shares` nhưng **chưa được thực thi** tại runtime. Phân biệt duy nhất được thực thi hiện nay là **owner vs. non-owner**. Kiểm tra quyền dựa trên vai trò được lên kế hoạch cho bản phát hành tương lai.

| Vai trò | Quyền dự kiến | Trạng thái |
|---------|---------------|------------|
| **admin** | Toàn quyền: đọc, ghi, xoá, chia sẻ lại, quản lý team | Dự kiến |
| **operator** | Đọc + ghi: chạy agent, chỉnh sửa context file, nhưng KHÔNG xoá/chia sẻ lại | Dự kiến |
| **viewer** | Chỉ đọc: chạy agent, xem file, nhưng KHÔNG chỉnh sửa | Dự kiến |
| **user** | Truy cập cơ bản (mặc định khi không chỉ định vai trò) | Chỉ lưu |

**Những gì ĐANG được thực thi hiện nay:**
- Owner có thể chia sẻ, thu hồi và liệt kê share; non-owner không thể
- Bất kỳ user nào có hàng share đều có thể truy cập agent (bất kể giá trị vai trò)
- Default agent (`is_default = true`) có thể truy cập bởi tất cả mọi người

**Những gì CHƯA được thực thi hiện nay:**
- Hạn chế ghi/xoá dựa trên vai trò cho shared user
- Ngăn người giữ vai trò "viewer" chỉnh sửa
- Vai trò "admin" không cấp khả năng chia sẻ lại

### Vai trò mặc định

Khi chia sẻ mà không chỉ định vai trò, mặc định là `"user"`:

```
POST /v1/agents/:id/shares
{ "user_id": "alice@example.com" }
→ vai trò được lưu là "user"
```

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
   → Có: cho phép (bạn nhận vai trò được lưu trong hàng đó)
   → Không: từ chối truy cập
```

**Kết quả**: Mỗi lần kiểm tra trả về `(allowed: bool, role: string)`. Chuỗi vai trò được trả về nhưng các handler hiện tại không hạn chế hành vi dựa trên nó.

## Predefined Agent qua Channel Instances

Predefined agent cũng có thể truy cập được qua `channel_instances`. Nếu một predefined agent có channel instance đang bật với danh sách `allow_from` chứa user ID của bạn, bạn có thể truy cập agent đó ngay cả khi không có share trực tiếp hay cờ default.

## Chia sẻ Agent qua HTTP API

Dùng `POST /v1/agents/:id/shares` để chia sẻ agent. Chỉ owner (hoặc gateway owner-level user) mới có thể chia sẻ.

**Request:**
```http
POST /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": "alice@example.com",
  "role": "operator"
}
```

**Response (201 Created):**
```json
{ "ok": "true" }
```

Nếu `role` bị bỏ qua, mặc định là `"user"`.

## Thu hồi quyền truy cập

Dùng `DELETE /v1/agents/:id/shares/:userID` để xoá share ngay lập tức.

**Request:**
```http
DELETE /v1/agents/550e8400-e29b-41d4-a716-446655440000/shares/alice@example.com
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{ "ok": "true" }
```

## Liệt kê Share

Dùng `GET /v1/agents/:id/shares` để xem ai có quyền truy cập. Chỉ owner mới có thể liệt kê share.

**Response:**
```json
{
  "shares": [
    { "id": "...", "agent_id": "...", "user_id": "alice@example.com", "role": "operator", "granted_by": "owner@example.com", "created_at": "..." },
    { "id": "...", "agent_id": "...", "user_id": "bob@example.com", "role": "viewer", "granted_by": "owner@example.com", "created_at": "..." }
  ]
}
```

**Go store method:**
```go
shares, err := agentStore.ListShares(ctx, agentID)
```

## Quản lý Share trên Dashboard

Dashboard cung cấp giao diện để chia sẻ:

1. Mở **Agents** → chọn agent của bạn
2. Click tab **Sharing** hoặc **Team**
3. Nhập user ID (email, Telegram handle, v.v.)
4. Chọn nhãn vai trò (lưu ý: chưa được thực thi tại runtime)
5. Click **Share**
6. Để thu hồi: tìm user trong danh sách, click **Remove**

Thay đổi có hiệu lực ngay lập tức.

## Use Cases

### Tình huống 1: Build → Tinh chỉnh → Deploy

1. **Owner** tạo agent `customer-summary` (mặc định: không chia sẻ)
2. **Owner** chia sẻ với `alice` — cô ấy có quyền truy cập (vai trò lưu là "operator")
3. **Alice** truy cập agent và tinh chỉnh cài đặt
4. **Owner** đánh dấu agent là **default** → tất cả user giờ có thể dùng
5. **Owner** thu hồi quyền của alice (không còn cần nữa)

### Tình huống 2: Cộng tác Team

1. **Owner** tạo `research-agent`
2. Chia sẻ với thành viên team — họ đều có thể truy cập và chạy agent
3. Chia sẻ với manager với vai trò "viewer" — manager có thể truy cập (thực thi vai trò được lên kế hoạch)
4. Team lặp lại; owner kiểm soát chia sẻ và xoá

### Tình huống 3: Utility Dùng chung

1. **Owner** tạo agent `web-search`
2. Đánh dấu nó là **default** (không cần chia sẻ tường minh)
3. Tất cả user có thể dùng; owner vẫn có thể chỉnh sửa
4. Nếu **owner** bỏ đánh dấu default, chỉ owner mới có thể dùng lại

## ListAccessible — Tìm Agent của bạn

Khi user tải danh sách agent, GoClaw chỉ trả về các agent họ có thể truy cập:

```go
agents, err := agentStore.ListAccessible(ctx, userID)
// Trả về:
// - Tất cả agent owned bởi userID
// - Tất cả default agent
// - Tất cả agent được chia sẻ tường minh với userID
// - Predefined agent có thể truy cập qua channel_instances
```

Điều này cung cấp dữ liệu cho danh sách "My Agents" trên Dashboard.

## Best Practices

| Thực hành | Lý do |
|----------|-----|
| **Chia sẻ bằng user ID tường minh** | Audit trail rõ ràng về ai có quyền truy cập |
| **Thu hồi share khi không còn cần** | Giảm lộn xộn; tăng cường bảo mật |
| **Dùng default một cách có chọn lọc** | Tốt cho utility (web search, memory); không tốt cho agent nhạy cảm |
| **Theo dõi share qua ListShares** | Đặc biệt quan trọng với agent đa team; tránh nhầm lẫn |

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| User không thấy agent | Kiểm tra: (1) agent tồn tại, (2) user có hàng share, hoặc (3) agent là default |
| Đã thu hồi nhưng user vẫn có quyền | Có thể agent là **default**; bỏ đánh dấu trước, rồi thu hồi |
| Quên ai có quyền truy cập | Dùng `GET /v1/agents/:id/shares` hoặc Dashboard → tab Sharing để kiểm tra |
| Hạn chế vai trò không hoạt động | Thực thi dựa trên vai trò đang được lên kế hoạch, chưa được triển khai — tất cả shared user có quyền truy cập ngang nhau hiện nay |

## Tiếp theo

- [User Overrides — Cho phép user tuỳ chỉnh LLM provider/model theo từng agent](#user-overrides)
- [System Prompt Anatomy — Cách quyền hạn ảnh hưởng đến phần system prompt](#system-prompt-anatomy)
- [Creating Agents — Tạo agent và chia sẻ ngay lập tức](#creating-agents)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
