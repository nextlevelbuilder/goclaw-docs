# API Keys & RBAC

> Quản lý API key với phân quyền theo vai trò cho các triển khai đa người dùng và truy cập lập trình.

## Tổng quan

GoClaw sử dụng **hệ thống phân quyền 5 lớp**. API key và vai trò nằm ở lớp 1 — xác thực gateway. Khi một yêu cầu đến, GoClaw kiểm tra header `Authorization: Bearer <token>`, ánh xạ token thành một vai trò, và áp dụng vai trò đó lên phương thức đang được gọi.

Ba vai trò tồn tại:

| Vai trò | Cấp độ | Mô tả |
|---------|--------|-------|
| `admin` | 3 | Toàn quyền — quản lý API key, agent, cấu hình, team, và mọi quyền bên dưới |
| `operator` | 2 | Đọc + ghi — chat, quản lý session, cron, phê duyệt, pairing |
| `viewer` | 1 | Chỉ đọc — có thể xem danh sách/chi tiết tài nguyên nhưng không thể sửa đổi |

Vai trò **không được gán trực tiếp lên API key**. Thay vào đó, bạn chỉ định **scope** và GoClaw suy ra vai trò hiệu lực từ các scope đó khi xử lý yêu cầu.

---

## Scope

| Scope | Cấp quyền |
|-------|-----------|
| `operator.admin` | Vai trò `admin` — toàn quyền bao gồm quản lý key và cấu hình |
| `operator.write` | Vai trò `operator` — thao tác ghi (chat, session, cron) |
| `operator.approvals` | Vai trò `operator` — chấp nhận/từ chối exec approval |
| `operator.pairing` | Vai trò `operator` — thao tác ghép nối thiết bị |
| `operator.read` | Vai trò `viewer` — chỉ đọc danh sách và chi tiết |

**Suy ra vai trò hiệu lực:** nếu key có `operator.admin` thì là `admin`. Nếu có bất kỳ scope nào trong `operator.write`, `operator.approvals`, hoặc `operator.pairing` thì là `operator`. Chỉ có `operator.read` thì là `viewer`. Một key có thể có nhiều scope — scope có đặc quyền cao nhất sẽ quyết định vai trò.

---

## Phân quyền theo phương thức

| Phương thức | Vai trò yêu cầu |
|-------------|----------------|
| `api_keys.list`, `api_keys.create`, `api_keys.revoke` | admin |
| `config.apply`, `config.patch` | admin |
| `agents.create`, `agents.update`, `agents.delete` | admin |
| `channels.toggle` | admin |
| `teams.list`, `teams.create`, `teams.delete` | admin |
| `pairing.approve`, `pairing.revoke` | admin |
| `chat.send`, `chat.abort` | operator |
| `sessions.delete`, `sessions.reset`, `sessions.patch` | operator |
| `cron.create`, `cron.update`, `cron.delete`, `cron.toggle` | operator |
| `approvals.*`, `exec.approval.*` | operator |
| `pairing.*`, `device.pair.*` | operator |
| `send` | operator |
| Mọi thứ còn lại (liệt kê, xem chi tiết, đọc) | viewer |

---

## Xác thực

Tất cả các yêu cầu HTTP đều dùng xác thực Bearer token:

```
Authorization: Bearer <api-key-của-bạn>
```

Gateway cũng chấp nhận token tĩnh từ `auth.token` trong `config.json`. Token đó hoạt động như super-admin không bị giới hạn scope. API key là cách được khuyến nghị để cấp quyền có phạm vi và có thể thu hồi cho các hệ thống bên ngoài.

---

## Tạo API Key

**Yêu cầu: vai trò admin**

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-pipeline",
    "scopes": ["operator.read", "operator.write"],
    "expires_in": 2592000
  }'
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `name` | có | Tên hiển thị, tối đa 100 ký tự |
| `scopes` | có | Một hoặc nhiều chuỗi scope hợp lệ |
| `expires_in` | không | Thời hạn tính bằng giây; bỏ qua hoặc đặt `null` để key không hết hạn |

Phản hồi (HTTP 201):

```json
{
  "id": "01944f3a-1234-7abc-8def-000000000001",
  "name": "ci-pipeline",
  "prefix": "gc_abcd",
  "key": "gc_abcd1234...full-secret...",
  "scopes": ["operator.read", "operator.write"],
  "expires_at": "2026-04-15T00:00:00Z",
  "created_at": "2026-03-16T10:00:00Z"
}
```

**Trường `key` chỉ được hiển thị một lần duy nhất.** Hãy lưu lại ngay lập tức — không thể lấy lại sau này. Chỉ có hash SHA-256 được lưu trong cơ sở dữ liệu.

---

## Liệt kê API Key

**Yêu cầu: vai trò admin**

```bash
curl http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>"
```

Phản hồi (HTTP 200):

```json
[
  {
    "id": "01944f3a-1234-7abc-8def-000000000001",
    "name": "ci-pipeline",
    "prefix": "gc_abcd",
    "scopes": ["operator.read", "operator.write"],
    "expires_at": "2026-04-15T00:00:00Z",
    "last_used_at": "2026-03-16T09:55:00Z",
    "revoked": false,
    "created_at": "2026-03-16T10:00:00Z"
  }
]
```

Trường `prefix` (8 ký tự đầu) cho phép nhận dạng key mà không cần lưu trữ secret. Raw key không bao giờ được trả về sau khi tạo.

---

## Thu hồi API Key

**Yêu cầu: vai trò admin**

```bash
curl -X POST http://localhost:8080/v1/api-keys/<id>/revoke \
  -H "Authorization: Bearer <admin-token>"
```

Phản hồi (HTTP 200):

```json
{ "status": "revoked" }
```

Thu hồi có hiệu lực ngay lập tức — key được đánh dấu revoked trong cơ sở dữ liệu và cache trong bộ nhớ được xóa qua pubsub.

---

## Phương thức WebSocket RPC

Quản lý API key cũng khả dụng qua kết nối WebSocket. Cả ba phương thức đều yêu cầu scope `operator.admin`.

### Liệt kê key

```json
{ "type": "req", "id": "1", "method": "api_keys.list" }
```

### Tạo key

```json
{
  "type": "req",
  "id": "2",
  "method": "api_keys.create",
  "params": {
    "name": "dashboard-readonly",
    "scopes": ["operator.read"]
  }
}
```

### Thu hồi key

```json
{
  "type": "req",
  "id": "3",
  "method": "api_keys.revoke",
  "params": { "id": "01944f3a-1234-7abc-8def-000000000001" }
}
```

---

## Chi tiết bảo mật

### Băm SHA-256

Raw API key không bao giờ được lưu trữ. Khi tạo, GoClaw sinh một key ngẫu nhiên, chỉ lưu digest hex `SHA-256` của nó, và trả về giá trị thô một lần duy nhất. Mỗi yêu cầu đến đều được băm trước khi tra cứu trong cơ sở dữ liệu.

### Cache trong bộ nhớ với TTL

Sau lần tra cứu đầu tiên, dữ liệu key và vai trò được giải quyết sẽ được cache trong bộ nhớ trong **5 phút**. Điều này loại bỏ các round-trip cơ sở dữ liệu lặp lại trên các endpoint có lưu lượng cao. Cache được đánh key bằng hash — không phải raw token.

### Negative cache

Nếu một token không xác định được trình bày (ví dụ: lỗi đánh máy hoặc key đã bị thu hồi), GoClaw cache lần miss đó như một **negative entry** để tránh làm quá tải cơ sở dữ liệu. Negative cache được giới hạn ở **10.000 entries** để ngăn cạn kiệt bộ nhớ từ các cuộc tấn công token-spraying.

### Vô hiệu hóa cache

Khi một key được tạo hoặc thu hồi, sự kiện `cache.invalidate` được broadcast trên message bus nội bộ. Tất cả các HTTP handler đang hoạt động xóa cache ngay lập tức — không có entry cũ nào tồn tại sau khi thu hồi.

---

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Cách khắc phục |
|--------|-------------|----------------|
| `401 Unauthorized` trên endpoint quản lý key | Người gọi không có vai trò admin | Dùng gateway token hoặc key có scope `operator.admin` |
| `400 invalid scope: X` | Chuỗi scope không được nhận dạng | Chỉ dùng: `operator.admin`, `operator.read`, `operator.write`, `operator.approvals`, `operator.pairing` |
| `400 name is required` | Trường `name` bị thiếu hoặc rỗng | Thêm `"name": "..."` vào body yêu cầu |
| `400 scopes is required` | Mảng `scopes` rỗng hoặc bị thiếu | Bao gồm ít nhất một scope |
| Key hiện `revoked: false` sau khi thu hồi | Cache TTL (5 phút) chưa hết hạn | Chờ tối đa 5 phút hoặc khởi động lại gateway |
| Mất raw key sau khi tạo | Raw key chỉ được trả về một lần theo thiết kế | Thu hồi key và tạo mới |
| `404` khi thu hồi | Key ID sai hoặc đã bị thu hồi | Kiểm tra lại UUID từ endpoint liệt kê |

---

## Tiếp theo

- [Authentication & OAuth](#authentication) — gateway token và luồng OAuth
- [Exec Approval](#exec-approval) — yêu cầu scope `operator.approvals`
- [Security Hardening](#deploy-security) — tổng quan đầy đủ 5 lớp phân quyền

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
