> Bản dịch từ [English version](/usage-quota)

# Usage & Quota

> Theo dõi lượng token tiêu thụ theo agent và session, và thực thi giới hạn request theo người dùng cho các cửa sổ giờ, ngày, và tuần.

## Tổng quan

GoClaw cung cấp hai tính năng liên quan nhưng khác biệt:

- **Usage tracking** — số token mỗi agent/session tiêu thụ, có thể truy vấn qua dashboard hoặc WebSocket.
- **Quota enforcement** — giới hạn tin nhắn tùy chọn theo người dùng/nhóm (ví dụ: 10 request/giờ cho người dùng Telegram) được backed bởi bảng traces.

Cả hai đều luôn có sẵn khi PostgreSQL được kết nối. Quota enforcement là opt-in qua config.

---

## Usage Tracking

Token được tích lũy trong session store khi vòng lặp agent chạy. Mỗi lần gọi LLM thêm vào tổng `input_tokens` và `output_tokens` của session. Bạn có thể truy vấn dữ liệu này qua hai phương thức WebSocket.

### `usage.get` — bản ghi theo session

```json
{
  "type": "req",
  "id": "1",
  "method": "usage.get",
  "params": {
    "agentId": "my-agent",
    "limit": 20,
    "offset": 0
  }
}
```

`agentId` là tùy chọn — bỏ qua để lấy bản ghi trên tất cả agent. Kết quả được sắp xếp gần nhất trước.

Phản hồi:

```json
{
  "records": [
    {
      "agentId": "my-agent",
      "sessionKey": "agent:my-agent:user_telegram_123",
      "model": "claude-sonnet-4-5",
      "provider": "anthropic",
      "inputTokens": 14200,
      "outputTokens": 3100,
      "totalTokens": 17300,
      "timestamp": 1741234567000
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `usage.summary` — tổng hợp theo agent

```json
{ "type": "req", "id": "2", "method": "usage.summary" }
```

Phản hồi:

```json
{
  "byAgent": {
    "my-agent": {
      "inputTokens": 892000,
      "outputTokens": 210000,
      "totalTokens": 1102000,
      "sessions": 37
    }
  },
  "totalRecords": 37
}
```

Session với số token bằng không được loại khỏi cả hai phản hồi.

### HTTP REST API — phân tích từ snapshot

GoClaw cũng cung cấp REST API cho phân tích usage lịch sử, được backed bởi bảng `usage_snapshots` (tổng hợp trước theo giờ). Tất cả endpoint yêu cầu Bearer token nếu `gateway.token` được đặt.

| Endpoint | Mô tả |
|----------|-------|
| `GET /v1/usage/timeseries` | Số token và request theo thời gian, chia nhóm theo giờ (mặc định) |
| `GET /v1/usage/breakdown` | Phân tích tổng hợp nhóm theo `provider`, `model`, hoặc `channel` |
| `GET /v1/usage/summary` | Tóm tắt kỳ hiện tại so với kỳ trước với thống kê delta |

**Tham số truy vấn phổ biến:**

| Tham số | Ví dụ | Ghi chú |
|---------|-------|---------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339, bắt buộc cho timeseries/breakdown |
| `to` | `2026-03-15T23:59:59Z` | RFC 3339, bắt buộc cho timeseries/breakdown |
| `group_by` | `hour`, `provider`, `model`, `channel` | Mặc định khác nhau theo endpoint |
| `agent_id` | UUID | Lọc theo agent |
| `provider` | `anthropic` | Lọc theo provider |
| `model` | `claude-sonnet-4-5` | Lọc theo model |
| `channel` | `telegram` | Lọc theo channel |

**`GET /v1/usage/summary`** nhận thêm tham số `period`:

| Giá trị `period` | Mô tả |
|------------------|-------|
| `24h` (mặc định) | 24 giờ qua so với 24 giờ trước đó |
| `today` | Ngày theo lịch so với ngày trước |
| `7d` | 7 ngày qua so với 7 ngày trước đó |
| `30d` | 30 ngày qua so với 30 ngày trước đó |

Endpoint timeseries gap-fill giờ hiện tại chưa hoàn chỉnh bằng cách truy vấn trực tiếp live traces, nên điểm dữ liệu mới nhất luôn cập nhật.

---

## Giới Hạn Edition (Sub-Agent)

Từ v3 (#600), **edition** đang hoạt động thực thi giới hạn concurrency sub-agent theo tenant. Điều này ngăn một tenant duy nhất chiếm dụng tài nguyên sub-agent.

| Trường edition | Lite mặc định | Standard mặc định | Mô tả |
|---|---|---|---|
| `MaxSubagentConcurrent` | 2 | không giới hạn (0) | Số sub-agent chạy song song tối đa mỗi tenant |
| `MaxSubagentDepth` | 1 | dùng config mặc định | Độ sâu spawn lồng nhau tối đa (1 = sub-agent không thể spawn sub-agent) |

Giá trị `0` nghĩa là không giới hạn. Lite edition là preset bị hạn chế; Standard edition không có giới hạn concurrency.

Khi một spawn request vượt quá `MaxSubagentConcurrent`, GoClaw từ chối spawn và trả về lỗi cho agent cha. Khi vượt `MaxSubagentDepth`, delegation lồng nhau qua `team_tasks` bị chặn (`SubagentDenyAlways`).

Những giới hạn này là cấp edition — áp dụng cho mọi tenant trên instance GoClaw bất kể cài đặt budget per-agent.

---

## Quota Enforcement

Quota được kiểm tra đối với bảng `traces` (chỉ trace cấp cao nhất — các ủy quyền sub-agent không được tính vào quota người dùng). Số lượng được cache trong bộ nhớ 60 giây để tránh truy vấn database quá nhiều trên mỗi request.

### Cấu hình

Thêm block `quota` bên trong `gateway` trong `config.json`:

```json
{
  "gateway": {
    "quota": {
      "enabled": true,
      "default": { "hour": 20, "day": 100, "week": 500 },
      "channels": {
        "telegram": { "hour": 10, "day": 50 }
      },
      "providers": {
        "anthropic": { "day": 200 }
      },
      "groups": {
        "group:telegram:-1001234567": { "hour": 5, "day": 20 }
      }
    }
  }
}
```

Tất cả giới hạn đều tùy chọn — giá trị `0` (hoặc bỏ qua trường) nghĩa là không giới hạn.

**Thứ tự ưu tiên (cụ thể nhất thắng):** `groups` > `channels` > `providers` > `default`

| Trường | Định dạng key | Mô tả |
|-------|-----------|-------------|
| `default` | — | Fallback cho bất kỳ người dùng nào không khớp với quy tắc cụ thể hơn |
| `channels` | Tên channel, ví dụ `"telegram"` | Áp dụng cho tất cả người dùng trên channel đó |
| `providers` | Tên provider, ví dụ `"anthropic"` | Áp dụng khi LLM provider đó được dùng |
| `groups` | ID người dùng/nhóm, ví dụ `"group:telegram:-100123"` | Override theo từng người dùng hoặc nhóm |

### Điều gì xảy ra khi vượt quá quota

Tầng channel kiểm tra quota trước khi dispatch tin nhắn đến agent. Nếu người dùng vượt giới hạn, agent không bao giờ chạy và người dùng nhận thông báo lỗi. Phản hồi bao gồm cửa sổ nào bị vượt và số đếm hiện tại:

```
Quota exceeded: 10/10 requests this hour. Try again later.
```

### `quota.usage` — xem trên dashboard

```json
{ "type": "req", "id": "3", "method": "quota.usage" }
```

Phản hồi khi quota được bật:

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [
    {
      "userId": "user:telegram:123456",
      "hour": { "used": 3, "limit": 10 },
      "day":  { "used": 47, "limit": 100 },
      "week": { "used": 200, "limit": 500 }
    }
  ]
}
```

`entries` được giới hạn tối đa 50 người dùng (top 50 theo số request trong tuần).

Khi quota bị tắt (`"enabled": false`), phản hồi vẫn bao gồm thống kê tổng hợp hôm nay (`requestsToday`, `inputTokensToday`, `costToday`, v.v.) — mảng `entries` rỗng và `"enabled": false`.

---

## Giới hạn tốc độ Webhook (Tầng Channel)

Tách biệt với quota theo người dùng, có một rate limiter ở tầng webhook bảo vệ khỏi lũ webhook đến. Nó sử dụng cửa sổ cố định 60 giây với giới hạn cứng **30 request mỗi key** mỗi cửa sổ. Tối đa **4096 key duy nhất** được theo dõi đồng thời; ngoài đó, các entry cũ nhất bị xóa.

Rate limiter này hoạt động ở tầng HTTP webhook receiver, trước khi tin nhắn đến agent. Không thể cấu hình — đây là biện pháp bảo vệ DoS cố định.

---

## Index Database

Tra cứu quota sử dụng partial index thêm trong migration `000009`:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traces_quota
ON traces (user_id, created_at DESC)
WHERE parent_trace_id IS NULL AND user_id IS NOT NULL;
```

Index này bao gồm 89% traces (chỉ cấp cao nhất) và làm cho các truy vấn cửa sổ giờ/ngày/tuần nhanh ngay cả với bảng traces lớn.

---

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Giải pháp |
|---------|-------|-----|
| `quota.usage` trả về `enabled: false` | `quota.enabled` chưa đặt `true` trong config | Đặt `"enabled": true` trong `gateway.quota` |
| Người dùng chạm quota dù ít dùng | Cache TTL là 60s — số đếm trễ tối đa 1 phút | Hành vi bình thường; increment lạc quan giảm thiểu burst nhanh |
| `requestsToday` là 0 dù có hoạt động | Không có trace được ghi — tracing có thể bị tắt | Đảm bảo PostgreSQL kết nối và `GOCLAW_POSTGRES_DSN` được đặt |
| Quota không được thực thi trên một channel | Tên channel trong config không khớp với key channel thực | Dùng chính xác tên channel: `telegram`, `discord`, `feishu`, `zalo`, `whatsapp` |
| Tin nhắn sub-agent được tính vào quota người dùng | Không nên — chỉ trace cấp cao nhất mới được tính | Xác minh bộ lọc `parent_trace_id IS NULL`; kiểm tra xem agent có đang ủy quyền qua subagent tool không |

---

## Tiếp theo

- [Observability](/deploy-observability) — OpenTelemetry tracing và tích hợp Jaeger
- [Security Hardening](/deploy-security) — rate limiting ở tầng gateway
- [Database Setup](/deploy-database) — thiết lập PostgreSQL bao gồm quota index

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
