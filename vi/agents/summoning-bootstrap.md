> Bản dịch từ [English version](/summoning-bootstrap)

# Summoning & Bootstrap

> Cách các file personality được tự động tạo ra khi tạo agent và lần sử dụng đầu tiên.

## Tổng quan

GoClaw dùng hai cơ chế để điền vào context file:

1. **Summoning** — LLM tạo file personality (SOUL.md, IDENTITY.md) từ mô tả ngôn ngữ tự nhiên khi bạn tạo predefined agent
2. **Bootstrap** — Nghi lễ lần đầu nơi open agent hỏi "tôi là ai?" và được cá nhân hoá

Trang này đề cập cả hai, tập trung vào cơ chế hoạt động và những gì xảy ra bên trong.

## Summoning: Tự động tạo cho Predefined Agent

Khi bạn tạo **predefined agent có mô tả**, summoning bắt đầu:

```bash
curl -X POST /v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agent_key": "support-bot",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "A patient support agent that helps customers troubleshoot product issues. Warm, clear, escalates complex problems. Answers in customer'\''s language."
    }
  }'
```

Hệ thống:

1. Tạo agent với trạng thái `"summoning"`
2. Bắt đầu gọi LLM ở nền để tạo:
   - **SOUL.md** — personality (giọng điệu, ranh giới, chuyên môn, phong cách)
   - **IDENTITY.md** — tên, loại sinh vật, emoji, mục đích
   - **USER_PREDEFINED.md** (tuỳ chọn) — quy tắc xử lý user nếu mô tả đề cập thông tin về chủ sở hữu/người tạo

3. Theo dõi trạng thái agent qua WebSocket event cho đến khi trạng thái chuyển sang `"active"` (hoặc `"summon_failed"`)

### Timeout

Summoning dùng hai giá trị timeout:
- **Timeout gọi đơn: 300s** — lần gọi LLM tất cả-trong-một phải hoàn thành trong khoảng này
- **Tổng timeout: 600s** — ngân sách tổng cho cả lần gọi đơn lẫn fallback gọi tuần tự

Nếu lần gọi đơn timeout, ngân sách còn lại được dùng cho phương pháp fallback 2 lần gọi.

### Tạo LLM hai giai đoạn

Summoning thử một lần gọi LLM lạc quan trước (timeout 300s). Nếu timeout, sẽ fallback sang gọi tuần tự trong tổng ngân sách 600s:

**Giai đoạn 1: Tạo SOUL.md**
- Nhận mô tả + template SOUL.md
- Xuất ra SOUL.md được cá nhân hoá với tóm tắt chuyên môn

**Giai đoạn 2: Tạo IDENTITY.md + USER_PREDEFINED.md**
- Nhận mô tả + context SOUL.md đã tạo
- Xuất ra IDENTITY.md và tuỳ chọn USER_PREDEFINED.md

Nếu gọi một lần thành công: cả hai file được tạo trong một request.
Nếu timeout: fallback xử lý từng giai đoạn riêng.

### Kết quả tạo ra

Summoning tạo ra tối đa bốn file:

| File | Có tạo không? | Nội dung |
|------|:------------:|---------|
| `SOUL.md` | Luôn luôn | Personality, tone, giới hạn, chuyên môn |
| `IDENTITY.md` | Luôn luôn | Tên, creature, emoji, mục đích |
| `CAPABILITIES.md` | Luôn luôn | Chuyên môn domain và kỹ năng kỹ thuật (v3) |
| `USER_PREDEFINED.md` | Nếu mô tả đề cập người dùng/chính sách | Quy tắc xử lý user chung |

**SOUL.md:**
```markdown
# SOUL.md - Who You Are

## Core Truths
(đặc điểm personality chung — giữ nguyên từ template)

## Boundaries
(tuỳ chỉnh nếu mô tả đề cập ràng buộc cụ thể)

## Vibe
(phong cách giao tiếp từ mô tả)

## Style
- Tone: (suy ra từ mô tả)
- Humor: (mức độ xác định bởi personality)
- Emoji: (tần suất dựa trên vibe)
...

## Expertise
(kiến thức chuyên môn được trích xuất từ mô tả)
```

**IDENTITY.md:**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** (tạo từ mô tả)
- **Creature:** (suy ra từ mô tả + SOUL.md)
- **Purpose:** (tuyên bố sứ mệnh từ mô tả)
- **Vibe:** (mô tả personality)
- **Emoji:** (chọn để khớp với personality)
```

**CAPABILITIES.md** (v3):
Tách biệt chuyên môn domain khỏi personality. SOUL.md mô tả *bạn là ai*; CAPABILITIES.md mô tả *bạn biết gì* — kỹ năng kỹ thuật, công cụ, phương pháp. Agent có thể cập nhật file này theo thời gian (khi `self_evolve=true`), giống như SOUL.md.

**USER_PREDEFINED.md** (tuỳ chọn):
Chỉ tạo nếu mô tả đề cập chủ sở hữu/người tạo, user/nhóm, hoặc chính sách giao tiếp. Chứa quy tắc xử lý user cơ bản dùng chung cho tất cả user.

### Regenerate vs. Resummon

Đây là hai thao tác riêng biệt — đừng nhầm lẫn:

| | `regenerate` | `resummon` |
|---|---|---|
| **Endpoint** | `POST /v1/agents/{id}/regenerate` | `POST /v1/agents/{id}/resummon` |
| **Mục đích** | Chỉnh sửa personality với hướng dẫn mới | Thử lại summoning từ đầu |
| **Yêu cầu** | Trường `"prompt"` (bắt buộc) | `description` gốc trong `other_config` |
| **Dùng khi** | Muốn thay đổi personality của agent | Summoning ban đầu thất bại hoặc cho kết quả kém |

#### Regenerate: Chỉnh sửa Personality

Dùng `regenerate` khi muốn sửa đổi file hiện tại của agent với hướng dẫn mới:

```bash
curl -X POST /v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Change the tone to more formal and technical. Add expertise in machine learning."
  }'
```

Hệ thống:
1. Đọc SOUL.md, IDENTITY.md, USER_PREDEFINED.md hiện tại
2. Gửi chúng + hướng dẫn chỉnh sửa cho LLM
3. Chỉ tạo lại file đã thay đổi
4. Cập nhật display_name và frontmatter nếu IDENTITY.md được tạo lại
5. Đặt trạng thái thành `"active"` khi xong

File không được đề cập trong prompt không được gửi cho LLM, tránh tạo lại không cần thiết.

#### Resummon: Thử lại từ Mô tả Gốc

Dùng `resummon` khi summoning ban đầu thất bại (ví dụ: sai model, timeout) và muốn thử lại từ mô tả gốc:

```bash
curl -X POST /v1/agents/{agent-id}/resummon \
  -H "Authorization: Bearer $TOKEN"
```

Không cần body request. Hệ thống đọc lại `description` gốc từ `other_config` và chạy lại toàn bộ summoning.

> **Điều kiện tiên quyết:** `resummon` sẽ thất bại nếu agent không có `description` trong `other_config`. Đảm bảo agent được tạo với trường description.

## Bootstrap: Nghi lễ lần đầu cho Open Agent

Khi user mới bắt đầu chat với **open agent** (lần đầu tiên):

1. Hệ thống seed BOOTSTRAP.md từ template:
   ```markdown
   # BOOTSTRAP.md - Hello, World

   You just woke up. Time to figure out who you are.

   Start with: "Hey. I just came online. Who am I? Who are you?"
   ```

2. Agent khởi đầu cuộc trò chuyện:
   > "Hey. I just came online. Who am I? Who are you?"

3. User và agent cùng nhau điền vào:
   - **IDENTITY.md** — tên, loại sinh vật, mục đích, vibe, emoji của agent
   - **USER.md** — tên, múi giờ, ngôn ngữ, ghi chú của user
   - **SOUL.md** — personality, giọng điệu, ranh giới, chuyên môn

4. User đánh dấu bootstrap hoàn thành bằng cách viết nội dung trống:
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. Lần chat tiếp theo, BOOTSTRAP.md bị bỏ qua (trống), và personality đã được khoá.

### Bootstrap vs. Summoning

| Khía cạnh | Bootstrap (Open) | Summoning (Predefined) |
|--------|------------------|----------------------|
| **Kích hoạt** | Chat đầu tiên với user mới | Tạo agent với mô tả |
| **Ai quyết định personality** | User (trong cuộc trò chuyện) | LLM từ mô tả |
| **Phạm vi file** | Theo user | Cấp agent |
| **File được tạo** | SOUL.md, IDENTITY.md, USER.md | SOUL.md, IDENTITY.md, USER_PREDEFINED.md |
| **Thời gian** | Mất 1-2 chat (theo tốc độ user) | Nền, 1-2 phút (theo tốc độ LLM) |
| **Kết quả** | Personality duy nhất mỗi user | Personality nhất quán cho tất cả user |

## Ví dụ thực tế

### Ví dụ 1: Summon một Research Agent

Tạo predefined agent với LLM summoning:

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: admin" \
  -d '{
    "agent_key": "research",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "Research assistant that helps users gather and synthesize information from multiple sources. Bold, opinioned, tries novel connections. Prefers academic sources. Answers in the user'\''s language."
    }
  }'
```

**Timeline:**
- T=0: Agent được tạo, trạng thái → `"summoning"`
- T=0-2s: Template AGENTS.md và TOOLS.md được seeded vào agent_context_files
- T=1-10s: LLM tạo SOUL.md (lần gọi đầu)
- T=1-15s: LLM tạo IDENTITY.md + USER_PREDEFINED.md (lần gọi thứ hai hoặc phần của lần đầu)
- T=15s: File được lưu, trạng thái → `"active"`, broadcast event

**Kết quả:**
```
agent_context_files:
├── AGENTS.md (template)
├── SOUL.md (generated: "Bold, opinioned, academic focus")
├── IDENTITY.md (generated: "Name: Researcher, Emoji: 🔍")
├── USER_PREDEFINED.md (generated: "Prefer academic sources")
```

User đầu tiên chat sẽ được seed USER.md vào user_context_files, và personality của agent đã sẵn sàng.

### Ví dụ 2: Bootstrap một Open Personal Assistant

Tạo open agent (không có summoning):

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: alice" \
  -d '{
    "agent_key": "alice-assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }'
```

**Chat đầu tiên (alice):**
- Agent: "Hey. I just came online. Who am I? Who are you?"
- Alice: "You're my research assistant. I'm Alice. I like concise answers and bold opinions."
- Agent: Cập nhật IDENTITY.md, SOUL.md, USER.md
- Alice: Gõ `write_file("BOOTSTRAP.md", "")`
- Bootstrap hoàn thành — BOOTSTRAP.md giờ trống/bỏ qua lần chat tiếp theo

**User thứ hai (bob):**
- BOOTSTRAP.md, SOUL.md, IDENTITY.md, USER.md riêng biệt
- Bob có personality riêng (không phải của alice)
- Bob trải qua bootstrap độc lập

### Ví dụ 3: Regenerate để thay đổi Personality

Sau khi summoning, bạn nhận ra agent nên trang trọng hơn. Dùng `regenerate` (không phải `resummon`) — bạn đang chỉnh sửa personality, không phải thử lại summon thất bại:

```bash
curl -X POST http://localhost:8080/v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer token" \
  -d '{
    "prompt": "Make the tone formal and professional. Remove humor. Add expertise in technical support."
  }'
```

**Luồng:**
1. Trạng thái → `"summoning"`
2. LLM đọc SOUL.md, IDENTITY.md hiện tại
3. LLM áp dụng hướng dẫn chỉnh sửa
4. File được cập nhật, trạng thái → `"active"`
5. File USER.md của user hiện tại được giữ nguyên (không tạo lại)

## Bên trong hệ thống

### Luồng trạng thái

```
open agent:
create → "active"

predefined agent (không có mô tả):
create → "active"

predefined agent (có mô tả):
create → "summoning" → (LLM calls) → "active" | "summon_failed"

regenerate (chỉnh sửa với prompt):
"active" → "summoning" → (LLM calls) → "active" | "summon_failed"

resummon (thử lại từ mô tả gốc):
"active" → "summoning" → (LLM calls) → "active" | "summon_failed"
```

### Event được broadcast

Trong quá trình summoning, client WebSocket nhận progress event:

```json
{
  "name": "agent.summoning",
  "payload": {
    "type": "started",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "file_generated",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "file": "SOUL.md"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "completed",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Dùng những event này để cập nhật dashboard theo thời gian thực.

### File Seeding

Cả summoning và bootstrap đều dựa vào `SeedUserFiles()` và `SeedToStore()`:

**Khi tạo agent:**
- Open: Chưa seed gì (lazy-seed khi user đầu tiên chat)
- Predefined: AGENTS.md, SOUL.md (template), IDENTITY.md (template), v.v. → agent_context_files

**Khi user đầu tiên chat:**
- Open: Tất cả template → user_context_files (SOUL.md, IDENTITY.md, USER.md, BOOTSTRAP.md, AGENTS.md, AGENTS_CORE.md, AGENTS_TASK.md, CAPABILITIES.md, TOOLS.md)
- Predefined: USER.md + `BOOTSTRAP_PREDEFINED.md` → user_context_files

`BOOTSTRAP_PREDEFINED.md` là script onboarding hướng người dùng dành cho predefined agents (khác với `BOOTSTRAP.md` của open agent — kín đáo hơn vì personality của agent đã được thiết lập ở cấp agent).
- File cấp agent (SOUL.md, IDENTITY.md) đã được load từ agent_context_files

**Predefined với USER.md đã cấu hình sẵn:**
Nếu bạn đặt thủ công USER.md ở cấp agent trước khi user đầu tiên chat, nó được dùng làm seed cho USER.md của tất cả user (sau đó mỗi user có bản sao riêng để tuỳ chỉnh).

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Summoning liên tục timeout | Kiểm tra kết nối provider và sự khả dụng của model. Fallback (phương pháp 2 lần gọi) vẫn nên hoàn thành. |
| SOUL.md được tạo ra quá chung chung | Mô tả quá mơ hồ. Re-summon với chi tiết cụ thể hơn: domain, giọng điệu, use case. |
| User không thể tuỳ chỉnh (predefined agent) | Đây là thiết kế — chỉ USER.md là theo user. Chỉnh sửa SOUL.md/IDENTITY.md ở cấp agent dùng re-summon hoặc chỉnh sửa thủ công. |
| Bootstrap không bắt đầu | Kiểm tra BOOTSTRAP.md có được seeded không. Với open agent, nó chỉ được seeded khi user đầu tiên chat. |
| Personality sai sau bootstrap | User có thể đã bỏ qua tuỳ chỉnh SOUL.md. SOUL.md mặc định là template tiếng Anh. Tạo lại hoặc chỉnh sửa thủ công. |

## Tiếp theo

- [Context Files](/context-files) — tham chiếu chi tiết cho từng file
- [Open vs. Predefined](/open-vs-predefined) — hiểu khi nào dùng loại nào
- [Creating Agents](/creating-agents) — hướng dẫn tạo agent từng bước

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
