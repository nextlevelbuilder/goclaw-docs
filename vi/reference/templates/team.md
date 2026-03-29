> Bản dịch từ [English version](/template-team)

# TEAM.md (System-Generated)

> File context động được inject cho các agent trong một team — được tạo ra lúc runtime, không bao giờ được tạo thủ công hay lưu trên disk.

## Tổng quan

`TEAM.md` là một **virtual context file** mà GoClaw tự động tạo ra cho mọi agent thuộc một team. Khác với `SOUL.md` hay `AGENTS.md`, bạn không bao giờ viết hay chỉnh sửa file này — hệ thống xây dựng nó mới hoàn toàn mỗi lần agent chạy, dựa trên cấu hình team hiện tại.

Nó cho agent biết ai là đồng đội, họ giữ vai trò gì, và cách cộng tác thông qua tool `team_tasks`.

**Điểm chính:**
- Không phải file trên disk — chỉ tồn tại trong system prompt
- Được tạo lại mỗi lần agent chạy
- Bỏ qua trong bootstrap (lần chạy đầu tiên) để giảm nhiễu
- Được bọc trong thẻ `<system_context>` trong prompt (báo hiệu "đừng đọc/ghi file này")

---

## Khi nào được Inject

TEAM.md được inject khi GoClaw resolve agent lúc runtime:

1. **Agent là thành viên team** — hệ thống kiểm tra agent có thuộc team nào không
2. **Chưa có sẵn** — nếu TEAM.md đã được load trước đó, hệ thống bỏ qua việc tạo lại
3. **Bootstrap bị bỏ qua** — ở lần chạy đầu tiên (bootstrap session), TEAM.md được bỏ qua để giữ phần giới thiệu gọn gàng

Khi agent **không** thuộc team nào, một virtual file khác (`AVAILABILITY.md`) được inject thay thế — xem [Ghi chú về AVAILABILITY.md](#ghi-chú-về-availabilitymd) bên dưới.

---

## Nội dung Generated theo Role

Nội dung của TEAM.md khác nhau tùy theo role của agent trong team.

### Tất cả Agent (phần header chung)

Mọi agent đều thấy tên team, mô tả, role của bản thân, và danh sách thành viên đầy đủ:

```
# Team: <tên-team>
<mô-tả-team>
Role: <lead|member|reviewer>

## Members
This is the complete and authoritative list of your team. Do NOT use tools to verify this.

- **you** (lead)
- **Alice** `alice` (member): Researcher, phụ trách thu thập dữ liệu
- **Bob** `bob` (reviewer): Review output cuối cùng
```

Mỗi dòng thành viên bao gồm:
- Display name (in đậm) và agent key (backtick) cho các thành viên khác
- Role trong ngoặc đơn
- Mô tả frontmatter tùy chọn sau dấu hai chấm

### Lead

Lead thấy toàn bộ hướng dẫn orchestration. Nội dung thay đổi theo phiên bản team:

**Team V2 (orchestration nâng cao):**

```
## Workflow

Delegate work to team members using `team_tasks` with `assignee`.

    team_tasks(action="create", subject="...", description="...", assignee="agent-key")

The system auto-dispatches to the assigned member and auto-completes when done.
Do NOT use `spawn` for team delegation — `spawn` is only for self-clone subagent work.

Rules:
- Always specify `assignee` — match member expertise from the list above
- Check task board first — ALWAYS call `team_tasks(action="list")` before creating tasks
- Create all tasks first, then briefly tell the user what you delegated
- Do NOT add confirmations ("Done!", "Got it!") — just state what was assigned
- Results arrive automatically — do NOT present partial results
- Prefer delegation — if the user asks to involve the team, delegate immediately
- Do NOT block on completed tasks — pass results in the new task's description
- For dependency chains: use `blocked_by` to sequence tasks

## Task Decomposition (CRITICAL)

NEVER assign one big task to one member. ALWAYS break user requests into small, atomic tasks:

1. Analyze the request — identify distinct steps, deliverables, and SKILLS needed
2. Match by SKILL, not topic — assign based on what the task DOES, not what it's ABOUT
3. Decompose into tasks where each has ONE clear deliverable
4. Distribute across members — use ALL available members, not just one
5. Sequence with `blocked_by` — if task B needs task A's output, set blocked_by=[task_A_id]
   IMPORTANT: `blocked_by` requires real task UUIDs. Create dependency tasks FIRST, get their IDs,
   THEN create dependent tasks. Do NOT use placeholders like "task_1".

## Orchestration Patterns

- Parallel: Independent tasks → create all with different assignees
- Sequential: Create Task A first → get its UUID → create Task B with blocked_by=[A_id]
- Mixed: Create A+B (parallel) → create C with blocked_by=[A_id, B_id]

## Follow-up Reminders

When you need user input: create+claim task, then ask_user with text=<question>.
ONLY use when you have a question for the user — NOT for waiting on teammates.
System auto-sends reminders. Call clear_ask_user when user replies.
```

**Team V1 (cơ bản):**

```
## Workflow

Create a task with `team_tasks` (with `assignee`), then the system dispatches automatically.
Tasks auto-complete when the member finishes.

Rules:
- Always specify `assignee` when creating tasks
- Create all tasks first, then briefly tell the user what you delegated
- Do NOT add confirmations ("Done!", "Got it!") — just state what was assigned
- Results arrive automatically — do NOT present partial results
```

Lead cũng thấy phần **Reviewers** nếu team có thành viên với role reviewer:

```
## Reviewers
Reviewers evaluate quality-critical task results.

- **Bob** `bob`: Review output cuối cùng
```

### Member

Member thấy hướng dẫn tập trung, tối giản:

```
## Workflow

As a member, focus entirely on your assigned task.

Rules:
- Stay on task — do not deviate from the assignment
- Your final response becomes the task result — make it clear, complete, and actionable
- For long tasks, report progress: team_tasks(action="progress", percent=50, text="status")
- The task_id is auto-resolved — you don't need to specify it
- Task completion is automatic when your run finishes
```

### Reviewer

Reviewer thấy hướng dẫn member cộng thêm một dòng ở đầu:

```
You are a **reviewer**. When evaluating, respond with **APPROVED** or **REJECTED: <feedback>**.
```

---

## Ví dụ Đầy đủ (Lead, Team V2)

Dưới đây là ví dụ thực tế về những gì một lead agent thấy trong system prompt:

```
<system_context name="TEAM.md">
# Team: content-team
A multi-agent team for producing long-form content.
Role: lead

## Members
This is the complete and authoritative list of your team. Do NOT use tools to verify this.

- **you** (lead)
- **Alice** `alice` (member): Researcher — phụ trách thu thập dữ liệu và kiểm tra thông tin
- **Charlie** `charlie` (member): Writer — soạn bài viết và tóm tắt
- **Bob** `bob` (reviewer): Review output cuối cùng về độ chính xác và giọng văn

## Reviewers
Reviewers evaluate quality-critical task results.

- **Bob** `bob`: Review output cuối cùng về độ chính xác và giọng văn

## Workflow

Delegate work to team members using `team_tasks` with `assignee`.
...
</system_context>
```

---

## Ghi chú về AVAILABILITY.md

Khi agent **không** thuộc team nào, GoClaw inject một virtual file nhỏ gọi là `AVAILABILITY.md` thay vì TEAM.md. Toàn bộ nội dung của nó là:

```
You are NOT part of any team. Do not use team_tasks or team_message tools.
```

Điều này ngăn agent lãng phí tool call để kiểm tra các tính năng team không tồn tại.

---

## Xem thêm

- [Tổng quan Agent Teams](/teams-what-are-teams) — cách tạo và quản lý team
- [Delegation & Handoff](/teams-delegation) — cách lead delegate task cho member
- [DELEGATION.md Template](delegation.md) — virtual file anh em dành cho subagent spawning

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
