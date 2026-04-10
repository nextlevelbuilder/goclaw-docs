> Bản dịch từ [English version](/caching)

# Caching

> Giảm truy vấn database với bộ nhớ đệm in-memory hoặc Redis cho dữ liệu truy cập thường xuyên.

## Tổng quan

GoClaw sử dụng lớp caching chung để giảm các truy vấn database lặp lại. Ba cache instance được tạo khi khởi động:

| Cache instance | Key prefix | Lưu trữ gì |
|----------------|------------|-------------|
| `ctx:agent` | Context file cấp agent | `SOUL.md`, `IDENTITY.md`, v.v. theo agent |
| `ctx:user` | Context file cấp user | Context file per-user theo key `agentID:userID` |
| `grp:writers` | Danh sách file writer nhóm | Danh sách quyền writer theo key `agentID:groupID` |

Cả ba instance đều dùng chung TTL: **5 phút**.

Có hai backend:

| Backend | Khi nào sử dụng |
|---------|-----------------|
| **In-memory** (mặc định) | Một instance, phát triển, triển khai nhỏ |
| **Redis** | Production nhiều instance, cache chia sẻ giữa các replica |

Cả hai backend đều **fail-open** — lỗi cache được ghi log cảnh báo nhưng không bao giờ chặn thao tác. Cache miss đơn giản có nghĩa là thao tác tiếp tục với truy vấn database mới.

---

## In-Memory Cache

Cache mặc định — không cần cấu hình. Sử dụng `sync.Map` an toàn luồng với hết hạn dựa trên TTL.

- Entry được kiểm tra khi đọc; entry hết hạn bị xóa lazy khi truy cập
- Không có goroutine dọn dẹp nền — dọn dẹp chỉ xảy ra khi gọi `Get` và `Delete`
- Cache bị mất khi khởi động lại

Phù hợp nhất cho triển khai một instance nơi không cần lưu trữ cache.

---

## Redis Cache

Bật Redis caching bằng cách build GoClaw với build tag `redis` và đặt `GOCLAW_REDIS_DSN`.

```bash
go build -tags redis ./...
export GOCLAW_REDIS_DSN="redis://localhost:6379/0"
```

Nếu `GOCLAW_REDIS_DSN` chưa được đặt hoặc kết nối thất bại khi khởi động, GoClaw tự động fallback về in-memory cache.

**Định dạng key:** `goclaw:{prefix}:{key}`

Ví dụ, một entry context file của agent được lưu dưới dạng `goclaw:ctx:agent:<agentUUID>`.

**Cài đặt kết nối:**
- Pool size: 10 kết nối
- Min idle: 2 kết nối
- Dial timeout: 5s
- Read timeout: 3s
- Write timeout: 3s
- Health check: PING khi khởi động

**Định dạng DSN:**
```
redis://localhost:6379/0
redis://:password@redis.example.com:6379/1
```

Giá trị được serialize dưới dạng JSON. Xóa theo pattern sử dụng SCAN với batch 100 key mỗi lần lặp.

---

## Permission Cache

GoClaw có `PermissionCache` chuyên dụng cho các tra cứu quyền thường xuyên xảy ra trên mỗi request. Khác với context file cache, permission cache luôn là in-memory — không dùng Redis.

| Cache | TTL | Định dạng key | Lưu trữ gì |
|---|---|---|---|
| `tenantRole` | 30s | `tenantID:userID` | Vai trò người dùng trong tenant |
| `agentAccess` | 30s | `agentID:userID` | Người dùng có quyền truy cập agent không + vai trò của họ |
| `teamAccess` | 30s | `teamID:userID` | Người dùng có quyền truy cập team không |

**Invalidation qua pubsub**: Khi quyền người dùng thay đổi (ví dụ cập nhật vai trò, thu hồi quyền truy cập agent), GoClaw publish sự kiện `CacheInvalidate` trên internal bus. Permission cache xử lý các sự kiện này:

- `CacheKindTenantUsers` — xóa tất cả entry tenant role (TTL ngắn nên clear toàn bộ là chấp nhận được)
- `CacheKindAgentAccess` — xóa tất cả entry có prefix `agentID` đó
- `CacheKindTeamAccess` — xóa tất cả entry có prefix `teamID` đó

Thay đổi quyền có hiệu lực trong tối đa 30 giây, với invalidation tức thì trên các write path.

---

## Hành vi Cache

Cả hai backend cùng implement một interface:

| Thao tác | Hành vi |
|----------|---------|
| `Get` | Trả về giá trị + cờ tìm thấy; với in-memory, xóa entry hết hạn khi đọc |
| `Set` | Lưu giá trị với TTL; TTL bằng `0` có nghĩa entry không bao giờ hết hạn |
| `Delete` | Xóa một key |
| `DeleteByPrefix` | Xóa tất cả key khớp prefix (in-memory: range scan; Redis: SCAN + DEL) |
| `Clear` | Xóa tất cả entry theo key prefix của cache instance |

**Xử lý lỗi:** Tất cả lỗi Redis đều được coi như cache miss. Lỗi kết nối, lỗi serialization, và timeout đều được log nhưng không bao giờ lan truyền đến caller.

---

## Tiếp theo

- [Cài đặt Database](/deploy-database) — Cấu hình PostgreSQL
- [Production Checklist](/deploy-checklist) — Triển khai an toàn

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
