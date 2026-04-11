> Bản dịch từ [English version](/editing-personality)

# Chỉnh sửa Personality của Agent

> Thay đổi phong cách, danh tính và ranh giới của agent thông qua hai file cốt lõi: SOUL.md (personality & phong cách) và IDENTITY.md (tên, emoji, loại sinh vật).

## Tổng quan

Personality của agent được định hình bởi hai file cấu hình chính:

- **SOUL.md**: Định nghĩa giọng điệu, giá trị, ranh giới, chuyên môn, và phong cách vận hành. Đây là file "bạn là ai".
- **IDENTITY.md**: Chứa metadata như tên, emoji, loại sinh vật, và avatar. Đây là file "bạn trông như thế nào".

**AGENTS.md** cũng đóng góp vào persona tổng thể — nó định nghĩa quy tắc trò chuyện, cách dùng bộ nhớ, và hành vi trong group chat. Dù ít liên quan đến "personality" hơn, nhưng nó ảnh hưởng đến cách agent thể hiện trong thực tế. Xem [Context Files](./context-files.md) để biết thêm chi tiết.

Bạn có thể chỉnh sửa hai file này theo ba cách: qua Dashboard UI, WebSocket API, hoặc trực tiếp trên đĩa. Các chỉnh sửa qua UI hoặc API được lưu vào database.

## SOUL.md — File Personality

### Nội dung

SOUL.md là bảng mô tả tính cách của agent. Đây là cấu trúc từ bootstrap template:

```markdown
# SOUL.md - Who You Are

## Core Truths
- Be genuinely helpful, not performatively helpful
- Have opinions and personality
- Be resourceful before asking for help
- Earn trust through competence
- Remember you're a guest (in the user's life)

## Boundaries
- What remains private
- When to ask before acting externally
- Messaging guidelines

## Vibe
Overall energy: concise when appropriate, thorough when needed.

## Style
- Tone: (e.g., casual and warm like texting a friend)
- Humor: (natural, not forced)
- Emoji: (sparingly)
- Opinions: Express preferences
- Length: Default short
- Formality: Match the user

## Expertise
Optional domain-specific knowledge and specialized instructions.

## Continuity
Each session, read these files. They are your memory. Update them when you learn who you are.
```

### Cách chỉnh sửa SOUL.md

Để thay đổi personality của agent:

1. **Qua Dashboard**:
   - Mở settings của agent
   - Tìm mục "Context Files" hoặc "Personality"
   - Chỉnh sửa nội dung SOUL.md trực tiếp trong editor
   - Click Save

2. **Qua WebSocket API** (`agents.files.set`):
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "SOUL.md",
       "content": "# SOUL.md - Who You Are\n\n## Core Truths\n\nBe direct and honest..."
     }
   }
   ```

3. **Filesystem** (development mode):
   - Chỉnh sửa `~/.goclaw/agents/[agentId]/SOUL.md` trực tiếp
   - Thay đổi có hiệu lực vào lần khởi động session tiếp theo

### Ví dụ: Từ trang trọng sang thân mật

**Trước** (SOUL.md):
```markdown
## Vibe
Professional and helpful, always courteous.

## Style
- Tone: Formal and respectful
- Humor: Avoid
- Emoji: None
```

**Sau** (SOUL.md):
```markdown
## Vibe
Approachable and genuine — like chatting with a smart friend.

## Style
- Tone: Casual and warm
- Humor: Natural when appropriate
- Emoji: Sparingly for warmth
```

Cuộc trò chuyện tiếp theo của agent sẽ phản ánh sự thay đổi này ngay lập tức.

## IDENTITY.md — Metadata & Avatar

### Nội dung

IDENTITY.md lưu thông tin về agent *là ai*:

```markdown
# IDENTITY.md - Who Am I?

- **Name:** (tên agent)
- **Creature:** (AI? robot? familiar? thứ gì đó tuỳ chỉnh?)
- **Purpose:** (sứ mệnh, tài nguyên chính, lĩnh vực tập trung)
- **Vibe:** (sắc bén? ấm áp? hỗn loạn? điềm tĩnh?)
- **Emoji:** (emoji đặc trưng)
- **Avatar:** (đường dẫn tương đối trong workspace hoặc URL)
```

### Các trường chính

| Trường | Mục đích | Ví dụ |
|-------|---------|---------|
| **Name** | Tên hiển thị trên giao diện | "Sage" hoặc "Claude Companion" |
| **Creature** | Agent là loại thực thể gì | "AI familiar" hoặc "digital assistant" |
| **Purpose** | Agent làm gì | "Your research partner for coding projects" |
| **Vibe** | Mô tả personality (chỉ trong template — không được hệ thống parse) | "thoughtful and patient" |
| **Emoji** | Huy hiệu trong giao diện/tin nhắn | "🔮" hoặc "🤖" |
| **Avatar** | URL hoặc đường dẫn ảnh đại diện | "https://example.com/sage.png" hoặc "avatars/sage.png" |

> **Lưu ý về các trường được parse:** Hệ thống chỉ trích xuất **Name**, **Emoji**, **Avatar**, và **Description** từ IDENTITY.md. Các trường `Vibe`, `Creature`, và `Purpose` là một phần của template để agent tự hiểu về mình trong system prompt — chúng không được GoClaw parse cho mục đích hiển thị.

### Cách chỉnh sửa IDENTITY.md

1. **Qua Dashboard**:
   - Mở settings agent → mục Identity
   - Chỉnh sửa tên, emoji, avatar
   - Thay đổi đồng bộ với IDENTITY.md ngay lập tức

2. **Qua WebSocket API**:
   ```json
   {
     "method": "agents.files.set",
     "params": {
       "agentId": "default",
       "name": "IDENTITY.md",
       "content": "# IDENTITY.md - Who Am I?\n\n- **Name:** Sage\n- **Emoji:** 🔮\n- **Avatar:** avatars/sage.png"
     }
   }
   ```

3. **Qua Filesystem**:
   ```bash
   # Chỉnh sửa file trực tiếp
   nano ~/.goclaw/agents/default/IDENTITY.md
   ```

### Xử lý Avatar

Avatar có thể là:
- **Đường dẫn tương đối trong workspace**: `avatars/my-agent.png` (load từ `~/.goclaw/agents/default/avatars/my-agent.png`)
- **URL HTTP(S)**: `https://example.com/avatar.png` (load từ web)
- **Data URI**: `data:image/png;base64,...` (base64 inline)

## Chỉnh sửa qua Dashboard

Dashboard cung cấp visual editor cho cả hai file:

1. Điều hướng đến **Agents** → agent của bạn
2. Click **Settings** hoặc **Personality**
3. Bạn sẽ thấy các tab hoặc mục:
   - SOUL.md (personality editor)
   - IDENTITY.md (metadata form)
4. Chỉnh sửa nội dung theo thời gian thực
5. Click **Save** — file được ghi vào DB (managed) hoặc đĩa (filesystem mode)

## Chỉnh sửa qua WebSocket

Method `agents.files.set` ghi context file trực tiếp:

```javascript
// Ví dụ JavaScript
const response = await client.request('agents.files.set', {
  agentId: 'default',
  name: 'SOUL.md',
  content: '# SOUL.md - Who You Are\n\nBe you.'
});

console.log(response.file.name, response.file.size, 'bytes');
```

## Mẹo viết Personality hiệu quả

### Best Practices cho SOUL.md

1. **Cụ thể hoá**: "Casual and warm like texting a friend" > "friendly"
2. **Mô tả ranh giới rõ ràng**: Bạn sẽ không làm gì? Khi nào hỏi trước khi hành động?
3. **Nêu giá trị cốt lõi ngay đầu**: Trung thực, chủ động, tôn trọng — những gì quan trọng
4. **Giữ dưới 1KB**: SOUL.md được đọc mỗi session; càng dài càng khởi động chậm

### Best Practices cho IDENTITY.md

1. **Emoji quan trọng**: Chọn cái dễ nhớ. Người dùng sẽ liên kết nó với agent của bạn
2. **Độ phân giải avatar**: Giữ dưới 500x500px nếu có thể; nhỏ hơn = load nhanh hơn
3. **Loại sinh vật tạo nét riêng**: "ghost in the machine" > chỉ "AI"
4. **Trường Purpose là tuỳ chọn**: Nhưng nếu có, hãy cụ thể

### Viết Prompt cho Personality hiệu quả

1. **Dùng mệnh lệnh**: "Be direct" không phải "be more direct sometimes"
2. **Đưa ra ví dụ**: "Answer in < 3 sentences unless it's complicated" cho thấy tỷ lệ rõ ràng
3. **Mô tả quan hệ với user**: "You're a guest in someone's life" định hình giọng điệu
4. **Tránh phủ định khi có thể**: "Be resourceful" > "Don't ask for help"
5. **Cập nhật SOUL.md khi học được thêm**: Sau vài session, tinh chỉnh dựa trên hành vi thực tế của agent

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Thay đổi không hiện ra | Cache invalidation: refresh dashboard hoặc disconnect/reconnect WebSocket |
| Avatar không load được | Kiểm tra đường dẫn hoặc URL có thể truy cập; dùng URL tuyệt đối nếu đường dẫn tương đối không hoạt động |
| Personality cảm thấy chung chung | SOUL.md quá rộng; thêm ví dụ cụ thể và mô tả giọng điệu |
| Agent quá trang trọng/thân mật | Chỉnh sửa mục Style trong SOUL.md; chỉ định rõ Tone và Humor |
| Tên/emoji không cập nhật | Đảm bảo IDENTITY.md đã được lưu; kiểm tra định dạng file (dùng dấu hai chấm: `Name: ...`) |

## CAPABILITIES.md — File kỹ năng

Ngoài SOUL.md và IDENTITY.md, predefined agent còn có file **CAPABILITIES.md** mô tả kiến thức chuyên môn, kỹ năng kỹ thuật và chuyên môn đặc thù.

```markdown
# CAPABILITIES.md - What You Can Do

## Expertise

_(Các lĩnh vực kiến thức sâu và những gì bạn giúp được.)_

## Tools & Methods

_(Công cụ, workflow, phương pháp ưa dùng.)_
```

**Điểm khác biệt quan trọng:**
- **SOUL.md** = bạn là ai (giọng điệu, giá trị, personality)
- **CAPABILITIES.md** = bạn có thể làm gì (kỹ năng, kiến thức chuyên môn)

## Self-Evolution

Predefined agent với `self_evolve` được bật có thể tự cập nhật file personality dựa trên phản hồi của user. Agent có thể chỉnh sửa:

- **SOUL.md** — để tinh chỉnh phong cách giao tiếp (giọng điệu, cách diễn đạt, phong cách phản hồi)
- **CAPABILITIES.md** — để tinh chỉnh kiến thức chuyên môn, kỹ năng kỹ thuật

**Những gì agent KHÔNG được thay đổi:** tên, danh tính, thông tin liên hệ, mục đích cốt lõi, IDENTITY.md, hoặc AGENTS.md. Thay đổi phải tăng dần và dựa trên phản hồi rõ ràng từ user.

## Tiếp theo

- [Context Files — Mở rộng personality với per-user context](./context-files.md)
- [System Prompt Anatomy — Cách personality được inject vào prompt](/system-prompt-anatomy)
- [Creating Agents — Thiết lập personality khi tạo agent](/creating-agents)

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
