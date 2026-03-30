> Bản dịch từ [English version](/knowledge-graph)

# Knowledge Graph

> Agent tự động trích xuất thực thể và mối quan hệ từ cuộc hội thoại, xây dựng đồ thị tìm kiếm được về người, dự án và khái niệm.

## Tổng quan

Hệ thống Knowledge Graph của GoClaw có hai phần:

1. **Trích xuất** — Sau cuộc hội thoại, LLM trích xuất các thực thể (người, dự án, khái niệm) và mối quan hệ từ văn bản
2. **Tìm kiếm** — Agent sử dụng công cụ `knowledge_graph_search` để truy vấn đồ thị, duyệt mối quan hệ và khám phá kết nối

Đồ thị được phân tách theo agent và user — mỗi agent xây dựng đồ thị riêng từ các cuộc hội thoại của nó.

---

## Cách trích xuất hoạt động

Sau cuộc hội thoại, GoClaw gửi văn bản đến LLM với prompt trích xuất có cấu trúc. Với văn bản dài (trên 12.000 ký tự), GoClaw chia thành các đoạn, trích xuất từ từng đoạn rồi hợp nhất kết quả bằng cách loại bỏ trùng lặp giữa các thực thể và mối quan hệ. LLM trả về:

- **Thực thể** — Người, dự án, nhiệm vụ, sự kiện, khái niệm, địa điểm, tổ chức
- **Mối quan hệ** — Kết nối có kiểu giữa các thực thể (ví dụ: `works_on`, `reports_to`)

Mỗi thực thể và mối quan hệ có **điểm tin cậy** (0.0–1.0). Chỉ các mục đạt ngưỡng trở lên (mặc định **0.75**) mới được lưu.

**Ràng buộc:**
- 3–15 thực thể mỗi lần trích xuất, tùy theo mật độ văn bản
- ID thực thể viết thường với dấu gạch ngang (ví dụ: `john-doe`, `project-alpha`)
- Mô tả tối đa một câu
- Temperature 0.0 cho kết quả xác định

### Các loại mối quan hệ

Bộ trích xuất sử dụng một tập cố định các loại mối quan hệ:

| Nhóm | Loại |
|------|------|
| Người ↔ Công việc | `works_on`, `manages`, `reports_to`, `collaborates_with` |
| Cấu trúc | `belongs_to`, `part_of`, `depends_on`, `blocks` |
| Hành động | `created`, `completed`, `assigned_to`, `scheduled_for` |
| Địa điểm | `located_in`, `based_at` |
| Công nghệ | `uses`, `implements`, `integrates_with` |
| Dự phòng | `related_to` |

---

## Tìm kiếm toàn văn (Full-Text Search)

Tìm kiếm thực thể sử dụng full-text search `tsvector` của PostgreSQL (migration `000031`). Cột `tsv` được tự động sinh từ tên và mô tả của mỗi thực thể:

```sql
tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || COALESCE(description, ''))) STORED
```

GIN index trên `tsv` giúp truy vấn văn bản nhanh ngay cả với đồ thị lớn. Các truy vấn như `"john"` hay `"project alpha"` khớp từng phần trên cả tên lẫn mô tả.

---

## Loại bỏ thực thể trùng lặp (Deduplication)

Sau khi trích xuất, GoClaw tự động kiểm tra các thực thể mới có bị trùng không, dựa trên hai tín hiệu:

1. **Độ tương đồng embedding** — HNSW KNN tìm các thực thể gần nhất cùng loại
2. **Độ tương đồng tên** — Jaro-Winkler (không phân biệt hoa thường)

### Ngưỡng

| Tình huống | Điều kiện | Hành động |
|------------|-----------|-----------|
| Gần chắc chắn trùng | embedding ≥ 0.98 **và** tên ≥ 0.85 | Tự động gộp ngay |
| Có thể trùng | embedding ≥ 0.90 | Đánh dấu trong `kg_dedup_candidates` để xem xét |

**Tự động gộp** giữ lại thực thể có điểm tin cậy cao hơn, cập nhật lại tất cả quan hệ từ thực thể bị xóa sang thực thể còn lại. Advisory lock ngăn việc gộp đồng thời trên cùng agent.

**Ứng viên được đánh dấu** lưu vào `kg_dedup_candidates` với trạng thái `pending`. Bạn có thể liệt kê, bỏ qua hoặc gộp thủ công qua API.

### Quét trùng lặp hàng loạt

Bạn có thể kích hoạt quét toàn bộ thực thể:

```bash
POST /v1/agents/{agentID}/kg/scan-duplicates
```

Thao tác này chạy self-join tìm kiếm độ tương đồng và thêm ứng viên vào hàng đợi xem xét. Hữu ích sau khi import hàng loạt hoặc onboarding ban đầu.

---

## Tìm kiếm đồ thị

**Công cụ:** `knowledge_graph_search`

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `query` | string | Tên thực thể, từ khóa, hoặc `*` để liệt kê tất cả (bắt buộc) |
| `entity_type` | string | Lọc: `person`, `project`, `task`, `event`, `concept`, `location`, `organization` |
| `entity_id` | string | Điểm bắt đầu để duyệt mối quan hệ |
| `max_depth` | int | Độ sâu duyệt (mặc định 2, tối đa 3) |

### Các chế độ tìm kiếm

**Tìm kiếm văn bản** — Tìm thực thể theo tên hoặc từ khóa:
```
query: "John"
```

**Liệt kê tất cả** — Hiển thị tất cả thực thể (tối đa 30):
```
query: "*"
```

**Duyệt mối quan hệ** — Bắt đầu từ một thực thể và theo các kết nối đi ra:
```
query: "*"
entity_id: "project-alpha"
max_depth: 2
```

Kết quả bao gồm tên thực thể, kiểu, mô tả, độ sâu, đường dẫn duyệt và loại mối quan hệ dùng để đến mỗi thực thể.

---

## Các loại thực thể

| Loại | Ví dụ |
|------|-------|
| `person` | Thành viên nhóm, liên hệ, bên liên quan |
| `project` | Sản phẩm, sáng kiến, codebase |
| `task` | Hạng mục công việc, ticket, phân công |
| `event` | Cuộc họp, deadline, cột mốc |
| `concept` | Công nghệ, phương pháp, ý tưởng |
| `location` | Văn phòng, thành phố, khu vực |
| `organization` | Công ty, nhóm, phòng ban |

---

## Ví dụ

Sau nhiều cuộc hội thoại về một dự án, Knowledge Graph của agent có thể chứa:

```
Thực thể:
  [person] Alice — Backend lead
  [person] Bob — Frontend developer
  [project] Project Alpha — Nền tảng thương mại điện tử
  [concept] GraphQL — Công nghệ lớp API

Mối quan hệ:
  Alice --manages--> Project Alpha
  Bob --works_on--> Project Alpha
  Project Alpha --uses--> GraphQL
```

Agent có thể trả lời câu hỏi như *"Ai đang làm việc trên Project Alpha?"* bằng cách duyệt đồ thị.

---

## Tiếp theo

- [Hệ thống bộ nhớ](/memory-system) — Bộ nhớ dài hạn dựa trên vector
- [Sessions & History](/sessions-and-history) — Lưu trữ cuộc hội thoại

<!-- goclaw-source: e7afa832 | cập nhật: 2026-03-30 -->
