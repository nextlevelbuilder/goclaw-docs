# Knowledge Graph

> Agents automatically extract entities and relationships from conversations, building a searchable graph of people, projects, and concepts.

## Overview

GoClaw's knowledge graph system has two parts:

1. **Extraction** — After conversations, an LLM extracts entities (people, projects, concepts) and relationships from the text
2. **Search** — Agents use the `knowledge_graph_search` tool to query the graph, traverse relationships, and discover connections

The graph is scoped per agent and per user — each agent builds its own graph from its conversations.

---

## How Extraction Works

After a conversation, GoClaw sends the text to an LLM with a structured extraction prompt. For long texts (over 12,000 characters), GoClaw splits the input into chunks, extracts from each, and merges results by deduplicating entities and relations. The LLM returns:

- **Entities** — People, projects, tasks, events, concepts, locations, organizations
- **Relations** — Typed connections between entities (e.g., `works_on`, `reports_to`)

Each entity and relation has a **confidence score** (0.0–1.0). Only items at or above the threshold (default **0.75**) are stored.

**Constraints:**
- 3–15 entities per extraction, depending on text density
- Entity IDs are lowercase with hyphens (e.g., `john-doe`, `project-alpha`)
- Descriptions are one sentence maximum
- Temperature 0.0 for deterministic results

### Relation types

The extractor uses a fixed set of relation types:

| Category | Types |
|----------|-------|
| People ↔ Work | `works_on`, `manages`, `reports_to`, `collaborates_with` |
| Structure | `belongs_to`, `part_of`, `depends_on`, `blocks` |
| Actions | `created`, `completed`, `assigned_to`, `scheduled_for` |
| Location | `located_in`, `based_at` |
| Technology | `uses`, `implements`, `integrates_with` |
| Fallback | `related_to` |

---

## Full-Text Search

Entity search uses PostgreSQL `tsvector` full-text search (migration `000031`). A stored `tsv` column is automatically generated from each entity's name and description:

```sql
tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || COALESCE(description, ''))) STORED
```

A GIN index on `tsv` makes text queries fast even with large graphs. Queries like `"john"` or `"project alpha"` match partial words across name and description fields.

---

## Entity Deduplication

After extraction, GoClaw automatically checks new entities for duplicates using two signals:

1. **Embedding similarity** — HNSW KNN query finds the nearest existing entities of the same type
2. **Name similarity** — Jaro-Winkler string similarity (case-insensitive)

### Thresholds

| Scenario | Condition | Action |
|----------|-----------|--------|
| Near-certain duplicate | embedding similarity ≥ 0.98 **and** name similarity ≥ 0.85 | Auto-merged immediately |
| Possible duplicate | embedding similarity ≥ 0.90 | Flagged in `kg_dedup_candidates` for review |

**Auto-merge** keeps the entity with the higher confidence score, re-points all relations from the merged entity to the surviving one, and deletes the source entity. An advisory lock prevents concurrent merges on the same agent.

**Flagged candidates** are stored in `kg_dedup_candidates` with status `pending`. You can list, dismiss, or manually merge them via the API.

### Bulk duplicate scan

You can trigger a full scan across all entities:

```bash
POST /v1/agents/{agentID}/kg/scan-duplicates
```

This runs a self-join similarity scan and adds candidates to the review queue. Useful after bulk imports or initial onboarding.

---

## Searching the Graph

**Tool:** `knowledge_graph_search`

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Entity name, keyword, or `*` to list all (required) |
| `entity_type` | string | Filter: `person`, `project`, `task`, `event`, `concept`, `location`, `organization` |
| `entity_id` | string | Start point for relationship traversal |
| `max_depth` | int | Traversal depth (default 2, max 3) |

### Search modes

**Text search** — Find entities by name or keyword:
```
query: "John"
```

**List all** — Show all entities (up to 30):
```
query: "*"
```

**Traverse relationships** — Start from an entity and follow outgoing connections:
```
query: "*"
entity_id: "project-alpha"
max_depth: 2
```

Results include entity names, types, descriptions, depth, traversal path, and the relation type used to reach each entity.

---

## Entity Types

| Type | Examples |
|------|----------|
| `person` | Team members, contacts, stakeholders |
| `project` | Products, initiatives, codebases |
| `task` | Action items, tickets, assignments |
| `event` | Meetings, deadlines, milestones |
| `concept` | Technologies, methodologies, ideas |
| `location` | Offices, cities, regions |
| `organization` | Companies, teams, departments |

---

## Example

After several conversations about a project, an agent's knowledge graph might contain:

```
Entities:
  [person] Alice — Backend lead
  [person] Bob — Frontend developer
  [project] Project Alpha — E-commerce platform
  [concept] GraphQL — API layer technology

Relations:
  Alice --manages--> Project Alpha
  Bob --works_on--> Project Alpha
  Project Alpha --uses--> GraphQL
```

An agent can then answer questions like *"Who is working on Project Alpha?"* by traversing the graph.

---

## What's Next

- [Memory System](/memory-system) — Vector-based long-term memory
- [Sessions & History](/sessions-and-history) — Conversation storage

<!-- goclaw-source: e7afa832 | updated: 2026-03-30 -->
