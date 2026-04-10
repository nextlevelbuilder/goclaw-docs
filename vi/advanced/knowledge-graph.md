> Bản dịch từ [English version](/knowledge-graph)

# Knowledge Graph

> Agent tự động trích xuất thực thể và mối quan hệ từ cuộc hội thoại, xây dựng đồ thị tìm kiếm được về người, dự án và khái niệm.

## Tổng quan

Hệ thống Knowledge Graph của GoClaw có hai phần:

1. **Trích xuất** — Sau cuộc hội thoại, LLM trích xuất các thực thể (người, dự án, khái niệm) và mối quan hệ từ văn bản. Bạn cũng có thể kích hoạt trích xuất thủ công qua REST API.
2. **Tìm kiếm** — Agent sử dụng công cụ `knowledge_graph_search` để truy vấn đồ thị, duyệt mối quan hệ và khám phá kết nối.

Đồ thị được phân tách theo agent và user — mỗi agent xây dựng đồ thị riêng từ các cuộc hội thoại của nó.

---

## Cách trích xuất hoạt động

Sau cuộc hội thoại, GoClaw gửi văn bản đến LLM với prompt trích xuất có cấu trúc. Với văn bản dài (trên 12.000 ký tự), GoClaw chia thành các đoạn, trích xuất từ từng đoạn rồi hợp nhất kết quả bằng cách loại bỏ trùng lặp giữa các thực thể và mối quan hệ. LLM trả về:

- **Thực thể** — Người, tổ chức, dự án, sản phẩm, công nghệ, nhiệm vụ, sự kiện, tài liệu, khái niệm, địa điểm
- **Mối quan hệ** — Kết nối có kiểu giữa các thực thể (ví dụ: `works_on`, `reports_to`)

Mỗi thực thể và mối quan hệ có **điểm tin cậy** (0.0–1.0). Chỉ các mục đạt ngưỡng trở lên (mặc định **0.75**) mới được lưu.

**Ràng buộc:**
- 3–15 thực thể mỗi lần trích xuất, tùy theo mật độ văn bản
- ID thực thể viết thường với dấu gạch ngang (ví dụ: `john-doe`, `project-alpha`)
- Mô tả tối đa một câu
- Temperature 0.2 cho kết quả nhất quán nhưng linh hoạt hơn

### Trích xuất thủ công qua API

Bạn có thể kích hoạt trích xuất bất kỳ lúc nào mà không cần chờ cuộc hội thoại kết thúc:

```http
POST /v1/agents/{agentID}/kg/extract
Content-Type: application/json

{
  "text": "Alice is the backend lead for Project Alpha. She works closely with Bob.",
  "user_id": "user-123",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "min_confidence": 0.75
}
```

**Phản hồi:**

```json
{
  "entities": 3,
  "relations": 2,
  "dedup_merged": 0,
  "dedup_flagged": 1
}
```

Sau khi trích xuất, dedup tự động chạy trên các thực thể mới — các thực thể trùng lặp rõ ràng được gộp ngay, còn các ứng viên nghi ngờ được đánh dấu để xem xét.

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

**Ứng viên được đánh dấu** lưu vào `kg_dedup_candidates` với trạng thái `pending`. Bạn có thể quản lý chúng theo quy trình sau:

| Bước | Method | Path | Mô tả |
|------|--------|------|-------|
| 1. Quét | POST | `/kg/dedup/scan` | Quét toàn bộ thực thể, truyền `threshold` và `limit` |
| 2. Xem xét | GET | `/kg/dedup` | Trả về danh sách `DedupCandidate[]` đang chờ |
| 3. Gộp | POST | `/kg/merge` | Gộp hai thực thể với `target_id` và `source_id` |
| 4. Bỏ qua | POST | `/kg/dedup/dismiss` | Bỏ qua ứng viên với `candidate_id` |

---

## Tìm kiếm đồ thị

**Công cụ:** `knowledge_graph_search`

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `query` | string | Tên thực thể, từ khóa, hoặc `*` để liệt kê tất cả (bắt buộc) |
| `entity_type` | string | Lọc: `person`, `organization`, `project`, `product`, `technology`, `task`, `event`, `document`, `concept`, `location` |
| `entity_id` | string | Điểm bắt đầu để duyệt mối quan hệ |
| `max_depth` | int | Độ sâu duyệt (mặc định 2, tối đa 3) |

### Chiến lược 3 tầng

Công cụ áp dụng 3 tầng fallback theo thứ tự:

1. **Traversal** (khi có `entity_id`) — Duyệt đa chiều đa bước theo quan hệ, tối đa `max_depth` bước, trả về tối đa 20 kết quả
2. **Kết nối trực tiếp** (fallback) — Tìm kiếm 2 chiều, 1 hop, tối đa 10 kết quả
3. **Tìm kiếm văn bản** (fallback) — Full-text search, tối đa 10 kết quả kèm relations

Khi không tìm thấy kết quả nào, hệ thống trả về top 10 thực thể có sẵn làm gợi ý để agent tiếp tục duyệt.

### Các chế độ tìm kiếm

**Tìm kiếm văn bản** — Tìm thực thể theo tên hoặc từ khóa:
```
query: "John"
```

**Liệt kê tất cả** — Hiển thị tất cả thực thể (tối đa 30):
```
query: "*"
```

**Duyệt mối quan hệ** — Bắt đầu từ một thực thể và theo các kết nối theo cả hai chiều:
```
query: "*"
entity_id: "project-alpha"
max_depth: 2
```

Kết quả bao gồm tên thực thể, kiểu, mô tả, độ sâu, đường dẫn duyệt và loại mối quan hệ dùng để đến mỗi thực thể.

---

## REST API Reference

Tất cả endpoint yêu cầu xác thực. Thêm `?user_id=` để phân tách dữ liệu theo từng user.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/v1/agents/{agentID}/kg/entities` | Liệt kê/tìm kiếm thực thể |
| GET | `/v1/agents/{agentID}/kg/entities/{entityID}` | Lấy thực thể kèm relations |
| POST | `/v1/agents/{agentID}/kg/entities` | Upsert thực thể |
| DELETE | `/v1/agents/{agentID}/kg/entities/{entityID}` | Xóa thực thể (cascade relations) |
| POST | `/v1/agents/{agentID}/kg/traverse` | Duyệt đồ thị từ một thực thể |
| POST | `/v1/agents/{agentID}/kg/extract` | Trích xuất thực thể/relations bằng LLM |
| GET | `/v1/agents/{agentID}/kg/stats` | Thống kê đồ thị |
| GET | `/v1/agents/{agentID}/kg/graph` | Toàn bộ đồ thị (dùng cho visualization) |
| POST | `/v1/agents/{agentID}/kg/dedup/scan` | Quét trùng lặp hàng loạt |
| GET | `/v1/agents/{agentID}/kg/dedup` | Danh sách ứng viên trùng lặp |
| POST | `/v1/agents/{agentID}/kg/merge` | Gộp hai thực thể |
| POST | `/v1/agents/{agentID}/kg/dedup/dismiss` | Bỏ qua ứng viên trùng lặp |

---

## Cấu trúc dữ liệu

### Entity

```json
{
  "id": "uuid",
  "agent_id": "agent-uuid",
  "user_id": "optional-user-id",
  "external_id": "john-doe",
  "name": "John Doe",
  "entity_type": "person",
  "description": "Backend engineer on the platform team",
  "properties": {"team": "platform"},
  "source_id": "optional-source-ref",
  "confidence": 0.95,
  "created_at": 1711900000,
  "updated_at": 1711900000
}
```

| Trường | Mô tả |
|--------|-------|
| `external_id` | Định danh dạng slug (ví dụ: `john-doe`), dùng cho upsert dedup |
| `properties` | Metadata key-value tùy ý từ quá trình trích xuất |
| `source_id` | Tham chiếu tùy chọn đến cuộc hội thoại hoặc tài liệu nguồn |
| `confidence` | Độ tin cậy (0.0–1.0); khi gộp, giữ giá trị cao hơn |

### Relation

```json
{
  "id": "uuid",
  "agent_id": "agent-uuid",
  "user_id": "optional-user-id",
  "source_entity_id": "john-doe-uuid",
  "relation_type": "works_on",
  "target_entity_id": "project-alpha-uuid",
  "confidence": 0.9,
  "properties": {},
  "created_at": 1711900000
}
```

Relation có hướng: `source --relation_type--> target`. Xóa entity sẽ cascade xóa tất cả relations liên quan.

---

## Các loại thực thể

| Loại | Ví dụ |
|------|-------|
| `person` | Thành viên nhóm, liên hệ, bên liên quan |
| `organization` | Công ty, nhóm, phòng ban |
| `project` | Sáng kiến, codebase, chương trình |
| `product` | Sản phẩm phần mềm, dịch vụ, tính năng |
| `technology` | Ngôn ngữ, framework, nền tảng |
| `task` | Hạng mục công việc, ticket, phân công |
| `event` | Cuộc họp, deadline, cột mốc |
| `document` | Báo cáo, đặc tả, wiki, runbook |
| `concept` | Phương pháp, ý tưởng, nguyên tắc |
| `location` | Văn phòng, thành phố, khu vực |

---

## Thống kê & Trực quan hóa đồ thị

**Thống kê** — Lấy tổng quan về đồ thị hiện tại:

```http
GET /v1/agents/{agentID}/kg/stats
```

Phản hồi bao gồm `entity_count`, `relation_count`, và phân bổ theo `entity_types`.

**Toàn bộ đồ thị** — Dùng để render visualization:

```http
GET /v1/agents/{agentID}/kg/graph?limit=200
```

Mặc định trả về tối đa 200 thực thể. Số lượng relations có thể gấp 3 lần số thực thể.

Web dashboard render đồ thị bằng **ReactFlow** kết hợp **D3 Force Simulation** (`d3-force`) để tự động tính vị trí node:

- **Force layout** — `forceSimulation` tính vị trí node dùng khoảng cách link, lực đẩy (`forceManyBody`), căn giữa (`forceCenter`) và chống va chạm (`forceCollide`). Các lực tự điều chỉnh theo số lượng node.
- **Kích thước theo loại** — Mỗi loại thực thể có mass khác nhau (organization=8, project=6, person=4...), node quan trọng tự nhiên nằm ở trung tâm.
- **Degree centrality** — Khi số thực thể vượt giới hạn hiển thị (50), đồ thị giữ lại các hub node có nhiều kết nối nhất. Node có ≥4 kết nối được highlight phát sáng.
- **Tương tác** — Click node để highlight các edge liên quan kèm label, làm mờ edge không liên quan, và mở dialog chi tiết thực thể.
- **Hỗ trợ theme** — Bảng màu kép (dark/light) với màu riêng cho từng loại thực thể. Đổi theme chỉ cập nhật màu, không chạy lại layout.
- **Hiệu năng** — Node component dùng `memo`, layout chạy trong `setTimeout(0)` tránh block UI, edge update dùng `useTransition`.

---

## Chia sẻ Knowledge Graph (Shared Mode)

Mặc định, knowledge graph được phân tách theo agent **và** user — mỗi user có đồ thị riêng. Khi bật `share_knowledge_graph` trong cấu hình workspace sharing của agent, đồ thị trở thành agent-level (chia sẻ giữa tất cả users):

```yaml
workspace_sharing:
  share_knowledge_graph: true
```

Trong chế độ shared, `user_id` bị bỏ qua cho tất cả thao tác KG — entities và relations từ mọi user được lưu và truy vấn chung. Hữu ích cho agent team, nơi mọi người cần nhìn thấy cùng một đồ thị.

> **Lưu ý:** `share_knowledge_graph` độc lập với `share_memory`. Có thể share memory mà không share graph, hoặc ngược lại.

---

## Trích xuất tự động khi ghi Memory

Khi agent ghi vào file memory (ví dụ: `MEMORY.md` hoặc các file trong `memory/`), GoClaw tự động trigger KG extraction trên nội dung được ghi. Cơ chế này thông qua `MemoryInterceptor`, gọi LLM đã cấu hình để trích xuất entities và relations từ văn bản memory mới.

Điều này có nghĩa agent liên tục xây dựng knowledge graph khi học — không cần gọi thủ công `/kg/extract` cho cuộc hội thoại bình thường. Extract API vẫn dùng được cho import hàng loạt hoặc tích hợp bên ngoài.

---

## Dọn dẹp theo độ tin cậy (Confidence Pruning)

Xóa hàng loạt thực thể và relations có độ tin cậy thấp bằng `PruneByConfidence`:

```bash
# Lệnh gọi nội bộ — xóa các mục dưới ngưỡng
# Trả về số lượng đã xóa
PruneByConfidence(agentID, userID, minConfidence)
```

Hữu ích sau khi import hàng loạt, khi nhiều mục có độ tin cậy thấp tích tụ. Các mục có `confidence < minConfidence` bị xóa; relations cascade tự động.

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

## Knowledge Graph vs Knowledge Vault

Knowledge Graph và [Kho Tri Thức (Knowledge Vault)](knowledge-vault.md) là hai hệ thống bổ trợ nhau:

| | Knowledge Graph | Knowledge Vault |
|--|----------------|-----------------|
| **Lưu trữ gì** | Thực thể được trích xuất và quan hệ có kiểu | Tài liệu đầy đủ (ghi chú, tài liệu đặc tả, context file) |
| **Cách xây dựng** | LLM tự động trích xuất từ hội thoại | Agent ghi file; VaultSyncWorker đăng ký tài liệu |
| **Tìm kiếm** | Tên thực thể / duyệt quan hệ | Hybrid FTS + vector trên title, path, nội dung |
| **Liên kết** | Cạnh quan hệ có kiểu (`works_on`, `manages`, …) | Wikilink `[[target]]` và tham chiếu tường minh |
| **Phạm vi** | Theo agent, tùy chọn chia sẻ trong team | Phạm vi personal / team / shared theo từng tài liệu |

Khi agent dùng `vault_search`, VaultSearchService fan-out đồng thời sang **cả** vault lẫn knowledge graph, hợp nhất kết quả theo điểm số có trọng số.

---

- [Kho Tri Thức (Knowledge Vault)](knowledge-vault.md) — Kho tài liệu cấp document với wikilink và tìm kiếm ngữ nghĩa
- [Hệ thống bộ nhớ](/memory-system) — Bộ nhớ dài hạn dựa trên vector
- [Sessions & History](/sessions-and-history) — Lưu trữ cuộc hội thoại

<!-- goclaw-source: 1296cdbf | cập nhật: 2026-04-11 -->
