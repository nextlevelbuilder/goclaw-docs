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

## Các Tab Dashboard

### Setup Wizard

Cách cài đặt lần đầu thay thế cho `./goclaw onboard`. Hướng dẫn bạn qua việc chọn provider, nhập API key, và cấu hình channel — tất cả trên trình duyệt.

### Agents

Tạo, sửa, và xóa agent. Mỗi agent card hiển thị:
- Tên và model
- Provider và temperature
- Quyền truy cập tool
- Số session đang hoạt động

Nhấn vào agent để mở cửa sổ chat thử nghiệm.

### Channels

Bật và cấu hình các channel nhắn tin:
- **Telegram** — Bot token, danh sách user/group được phép
- **Discord** — Bot token, cài đặt guild
- **WhatsApp** — QR code kết nối
- **Zalo** — App credentials
- **Feishu/Lark** — App ID và secret

### Skills

Upload file `SKILL.md` để agent có thể khám phá và sử dụng. Skills có thể tìm kiếm bằng semantic matching — agent tìm đúng skill dựa trên yêu cầu của người dùng.

### MCP Servers

Kết nối Model Context Protocol server để mở rộng khả năng của agent. Thêm server URL, xem các tool có sẵn, và kiểm tra kết nối.

### Custom Tools

Định nghĩa tool tùy chỉnh ngoài 60+ tool tích hợp sẵn. Đặt input schema, execution handler, và rate limit.

### Cron Jobs

Lên lịch tác vụ định kỳ. Mỗi cron job chạy như một agent với prompt cụ thể theo lịch (cú pháp cron tiêu chuẩn).

### Traces

Lịch sử gọi LLM bao gồm:
- Lượng token dùng và theo dõi chi phí
- Cặp request/response
- Chuỗi tool call
- Số liệu latency

### Sessions

Xem session đang hoạt động và lịch sử. Xem conversation history theo user, theo agent, theo channel.

### Teams

Tạo agent team cho các tác vụ cộng tác:
- Gán agent vào team
- Xem task board chung
- Theo dõi chuỗi phân công

### Agent Links

Cấu hình agent nào có thể phân công cho agent khác:
- Đặt quyền phân công
- Cấu hình giới hạn concurrency
- Định nghĩa quy tắc handoff

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
