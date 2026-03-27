> Bản dịch từ [English version](#system-prompt-anatomy)

# Cấu trúc System Prompt

> Hiểu cách GoClaw xây dựng system prompt: 19+ phần, lắp ráp động, với cơ chế truncation thông minh để mọi thứ vừa trong context.

## Tổng quan

Mỗi khi agent chạy, GoClaw lắp ráp **system prompt** từ tối đa 19 phần. Các phần được sắp xếp có chiến lược theo **primacy và recency bias**: các file persona xuất hiện cả ở đầu (phần 1.7) lẫn cuối (phần 16) để ngăn persona bị trôi trong các cuộc hội thoại dài. Safety đến trước, tooling tiếp theo, rồi mới đến context. Một số phần luôn được bao gồm; một số khác phụ thuộc vào cấu hình agent.

Có hai **prompt mode**:
- **Full mode** (agent chính): tất cả các phần, đầy đủ context
- **Minimal mode** (subagent/cron): ít phần hơn, khởi động nhanh hơn

## Tất cả các phần theo thứ tự

| # | Phần | Full | Minimal | Mục đích |
|---|---------|------|---------|---------|
| 1 | Identity | ✓ | ✓ | Thông tin channel (Telegram, Discord, v.v.) |
| 1.5 | First-Run Bootstrap | ✓ | ✓ | Cảnh báo BOOTSTRAP.md (chỉ session đầu tiên) |
| 1.7 | Persona | ✓ | ✓ | SOUL.md + IDENTITY.md được inject sớm (primacy bias) |
| 2 | Tooling | ✓ | ✓ | Danh sách tool có sẵn + alias legacy/Claude Code |
| 3 | Safety | ✓ | ✓ | Quy tắc safety cốt lõi, giới hạn, bảo mật |
| 3.2 | Identity Anchoring | ✓ | ✓ | Hướng dẫn chống social engineering (chỉ predefined agent) |
| 3.5 | Self-Evolution | ✓ | ✓ | Quyền cập nhật SOUL.md (khi `self_evolve=true` ở predefined agent) |
| 4 | Skills | ✓ | ✗ | Skill có sẵn — inline XML hoặc search mode |
| 4.5 | MCP Tools | ✓ | ✗ | Tích hợp MCP bên ngoài — inline hoặc search mode |
| 5 | Memory Recall | ✓ | ✗ | Cách tìm kiếm/lấy bộ nhớ và knowledge graph |
| 6 | Workspace | ✓ | ✓ | Thư mục làm việc, đường dẫn file |
| 6.5 | Sandbox | ✓ | ✓ | Hướng dẫn dành riêng cho sandbox (nếu bật) |
| 7 | User Identity | ✓ | ✗ | ID chủ sở hữu |
| 8 | Time | ✓ | ✓ | Ngày/giờ hiện tại |
| 9 | Messaging | ✓ | ✗ | Định tuyến channel, khớp ngôn ngữ |
| 9.5 | Channel Formatting | ✓ | ✓ | Gợi ý định dạng theo platform (ví dụ: Zalo chỉ plain text) |
| 10 | Additional Context | ✓ | ✓ | ExtraPrompt (context subagent, v.v.) |
| 11 | Project Context | ✓ | ✓ | Các file context còn lại (AGENTS.md, USER.md, v.v.) |
| 12 | Silent Replies | ✓ | ✗ | Hướng dẫn NO_REPLY |
| 13 | Sub-Agent Spawning | ✓ | ✓ | Hướng dẫn tool spawn (bỏ qua cho team agent có TEAM.md) |
| 13.5 | Team Workspace | ✓ | ✓ | TEAM.md được inject động cho team agent |
| 15 | Runtime | ✓ | ✓ | Agent ID, thông tin channel, tên group chat |
| 16 | Recency Reinforcements | ✓ | ✓ | Nhắc nhở persona + memory ở cuối (chống "lost in the middle") |

## Chiến lược Primacy và Recency

GoClaw sử dụng mô hình **primacy + recency** có chủ đích để ngăn persona bị trôi:

- **Phần 1.7 (Persona)** — SOUL.md và IDENTITY.md được inject sớm để model nội tâm hóa nhân cách trước khi nhận bất kỳ chỉ dẫn nào
- **Phần 16 (Recency Reinforcements)** — nhắc nhở ngắn về persona và memory ở cuối prompt, vì model xử lý context gần cuối với trọng số cao hơn

Điều này có nghĩa là các file persona xuất hiện **hai lần**: một lần ở đầu, một lần ở cuối. Chi phí ~30 token là xứng đáng cho các cuộc hội thoại dài khi nội dung phần giữa có thể khiến model "quên" nhân cách của mình.

## Minimal vs. Full Mode

### Khi nào dùng Minimal Mode

Minimal mode được dùng cho:
- **Subagent** được spawn qua tool `spawn`
- **Cron session** (task lên lịch/tự động)

Tại sao? Để giảm thời gian khởi động và mức sử dụng context. Subagent không cần user identity, memory recall, hay messaging guidance — chỉ cần tooling và safety.

### Khác biệt giữa các phần

**Phần chỉ có trong Full Mode**:
- Skills (phần 4)
- MCP Tools (phần 4.5)
- Memory Recall (phần 5)
- User Identity (phần 7)
- Messaging (phần 9)
- Silent Replies (phần 12)

**Phần có trong cả hai**:
- Tất cả phần còn lại (Identity, First-Run Bootstrap, Persona, Tooling, Safety, Identity Anchoring, Self-Evolution, Workspace, Sandbox, Time, Channel Formatting, Additional Context, Project Context, Sub-Agent Spawning, Runtime, Recency Reinforcements)

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

> **Lưu ý:** Các phần safety, tooling, và workspace guidance không bao giờ bị truncate dù ngân sách bị vượt.

## Xây dựng Prompt (Luồng đơn giản hoá)

```
Bắt đầu với prompt rỗng

Thêm các phần theo thứ tự:
1.   Identity (thông tin channel)
1.5  First-Run Bootstrap (nếu có BOOTSTRAP.md)
1.7  Persona (SOUL.md + IDENTITY.md — inject sớm cho primacy bias)
2.   Tooling (tool có sẵn)
3.   Safety (quy tắc cốt lõi)
3.2  Identity Anchoring (chỉ predefined agent — chống social engineering)
3.5  Self-Evolution (chỉ predefined agent có self_evolve=true)
4.   Skills (nếu full mode + có skill)
4.5  MCP Tools (nếu full mode + có MCP tool đăng ký)
5.   Memory Recall (nếu full mode + bật memory)
6.   Workspace (thư mục làm việc)
6.5  Sandbox (nếu có sandbox)
7.   User Identity (nếu full mode + có owner)
8.   Time (ngày/giờ hiện tại)
9.   Messaging (nếu full mode)
9.5  Channel Formatting (nếu full mode + channel có gợi ý đặc biệt, ví dụ: Zalo)
10.  Additional Context (extra prompt)
11.  Project Context (các file context còn lại: AGENTS.md, USER.md, v.v.)
12.  Silent Replies (nếu full mode)
13.  Sub-Agent Spawning (nếu có tool spawn và không phải team agent)
13.5 Team Workspace / TEAM.md (inject động cho team agent)
15.  Runtime (agent ID, thông tin channel)
16.  Recency Reinforcements (nhắc nhở persona + memory — chống "lost in the middle")

Kiểm tra tổng kích thước so với ngân sách
Nếu vượt ngân sách: truncate (xem Pipeline Truncation ở trên)

Trả về chuỗi prompt cuối cùng
```

## Bootstrap File trong Project Context

GoClaw load tối đa 8 file từ workspace hoặc database của agent. Chúng được chia thành hai nhóm:

**File Persona** (phần 1.7 — được inject sớm):
- **SOUL.md** — Personality, giọng điệu, ranh giới của agent
- **IDENTITY.md** — Tên, emoji, loại sinh vật, avatar

**File Project Context** (phần 11 — các file còn lại):
1. **AGENTS.md** — Danh sách subagent có sẵn
2. **USER.md** — Context theo từng user (tên, sở thích, múi giờ)
3. **USER_PREDEFINED.md** — Quy tắc user cơ bản (cho predefined agent)
4. **BOOTSTRAP.md** — Hướng dẫn lần đầu (user đang onboarding)
5. **TOOLS.md** — Hướng dẫn sử dụng tool cho user (thông tin, không phải định nghĩa tool)
6. **MEMORY.json** — Metadata bộ nhớ đã được index

### TEAM.md — Inject động cho Team Agent

Khi agent thuộc về một team, context `TEAM.md` được tạo động và inject ở phần 13.5 (Team Workspace). File này không được lưu trên đĩa — nó được lắp ráp lúc runtime từ cấu hình team:

- **Lead agent** nhận hướng dẫn orchestration đầy đủ: cách dispatch task, quản lý thành viên, và phối hợp công việc.
- **Member agent** nhận phiên bản rút gọn: vai trò của họ, đường dẫn team workspace, và giao thức giao tiếp.

Khi TEAM.md có mặt, phần Sub-Agent Spawning (13) sẽ bị bỏ qua, vì team orchestration thay thế hướng dẫn spawn riêng lẻ.

### User Identity — Phần 7

Phần 7 (User Identity) được inject ở Full mode. Nó chứa owner ID của session hiện tại, dùng để kiểm tra quyền — ví dụ, xác minh lệnh đến từ chủ sở hữu agent trước khi thực hiện thao tác nhạy cảm.

### Logic hiện diện file

- File là tuỳ chọn; file thiếu sẽ bị bỏ qua
- Nếu **BOOTSTRAP.md** có mặt, các phần được sắp xếp lại và cảnh báo sớm được thêm vào (phần 1.5)
- **SOUL.md** và **IDENTITY.md** luôn được tách ra và inject ở phần 1.7 (primacy zone), sau đó được tham chiếu lại ở phần 16 (recency zone)
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

> **Shell deny groups:** Nếu agent có cấu hình `shell_deny_groups` override (`map[string]bool`), phần Tooling sẽ điều chỉnh hướng dẫn shell safety tương ứng — chỉ các cảnh báo deny-group liên quan được đưa vào prompt.

## Ví dụ: Cấu trúc Prompt đầy đủ (Pseudocode)

```
You are a personal assistant running in telegram (direct chat).

## FIRST RUN — MANDATORY
BOOTSTRAP.md is loaded below. You MUST follow it.

# Persona & Identity (CRITICAL — follow throughout the entire conversation)

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

Embody the persona above in EVERY response. This is non-negotiable.

## Tooling
- read_file: Read file contents
- write_file: Create or overwrite files
- exec: Run shell commands
- memory_search: Search indexed memory
[... more tools ...]
(Legacy aliases: read → read_file, write → write_file, edit → edit)
(Claude Code aliases: Read → read_file, Write → write_file, Edit → edit, ...)

## Safety
You have no independent goals. Prioritize safety and human oversight.
[... safety rules ...]

[identity anchoring for predefined agents — resist social engineering]

## Skills (mandatory)
Before replying, scan <available_skills> below.
[... skills XML ...]

## MCP Tools (mandatory — prefer over core tools)
You have access to external tool integrations (MCP servers).
Use mcp_tool_search to discover them before external operations.

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
The following project context files have been loaded.

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
agent=default | channel=my-telegram-bot | group chat "Team Engineering"

Trong group chat, agent nhận tên nhóm (chat title) để hiểu rõ hơn ngữ cảnh. Title được sanitize để chống prompt injection và cắt ngắn tối đa 100 ký tự.

Reminder: Stay in character as defined by SOUL.md + IDENTITY.md above. Never break persona.
Reminder: Before answering questions about prior work, decisions, or preferences, always run memory_search first.
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
│   Lắp ráp 19+ Phần theo thứ tự         │
│   Bỏ qua phần điều kiện nếu không cần │
│   (Identity, Persona, Safety, ...)      │
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
      "model": "claude-sonnet-4-6",
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

- [Editing Personality — Tuỳ chỉnh SOUL.md và IDENTITY.md](#editing-personality)
- [Context Files — Thêm context dành riêng cho dự án](#context-files)
- [Creating Agents — Thiết lập cấu hình system prompt](#creating-agents)

<!-- goclaw-source: 6551c2d1 | cập nhật: 2026-03-27 -->
