> Bản dịch từ [English version](../../agents/creating-agents.md)

# Tạo Agent

> Thiết lập agent AI mới qua CLI, dashboard, hoặc managed API.

## Tổng quan

Bạn có thể tạo agent theo ba cách: dùng wizard tương tác trên CLI, qua web dashboard, hoặc gọi HTTP trực tiếp. Mỗi agent cần một key duy nhất, tên hiển thị, LLM provider, và model. Các trường tuỳ chọn bao gồm context window, số lần tool iteration tối đa, vị trí workspace, và cấu hình tool.

## CLI: Wizard tương tác

Cách đơn giản nhất để bắt đầu:

```bash
./goclaw agent add
```

Lệnh này mở một wizard từng bước. Bạn sẽ được hỏi:

1. **Tên agent** — dùng để tạo ID chuẩn hoá (chữ thường, dấu gạch ngang). Ví dụ: "coder" → `coder`
2. **Tên hiển thị** — hiển thị trên dashboard. Có thể là "Code Assistant" cho cùng agent `coder`
3. **Provider** — LLM provider (tuỳ chọn: kế thừa từ mặc định, hoặc chọn OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral)
4. **Model** — tên model (tuỳ chọn: kế thừa từ mặc định, hoặc chỉ định như `claude-3-5-sonnet`)
5. **Thư mục workspace** — nơi lưu context file. Mặc định là `~/.goclaw/workspace-{agent-id}`

Sau khi tạo xong, khởi động lại gateway để kích hoạt agent:

```bash
./goclaw agent list          # xem danh sách agent
./goclaw gateway             # khởi động lại để kích hoạt
```

## Dashboard: Giao diện web

Từ trang agents trên web dashboard:

1. Click **"Create Agent"** hoặc **"+"**
2. Điền vào form:
   - **Agent key** — slug chữ thường (chỉ chữ cái, số, dấu gạch ngang)
   - **Display name** — tên dễ đọc
   - **Agent type** — "Open" (context theo từng user) hoặc "Predefined" (context dùng chung)
   - **Provider** — LLM provider
   - **Model** — model cụ thể
   - **Các trường khác** — context window, max iterations, v.v.
3. Click **Save**

Nếu bạn tạo **predefined agent có mô tả**, hệ thống sẽ tự động bắt đầu quá trình "summoning" dựa trên LLM — tạo ra SOUL.md, IDENTITY.md, và tuỳ chọn USER_PREDEFINED.md từ mô tả của bạn.

## HTTP API: Managed Mode

Nếu GoClaw đang chạy ở chế độ managed gateway (chỉ API), dùng HTTP:

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "research",
    "display_name": "Research Assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "context_window": 200000,
    "max_tool_iterations": 20,
    "workspace": "~/.goclaw/research-workspace"
  }'
```

**Trường bắt buộc:**
- `agent_key` — định danh duy nhất (dạng slug)
- `display_name` — tên dễ đọc
- `provider` — tên LLM provider
- `model` — định danh model

**Trường tuỳ chọn:**
- `agent_type` — `"open"` (mặc định) hoặc `"predefined"`
- `context_window` — số token context tối đa (mặc định: 200,000)
- `max_tool_iterations` — số lần gọi tool tối đa mỗi lần chạy (mặc định: 20)
- `workspace` — đường dẫn thư mục chứa file agent (mặc định: `~/.goclaw/{agent-key}-workspace`)
- `other_config` — JSON object với các trường tuỳ chỉnh (ví dụ: `{"description": "..."}` để kích hoạt summoning)

**Response:** Trả về object agent đã tạo với ID duy nhất và trạng thái.

## Tham chiếu trường bắt buộc

| Trường | Kiểu | Mô tả | Ví dụ |
|-------|------|-------------|---------|
| `agent_key` | string | Slug duy nhất (chữ thường, chữ và số, dấu gạch ngang) | `code-bot`, `faq-helper` |
| `display_name` | string | Tên hiển thị trên giao diện | `Code Assistant` |
| `provider` | string | LLM provider (ghi đè mặc định) | `anthropic`, `openrouter` |
| `model` | string | Định danh model (ghi đè mặc định) | `claude-3-5-sonnet-20241022` |

## Tham chiếu trường tuỳ chọn

| Trường | Kiểu | Mặc định | Mô tả |
|-------|------|---------|-------------|
| `agent_type` | string | `open` | `open` (context theo user) hoặc `predefined` (dùng chung) |
| `context_window` | integer | 200,000 | Số token tối đa trong context |
| `max_tool_iterations` | integer | 20 | Số lần gọi tool tối đa mỗi request |
| `workspace` | string | `~/.goclaw/{key}-workspace` | Thư mục chứa context file |
| `other_config` | JSON | `{}` | Trường tuỳ chỉnh (ví dụ: `description` để kích hoạt summoning) |

## Ví dụ

### CLI: Thêm Research Agent

```bash
$ ./goclaw agent add

── Add New Agent ──

Agent name: researcher
Display name: Research Assistant
Provider: (inherit: openrouter)
Model: (inherit: claude-3-5-sonnet-20241022)
Workspace directory: ~/.goclaw/workspace-researcher

Agent "researcher" created successfully.
  Display name: Research Assistant
  Provider: (inherit: openrouter)
  Model: (inherit: claude-3-5-sonnet-20241022)
  Workspace: ~/.goclaw/workspace-researcher

Restart the gateway to activate this agent.
```

### API: Tạo Predefined FAQ Bot với Summoning

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token123" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "faq-bot",
    "display_name": "FAQ Assistant",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "other_config": {
      "description": "A friendly FAQ bot that answers common questions about our product. Organized, helpful, patient. Answers in the user'\''s language."
    }
  }'
```

Hệ thống sẽ kích hoạt summoning bằng LLM ở nền để tạo ra các file personality. Theo dõi trạng thái agent để biết khi nào nó chuyển từ `summoning` sang `active`.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| "Agent key must be a valid slug" | Chỉ dùng chữ thường, số, và dấu gạch ngang. Không có khoảng trắng hay ký tự đặc biệt. |
| "An agent with key already exists" | Chọn key khác. Dùng `./goclaw agent list` để xem các agent hiện có. |
| "Agent created but not showing up" | Khởi động lại gateway: `./goclaw`. Agent mới chỉ được load khi khởi động. |
| Summoning mất quá lâu hoặc thất bại | Kiểm tra kết nối tới LLM provider và sự khả dụng của model. Summoning thất bại sẽ dùng template file làm fallback. |
| Provider hoặc model không được nhận dạng | Đảm bảo provider đã được cấu hình trong `GOCLAW_CONFIG`. Kiểm tra tài liệu provider để biết tên model đúng. |

## Tiếp theo

- [Open vs. Predefined](./open-vs-predefined.md) — hiểu sự khác biệt về context isolation
- [Context Files](./context-files.md) — tìm hiểu về SOUL.md, IDENTITY.md, và các file hệ thống khác
- [Summoning & Bootstrap](./summoning-bootstrap.md) — cách LLM tạo ra file personality khi lần đầu sử dụng
