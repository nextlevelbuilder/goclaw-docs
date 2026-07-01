# Ma trận phân quyền Agent

> Toàn bộ các lớp phân quyền quyết định một agent được làm gì trên các channel, group, và workspace — và cách các lớp đó kết hợp với nhau.

## Tổng quan

Một hành động đơn lẻ của agent (gửi reply, ghi file workspace, sửa file context) đi qua nhiều lớp phân quyền độc lập. Mỗi lớp có thể cho phép hoặc từ chối, và chúng xếp chồng: một hành động chỉ được phép khi mọi lớp áp dụng đều cho phép. Trang này lập bản đồ các lớp đó, các quy tắc quyền cấu hình agent mà bạn có thể cấp từ chat, ma trận theo từng channel, và những quy tắc hay gây bất ngờ nhất (ghi context Zalo và credential theo context channel).

Nếu bạn chỉ cần vai trò gateway-token, xem [API Keys & RBAC](/api-keys-rbac) — đó là lớp 1. Trang này bao quát các lớp phía trên nó.

## Các lớp phân quyền

| Lớp | Phạm vi | Ghi chú |
|-----|---------|---------|
| Tenant RBAC | Dashboard, HTTP, WebSocket RPC | Viewer / operator / admin / owner. Các method chỉ-admin bao gồm `config.permissions.*`. |
| Sở hữu / chia sẻ agent | Agent nào user thấy và quản lý được | Owner cộng các share rõ ràng; xem [Chia sẻ và Kiểm soát Truy cập](/sharing-and-access). |
| Thành viên channel | Phân phối qua nền tảng | Nền tảng vẫn có thể từ chối phân phối outbound sau khi GoClaw đã cho phép hành động. |
| Quyền cấu hình agent | Sửa cấu hình từ chat | Match theo `agent_id`, `scope`, `config_type`, và `user_id`, bao gồm cả row wildcard. |
| Ranh giới file workspace | Truy cập filesystem | Ngăn thoát path và ghi không hợp lệ. |
| Ranh giới file context | File định danh / context của agent | File được bảo vệ được định tuyến vào store và yêu cầu quyền writer của group trong context group. |
| Năng lực context channel | Thực thi tool MCP + Secure CLI | Thứ tự ưu tiên credential: credential user > credential/grant context > grant agent > mặc định toàn cục. |

## Row quyền cấu hình agent

Agent có thể được sửa một phần cấu hình từ chat (ví dụ bật một file writer hay heartbeat). Mỗi quy tắc quyền là một row với bốn trường:

| Trường | Ví dụ | Ý nghĩa |
|--------|-------|---------|
| `scope` | `agent`, `group:*`, `group:zalo:123`, `group:telegram:-100`, `*` | Nơi grant áp dụng. |
| `config_type` | `file_writer`, `heartbeat`, `cron`, `context_files`, `*` | Họ hành động nào được grant bao phủ. |
| `user_id` | `123456`, `zalo-user-id`, `*` | Grant áp dụng cho ai. `*` cấp cho mọi thành viên trong scope đã chọn. |
| `permission` | `allow`, `deny` | Quyết định. Một deny có thể ghi đè một allow rộng hơn. |

### Thứ tự ưu tiên hiệu lực

Khi nhiều row match một yêu cầu, GoClaw resolve từ trên xuống và dừng ở cái đầu tiên áp dụng:

1. Deny cá nhân.
2. Allow cá nhân.
3. Deny wildcard theo scope/user.
4. Allow wildcard theo scope/user.
5. Mặc định deny.

Vì vậy một `deny` cụ thể cho một user luôn thắng một `allow` wildcard, và bất cứ thứ gì không match đều bị từ chối theo mặc định.

## Ma trận channel

Một agent được làm gì phụ thuộc vào nơi yêu cầu phát sinh. Bảng này tóm tắt các context channel phổ biến.

| Context channel | Đọc output agent | Gửi reply | Ghi file workspace | Ghi file context được bảo vệ | Cấp cho mọi thành viên |
|-----------------|------------------|-----------|--------------------|------------------------------|------------------------|
| Dashboard | Theo RBAC | N/A | Đường admin/operator, rồi ranh giới workspace | Đường admin, rồi context interceptor | Dùng tab Permissions |
| Direct message | Theo truy cập agent/session | Channel adapter | Cho phép theo ranh giới workspace | Cho phép theo quy tắc agent/context | Thường không cần |
| Group Telegram | Scope group + sender ID | Channel adapter | Cần `file_writer` khi bị gate theo group | Cần `context_files` hoặc `file_writer` và sender thật | `scope=group:telegram:<chatId>`, `user_id=*` |
| Group Zalo | Scope group + sender ID | Channel adapter, metadata thread group | Cần `file_writer` khi bị gate theo group | Cần `context_files` hoặc `file_writer` và sender thật | `scope=group:zalo:<chatId>`, `user_id=*` |
| Guild/channel Discord | Scope guild + sender ID | Channel adapter | Cần `file_writer` khi bị gate theo guild | Cần `context_files` hoặc `file_writer` và sender thật | `scope=guild:<id>` hoặc scope group khớp, `user_id=*` |
| Chạy theo lịch / proactive | Sender hệ thống | Channel adapter | Từ chối ghi bị gate theo group trừ khi context được nâng quyền | Từ chối ghi context group được bảo vệ | Cấu hình quy tắc rõ ràng, hoặc chạy từ context dashboard/admin |

## Quy tắc ghi context Zalo

Một lỗi group Zalo phổ biến là agent cố ghi một file context được bảo vệ — `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `USER.md`, `USER_PREDEFINED.md`, hoặc `CAPABILITIES.md` — từ một session group nơi sender đang thiếu. Ghi context được bảo vệ đi qua group permission gate, yêu cầu:

- `sender_id` là **user nền tảng thật**, không rỗng hoặc tổng hợp.
- `user_id` xác định scope group, ví dụ `group:zalo:<chatId>`.
- Sender match một allow `context_files` (hoặc một allow `file_writer` cũ), bao gồm cả row wildcard như `user_id="*"`.
- Thiếu tenant context hoặc lỗi permission-store sẽ **fail closed** — ghi bị từ chối thay vì được phép.

Nếu một thao tác ghi group Zalo bị từ chối, hãy kiểm tra message có mang sender thật không và có một quy tắc `context_files` khớp cho scope group đó không.

## Tab Permissions (UX)

Tab Permissions trên dashboard là một trình soạn ma trận đầy đủ cho các row ở trên:

| Điều khiển | Hành vi |
|-----------|---------|
| Bộ chọn user/contact | Chấp nhận user ID rõ ràng và kết quả tìm kiếm contact. |
| Nút All members | Đặt `user_id="*"` cho quy tắc hiện tại. |
| Bộ chọn config type | `file_writer`, `heartbeat`, `cron`, `context_files`, hoặc `*`. |
| Bộ chọn scope | Group đã biết, `group:*`, `agent`, hoặc `*`. |
| Check access | Gọi `config.permissions.check` và hiển thị quyết định allow/deny hiệu lực trước hoặc sau khi lưu. |

Dùng **Check access** để xem trước quyết định hiệu lực cho một user và scope cụ thể mà không cần lưu — nó chạy cùng phép resolve thứ tự ưu tiên mà runtime dùng.

## Năng lực context channel

Channel instance phơi bày các context đã lưu trong dashboard và API. Context cơ sở là chính channel instance; context group đến từ channel contact đã lưu. Mỗi row năng lực kết hợp khả năng nhìn thấy MCP và Secure CLI cho context đó — nguồn, trạng thái bật, danh sách allow/deny tool, và liệu có credential hay không.

Row credential context **không bao giờ trả về tài liệu bí mật**. Chúng chỉ project metadata như `has_api_key`, `has_env`, `credential_source`, và tên key nơi có sẵn. Thao tác ghi bị gate ở mức tenant-admin, và việc resolve runtime mang `ChannelContextScope` để grant và credential chỉ áp dụng cho scope channel/group khớp.

### Thứ tự ưu tiên credential theo context channel

Khi một tool chạy trong context channel, GoClaw resolve credential theo thứ tự — match đầu tiên thắng:

1. Credential user.
2. Credential / grant context.
3. Grant agent.
4. Mặc định toàn cục.

Điều này phản chiếu thứ tự ưu tiên credential dạng typed mà adapter git dùng (xem [CLI Credentials](/cli-credentials)).

## Lưu ý bảo mật

- Wildcard `user_id="*"` nên dễ cấp nhưng luôn **hiển thị rõ ràng** — nó mở rộng truy cập cho mọi thành viên trong scope.
- Sender tổng hợp vẫn bị từ chối ghi file/context group, nên một lượt hệ thống không bao giờ thừa hưởng quyền từ một user thật mà nó không phải.
- Lỗi permission-store **fail closed** tại ranh giới mutation group.
- Backend validation từ chối config type và permission không xác định trước khi ghi bất kỳ quy tắc nào.
- Quyền gửi của nền tảng tách biệt với quyền GoClaw: một channel adapter vẫn có thể từ chối phân phối ngay cả khi GoClaw cho phép hành động của agent.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Ghi context group Zalo bị từ chối | Đảm bảo message có `sender_id` thật và một allow `context_files` (hoặc `file_writer`) khớp cho `group:zalo:<chatId>`. |
| Allow wildcard không có hiệu lực | Một `deny` cá nhân thắng một `allow` wildcard. Bỏ deny hoặc thu hẹp scope của nó. |
| Chạy theo lịch không ghi được file group | Lượt proactive/hệ thống bị từ chối ghi bị gate theo group — cấu hình một quy tắc rõ ràng hoặc chạy từ context dashboard/admin. |
| Reply do GoClaw gửi không bao giờ tới | Channel adapter đã từ chối phân phối — quyền GoClaw và quyền gửi của nền tảng độc lập với nhau. |

## Tiếp theo

- [API Keys & RBAC](/api-keys-rbac) — lớp 1: vai trò và scope gateway-token
- [Chia sẻ và Kiểm soát Truy cập](/sharing-and-access) — sở hữu và chia sẻ agent
- [CLI Credentials](/cli-credentials) — credential dạng typed và thứ tự ưu tiên credential theo context channel
- [Security Hardening](/deploy-security) — tổng quan bảo mật năm lớp đầy đủ

<!-- goclaw-source: fabe86b3 | cập nhật: 2026-06-30 -->
