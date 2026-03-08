> Bản dịch từ [English version](../../advanced/skills.md)

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

Vào **Skills → Upload** và kéo thả file ZIP. ZIP phải chứa một skill mỗi thư mục cấp cao nhất:

```
my-skills.zip
├── code-reviewer/
│   └── SKILL.md
└── sql-expert/
    ├── SKILL.md
    └── query-patterns.md
```

Skills được upload lưu trong cấu trúc thư mục có version dưới thư mục skills được quản lý (`~/.goclaw/skills-store/` theo mặc định):

```
~/.goclaw/skills-store/<slug>/<version>/SKILL.md
```

Metadata (tên, mô tả, visibility, grants) lưu trong PostgreSQL; nội dung file lưu trên đĩa. GoClaw luôn phục vụ version có số cao nhất. Các version cũ được giữ để rollback.

## Tool skill_search

Agent có thể tìm kiếm skill lúc runtime bằng tool tích hợp `skill_search`. Tìm kiếm sử dụng **chỉ mục BM25** được xây dựng từ tên và mô tả của mỗi skill. Tham số `k1=1.2` và `b=0.75` là các giá trị mặc định BM25 tiêu chuẩn.

```
# Agent gọi tool này nội bộ — bạn không gọi trực tiếp
skill_search(query="how to review a pull request", max_results=5)
```

Tool trả về kết quả được xếp hạng với tên, mô tả, đường dẫn vị trí, và điểm BM25. Agent sau đó đọc nội dung `SKILL.md` từ đường dẫn được trả về.

Chỉ mục được rebuild bất cứ khi nào bộ đếm version của loader tăng (tức là sau bất kỳ sự kiện hot-reload hoặc khởi động nào).

## Cấp quyền Skill cho Agent (Managed Mode)

Skill được upload mặc định có visibility **private** — chỉ người upload mới thấy. Để agent có thể sử dụng skill, bạn phải **grant** (cấp quyền) cho agent đó. Việc grant tự động chuyển visibility từ `private` sang `internal`.

### Qua Dashboard

1. Vào **Skills** ở sidebar
2. Click vào skill bạn muốn cấp quyền
3. Trong phần **Agent Grants**, chọn agent và click **Grant**
4. Skill sẽ được inject vào context của agent đó từ request tiếp theo

Để thu hồi quyền, tắt toggle của agent trong danh sách grants. Khi tất cả grants bị xóa, visibility tự động quay về `private`.

### Qua API

Cấp quyền skill cho agent:

```bash
curl -X POST http://localhost:9090/v1/skills/{skill_id}/grants/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_UUID", "version": 1}'
```

Thu hồi quyền:

```bash
curl -X DELETE http://localhost:9090/v1/skills/{skill_id}/grants/agent/{agent_id} \
  -H "Authorization: Bearer $TOKEN"
```

Cấp quyền skill cho user cụ thể (để skill xuất hiện trong session của user đó):

```bash
curl -X POST http://localhost:9090/v1/skills/{skill_id}/grants/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user@example.com"}'
```

### Các mức Visibility

| Mức | Ai có thể truy cập |
|---|---|
| `private` | Chỉ chủ sở hữu skill (người upload) |
| `internal` | Agent và user được cấp quyền truy cập |
| `public` | Tất cả agent và user |

> **Lưu ý:** Grant tự động chuyển `private` → `internal`. Thu hồi tất cả grants tự động chuyển `internal` → `private`.

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

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| Skill không xuất hiện trong agent | Cấu trúc thư mục sai (SKILL.md không nằm trong thư mục con) | Đảm bảo đường dẫn là `<skills-dir>/<slug>/SKILL.md` |
| Thay đổi không được nhận | Watcher chưa khởi động (các thiết lập không dùng Docker) | Khởi động lại GoClaw; xác minh `skills watcher started` trong log |
| Skill ưu tiên thấp hơn được dùng thay cho skill của bạn | Xung đột tên — slug tồn tại ở tầng ưu tiên cao hơn | Dùng slug duy nhất, hoặc đặt skill của bạn ở vị trí ưu tiên cao hơn |
| `skill_search` không trả về kết quả | Chỉ mục chưa được xây dựng (request đầu tiên) hoặc không có description trong frontmatter | Thêm `description` vào frontmatter; chỉ mục rebuild trên hot-reload tiếp theo |
| Upload ZIP thất bại | Các entry cấp cao nhất là file, không phải thư mục | Đảm bảo ZIP có cấu trúc `<slug>/SKILL.md` |

## Tiếp theo

- [MCP Integration](../advanced/mcp-integration.md) — kết nối server tool bên ngoài
- [Custom Tools](../advanced/custom-tools.md) — thêm tool shell-backed cho agent
- [Scheduling & Cron](../advanced/scheduling-cron.md) — chạy agent theo lịch
