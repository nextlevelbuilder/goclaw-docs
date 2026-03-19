> Bản dịch từ [English version](#skills)

# Skills

> Đóng gói kiến thức tái sử dụng vào file Markdown và tự động inject vào context của bất kỳ agent nào.

## Tổng quan

Một skill là một thư mục chứa file `SKILL.md`. Khi agent chạy, GoClaw đọc các file skill trong phạm vi và inject nội dung vào system prompt dưới phần `## Available Skills`. Agent sau đó sử dụng kiến thức đó mà không cần bạn lặp lại trong mỗi cuộc hội thoại.

Skills hữu ích để mã hóa các quy trình lặp lại, hướng dẫn sử dụng tool, kiến thức domain, hoặc quy ước code mà agent nên luôn tuân theo.

## Định dạng SKILL.md

Mỗi skill nằm trong thư mục riêng. Tên thư mục là **slug** của skill — định danh duy nhất dùng cho lọc và tìm kiếm.

```
~/.goclaw/skills/
└── code-reviewer/
    └── SKILL.md
```

File `SKILL.md` có block YAML frontmatter tùy chọn theo sau là nội dung skill:

```markdown
---
name: Code Reviewer
description: Guidelines for reviewing pull requests — style, security, and performance checks.
---

## How to Review Code

When asked to review code, always check:
1. **Security** — SQL injection, XSS, hardcoded secrets
2. **Error handling** — all errors returned or logged
3. **Tests** — new logic has corresponding test coverage

Use `{baseDir}` to reference files alongside this SKILL.md:
- Checklist: {baseDir}/review-checklist.md
```

Placeholder `{baseDir}` được thay thế lúc tải bằng đường dẫn tuyệt đối đến thư mục skill, để bạn có thể tham chiếu các file đi kèm.

**Các trường frontmatter:**

| Trường | Mô tả |
|---|---|
| `name` | Tên hiển thị dễ đọc (mặc định là tên thư mục) |
| `description` | Tóm tắt một dòng dùng bởi `skill_search` để khớp truy vấn |

## Phân cấp 5 tầng

GoClaw tải skill từ năm vị trí theo thứ tự ưu tiên. Skill ở vị trí ưu tiên cao hơn ghi đè skill cùng slug từ vị trí thấp hơn:

| Ưu tiên | Vị trí | Nhãn nguồn |
|---|---|---|
| 1 (cao nhất) | `<workspace>/skills/` | `workspace` |
| 2 | `<workspace>/.agents/skills/` | `agents-project` |
| 3 | `~/.agents/skills/` | `agents-personal` |
| 4 | `~/.goclaw/skills/` | `global` |
| 5 (thấp nhất) | Tích hợp sẵn (đóng gói với binary) | `builtin` |

Skills upload qua Dashboard được lưu trong `~/.goclaw/skills-store/` (thư mục được quản lý, backed bởi PostgreSQL) và hoạt động ở mức `global` cho các slot chưa được chiếm bởi nguồn ưu tiên cao hơn.

**Ví dụ về precedence:** nếu bạn có skill `code-reviewer` cả trong `~/.goclaw/skills/` và `<workspace>/skills/`, phiên bản workspace sẽ thắng.

## Hot Reload

GoClaw theo dõi tất cả thư mục skill bằng `fsnotify`. Khi bạn tạo, sửa, hoặc xóa `SKILL.md`, thay đổi được áp dụng trong vòng 500ms — không cần khởi động lại. Watcher tăng bộ đếm version nội bộ; agent so sánh version cache của mình trên mỗi request và reload skill nếu bộ đếm thay đổi.

```
# Đặt skill mới vào — agent tự nhận trên request tiếp theo
mkdir ~/.goclaw/skills/my-new-skill
echo "---\nname: My Skill\ndescription: Does something useful.\n---\n\n## Instructions\n..." \
  > ~/.goclaw/skills/my-new-skill/SKILL.md
```

## Upload qua Dashboard

Vào **Skills → Upload** và kéo thả file ZIP. ZIP phải chứa một skill duy nhất với `SKILL.md` nằm ở root hoặc bên trong một thư mục cấp cao nhất:

```
# SKILL.md ở root
my-skill.zip
└── SKILL.md

# hoặc nằm trong một thư mục
my-skill.zip
└── code-reviewer/
    ├── SKILL.md
    └── review-checklist.md
```

Skills được upload lưu trong cấu trúc thư mục có version dưới thư mục skills được quản lý (`~/.goclaw/skills-store/` theo mặc định):

```
~/.goclaw/skills-store/<slug>/<version>/SKILL.md
```

Metadata (tên, mô tả, visibility, grants) lưu trong PostgreSQL; nội dung file lưu trên đĩa. GoClaw luôn phục vụ version có số cao nhất. Các version cũ được giữ để rollback.

Skills được upload qua Dashboard mặc định có visibility **internal** — có thể truy cập ngay khi bạn cấp quyền cho agent hoặc user.

## Các tool skill tích hợp

GoClaw cung cấp ba tool tích hợp mà agent dùng để khám phá và kích hoạt skill lúc runtime.

### skill_search

Agent tìm kiếm skill bằng `skill_search`. Tìm kiếm sử dụng **chỉ mục BM25** được xây dựng từ tên và mô tả của mỗi skill, với tùy chọn hybrid search (BM25 + vector embeddings) khi có embedding provider được cấu hình.

```
# Agent gọi tool này nội bộ — bạn không gọi trực tiếp
skill_search(query="how to review a pull request", max_results=5)
```

Tool trả về kết quả được xếp hạng với tên, mô tả, đường dẫn vị trí, và điểm số. Sau khi nhận kết quả, agent gọi `use_skill` rồi `read_file` để tải nội dung skill.

Chỉ mục được rebuild bất cứ khi nào bộ đếm version của loader tăng (tức là sau bất kỳ sự kiện hot-reload hoặc khởi động nào).

### use_skill

Tool đánh dấu observability nhẹ. Agent gọi `use_skill` trước khi đọc file skill, để việc kích hoạt skill hiển thị trong traces và real-time events. Tool này không tải nội dung nào.

```
use_skill(name="code-reviewer")
# sau đó:
read_file(path="/path/to/code-reviewer/SKILL.md")
```

### publish_skill

Agent có thể đăng ký thư mục skill cục bộ vào cơ sở dữ liệu hệ thống bằng `publish_skill`. Thư mục phải chứa `SKILL.md` với trường `name` trong frontmatter. Skill tự động được cấp quyền cho agent gọi sau khi publish.

```
publish_skill(path="./skills/my-skill")
```

Skill được lưu với visibility `private` và tự động cấp quyền cho agent gọi. Admin có thể cấp quyền cho agent khác hoặc nâng visibility qua Dashboard hoặc API.

## Cấp quyền Skill cho Agent (Managed Mode)

Skill được publish qua `publish_skill` mặc định có visibility **private**. Skill được upload qua Dashboard mặc định có visibility **internal**. Dù cách nào, bạn phải **grant** (cấp quyền) skill cho agent trước khi nó được inject vào context của agent đó.

### Qua Dashboard

1. Vào **Skills** ở sidebar
2. Click vào skill bạn muốn cấp quyền
3. Trong phần **Agent Grants**, chọn agent và click **Grant**
4. Skill sẽ được inject vào context của agent đó từ request tiếp theo

Để thu hồi quyền, tắt toggle của agent trong danh sách grants.

### Qua API

Cấp quyền skill cho agent:

```bash
curl -X POST http://localhost:8080/v1/skills/{id}/grants/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_UUID", "version": 1}'
```

Thu hồi quyền agent:

```bash
curl -X DELETE http://localhost:8080/v1/skills/{id}/grants/agent/{agent_id} \
  -H "Authorization: Bearer $TOKEN"
```

Cấp quyền skill cho user cụ thể (để skill xuất hiện trong session của user đó):

```bash
curl -X POST http://localhost:8080/v1/skills/{id}/grants/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user@example.com"}'
```

Thu hồi quyền user:

```bash
curl -X DELETE http://localhost:8080/v1/skills/{id}/grants/user/{user_id} \
  -H "Authorization: Bearer $TOKEN"
```

### Các mức Visibility

| Mức | Ai có thể truy cập |
|---|---|
| `private` | Chỉ chủ sở hữu skill (người upload) |
| `internal` | Agent và user được cấp quyền truy cập |
| `public` | Tất cả agent và user |

## Ví dụ

### Hướng dẫn SQL style giới hạn trong workspace

```
my-project/
└── skills/
    └── sql-style/
        └── SKILL.md
```

```markdown
---
name: SQL Style Guide
description: Team conventions for writing PostgreSQL queries in this project.
---

## SQL Conventions

- Use `$1, $2` positional parameters — never string interpolation
- Always use `RETURNING id` on INSERT
- Table and column names: snake_case
- Never use `SELECT *` in application queries
```

### Nhắc nhở "trả lời ngắn gọn" toàn cục

```
~/.goclaw/skills/
└── concise-responses/
    └── SKILL.md
```

```markdown
---
name: Concise Responses
description: Keep all responses short, bullet-pointed, and actionable.
---

Always:
- Lead with the answer, not the explanation
- Use bullet points for lists of 3 or more items
- Keep code examples under 20 lines
```

## Tiến hóa Skill (Skill Evolution)

Khi `skill_evolve` được bật trong config của agent, agent sẽ có thêm tool `skill_manage` cho phép tạo, cập nhật, và version skill ngay trong cuộc hội thoại — một vòng lặp học tập giúp agent tự cải thiện knowledge base của mình. Khi `skill_evolve` là **off** (mặc định), tool `skill_manage` bị ẩn hoàn toàn khỏi danh sách tool của LLM.

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| Skill không xuất hiện trong agent | Cấu trúc thư mục sai (SKILL.md không nằm trong thư mục con) | Đảm bảo đường dẫn là `<skills-dir>/<slug>/SKILL.md` |
| Thay đổi không được nhận | Watcher chưa khởi động (các thiết lập không dùng Docker) | Khởi động lại GoClaw; xác minh `skills watcher started` trong log |
| Skill ưu tiên thấp hơn được dùng thay cho skill của bạn | Xung đột tên — slug tồn tại ở tầng ưu tiên cao hơn | Dùng slug duy nhất, hoặc đặt skill của bạn ở vị trí ưu tiên cao hơn |
| `skill_search` không trả về kết quả | Chỉ mục chưa được xây dựng (request đầu tiên) hoặc không có description trong frontmatter | Thêm `description` vào frontmatter; chỉ mục rebuild trên hot-reload tiếp theo |
| Upload ZIP thất bại | Không tìm thấy `SKILL.md` trong ZIP | Đặt `SKILL.md` ở root ZIP hoặc bên trong một thư mục cấp cao nhất |

## Tiếp theo

- [MCP Integration](../advanced/mcp-integration.md) — kết nối server tool bên ngoài
- [Custom Tools](../advanced/custom-tools.md) — thêm tool shell-backed cho agent
- [Scheduling & Cron](../advanced/scheduling-cron.md) — chạy agent theo lịch

<!-- goclaw-source: 941a965 | updated: 2026-03-19 -->
