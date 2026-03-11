> Bản dịch từ [English version](../../advanced/knowledge-graph.md)

# Knowledge Graph

> Agent tự động trích xuất thực thể và mối quan hệ từ cuộc hội thoại, xây dựng đồ thị tìm kiếm được về người, dự án và khái niệm.

## Tổng quan

Hệ thống Knowledge Graph của GoClaw có hai phần:

1. **Trích xuất** — Sau cuộc hội thoại, LLM trích xuất các thực thể (người, dự án, khái niệm) và mối quan hệ từ văn bản
2. **Tìm kiếm** — Agent sử dụng công cụ `knowledge_graph_search` để truy vấn đồ thị, duyệt mối quan hệ và khám phá kết nối

Đồ thị được phân tách theo agent và user — mỗi agent xây dựng đồ thị riêng từ các cuộc hội thoại của nó.

---

## Cách trích xuất hoạt động

Sau cuộc hội thoại, GoClaw gửi văn bản (tối đa 6.000 ký tự) đến LLM với prompt trích xuất có cấu trúc. LLM trả về:

- **Thực thể** — Người, dự án, nhiệm vụ, sự kiện, khái niệm, địa điểm, tổ chức
- **Mối quan hệ** — Kết nối có kiểu giữa các thực thể (ví dụ: "works_on", "reports_to")

Mỗi thực thể và mối quan hệ có **điểm tin cậy** (0.0–1.0). Chỉ các mục trên ngưỡng (mặc định **0.75**) mới được lưu.

**Ràng buộc:**
- Tối đa 15 thực thể mỗi lần trích xuất
- ID thực thể viết thường với dấu gạch ngang
- Mô tả tối đa 50 ký tự
- Temperature 0.0 cho kết quả xác định

---

## Tìm kiếm đồ thị

**Công cụ:** `knowledge_graph_search`

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `query` | string | Tên thực thể, từ khóa, hoặc `*` để liệt kê tất cả |
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

**Duyệt mối quan hệ** — Bắt đầu từ một thực thể và theo các kết nối:
```
entity_id: "project-alpha"
max_depth: 2
```

Kết quả bao gồm tên thực thể, kiểu, mô tả và mối quan hệ với tên đã phân giải.

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
  Alice --leads--> Project Alpha
  Bob --works_on--> Project Alpha
  Project Alpha --uses--> GraphQL
```

Agent có thể trả lời câu hỏi như *"Ai đang làm việc trên Project Alpha?"* bằng cách duyệt đồ thị.

---

## Tiếp theo

- [Hệ thống bộ nhớ](../core-concepts/memory-system.md) — Bộ nhớ dài hạn dựa trên vector
- [Sessions & History](../core-concepts/sessions-and-history.md) — Lưu trữ cuộc hội thoại
