> Bản dịch từ [English version](../../../reference/templates/user.md)

# USER.md Template

> File profile per-user — ghi chú của agent về người dùng mà nó đang giúp đỡ.

## Tổng quan

`USER.md` nói với agent về người đang được giúp. Tên, timezone, sở thích giao tiếp, dự án đang làm, đặc điểm — bất cứ điều gì giúp agent phục vụ họ tốt hơn theo thời gian.

GoClaw load file này vào phần **Project Context** của full-mode system prompt (không phải minimal mode). Agent được kỳ vọng sẽ **điền và cập nhật file** khi tìm hiểu thêm về user, bắt đầu từ bootstrap conversation.

**Phạm vi:**
- Open agent: per-user (riêng cho mỗi user, do agent quản lý)
- Predefined agent: per-user (tùy chọn; mặc định là template trống cho mỗi user mới)

Không giống SOUL.md hay IDENTITY.md, USER.md luôn là per-user — kể cả trên predefined agent. Mỗi user có bản sao riêng.

---

## Template Mặc định

```markdown
# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them?
What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning
about a person, not building a dossier. Respect the difference.
```

---

## Ví dụ tùy chỉnh

USER.md được xây dựng qua nhiều conversation:

```markdown
# USER.md - About Your Human

- **Name:** Sarah Chen
- **What to call them:** Sarah (never "Ms. Chen")
- **Pronouns:** she/her
- **Timezone:** EST (UTC-5), usually online 9am–11pm
- **Notes:** Founder of AI startup. Hates corporate speak. Prefers bullet points
  over paragraphs. Will ask follow-up questions — don't over-explain upfront.

## Context

### Work

- Building GoClaw (multi-tenant AI agent gateway in Go)
- Current focus: memory system and open agent architecture
- Stack: Go, PostgreSQL, Redis, Kubernetes, Anthropic Claude API
- Pain points: context window management, long agent sessions

### Preferences

- Direct answers first, reasoning after if asked
- Code examples > explanations
- No unsolicited advice on things she didn't ask about
- Responds well to "here's a tradeoff" framing

### Personal

- Based in NYC
- Reads a lot about AI agents, RL, constitutional AI
- Cat named Pixel (she'll mention Pixel occasionally)
- Drinks too much coffee, usually messages late at night
```

---

## Mẹo

- **Cập nhật từng bước** — đừng cố điền tất cả ngay; tìm hiểu dần dần
- **Dùng `write_file` ngay lập tức** — khi user chia sẻ điều gì đó liên quan, lưu ngay, không phải sau
- **Giữ có ích** — tập trung vào những điều thực sự thay đổi cách bạn trả lời, không phải thông tin vô nghĩa
- **Tôn trọng riêng tư** — file này per-user và private. Không bao giờ tiết lộ nội dung trong group chat (xem quy tắc MEMORY.md Privacy trong AGENTS.md)
- **Đây là tài liệu sống** — thông tin lỗi thời còn tệ hơn không có gì; cập nhật hoặc xóa ghi chú cũ

---

## Tiếp theo

- [AGENTS.md Template](agents.md) — quy tắc MEMORY.md Privacy quy định cách dùng nội dung USER.md
- [BOOTSTRAP.md Template](bootstrap.md) — USER.md có nội dung ban đầu như thế nào trong lần đầu
- [Context Files](../../agents/context-files.md) — danh sách đầy đủ context file và scope per-user vs. cấp agent
