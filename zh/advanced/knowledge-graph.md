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

### 批量重复扫描

可以触发对所有实体的全量扫描：

```bash
POST /v1/agents/{agentID}/kg/scan-duplicates
```

此操作运行自连接相似度扫描，并将候选项加入审核队列。适用于批量导入或初始化后使用。

---

## 搜索图谱

**工具：** `knowledge_graph_search`

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `query` | string | 实体名称、关键词或 `*` 列出所有（必填） |
| `entity_type` | string | 过滤：`person`、`project`、`task`、`event`、`concept`、`location`、`organization` |
| `entity_id` | string | 关系遍历的起始点 |
| `max_depth` | int | 遍历深度（默认 2，最大 3） |

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

<!-- goclaw-source: e7afa832 | 更新: 2026-03-30 -->
