> Bản dịch từ [English version](../../getting-started/web-dashboard-tour.md)

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

Tạo agent team cho các tác vụ cộng tác. Nhấn vào team để xem:
- **Members** — Gán agent vào team và quản lý vai trò
- **Tasks** — Task board chung của team
- **Delegations** — Theo dõi agent nào đã phân công tác vụ cho agent khác, kèm trạng thái và kết quả
- **Settings** — Cấu hình team

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

#### Builtin Tools

Duyệt 32 tool tích hợp sẵn của GoClaw. Bật/tắt từng tool và chỉnh sửa settings của chúng.

#### MCP Servers

Kết nối Model Context Protocol server để mở rộng khả năng của agent vượt ra ngoài các tool tích hợp.

**Ví dụ:** Nếu bạn chạy một server knowledge base nội bộ, bạn có thể kết nối qua MCP để GoClaw agent tự động truy vấn tài liệu riêng của bạn.

Thêm server URL, xem các tool có sẵn, và kiểm tra kết nối.

#### TTS (Text-to-Speech)

Cấu hình dịch vụ Text-to-Speech. Các provider hỗ trợ: OpenAI, ElevenLabs, Edge, MiniMax.

#### Cron Jobs

Lên lịch tác vụ qua form dialog. Điền tên, chọn agent, chọn loại lịch, và viết message cho agent biết cần làm gì. Ba loại lịch:
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

Quản lý LLM provider (API key, cấu hình model). Hỗ trợ Anthropic (native) và các provider tương thích OpenAI.

#### Config

Sửa cấu hình gateway. Cùng các cài đặt có trong file config JSON5, nhưng với trình soạn thảo trực quan.

#### Approvals

Quản lý quy trình Exec Approval — xem xét và chấp thuận/từ chối việc thực thi tool cần xác nhận của người dùng.

#### CLI Credentials

Quản lý thông tin xác thực CLI cho truy cập dòng lệnh an toàn vào GoClaw.

#### API Keys

Quản lý API key cho truy cập lập trình — tạo, thu hồi và gán role cho key.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Dashboard không load | Kiểm tra self-service container đang chạy: `docker compose ps` |
| Không kết nối được API | Xác minh `GOCLAW_GATEWAY_TOKEN` đặt đúng |
| Thay đổi không phản ánh | Hard refresh trình duyệt (Ctrl+Shift+R) |

## Tiếp theo

- [Configuration](configuration.md) — Sửa cài đặt qua file config thay thế
- [GoClaw hoạt động như thế nào](../core-concepts/how-goclaw-works.md) — Hiểu về kiến trúc
- [Agents Explained](../core-concepts/agents-explained.md) — Tìm hiểu về loại agent
