> 翻译自 [English version](#deploy-database)

# 数据库设置

> GoClaw 需要 PostgreSQL 15+ 并安装 `pgvector` 扩展，用于多租户存储、语义记忆搜索和用量统计。

## 概览

所有持久化状态存储在 PostgreSQL 中：agent、会话、记忆、链路追踪、skill、定时任务和 channel 配置。Schema 通过 `migrations/` 目录中的编号迁移文件管理。需要两个扩展：`pgcrypto`（UUID 生成）和 `vector`（通过 pgvector 进行语义记忆搜索）。

---

## Docker 快速启动

最快捷的方式是使用提供的 compose overlay：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d
```

此命令启动带健康检查的 `pgvector/pgvector:pg18` 并自动配置 `GOCLAW_POSTGRES_DSN`。跳至[执行迁移](#run-migrations)。

---

## 手动设置

### 1. 安装 PostgreSQL 15+ 和 pgvector

在 Ubuntu/Debian 上：

```bash
# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 安装 pgvector（根据 PG 版本选择）
sudo apt install postgresql-16-pgvector
```

使用官方 pgvector Docker 镜像（推荐）：

```bash
docker run -d \
  --name goclaw-postgres \
  -e POSTGRES_USER=goclaw \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=goclaw \
  -p 5432:5432 \
  pgvector/pgvector:pg18
```

### 2. 创建数据库并启用扩展

```sql
-- 以超级用户连接
CREATE DATABASE goclaw;
\c goclaw

-- 必需扩展（migration 000001 会自动启用这两个扩展）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

> `vector` 扩展提供用于记忆相似性搜索的 HNSW 向量索引。`pgcrypto` 通过 `gen_random_bytes()` 提供 UUID v7 生成。

### 3. 设置连接字符串

添加到 `.env` 文件或 shell 环境中：

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:your-secure-password@localhost:5432/goclaw?sslmode=disable
```

生产环境使用 TLS：

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@db.example.com:5432/goclaw?sslmode=require
```

DSN 是标准的 `lib/pq` / `pgx` 连接字符串，支持所有标准 PostgreSQL 参数（`connect_timeout`、`pool_max_conns` 等）。

---

## 执行迁移

GoClaw 使用 [golang-migrate](https://github.com/golang-migrate/migrate) 和编号 SQL 文件管理迁移。

```bash
# 应用所有待执行的迁移
./goclaw migrate up

# 查看当前迁移版本
./goclaw migrate status

# 回滚一步
./goclaw migrate down

# 回滚到指定版本
./goclaw migrate down 3
```

使用 Docker（通过 upgrade overlay）：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade
```

### 迁移文件

| 文件 | 创建内容 |
|------|----------------|
| `000001_init_schema` | 所有核心表：agents、sessions、memory、traces、spans、skills、cron、pairing、MCP、custom tools、channels |
| `000002_agent_links` | `agent_links` 表（agent 间委托） |
| `000003_agent_teams` | 多 agent 团队的 Team 和 task 表 |
| `000004_teams_v2` | 团队元数据和任务状态改进 |
| `000005_phase4` | 额外的 phase-4 schema 变更 |
| `000006_builtin_tools` | 内置工具配置存储 |
| `000007_team_metadata` | 团队元数据 JSONB 字段 |
| `000008_team_tasks_user_scope` | 按用户划分的任务范围 |
| `000009_add_quota_index` | 配额检查器性能的局部索引 |
| `000010_agents_md_v2` | Agent 元数据 v2 schema |
| `000011_session_profile_metadata` | sessions、profiles、pairing 上的 JSONB `metadata` 列 |
| `000012_channel_pending_messages` | `channel_pending_messages` 表（群聊历史缓冲） |
| `000013_knowledge_graph` | `kg_entities`、`kg_relations` 表（语义实体存储） |
| `000014_channel_contacts` | `channel_contacts` 表——来自 channel 的全局联系人目录 |
| `000015_agent_budget` | agent 的 `budget_monthly_cents`；`activity_logs` 审计记录 |
| `000016_usage_snapshots` | `usage_snapshots` 表——每小时 token/费用聚合 |
| `000017_system_skills` | skill 的 `is_system`、`deps`、`enabled` 列 |
| `000018_team_tasks_workspace_followup` | 团队工作区文件、文件版本、评论；任务事件和评论 |
| `000019_team_id_columns` | memory、KG、traces、spans、cron、sessions 上的 `team_id` 外键（9 张表） |
| `000020_secure_cli_and_api_keys` | 凭证执行的 `secure_cli_binaries`；细粒度鉴权的 `api_keys` |
| `000021_paired_devices_expiry` | 配对设备的 `expires_at`；团队任务、消息、评论的 `confidence_score` |

> **数据钩子：** GoClaw 在独立的 `data_migrations` 表中追踪迁移后的 Go 变换。运行 `./goclaw upgrade --status` 可查看 SQL 迁移版本和待执行的数据钩子。

部署后运行 `./goclaw migrate status` 确认当前 schema 版本为 21。

---

## 主要数据表

| 表 | 用途 |
|-------|---------|
| `agents` | Agent 定义、模型配置、工具配置 |
| `sessions` | 对话历史、每个会话的 token 计数 |
| `traces` / `spans` | LLM 调用追踪、token 用量、费用 |
| `memory_chunks` | 语义记忆（pgvector HNSW 索引，`vector(1536)`） |
| `memory_documents` | 记忆文档元数据 |
| `embedding_cache` | 按内容哈希 + 模型缓存的 embedding |
| `llm_providers` | LLM provider 配置（API key 使用 AES-256-GCM 加密） |
| `mcp_servers` | 外部 MCP 服务器连接 |
| `custom_tools` | 动态 shell 工具 |
| `cron_jobs` / `cron_run_logs` | 定时任务和运行历史 |
| `skills` | 支持 BM25 + 向量搜索的 skill 文件 |
| `channel_instances` | 消息 channel 配置（Telegram、Discord 等） |
| `activity_logs` | 审计记录——管理员操作、配置变更、安全事件 |
| `usage_snapshots` | 每小时按 agent/用户聚合的 token 计数和费用 |
| `kg_entities` / `kg_relations` | 知识图谱——语义实体和关系 |
| `channel_contacts` | 从所有 channel 同步的统一联系人目录 |
| `channel_pending_messages` | 批量处理的待发群消息缓冲 |
| `api_keys` | 使用 SHA-256 哈希查找和吊销的作用域 API key |

---

## 备份与恢复

### 备份

```bash
# 完整数据库转储（推荐——包含 schema + 数据）
pg_dump -h localhost -U goclaw -d goclaw -Fc -f goclaw-backup.dump

# 仅 schema（用于检查结构）
pg_dump -h localhost -U goclaw -d goclaw --schema-only -f goclaw-schema.sql

# 排除大表（例如跳过 spans 以减小备份体积）
pg_dump -h localhost -U goclaw -d goclaw -Fc \
  --exclude-table=spans \
  -f goclaw-backup-no-spans.dump
```

### 恢复

```bash
# 恢复到全新数据库
createdb -h localhost -U postgres goclaw_restore
pg_restore -h localhost -U goclaw -d goclaw_restore goclaw-backup.dump
```

### Docker 卷备份

```bash
# 备份 postgres-data 卷
docker run --rm \
  -v goclaw_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 性能优化

### 连接池

GoClaw 使用带 `database/sql` 的 `pgx/v5`。连接池硬编码为**最多 25 个连接 / 10 个空闲连接**。对于高并发部署，请确保 PostgreSQL 的 `max_connections` 能够满足需求。也可在 DSN 中设置池参数：

```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:password@localhost:5432/goclaw?sslmode=disable&pool_max_conns=20
```

或在 PostgreSQL 前端使用 PgBouncer 进行大规模连接池管理。

### 关键索引

Schema 开箱即带有以下性能关键索引：

| 索引 | 表 | 用途 |
|-------|-------|---------|
| `idx_traces_quota` | `traces` | 按用户的配额窗口查询（局部，仅顶层） |
| `idx_mem_vec` | `memory_chunks` | HNSW 余弦相似性搜索（`vector_cosine_ops`） |
| `idx_mem_tsv` | `memory_chunks` | 通过 `tsvector` GIN 索引进行全文 BM25 搜索 |
| `idx_traces_user_time` | `traces` | 按用户 + 时间的用量查询 |
| `idx_sessions_updated` | `sessions` | 列出最近的会话 |

`idx_traces_quota` 索引在 migration `000009` 中以 `CONCURRENTLY` 方式添加——可在线上系统不锁表的情况下创建。

### 磁盘增长

`spans` 表在高强度使用下增长迅速（每次 LLM 调用产生一行）。建议定期清理：

```sql
-- 删除 30 天前的 spans
DELETE FROM spans WHERE created_at < NOW() - INTERVAL '30 days';

-- 删除 90 天前的 traces（级联删除 spans）
DELETE FROM traces WHERE created_at < NOW() - INTERVAL '90 days';

VACUUM ANALYZE traces, spans;
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|---------|-------|-----|
| `extension "vector" does not exist` | pgvector 未安装 | 安装 `postgresql-XX-pgvector` 或使用 `pgvector/pgvector` Docker 镜像 |
| 首次运行 `migrate up` 失败 | 扩展未启用 | 确保 DB 用户具有 `SUPERUSER` 或 `CREATE EXTENSION` 权限 |
| 连接被拒绝 | DSN 中的主机/端口错误 | 检查 `GOCLAW_POSTGRES_DSN`；验证 PostgreSQL 是否在运行 |
| 记忆搜索无结果 | Embedding 模型维度不匹配 | Schema 使用 `vector(1536)`——确保 embedding 模型输出 1536 维 |
| 磁盘占用过高 | `spans` 表无限增长 | 定期在 `spans` 和 `traces` 上执行 `DELETE` + `VACUUM` |

---

## 下一步

- [Docker Compose](#deploy-docker-compose) — 使用 postgres overlay 的 compose 部署
- [安全加固](#deploy-security) — 数据库中密钥的 AES-256-GCM 加密
- [可观测性](#deploy-observability) — 查询 LLM 费用监控的 traces 和 spans

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
