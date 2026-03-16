> Bản dịch từ [English version](../../core-concepts/sessions-and-history.md)

# Sessions và History

> Cách GoClaw theo dõi cuộc hội thoại và quản lý lịch sử tin nhắn.

## Tổng quan

Session là một luồng hội thoại giữa người dùng và agent trên một channel cụ thể. GoClaw lưu lịch sử tin nhắn trong PostgreSQL, tự động nén cuộc hội thoại dài, và quản lý concurrency để các agent không xung đột nhau.

## Session Key

Mỗi session có một key duy nhất xác định người dùng, agent, channel, và loại chat:

```
agent:{agentId}:{channel}:{kind}:{chatId}
```

| Loại | Định dạng key | Ví dụ |
|------|--------------|-------|
| DM | `agent:default:telegram:direct:386246614` | Chat riêng |
| Group | `agent:default:telegram:group:-100123456` | Chat nhóm |
| Topic | `agent:default:telegram:group:-100123456:topic:99` | Forum topic |
| Thread | `agent:default:telegram:direct:386246614:thread:5` | Reply theo thread |
| Subagent | `agent:default:subagent:my-task` | Subtask được spawn |
| Cron | `agent:default:cron:reminder-job` | Job lên lịch |

Định dạng key này có nghĩa là cùng một người dùng chat với cùng một agent trên Telegram và Discord sẽ có hai session riêng với lịch sử độc lập.

> **Session Metadata:** Mỗi session theo dõi các trường bổ sung bên cạnh key: `label` (tên hiển thị), `channel`, `model`, `provider`, `spawned_by` (ID session cha cho subagent), `spawn_depth`, `input_tokens`, `output_tokens`, `compaction_count`, và `context_window`. Các trường này có thể truy vấn cho mục đích phân tích và debugging.

## Lưu trữ tin nhắn

Tin nhắn được lưu dưới dạng JSONB trong PostgreSQL với write-behind cache:

1. **Đọc** — Lần đầu truy cập, load từ DB vào memory cache
2. **Ghi** — Tin nhắn tích lũy trong memory trong suốt một lượt
3. **Flush** — Cuối lượt, tất cả tin nhắn ghi vào DB nguyên tử
4. **Liệt kê** — Liệt kê session luôn đọc từ DB (không phải cache)

Cách này tối thiểu hóa DB write trong khi đảm bảo durability.

## History Pipeline

Trước khi gửi history cho LLM, GoClaw chạy pipeline 3 giai đoạn:

### 1. Giới hạn lượt

Chỉ giữ N lượt user gần nhất (và các tin nhắn assistant/tool liên quan). Các lượt cũ hơn bị loại bỏ để nằm trong context window.

### 2. Prune Context

Kết quả tool có thể lớn. GoClaw cắt bớt qua hai lượt:

| Điều kiện | Hành động |
|-----------|----------|
| Token ratio ≥ 0.3 | **Soft trim**: Kết quả tool vượt quá 4.000 ký tự → giữ 1.500 đầu + 1.500 cuối |
| Token ratio ≥ 0.5 | **Hard clear**: Thay toàn bộ kết quả tool bằng `[Old tool result content cleared]` |

Tin nhắn được bảo vệ (không bao giờ bị prune): 3 tin nhắn assistant gần nhất. System message và tin nhắn user đầu tiên tạo thành tiền tố ổn định (stable prefix) không bao giờ bị prune.

### 3. Sanitize

Sửa các cặp tool_use/tool_result bị tách vỡ do truncation. LLM kỳ vọng các cặp khớp nhau — tool call mồ côi gây lỗi.

## Auto-Compaction

Cuộc hội thoại dài kích hoạt nén tự động:

**Trigger:**
- Hơn 50 tin nhắn trong session, HOẶC
- History vượt quá 75% context window của agent

**Điều gì xảy ra:**

```mermaid
graph LR
    T[Trigger<br/>50+ msg hoặc 75% ctx] --> MF[Memory Flush<br/>Trích xuất facts → memory]
    MF --> SUM[Summarize<br/>Nén history]
    SUM --> INJ[Inject<br/>Summary thay thế msg cũ]
```

1. **Memory flush** (đồng bộ, timeout 90 giây) — Thông tin quan trọng được trích xuất và lưu vào hệ thống memory
2. **Summarize** (nền, timeout 120 giây) — Tin nhắn cũ được nén thành summary
3. **Inject** — Summary thay thế tin nhắn cũ; ít nhất 4 tin nhắn (hoặc 30% tổng số, tùy giá trị nào lớn hơn) được giữ nguyên

Một per-session lock ngăn nén đồng thời. Nếu lần nén thứ hai kích hoạt trong khi một lần đang chạy, nó sẽ bị bỏ qua.

### Nén giữa vòng lặp (Mid-Loop Compaction)

GoClaw cũng có thể nén history **trong khi agent đang xử lý một lượt dài** nếu context vượt ngưỡng giữa vòng lặp. Logic tóm tắt 75% vẫn được áp dụng. Điều này hoàn toàn trong suốt với agent — nó tiếp tục chạy với history đã được nén.

## Concurrency

| Loại chat | Tối đa đồng thời | Ghi chú |
|-----------|:-----------:|-------|
| DM | 1 | Single-threaded — tin nhắn xếp hàng |
| Group | 1 (có thể cấu hình) | Mặc định tuần tự; có thể tăng qua `ScheduleOpts.MaxConcurrent` |

Group session có thể giảm concurrency khi mức sử dụng context cao.

> **Cấu hình concurrency:** Cả DM và Group đều mặc định xử lý tuần tự (`MaxConcurrent: 1`). Giá trị cao hơn (ví dụ: 3) có thể được đặt cho thành viên team hoặc agent link thông qua `ScheduleOpts.MaxConcurrent`.

### Queue Mode

| Mode | Hành vi |
|------|---------|
| `queue` | FIFO — tin nhắn xử lý theo thứ tự |
| `followup` | Tin nhắn mới gộp với tin nhắn đang xếp hàng |
| `interrupt` | Hủy tác vụ hiện tại, xử lý tin nhắn mới |

Dung lượng queue mặc định là 10. Khi đầy, tin nhắn cũ nhất bị loại bỏ (drop policy: `old`). Cửa sổ debounce mặc định là 800ms — các tin nhắn đến nhanh trong khoảng thời gian này được gộp lại trước khi xử lý.

### User Control

- `/stop` — Hủy tác vụ đang chạy lâu nhất
- `/stopall` — Hủy tất cả tác vụ và xóa queue

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Agent "quên" tin nhắn cũ | History đã được nén; kiểm tra memory để xem facts được trích xuất |
| Phản hồi chậm trong group | Giảm group concurrency hoặc kích thước context window |
| Phản hồi trùng | Kiểm tra queue mode; mode `queue` ngăn điều này |

## Tiếp theo

- [Memory System](memory-system.md) — Memory dài hạn hoạt động như thế nào
- [Tools Overview](tools-overview.md) — Tool có sẵn cho agent
- [Multi-Tenancy](multi-tenancy.md) — Cách ly session per-user
