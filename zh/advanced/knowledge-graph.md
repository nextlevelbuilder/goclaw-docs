> 翻译自 [English version](/knowledge-graph)

# 知识图谱

> Agent 自动从对话中提取实体和关系，构建一个可搜索的人物、项目和概念图谱。

## 概述

GoClaw 的知识图谱系统分为两部分：

1. **提取** — 对话结束后，LLM 从文本中提取实体（人物、项目、概念）和关系
2. **搜索** — Agent 使用 `knowledge_graph_search` 工具查询图谱、遍历关系、发现连接

图谱按 agent 和用户划分作用域 — 每个 agent 从自己的对话中构建独立图谱。

---

## 提取原理

对话结束后，GoClaw 将文本连同结构化提取提示词发送给 LLM。对于长文本（超过 12,000 个字符），GoClaw 将输入拆分为多个块，分别提取，然后通过去重实体和关系来合并结果。LLM 返回：

- **实体** — 人物、项目、任务、事件、概念、地点、组织
- **关系** — 实体之间的有类型连接（如 `works_on`、`reports_to`）

每个实体和关系都有一个**置信度分数**（0.0–1.0）。只有达到或超过阈值（默认 **0.75**）的项目才会被存储。

**约束：**
- 每次提取 3–15 个实体，具体取决于文本密度
- 实体 ID 为小写加连字符格式（如 `john-doe`、`project-alpha`）
- 描述最多一句话
- 温度为 0.0 以确保结果确定性

### Extract API

通过 REST API 手动触发提取：

```bash
POST /v1/agents/{agentID}/kg/extract
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "要提取的对话文本...",
  "user_id": "user-123",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "min_confidence": 0.75
}
```

响应：
```json
{
  "entities": 5,
  "relations": 3,
  "dedup_merged": 1,
  "dedup_flagged": 0
}
```

提取后自动对新增实体运行去重 — 高相似度项立即合并，中等相似度项标记待审核。

### 关系类型

提取器使用固定的关系类型集合：

| 类别 | 类型 |
|----------|-------|
| 人物 ↔ 工作 | `works_on`、`manages`、`reports_to`、`collaborates_with` |
| 结构 | `belongs_to`、`part_of`、`depends_on`、`blocks` |
| 行为 | `created`、`completed`、`assigned_to`、`scheduled_for` |
| 地点 | `located_in`、`based_at` |
| 技术 | `uses`、`implements`、`integrates_with` |
| 兜底 | `related_to` |

---

## 全文搜索

实体搜索使用 PostgreSQL `tsvector` 全文搜索（迁移 `000031`）。每个实体的名称和描述会自动生成存储列 `tsv`：

```sql
tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || COALESCE(description, ''))) STORED
```

`tsv` 上的 GIN 索引使得即使在大型图谱中文本查询也很快。`"john"` 或 `"project alpha"` 等查询可以跨名称和描述字段进行部分匹配。

---

## 实体去重

提取后，GoClaw 自动检查新实体是否与现有实体重复，使用两个信号：

1. **嵌入相似度** — HNSW KNN 查询找到同类型最近的现有实体
2. **名称相似度** — Jaro-Winkler 字符串相似度（不区分大小写）

### 阈值

| 场景 | 条件 | 操作 |
|------|------|------|
| 几乎确定重复 | embedding 相似度 ≥ 0.98 **且** 名称相似度 ≥ 0.85 | 立即自动合并 |
| 可能重复 | embedding 相似度 ≥ 0.90 | 标记到 `kg_dedup_candidates` 等待人工审核 |

**自动合并**保留置信度更高的实体，将所有关系从被合并实体重新指向保留实体，然后删除源实体。咨询锁防止同一 agent 的并发合并。

**标记候选项**以 `pending` 状态存储在 `kg_dedup_candidates` 中，可通过 API 列出、忽略或手动合并。

### 去重管理流程

**1. 扫描重复项** — 对所有实体运行全量扫描：

```bash
POST /v1/agents/{agentID}/kg/dedup/scan
Content-Type: application/json

{"threshold": 0.90, "limit": 100}
```

适用于批量导入或初始化后使用。结果加入审核队列。

**2. 审核候选项：**

```bash
GET /v1/agents/{agentID}/kg/dedup?user_id=xxx
```

返回 `DedupCandidate[]`，包含字段：`entity_a`、`entity_b`、`similarity`、`status`。

**3. 合并：**

```bash
POST /v1/agents/{agentID}/kg/merge
Content-Type: application/json

{"target_id": "john-doe-uuid", "source_id": "j-doe-uuid"}
```

将 `source_id` 的所有关系重新指向 `target_id`，然后删除源实体。

**4. 忽略：**

```bash
POST /v1/agents/{agentID}/kg/dedup/dismiss
Content-Type: application/json

{"candidate_id": "candidate-uuid"}
```

标记为非重复 — 不会出现在后续审核队列中。

---

## 搜索图谱

**工具：** `knowledge_graph_search`

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `query` | string | 实体名称、关键词或 `*` 列出所有（必填） |
| `entity_type` | string | 过滤：`person`、`project`、`task`、`event`、`concept`、`location`、`organization` |
| `entity_id` | string | 关系遍历的起始点 |
| `max_depth` | int | 遍历深度（默认 2，最大 3） |

### 三层搜索回退

工具使用三层回退策略确保始终返回结果：

1. **遍历**（提供 `entity_id` 时）— BFS 出向遍历至 `max_depth`，返回最多 20 条结果，包含路径和关系类型
2. **直接连接**（遍历无结果时回退）— 双向 1-hop 关系，最多 10 条
3. **文本搜索**（无连接时回退）— 全文搜索实体名称/描述，返回最多 10 条结果及其关系（每实体 5 条）

三层均无结果时，返回前 10 个现有实体作为提示，帮助模型了解图谱中有哪些数据。

### 搜索模式

**文本搜索** — 按名称或关键词查找实体：
```
query: "John"
```

**列出所有** — 显示所有实体（最多 30 个）：
```
query: "*"
```

**遍历关系** — 从某个实体出发，跟随出向连接：
```
query: "*"
entity_id: "project-alpha"
max_depth: 2
```

结果包含实体名称、类型、描述、深度、遍历路径以及到达每个实体所用的关系类型。

---

## REST API 参考

所有端点需要认证（`Authorization: Bearer <token>`）。可选 `?user_id=<id>` 参数按用户过滤。

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/kg/entities` | 列出或搜索实体 |
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` | 获取实体及其关系 |
| `POST` | `/v1/agents/{agentID}/kg/entities` | 创建/更新实体 |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` | 删除实体（级联删除关系） |
| `POST` | `/v1/agents/{agentID}/kg/traverse` | 遍历图谱 |
| `POST` | `/v1/agents/{agentID}/kg/extract` | LLM 提取 |
| `GET` | `/v1/agents/{agentID}/kg/stats` | 图谱统计 |
| `GET` | `/v1/agents/{agentID}/kg/graph` | 完整图谱（可视化） |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` | 扫描重复项 |
| `GET` | `/v1/agents/{agentID}/kg/dedup` | 去重候选列表 |
| `POST` | `/v1/agents/{agentID}/kg/merge` | 合并实体 |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` | 忽略候选项 |

---

## 数据模型

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

| 字段 | 描述 |
|-------|-------------|
| `external_id` | 可读的标识符（如 `john-doe`），用于 upsert 去重 |
| `properties` | 提取时的任意键值元数据 |
| `source_id` | 可选的来源会话或文档引用 |
| `confidence` | 提取置信度（0.0–1.0）；合并时保留较高值 |

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

关系是有方向的：`source --relation_type--> target`。删除实体时会级联删除所有相关关系。

---

## 实体类型

| 类型 | 示例 |
|------|----------|
| `person` | 团队成员、联系人、利益相关者 |
| `project` | 产品、计划、代码库 |
| `task` | 行动项、工单、任务分配 |
| `event` | 会议、截止日期、里程碑 |
| `concept` | 技术、方法论、想法 |
| `location` | 办公室、城市、地区 |
| `organization` | 公司、团队、部门 |

---

## 统计与可视化

### 图谱统计

```bash
GET /v1/agents/{agentID}/kg/stats?user_id=xxx
```

```json
{
  "entity_count": 42,
  "relation_count": 87,
  "entity_types": {
    "person": 15,
    "project": 8,
    "concept": 12,
    "task": 7
  }
}
```

### 完整图谱（可视化）

```bash
GET /v1/agents/{agentID}/kg/graph?user_id=xxx&limit=200
```

返回所有实体和关系，适用于图谱 UI 渲染。默认限制 200 个实体；关系上限为实体数的 3 倍。

Web 仪表盘使用 **ReactFlow** 配合 **D3 Force Simulation**（`d3-force`）自动计算节点位置：

- **Force layout** — `forceSimulation` 通过链接距离、电荷斥力（`forceManyBody`）、居中（`forceCenter`）和碰撞避免（`forceCollide`）计算节点位置。力参数根据节点数量自动缩放。
- **按类型设置质量** — 每种实体类型有不同的质量（organization=8、project=6、person=4 等），枢纽实体自然居于中心。
- **度中心性** — 当实体超过显示上限（50）时，图谱保留连接最多的枢纽节点。连接数 ≥4 的节点带有发光高亮。
- **交互选择** — 点击节点高亮其关联边并显示标签，淡化无关边，同时打开实体详情对话框。
- **主题支持** — 双主题调色板（暗色/亮色），每种实体类型有独立配色。切换主题仅更新颜色，不重新计算布局。
- **性能优化** — 节点组件使用 `memo`，布局在 `setTimeout(0)` 中运行避免阻塞，边更新使用 `useTransition` 保证交互流畅。

---

## 共享知识图谱

默认情况下，知识图谱按 agent **和** 用户划分作用域 — 每个用户构建自己的图谱。当 agent 的工作区共享配置启用 `share_knowledge_graph` 时，图谱变为 agent 级别（所有用户共享）：

```yaml
workspace_sharing:
  share_knowledge_graph: true
```

在共享模式下，所有 KG 操作忽略 `user_id` — 所有用户的实体和关系存储在一起并统一查询。适用于团队 agent，所有人需要看到相同的实体图谱。

> **注意：** `share_knowledge_graph` 独立于 `share_memory`。可以共享记忆但不共享图谱，反之亦然。

---

## 写入 Memory 时自动提取

当 agent 写入其 memory 文件（如 `MEMORY.md` 或 `memory/` 目录下的文件）时，GoClaw 自动触发 KG 提取。这通过 `MemoryInterceptor` 实现，它调用配置的 LLM 从新写入的文本中提取实体和关系。

这意味着 agent 在学习过程中持续构建知识图谱 — 正常对话无需手动调用 `/kg/extract`。Extract API 仍可用于批量导入或外部集成。

---

## 置信度清理

批量删除低置信度实体和关系：

```bash
# 内部服务调用 — 删除低于阈值的项目
# 返回已清理的实体和关系数量
PruneByConfidence(agentID, userID, minConfidence)
```

适用于批量导入后清理大量低置信度数据。`confidence < minConfidence` 的项目被删除，关系自动级联清除。

---

## 示例

经过多次关于项目的对话后，agent 的知识图谱可能包含：

```
实体：
  [person] Alice — 后端负责人
  [person] Bob — 前端开发者
  [project] Project Alpha — 电商平台
  [concept] GraphQL — API 层技术

关系：
  Alice --manages--> Project Alpha
  Bob --works_on--> Project Alpha
  Project Alpha --uses--> GraphQL
```

Agent 随后可以回答"谁在负责 Project Alpha？"这类问题，只需遍历图谱即可。

---

## 下一步

- [记忆系统](/memory-system) — 基于向量的长期记忆
- [会话与历史](/sessions-and-history) — 对话存储

<!-- goclaw-source: a47d7f9f | 更新: 2026-03-31 -->
