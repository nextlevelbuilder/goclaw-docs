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
| **EnrichWorker** | Xử lý sự kiện upsert tài liệu vault để tạo tóm tắt, embedding và semantic link |
| **VaultRetriever** | Kết nối tìm kiếm vault vào hệ thống bộ nhớ L0 của agent |
| **HTTP Handlers** | REST endpoints: list, get, search, links, tree, graph |

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

### Bất Biến Scope & Quyền Sở Hữu Tài Liệu

Trường `scope` có bất biến quyền sở hữu chặt chẽ được thực thi ở cấp database bởi migration `000055` (ràng buộc CHECK `vault_documents_scope_consistency`):

| `scope` | `agent_id` | `team_id` | Khả năng truy cập |
|---------|------------|-----------|-------------------|
| `personal` | có giá trị | NULL | Chỉ agent sở hữu (trong tenant) |
| `team` | NULL | có giá trị | Các thành viên của team (trong tenant) |
| `shared` | NULL | NULL | Tất cả agent trong tenant |
| `custom` | tùy ý | tùy ý | Tự định nghĩa qua `custom_scope` |

Ràng buộc CHECK từ chối mọi INSERT hoặc UPDATE vi phạm mối quan hệ `scope × agent_id × team_id` ở trên. `scope='custom'` là ngoại lệ — được thiết kế không có ràng buộc, cho phép ngữ nghĩa quyền sở hữu do người dùng định nghĩa.

#### Ngữ Nghĩa Đọc của Agent

`vault_search`, `ListDocuments` và `CountDocuments` luôn trả về:

- Tài liệu thuộc sở hữu của agent đang truy vấn (`agent_id = <agent>`)
- CỘNG VỚI tài liệu shared (`agent_id IS NULL`)

Trong ngữ cảnh team (một `RunContext` với `TeamID` được đặt), kết quả cũng bao gồm tài liệu team-scoped của team đó (`scope = 'team'` với `team_id = <team>`). Cô lập tenant (`tenant_id = <tenant>`) luôn được thực thi bất kể scope.

---

## Mô Hình Dữ Liệu

### vault_documents

Registry metadata của tài liệu. Nội dung lưu trên filesystem; registry lưu path, hash, embedding và liên kết.

| Cột | Kiểu | Ghi chú |
|--------|------|-------|
| `id` | UUID | Khóa chính |
| `tenant_id` | UUID | Cô lập multi-tenant |
| `agent_id` | UUID | Namespace theo agent; **có thể NULL** cho file team-scoped hoặc tenant-shared (migration 046) |
| `scope` | TEXT | `personal` \| `team` \| `shared` |
| `path` | TEXT | Đường dẫn tương đối trong workspace (vd: `workspace/notes/foo.md`) |
| `title` | TEXT | Tên hiển thị |
| `doc_type` | TEXT | `context`, `memory`, `note`, `skill`, `episodic`, `image`, `video`, `audio`, `document` |
| `content_hash` | TEXT | SHA-256 của nội dung file (phát hiện thay đổi) |
| `embedding` | vector(1536) | pgvector tìm kiếm ngữ nghĩa |
| `tsv` | tsvector | GIN FTS index trên title + path + summary |
| `metadata` | JSONB | Các trường tùy chỉnh |

### vault_links

Liên kết hai chiều giữa các tài liệu (wikilink, tham chiếu tường minh và semantic link do enrichment pipeline tạo).

| Cột | Kiểu | Ghi chú |
|--------|------|-------|
| `from_doc_id` | UUID | Tài liệu nguồn |
| `to_doc_id` | UUID | Tài liệu đích |
| `link_type` | TEXT | `wikilink`, `reference`, `depends_on`, `extends`, `related`, `supersedes`, `contradicts`, `task_attachment`, `delegation_attachment` |
| `context` | TEXT | ~50 ký tự văn bản xung quanh |
| `metadata` | JSONB | Metadata từ enrichment pipeline (migration 048) |

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

## Pipeline Enrichment

Sau mỗi lần upsert tài liệu, **EnrichWorker** xử lý sự kiện bất đồng bộ để làm giàu tài liệu vault với tóm tắt, embedding và semantic link.

### EnrichWorker làm gì

1. Tạo tóm tắt văn bản cho nội dung tài liệu
2. Tính toán vector embedding cho tìm kiếm ngữ nghĩa
3. Phân loại mối quan hệ ngữ nghĩa với các tài liệu khác trong vault và tạo hàng `vault_link`

### Các loại semantic link

Bộ phân loại tạo liên kết với một trong sáu loại mối quan hệ:

| Loại | Ý nghĩa |
|------|---------|
| `reference` | Tài liệu trích dẫn tài liệu khác làm nguồn |
| `depends_on` | Tài liệu cần tài liệu khác để có ý nghĩa |
| `extends` | Tài liệu bổ sung hoặc xây dựng dựa trên tài liệu khác |
| `related` | Mối quan hệ chủ đề chung |
| `supersedes` | Tài liệu thay thế hoặc làm lỗi thời tài liệu khác |
| `contradicts` | Tài liệu mâu thuẫn với tài liệu khác |

### Loại link đặc biệt cho task/delegation

Hai loại link bổ sung được tạo bởi hệ thống task/delegation, không phải bộ phân loại:

- `task_attachment` — liên kết tài liệu vault với task team mà nó được đính kèm
- `delegation_attachment` — liên kết tài liệu vault với delegation mà nó được đính kèm

Các loại này không bị ảnh hưởng bởi cleanup hoặc rescan của enrichment.

### Tiến độ enrichment

Tiến độ enrichment theo thời gian thực được phát qua WebSocket events. UI hiển thị trạng thái từng tài liệu trong khi worker chạy.

### Điều khiển dừng và rescan

Từ UI (hoặc REST API), người dùng có thể:
- **Dừng enrichment** — tạm dừng EnrichWorker cho tenant hiện tại
- **Kích hoạt rescan** — đưa tất cả tài liệu vault vào hàng đợi để tái enrichment (hữu ích sau khi thay đổi model hoặc cấu hình)

---

## Hỗ Trợ Tài Liệu Media

Vault chấp nhận file binary và media ngoài tài liệu văn bản. Các loại file được hỗ trợ được kiểm soát bởi danh sách trắng phần mở rộng.

### Giá trị doc_type cho file media

| `doc_type` | Dùng cho |
|-----------|---------|
| `image` | PNG, JPG, GIF, WEBP, SVG, v.v. |
| `video` | MP4, MOV, AVI, v.v. |
| `audio` | MP3, WAV, OGG, v.v. |
| `document` | PDF, DOCX, XLSX, v.v. |

### Tóm tắt tổng hợp cho media

Vì file media không thể đọc dạng văn bản, vault dùng `SynthesizeMediaSummary()` để tạo tóm tắt ngữ nghĩa xác định từ tên file và ngữ cảnh thư mục cha. Không cần gọi LLM. Tóm tắt được lưu trong `vault_documents.summary` và đưa vào FTS index, cho phép khám phá file media bằng từ khóa qua tên và vị trí.

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

> **Ghi chú về liên kết:** Liên kết tài liệu tường minh giờ được xử lý tự động bởi enrichment pipeline. Công cụ agent `vault_link` đã bị xóa. Liên kết được tạo qua cú pháp wikilink trong nội dung tài liệu (`[[target]]`) hoặc được EnrichWorker tạo theo ngữ nghĩa. Bạn có thể xem liên kết qua `GET /v1/agents/{agentID}/vault/documents/{docID}/links`.

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
| `GET` | `/v1/vault/tree` | Xem cấu trúc cây của vault |
| `GET` | `/v1/vault/graph` | Trực quan hóa đồ thị liên tenant (giới hạn 2000 node, layout FA2) |

### Endpoint Điều Khiển Enrichment

| Phương thức | Đường dẫn | Mô tả |
|--------|------|-------------|
| `POST` | `/v1/vault/enrichment/stop` | Dừng enrichment worker |

---

## Migration Gần Đây

| Migration | Tên | Thay đổi |
|-----------|------|----------|
| 046 | `vault_nullable_agent_id` | Cho phép `vault_documents.agent_id` là NULL cho file team-scoped và tenant-shared |
| 048 | `vault_media_linking` | Thêm cột generated `base_name` vào `team_task_attachments`; thêm `metadata JSONB` vào `vault_links`; sửa CASCADE FK constraints |
| 049 | `vault_path_prefix_index` | Thêm concurrent index `idx_vault_docs_path_prefix` với `text_pattern_ops` cho truy vấn prefix nhanh |

---

## Yêu Cầu

- **PostgreSQL** với extension `pgvector` (cho embedding)
- **Migration** `000038_vault_tables` phải đã chạy thành công
- **VaultStore** khởi tạo trong quá trình khởi động gateway
- **VaultSyncWorker** đã khởi động để đồng bộ filesystem
- **EnrichWorker** đã khởi động để tự động enrichment (tóm tắt, embedding, semantic link)

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
- [Memory System](../../core-concepts/memory-system.md) — Bộ nhớ dài hạn dạng vector
- [Context Files](../../agents/context-files.md) — Tài liệu tĩnh được inject vào context của agent

<!-- goclaw-source: b9670555 | updated: 2026-04-19 -->
