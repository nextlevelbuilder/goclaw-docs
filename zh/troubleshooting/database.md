> 翻译自 [English version](#troubleshoot-database)

# 数据库问题

> PostgreSQL 迁移、pgvector、连接池和慢查询的故障排除。

## 概览

GoClaw 需要 PostgreSQL 15+，并安装 `pgvector` 和 `pgcrypto` 扩展。数据库连接仅通过 `GOCLAW_POSTGRES_DSN` 配置（从不存储在 `config.json` 中）。迁移由 `golang-migrate` 管理，通过 `./goclaw migrate up` 运行。

## 连接失败

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `GOCLAW_POSTGRES_DSN environment variable is not set` | DSN 未导出 | `export GOCLAW_POSTGRES_DSN=postgres://user:pass@host:5432/goclaw` |
| `open postgres: ...` | DSN 格式无效 | 验证 DSN；用 `psql "$GOCLAW_POSTGRES_DSN"` 手动测试 |
| `ping postgres: dial error` | Postgres 未运行或主机/端口错误 | 启动 Postgres；检查主机、端口、防火墙 |
| `ping postgres: password authentication failed` | 凭证错误 | 验证 DSN 中的用户名和密码 |
| `ping postgres: database "goclaw" does not exist` | 数据库未创建 | `createdb goclaw` 或 `psql -c "CREATE DATABASE goclaw;"` |

GoClaw 使用固定连接池：**最大 25 个打开连接**，**最大 10 个空闲连接**。如果运行多个 GoClaw 实例，请调整 `postgresql.conf` 中的 `max_connections`。

**连接池耗尽症状：** 如果所有 25 个连接都在使用中，新请求会排队直到连接释放。症状包括突然的查询延迟峰值、超时错误和类似 `pq: sorry, too many clients already` 的日志行。诊断方法：

```sql
-- 检查到 goclaw 数据库的活跃连接
SELECT count(*) FROM pg_stat_activity WHERE datname = 'goclaw';
```

如果运行多个 GoClaw 实例，确保 `postgresql.conf` 中的 `max_connections` 至少为 `25 × 实例数 + 5`。

## 迁移失败

手动运行迁移：

```bash
./goclaw migrate up
```

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `create migrator: ...` | 迁移目录未找到 | 从包含 `migrations/` 的目录运行，或设置 `GOCLAW_MIGRATIONS_DIR` |
| `migrate up: ...` | 迁移中的 SQL 错误 | 检查 Postgres 日志；修复底层 SQL 问题 |
| 版本输出中 `dirty: true` | 之前的迁移中途失败 | 手动修复失败的迁移，然后运行 `./goclaw migrate force <version>` |
| `no change` | 所有迁移已应用 | 正常——无需操作 |
| 数据钩子失败（警告）| 迁移后数据钩子错误 | 非致命警告；检查日志详情并在需要时重新运行 |

**从脏状态恢复：**

```bash
# 检查当前版本和脏标志
./goclaw migrate version

# 强制将版本设置为上一个已知正确的迁移（不应用 SQL）
./goclaw migrate force <version_number>

# 然后重新应用迁移
./goclaw migrate up
```

## pgvector 和 pgcrypto 扩展

GoClaw 需要**两个**扩展 `pgvector` 和 `pgcrypto`。第一个迁移（`000001_init_schema.up.sql`）创建这两个扩展：

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

`pgcrypto` 用于 UUID 生成（`gen_random_uuid()`）。在大多数平台上，它与 PostgreSQL 的 `postgresql-contrib` 包捆绑。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `extension "pgcrypto" does not exist` | `postgresql-contrib` 未安装 | `apt install postgresql-contrib`（Debian）或 `brew install postgresql` 已包含 |
| 迁移在 `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` 处失败 | 权限不足 | 以超级用户连接或授予 `CREATE EXTENSION` 权限 |

## pgvector 扩展

GoClaw 使用 `pgvector` 进行语义记忆搜索（`memory_chunks`、`skills` 上的 1536 维 HNSW 索引）。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `extension "vector" does not exist` | pgvector 未安装 | 安装 pgvector：`apt install postgresql-15-pgvector`（Debian）或从源码构建 |
| 迁移在 `CREATE EXTENSION IF NOT EXISTS "vector"` 处失败 | 权限不足 | 以超级用户连接或授予 `CREATE EXTENSION` 权限 |
| 向量搜索无结果 | Embedding 未生成 | 检查是否注册了支持 embedding 的 provider（Anthropic、OpenAI），以及 embedding 回填是否已运行 |
| HNSW 索引构建缓慢 | `memory_chunks` 表较大 | 首次索引创建的正常现象；迁移期间运行一次 |

**在常见平台上安装 pgvector：**

```bash
# Debian/Ubuntu
apt install postgresql-15-pgvector

# macOS with Homebrew
brew install pgvector

# Docker（使用 pgvector 镜像）
docker pull pgvector/pgvector:pg15
```

## 慢查询

GoClaw schema 创建的关键索引：

- Sessions：`idx_sessions_updated`（updated_at DESC）、`idx_sessions_agent`、`idx_sessions_user`
- Memory：`idx_mem_vec`（HNSW 向量余弦）、`idx_mem_tsv`（GIN 全文）、`idx_mem_agent_user`
- Traces：`idx_traces_agent_time`、`idx_traces_status`（仅错误）
- Skills：`idx_skills_embedding`（HNSW）、`idx_skills_visibility`

如果尽管有索引查询仍然缓慢：

```sql
-- 检查缺失的 ANALYZE（过时的统计信息）
ANALYZE memory_chunks;
ANALYZE sessions;

-- 识别慢查询
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

对于向量搜索，确保 `work_mem` 足够大以支持 HNSW 探测：

```sql
-- 会话级别（或添加到 postgresql.conf）
SET work_mem = '256MB';
```

## Embedding 回填

GoClaw 在启动时自动回填 embedding。当配置了支持 embedding 的 provider（Anthropic 或 OpenAI）时，GoClaw 启动后台 goroutine，对 `embedding IS NULL` 的行调用 `BackfillEmbeddings`（memory chunks）和 `BackfillSkillEmbeddings`（skills）。每次启动运行一次。

关注以下启动日志行：

```
INFO memory embeddings enabled provider=anthropic model=text-embedding-3-small
INFO memory embeddings backfill complete chunks_updated=42
INFO skill embeddings backfill complete updated=5
```

如果日志显示 `memory embeddings disabled (no API key), chunks stored without vectors`，请先配置 embedding provider。

如果在配置 embedding provider 之前插入了记忆文档或技能，其 `embedding` 列将为 NULL，向量搜索将跳过它们。

检查未 embedding 的行：

```sql
SELECT COUNT(*) FROM memory_chunks WHERE embedding IS NULL;
SELECT COUNT(*) FROM skills WHERE embedding IS NULL AND status = 'active';
```

如果回填失败（检查日志中的 `memory embeddings backfill failed`），修复 provider 后重启 GoClaw——回填将自动再次运行。

## 备份和恢复

GoClaw 使用标准 PostgreSQL——任何标准备份方法都适用。

```bash
# 备份
pg_dump "$GOCLAW_POSTGRES_DSN" -Fc -f goclaw_backup.dump

# 恢复
pg_restore -d "$GOCLAW_POSTGRES_DSN" --clean goclaw_backup.dump

# 恢复后，重新运行迁移以确保 schema 是最新的
./goclaw migrate up
```

恢复后，验证 pgvector 扩展是否存在：

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## 下一步

- [常见问题](#troubleshoot-common)
- [Provider 问题](#troubleshoot-providers)
- [Channel 问题](#troubleshoot-channels)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
