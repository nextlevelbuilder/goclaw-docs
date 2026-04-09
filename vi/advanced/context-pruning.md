> Bản dịch từ [English version](/context-pruning)

# Context Pruning

> Tự động cắt tỉa kết quả tool cũ để giữ context agent trong giới hạn token.

## Tổng quan

Khi agent thực hiện các tác vụ dài, kết quả tool tích lũy dần trong lịch sử hội thoại. Các output lớn — đọc file, phản hồi API, kết quả tìm kiếm — có thể chiếm phần lớn context window, không còn chỗ cho quá trình suy luận mới.

**Context pruning** cắt tỉa các kết quả tool cũ trong bộ nhớ trước mỗi yêu cầu LLM, mà không động đến lịch sử session đã lưu. Quá trình này dùng chiến lược hai bước:

1. **Soft trim** — cắt ngắn kết quả tool quá dài, giữ phần đầu + đuôi, bỏ phần giữa.
2. **Hard clear** — nếu context vẫn còn quá đầy, thay toàn bộ nội dung kết quả tool bằng một chuỗi placeholder ngắn.

Context pruning khác với [session compaction](/sessions-and-history). Compaction tóm tắt và cắt ngắn lịch sử hội thoại vĩnh viễn. Pruning không phá hủy dữ liệu: kết quả tool gốc vẫn còn trong session store và không bao giờ bị sửa đổi — chỉ có slice message gửi lên LLM là được cắt tỉa.

---

## Cách Pruning Kích Hoạt

Pruning chạy tự động trên mỗi yêu cầu agent, trừ khi bị tắt rõ ràng bằng `mode: "off"`. Luồng xử lý:

```
history → limitHistoryTurns → pruneContextMessages → sanitizeHistory → LLM
```

Trước mỗi lần gọi LLM, GoClaw:

1. Ước tính tổng số ký tự của tất cả message.
2. Tính tỷ lệ: `totalChars / (contextWindowTokens × 4)`.
3. Nếu tỷ lệ dưới `softTrimRatio` — context đủ nhỏ, không cần pruning.
4. Nếu tỷ lệ đạt hoặc vượt `softTrimRatio` — soft trim các kết quả tool đủ điều kiện.
5. Nếu tỷ lệ vẫn đạt hoặc vượt `hardClearRatio` sau soft trim, và tổng ký tự prunable vượt `minPrunableToolChars` — hard clear các kết quả tool còn lại.

**Message được bảo vệ:** `keepLastAssistants` assistant turn gần nhất và tất cả kết quả tool sau chúng không bao giờ bị pruning. Message trước user message đầu tiên cũng được bảo vệ.

---

## Soft Trim

Soft trim giữ lại phần đầu và phần cuối của một kết quả tool dài, bỏ phần giữa.

Một kết quả tool đủ điều kiện soft trim khi số ký tự vượt `softTrim.maxChars`.

Kết quả sau khi trim trông như sau:

```
<1500 ký tự đầu của output tool>
...
<1500 ký tự cuối của output tool>

[Tool result trimmed: kept first 1500 chars and last 1500 chars of 38400 chars.]
```

Agent vẫn đủ context để hiểu tool trả về gì mà không tiêu thụ toàn bộ output.

---

## Hard Clear

Hard clear thay toàn bộ nội dung kết quả tool cũ bằng một chuỗi placeholder ngắn. Bước này chỉ chạy trong lần duyệt thứ hai nếu tỷ lệ context vẫn còn quá cao sau soft trim.

Hard clear xử lý từng kết quả tool prunable một, tính lại tỷ lệ sau mỗi lần thay thế, và dừng ngay khi tỷ lệ xuống dưới `hardClearRatio`.

Một kết quả tool sau hard clear trở thành:

```
[Old tool result content cleared]
```

Placeholder này có thể tùy chỉnh. Hard clear cũng có thể tắt hoàn toàn.

---

## Cấu Hình

Context pruning **bật theo mặc định**. Để tắt, đặt `mode: "off"` trong config agent.

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

Tất cả các trường khác có giá trị mặc định hợp lý và đều tùy chọn.

### Tham chiếu cấu hình đầy đủ

```json
{
  "contextPruning": {
    "keepLastAssistants": 3,
    "softTrimRatio": 0.3,
    "hardClearRatio": 0.5,
    "minPrunableToolChars": 50000,
    "softTrim": {
      "maxChars": 4000,
      "headChars": 1500,
      "tailChars": 1500
    },
    "hardClear": {
      "enabled": true,
      "placeholder": "[Old tool result content cleared]"
    }
  }
}
```

| Trường | Mặc định | Mô tả |
|--------|----------|-------|
| `mode` | *(không đặt — pruning hoạt động)* | Đặt thành `"off"` để tắt hoàn toàn pruning. |
| `keepLastAssistants` | `3` | Số assistant turn gần nhất được bảo vệ khỏi pruning. |
| `softTrimRatio` | `0.3` | Kích hoạt soft trim khi context chiếm tỷ lệ này của context window. |
| `hardClearRatio` | `0.5` | Kích hoạt hard clear khi context chiếm tỷ lệ này sau soft trim. |
| `minPrunableToolChars` | `50000` | Tổng ký tự tối thiểu trong các kết quả tool prunable trước khi hard clear chạy. Ngăn việc xóa quá tích cực trên context nhỏ. |
| `softTrim.maxChars` | `4000` | Kết quả tool dài hơn mức này đủ điều kiện soft trim. |
| `softTrim.headChars` | `1500` | Số ký tự giữ lại từ đầu kết quả tool sau trim. |
| `softTrim.tailChars` | `1500` | Số ký tự giữ lại từ cuối kết quả tool sau trim. |
| `hardClear.enabled` | `true` | Đặt `false` để tắt hoàn toàn hard clear (chỉ dùng soft trim). |
| `hardClear.placeholder` | `"[Old tool result content cleared]"` | Văn bản thay thế cho kết quả tool bị hard clear. |

---

## Ví Dụ Cấu Hình

### Tắt hoàn toàn pruning

```json
{
  "contextPruning": {
    "mode": "off"
  }
}
```

### Tích cực — cho workflow dùng nhiều tool

Kích hoạt sớm hơn và giữ ít context hơn cho mỗi kết quả tool:

```json
{
  "contextPruning": {
    "softTrimRatio": 0.2,
    "hardClearRatio": 0.4,
    "softTrim": {
      "maxChars": 2000,
      "headChars": 800,
      "tailChars": 800
    }
  }
}
```

### Chỉ soft trim — tắt hard clear

```json
{
  "contextPruning": {
    "hardClear": {
      "enabled": false
    }
  }
}
```

### Placeholder tùy chỉnh

```json
{
  "contextPruning": {
    "hardClear": {
      "placeholder": "[Tool output removed to save context]"
    }
  }
}
```

---

## Pruning và Pipeline Consolidation

Context pruning và memory consolidation phục vụ hai vai trò bổ sung cho nhau — pruning quản lý context trực tiếp trong session; consolidation quản lý khả năng ghi nhớ dài hạn giữa các session.

```
Trong một session:         pruning cắt tỉa kết quả tool → giữ LLM context gọn nhẹ
Khi session.completed:     episodic_worker tóm tắt → L1 episodic memory
Sau ≥5 episode:            dreaming_worker thăng cấp → L0 long-term memory
```

**Điểm khác biệt quan trọng**: pruning không bao giờ động đến session store đã lưu. Khi session kết thúc, pipeline consolidation (không phải pruning) tiếp quản và quyết định những gì đáng giữ lại lâu dài. Điều này có nghĩa:

- Kết quả tool bị pruning vẫn hiển thị với `episodic_worker` qua session store khi nó đọc tin nhắn để tóm tắt.
- Nội dung bị hard-clear khỏi live context vẫn được tóm tắt vào episodic memory khi session kết thúc — không có gì bị mất vĩnh viễn bởi pruning.
- Với nội dung đã được `dreaming_worker` thăng cấp lên episodic hoặc long-term memory, **auto-injector** sẽ đưa lại dưới dạng L0 abstract ngắn gọn ở đầu turn tiếp theo. Điều này thay thế nhu cầu giữ kết quả tool lớn trong context.

### Hệ quả thực tế

Khi pipeline consolidation đã thăng cấp một khối kiến thức lên L0 (qua dreaming) hoặc L1 (qua episodic), bạn có thể cho phép pruning tích cực hơn với agent đó. Agent sẽ không mất thông tin — nó sẽ được re-inject từ memory thay vì mang theo trong raw session history.

---

## Ảnh Hưởng Đến Hành Vi Agent

- **Không có dữ liệu session nào bị sửa đổi.** Pruning chỉ ảnh hưởng đến slice message được truyền vào LLM. Kết quả tool gốc vẫn còn trong session store.
- **Context gần đây luôn được bảo vệ.** `keepLastAssistants` assistant turn gần nhất và các kết quả tool liên quan không bao giờ bị chạm đến.
- **Kết quả soft-trim vẫn cung cấp thông tin.** Agent thấy phần đầu và cuối của output dài, thường chứa thông tin liên quan nhất (tiêu đề, tóm tắt, dòng cuối).
- **Kết quả hard-clear có thể khiến agent gọi lại tool.** Nếu agent không còn thấy kết quả tool, nó có thể chạy lại tool để lấy lại thông tin. Đây là hành vi bình thường.
- **Kích thước context window ảnh hưởng đến mức độ pruning.** Ngưỡng pruning là tỷ lệ của context window thực tế của model. Agent cấu hình với context window lớn hơn sẽ pruning ít tích cực hơn.

---

## Vấn Đề Thường Gặp

**Pruning không bao giờ kích hoạt**

Xác nhận rằng `mode` không được đặt thành `"off"`. Cũng xác nhận rằng `contextWindow` đã được đặt trên agent — pruning cần số token để tính tỷ lệ.

**Agent gọi lại tool bất ngờ**

Hard clear xóa hoàn toàn nội dung kết quả tool. Nếu agent cần nội dung đó, nó sẽ gọi lại tool. Hạ `hardClearRatio` hoặc tăng `minPrunableToolChars` để trì hoãn hard clear, hoặc tắt bằng `hardClear.enabled: false`.

**Kết quả trim cắt mất nội dung quan trọng**

Tăng `softTrim.headChars` và `softTrim.tailChars`, hoặc nâng `softTrim.maxChars` để ít kết quả hơn đủ điều kiện trim.

**Context vẫn tràn dù đã bật pruning**

Pruning chỉ tác động lên kết quả tool. Nếu user message dài hoặc system prompt lớn chiếm phần lớn context, pruning sẽ không giúp được. Hãy xem xét [session compaction](/sessions-and-history) hoặc giảm kích thước system prompt.

---

## Cải Tiến Pipeline

### Tóm tắt Compaction có cấu trúc

Khi context được compacted, bản tóm tắt giờ đây giữ lại các định danh quan trọng — agent ID, task ID, và session key — theo định dạng có cấu trúc. Điều này đảm bảo agent có thể tiếp tục tham chiếu đến các task và session đang hoạt động sau khi compaction mà không mất context theo dõi.

### Giới hạn tool output tại nguồn

Tool output giờ được giới hạn ngay tại nguồn trước khi thêm vào context. Thay vì chờ pipeline pruning cắt tỉa các kết quả quá lớn sau khi đã lưu, GoClaw giới hạn kích thước tool output ngay lúc tiếp nhận. Điều này giảm áp lực bộ nhớ không cần thiết và làm cho pipeline pruning trở nên dự đoán được hơn.

---

## Tiếp Theo

- [Sessions & History](/sessions-and-history) — session compaction, giới hạn lịch sử
- [Memory System](/memory-system) — kiến trúc memory 3 tầng và pipeline consolidation
- [Configuration Reference](/config-reference) — tham chiếu cấu hình agent đầy đủ

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
