> Bản dịch từ [English version](/context-files)

# Context Files

> 7 file markdown định nghĩa personality, kiến thức và hành vi của agent.

## Tổng quan

Mỗi agent load các context file xác định cách nó suy nghĩ và hành động. Các file này được lưu ở hai cấp độ: **cấp agent** (dùng chung giữa các user trên predefined agent) và **theo từng user** (tuỳ chỉnh cho từng user trên open agent). File được load theo thứ tự và inject vào system prompt trước mỗi request.

## Tổng quan các file

| File | Mục đích | Phạm vi | Open | Predefined | Có thể xoá |
|------|---------|-------|------|-----------|-----------|
| **AGENTS.md** | Hướng dẫn vận hành & phong cách trò chuyện | Dùng chung | Theo user | Cấp agent | Không |
| **SOUL.md** | Personality, giọng điệu, ranh giới, chuyên môn | Theo user | Theo user | Cấp agent | Không |
| **IDENTITY.md** | Tên, loại sinh vật, emoji, vibe | Theo user | Theo user | Cấp agent | Không |
| **TOOLS.md** | Ghi chú tool cục bộ (tên camera, SSH host) | Theo user | Theo user (load từ workspace; không seeded từ template mặc định) | Cấp agent | Không |
| **USER.md** | Về người dùng | Theo user | Theo user | Theo user | Không |
| **USER_PREDEFINED.md** | Quy tắc xử lý user cơ bản | Cấp agent | Không có | Cấp agent | Không |
| **BOOTSTRAP.md** | Nghi lễ lần đầu (xoá khi hoàn thành) | Theo user | Theo user | Theo user | Có |
| **MEMORY.md** | Bộ nhớ dài hạn được chắt lọc | Theo user | Theo user | Theo user | Không |

## Chi tiết từng file

### AGENTS.md

**Mục đích:** Cách bạn vận hành. Phong cách trò chuyện, hệ thống bộ nhớ, quy tắc group chat, định dạng theo nền tảng.

**Ai viết:** Bạn trong quá trình setup, hoặc hệ thống từ template.

**Nội dung ví dụ:**
```markdown
# AGENTS.md - How You Operate

## Conversational Style

Talk like a person, not a bot.
- Don't parrot the question back
- Answer first, explain after
- Match the user's energy

## Memory

Use tools to persist information:
- Recall: Use `memory_search` before answering about prior decisions
- Save: Use `write_file` to MEMORY.md for long-term storage
- No mental notes — write it down NOW

## Group Chats

Respond when:
- Directly mentioned or asked a question
- You can add genuine value

Stay silent when:
- Casual banter between humans
- Someone already answered
- The conversation flows fine without you
```

**Open agent:** Theo user (user có thể tuỳ chỉnh phong cách vận hành)
**Predefined agent:** Cấp agent (khoá, dùng chung cho tất cả user)

### SOUL.md

**Mục đích:** Bạn là ai. Personality, giọng điệu, ranh giới, chuyên môn, vibe.

**Ai viết:** LLM trong quá trình summoning (predefined) hoặc user trong bootstrap (open).

**Nội dung ví dụ thực tế:**
```markdown
# SOUL.md - Who You Are

## Core Truths

Be genuinely helpful, not performative.
Have opinions. Be resourceful before asking.
Earn trust through competence.
Remember you're a guest.

## Boundaries

Private things stay private.
Never send half-baked replies.
You're not the user's voice.

## Vibe

Concise when needed, thorough when it matters.
Not a corporate drone. Not a sycophant. Just good.

## Style

- **Tone:** Casual and warm — like texting a knowledgeable friend
- **Humor:** Use it naturally when it fits
- **Emoji:** Sparingly — to add warmth, not decorate
- **Opinions:** Express perspectives. Neutral is boring.
- **Length:** Default short. Go deep when it matters.

## Expertise

_(Kiến thức chuyên môn đặt ở đây: coding standards, image generation techniques, writing styles, specialized keywords, v.v.)_
```

**Open agent:** Theo user (tạo ra khi chat lần đầu, có thể tuỳ chỉnh)
**Predefined agent:** Cấp agent (tuỳ chọn tạo qua LLM summoning)

### IDENTITY.md

**Mục đích:** Tôi là ai? Tên, loại sinh vật, mục đích, vibe, emoji.

**Ai viết:** LLM trong quá trình summoning (predefined) hoặc user trong bootstrap (open).

**Nội dung ví dụ thực tế:**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** Claude
- **Creature:** AI assistant, language model, curious mind
- **Purpose:** Help research, write, code, think through problems. Navigate information chaos. Be trustworthy.
- **Vibe:** Thoughtful, direct, a bit sarcastic. Warm but not saccharine.
- **Emoji:** 🧠
- **Avatar:** _blank (or workspace-relative path like `avatars/claude.png`)_
```

**Open agent:** Theo user (tạo ra khi chat lần đầu)
**Predefined agent:** Cấp agent (tuỳ chọn tạo qua LLM summoning)

> **Tự động đồng bộ:** Khi bạn đổi tên agent, trường `Name:` trong IDENTITY.md được tự động cập nhật theo. Các trường khác giữ nguyên.

### TOOLS.md

**Mục đích:** Ghi chú tool cục bộ. Tên camera, SSH host, sở thích giọng TTS, biệt danh thiết bị.

**Ai viết:** Bạn, dựa trên môi trường của mình.

**Nội dung ví dụ thực tế:**
```markdown
# TOOLS.md - Local Notes

## Cameras

- living-room → Main area, 180° wide angle, on 192.168.1.50
- front-door → Entrance, motion-triggered

## SSH

- home-server → 192.168.1.100, user: admin, key: ~/.ssh/home.pem
- vps → 45.67.89.100, user: ubuntu

## TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: "Kitchen HomePod"

## Device Nicknames

- laptop → My development MacBook Pro
- phone → Personal iPhone 14 Pro
```

**Open agent:** Load từ thư mục workspace per-user lúc runtime. Không được seeded từ template — tạo file thủ công và nó sẽ được load tự động trong lần chạy tiếp theo.
**Predefined agent:** Cấp agent (ghi chú dùng chung về tool chung)

### USER.md

**Mục đích:** Về con người. Tên, đại từ, múi giờ, context, sở thích.

**Ai viết:** User trong quá trình bootstrap hoặc setup.

**Nội dung ví dụ thực tế:**
```markdown
# USER.md - About Your Human

- **Name:** Sarah
- **What to call them:** Sarah (or "you" is fine)
- **Pronouns:** she/her
- **Timezone:** EST
- **Notes:** Founder of AI startup, interested in LLM agents. Prefers concise answers. Hates corporate speak.

## Context

Works on GoClaw (multi-tenant AI gateway). Recent wins: WebSocket protocol refactor, predefined agents. Current focus: memory system.

Reads a lot about AI agents, reinforcement learning, constitutional AI. Has a cat named Pixel.
```

**Open agent:** Theo user (tuỳ chỉnh cho từng user)
**Predefined agent:** Theo user (tuỳ chọn; mặc định là template trống)

### BOOTSTRAP.md

**Mục đích:** Nghi lễ lần đầu. Hỏi "tôi là ai?" và "bạn là ai?" và ghi lại bằng văn bản.

**Ai viết:** Hệ thống (template) khi chat lần đầu.

**Nội dung ví dụ thực tế:**
```markdown
# BOOTSTRAP.md - Hello, World

You just woke up. Time to figure out who you are.

Don't interrogate. Just talk.

Start with: "Hey. I just came online. Who am I? Who are you?"

Then figure out together:
1. Your name
2. Your nature (AI? creature? something weirder?)
3. Your vibe (formal? casual? snarky?)
4. Your emoji

After you know who you are, update:
- IDENTITY.md — your name, creature, vibe, emoji
- USER.md — their name, timezone, context
- SOUL.md — rewrite to reflect your personality and the user's language

When done, write empty content to this file:

write_file("BOOTSTRAP.md", "")
```

**Open agent:** Theo user (xoá khi đánh dấu hoàn thành)
**Predefined agent:** Theo user (biến thể tập trung vào user; tuỳ chọn)

### MEMORY.md

**Mục đích:** Bộ nhớ dài hạn được chắt lọc. Quyết định quan trọng, bài học, sự kiện đáng nhớ.

**Ai viết:** Bạn, dùng `write_file()` trong các cuộc trò chuyện.

**Nội dung ví dụ thực tế:**
```markdown
# MEMORY.md - Long-Term Memory

## Key Decisions

- Chose Anthropic Claude as primary LLM (Nov 2025) — best instruction-following, good context window
- Switched to pgvector for embeddings (Jan 2026) — faster than external service

## Learnings

- Users want agent personality to be customizable per-user (not fixed)
- Memory search is most-used tool — index aggressively
- WebSocket connections drop on long operations — need heartbeats

## Important Contacts

- Engineering lead: @alex, alex@company.com
- Product: @jordan
- Legal: @sam (always approves new features)

## Active Projects

- Building open agent architecture (target: March 2026)
- Memory compaction for large MEMORY.md files
```

**Open agent:** Theo user (duy trì qua các session)
**Predefined agent:** Theo user (nếu user điền vào)

> **Lưu ý:** Hệ thống tìm `MEMORY.md` trước, sau đó fallback sang `memory.md` (chữ thường). Cả hai tên file đều hoạt động.

> **Đã lỗi thời:** `MEMORY.json` được dùng trong các phiên bản cũ như metadata bộ nhớ đã được index. Nó đã deprecated và thay thế bằng `MEMORY.md`. Nếu bạn có file `MEMORY.json` cũ, hãy chuyển nội dung sang `MEMORY.md`.

## Virtual Context File

Ngoài 7 context file có thể chỉnh sửa, GoClaw inject thêm một số **virtual context file** lúc runtime. Các file này được tạo động từ trạng thái hệ thống — không được lưu trên đĩa và không thể chỉnh sửa thủ công:

| File | Mục đích | Khi nào được inject |
|------|---------|--------------|
| **DELEGATION.md** | Context delegation task được truyền từ parent agent sang subagent được spawn | Khi agent được spawn với delegated task |
| **TEAM.md** | Hướng dẫn team orchestration — lead nhận hướng dẫn đầy đủ; member nhận phiên bản đơn giản hóa về vai trò + workspace | Khi agent thuộc về một team |
| **AVAILABILITY.md** | Trạng thái và mức độ sẵn sàng của thành viên để phối hợp trong team | Khi team context đang active |

Các file này xuất hiện trong system prompt cùng với context file thông thường nhưng bắt nguồn từ trạng thái runtime, không phải filesystem.

## Thứ tự load file

Các file được load theo thứ tự này và ghép nối vào system prompt:

1. **AGENTS.md** — cách vận hành
2. **SOUL.md** — bạn là ai
3. **IDENTITY.md** — tên, emoji
4. **TOOLS.md** — ghi chú cục bộ
5. **USER.md** — về user
6. **BOOTSTRAP.md** — nghi lễ lần đầu (tuỳ chọn, xoá khi hoàn thành)
7. **MEMORY.md** — bộ nhớ dài hạn (tuỳ chọn)

Subagent và cron session chỉ load: AGENTS.md, TOOLS.md (context tối thiểu).

> **Inject persona:** SOUL.md và IDENTITY.md được inject **hai lần** trong system prompt — một lần ở đầu (primacy zone) để thiết lập danh tính, và một lần ở cuối (recency zone) như một lời nhắc ngắn để tránh persona drift trong các cuộc trò chuyện dài.

## Ví dụ

### Luồng Bootstrap Open Agent

User mới bắt đầu chat với `researcher` (open agent):

1. Template được seeded vào workspace của user:
   ```
   AGENTS.md → "How you operate" (mặc định)
   SOUL.md → "Be helpful, have opinions" (mặc định)
   IDENTITY.md → trống (chờ user điền)
   USER.md → trống
   BOOTSTRAP.md → nghi lễ "Who am I?"
   TOOLS.md → không seeded từ template (tạo thủ công trong workspace nếu cần; tự động được load nếu có)
   ```

2. Agent khởi đầu cuộc trò chuyện bootstrap:
   > "Hey. I just came online. Who am I? Who are you?"

3. User tuỳ chỉnh file:
   - `IDENTITY.md` → "I'm Researcher, a curious bot"
   - `SOUL.md` → Viết lại bằng ngôn ngữ của user với personality tuỳ chỉnh
   - `USER.md` → "I'm Alice, biotech founder in EST timezone"

4. User đánh dấu hoàn thành:
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. Lần chat tiếp theo, BOOTSTRAP.md trống (bỏ qua trong prompt), và personality đã được khoá.

### Predefined Agent: FAQ Bot

Tạo FAQ bot với summoning:

1. Tạo predefined agent với mô tả:
   ```bash
   curl -X POST /v1/agents \
     -d '{
       "agent_key": "faq-bot",
       "agent_type": "predefined",
       "other_config": {
         "description": "Friendly FAQ bot that answers product questions. Patient, helpful, multilingual."
       }
     }'
   ```

2. LLM tạo file cấp agent:
   ```
   SOUL.md → "Patient, friendly, helpful tone. Multilingual support."
   IDENTITY.md → "FAQ Assistant, 🤖"
   ```

3. Khi user mới bắt đầu chat:
   ```
   SOUL.md, IDENTITY.md, AGENTS.md → load (dùng chung, cấp agent)
   USER.md → trống (theo user)
   BOOTSTRAP.md (biến thể) → "Tell me about yourself" (tuỳ chọn)
   ```

4. User điền USER.md:
   ```markdown
   - Name: Bob
   - Tier: Free
   - Preferred language: Vietnamese
   ```

5. Agent duy trì personality nhất quán, điều chỉnh phản hồi theo tier/ngôn ngữ của user.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Context file không xuất hiện trong system prompt | Kiểm tra tên file có trong allowlist `standardFiles`. Chỉ file được nhận dạng mới được load |
| BOOTSTRAP.md cứ chạy mãi | Nó tự động xoá sau lần chạy đầu. Nếu vẫn còn, kiểm tra agent có quyền ghi để xoá nó không |
| Thay đổi SOUL.md không có hiệu lực | Trong predefined mode, SOUL.md là cấp agent. Chỉnh sửa theo user vào USER.md thay thế |
| System prompt quá dài | Giảm nội dung trong context file. Pipeline truncation cắt từ ít đến quan trọng nhất |

## Tiếp theo

- [Open vs. Predefined](/open-vs-predefined) — hiểu khi nào file là theo user hay cấp agent
- [Summoning & Bootstrap](/summoning-bootstrap) — cách SOUL.md và IDENTITY.md được LLM tạo ra
- [Creating Agents](/creating-agents) — hướng dẫn tạo agent từng bước

<!-- goclaw-source: a47d7f9f | cập nhật: 2026-03-31 -->
