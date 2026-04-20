> 翻译自 [English version](/knowledge-vault)

# 知识库 (Knowledge Vault)

> 一个结构化的知识存储，让 agent 能够管理工作区文档，支持双向 wikilink、语义搜索和团队范围访问控制 — 全部构建于现有内存系统之上。

Knowledge Vault 是 **v3 专属**功能。它位于 agent 与 episodic/KG 存储之间，以显式关系为文档级笔记增添能力。

> **Vault 与 Knowledge Graph 的区别** — Vault 存储完整文档（笔记、context 文件、规格说明），支持关键词 + 语义搜索和 wikilink。[Knowledge Graph](knowledge-graph.md) 存储从对话中自动提取的*实体与关系*。两者互为补充：vault 用于精心整理的文档，KG 用于自动提取的事实。VaultSearchService 会同时向两者展开查询。

---

## 架构

| 组件 | 职责 |
|-----------|------|
| **VaultStore** | 文档 CRUD、链接管理、FTS + 向量混合搜索 |
| **VaultService** | 搜索协调器：对 vault、episodic 和 KG 存储展开加权并行查询 |
| **VaultSyncWorker** | 文件系统监控：检测文件变化（创建/写入/删除），同步内容 hash |
| **EnrichWorker** | 处理 vault 文档 upsert 事件，生成摘要、embedding 和语义链接 |
| **VaultRetriever** | 将 vault 搜索接入 agent L0 内存系统 |
| **HTTP Handlers** | REST 端点：list、get、search、links、tree、graph |

### 数据流

```
Agent 写入文档 → Workspace FS
                    ↓
          VaultSyncWorker 检测到变化
                    ↓
       更新 vault_documents（hash、metadata）
                    ↓
       Agent 查询时：vault_search 工具
                    ↓
  VaultSearchService（并行展开）
       ↙            ↓            ↘
  Vault         Episodic     Knowledge Graph
  (权重 0.4)    (0.3)         (0.3)
       ↘            ↓            ↙
    各来源评分归一化并加权
               ↓
        返回最终结果
```

### 范围隔离

文档按**租户**（隔离边界）、**agent**（命名空间）和**文档范围**进行划分：

| 范围 | 描述 |
|-------|-------------|
| `personal` | Agent 专属文档（按 agent 的 context 文件、按用户的工作内容） |
| `team` | 团队工作区文档，供团队成员共享 |
| `shared` | 跨租户共享知识（未来计划） |

### 文档范围与所有权不变量

`scope` 字段具有严格的所有权不变量，由 migration `000055` 在数据库层面强制执行（CHECK 约束 `vault_documents_scope_consistency`）：

| `scope` | `agent_id` | `team_id` | 可见性 |
|---------|------------|-----------|--------|
| `personal` | 已设置 | NULL | 仅所属 agent（租户内） |
| `team` | NULL | 已设置 | 团队成员（租户内） |
| `shared` | NULL | NULL | 租户内所有 agent |
| `custom` | 任意 | 任意 | 通过 `custom_scope` 用户自定义 |

CHECK 约束会拒绝任何违反上述 `scope × agent_id × team_id` 关系的 INSERT 或 UPDATE。`scope='custom'` 是例外 — 它有意不加约束，允许用户定义所有权语义。

#### Agent 读取语义

`vault_search`、`ListDocuments` 和 `CountDocuments` 始终返回：

- 查询 agent 所拥有的文档（`agent_id = <agent>`）
- 加上共享文档（`agent_id IS NULL`）

在团队上下文中（设置了 `TeamID` 的 `RunContext`），结果还包括该团队的团队范围文档（`scope = 'team'` 且 `team_id = <team>`）。无论范围如何，租户隔离（`tenant_id = <tenant>`）始终强制执行。

---

## 数据模型

### vault_documents

文档元数据注册表。内容存储在文件系统上；注册表保存路径、hash、embedding 和链接。

| 字段 | 类型 | 说明 |
|--------|------|-------|
| `id` | UUID | 主键 |
| `tenant_id` | UUID | 多租户隔离 |
| `agent_id` | UUID | 按 agent 命名空间；团队范围或租户共享文件时**可为 NULL**（migration 046） |
| `scope` | TEXT | `personal` \| `team` \| `shared` |
| `path` | TEXT | 工作区相对路径（如 `workspace/notes/foo.md`） |
| `title` | TEXT | 显示名称 |
| `doc_type` | TEXT | `context`、`memory`、`note`、`skill`、`episodic`、`image`、`video`、`audio`、`document` |
| `content_hash` | TEXT | 文件内容 SHA-256（变更检测） |
| `embedding` | vector(1536) | pgvector 语义相似度 |
| `tsv` | tsvector | title + path + summary 的 GIN FTS 索引 |
| `metadata` | JSONB | 可选自定义字段 |

### vault_links

文档间的双向链接（wikilink、显式引用，以及 enrichment pipeline 生成的语义链接）。

| 字段 | 类型 | 说明 |
|--------|------|-------|
| `from_doc_id` | UUID | 源文档 |
| `to_doc_id` | UUID | 目标文档 |
| `link_type` | TEXT | `wikilink`、`reference`、`depends_on`、`extends`、`related`、`supersedes`、`contradicts`、`task_attachment`、`delegation_attachment` |
| `context` | TEXT | ~50 字符的周围文本片段 |
| `metadata` | JSONB | 来自 enrichment pipeline 的元数据（migration 048） |

唯一约束：`(from_doc_id, to_doc_id, link_type)` — 不允许重复链接。

### vault_versions

为 v3.1 准备的版本历史 — v3.0 中表已存在但为空。

---

## Wikilink

Agent 可以用 `[[target]]` 格式创建双向 markdown 链接。

### 语法

```markdown
详见 [[architecture/components]]。
参考 [[SOUL.md|agent persona]]。
链接到 [[../parent-project]]。
```

- `[[path/to/file.md]]` — 基于路径的目标
- `[[name|display text]]` — 显示文本仅作展示用
- 如果缺少扩展名，自动追加 `.md`
- 空目标或纯空格目标将被跳过

### 解析策略

解析 wikilink 目标时：

1. **精确路径匹配** — 按路径查找文档
2. **添加 .md 后缀** — 若目标缺少扩展名则重试
3. **basename 搜索** — 扫描 agent 所有文档，按文件名匹配（不区分大小写）
4. **无法解析** — 静默跳过；backlink 可能不完整

### 链接同步

`SyncDocLinks` 保持 `vault_links` 与文档内容同步：

1. 从内容中提取所有 `[[...]]` 模式
2. 删除该文档所有现有出链（替换策略）
3. 解析每个目标，为已解析的目标创建 `vault_link` 记录

在每次文档 upsert 和 VaultSyncWorker 文件事件时执行。

---

## 搜索

### Vault 搜索（单存储）

在单个 vault 上进行 FTS + 向量混合搜索：

- **FTS**：PostgreSQL `plainto_tsquery()` 作用于 `tsv`（title + path 关键词）
- **向量**：pgvector 余弦相似度作用于 embedding（语义）
- **评分**：每种方法的分数归一化到 0–1，然后按查询时权重合并

### 统一搜索（跨存储）

`VaultSearchService` 并行展开到所有知识来源：

| 来源 | 权重 | 搜索内容 |
|--------|--------|-----------------|
| Vault | 0.4 | 文档 title、path、embedding |
| Episodic | 0.3 | 会话摘要 |
| Knowledge Graph | 0.3 | 实体名称和描述 |

每个来源的分数独立归一化（最高分 = 1.0），加权后合并，按 ID 去重，最终按得分降序排列。

### 搜索参数

| 参数 | 类型 | 默认值 | 说明 |
|-------|------|---------|-------|
| `Query` | string | — | 必填：自然语言 |
| `AgentID` | string | — | 限定到 agent |
| `TenantID` | string | — | 限定到租户 |
| `Scope` | string | all | `personal`、`team`、`shared` |
| `DocTypes` | []string | all | `context`、`memory`、`note`、`skill`、`episodic` |
| `MaxResults` | int | 10 | 最终结果集大小 |
| `MinScore` | float64 | 0.0 | 最低分过滤 |

---

## 文件系统同步

`VaultSyncWorker` 使用 `fsnotify` 监控工作区目录：

1. **防抖**：500ms — 多次快速变化合并为一批
2. 对每个变更文件：
   - 计算 SHA-256 hash
   - 与 `vault_documents.content_hash` 对比
   - 若不同：更新数据库中的 hash
   - 若文件已删除：标记 `metadata["deleted"] = true`

**注意：** 同步是单向的 — 只监控已注册的文档。新文件必须先由 agent 写入注册。vault 不会反向写回文件系统。

---

## Enrichment Pipeline

每次文档 upsert 后，**EnrichWorker** 异步处理该事件，为 vault 文档补充摘要、embedding 和语义链接。

### EnrichWorker 的工作内容

1. 为文档内容生成文本摘要
2. 计算向量 embedding 以支持语义搜索
3. 对 vault 中其他文档的语义关系进行分类，并创建 `vault_link` 记录

### 语义链接类型

分类器生成六种关系类型之一的链接：

| 类型 | 含义 |
|------|------|
| `reference` | 文档引用另一文档作为来源 |
| `depends_on` | 文档依赖另一文档才有意义 |
| `extends` | 文档在另一文档基础上补充或扩展 |
| `related` | 一般主题相关性 |
| `supersedes` | 文档替代或使另一文档过时 |
| `contradicts` | 文档与另一文档存在冲突 |

### 特殊的 task/delegation 链接类型

另有两种链接类型由 task/delegation 系统创建，而非分类器：

- `task_attachment` — 将 vault 文档链接到其所附加的团队任务
- `delegation_attachment` — 将 vault 文档链接到其所附加的委托

这些类型不受 enrichment 清理或重扫描影响。

### Enrichment 进度

实时 enrichment 进度通过 WebSocket 事件广播。worker 运行时，UI 显示每个文档的状态。

### 停止与重扫描控制

用户可通过 UI（或 REST API）：
- **停止 enrichment** — 暂停当前租户的 EnrichWorker
- **触发重扫描** — 将所有 vault 文档重新加入队列进行 enrichment（适用于模型或配置变更后）

---

## 媒体文档支持

除文本文档外，vault 还接受二进制和媒体文件。支持的文件类型由扩展名白名单控制。

### 媒体文件的 doc_type 值

| `doc_type` | 适用于 |
|-----------|--------|
| `image` | PNG、JPG、GIF、WEBP、SVG 等 |
| `video` | MP4、MOV、AVI 等 |
| `audio` | MP3、WAV、OGG 等 |
| `document` | PDF、DOCX、XLSX 等 |

### 媒体的合成摘要

由于媒体文件无法作为文本读取，vault 使用 `SynthesizeMediaSummary()` 从文件名和父文件夹上下文生成确定性的语义摘要，无需调用 LLM。摘要存储在 `vault_documents.summary` 中并纳入 FTS 索引，允许通过文件名和位置的关键词发现媒体文件。

---

## Agent 工具

### vault_search

主要发现工具。在 vault、episodic memory 和 Knowledge Graph 上进行统一排名搜索。

```json
{
  "query": "authentication flow",
  "scope": "team",
  "types": "context,note",
  "maxResults": 10
}
```

每条结果携带**特定来源的 ID 字段**，指示应使用哪个后续工具：

| 来源 | ID 字段 | 后续工具 |
|------|---------|---------|
| `vault` | `doc_id` | `vault_read(doc_id=...)` |
| `kg` | `entity_id` | `knowledge_graph_search(entity_id=...)` |
| `episodic` | `episodic_id` | `memory_expand(id=episodic_id)` |

> **ID 命名空间保护：** 若误将 `entity_id` 或 `episodic_id` 传入 `vault_read`，工具会返回描述性错误信息，告知应使用的正确工具 — 而非泛泛的"document not found"。请始终将 vault 结果中的 `doc_id` 与 `vault_read` 配合使用。

> **关于链接的说明：** 显式文档链接现在由 enrichment pipeline 自动处理。`vault_link` agent 工具已移除。链接通过文档内容中的 wikilink 语法（`[[target]]`）创建，或由 EnrichWorker 语义生成。可通过 `GET /v1/agents/{agentID}/vault/documents/{docID}/links` 查看链接。

---

## REST API

所有端点均需 `Authorization: Bearer <token>`。

### 按 Agent 端点

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/vault/documents` | 列出文档（scope、doc_type、limit、offset） |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}` | 获取单个文档 |
| `POST` | `/v1/agents/{agentID}/vault/search` | 统一搜索 |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}/links` | 出链 + 反链 |

### 跨 Agent 端点

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| `GET` | `/v1/vault/documents` | 列出租户下所有 agent 的文档（可按 `agent_id` 过滤） |
| `GET` | `/v1/vault/tree` | 查看 vault 结构树状视图 |
| `GET` | `/v1/vault/graph` | 跨租户图谱可视化（节点上限 2000，FA2 布局） |

### Enrichment 控制端点

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| `POST` | `/v1/vault/enrichment/stop` | 停止 enrichment worker |

---

## 近期迁移

| 迁移 | 名称 | 变更内容 |
|------|------|---------|
| 046 | `vault_nullable_agent_id` | 使 `vault_documents.agent_id` 可为 NULL，支持团队范围和租户共享的 vault 文件 |
| 048 | `vault_media_linking` | 在 `team_task_attachments` 上添加生成列 `base_name`；在 `vault_links` 上添加 `metadata JSONB`；修复 CASCADE FK 约束 |
| 049 | `vault_path_prefix_index` | 添加并发索引 `idx_vault_docs_path_prefix`（`text_pattern_ops`），用于快速前缀查询 |

---

## 前提条件

- **PostgreSQL** 需安装 `pgvector` 扩展（用于 embedding）
- **迁移** `000038_vault_tables` 必须已成功执行
- **VaultStore** 在 gateway 启动时初始化
- **VaultSyncWorker** 已启动以同步文件系统
- **EnrichWorker** 已启动以自动 enrichment（摘要、embedding、语义链接）

无需 feature flag。只要迁移已运行且 VaultStore 已初始化，vault 即处于激活状态。

---

## 限制

- Vault 文档**不会自动注入** agent system prompt — 必须通过 `vault_search` 检索
- FTS 仅索引 title + path；内容发现需要向量 embedding
- 同步**单向**（文件系统 → vault；vault 不反向写回）
- **无冲突解决** — 并发编辑采用后写覆盖策略
- **版本历史**（`vault_versions` 表）为 v3.1 准备；v3.0 中为空

---

## 延伸阅读

- [知识图谱](knowledge-graph.md) — 从对话中自动提取的实体与关系图谱
- [Memory 系统](../../core-concepts/memory-system.md) — 向量化长期记忆
- [Context 文件](../../agents/context-files.md) — 注入 agent context 的静态文档

<!-- goclaw-source: 1b862707 | 更新: 2026-04-20 -->
