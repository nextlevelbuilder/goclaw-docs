> Bản dịch từ [English version](../../advanced/caching.md)

# Caching

> Tăng tốc các thao tác lặp lại với bộ nhớ đệm in-memory hoặc Redis.

## Tổng quan

GoClaw sử dụng lớp caching chung cho các thao tác nội bộ như kết quả công cụ, phản hồi provider, và dữ liệu truy cập thường xuyên. Có hai backend:

| Backend | Khi nào sử dụng |
|---------|-----------------|
| **In-memory** (mặc định) | Một instance, phát triển, triển khai nhỏ |
| **Redis** | Production nhiều instance, cache chia sẻ giữa các replica |

Cả hai backend đều **fail-open** — lỗi cache được ghi log cảnh báo nhưng không bao giờ chặn thao tác. Cache miss đơn giản có nghĩa là thao tác chạy không có cache.

---

## In-Memory Cache

Cache mặc định — không cần cấu hình. Sử dụng concurrent map an toàn luồng với hết hạn dựa trên TTL.

- Entry được kiểm tra khi đọc; entry hết hạn tự động bị xóa
- Không có goroutine dọn dẹp nền — dọn dẹp diễn ra lazy khi đọc và xóa
- Cache bị mất khi khởi động lại

Phù hợp nhất cho triển khai một instance nơi không cần lưu trữ cache.

---

## Redis Cache

Bật Redis caching bằng cách build GoClaw với build tag `redis` và cung cấp Redis DSN.

**Định dạng key:** `goclaw:{prefix}:{key}`

**Cài đặt kết nối:**
- Pool size: 10 kết nối
- Min idle: 2 kết nối
- Dial timeout: 5s
- Read timeout: 3s
- Write timeout: 3s
- Health check: PING khi kết nối

**Định dạng DSN:**
```
redis://localhost:6379/0
redis://:password@redis.example.com:6379/1
```

Giá trị được serialize dưới dạng JSON. Xóa theo pattern sử dụng SCAN với batch 100 key mỗi lần lặp.

---

## Hành vi Cache

Cả hai backend cùng implement một interface:

| Thao tác | Hành vi |
|----------|---------|
| `Get` | Trả về giá trị + cờ tìm thấy; xóa entry hết hạn |
| `Set` | Lưu giá trị với TTL |
| `Delete` | Xóa một key |
| `DeleteByPrefix` | Xóa tất cả key khớp prefix |
| `Clear` | Xóa tất cả entry đã cache |

**Xử lý lỗi:** Tất cả lỗi được coi như cache miss. Lỗi kết nối Redis, lỗi serialization, và timeout đều được log nhưng không bao giờ lan truyền đến caller.

---

## Tiếp theo

- [Cài đặt Database](../deployment/database-setup.md) — Cấu hình PostgreSQL
- [Production Checklist](../deployment/production-checklist.md) — Triển khai an toàn
