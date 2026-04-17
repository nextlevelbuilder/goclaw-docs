> Bản dịch từ [English version](/context-pruning)

# Context Pruning

> Tự động cắt tỉa kết quả tool cũ để giữ context agent trong giới hạn token.

## Tổng quan

Khi agent thực hiện các tác vụ dài, kết quả tool tích lũy dần trong lịch sử hội thoại. Các output lớn — đọc file, phản hồi API, kết quả tìm kiếm — có thể chiếm phần lớn context window, không còn chỗ cho quá trình suy luận mới.

**Context pruning** cắt tỉa các kết quả tool cũ trong bộ nhớ trước mỗi yêu cầu LLM, mà không động đến lịch sử session đã lưu. Quá trình này dùng chiến lược hai bước:

1. **Soft trim** — cắt ngắn kết quả tool quá dài, giữ phần đầu + đuôi, bỏ phần giữa.
2. **Hard clear** — nếu context vẫn còn quá đầy, thay toàn bộ nội dung kết quả tool bằng một chuỗi placeholder ngắn.

Context pruning khác với [session compaction](../../core-concepts/sessions-and-history.md). Compaction tóm tắt và cắt ngắn lịch sử hội thoại vĩnh viễn. Pruning không phá hủy dữ liệu: kết quả tool gốc vẫn còn trong session store và không bao giờ bị sửa đổi — chỉ có slice message gửi lên LLM là được cắt tỉa.

---

## Cách Pruning Kích Hoạt

Pruning là **opt-in** — chỉ chạy khi `mode: "cache-ttl"` được đặt trên agent. Luồng xử lý:

```
history → limitHistoryTurns → pruneContextMessages → sanitizeHistory → LLM
```

Trước mỗi lần gọi LLM, GoClaw:

1. Đếm token trong tất cả message bằng tokenizer tiktoken BPE (dự phòng về heuristic `chars / 4` khi tiktoken không khả dụng).
2. Tính tỷ lệ: `totalTokens / contextWindowTokens`.
3. Nếu tỷ lệ dưới `softTrimRatio` — context đủ nhỏ, không cần pruning.
4. **Pass 0 (kiểm tra per-result)** — Bất kỳ kết quả tool đơn lẻ nào vượt quá 30% context window sẽ bị force-trim trước khi các bước chính bắt đầu.
5. Nếu tỷ lệ đạt hoặc vượt `softTrimRatio` — soft trim các kết quả tool đủ điều kiện (Pass 1).
6. Nếu tỷ lệ vẫn đạt hoặc vượt `hardClearRatio` sau soft trim, và tổng ký tự prunable vượt `minPrunableToolChars` — hard clear các kết quả tool còn lại (Pass 2).

**Message được bảo vệ:** `keepLastAssistants` assistant turn gần nhất và tất cả kết quả tool sau chúng không bao giờ bị pruning. Message trước user message đầu tiên cũng được bảo vệ.

---

## Soft Trim

Soft trim giữ lại phần đầu và phần cuối của một kết quả tool dài, bỏ phần giữa.

Một kết quả tool đủ điều kiện soft trim khi số ký tự vượt `softTrim.maxChars`.

Kết quả sau khi trim trông như sau:

```
<3000 ký tự đầu của output tool>
...
<3000 ký tự cuối của output tool>

[Tool result trimmed: kept first 3000 chars and last 3000 chars of 38400 chars.]
```

Agent vẫn đủ context để hiểu tool trả về gì mà không tiêu thụ toàn bộ output.

**Bảo vệ media tool:** Kết quả từ `read_image`, `read_document`, `read_audio`, và `read_video` nhận ngân sách soft trim cao hơn (headChars=4000, tailChars=4000) vì nội dung của chúng là mô tả không thể tái tạo được, được tạo bởi provider vision/audio chuyên dụng. Tái tạo nó sẽ cần thêm một lần gọi LLM khác. Kết quả media tool cũng **được miễn hard clear** — chúng không bao giờ bị thay thế bằng placeholder.

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

Context pruning là **opt-in**. Để bật, đặt `mode: "cache-ttl"` trong config agent.

```json
{
  "contextPruning": {
    "mode": "cache-ttl"
  }
}
```

Tất cả các trường khác có giá trị mặc định hợp lý và đều tùy chọn.

### Tham chiếu cấu hình đầy đủ

```json
{
  "contextPruning": {
    "mode": "cache-ttl",
    "keepLastAssistants": 3,
    "softTrimRatio": 0.25,
    "hardClearRatio": 0.5,
    "minPrunableToolChars": 50000,
    "softTrim": {
      "maxChars": 6000,
      "headChars": 3000,
      "tailChars": 3000
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
| `mode` | *(không đặt — pruning tắt)* | Đặt thành `"cache-ttl"` để bật pruning. Bỏ trống hoặc không đặt để giữ pruning tắt. |
| `keepLastAssistants` | `3` | Số assistant turn gần nhất được bảo vệ khỏi pruning. |
| `softTrimRatio` | `0.25` | Kích hoạt soft trim khi context chiếm tỷ lệ này của context window. |
| `hardClearRatio` | `0.5` | Kích hoạt hard clear khi context chiếm tỷ lệ này sau soft trim. |
| `minPrunableToolChars` | `50000` | Tổng ký tự tối thiểu trong các kết quả tool prunable trước khi hard clear chạy. Ngăn việc xóa quá tích cực trên context nhỏ. |
| `softTrim.maxChars` | `6000` | Kết quả tool dài hơn mức này đủ điều kiện soft trim. |
| `softTrim.headChars` | `3000` | Số ký tự giữ lại từ đầu kết quả tool sau trim. |
| `softTrim.tailChars` | `3000` | Số ký tự giữ lại từ cuối kết quả tool sau trim. |
| `hardClear.enabled` | `true` | Đặt `false` để tắt hoàn toàn hard clear (chỉ dùng soft trim). |
| `hardClear.placeholder` | `"[Old tool result content cleared]"` | Văn bản thay thế cho kết quả tool bị hard clear. |

---

## Ví Dụ Cấu Hình

### Bật pruning (cấu hình tối thiểu)

```json
{
  "contextPruning": {
    "mode": "cache-ttl"
  }
}
```

### Tích cực — cho workflow dùng nhiều tool

Kích hoạt sớm hơn và giữ ít context hơn cho mỗi kết quả tool:

```json
{
  "contextPruning": {
    "mode": "cache-ttl",
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
    "mode": "cache-ttl",
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
    "mode": "cache-ttl",
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

Xác nhận rằng `mode` đã được đặt thành `"cache-ttl"` — pruning là opt-in và mặc định tắt. Cũng xác nhận rằng `contextWindow` đã được đặt trên agent — pruning cần số token để tính tỷ lệ.

**Agent gọi lại tool bất ngờ**

Hard clear xóa hoàn toàn nội dung kết quả tool. Nếu agent cần nội dung đó, nó sẽ gọi lại tool. Hạ `hardClearRatio` hoặc tăng `minPrunableToolChars` để trì hoãn hard clear, hoặc tắt bằng `hardClear.enabled: false`.

**Kết quả trim cắt mất nội dung quan trọng**

Tăng `softTrim.headChars` và `softTrim.tailChars`, hoặc nâng `softTrim.maxChars` để ít kết quả hơn đủ điều kiện trim.

**Context vẫn tràn dù đã bật pruning (`mode: "cache-ttl"`)**

Pruning chỉ tác động lên kết quả tool. Nếu user message dài hoặc system prompt lớn chiếm phần lớn context, pruning sẽ không giúp được. Hãy xem xét [session compaction](../../core-concepts/sessions-and-history.md) hoặc giảm kích thước system prompt.

---

## Cải Tiến Pipeline

### Đếm token Tiktoken BPE

GoClaw hiện dùng tokenizer tiktoken BPE để đếm token chính xác thay vì heuristic `chars / 4` cũ. Điều này đặc biệt quan trọng với nội dung CJK (tiếng Việt và tiếng Trung), nơi heuristic thường đánh giá thấp đáng kể mức sử dụng token. Khi tiktoken được bật, tất cả tỷ lệ pruning được tính dựa trên số token thực tế thay vì ước tính ký tự.

### Pass 0 — Kiểm tra per-result

Trước khi các pass pruning thông thường bắt đầu, bất kỳ kết quả tool đơn lẻ nào vượt quá **30% context window** sẽ bị force-trim. Điều này xử lý các output ngoại lệ (ví dụ: đọc file lớn hoặc phản hồi API khổng lồ) ngay cả khi tỷ lệ context tổng thể vẫn còn dưới `softTrimRatio`. Kết quả trim giữ tỷ lệ 70/30 phần đầu/đuôi.

### Bảo vệ Media Tool

Kết quả từ `read_image`, `read_document`, `read_audio`, và `read_video` được xử lý đặc biệt:

- Nhận ngân sách soft trim cao hơn: **headChars=4000, tailChars=4000** (so với mức chuẩn 3000/3000).
- **Được miễn hard clear** — mô tả media được tạo bởi provider vision/audio chuyên dụng (Gemini, Anthropic) và không thể tái tạo mà không cần thêm một lần gọi LLM.

### Nén MediaRefs

Trong quá trình nén lịch sử, tối đa **30 `MediaRefs` gần nhất** được giữ lại. Điều này đảm bảo agent vẫn có thể tham chiếu đến các hình ảnh và tài liệu đã chia sẻ trước đó sau khi compaction mà không mất dấu media context.

### Tóm tắt Compaction có cấu trúc

Khi context được compacted, bản tóm tắt giờ đây giữ lại các định danh quan trọng — agent ID, task ID, và session key — theo định dạng có cấu trúc. Điều này đảm bảo agent có thể tiếp tục tham chiếu đến các task và session đang hoạt động sau khi compaction mà không mất context theo dõi.

### Giới hạn tool output tại nguồn

Tool output giờ được giới hạn ngay tại nguồn trước khi thêm vào context. Thay vì chờ pipeline pruning cắt tỉa các kết quả quá lớn sau khi đã lưu, GoClaw giới hạn kích thước tool output ngay lúc tiếp nhận. Điều này giảm áp lực bộ nhớ không cần thiết và làm cho pipeline pruning trở nên dự đoán được hơn.

---

## Tiếp Theo

- [Sessions & History](../../core-concepts/sessions-and-history.md) — session compaction, giới hạn lịch sử
- [Memory System](../../core-concepts/memory-system.md) — kiến trúc memory 3 tầng và pipeline consolidation
- [Configuration Reference](/config-reference) — tham chiếu cấu hình agent đầy đủ

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
