> Bản dịch từ [English version](/dashboard-tour)

# Web Dashboard Tour

> Hướng dẫn trực quan về management dashboard của GoClaw.

## Tổng quan

Web dashboard cung cấp giao diện point-and-click cho mọi thứ bạn có thể làm với file config. Được xây dựng bằng React và kết nối với HTTP API của GoClaw.

## Truy cập Dashboard

### Với Docker Compose

Nếu bạn đã khởi động với self-service overlay, dashboard đang chạy sẵn:

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

Mở `http://localhost:3000` trên trình duyệt.

### Build từ source

```bash
cd ui/web
pnpm install
pnpm dev
# Dashboard chạy tại http://localhost:5173
```

Cho production:

```bash
pnpm build
# Serve thư mục dist/ với bất kỳ static file server nào
```

## Dashboard Sidebar

Dashboard tổ chức các tính năng thành các nhóm trong sidebar.

### Core

#### Overview

Dashboard tổng quan hệ thống với các số liệu chính.

#### Chat

Giao diện chat thử nghiệm — tương tác với bất kỳ agent nào trực tiếp từ trình duyệt.

#### Agents

Tạo, sửa, và xóa agent. Mỗi agent card hiển thị:
- Tên và model
- Provider và temperature
- Quyền truy cập tool
- Số session đang hoạt động

Nhấn vào agent để mở trang chi tiết với các tab:
- **General** — Thông tin cơ bản của agent
- **Config** — Model, temperature, system prompt, quyền tool
- **Files** — File ngữ cảnh (IDENTITY.md, USER.md, v.v.)
- **Shares** — Chia sẻ agent giữa các tenant
- **Links** — Cấu hình agent nào có thể được phân công (quyền, giới hạn concurrency, quy tắc handoff)
- **Skills** — Gán skill riêng cho agent
- **Instances** — Các instance agent được định nghĩa trước (chỉ hiện với predefined agent)

#### Agent Teams

Tạo agent team cho các tác vụ cộng tác. Danh sách team hỗ trợ chuyển đổi xem dạng card/list.

<!-- TODO: Screenshot — Team kanban board với task card -->

Nhấn vào team để xem **kanban board** với quản lý task kéo-thả:
- **Board** — Bảng task trực quan với cột cho mỗi trạng thái (pending, in_progress, in_review, completed, failed, cancelled, blocked, stale)
- **Members** — Gán agent vào team, xem thông tin thành viên kèm metadata và emoji agent
- **Tasks** — Danh sách task với bộ lọc, quy trình phê duyệt (approve/reject), và blocker escalation
- **Workspace** — Workspace file dùng chung với lazy-load folder và kiểm soát độ sâu storage
- **Settings** — Cấu hình team, blocker escalation, escalation mode, workspace scope

### Conversations

#### Sessions

Xem session đang hoạt động và lịch sử. Xem conversation history theo user, theo agent, theo channel.

#### Pending Messages

Hàng đợi tin nhắn chưa xử lý đang chờ agent phản hồi.

#### Contacts

Quản lý danh bạ người dùng trên tất cả các channel.

### Connectivity

#### Channels

Bật và cấu hình các channel nhắn tin:
- **Telegram** — Bot token, danh sách user/group được phép
- **Discord** — Bot token, cài đặt guild
- **WhatsApp** — QR code kết nối
- **Zalo** — App credentials
- **Zalo Personal** — Tích hợp tài khoản Zalo cá nhân
- **Feishu / Lark** — App ID và secret
- **Slack** — Bot token, cài đặt workspace

#### Nodes

Quản lý và ghép nối gateway node. Ghép nối phiên trình duyệt với gateway instance bằng mã ghép nối 8 ký tự. Hiển thị badge với số lượng yêu cầu ghép nối đang chờ.

### Capabilities

#### Skills

Upload file `SKILL.md` để agent có thể khám phá và sử dụng. Skills có thể tìm kiếm bằng semantic matching — agent tìm đúng skill dựa trên yêu cầu của người dùng.

#### Custom Tools

Tạo và quản lý custom tool với command template, biến môi trường, và deny pattern blocking.

#### Builtin Tools

Duyệt 50+ tool tích hợp sẵn của GoClaw. Bật/tắt từng tool và cấu hình settings (bao gồm Knowledge Graph, media provider chain, và web fetch extractor chain).

#### MCP Servers

Kết nối Model Context Protocol server để mở rộng khả năng của agent vượt ra ngoài các tool tích hợp.

**Ví dụ:** Nếu bạn chạy một server knowledge base nội bộ, bạn có thể kết nối qua MCP để GoClaw agent tự động truy vấn tài liệu riêng của bạn.

Thêm server URL, xem các tool có sẵn, và kiểm tra kết nối.

#### TTS (Text-to-Speech)

Cấu hình dịch vụ Text-to-Speech. Các provider hỗ trợ: OpenAI, ElevenLabs, Edge, MiniMax.

#### Cron Jobs

<!-- TODO: Screenshot — Trang chi tiết cron được thiết kế lại với markdown rendering -->

Lên lịch tác vụ qua trang chi tiết được thiết kế lại với hỗ trợ markdown. Điền tên, chọn agent, chọn loại lịch, và viết message cho agent biết cần làm gì. Ba loại lịch:
- **Every** — chạy theo khoảng thời gian cố định (tính bằng giây)
- **Cron** — chạy theo cron expression (ví dụ `0 9 * * *`)
- **Once** — chạy một lần sau một khoảng delay ngắn

**Ví dụ:**
- **Name:** `daily-feedback`
- **Agent ID:** agent assistant của bạn
- **Schedule Type:** Cron — `0 9 * * *`
- **Message:** "Tóm tắt phản hồi khách hàng hôm qua và gửi email cho tôi."

### Data

#### Memory

Quản lý tài liệu bộ nhớ vector sử dụng pgvector. Lưu trữ, tìm kiếm và quản lý tài liệu mà agent có thể truy xuất qua semantic search.

#### Knowledge Graph

Quản lý knowledge graph — xem và quản lý mối quan hệ thực thể mà agent xây dựng qua các cuộc hội thoại.

#### Storage

Quản lý file và storage cho các file được agent hoặc người dùng upload.

### Monitoring

#### Traces

Lịch sử gọi LLM bao gồm:
- Lượng token dùng và theo dõi chi phí
- Cặp request/response
- Chuỗi tool call
- Số liệu latency

#### Events

Luồng sự kiện real-time — theo dõi hoạt động agent, tool call và sự kiện hệ thống khi chúng xảy ra.

#### Activity

Lịch sử vòng đời agent — hiển thị khi nào agent được tạo, cập nhật, hoặc xóa, kèm timestamp và thông tin người thực hiện.

#### Usage

Số liệu sử dụng và theo dõi chi phí — giám sát lượng token tiêu thụ, API call và chi phí theo agent/channel. Truy cập qua tab **Usage** trên trang Overview, không phải mục riêng trong sidebar.

#### Logs

Log hệ thống để debug và giám sát hoạt động gateway.

### System

#### Providers

<!-- TODO: Screenshot — Trang chi tiết provider được thiết kế lại -->

Quản lý LLM provider với trang chi tiết hiện đại được thiết kế lại. Tạo, cấu hình và xác minh provider. Hỗ trợ Anthropic (native), OpenAI, Azure OpenAI với Foundry headers, và 20+ provider khác. Hiển thị phiên bản server trong trạng thái kết nối sidebar.

#### Config

Sửa cấu hình gateway. Cùng các cài đặt có trong file config JSON5, nhưng với trình soạn thảo trực quan.

#### Approvals

Quản lý quy trình Exec Approval — xem xét và chấp thuận/từ chối việc thực thi tool cần xác nhận của người dùng.

#### CLI Credentials

Quản lý thông tin xác thực CLI cho truy cập dòng lệnh an toàn vào GoClaw.

#### API Keys

Quản lý API key cho truy cập lập trình — tạo, thu hồi và gán role cho key. Key dùng định dạng tiền tố `goclaw_` và hỗ trợ scope dựa trên role (admin, operator, viewer).

#### Tenants (Chế độ Multi-Tenant)

<!-- TODO: Screenshot — Trang quản trị tenant -->

Quản lý tenant trong chế độ triển khai SaaS — tạo tenant, gán user, cấu hình ghi đè riêng theo tenant cho provider, tool, skill, và MCP server. Chỉ hiển thị khi chạy ở chế độ multi-tenant.

## Desktop Edition

Desktop Edition là ứng dụng native (xây dựng bằng Wails) bao bọc toàn bộ dashboard trong một cửa sổ độc lập. Nó có thêm các tính năng không có trong web dashboard thông thường.

### Hiển thị phiên bản

Phần header của sidebar hiển thị phiên bản ứng dụng hiện tại bên cạnh logo GoClaw theo định dạng monospace (ví dụ: `v1.2.3`). Nhấn badge **Lite** để mở modal so sánh các edition.

### Kiểm tra cập nhật

Cạnh số phiên bản có một nút làm mới (↻):

- Nhấn để kiểm tra xem có phiên bản mới hơn không
- Khi đang kiểm tra, nút hiển thị `...`
- Nếu tìm thấy bản cập nhật, hiện số phiên bản mới (ví dụ: `v1.3.0`)
- Nếu đã dùng bản mới nhất, hiện `✓`
- Nếu kiểm tra thất bại, hiện `✗`

Edition Lite hỗ trợ tối đa 5 agent. Khi đạt giới hạn, nút "New agent" bị vô hiệu hóa.

### Update Banner

Khi phát hiện phiên bản mới tự động (qua sự kiện nền), một banner xuất hiện ở đầu ứng dụng:

- **Available** — hiển thị phiên bản mới kèm nút "Update Now". Nhấn để tải xuống và cài đặt.
- **Downloading** — hiển thị spinner trong khi đang tải bản cập nhật.
- **Done** — hiển thị nút "Restart Now". Nhấn để áp dụng bản cập nhật.
- **Error** — hiển thị nút "Retry". Banner có thể đóng bằng nút X.

### Modal Cài đặt Team

Mở Team Settings từ giao diện Agent Teams. Modal có ba phần:

**Thông tin Team**
- Sửa tên và mô tả team
- Xem trạng thái hiện tại và lead agent

**Thành viên**
- Danh sách tất cả thành viên team với role của họ (lead, reviewer, member)
- Thêm thành viên mới bằng cách tìm kiếm agent trong combobox
- Xóa thành viên không phải lead (di chuột để hiện nút xóa)

**Thông báo**
Bật/tắt thông báo theo từng loại sự kiện:
- `dispatched` — task được giao cho agent
- `progress` — cập nhật tiến độ task
- `failed` — task thất bại
- `completed` — task hoàn thành
- `new_task` — task mới được thêm vào team

Chế độ thông báo:
- **Direct** — tất cả thành viên team nhận thông báo
- **Leader** — chỉ lead agent nhận thông báo

### Modal Chi tiết Task

Nhấn vào bất kỳ task card nào để mở modal Task Detail. Modal hiển thị:

- **Identifier** — ID ngắn của task (badge monospace)
- **Badge trạng thái** — trạng thái hiện tại với màu sắc tương ứng; hiện badge "Running" có animation nếu đang thực thi
- **Thanh tiến độ** — hiển thị phần trăm và bước hiện tại (khi task đang chạy)
- **Metadata grid** — độ ưu tiên, agent được giao, loại task, thời gian tạo/cập nhật
- **Blocked by** — danh sách ID task đang chặn, hiển thị dưới dạng badge màu vàng
- **Description** — phần có thể thu gọn với markdown rendering
- **Result** — phần có thể thu gọn với markdown rendering (khi task hoàn thành)
- **Attachments** — phần có thể thu gọn liệt kê các file đính kèm; mỗi mục hiện tên file, dung lượng và nút Download

Hành động ở footer:
- **Assign to** — combobox để giao lại task cho thành viên khác trong team (chỉ hiện với task chưa kết thúc)
- **Delete** — chỉ hiện với task đã completed/failed/cancelled; hiện hộp thoại xác nhận trước khi xóa

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Dashboard không load | Kiểm tra self-service container đang chạy: `docker compose ps` |
| Không kết nối được API | Xác minh `GOCLAW_GATEWAY_TOKEN` đặt đúng |
| Thay đổi không phản ánh | Hard refresh trình duyệt (Ctrl+Shift+R) |

## Tiếp theo

- [Configuration](/configuration) — Sửa cài đặt qua file config thay thế
- [GoClaw hoạt động như thế nào](/how-goclaw-works) — Hiểu về kiến trúc
- [Agents Explained](/agents-explained) — Tìm hiểu về loại agent

<!-- goclaw-source: 231bc968 | cập nhật: 2026-03-27 -->
<!-- TODO: Screenshots cần cho v2.x UI — chạy instance GoClaw và chụp:
  1. Team kanban board với task card trong các cột
  2. Trang chi tiết cron với markdown rendering
  3. Trang chi tiết provider (thiết kế lại)
  4. Trang quản trị tenant (chế độ multi-tenant)
  5. Trang chat với media gallery và image download overlay
  6. Sidebar hiển thị phiên bản server trong trạng thái kết nối
  7. Trang đăng nhập với theme toggle
-->
