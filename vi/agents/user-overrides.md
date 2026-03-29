> Bản dịch từ [English version](/user-overrides)

# User Overrides

> **Tính năng được triển khai một phần.** Schema database và store API đã tồn tại, nhưng override chưa được áp dụng tại runtime. Trang này ghi lại hành vi dự kiến và store API hiện tại.

---

> **Cảnh báo:** User override **chưa được áp dụng trong quá trình thực thi agent**. Store method `GetUserOverride()` đã tồn tại nhưng không được gọi trong đường thực thi agent. Việc đặt override hiện không có hiệu lực đến LLM nào được dùng cho đến khi tính năng này được tích hợp đầy đủ.

---

## Tổng quan

Mục đích của user override là cho phép từng user thay đổi LLM provider hoặc model cho một agent mà không ảnh hưởng đến người khác. Ví dụ: Alice thích GPT-4o trong khi Bob vẫn dùng Claude.

**User override** sẽ là cài đặt theo từng user, theo từng agent, nói rằng: "Khi *user này* chạy *agent này*, dùng *provider/model này* thay vì mặc định của agent."

**Trạng thái hiện tại:** Schema và store method đã được triển khai. Tích hợp runtime đang chờ thực hiện.

## Bảng user_agent_overrides

Schema đã tồn tại và lưu trữ override:

```sql
CREATE TABLE user_agent_overrides (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,          -- ví dụ: "anthropic", "openai"
  model VARCHAR NOT NULL,             -- ví dụ: "claude-sonnet-4-6", "gpt-4o"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- **agent_id + user_id** là duy nhất: một override mỗi user mỗi agent
- **provider**: LLM provider (phải được cấu hình trong gateway)
- **model**: Tên model trong provider đó

## Chuỗi ưu tiên dự kiến

> **Lưu ý:** Chuỗi ưu tiên này là hành vi dự kiến. Hiện chưa được triển khai — runtime luôn dùng provider/model được cấu hình trong agent.

```
1. User override có tồn tại không?
   → Có: dùng provider + model từ user_agent_overrides  [DỰ KIẾN — chưa triển khai]
   → Không: chuyển sang bước 2

2. Cấu hình agent có provider + model không?
   → Có: dùng mặc định của agent  [ĐANG HOẠT ĐỘNG]
   → Không: chuyển sang bước 3

3. Provider + model mặc định toàn cục?
   → Có: dùng mặc định toàn cục  [ĐANG HOẠT ĐỘNG]
   → Không: lỗi (không có LLM nào được cấu hình)
```

## Store API (Có sẵn ngay bây giờ)

Các store method đã được triển khai và có thể dùng trực tiếp:

### Đặt Override

```go
override := &store.UserAgentOverrideData{
  AgentID:  agentID,
  UserID:   "alice@example.com",
  Provider: "openai",
  Model:    "gpt-4o",
}
err := agentStore.SetUserOverride(ctx, override)
```

### Lấy Override

```go
override, err := agentStore.GetUserOverride(ctx, agentID, userID)
if override != nil {
  // override.Provider, override.Model có sẵn
} else {
  // không có override được lưu
}
```

### Xoá Override

> **Lưu ý:** `DeleteUserOverride()` được định nghĩa trong store interface nhưng chưa được triển khai trong PostgreSQL store. Gọi nó sẽ trả về lỗi hoặc không làm gì tuỳ theo bản build.

```go
// Dự kiến — chưa được triển khai trong pg store:
err := agentStore.DeleteUserOverride(ctx, agentID, userID)
```

## WebSocket RPC — Dự kiến

> **Lưu ý:** Chưa có WebSocket RPC method nào cho user override. Dưới đây là interface dự kiến:

```json
{
  "method": "agents.override.set",
  "params": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

Method này hiện chưa tồn tại trong gateway.

## Dashboard User Settings — Dự kiến

Giao diện **Agent Preferences** trên Dashboard để quản lý override đang được lên kế hoạch nhưng chưa có sẵn.

## Use Cases (Dự kiến)

Các use case này mô tả hành vi dự kiến khi tích hợp runtime hoàn tất.

### Trường hợp 1: Kiểm soát chi phí
- Agent mặc định dùng GPT-4 đắt tiền để có chất lượng tốt nhất
- User có ngân sách hạn chế có thể override sang Claude 3 Haiku rẻ hơn

### Trường hợp 2: Sở thích cá nhân
- Research team thích Claude để phân tích
- Marketing team thích GPT-4 để viết content
- Một agent, hai team, hai cấu hình

### Trường hợp 3: Kiểm thử tính năng
- Team muốn thử model mới trên một agent
- User opt-in đặt override; những người khác vẫn ở phiên bản ổn định

## Provider & Model được hỗ trợ

Kiểm tra cấu hình gateway của bạn để xem provider/model nào có sẵn. Các provider phổ biến:

| Provider | Models |
|----------|--------|
| **anthropic** | claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6 |
| **openai** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **openai-compat** | tuỳ thuộc provider tuỳ chỉnh của bạn (ví dụ: Ollama cục bộ) |

Hỏi admin nếu bạn không chắc provider nào đã được bật.

## Tiếp theo

- [System Prompt Anatomy — Cách lựa chọn model ảnh hưởng đến kích thước system prompt](/system-prompt-anatomy)
- [Sharing and Access — Kiểm soát ai có thể truy cập agent](/sharing-and-access)
- [Creating Agents — Đặt provider/model mặc định khi tạo agent](/creating-agents)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
