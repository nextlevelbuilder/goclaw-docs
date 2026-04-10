> Bản dịch từ [English version](/knowledge-vault)

# Kho Tri Thức (Knowledge Vault)

> Kho lưu trữ tri thức có cấu trúc, cho phép agent quản lý tài liệu workspace với wikilink hai chiều, tìm kiếm ngữ nghĩa và phân quyền theo team — tất cả đặt trên các hệ thống bộ nhớ hiện có.

Knowledge Vault là tính năng **chỉ có trong v3**. Nó nằm giữa agent và các kho episodic/KG, bổ sung ghi chú cấp tài liệu với mối quan hệ tường minh.

> **Vault vs Knowledge Graph** — Vault lưu trữ toàn bộ tài liệu (ghi chú, context file, tài liệu đặc tả) với tìm kiếm từ khóa + ngữ nghĩa và wikilink. [Knowledge Graph](knowledge-graph.md) lưu trữ *thực thể và quan hệ* được trích xuất tự động từ hội thoại. Hai hệ thống bổ trợ nhau: vault cho tài liệu có chủ ý, KG cho sự kiện tự động trích xuất. VaultSearchService fan-out sang cả hai đồng thời.

---

## Kiến Trúc

| Thành phần | Vai trò |
|-----------|------|
| **VaultStore** | CRUD tài liệu, quản lý liên kết, tìm kiếm hybrid FTS + vector |
| **VaultService** | Điều phối tìm kiếm: fan-out sang vault, episodic và KG với điểm số có trọng số |
| **VaultSyncWorker** | Theo dõi filesystem: phát hiện thay đổi file (tạo/ghi/xóa), đồng bộ content hash |
| **VaultRetriever** | Kết nối tìm kiếm vault vào hệ thống bộ nhớ L0 của agent |
| **HTTP Handlers** | REST endpoints: list, get, search, links |

### Luồng Dữ Liệu

```
Agent ghi tài liệu → Workspace FS
                    ↓
          VaultSyncWorker phát hiện thay đổi
                    ↓
       Cập nhật vault_documents (hash, metadata)
                    ↓
       Khi agent truy vấn: công cụ vault_search
                    ↓
  VaultSearchService (fan-out song song)
       ↙            ↓            ↘
  Vault         Episodic     Knowledge Graph
  (trọng số 0.4) (0.3)        (0.3)
       ↘            ↓            ↙
    Chuẩn hóa & Tính điểm có trọng số
               ↓
        Trả về kết quả hàng đầu
```

### Phân Vùng Phạm Vi

Tài liệu được phân vùng theo **tenant** (ranh giới cô lập), **agent** (namespace) và **document scope**:

| Scope | Mô tả |
|-------|-------------|
| `personal` | Tài liệu riêng của agent (context file theo agent, công việc theo người dùng) |
| `team` | Tài liệu workspace team được chia sẻ với các thành viên |
| `shared` | Tri thức chia sẻ liên tenant (dự kiến tương lai) |

---

## Mô Hình Dữ Liệu

### vault_documents

Registry metadata của tài liệu. Nội dung lưu trên filesystem; registry lưu path, hash, embedding và liên kết.

| Cột | Kiểu | Ghi chú |
|--------|------|-------|
| `id` | UUID | Khóa chính |
| `tenant_id` | UUID | Cô lập multi-tenant |
| `agent_id` | UUID | Namespace theo agent |
| `scope` | TEXT | `personal` \| `team` \| `shared` |
| `path` | TEXT | Đường dẫn tương đối trong workspace (vd: `workspace/notes/foo.md`) |
| `title` | TEXT | Tên hiển thị |
| `doc_type` | TEXT | `context`, `memory`, `note`, `skill`, `episodic` |
| `content_hash` | TEXT | SHA-256 của nội dung file (phát hiện thay đổi) |
| `embedding` | vector(1536) | pgvector tìm kiếm ngữ nghĩa |
| `tsv` | tsvector | GIN FTS index trên title + path |
| `metadata` | JSONB | Các trường tùy chỉnh |

Ràng buộc duy nhất: `(agent_id, scope, path)` — một tài liệu mỗi path mỗi scope.

### vault_links

Liên kết hai chiều giữa các tài liệu (wikilink, tham chiếu tường minh).

| Cột | Kiểu | Ghi chú |
|--------|------|-------|
| `from_doc_id` | UUID | Tài liệu nguồn |
| `to_doc_id` | UUID | Tài liệu đích |
| `link_type` | TEXT | `wikilink`, `reference`, v.v. |
| `context` | TEXT | ~50 ký tự văn bản xung quanh |

Ràng buộc duy nhất: `(from_doc_id, to_doc_id, link_type)` — không có liên kết trùng lặp.

### vault_versions

Lịch sử phiên bản được chuẩn bị cho v3.1 — bảng tồn tại nhưng trống trong v3.0.

---

## Wikilink

Agent có thể tạo liên kết markdown hai chiều theo định dạng `[[target]]`.

### Cú Pháp

```markdown
Xem [[architecture/components]] để biết chi tiết.
Tham chiếu [[SOUL.md|agent persona]] tại đây.
Liên kết [[../parent-project]] lên trên.
```

- `[[path/to/file.md]]` — target theo đường dẫn
- `[[name|display text]]` — display text chỉ mang tính thẩm mỹ
- Tự động thêm phần mở rộng `.md` nếu thiếu
- Các target rỗng hoặc chỉ có khoảng trắng bị bỏ qua

### Chiến Lược Giải Quyết

Khi giải quyết target của wikilink:

1. **Khớp path chính xác** — tìm tài liệu theo path
2. **Thêm hậu tố .md** — thử lại nếu target thiếu phần mở rộng
3. **Tìm theo basename** — quét tất cả tài liệu của agent, khớp theo tên file (không phân biệt hoa thường)
4. **Không giải quyết được** — bỏ qua lặng lẽ; backlink có thể không đầy đủ

### Đồng Bộ Liên Kết

`SyncDocLinks` giữ `vault_links` đồng bộ với nội dung tài liệu:

1. Trích xuất tất cả mẫu `[[...]]` từ nội dung
2. Xóa tất cả outgoing link của tài liệu (chiến lược thay thế)
3. Giải quyết từng target và tạo hàng `vault_link` cho các target đã giải quyết được

Chạy mỗi khi upsert tài liệu và mỗi sự kiện file VaultSyncWorker.

---

## Tìm Kiếm

### Tìm Kiếm Vault (Single Store)

Tìm kiếm hybrid FTS + vector trên một vault:

- **FTS**: PostgreSQL `plainto_tsquery()` trên `tsv` (từ khóa title + path)
- **Vector**: pgvector cosine similarity trên embedding (ngữ nghĩa)
- **Tính điểm**: Điểm từ mỗi phương pháp được chuẩn hóa về 0–1, sau đó kết hợp với trọng số lúc truy vấn

### Tìm Kiếm Thống Nhất (Cross-Store)

`VaultSearchService` fan-out song song qua tất cả nguồn tri thức:

| Nguồn | Trọng số | Tìm kiếm gì |
|--------|--------|-----------------|
| Vault | 0.4 | Title, path, embedding của tài liệu |
| Episodic | 0.3 | Tóm tắt phiên làm việc |
| Knowledge Graph | 0.3 | Tên và mô tả thực thể |

Kết quả được chuẩn hóa theo từng nguồn (điểm tối đa = 1.0), tính trọng số, hợp nhất, loại trùng theo ID và sắp xếp theo điểm cuối giảm dần.

### Tham Số Tìm Kiếm

| Tham số | Kiểu | Mặc định | Ghi chú |
|-------|------|---------|-------|
| `Query` | string | — | Bắt buộc: ngôn ngữ tự nhiên |
| `AgentID` | string | — | Giới hạn theo agent |
| `TenantID` | string | — | Giới hạn theo tenant |
| `Scope` | string | all | `personal`, `team`, `shared` |
| `DocTypes` | []string | all | `context`, `memory`, `note`, `skill`, `episodic` |
| `MaxResults` | int | 10 | Kích thước tập kết quả cuối |
| `MinScore` | float64 | 0.0 | Lọc điểm tối thiểu |

---

## Đồng Bộ Filesystem

`VaultSyncWorker` theo dõi thư mục workspace sử dụng `fsnotify`:

1. **Debounce**: 500ms — nhiều thay đổi nhanh gộp thành một lô
2. Cho mỗi file thay đổi:
   - Tính hash SHA-256
   - So sánh với `vault_documents.content_hash`
   - Nếu khác: cập nhật hash trong DB
   - Nếu file bị xóa: đánh dấu `metadata["deleted"] = true`

**Lưu ý:** Đồng bộ một chiều — chỉ tài liệu đã đăng ký mới được theo dõi. File mới cần được agent ghi trước. Vault không ghi ngược lại filesystem.

---

## Công Cụ Agent

### vault_search

Công cụ khám phá chính. Tìm kiếm trên vault, episodic memory và Knowledge Graph với xếp hạng thống nhất.

```json
{
  "query": "authentication flow",
  "scope": "team",
  "types": "context,note",
  "maxResults": 10
}
```

### vault_link

Tạo liên kết tường minh giữa hai tài liệu (tương tự wikilink nhưng theo cách lập trình).

```json
{
  "from": "docs/auth.md",
  "to": "SOUL.md",
  "context": "Tham chiếu Persona"
}
```

Các trường `from` và `to` là đường dẫn tương đối trong workspace. `context` là mô tả quan hệ tùy chọn được lưu trong `vault_links.context`.

---

## REST API

Tất cả endpoint yêu cầu `Authorization: Bearer <token>`.

### Endpoint Theo Agent

| Phương thức | Đường dẫn | Mô tả |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/vault/documents` | Liệt kê tài liệu (scope, doc_type, limit, offset) |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}` | Lấy một tài liệu |
| `POST` | `/v1/agents/{agentID}/vault/search` | Tìm kiếm thống nhất |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}/links` | Outlink + backlink |

### Endpoint Liên Agent

| Phương thức | Đường dẫn | Mô tả |
|--------|------|-------------|
| `GET` | `/v1/vault/documents` | Liệt kê qua tất cả agent của tenant (lọc theo `agent_id`) |

---

## Yêu Cầu

- **PostgreSQL** với extension `pgvector` (cho embedding)
- **Migration** `000038_vault_tables` phải đã chạy thành công
- **VaultStore** khởi tạo trong quá trình khởi động gateway
- **VaultSyncWorker** đã khởi động để đồng bộ filesystem

Không có feature flag. Vault hoạt động nếu migration đã chạy và VaultStore đã khởi tạo.

---

## Giới Hạn

- Tài liệu vault **không tự inject** vào system prompt của agent — phải truy xuất qua `vault_search`
- FTS chỉ index title + path; nội dung cần vector embedding để khám phá
- Đồng bộ **một chiều** (filesystem → vault; vault không ghi ngược lại)
- **Không giải quyết xung đột** — thao tác đồng thời dùng last-write-wins
- **Lịch sử phiên bản** (bảng `vault_versions`) chuẩn bị cho v3.1; trống trong v3.0

---

## Xem Thêm

- [Knowledge Graph](knowledge-graph.md) — Đồ thị thực thể và quan hệ tự động trích xuất từ hội thoại
- [Memory System](/memory-system) — Bộ nhớ dài hạn dạng vector
- [Context Files](/context-files) — Tài liệu tĩnh được inject vào context của agent

<!-- goclaw-source: 1296cdbf | updated: 2026-04-11 -->
