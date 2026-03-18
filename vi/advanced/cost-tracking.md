# Theo Dõi Chi Phí

> Giám sát chi phí token theo agent và provider bằng bảng giá per-model có thể cấu hình.

## Tổng quan

GoClaw tính toán chi phí USD cho mỗi lần gọi LLM khi bạn cấu hình giá trong `telemetry.model_pricing`. Dữ liệu chi phí được lưu trữ trên các trace span riêng lẻ và tổng hợp vào bảng `usage_snapshots`. Bạn có thể xem qua REST usage API hoặc WebSocket method `quota.usage`.

Theo dõi chi phí yêu cầu:
- PostgreSQL đã kết nối (`GOCLAW_POSTGRES_DSN`)
- `telemetry.model_pricing` được cấu hình trong `config.json`

Nếu không cấu hình pricing, token count vẫn được theo dõi — chỉ có giá trị USD sẽ bằng 0.

---

## Cấu Hình Giá

Thêm map `model_pricing` bên trong block `telemetry` trong `config.json`. Key là `"provider/model"` hoặc chỉ `"model"`. Lookup thử key cụ thể trước, sau đó fallback về tên model đơn giản.

```json
{
  "telemetry": {
    "model_pricing": {
      "anthropic/claude-sonnet-4-5": {
        "input_per_million": 3.00,
        "output_per_million": 15.00,
        "cache_read_per_million": 0.30,
        "cache_create_per_million": 3.75
      },
      "anthropic/claude-haiku-3-5": {
        "input_per_million": 0.80,
        "output_per_million": 4.00
      },
      "openai/gpt-4o": {
        "input_per_million": 2.50,
        "output_per_million": 10.00
      },
      "gemini-2.0-flash": {
        "input_per_million": 0.10,
        "output_per_million": 0.40
      }
    }
  }
}
```

**Các trường:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `input_per_million` | Có | USD cho mỗi 1M prompt token |
| `output_per_million` | Có | USD cho mỗi 1M completion token |
| `cache_read_per_million` | Không | USD cho mỗi 1M cache-read token (Anthropic prompt caching) |
| `cache_create_per_million` | Không | USD cho mỗi 1M cache-creation token (Anthropic prompt caching) |

---

## Cách Tính Chi Phí

Với mỗi lần gọi LLM, GoClaw tính:

```
cost = (prompt_tokens × input_per_million / 1_000_000)
     + (completion_tokens × output_per_million / 1_000_000)
     + (cache_read_tokens × cache_read_per_million / 1_000_000)   // nếu > 0
     + (cache_creation_tokens × cache_create_per_million / 1_000_000)  // nếu > 0
```

Token count lấy trực tiếp từ API response của provider. Chi phí được ghi lên LLM call span và tổng hợp lên trace level. Các tool thực hiện LLM call nội bộ (ví dụ: `read_image`, `read_document`) cũng có chi phí được theo dõi riêng trên span của chúng.

---

## Truy Vấn Dữ Liệu Chi Phí

### REST API

Chi phí được bao gồm trong các usage endpoint tiêu chuẩn. Tất cả endpoint yêu cầu `Authorization: Bearer <token>` nếu `gateway.token` được đặt.

**`GET /v1/usage/summary`** — tổng kỳ hiện tại so với kỳ trước:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/summary?period=30d"
```

```json
{
  "current": {
    "requests": 1240,
    "input_tokens": 8420000,
    "output_tokens": 1980000,
    "cost": 42.31,
    "unique_users": 18,
    "errors": 3,
    "llm_calls": 3810,
    "tool_calls": 6200,
    "avg_duration_ms": 3200
  },
  "previous": {
    "requests": 890,
    "cost": 29.17,
    ...
  }
}
```

Giá trị `period`: `24h` (mặc định), `today`, `7d`, `30d`.

**`GET /v1/usage/breakdown`** — chi phí theo provider, model hoặc channel:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/breakdown?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=model"
```

```json
{
  "rows": [
    {
      "group": "claude-sonnet-4-5",
      "input_tokens": 6100000,
      "output_tokens": 1400000,
      "total_cost": 35.10,
      "request_count": 820
    },
    {
      "group": "gpt-4o",
      "input_tokens": 2320000,
      "output_tokens": 580000,
      "total_cost": 7.21,
      "request_count": 420
    }
  ]
}
```

Tùy chọn `group_by`: `provider` (mặc định), `model`, `channel`.

**`GET /v1/usage/timeseries`** — chi phí theo thời gian:

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:8080/v1/usage/timeseries?from=2026-03-01T00:00:00Z&to=2026-03-16T00:00:00Z&group_by=hour"
```

```json
{
  "points": [
    {
      "bucket_time": "2026-03-01T00:00:00Z",
      "request_count": 48,
      "input_tokens": 320000,
      "output_tokens": 78000,
      "total_cost": 1.73,
      "llm_call_count": 142,
      "tool_call_count": 230,
      "error_count": 0,
      "unique_users": 5,
      "avg_duration_ms": 2800
    }
  ]
}
```

**Query parameter chung** (timeseries và breakdown):

| Parameter | Ví dụ | Ghi chú |
|-----------|-------|---------|
| `from` | `2026-03-01T00:00:00Z` | RFC 3339, bắt buộc |
| `to` | `2026-03-16T00:00:00Z` | RFC 3339, bắt buộc |
| `group_by` | `hour`, `model`, `provider`, `channel` | Mặc định khác nhau theo endpoint |
| `agent_id` | UUID | Lọc theo agent |
| `provider` | `anthropic` | Lọc theo provider |
| `model` | `claude-sonnet-4-5` | Lọc theo model |
| `channel` | `telegram` | Lọc theo channel |

### WebSocket

Method `quota.usage` trả về chi phí hôm nay cùng với usage counter:

```json
{ "type": "req", "id": "1", "method": "quota.usage" }
```

```json
{
  "enabled": true,
  "requestsToday": 284,
  "inputTokensToday": 1240000,
  "outputTokensToday": 310000,
  "costToday": 1.84,
  "uniqueUsersToday": 12,
  "entries": [...]
}
```

`costToday` luôn có mặt. Nếu không cấu hình pricing thì sẽ là `0`.

---

## Giới Hạn Ngân Sách Hàng Tháng

Bạn có thể giới hạn chi tiêu hàng tháng của một agent bằng cách đặt `budget_monthly_cents` trên agent record. Khi được đặt, GoClaw truy vấn chi phí tích lũy trong tháng hiện tại trước mỗi lần chạy và chặn thực thi nếu vượt ngân sách.

Đặt qua agents API hoặc trực tiếp trong bảng `agents`:

```json
{
  "budget_monthly_cents": 500
}
```

Ví dụ này đặt giới hạn $5.00/tháng. Khi agent đạt giới hạn, nó trả về lỗi:

```
monthly budget exceeded ($5.02 / $5.00)
```

Kiểm tra chạy một lần mỗi request, trước bất kỳ lần gọi LLM nào. Sub-agent delegation chạy dưới agent record riêng với ngân sách riêng.

---

## Các Vấn Đề Thường Gặp

| Vấn đề | Nguyên nhân | Cách sửa |
|--------|-------------|----------|
| `cost` luôn là `0` trong API response | `model_pricing` chưa được cấu hình | Thêm pricing vào `telemetry.model_pricing` trong `config.json` |
| Chi phí chỉ ghi nhận cho một số model | Key không khớp trong pricing map | Dùng key `"provider/model"` chính xác (ví dụ: `"anthropic/claude-sonnet-4-5"`) hoặc tên model đơn giản |
| Budget check chặn tất cả lần chạy | Chi phí tháng đã vượt `budget_monthly_cents` | Tăng ngân sách hoặc reset; chi phí tự reset vào đầu tháng mới |
| Timeseries/breakdown trả về rỗng | `from`/`to` bị thiếu hoặc nằm ngoài phạm vi snapshot | Snapshot là theo giờ; dữ liệu cũ hơn thời gian lưu trữ có thể đã bị xóa |
| `costToday` trong `quota.usage` bị trễ | Snapshot được tổng hợp trước theo giờ | Giờ hiện tại chưa hoàn thành sẽ được gap-fill trực tiếp từ traces |

---

## Tiếp Theo

- [Usage & Quota](#usage-quota) — giới hạn request per-user và token count
- [Observability](#deploy-observability) — xuất OpenTelemetry cho span bao gồm các trường chi phí
- [Tham Chiếu Cấu Hình](#config-reference) — đầy đủ các tùy chọn cấu hình `telemetry`

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
