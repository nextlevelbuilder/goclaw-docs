> Bản dịch từ [English version](../../recipes/customer-support.md)

# Hỗ trợ Khách hàng

> Agent được định nghĩa sẵn xử lý câu hỏi khách hàng nhất quán cho mọi người dùng, với khả năng leo thang đến chuyên gia.

## Tổng quan

Recipe này thiết lập một agent hỗ trợ khách hàng với tính cách cố định (giống nhau cho mọi người dùng), hồ sơ riêng cho từng người dùng, và đường dẫn leo thang đến chuyên gia. Khác với recipe trợ lý cá nhân, agent này là **predefined** — SOUL.md và IDENTITY.md của nó được dùng chung cho tất cả người dùng, đảm bảo giọng điệu thương hiệu nhất quán.

**Điều kiện tiên quyết:** Một gateway đang hoạt động (`./goclaw onboard`), ít nhất một channel.

## Bước 1: Tạo agent hỗ trợ

Dùng trường `description` để kích hoạt summoning tự động. Gateway sẽ tạo SOUL.md và IDENTITY.md từ mô tả của bạn bằng LLM đã cấu hình.

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "support",
    "display_name": "Support Assistant",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user'\''s language."
    }
  }'
```

Chờ agent chuyển từ `summoning` → `active`:

```bash
curl http://localhost:18790/v1/agents/support \
  -H "Authorization: Bearer YOUR_TOKEN"
# Kiểm tra trường "status" trong phản hồi
```

## Bước 2: Viết SOUL.md thủ công (tùy chọn)

Nếu bạn muốn tự viết tính cách thay vì dùng summoning, cập nhật SOUL.md ở cấp agent trực tiếp:

```bash
curl -X PUT http://localhost:18790/v1/agents/support/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
EOF
```

## Bước 3: Thêm chuyên gia leo thang kỹ thuật

Tạo chuyên gia predefined cho các vấn đề phức tạp:

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "tech-specialist",
    "display_name": "Technical Specialist",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."
    }
  }'
```

Sau đó liên kết `support` → `tech-specialist` để agent hỗ trợ có thể leo thang:

```bash
curl -X POST http://localhost:18790/v1/agents/support/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAgent": "support",
    "targetAgent": "tech-specialist",
    "direction": "outbound",
    "description": "Escalate complex technical issues",
    "maxConcurrent": 3
  }'
```

## Bước 4: Cấu hình hồ sơ từng người dùng

Vì `support` là predefined, mỗi người dùng có `USER.md` riêng được tạo khi chat lần đầu. Bạn có thể điền trước nó qua API để cung cấp context về người dùng cho agent:

```bash
curl -X PUT http://localhost:18790/v1/agents/support/users/alice123/files/USER.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
EOF
```

## Bước 5: Giới hạn tool cho ngữ cảnh hỗ trợ

Agent hỗ trợ hiếm khi cần truy cập file system hay shell. Khóa tool trong `config.json`:

```json
{
  "agents": {
    "list": {
      "support": {
        "tools": {
          "allow": ["web_fetch", "web_search", "memory_search", "memory_save", "delegate"]
        }
      }
    }
  }
}
```

Khởi động lại gateway sau khi thay đổi config.

## Cách ly Context hoạt động như thế nào

```
support (predefined)
├── SOUL.md         ← dùng chung: cùng tính cách cho tất cả người dùng
├── IDENTITY.md     ← dùng chung: cùng "tôi là ai" cho tất cả người dùng
├── AGENTS.md       ← dùng chung: hướng dẫn vận hành
│
├── User: alice123
│   ├── USER.md     ← riêng từng người: hồ sơ Alice, tier, lịch sử
│   └── BOOTSTRAP.md ← onboarding lần đầu (tự xóa sau đó)
│
└── User: bob456
    ├── USER.md     ← riêng từng người: hồ sơ Bob
    └── BOOTSTRAP.md
```

## Sự cố Thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Tính cách agent khác nhau giữa các người dùng | Nếu agent là `open`, mỗi người dùng định hình tính cách riêng. Chuyển sang `predefined` để dùng chung SOUL.md. |
| USER.md không được tạo | Chat đầu tiên kích hoạt việc tạo. Nếu điền trước, đảm bảo đường dẫn bao gồm user ID đúng. |
| Summoning thất bại, không có SOUL.md | Kiểm tra log gateway để tìm lỗi LLM trong quá trình summoning. Viết SOUL.md thủ công như hướng dẫn ở Bước 2. |
| Agent hỗ trợ leo thang quá tích cực | Chỉnh sửa SOUL.md để thêm tiêu chí: "Only delegate to tech-specialist when the user reports an API error code or integration failure." |

## Tiếp theo

- [Open vs. Predefined](../agents/open-vs-predefined.md) — tìm hiểu sâu về cách ly context
- [Summoning & Bootstrap](../agents/summoning-bootstrap.md) — cách tính cách được tạo tự động
- [Team Chatbot](./team-chatbot.md) — phối hợp nhiều chuyên gia qua một team
- [Context Files](../agents/context-files.md) — tài liệu tham khảo đầy đủ về SOUL.md, USER.md, và các file khác
