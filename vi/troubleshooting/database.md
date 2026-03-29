> Bản dịch từ [English version](/troubleshoot-database)

# Vấn đề Database

> Troubleshooting PostgreSQL migration, pgvector, connection pool, và slow query.

## Tổng quan

GoClaw yêu cầu PostgreSQL 15+ với extension `pgvector` và `pgcrypto`. Kết nối database được cấu hình duy nhất qua `GOCLAW_POSTGRES_DSN` (không bao giờ lưu trong `config.json`). Migration được quản lý bởi `golang-migrate` và chạy qua `./goclaw migrate up`.

## Lỗi Kết Nối

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `GOCLAW_POSTGRES_DSN environment variable is not set` | DSN chưa export | `export GOCLAW_POSTGRES_DSN=postgres://user:pass@host:5432/goclaw` |
| `open postgres: ...` | Định dạng DSN không hợp lệ | Xác minh DSN; dùng `psql "$GOCLAW_POSTGRES_DSN"` để test thủ công |
| `ping postgres: dial error` | Postgres không chạy hoặc host/port sai | Khởi động Postgres; kiểm tra host, port, firewall |
| `ping postgres: password authentication failed` | Credentials sai | Xác minh username và password trong DSN |
| `ping postgres: database "goclaw" does not exist` | DB chưa tạo | `createdb goclaw` hoặc `psql -c "CREATE DATABASE goclaw;"` |

GoClaw dùng connection pool cố định: **25 max open connections**, **10 max idle connections**. Điều chỉnh `max_connections` trong `postgresql.conf` nếu chạy nhiều GoClaw instance.

**Triệu chứng connection pool cạn kiệt:** Khi cả 25 connection đang dùng, request mới phải chờ. Triệu chứng gồm query latency tăng đột ngột, lỗi timeout, và log dạng `pq: sorry, too many clients already`. Để chẩn đoán:

```sql
-- Kiểm tra số connection đang hoạt động đến database goclaw
SELECT count(*) FROM pg_stat_activity WHERE datname = 'goclaw';
```

Nếu chạy nhiều GoClaw instance, đảm bảo `max_connections` trong `postgresql.conf` tối thiểu là `25 × số_instance + 5`.

## Lỗi Migration

Chạy migration thủ công:

```bash
./goclaw migrate up
```

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `create migrator: ...` | Không tìm thấy thư mục migrations | Chạy từ thư mục chứa `migrations/`, hoặc đặt `GOCLAW_MIGRATIONS_DIR` |
| `migrate up: ...` | Lỗi SQL trong migration | Kiểm tra Postgres log; xử lý lỗi SQL cơ bản |
| `dirty: true` trong version output | Migration trước lỗi giữa chừng | Fix migration lỗi thủ công, rồi chạy `./goclaw migrate force <version>` |
| `no change` | Tất cả migration đã áp dụng | Bình thường — không cần làm gì |
| Data hooks thất bại (warning) | Lỗi post-migration data hook | Warning không fatal; kiểm tra log và chạy lại nếu cần |

**Phục hồi từ dirty state:**

```bash
# Kiểm tra version hiện tại và dirty flag
./goclaw migrate version

# Force-set version về migration tốt cuối cùng (không áp dụng SQL)
./goclaw migrate force <version_number>

# Rồi áp dụng lại migration
./goclaw migrate up
```

## Extension pgvector và pgcrypto

GoClaw yêu cầu **cả hai** `pgvector` và `pgcrypto`. Migration đầu tiên (`000001_init_schema.up.sql`) tạo cả hai extension:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

`pgcrypto` được dùng để tạo UUID (`gen_random_uuid()`). Nó được đóng gói trong package `postgresql-contrib` trên hầu hết platform.

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `extension "pgcrypto" does not exist` | `postgresql-contrib` chưa cài | `apt install postgresql-contrib` (Debian) hoặc `brew install postgresql` đã bao gồm sẵn |
| Migration lỗi ở `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` | Không đủ quyền | Kết nối với superuser hoặc cấp quyền `CREATE EXTENSION` |

## pgvector Extension

GoClaw dùng `pgvector` cho semantic memory search (1536-dimension HNSW index trên `memory_chunks`, `skills`).

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| `extension "vector" does not exist` | pgvector chưa cài | Cài pgvector: `apt install postgresql-15-pgvector` (Debian) hoặc build từ source |
| Migration lỗi ở `CREATE EXTENSION IF NOT EXISTS "vector"` | Không đủ quyền | Kết nối với superuser hoặc cấp quyền `CREATE EXTENSION` |
| Vector search không có kết quả | Embedding chưa được tạo | Kiểm tra rằng embedding-capable provider (Anthropic, OpenAI) đã đăng ký và backfill đã chạy |
| HNSW index build chậm | Bảng `memory_chunks` lớn | Bình thường khi tạo index lần đầu; chạy một lần trong migration |

**Cài pgvector trên các platform phổ biến:**

```bash
# Debian/Ubuntu
apt install postgresql-15-pgvector

# macOS với Homebrew
brew install pgvector

# Docker (dùng image pgvector)
docker pull pgvector/pgvector:pg15
```

## Slow Queries

Các index chính được tạo bởi schema GoClaw:

- Sessions: `idx_sessions_updated` (updated_at DESC), `idx_sessions_agent`, `idx_sessions_user`
- Memory: `idx_mem_vec` (HNSW vector cosine), `idx_mem_tsv` (GIN full-text), `idx_mem_agent_user`
- Traces: `idx_traces_agent_time`, `idx_traces_status` (chỉ lỗi)
- Skills: `idx_skills_embedding` (HNSW), `idx_skills_visibility`

Nếu query vẫn chậm dù có index:

```sql
-- Kiểm tra thiếu ANALYZE (thống kê cũ)
ANALYZE memory_chunks;
ANALYZE sessions;

-- Xác định slow query
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

Riêng với vector search, đảm bảo `work_mem` đủ lớn cho HNSW probe:

```sql
-- Session-level (hoặc thêm vào postgresql.conf)
SET work_mem = '256MB';
```

## Embedding Backfill

GoClaw tự động backfill embedding khi khởi động. Khi provider có khả năng embedding (Anthropic hoặc OpenAI) được cấu hình, GoClaw chạy background goroutine gọi `BackfillEmbeddings` (memory chunks) và `BackfillSkillEmbeddings` (skills) cho các row có `embedding IS NULL`. Quá trình này chạy một lần mỗi lần khởi động.

Theo dõi các log khởi động sau:

```
INFO memory embeddings enabled provider=anthropic model=text-embedding-3-small
INFO memory embeddings backfill complete chunks_updated=42
INFO skill embeddings backfill complete updated=5
```

Nếu log hiển thị `memory embeddings disabled (no API key), chunks stored without vectors`, hãy cấu hình embedding provider trước.

Nếu memory document hoặc skill được thêm trước khi cấu hình embedding provider, cột `embedding` của chúng sẽ là NULL và vector search sẽ bỏ qua chúng.

Kiểm tra row chưa có embedding:

```sql
SELECT COUNT(*) FROM memory_chunks WHERE embedding IS NULL;
SELECT COUNT(*) FROM skills WHERE embedding IS NULL AND status = 'active';
```

Nếu backfill thất bại (kiểm tra log tìm `memory embeddings backfill failed`), restart GoClaw sau khi sửa provider — backfill sẽ tự động chạy lại.

## Backup và Restore

GoClaw dùng PostgreSQL chuẩn — bất kỳ phương pháp backup chuẩn nào đều hoạt động.

```bash
# Backup
pg_dump "$GOCLAW_POSTGRES_DSN" -Fc -f goclaw_backup.dump

# Restore
pg_restore -d "$GOCLAW_POSTGRES_DSN" --clean goclaw_backup.dump

# Sau restore, chạy lại migration để đảm bảo schema hiện tại
./goclaw migrate up
```

Sau khi restore, xác minh pgvector extension có mặt:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Tiếp theo

- [Các vấn đề thường gặp](/troubleshoot-common)
- [Vấn đề provider](/troubleshoot-providers)
- [Vấn đề channel](/troubleshoot-channels)

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
