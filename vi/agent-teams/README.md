# Tài liệu Agent Teams

Agent teams cho phép nhiều agent cộng tác với bảng công việc chung, hộp thư, và hệ thống ủy quyền phối hợp.

## Điều hướng nhanh

1. **[Agent Teams là gì?](/teams-what-are-teams)** — Tổng quan mô hình team, nguyên tắc thiết kế, ví dụ thực tế
2. **[Tạo & Quản lý Teams](/teams-creating)** — Tạo team qua API/CLI/Dashboard, quản lý thành viên, cài đặt
3. **[Bảng công việc](/teams-task-board)** — Vòng đời task, trạng thái, các hành động core
4. **[Nhắn tin Team](/teams-messaging)** — Tin nhắn trực tiếp, broadcast, định tuyến qua bus
5. **[Ủy quyền & Chuyển giao](/teams-delegation)** — Liên kết task bắt buộc, sync/async, tìm kiếm

## Khái niệm chính

**Lead Agent**: Điều phối công việc, tạo task, ủy quyền cho thành viên, tổng hợp kết quả. Nhận `TEAM.md` với hướng dẫn đầy đủ.

**Member Agent**: Thực thi công việc được ủy quyền, nhận task, báo cáo kết quả. Truy cập ngữ cảnh qua tools.

**Bảng công việc**: Theo dõi công việc chung với độ ưu tiên, phụ thuộc, và vòng đời.

**Hộp thư**: Tin nhắn trực tiếp, broadcast, gửi thời gian thực qua message bus.

**Ủy quyền**: Parent tạo công việc cho child agent với liên kết task bắt buộc.

**Chuyển giao**: Chuyển quyền kiểm soát hội thoại mà không gián đoạn phiên người dùng.

## Tham khảo Tool

| Tool | Hành động | Người dùng |
|------|---------|-------|
| `team_tasks` | list, get, create, claim, complete, cancel, search | Tất cả thành viên |
| `team_message` | send, broadcast, read | Tất cả thành viên |
| `spawn` | (hành động ngầm) | Chỉ Lead |
| `handoff` | transfer, clear | Bất kỳ agent |
| `delegate_search` | (hành động ngầm) | Agent có nhiều target |

## Bắt đầu

1. Bắt đầu với [Agent Teams là gì?](/teams-what-are-teams) để hiểu tổng quan
2. Đọc [Tạo & Quản lý Teams](/teams-creating) để thiết lập team đầu tiên
3. Tìm hiểu [Bảng công việc](/teams-task-board) để tạo và quản lý công việc
4. Đọc [Nhắn tin Team](/teams-messaging) cho các mẫu giao tiếp
5. Nắm vững [Ủy quyền & Chuyển giao](/teams-delegation) cho phân phối công việc

## Quy trình phổ biến

### Nghiên cứu song song (3 agent)
1. Lead tạo 3 task
2. Ủy quyền cho analyst, researcher, writer song song
3. Kết quả tự động thông báo cùng nhau
4. Lead tổng hợp và phản hồi

### Review lặp (2 agent)
1. Lead tạo task cho generator
2. Chờ kết quả
3. Tạo task thứ hai cho reviewer với đầu ra của generator
4. Review phản hồi
5. Lặp lại nếu cần

### Chuyển giao hội thoại
1. Người dùng hỏi câu chuyên gia
2. Agent hiện tại nhận ra thiếu chuyên môn
3. Dùng `handoff` để chuyển cho chuyên gia
4. Chuyên gia tiếp tục tự nhiên
5. Người dùng không nhận thấy sự chuyển đổi

## Triết lý thiết kế

- **Tập trung Lead**: Chỉ lead nhận TEAM.md đầy đủ; member giữ gọn nhẹ
- **Theo dõi bắt buộc**: Mỗi ủy quyền liên kết với một task
- **Tự động hoàn thành**: Không cần quản lý state thủ công
- **Batch song song**: Tổng hợp kết quả hiệu quả
- **Fail-open**: Kiểm soát truy cập mặc định mở nếu cấu hình sai
