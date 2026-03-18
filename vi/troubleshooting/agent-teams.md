# Sự Cố Agent Team

> Khắc phục sự cố tạo team, delegation, định tuyến task, và giao tiếp giữa các agent.

## Tổng quan

Agent team cho phép một lead agent điều phối công việc qua nhiều member agent bằng task board chung, messaging, và thư mục workspace chung. Hầu hết sự cố rơi vào bốn nhóm: thiết lập team, vòng đời task, lỗi dispatch, và lỗi messaging.

## Tạo Team

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Member agent không được thêm vào team | Agent key không tìm thấy khi tạo team | Xác minh agent key tồn tại trong dashboard trước khi tạo team |
| `failed to add member` (trong log) | Lỗi DB khi thêm member trong `teams.create` | Kiểm tra kết nối PostgreSQL; thử tạo lại team |
| Agent hiển thị sai role | Role gán không đúng lúc tạo | Xóa rồi thêm lại member qua dashboard với role đúng |

## Delegation & Subagent

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Task tự thất bại với "auto-failed after N dispatch attempts" | Agent không hoàn thành task 3 lần liên tiếp (circuit breaker kích hoạt) | Kiểm tra log của member agent để tìm lỗi lặp lại; sửa vấn đề gốc rồi tạo lại task |
| `team_tasks.dispatch: cannot resolve agent` (log) | Agent ID được gán không tìm thấy trong DB lúc dispatch | Xác nhận member agent chưa bị xóa; gán lại task cho member đang hoạt động |
| `team_tasks.dispatch: inbound buffer full` (log) | Hàng đợi inbound của message bus bị đầy | Tạm thời — dispatcher thử lại ở ticker tiếp theo (tối đa 5 phút); giảm volume task đồng thời nếu lỗi kéo dài |
| Dùng `spawn` thay vì delegation | Agent tự nhân bản thay vì delegate cho member | Hướng dẫn lead agent: "Không dùng `spawn` để delegation trong team — dùng `team_tasks` thay thế" |
| Workspace của subagent không được tạo | Tạo thư mục workspace thất bại khi chạy | Kiểm tra quyền `data_dir`; đảm bảo thư mục data đã cấu hình có thể ghi |

## Định Tuyến Task

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Task bị kẹt ở trạng thái `pending` | Chưa gán owner hoặc các blocker task chưa hoàn thành | Gán owner qua dashboard, hoặc đợi blocker task xong — task được bỏ chặn sẽ tự dispatch trong vòng 5 phút |
| `only the team lead can perform this action` | Member agent thực hiện thao tác chỉ dành cho lead (tạo/xóa task) | Chỉ session của lead agent mới có thể tạo hoặc xóa task; kiểm tra agent nào đang gọi `team_tasks` |
| `only the assigned task owner can update progress` | Lead thử cập nhật tiến độ task của member | Cập nhật tiến độ phải từ member agent được gán; lead nhận kết quả tự động khi hoàn thành |
| `blocked_by contains invalid task ID` | Danh sách `blocked_by` chứa UUID task không tồn tại hoặc thuộc team khác | Tạo các task dependency trước; dùng UUID trả về của chúng trong `blocked_by` |
| `assignee not found` hoặc `agent is not a member of this team` | Sai agent key hoặc agent đã bị xóa khỏi team | Xác minh agent key bằng `team_tasks(action="list_members")`; thêm lại agent nếu cần |
| `You must check existing tasks first` | Agent gọi `create` mà không tìm kiếm task trùng trước | Gọi `team_tasks(action="search", query="<keywords>")` trước khi tạo task mới |
| Task bị xóa nhưng vẫn được tham chiếu | Task bị xóa khi đang ở trạng thái `in_progress` | Chỉ các task `completed`, `failed`, hoặc `cancelled` mới có thể xóa; hủy task trước |

## Messaging Trong Team

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| `agent "X" is not a member of your team` | Gửi đến agent ngoài team | Dùng `team_tasks(action="list_members")` để lấy agent key hợp lệ |
| `to parameter is required for send action` | Gọi `team_message` không có người nhận | Cung cấp trường `to` với agent key đích |
| `text parameter is required` | Thiếu nội dung tin nhắn trong lệnh `send` hoặc `broadcast` | Thêm `text` vào tham số công cụ |
| `failed to send message` | Lỗi DB khi lưu tin nhắn | Kiểm tra log PostgreSQL; thường là tạm thời |
| `failed to broadcast message` | Lỗi bus hoặc DB trong quá trình broadcast | Tương tự trên — thử lại hoặc kiểm tra log server |
| `failed to auto-create task` từ broadcast (log) | Tạo task tự động khi nhận broadcast thất bại | Không nghiêm trọng — tin nhắn vẫn được giao nhưng không tạo task; tạo task thủ công nếu cần |
| `failed to get unread messages` | Lỗi đọc DB cho hộp thư | Kiểm tra kết nối PostgreSQL |

## Chẩn Đoán

Dùng tab **Teams** trong Dashboard để xem trạng thái task, event, và trạng thái member theo thời gian thực — lọc theo `team_id` để thu hẹp phạm vi.

Để debug ở tầng thấp hơn, truy vấn event log của task:

```
team_tasks(action="events", task_id="<uuid>")
```

Lệnh này trả về toàn bộ lịch sử thay đổi trạng thái của task, bao gồm dispatch count được lưu trong metadata.

## Tiếp Theo

- [Hướng dẫn Agent Teams](#teams-what-are-teams) — thiết lập team, role, và task board
- [Sự Cố Thường Gặp](#troubleshoot-common) — khắc phục sự cố gateway và agent chung

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
