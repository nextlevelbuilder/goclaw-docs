> Bản dịch từ [English version](#glossary)

# Glossary

> Định nghĩa các thuật ngữ đặc thù của GoClaw được dùng xuyên suốt tài liệu.

## Agent

Một AI assistant instance với identity, cấu hình LLM, workspace, và context file riêng. Mỗi agent có `agent_key` duy nhất (ví dụ `researcher`), display name, cặp provider/model, và type (`open` hoặc `predefined`).

Agents được lưu trong bảng `agents`. Khi runtime, gateway resolve cấu hình agent bằng cách merge `agents.defaults` với per-agent overrides từ `agents.list` trong `config.json`, rồi áp dụng database-level overrides.

Xem: [Open vs Predefined Agents](#open-vs-predefined)

---

## Open Agent

Agent có context **per-user**. Mỗi user chat với open agent có session history riêng và context file USER.md riêng. Các file system prompt (SOUL.md, IDENTITY.md) được chia sẻ, nhưng conversation và user-specific memory được cô lập.

Đây là agent type mặc định (`agent_type: "open"`).

---

## Predefined Agent

Agent có **context core chia sẻ** cho tất cả user. Mọi user đều tương tác với cùng SOUL.md, IDENTITY.md, và system prompt. Chỉ USER_PREDEFINED.md là per-user. Predefined agent được thiết kế cho bot có mục đích cụ thể (ví dụ FAQ bot hoặc coding assistant) nơi persona nhất quán quan trọng hơn per-user isolation.

Đặt bằng `agent_type: "predefined"`.

---

## Summon / Summoning

Quá trình dùng LLM để **tự động tạo** các file personality của agent (SOUL.md, IDENTITY.md, USER_PREDEFINED.md) từ mô tả text thuần túy. Khi bạn tạo predefined agent với field `description`, gateway kích hoạt summoning trong nền. Agent status hiển thị `summoning` cho đến khi generation hoàn tất, rồi chuyển sang `active`.

Summoning chỉ chạy một lần mỗi agent, hoặc khi bạn kích hoạt `POST /v1/agents/{id}/resummon`.

Xem: [Summoning & Bootstrap](#summoning-bootstrap)

---

## Bootstrap

Tập hợp **context file được load vào system prompt** ở đầu mỗi agent run. Bootstrap file bao gồm SOUL.md (personality), IDENTITY.md (capabilities), và tùy chọn USER.md hoặc USER_PREDEFINED.md (user-specific context).

Với open agent, bootstrap file được lưu per-agent trong `agent_context_files` và per-user trong `user_context_files`. Gateway load và nối chúng lại, áp dụng giới hạn ký tự (`bootstrapMaxChars`, `bootstrapTotalMaxChars`) trước khi đưa vào system prompt của LLM.

---

## Compaction

**Tóm tắt lịch sử session tự động** kích hoạt khi token usage của session vượt ngưỡng (mặc định: 75% context window). Trong compaction, gateway:

1. Tùy chọn flush conversation gần đây vào memory (Memory Flush).
2. Tóm tắt lịch sử hiện có bằng LLM.
3. Thay thế lịch sử đầy đủ bằng tóm tắt, giữ lại vài tin nhắn cuối.

Compaction giữ session hoạt động vô thời hạn mà không bị giới hạn context. Theo dõi bởi `compaction_count` trong bảng `sessions`.

Cấu hình qua `agents.defaults.compaction` trong `config.json`.

---

## Context Pruning

Tối ưu in-memory **cắt bỏ tool result cũ** để lấy lại context space trước khi cần compaction. Hai chế độ:

- **Soft trim** — cắt bớt tool result quá lớn thành `headChars + tailChars`.
- **Hard clear** — thay thế tool result rất cũ bằng placeholder string.

Pruning kích hoạt khi context vượt `softTrimRatio` hoặc `hardClearRatio` của context window. Tự bật khi Anthropic được cấu hình (mode: `cache-ttl`).

Cấu hình qua `agents.defaults.contextPruning` trong `config.json`.

---

## Delegation

Khi một agent **giao task cho agent khác** và chờ kết quả. Agent gọi (parent) invoke tool `delegate` hoặc `spawn`, tạo ra subagent session. Parent tiếp tục khi subagent hoàn thành và báo lại.

Delegation cần **Agent Link** giữa hai agent. Bảng `traces` ghi lại delegation qua `parent_trace_id`. Delegation đang hoạt động xuất hiện trong bảng `delegations` và phát ra WebSocket event `delegation.*`.

---

## Handoff

**Chuyển giao quyền sở hữu conversation** một chiều từ agent này sang agent khác, thường được kích hoạt giữa conversation khi yêu cầu của user phù hợp hơn với agent khác. Khác với delegation (trả kết quả về caller), handoff route session vĩnh viễn đến agent mới.

Phát ra WebSocket event `handoff` với `from_agent`, `to_agent`, và `reason` trong payload.

---

## Evaluate Loop

Chu kỳ **think → act → observe** mà agent loop chạy liên tục:

1. **Think** — LLM xử lý context hiện tại và quyết định phải làm gì.
2. **Act** — Nếu LLM phát ra tool call, gateway thực thi nó.
3. **Observe** — Kết quả tool được thêm vào context, và loop tiếp tục.

Loop dừng khi LLM tạo ra text response cuối cùng (không có tool call đang chờ), hoặc khi đạt `max_tool_iterations`.

---

## Lane

**Named execution queue** trong scheduler. GoClaw dùng ba lane tích hợp:

| Lane | Mục đích |
|------|----------|
| `main` | Tin nhắn chat từ user qua channel |
| `subagent` | Task được delegate từ parent agent |
| `cron` | Scheduled cron job run |

Lane cung cấp **backpressure** và **adaptive throttling** — khi session tiếp cận ngưỡng summarization, concurrency per-session giảm để ngăn race giữa concurrent run và compaction.

---

## Pairing

**Trust establishment flow** cho channel user. Khi Telegram (hoặc channel khác) user nhắn tin cho bot lần đầu và `dm_policy` đặt là `"pairing"`, bot yêu cầu họ gửi pairing code. Gateway tạo code 8 ký tự, và operator phê duyệt qua `goclaw pairing approve` hoặc web dashboard.

Sau khi pair, `sender_id + channel` của user được lưu trong `paired_devices` và họ có thể chat tự do. Pairing có thể thu hồi bất kỳ lúc nào.

---

## Provider

**LLM backend** đã đăng ký với gateway. Provider được lưu trong bảng `llm_providers` với API key đã mã hóa. Khi runtime, gateway resolve effective provider của mỗi agent và thực hiện API call có xác thực.

Loại provider được hỗ trợ:
- `openai_compat` — bất kỳ OpenAI-compatible API nào (OpenAI, Groq, DeepSeek, Mistral, OpenRouter, xAI, v.v.)
- `anthropic` — Anthropic native API với streaming SSE
- `claude-cli` — binary `claude` local (không cần API key)

Provider cũng có thể thêm qua web dashboard hoặc `POST /v1/providers`.

---

## Session

**Luồng conversation lâu dài** giữa user và agent. Session key định danh duy nhất luồng, thường gồm channel và user identifier (ví dụ `telegram:123456789`).

Session lưu toàn bộ lịch sử tin nhắn dạng JSONB, token count tích lũy, model và provider đang active, và metadata compaction. Chúng tồn tại trong bảng `sessions` và sống sót qua các lần restart gateway.

---

## Skill

**Gói hướng dẫn tái sử dụng** — thường là file Markdown với frontmatter block `## SKILL` — mà agent có thể discover và áp dụng. Skill dạy agent workflow, persona, hoặc kiến thức chuyên môn mới mà không cần sửa system prompt core.

Skill được upload dạng `.zip` qua `POST /v1/skills/upload`, lưu trong bảng `skills`, và được index cho cả BM25 full-text lẫn semantic (embedding) search. Truy cập được kiểm soát qua `skill_agent_grants` và `skill_user_grants`.

Khi runtime, agent tìm kiếm skill liên quan bằng tool `skill_search` và đọc nội dung bằng `read_file`.

---

## Workspace

**Thư mục filesystem** nơi agent đọc và ghi file. Các tool như `read_file`, `write_file`, `list_files`, và `exec` hoạt động tương đối với workspace. Khi `restrict_to_workspace` là `true` (mặc định), agent không thể thoát khỏi thư mục này.

Mỗi agent có workspace path cấu hình trong `agents.defaults.workspace` hoặc per-agent overrides. Path hỗ trợ `~` expansion.

---

## Subagent

Agent session **được spawn bởi agent khác** để xử lý subtask song song hoặc được delegate. Subagent được tạo qua tool `spawn` và chạy trong lane `subagent`. Chúng báo kết quả về parent qua `AnnounceQueue`, gom và debounce thông báo.

Concurrency subagent được kiểm soát bởi `agents.defaults.subagents` (`maxConcurrent`, `maxSpawnDepth`, `maxChildrenPerAgent`).

---

## Agent Team

**Nhóm agent có tên** cộng tác trên task list chia sẻ. Một agent được chỉ định là `lead`; các agent còn lại là `member`. Team dùng:

- **Task list** — bảng `team_tasks` chia sẻ nơi agent claim, làm việc, và hoàn thành task.
- **Peer messages** — mailbox `team_messages` cho giao tiếp agent-to-agent.
- **Agent links** — tự động tạo giữa các thành viên team để bật delegation.

Team phát ra WebSocket event `team.*` để có visibility real-time về sự phối hợp.

---

## Agent Link

**Permission record** cho phép một agent delegate task cho agent khác. Link được lưu trong `agent_links` với `source_agent_id` → `target_agent_id`. Có thể tạo thủ công qua `POST /v1/agents/links` hoặc tự động khi tạo team.

Không có link, agent không thể delegate cho nhau — dù cùng team.

---

## MCP (Model Context Protocol)

Protocol mở để **kết nối tool server bên ngoài** với LLM agent. GoClaw có thể kết nối với MCP server qua transport `stdio` (subprocess), `sse`, hoặc `streamable-http`. Mỗi server expose tập hợp tool được đăng ký trong suốt cùng với built-in tool.

MCP server được quản lý qua bảng `mcp_servers` và `POST /v1/mcp/servers`. Truy cập được cấp per-agent hoặc per-user qua `mcp_agent_grants` và `mcp_user_grants`.

---

## Tiếp theo

- [Config Reference](#config-reference) — cấu hình agents, compaction, context pruning, sandbox
- [WebSocket Protocol](#websocket-protocol) — tên event cho delegation, handoff, và team activity
- [Database Schema](#database-schema) — định nghĩa bảng cho sessions, traces, teams, và nhiều hơn

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
