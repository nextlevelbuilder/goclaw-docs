> Bản dịch từ [English version](/deploy-database)

# Thiết lập Database

> GoClaw yêu cầu **PostgreSQL 15+** với `pgvector` để lưu trữ đa tenant, tìm kiếm memory ngữ nghĩa, và tính năng Knowledge Vault. Backend **SQLite** cũng có cho bản desktop (single-user) với tính năng bị giới hạn — xem [SQLite vs PostgreSQL](#sqlite-vs-postgresql) bên dưới.

## Tổng quan

Toàn bộ state lâu dài đều nằm trong PostgreSQL: agents, sessions, memory, traces, skills, cron jobs, channel configs, tài liệu Knowledge Vault, và episodic summaries. Schema được quản lý qua các file migration đánh số trong `migrations/`. Cần hai extension: `pgcrypto` (tạo UUID) và `vector` (tìm kiếm memory theo ngữ nghĩa qua pgvector).

---

## Khởi động nhanh với Docker

Cách nhanh nhất là dùng compose overlay có sẵn:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d
```

Lệnh này khởi động `pgvector/pgvector:pg18` kèm health check và tự động cấu hình `GOCLAW_POSTGRES_DSN`. Bỏ qua tới [Chạy Migration](#chạy-migration).

---

## Cài đặt thủ công

### 1. Cài PostgreSQL 15+ với pgvector

Trên Ubuntu/Debian:

```bash
# Cài PostgreSQL
sudo apt install postgresql postgresql-contrib

# Cài pgvector (chọn phiên bản PG của bạn)
sudo apt install postgresql-16-pgvector
```

Dùng Docker image pgvector chính thức (khuyến nghị):

```bash
docker run -d \
  --name goclaw-postgres \
  -e POSTGRES_USER=goclaw \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=goclaw \
  -p 5432:5432 \
  pgvector/pgvector:pg18
```

### 2. Tạo database và bật extensions

```sql
-- Kết nối với superuser
CREATE DATABASE goclaw;
\c goclaw

-- Extensions bắt buộc (cả hai được bật tự động bởi migration 000001)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

> Extension `vector` cung cấp HNSW vector indexes dùng cho memory similarity search. `pgcrypto` cung cấp UUID v7 qua `gen_random_bytes()`.

### 3. Đặt connection string

Thêm vào file `.env` hoặc môi trường shell:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:your-secure-password@localhost:5432/goclaw?sslmode=disable
```

Cho production với TLS:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@db.example.com:5432/goclaw?sslmode=require
```

DSN là chuỗi kết nối chuẩn `lib/pq` / `pgx`. Tất cả tham số PostgreSQL tiêu chuẩn đều được hỗ trợ (`connect_timeout`, `pool_max_conns`, v.v.).

---

## Chạy Migration

GoClaw dùng [golang-migrate](https://github.com/golang-migrate/migrate) với các file SQL đánh số.

```bash
# Áp dụng tất cả migration đang chờ
./goclaw migrate up

# Kiểm tra phiên bản migration hiện tại
./goclaw migrate status

# Rollback một bước
./goclaw migrate down

# Rollback về phiên bản cụ thể
./goclaw migrate down 3
```

Với Docker (dùng upgrade overlay):

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade
```

### Các file migration

| File | Tạo ra |
|------|--------|
| `000001_init_schema` | Toàn bộ bảng core: agents, sessions, memory, traces, spans, skills, cron, pairing, MCP, custom tools, channels |
| `000002_agent_links` | Bảng `agent_links` cho delegation agent-to-agent |
| `000003_agent_teams` | Bảng team và task cho multi-agent teams |
| `000004_teams_v2` | Cải tiến metadata team và task status |
| `000005_phase4` | Thay đổi schema phase-4 bổ sung |
| `000006_builtin_tools` | Lưu trữ cấu hình built-in tool |
| `000007_team_metadata` | Trường JSONB metadata team |
| `000008_team_tasks_user_scope` | Phân scope task theo từng user |
| `000009_add_quota_index` | Partial index để tăng hiệu suất quota checker |
| `000010_agents_md_v2` | Schema agent metadata v2 |
| `000011_session_profile_metadata` | Cột JSONB `metadata` trên sessions, profiles, pairing |
| `000012_channel_pending_messages` | Bảng `channel_pending_messages` — buffer lịch sử chat nhóm |
| `000013_knowledge_graph` | Bảng `kg_entities`, `kg_relations` — lưu trữ entity theo ngữ nghĩa |
| `000014_channel_contacts` | Bảng `channel_contacts` — danh bạ liên lạc toàn cục từ các channel |
| `000015_agent_budget` | `budget_monthly_cents` trên agents; audit trail `activity_logs` |
| `000016_usage_snapshots` | Bảng `usage_snapshots` — tổng hợp token/chi phí theo giờ |
| `000017_system_skills` | Cột `is_system`, `deps`, `enabled` trên skills |
| `000018_team_tasks_workspace_followup` | File workspace team, phiên bản file, comment; event và comment task |
| `000019_team_id_columns` | FK `team_id` trên memory, KG, traces, spans, cron, sessions (9 bảng) |
| `000020_secure_cli_and_api_keys` | `secure_cli_binaries` để exec có xác thực; `api_keys` cho auth chi tiết |
| `000021_paired_devices_expiry` | `expires_at` trên paired devices; `confidence_score` trên team tasks, messages, comments |
| `000022`–`000036` | Heartbeats, hard-delete agent, team attachments refactor, KG semantic search, tenant foundation, subagent tasks, CLI grants — xem [Database Schema → Lịch sử Migration](/database-schema) |
| `000037_v3_memory_evolution` | **v3** — `episodic_summaries`, `agent_evolution_metrics`, `agent_evolution_suggestions`; cột temporal KG; 12 trường agent promote từ `other_config` JSONB |
| `000038_vault_tables` | **v3** — `vault_documents`, `vault_links`, `vault_versions` cho Knowledge Vault |
| `000039_episodic_summaries` | Xóa dữ liệu `agent_links` cũ |
| `000040_episodic_search_index` | Thêm cột FTS generated `search_vector` + HNSW index vào `episodic_summaries` |
| `000041_episodic_promoted` | Thêm cột `promoted_at` cho long-term memory promotion pipeline |
| `000042_vault_tsv_summary` | Thêm cột `summary` vào `vault_documents`; tái tạo FTS bao gồm summary |
| `000043_vault_team_custom_scope` | Thêm `team_id`, `custom_scope` vào `vault_documents` và 9 bảng khác; unique constraint hỗ trợ team; trigger sửa scope |
| `000044_seed_agents_core_task_files` | Seed `AGENTS_CORE.md` và `AGENTS_TASK.md`; xóa `AGENTS_MINIMAL.md` |

> **Data hooks:** GoClaw theo dõi các Go transform sau migration trong bảng `data_migrations` riêng. Chạy `./goclaw upgrade --status` để xem cả phiên bản SQL migration và các data hook đang chờ.

Chạy `./goclaw migrate status` sau khi deploy để xác nhận schema hiện tại là phiên bản **44**.

---

## SQLite vs PostgreSQL

GoClaw v3 hỗ trợ hai backend database:

| Tính năng | PostgreSQL | SQLite (desktop) |
|-----------|-----------|-----------------|
| Schema đầy đủ (44 migration) | Có | Có |
| Tìm kiếm vector similarity (HNSW) | Có — pgvector | Không |
| Tìm kiếm vector episodic summaries | Có | Chỉ FTS |
| Knowledge Vault tự động liên kết | Có — ngưỡng 0.7 | Không (chỉ tóm tắt) |
| Tìm kiếm ngữ nghĩa `kg_entities` | Có | Không |
| Multi-tenant | Có | Single-tenant |
| Connection pooling | Có — pgx/v5, 25 max | N/A (embedded) |

Dùng PostgreSQL cho tất cả triển khai production và multi-user. SQLite chỉ hỗ trợ trong bản desktop (single-binary) và không có vector operations.

---

## Các bảng chính

| Bảng | Mục đích |
|------|----------|
| `agents` | Định nghĩa agent, model config, tool config |
| `sessions` | Lịch sử hội thoại, token count mỗi session |
| `traces` / `spans` | Tracing LLM call, token usage, chi phí |
| `memory_chunks` | Semantic memory (pgvector HNSW index, `vector(1536)`) |
| `memory_documents` | Metadata memory document |
| `embedding_cache` | Cached embeddings theo content hash + model |
| `llm_providers` | LLM provider configs (API key mã hóa AES-256-GCM) |
| `mcp_servers` | Kết nối MCP server bên ngoài |
| `cron_jobs` / `cron_run_logs` | Scheduled tasks và lịch sử chạy |
| `skills` | Skill files với BM25 + vector search |
| `channel_instances` | Cấu hình messaging channel (Telegram, Discord, v.v.) |
| `activity_logs` | Audit trail — hành động admin, thay đổi config, sự kiện bảo mật |
| `usage_snapshots` | Tổng hợp token count và chi phí theo giờ mỗi agent/user |
| `kg_entities` / `kg_relations` | Knowledge graph — entity và quan hệ (v3: temporal validity qua `valid_from`/`valid_until`) |
| `channel_contacts` | Danh bạ liên lạc thống nhất đồng bộ từ tất cả channel |
| `channel_pending_messages` | Buffer tin nhắn nhóm đang chờ để xử lý hàng loạt |
| `api_keys` | API key có phạm vi với SHA-256 hash lookup và thu hồi |
| `episodic_summaries` | **v3** — Bộ nhớ Tầng 2: tóm tắt session nén với FTS và vector search |
| `agent_evolution_metrics` | **v3** — Self-evolution Giai đoạn 1: quan sát metric thô |
| `agent_evolution_suggestions` | **v3** — Self-evolution Giai đoạn 2: đề xuất thay đổi hành vi |
| `vault_documents` | **v3** — Registry tài liệu Knowledge Vault (path, hash, embedding, FTS) |
| `vault_links` | **v3** — Liên kết hai chiều wikilink giữa tài liệu vault |
| `subagent_tasks` | Lưu trữ subagent task cho theo dõi vòng đời, phân bổ chi phí |

---

## Backup và Restore

### Backup

```bash
# Full database dump (khuyến nghị — bao gồm schema + data)
pg_dump -h localhost -U goclaw -d goclaw -Fc -f goclaw-backup.dump

# Chỉ schema (để kiểm tra cấu trúc)
pg_dump -h localhost -U goclaw -d goclaw --schema-only -f goclaw-schema.sql

# Loại trừ bảng lớn nếu cần (ví dụ: bỏ spans để backup nhỏ hơn)
pg_dump -h localhost -U goclaw -d goclaw -Fc \
  --exclude-table=spans \
  -f goclaw-backup-no-spans.dump
```

### Restore

```bash
# Restore vào database mới
createdb -h localhost -U postgres goclaw_restore
pg_restore -h localhost -U goclaw -d goclaw_restore goclaw-backup.dump
```

### Backup Docker volume

```bash
# Backup volume postgres-data
docker run --rm \
  -v goclaw_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Hiệu năng

### Connection pooling

GoClaw dùng `pgx/v5` với `database/sql`. Connection pool được cố định ở **25 max open / 10 max idle** connections. Với các triển khai high-concurrency, đảm bảo PostgreSQL `max_connections` đủ cho con số này. Bạn cũng có thể đặt tham số pool trong DSN:

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@localhost:5432/goclaw?sslmode=disable&pool_max_conns=20
```

Hoặc dùng PgBouncer trước PostgreSQL để connection pooling ở quy mô lớn.

### Các index quan trọng

Schema có sẵn các index hiệu năng cao:

| Index | Bảng | Mục đích |
|-------|-------|----------|
| `idx_traces_quota` | `traces` | Query quota window theo user (partial, top-level only) |
| `idx_mem_vec` | `memory_chunks` | HNSW cosine similarity search (`vector_cosine_ops`) |
| `idx_mem_tsv` | `memory_chunks` | Full-text BM25 search qua GIN index `tsvector` |
| `idx_traces_user_time` | `traces` | Query usage theo user + time |
| `idx_sessions_updated` | `sessions` | Liệt kê sessions gần nhất |

Index `idx_traces_quota` được thêm `CONCURRENTLY` trong migration `000009` — có thể tạo mà không lock bảng trên hệ thống live.

### Tăng trưởng disk

Bảng `spans` tăng nhanh khi dùng nhiều (một row mỗi LLM call span). Cân nhắc dọn dẹp định kỳ:

```sql
-- Xóa spans cũ hơn 30 ngày
DELETE FROM spans WHERE created_at < NOW() - INTERVAL '30 days';

-- Xóa traces cũ hơn 90 ngày (cascade xuống spans)
DELETE FROM traces WHERE created_at < NOW() - INTERVAL '90 days';

VACUUM ANALYZE traces, spans;
```

---

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `extension "vector" does not exist` | pgvector chưa cài | Cài `postgresql-XX-pgvector` hoặc dùng Docker image `pgvector/pgvector` |
| `migrate up` lỗi lần đầu | Extensions chưa bật | Đảm bảo DB user có quyền `SUPERUSER` hoặc `CREATE EXTENSION` |
| Connection refused | Host/port sai trong DSN | Kiểm tra `GOCLAW_POSTGRES_DSN`; xác nhận PostgreSQL đang chạy |
| Memory search không có kết quả | Embedding model dimension không khớp | Schema dùng `vector(1536)` — đảm bảo embedding model output 1536 dims |
| Disk usage cao | Bảng `spans` tăng không giới hạn | Lên lịch `DELETE` + `VACUUM` định kỳ trên `spans` và `traces` |

---

## Tiếp theo

- [Docker Compose](/deploy-docker-compose) — deploy theo compose với postgres overlay
- [Security Hardening](/deploy-security) — mã hóa AES-256-GCM cho secrets trong database
- [Observability](/deploy-observability) — query traces và spans để theo dõi chi phí LLM

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
