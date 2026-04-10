# Tiến Hóa Agent

> Cho phép predefined agents tinh chỉnh phong cách giao tiếp và xây dựng các skill có thể tái sử dụng theo thời gian — tự động, với sự đồng ý của bạn.

## Tổng Quan

GoClaw cung cấp ba hệ thống con cho phép predefined agents phát triển hành vi qua các cuộc hội thoại. Cả ba đều **opt-in** và **chỉ dành cho predefined agents** — open agents không được hỗ trợ.

| Hệ thống con | Chức năng | Config key |
|---|---|---|
| Self-Evolution | Agent tinh chỉnh giọng điệu/phong cách (SOUL.md) và chuyên môn (CAPABILITIES.md) | `self_evolve` |
| Skill Learning Loop | Agent ghi lại quy trình có thể tái sử dụng thành skill | `skill_evolve` |
| Skill Management | Tạo, vá, xóa và cấp quyền skill | `skill_manage` tool |

Cả `self_evolve` và `skill_evolve` đều tắt theo mặc định. Bật chúng theo từng agent trong **Agent Settings → Config tab**.

---

## Self-Evolution (SOUL.md + CAPABILITIES.md)

### Chức năng

Khi `self_evolve` được bật, agent có thể cập nhật hai file context của chính nó trong cuộc hội thoại:

- **`SOUL.md`** — để tinh chỉnh phong cách giao tiếp (tone, voice, từ vựng, style)
- **`CAPABILITIES.md`** — để tinh chỉnh chuyên môn, kỹ năng kỹ thuật, và kiến thức chuyên biệt

Không có tool riêng cho việc này — agent sử dụng `write_file` tiêu chuẩn. Một context file interceptor đảm bảo chỉ có `SOUL.md` và `CAPABILITIES.md` được phép ghi; `IDENTITY.md` và `AGENTS.md` luôn bị khóa.

Thay đổi diễn ra dần dần. Agent được hướng dẫn chỉ cập nhật khi nhận thấy rõ ràng các xu hướng từ phản hồi của người dùng — không phải mỗi lượt.

### Cách bật

| Cài đặt | Vị trí | Mặc định |
|---|---|---|
| `self_evolve` | Agent Settings → General tab → Self-Evolution toggle | `false` |

Chỉ hiển thị cho predefined agents. Cài đặt được lưu dưới dạng `self_evolve` trong `agents.other_config`.

### Agent có thể và không thể thay đổi gì

Khi `self_evolve=true`, GoClaw tiêm hướng dẫn này vào system prompt (~95 token mỗi request):

```
## Self-Evolution

You may update SOUL.md to refine communication style (tone, voice, vocabulary, response style).
You may update CAPABILITIES.md to refine domain expertise, technical skills, and specialized knowledge.
MUST NOT change: name, identity, contact info, core purpose, IDENTITY.md, or AGENTS.md.
Make changes incrementally based on clear user feedback patterns.
```

> Nguồn: `buildSelfEvolveSection()` trong `internal/agent/systemprompt.go`.

### Bảo mật

| Lớp | Chức năng bảo vệ |
|---|---|
| Hướng dẫn system prompt | Quy tắc CAN/MUST NOT giới hạn phạm vi thay đổi |
| Context file interceptor | Xác nhận chỉ SOUL.md hoặc CAPABILITIES.md được ghi |
| Khóa file | IDENTITY.md và AGENTS.md luôn ở chế độ chỉ đọc |

---

## Skill Learning Loop

### Chức năng

Khi `skill_evolve` được bật, GoClaw khuyến khích agents ghi lại các quy trình phức tạp nhiều bước thành skill có thể tái sử dụng. Vòng lặp có ba điểm tương tác:

1. **Hướng dẫn system prompt** — được tiêm vào đầu mỗi request với tiêu chí SHOULD/SHOULD NOT
2. **Budget nudges** — nhắc nhở tạm thời được tiêm vào giữa vòng lặp tại 70% và 90% ngân sách vòng lặp
3. **Postscript suggestion** — được thêm vào cuối phản hồi của agent khi số lượng tool call đủ lớn; yêu cầu sự đồng ý rõ ràng từ người dùng

Không có skill nào được tạo mà không có người dùng trả lời "save as skill". Trả lời "skip" sẽ không thực hiện gì.

### Cách bật

| Cài đặt | Vị trí | Mặc định |
|---|---|---|
| `skill_evolve` | Agent Settings → Config tab → Skill Learning toggle | `false` |
| `skill_nudge_interval` | Config tab → ô nhập interval | `15` |

`skill_nudge_interval` là số lượng tool call tối thiểu trong một lần chạy trước khi postscript được kích hoạt. Đặt thành `0` để tắt hoàn toàn postscript trong khi vẫn giữ budget nudges.

Open agents luôn nhận `skill_evolve=false` bất kể cài đặt trong database — việc này được thực thi ở tầng resolver.

### Luồng hoạt động

```
Admin bật skill_evolve
        ↓
System prompt bao gồm hướng dẫn Skill Creation (mỗi request)
        ↓
Agent xử lý request (think → act → observe)
        ↓
  ≥70% ngân sách vòng lặp? → nudge tạm thời (gợi ý nhẹ)
  ≥90% ngân sách vòng lặp? → nudge tạm thời (mức độ vừa phải)
        ↓
Agent hoàn thành task
        ↓
  totalToolCalls ≥ skill_nudge_interval?
    Không → Phản hồi bình thường
    Có    → Thêm postscript: "Save as skill? or skip?"
                ↓
        Người dùng trả lời "skip"          → Không làm gì
        Người dùng trả lời "save as skill" → Agent gọi skill_manage(create)
                                                 ↓
                                             Skill được tạo + auto-grant
                                                 ↓
                                             Sẵn sàng ở lượt tiếp theo
```

### Hướng dẫn system prompt

Khi `skill_evolve=true` và `skill_manage` tool được đăng ký, GoClaw tiêm đoạn này (~135 token mỗi request):

```
### Skill Creation (recommended after complex tasks)

After completing a complex task (5+ tool calls), consider:
"Would this process be useful again in the future?"

SHOULD create skill when:
- Process is repeatable with different inputs
- Multiple steps that are easy to forget
- Domain-specific workflow others could benefit from

SHOULD NOT create skill when:
- One-time task specific to this user/context
- Debugging or troubleshooting (too context-dependent)
- Simple tasks (< 5 tool calls)
- User explicitly said "skip" or declined

Creating: skill_manage(action="create", content="---\nname: ...\n...")
Improving: skill_manage(action="patch", slug="...", find="...", replace="...")
Removing: skill_manage(action="delete", slug="...")

Constraints:
- You can only manage skills you created (not system or other users' skills)
- Quality over quantity — one excellent skill beats five mediocre ones
- Ask user before creating if unsure
```

### Budget nudges

Đây là các user message tạm thời được tiêm vào vòng lặp agent. Chúng **không** được lưu vào session history và mỗi loại chỉ kích hoạt tối đa một lần mỗi lần chạy.

**Tại 70% ngân sách vòng lặp (~31 token):**
```
[System] You are at 70% of your iteration budget. Consider whether any
patterns from this session would make a good skill.
```

**Tại 90% ngân sách vòng lặp (~48 token):**
```
[System] You are at 90% of your iteration budget. If this session involved
reusable patterns, consider saving them as a skill before completing.
```

### Postscript suggestion

Khi `totalToolCalls >= skill_nudge_interval`, đoạn văn bản này được thêm vào cuối phản hồi của agent (~35 token, được lưu trong session):

```
---
_This task involved several steps. Want me to save the process as a
reusable skill? Reply "save as skill" or "skip"._
```

Postscript chỉ kích hoạt tối đa một lần mỗi lần chạy. Các lần chạy tiếp theo sẽ reset cờ này.

### Tool gating

Khi `skill_evolve=false`, `skill_manage` tool hoàn toàn bị ẩn khỏi LLM — bị lọc ra khỏi định nghĩa tool trước khi gửi đến provider, và bị loại khỏi danh sách tool name trong system prompt. Agent không có bất kỳ nhận thức nào về tool này.

---

## Quản Lý Skill

### skill_manage tool

`skill_manage` tool khả dụng với agents khi `skill_evolve=true`. Hỗ trợ ba hành động:

| Hành động | Tham số bắt buộc | Chức năng |
|---|---|---|
| `create` | `content` | Tạo skill mới từ chuỗi nội dung SKILL.md |
| `patch` | `slug`, `find`, `replace` | Áp dụng bản vá find-and-replace vào skill hiện có |
| `delete` | `slug` | Soft-delete skill (chuyển vào `.trash/`) |

**Danh sách đầy đủ tham số:**

| Tham số | Kiểu | Bắt buộc cho | Mô tả |
|---|---|---|---|
| `action` | string | tất cả | `create`, `patch`, hoặc `delete` |
| `slug` | string | patch, delete | Định danh duy nhất của skill |
| `content` | string | create | Toàn bộ SKILL.md bao gồm YAML frontmatter |
| `find` | string | patch | Văn bản cần tìm trong SKILL.md hiện tại |
| `replace` | string | patch | Văn bản thay thế |

**Ví dụ — tạo skill từ cuộc hội thoại:**

```
skill_manage(
  action="create",
  content="---\nname: Deploy Checklist\ndescription: Steps to deploy the app safely.\n---\n\n## Steps\n1. Run tests\n2. Build image\n3. Push to registry\n4. Apply manifests\n5. Verify rollout"
)
```

**Ví dụ — vá skill hiện có:**

```
skill_manage(
  action="patch",
  slug="deploy-checklist",
  find="5. Verify rollout",
  replace="5. Verify rollout\n6. Notify team in Slack"
)
```

**Ví dụ — xóa skill:**

```
skill_manage(action="delete", slug="deploy-checklist")
```

### publish_skill tool

`publish_skill` là con đường thay thế để đăng ký toàn bộ thư mục local thành một skill. Tool này luôn khả dụng dưới dạng built-in tool toggle (không bị kiểm soát bởi `skill_evolve`).

```
publish_skill(path="./skills/my-skill")
```

Thư mục phải chứa `SKILL.md` với `name` trong frontmatter. Skill bắt đầu với visibility `private` và được auto-grant cho agent đang gọi. Dùng Dashboard hoặc API để cấp quyền cho các agent khác.

**So sánh:**

| | `skill_manage` | `publish_skill` |
|---|---|---|
| Đầu vào | Chuỗi nội dung | Đường dẫn thư mục |
| File | Chỉ SKILL.md (companion được sao chép khi patch) | Toàn bộ thư mục (scripts, assets, v.v.) |
| Kiểm soát bởi | Config `skill_evolve` | Built-in tool toggle (luôn khả dụng) |
| Hướng dẫn | Tiêm qua skill_evolve prompt | Dùng `skill-creator` core skill |
| Auto-grant | Có | Có |

---

## Bảo Mật

Mọi thao tác thay đổi skill đều phải qua bốn lớp bảo vệ trước khi ghi bất cứ thứ gì ra đĩa.

### Lớp 1 — Content Guard

Quét regex từng dòng nội dung SKILL.md. Từ chối cứng khi có bất kỳ vi phạm nào. 25 quy tắc trong 6 danh mục:

| Danh mục | Ví dụ |
|---|---|
| Shell phá hủy | `rm -rf /`, fork bomb, `dd of=/dev/`, `mkfs`, `shred` |
| Tiêm code | `base64 -d \| sh`, `eval $(...)`, `curl \| bash`, `python -c exec()` |
| Đánh cắp credential | `/etc/passwd`, `.ssh/id_rsa`, `AWS_SECRET_ACCESS_KEY`, `GOCLAW_DB_URL` |
| Path traversal | Deep traversal `../../../` |
| SQL injection | `DROP TABLE`, `TRUNCATE TABLE`, `DROP DATABASE` |
| Leo thang đặc quyền | `sudo`, `chmod` world-writable, `chown root` |

Đây là lớp defense-in-depth — không toàn diện. Tool `exec` của GoClaw có danh sách deny riêng cho các lệnh shell.

### Lớp 2 — Kiểm Tra Quyền Sở Hữu

Kiểm tra quyền sở hữu ba tầng trên tất cả các đường thay đổi:

| Tầng | Kiểm tra |
|---|---|
| `skill_manage` tool | `GetSkillOwnerIDBySlug(slug)` trước patch/delete |
| HTTP API | `GetSkillOwnerID(uuid)` + bypass cho admin |
| WebSocket gateway | Interface `skillOwnerGetter` + bypass cho admin |

Agents chỉ có thể sửa đổi skill do chính mình tạo ra. Admin có thể bypass kiểm tra quyền sở hữu. System skills (`is_system=true`) không thể sửa đổi qua bất kỳ đường nào.

### Lớp 3 — Bảo Vệ System Skill

System skills luôn ở chế độ chỉ đọc. Bất kỳ cố gắng patch hoặc delete một skill có `is_system=true` đều bị từ chối trước khi chạm đến filesystem.

### Lớp 4 — Bảo Mật Filesystem

| Bảo vệ | Chi tiết |
|---|---|
| Phát hiện symlink | `filepath.WalkDir` kiểm tra symlink — từ chối tất cả |
| Path traversal | Từ chối các path chứa đoạn `..` |
| Giới hạn kích thước SKILL.md | Tối đa 100 KB |
| Giới hạn kích thước companion files | Tối đa 20 MB tổng cộng (scripts, assets) |
| Soft-delete | File được chuyển vào `.trash/`, không bao giờ xóa cứng |

---

## Versioning và Lưu Trữ

Mỗi lần create hoặc patch tạo ra một thư mục version mới bất biến. GoClaw luôn phục vụ version có số cao nhất.

```
skills-store/
├── deploy-checklist/
│   ├── 1/
│   │   └── SKILL.md
│   └── 2/              ← patch tạo version này
│       └── SKILL.md
├── .trash/
│   └── old-skill.1710000000   ← soft-deleted
```

Việc tạo version đồng thời cho cùng một skill được tuần tự hóa qua `pg_advisory_xact_lock` dựa trên FNV-64a hash của slug. Số version được tính bên trong transaction dùng `COALESCE(MAX(version), 0) + 1`.

---

## Chi Phí Token

| Thành phần | Khi nào hoạt động | Xấp xỉ token | Lưu vào session? |
|---|---|---|---|
| Self-evolve section | `self_evolve=true` | ~95 | Mỗi request |
| Hướng dẫn skill creation | `skill_evolve=true` | ~135 | Mỗi request |
| Định nghĩa `skill_manage` tool | `skill_evolve=true` | ~290 | Mỗi request |
| Budget nudge 70% | iter ≥ 70% tối đa | ~31 | Không (tạm thời) |
| Budget nudge 90% | iter ≥ 90% tối đa | ~48 | Không (tạm thời) |
| Postscript | toolCalls ≥ interval | ~35 | Có |

Chi phí tối đa mỗi lần chạy với cả hai tính năng bật: ~305 token cho skill learning (~1,5% của context 128K). Khi cả hai tắt (mặc định), chi phí token bằng không.

---

## v3: Metrics Tiến Hóa và Suggestion Engine

v3 bổ sung tiến hóa tự động dựa trên metrics cho predefined agents. Hệ thống này hoạt động độc lập với vòng lặp skill learning thủ công ở trên.

### Cách hoạt động

```
Metrics thu thập trong quá trình chạy agent (cửa sổ 7 ngày)
    ↓
SuggestionEngine.Analyze() — chạy hàng ngày theo cron
    ├─ LowRetrievalUsageRule  (avg recall < ngưỡng)
    ├─ ToolFailureRule         (tỷ lệ lỗi tool > 20%)
    └─ RepeatedToolRule        (tool gọi liên tiếp 5+ lần)
    ↓
Suggestion được tạo với trạng thái "pending"
    ↓
Admin xem xét → approve / reject / rollback
```

### Loại Metrics

| Loại | Nội dung theo dõi | Ví dụ |
|------|------------------|-------|
| `tool` | Hiệu suất từng tool | invocation_count, success_rate, failure_count |
| `retrieval` | Chất lượng truy xuất kiến thức | recall_rate, precision, relevance_score |
| `feedback` | Tín hiệu hài lòng của người dùng | rating, sentiment, effectiveness_score |

### Loại Suggestion

| Loại | Điều kiện kích hoạt | Khuyến nghị |
|------|---------------------|-------------|
| `low_retrieval_usage` | Avg recall dưới ngưỡng 7 ngày | Giảm `retrieval_threshold` ≤ 0.1 |
| `tool_failure` | Tỷ lệ lỗi tool đơn > 20% | Xem lại cấu hình tool hoặc thêm fallback |
| `repeated_tool` | Tool gọi liên tiếp 5+ lần | Trích xuất workflow thành skill |

### Guardrail Tự Động

| Guardrail | Mặc định | Mục đích |
|-----------|---------|---------|
| `max_delta_per_cycle` | 0.1 | Thay đổi tham số tối đa mỗi chu kỳ |
| `min_data_points` | 100 | Số lượng metrics tối thiểu trước khi áp dụng |
| `rollback_on_drop_pct` | 20.0 | Tự động rollback nếu chất lượng giảm >20% |
| `locked_params` | `[]` | Tham số không thể tự động thay đổi |

### Cấu hình Evolution Cron

```json
{
  "evolution_enabled": true,
  "evolution_cron_schedule": "every day at 02:00",
  "evolution_guardrails": {
    "max_delta_per_cycle": 0.1,
    "min_data_points": 100,
    "rollback_on_drop_pct": 20.0,
    "locked_params": []
  }
}
```

### HTTP API

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/v1/agents/{id}/evolution/metrics` | Truy vấn metrics |
| `GET` | `/v1/agents/{id}/evolution/suggestions` | Danh sách suggestion |
| `PATCH` | `/v1/agents/{id}/evolution/suggestions/{sid}` | Approve / reject / rollback |

---

## Các Vấn Đề Thường Gặp

| Vấn đề | Nguyên nhân | Cách khắc phục |
|---|---|---|
| Không thấy toggle Self-Evolution | Agent không phải loại predefined | Self-evolution chỉ dành cho predefined agents |
| Skill không được lưu sau postscript | Người dùng chưa trả lời "save as skill" | Postscript yêu cầu đồng ý rõ ràng — trả lời đúng cụm từ |
| `skill_manage` không khả dụng cho agent | `skill_evolve=false` hoặc agent là open type | Bật `skill_evolve` trong Config tab; xác nhận agent là predefined |
| Patch thất bại với lỗi "not owner" | Agent cố patch skill của agent khác | Mỗi agent chỉ có thể sửa đổi skill do mình tạo |
| Patch thất bại với lỗi "system skill" | Cố sửa đổi built-in system skill | System skills luôn ở chế độ chỉ đọc |
| Nội dung skill bị từ chối | Nội dung khớp với quy tắc bảo mật trong guard.go | Xóa pattern vi phạm; xem danh mục Lớp 1 ở trên |

---

## Tiếp Theo

- [Skills](./skills.md) — định dạng skill, phân cấp và hot reload
- [Predefined Agents](../core-concepts/agents-explained.md) — sự khác biệt giữa predefined agents và open agents

<!-- goclaw-source: 1296cdbf | cập nhật: 2026-04-11 -->
