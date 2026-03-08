> Bản dịch từ [English version](../../agents/system-prompt-anatomy.md)

# Cấu trúc System Prompt

> Hiểu cách GoClaw xây dựng system prompt: 13 phần, lắp ráp động, với cơ chế truncation thông minh để mọi thứ vừa trong context.

## Tổng quan

Mỗi khi agent chạy, GoClaw lắp ráp **system prompt** từ 13 phần. Các phần được sắp xếp có chiến lược: safety trước, tooling sau, rồi mới đến context. Một số phần luôn được bao gồm; một số khác phụ thuộc vào cấu hình agent.

Có hai **prompt mode**:
- **Full mode** (agent chính): tất cả các phần, đầy đủ context
- **Minimal mode** (subagent/cron): ít phần hơn, khởi động nhanh hơn

## 13 Phần theo thứ tự

| # | Phần | Full | Minimal | Mục đích |
|---|---------|------|---------|---------|
| 1 | Identity | ✓ | ✓ | Thông tin channel (Telegram, Discord, v.v.) |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | Hướng dẫn BOOTSTRAP.md (chỉ session đầu tiên) |
| 2 | Tooling | ✓ | ✓ | Danh sách tool có sẵn |
| 3 | Safety | ✓ | ✓ | Quy tắc safety cốt lõi, giới hạn, bảo mật |
| 4 | Skills | ✓ | ✗ | Skill có sẵn (skills.md) — inline hoặc có thể tìm kiếm |
| 5 | Memory Recall | ✓ | ✗ | Cách tìm kiếm/lấy bộ nhớ |
| 6 | Workspace | ✓ | ✓ | Thư mục làm việc, đường dẫn file |
| 6.5 | Sandbox (nếu bật) | ✓ | ✓ | Hướng dẫn dành riêng cho sandbox |
| 7 | User Identity | ✓ | ✗ | ID chủ sở hữu |
| 8 | Time | ✓ | ✓ | Ngày/giờ hiện tại |
| 9 | Messaging | ✓ | ✗ | Định tuyến channel, khớp ngôn ngữ |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt (context subagent, v.v.) |
| 11 | Project Context | ✓ | ✓ | Bootstrap file (SOUL.md, IDENTITY.md, v.v.) |
| 12 | Silent Replies | ✓ | ✗ | Hướng dẫn NO_REPLY |
| 13 | Sub-Agent Spawning | ✓ | ✓ | Hướng dẫn tool spawn |
| 15 | Runtime | ✓ | ✓ | Thông tin model, giới hạn token, định dạng event stream |

## Minimal vs. Full Mode

### Khi nào dùng Minimal Mode

Minimal mode được dùng cho:
- **Subagent** được spawn qua tool `spawn`
- **Cron session** (task lên lịch/tự động)

Tại sao? Để giảm thời gian khởi động và mức sử dụng context. Subagent không cần user identity, memory recall, hay messaging guidance — chỉ cần tooling và safety.

### Khác biệt giữa các phần

**Phần chỉ có trong Full Mode**:
- Skills (phần 4)
- Memory Recall (phần 5)
- User Identity (phần 7)
- Messaging (phần 9)
- Silent Replies (phần 12)

**Phần có trong cả hai**:
- Tất cả phần còn lại (Identity, Tooling, Safety, Workspace, Time, Additional Context, Project Context, Sub-Agent Spawning, Runtime)

## Pipeline Truncation

System prompt có thể dài. GoClaw truncate thông minh để vừa trong context:

### Giới hạn theo từng phần

Mỗi bootstrap context file (SOUL.md, AGENTS.md, v.v.) có giới hạn kích thước riêng. File vượt giới hạn bị truncate với `[... truncated ...]`.

### Tổng ngân sách

**Ngân sách mặc định là 24,000 token**. Có thể cấu hình trong agent config:

```json
{
  "context_window": 200000,
  "compaction_config": {
    "system_prompt_budget_tokens": 24000
  }
}
```

### Thứ tự Truncation

Khi toàn bộ prompt vượt ngân sách, GoClaw truncate theo thứ tự này (ít quan trọng nhất trước):
1. Extra prompt (phần 10)
2. Skills (phần 4)
3. Từng context file riêng lẻ (các phần trong Project Context)

Điều này đảm bảo safety, tooling, và workspace guidance không bao giờ bị cắt.

## Xây dựng Prompt (Luồng đơn giản hoá)

```
Bắt đầu với prompt rỗng

Thêm các phần theo thứ tự:
1. Identity (thông tin channel)
2. First-Run Bootstrap (nếu có)
3. Tooling (tool có sẵn)
4. Safety (quy tắc cốt lõi)
5. Skills (nếu full mode + có skill)
6. Memory Recall (nếu full mode + bật memory)
7. Workspace (thư mục làm việc)
8. Sandbox (nếu có sandbox)
9. User Identity (nếu full mode + có owner)
10. Time (ngày/giờ hiện tại)
11. Messaging (nếu full mode)
12. Additional Context (extra prompt)
13. Project Context (bootstrap file: SOUL.md, AGENTS.md, v.v.)
14. Silent Replies (nếu full mode)
15. Sub-Agent Spawning (nếu có tool spawn)
16. Runtime (thông tin model, giới hạn token)

Kiểm tra tổng kích thước so với ngân sách
Nếu vượt ngân sách: truncate (xem Pipeline Truncation ở trên)

Trả về chuỗi prompt cuối cùng
```

## Bootstrap File trong Project Context

Phần **Project Context** load tối đa 7 file từ workspace hoặc database của agent:

1. **AGENTS.md** — Danh sách subagent có sẵn
2. **SOUL.md** — Personality, giọng điệu, ranh giới của agent
3. **IDENTITY.md** — Tên, emoji, loại sinh vật, avatar
4. **USER.md** — Context theo từng user (tên, sở thích, múi giờ)
5. **USER_PREDEFINED.md** — Quy tắc user cơ bản (cho predefined agent)
6. **BOOTSTRAP.md** — Hướng dẫn lần đầu (user đang onboarding)
7. **TOOLS.md** — Hướng dẫn sử dụng tool cho user (thông tin, không phải định nghĩa tool)
8. **MEMORY.json** — Metadata bộ nhớ đã được index

### Logic hiện diện file

- File là tuỳ chọn; file thiếu sẽ bị bỏ qua
- Nếu **BOOTSTRAP.md** có mặt, các phần được sắp xếp lại và cảnh báo sớm được thêm vào (phần 1.5)
- Với **predefined agent**, file identity được bọc trong tag `<internal_config>` để báo hiệu bảo mật
- Với **open agent**, context file được bọc trong tag `<context_file>`

## Phần nhận thức Sandbox

Nếu agent có `sandbox_enabled: true`:

- **Phần Workspace** hiển thị workdir của container (ví dụ: `/workspace`) thay vì đường dẫn host
- **Phần Sandbox** (6.5) được thêm với chi tiết về:
  - Workdir container
  - Đường dẫn workspace host
  - Mức độ truy cập workspace (none, ro, rw)
- **Phần Tooling** thêm ghi chú: "exec chạy bên trong Docker; bạn không cần `docker run`"

## Ví dụ: Cấu trúc Prompt đầy đủ (Pseudocode)

```
You are a personal assistant running in telegram (direct chat).

## FIRST RUN — MANDATORY
BOOTSTRAP.md is loaded below. You MUST follow it.

## Tooling
- read_file: Read file contents
- write_file: Create or overwrite files
- exec: Run shell commands
- memory_search: Search indexed memory
[... more tools ...]

## Safety
You have no independent goals. Prioritize safety and human oversight.
[... safety rules ...]

## Skills (mandatory)
Before replying, scan <available_skills> below.
[... skills XML ...]

## Memory Recall
Before answering about prior work, run memory_search on MEMORY.md.
[... memory guidance ...]

## Workspace
Your working directory is: /home/alice/.goclaw/agents/default
[... workspace guidance ...]

## User Identity
Owner IDs: alice@example.com. Treat messages from this ID as the user/owner.

Current time: 2026-03-07 15:30 Friday (UTC)

## Messaging
- Reply in current session → automatically routes to Telegram
- Sub-agent orchestration → use spawn tool
- Always match the user's language

## Additional Context
[... extra system prompt or subagent context ...]

# Project Context
The following files define your identity and operational rules.

## SOUL.md
<internal_config name="SOUL.md">
# SOUL.md - Who You Are
Be genuinely helpful, not performatively helpful.
[... personality guidance ...]
</internal_config>

## IDENTITY.md
<internal_config name="IDENTITY.md">
Name: Sage
Emoji: 🔮
[... identity info ...]
</internal_config>

## AGENTS.md
<context_file name="AGENTS.md">
# Available Subagents
- research-bot: Web research and analysis
[... agent list ...]
</context_file>

[... more context files ...]

## Silent Replies
When you have nothing to say, respond with ONLY: NO_REPLY

## Sub-Agent Spawning
To delegate work, use the spawn tool with action=list|steer|kill.

## Runtime
Model: claude-3-5-sonnet-20241022
Context Window: 200,000 tokens
System Prompt Budget: 24,000 tokens
Events: run.started, chunk, tool.call, tool.result, run.completed
```

## Sơ đồ: Lắp ráp System Prompt

```
┌─────────────────────────────────────────┐
│   Agent Config                          │
│   (provider, model, context_window)     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Load Bootstrap Files                  │
│   (SOUL.md, IDENTITY.md, etc.)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Xác định Prompt Mode                  │
│   (Full hay Minimal?)                   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Lắp ráp 13 Phần theo thứ tự          │
│   Bỏ qua nếu mode=minimal              │
│   (Identity, Tooling, Safety, ...)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Kiểm tra tổng kích thước vs. Ngân sách│
│   (mặc định: 24K token)                 │
└────────────┬────────────────────────────┘
             │
        ┌────┴────┐
        │          │
        ▼          ▼
      Vượt?      Dưới?
        │          │
        ▼          │
   Truncate    ┌──▼──────────────────────┐
   (từ ít    │   Trả về Prompt cuối    │
    quan trọng│                         │
    nhất)     └───────────┬─────────────┘
        │                  │
        └──────────────────┘
```

## Ví dụ cấu hình

Để tuỳ chỉnh cách xây dựng system prompt:

```json
{
  "agents": {
    "research-bot": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "context_window": 200000,
      "compaction_config": {
        "system_prompt_budget_tokens": 24000,
        "target_completion_percentage": 0.75
      },
      "memory_config": {
        "enabled": true,
        "max_search_results": 5
      },
      "sandbox_config": {
        "enabled": true,
        "container_dir": "/workspace"
      }
    }
  }
}
```

Agent này sẽ:
- Dùng Claude 3.5 Sonnet
- Có context window 200K token
- Dành 24K token cho system prompt (các phần)
- Bao gồm phần Memory Recall (bật memory)
- Bao gồm phần Sandbox (chạy trong sandbox)

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| System prompt quá dài / dùng nhiều token | Giảm context file (rút ngắn SOUL.md, ít subagent trong AGENTS.md), tắt các phần không dùng (memory, skills) |
| Context file bị truncate với `[... truncated ...]` | Các phần bị cắt từ ít đến quan trọng nhất. Safety và tooling được giữ nguyên; context file bị cắt trước. Tăng ngân sách hoặc rút ngắn file |
| Minimal mode thiếu phần mong đợi | Bình thường — session subagent/cron chỉ lấy AGENTS.md + TOOLS.md. Các phần đầy đủ cần chế độ `PromptFull` |
| Không kiểm soát được ngân sách prompt | Đặt `context_window` trên agent — ngân sách mặc định là 24K nhưng có thể mở rộng theo context window |

## Tiếp theo

- [Editing Personality — Tuỳ chỉnh SOUL.md và IDENTITY.md](editing-personality.md)
- [Context Files — Thêm context dành riêng cho dự án](context-files.md)
- [Creating Agents — Thiết lập cấu hình system prompt](creating-agents.md)
