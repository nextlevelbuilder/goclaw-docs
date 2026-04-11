> Bản dịch từ [English version](/recipe-customer-support)

# Customer Support

> Agent predefined xử lý yêu cầu khách hàng nhất quán cho mọi người dùng, với khả năng escalation cho chuyên gia.

## Tổng quan

Recipe này thiết lập agent hỗ trợ khách hàng với tính cách cố định (giống nhau cho mọi người dùng), hồ sơ riêng mỗi người, và đường dẫn escalation cho chuyên gia. Khác với recipe personal assistant, agent này là **predefined** — SOUL.md và IDENTITY.md được chia sẻ cho tất cả người dùng, đảm bảo giọng điệu thương hiệu nhất quán.

**Bạn cần:**
- Một gateway đang hoạt động (`./goclaw onboard`)
- Truy cập web dashboard tại `http://localhost:18790`
- Ít nhất một LLM provider đã cấu hình

## Bước 1: Tạo agent hỗ trợ

Mở web dashboard và vào **Agents → Create Agent**:

- **Key:** `support`
- **Display name:** Support Assistant
- **Type:** Predefined
- **Provider / Model:** Chọn provider và model bạn muốn
- **Description:** "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user's language."

Click **Save**. Trường `description` kích hoạt **summoning** — gateway dùng LLM để tự động tạo SOUL.md và IDENTITY.md từ mô tả của bạn.

Đợi trạng thái agent chuyển từ `summoning` → `active`. Bạn có thể theo dõi trên trang Agents list.

<details>
<summary><strong>Qua API</strong></summary>

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

Kiểm tra trạng thái:

```bash
curl http://localhost:18790/v1/agents/support \
  -H "Authorization: Bearer YOUR_TOKEN"
```

</details>

## Bước 2: Viết SOUL.md thủ công (tùy chọn)

Nếu bạn muốn tự viết tính cách thay vì dùng summoning, vào **Dashboard → Agents → support → Files tab → SOUL.md** và chỉnh sửa trực tiếp:

```markdown
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
```

Click **Save** khi hoàn tất.

<details>
<summary><strong>Qua API</strong></summary>

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

</details>

## Bước 3: Thêm chuyên gia escalation kỹ thuật

Tạo agent predefined thứ hai cho các vấn đề phức tạp. Vào **Agents → Create Agent**:

- **Key:** `tech-specialist`
- **Display name:** Technical Specialist
- **Type:** Predefined
- **Description:** "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."

Click **Save** và đợi summoning hoàn tất.

Sau đó thiết lập link escalation: vào **Agents → support → Links tab → Add Link**:
- **Target agent:** `tech-specialist`
- **Direction:** Outbound
- **Description:** Escalate complex technical issues
- **Max concurrent:** 3

Click **Save**. Agent support giờ có thể delegate các vấn đề phức tạp cho chuyên gia.

<details>
<summary><strong>Qua API</strong></summary>

```bash
# Tạo chuyên gia
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

# Tạo delegation link
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

</details>

## Bước 4: Cấu hình hồ sơ theo người dùng

Vì `support` là predefined, mỗi người dùng có `USER.md` riêng được tạo tự động khi chat lần đầu. Bạn có thể điền trước hồ sơ để agent có context về người dùng.

Vào **Agents → support → Instances tab → chọn người dùng → Files → USER.md** và chỉnh sửa:

```markdown
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
```

<details>
<summary><strong>Qua API</strong></summary>

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

</details>

## Bước 5: Giới hạn tools cho context hỗ trợ

Agent hỗ trợ hiếm khi cần truy cập file system hoặc shell. Vào **Agents → support → Config tab** và cấu hình quyền tool:

- **Tools cho phép:** `web_fetch`, `web_search`, `memory_search`, `memory_save`, `delegate`
- Từ chối mọi thứ khác

Điều này giới hạn bề mặt tấn công trong khi giữ agent hoạt động hiệu quả cho các task hỗ trợ.

<details>
<summary><strong>Qua config.json</strong></summary>

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

</details>

## Bước 6: Kết nối channel

Vào **Channels → Create Instance** trong dashboard:
- **Channel type:** Telegram (hoặc Discord, Slack, Zalo OA, v.v.)
- **Agent:** Chọn `support`
- **Credentials:** Dán bot token của bạn
- **Config:** Đặt `dm_policy` thành `open` để mọi khách hàng có thể nhắn tin cho bot

Click **Save**. Channel hoạt động ngay lập tức.

> **Mẹo:** Cho bot hướng khách hàng, đặt `dm_policy: "open"` để người dùng không cần pair qua browser trước.

## File đính kèm

Khi agent hỗ trợ dùng `write_file` để tạo tài liệu (ví dụ: báo cáo khắc phục sự cố hoặc tóm tắt tài khoản), file được tự động gửi dưới dạng attachment trong channel cho người dùng. Không cần cấu hình thêm — tính năng này hoạt động trên tất cả channel types.

## Context isolation hoạt động như thế nào

```
support (predefined)
├── SOUL.md         ← chia sẻ: cùng tính cách cho mọi người dùng
├── IDENTITY.md     ← chia sẻ: cùng "tôi là ai" cho mọi người dùng
├── AGENTS.md       ← chia sẻ: hướng dẫn vận hành
│
├── User: alice123
│   ├── USER.md     ← riêng: hồ sơ Alice, tier, lịch sử
│   └── BOOTSTRAP.md ← onboarding lần đầu (tự xóa)
│
└── User: bob456
    ├── USER.md     ← riêng: hồ sơ Bob
    └── BOOTSTRAP.md
```

## Sự cố thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Tính cách agent khác nhau giữa người dùng | Nếu agent là `open`, mỗi người dùng tự định hình tính cách. Chuyển sang `predefined` để chia sẻ SOUL.md. |
| USER.md không được tạo | Chat lần đầu kích hoạt tạo tự động. Nếu điền trước qua Instances tab, đảm bảo chọn đúng user. |
| Summoning thất bại, không có SOUL.md | Kiểm tra log gateway để tìm lỗi LLM khi summoning. Viết SOUL.md thủ công qua Files tab như Bước 2. |
| Agent escalate quá nhiều | Chỉnh SOUL.md thêm tiêu chí: "Only delegate to tech-specialist when the user reports an API error code or integration failure." |
| Chuyên gia không phản hồi | Kiểm tra trạng thái chuyên gia là `active` và delegation link tồn tại (Agent → Links tab). |

## Tiếp theo

- [Open vs. Predefined](/open-vs-predefined) — tìm hiểu sâu về context isolation
- [Summoning & Bootstrap](/summoning-bootstrap) — cách tính cách được tự động tạo
- [Team Chatbot](/recipe-team-chatbot) — điều phối nhiều chuyên gia qua team
- [Context Files](../agents/context-files.md) — tham khảo đầy đủ về SOUL.md, USER.md và các file khác

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
