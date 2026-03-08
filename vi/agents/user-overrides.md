> Bản dịch từ [English version](../../agents/user-overrides.md)

# User Overrides

> Cho phép từng user thay đổi LLM provider hoặc model cho một agent mà không ảnh hưởng đến người khác. Hoàn hảo cho "Tôi thích GPT-4o" hoặc "Dùng API key của tôi."

## Tổng quan

Mặc định, tất cả user chạy agent với cùng provider và model. Nhưng nếu Alice thích Claude trong khi Bob muốn GPT-4 thì sao? Đó là lúc user override phát huy tác dụng.

**User override** là cài đặt theo từng user, theo từng agent, nói rằng: "Khi *user này* chạy *agent này*, dùng *provider/model này* thay vì mặc định của agent."

## Bảng user_agent_overrides

Khi user đặt override, nó được lưu ở đây:

```sql
CREATE TABLE user_agent_overrides (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,          -- ví dụ: "anthropic", "openai"
  model VARCHAR NOT NULL,             -- ví dụ: "claude-3-5-sonnet", "gpt-4o"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- **agent_id + user_id** là duy nhất: một override mỗi user mỗi agent
- **provider**: LLM provider (phải được cấu hình trong gateway)
- **model**: Tên model trong provider đó

## Chuỗi ưu tiên

Khi user chạy agent, GoClaw chọn LLM theo thứ tự:

```
1. User override có tồn tại không?
   → Có: dùng provider + model từ user_agent_overrides
   → Không: chuyển sang bước 2

2. Cấu hình agent có provider + model không?
   → Có: dùng mặc định của agent
   → Không: chuyển sang bước 3

3. Provider + model mặc định toàn cục?
   → Có: dùng mặc định toàn cục
   → Không: lỗi (không có LLM nào được cấu hình)
```

**Ví dụ**:
- Agent "research-bot" mặc định dùng Claude 3.5 Sonnet
- Alice đặt override: GPT-4o
- Khi Alice chạy research-bot: GPT-4o được dùng (override của cô ấy thắng)
- Khi Bob chạy research-bot: Claude 3.5 Sonnet (không có override, dùng mặc định agent)

## Đặt Override

### Qua API

```go
// Ví dụ Go
override := &store.UserAgentOverrideData{
  AgentID:  agentID,
  UserID:   "alice@example.com",
  Provider: "openai",
  Model:    "gpt-4o",
}
err := agentStore.SetUserOverride(ctx, override)
```

### Qua WebSocket RPC

Tên method cụ thể phụ thuộc vào gateway của bạn. Ví dụ:

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

**Response**:
```json
{
  "ok": true,
  "override": {
    "agentId": "research-bot",
    "userId": "alice@example.com",
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

## Lấy Override

Kiểm tra xem user có override được cấu hình không:

```go
override, err := agentStore.GetUserOverride(ctx, agentID, userID)
if override != nil {
  // User có override: provider, model
} else {
  // Không có override; mặc định agent được áp dụng
}
```

## Cài đặt User trên Dashboard

Dashboard thường có trang **User Settings** hoặc **Agent Preferences**:

1. Đăng nhập với tư cách user
2. Vào **Settings** → **Agent Preferences**
3. Với mỗi agent bạn dùng:
   - Bật "Override provider/model"
   - Chọn provider (nếu có nhiều provider được cấu hình)
   - Chọn model
4. Click **Save**

Thay đổi có hiệu lực ở lần chạy tiếp theo.

## Use Cases

### Trường hợp 1: Kiểm soát chi phí
- Agent mặc định dùng GPT-4 đắt tiền để có chất lượng tốt nhất
- User có ngân sách hạn chế có thể override sang Claude 3 Haiku rẻ hơn
- Owner vẫn kiểm soát mặc định cho agent mới

### Trường hợp 2: Sở thích cá nhân
- Research team thích Claude để phân tích
- Marketing team thích GPT-4 để viết content
- Một agent, hai team, hai cấu hình

### Trường hợp 3: API Key tuỳ chỉnh
- Tổ chức dùng API key chung trong cấu hình agent
- Alice có API key OpenAI riêng, muốn dùng nó
- Override cho phép cô ấy dùng key của mình mà không ảnh hưởng người khác

### Trường hợp 4: Kiểm thử tính năng
- Team muốn thử model Claude mới (claude-3-7-opus) trên một agent
- Chưa muốn thay đổi mặc định của agent
- User opt-in đặt override; những người khác vẫn ở phiên bản ổn định

## Xoá Override

Để quay về mặc định của agent, xoá override:

```go
// Không có method xoá trực tiếp trong source, nhưng thường là:
err := agentStore.DeleteUserOverride(ctx, agentID, userID)
```

Hoặc trên Dashboard: tắt "Override provider/model" và lưu.

## Provider & Model được hỗ trợ

Kiểm tra cấu hình gateway của bạn để xem provider/model nào có sẵn. Các provider phổ biến:

| Provider | Models |
|----------|--------|
| **anthropic** | claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus |
| **openai** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **openai-compat** | tuỳ thuộc provider tuỳ chỉnh của bạn (ví dụ: Ollama cục bộ) |

Hỏi admin nếu bạn không chắc provider nào đã được bật.

## Best Practices

| Thực hành | Lý do |
|----------|-----|
| **Đặt mặc định agent hợp lý** | Hầu hết user sẽ không override; mặc định quan trọng |
| **Cho phép power user override** | Họ biết nhu cầu của mình; hãy trao cho họ quyền kiểm soát |
| **Ghi lại model nào phù hợp với task nào** | Claude > phân tích, GPT-4 > sáng tạo, Haiku > rẻ |
| **Không bắt buộc override** | Nên là tuỳ chọn, không phải bắt buộc |
| **Kiểm tra override trong môi trường non-prod** | Xác minh model mới hoạt động trước khi đưa vào thực tế |

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Override không có hiệu lực | Chờ session mới bắt đầu; cấu hình agent được cache có thể chưa cập nhật |
| Model không có trong danh sách | Admin chưa cấu hình nó; hỏi admin để bật |
| User muốn override nhưng không tìm thấy cài đặt | Kiểm tra Dashboard → Settings → Agent Preferences; có thể ở tên khác |
| Override tốn nhiều hơn dự kiến | Kiểm tra model; một số model đắt hơn những cái khác |
| Không thể xoá override | Xoá qua API hoặc Dashboard; "không có override" nghĩa là dùng mặc định agent |

## Tiếp theo

- [System Prompt Anatomy — Cách lựa chọn model ảnh hưởng đến kích thước system prompt](system-prompt-anatomy.md)
- [Sharing and Access — Kiểm soát ai có thể đặt override (qua phân quyền theo vai trò)](sharing-and-access.md)
- [Creating Agents — Đặt provider/model mặc định khi tạo agent](creating-agents.md)
