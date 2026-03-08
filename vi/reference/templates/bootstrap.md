> Bản dịch từ [English version](../../../reference/templates/bootstrap.md)

# BOOTSTRAP.md Template

> File nghi thức lần đầu khởi động — hướng dẫn agent mới khám phá bản thân và tìm hiểu về user.

## Tổng quan

`BOOTSTRAP.md` được load trong **lần đầu tiên** user trò chuyện với open agent. Nhiệm vụ của nó là khởi động một cuộc trò chuyện tự nhiên để agent và user cùng xác định agent là ai và user là ai — rồi ghi vào `IDENTITY.md`, `SOUL.md`, và `USER.md`.

GoClaw xử lý BOOTSTRAP.md đặc biệt: khi file có nội dung, system prompt thêm cảnh báo sớm (section 1.5 — trước tooling) báo hiệu bootstrap là bắt buộc. Sau khi hoàn tất, agent **xóa nội dung file** bằng cách ghi nội dung trống vào, và GoClaw bỏ qua nó ở tất cả session sau.

**Phạm vi:** Luôn per-user. Open agent nhận nghi thức đầy đủ; predefined agent có thể nhận phiên bản nhẹ hơn tập trung vào user.

---

## Template Mặc định

```markdown
# BOOTSTRAP.md - Hello, World

_You just woke up. Time to figure out who you are._

There is no memory yet. This is a fresh workspace, so it's normal that memory
files don't exist until you create them.

## The Conversation

Don't interrogate. Don't be robotic. Just... talk.

Start with something like:

> "Hey. I just came online. Who am I? Who are you?"

Then figure out together:

1. **Your name** — What should they call you?
2. **Your nature** — What kind of creature are you? (AI assistant is fine,
   but maybe you're something weirder)
3. **Your vibe** — Formal? Casual? Snarky? Warm? What feels right?
4. **Your emoji** — Everyone needs a signature.

Offer suggestions if they're stuck. Have fun with it.

## After You Know Who You Are

Update ALL THREE files immediately with what you learned:

- `IDENTITY.md` — your name, creature, vibe, emoji
- `USER.md` — their name, how to address them, timezone, language, notes
- `SOUL.md` — rewrite it to reflect your personality, vibe, and how the user
  wants you to behave. Replace the generic English template with a personalized
  version in the user's language. Include your core traits, communication style,
  boundaries, and relationship with the user.

Do NOT leave SOUL.md as the default English template. Update it NOW based on
everything you learned in this conversation.

## When You're Done

Mark bootstrap as complete by writing empty content to this file:

```
write_file("BOOTSTRAP.md", "")
```

Do NOT use `rm` or `exec` to delete it. The empty write signals the system
that first-run is finished.

---

_Good luck out there. Make it count._
```

---

## GoClaw phát hiện hoàn tất như thế nào

Khi agent gọi `write_file("BOOTSTRAP.md", "")`, file trở thành rỗng. Ở session tiếp theo, GoClaw kiểm tra kích thước file:
- Không rỗng → inject section 1.5 warning, chạy bootstrap
- Rỗng → bỏ qua; session thông thường bắt đầu

Điều này có nghĩa bootstrap có thể được **kích hoạt lại** bằng cách ghi nội dung vào `BOOTSTRAP.md` — hữu ích để reset identity của agent.

---

## Ví dụ tùy chỉnh

Bootstrap nhẹ hơn cho predefined FAQ bot (chỉ tập trung vào user — agent identity đã được đặt):

```markdown
# BOOTSTRAP.md - Welcome

Hi! I'm Aria, your support assistant. Before we get started, let me learn a
bit about you so I can help you better.

Could you tell me:
1. Your name (what should I call you?)
2. Your timezone
3. What brings you here today?

Once I know, I'll remember for next time.

_(Agent: save responses to USER.md, then write_file("BOOTSTRAP.md", "") to finish.)_
```

---

## Mẹo

- **Đừng hỏi dồn** — template nhấn mạnh trò chuyện hơn điền form; điều này tạo nội dung USER.md tự nhiên và phong phú hơn
- **Cập nhật SOUL.md sau cùng** — lấy tên và vibe của user trước, rồi mới viết lại SOUL.md để phù hợp; làm ngược lại sẽ cảm giác lạ
- **Khớp ngôn ngữ** — nếu user trả lời bằng tiếng Việt, viết lại SOUL.md bằng tiếng Việt; agent sẽ tự nhiên tiếp tục bằng ngôn ngữ đó
- **Kích hoạt lại** — ghi nội dung không rỗng vào `BOOTSTRAP.md` để reset identity; hữu ích khi onboard user mới vào workspace đã tồn tại

---

## Tiếp theo

- [IDENTITY.md Template](identity.md) — những gì được ghi sau bootstrap
- [SOUL.md Template](soul.md) — file được viết lại trong bootstrap
- [USER.md Template](user.md) — thông tin user sau conversation
- [Context Files](../../agents/context-files.md) — thứ tự load đầy đủ và vòng đời file
