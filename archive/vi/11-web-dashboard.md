# Web Dashboard

GoClaw Web Dashboard là một ứng dụng trang đơn (SPA) React 19, xây dựng với Vite 6, TypeScript, Tailwind CSS 4, và Radix UI. Dashboard kết nối tới GoClaw gateway qua WebSocket và cung cấp giao diện quản lý đầy đủ cho agents, teams, tools, providers và observability.

---

## 1. Core

### Chat (`/chat`)

Giao diện chat trực tiếp với agent.

![Chat](../../images/dashboard/chat.png)

- **Agent selector** — dropdown để chuyển đổi agent đang hoạt động
- **Session list** — hiển thị số lượng tin nhắn và timestamp của mỗi session
- **New Chat** — bắt đầu session mới
- Ô nhập tin nhắn với action gửi

---

## 2. Management

### Agents (`/agents`)

Lưới card của tất cả AI agents đã đăng ký.

![Agents](../../images/dashboard/agent.png)

Mỗi card hiển thị: tên, slug, provider/model, mô tả, status badge (`active`/`inactive`), access type (`predefined` / `open`), và kích thước context window.

Thao tác: **Create Agent**, tìm kiếm theo tên/slug, chỉnh sửa, xoá.

### Agent Teams (`/teams`)

Quản lý cấu hình nhóm đa agent.

![Agent Teams](../../images/dashboard/agent%20team.png)

Mỗi team card hiển thị: tên team, status, lead agent. Thao tác: **Create Team**, tìm kiếm, chỉnh sửa, xoá.

### Sessions (`/sessions`)

Liệt kê tất cả conversation sessions trên các agents và channels. Hỗ trợ lọc và xoá.

![Sessions](../../images/dashboard/session.png)

### Channels (`/channels`)

Cấu hình các kênh nhắn tin bên ngoài (Telegram, Slack, v.v.) kết nối tới gateway.

![Channels](../../images/dashboard/channels.png)

### Skills (`/skills`)

Quản lý các gói skill của agent (upload ZIP). Thao tác: **Upload**, **Refresh**, tìm kiếm theo tên.

![Skills](../../images/dashboard/skills.png)

### Built-in Tools (`/builtin-tools`)

26 built-in tools thuộc 13 danh mục. Mỗi tool có thể bật hoặc tắt riêng lẻ.

![Built-in Tools](../../images/dashboard/build%20in%20tool.png)

| Danh mục | Tools |
|---|---|
| Filesystem | `edit`, `list_files`, `read_file`, `write_file` |
| Runtime | `exec` |
| Web | `web_fetch`, `web_search` |
| Memory | `memory_get`, `memory_search` |
| (+ 9 danh mục khác) | — |

---

## 3. Monitoring

### Traces (`/traces`)

Bảng các LLM call traces.

![Traces](../../images/dashboard/traces.png)

| Cột | Mô tả |
|---|---|
| Name | Nhãn trace / run |
| Status | `completed`, `error`, v.v. |
| Duration | Thời gian thực thi |
| Tokens | Số token input / output / cached |
| Spans | Số child spans |
| Time | Thời điểm ghi nhận |

Lọc theo agent ID. Nút **Refresh** để tải lại thủ công.

### Delegations (`/delegations`)

Theo dõi các sự kiện delegation giữa các agent — agent nào đã uỷ thác tác vụ cho sub-agent nào, cùng trạng thái và thời gian.

![Delegations](../../images/dashboard/Delegations.png)

---

## 4. System

### Providers (`/providers`)

Bảng quản lý LLM provider.

![Providers](../../images/dashboard/providers.png)

| Cột | Mô tả |
|---|---|
| Name | Nhãn provider |
| Type | `dashscope`, `bailian`, `gemini`, `openrouter`, `openai_compat` |
| API Base URL | Endpoint |
| API Key | Đã ẩn |
| Status | `Enabled` / `Disabled` |

Thao tác: **Add Provider**, **Refresh**, chỉnh sửa và xoá từng dòng.

### Config (`/config`)

Trình chỉnh sửa cấu hình gateway với hai chế độ: **UI form** và **Raw Editor**.

![Config](../../images/dashboard/config.png)

Các phần:

- **Gateway** — host, port, token, owner IDs, allowed origins, rate limit (RPM), max message chars, inbound debounce, injection action
- **LLM Providers** — danh sách provider inline
- **Agent Defaults** — cài đặt model mặc định

> Banner màu vàng nhắc nhở rằng environment variables có độ ưu tiên cao hơn các giá trị thiết lập qua UI, và các secrets nên được cấu hình qua env thay vì lưu trong file cấu hình.

---

## 5. Truy cập Dashboard

Dashboard được tích hợp sẵn trong GoClaw và tự động khả dụng khi gateway khởi động. Không cần cài đặt riêng.

- **URL**: `http://localhost:3000` (mặc định)
- **Kết nối**: Tự động kết nối tới gateway qua WebSocket
- Xem [Bắt Đầu](#getting-started) để biết hướng dẫn cài đặt và khởi động
