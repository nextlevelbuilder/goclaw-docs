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

- **Entities** — People, organizations, projects, products, technologies, tasks, events, documents, concepts, locations
- **Relations** — Typed connections between entities (e.g., `works_on`, `reports_to`)

Each entity and relation has a **confidence score** (0.0–1.0). Only items at or above the threshold (default **0.75**) are stored.

**Constraints:**
- 3–15 entities per extraction, depending on text density
- Entity IDs are lowercase with hyphens (e.g., `john-doe`, `project-alpha`)
- Descriptions are one sentence maximum
- Temperature 0.2 for consistent yet slightly flexible results

### Extract API

Trigger extraction manually via the REST API:

```bash
POST /v1/agents/{agentID}/kg/extract
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Conversation text to extract from...",
  "user_id": "user-123",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "min_confidence": 0.75
}
```

Response:
```json
{
  "entities": 5,
  "relations": 3,
  "dedup_merged": 1,
  "dedup_flagged": 0
}
```

After extraction, inline dedup runs automatically on newly upserted entities — near-certain duplicates are merged immediately, possible duplicates are flagged for review.

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

### Dedup Management Workflow

**1. Scan for duplicates** — Run a full scan across all entities:

```bash
POST /v1/agents/{agentID}/kg/dedup/scan
Content-Type: application/json

{"threshold": 0.90, "limit": 100}
```

Useful after bulk imports or initial onboarding. Results are added to the review queue.

**2. Review candidates:**

```bash
GET /v1/agents/{agentID}/kg/dedup?user_id=xxx
```

Returns `DedupCandidate[]` with fields: `entity_a`, `entity_b`, `similarity`, `status`.

**3. Merge:**

```bash
POST /v1/agents/{agentID}/kg/merge
Content-Type: application/json

{"target_id": "john-doe-uuid", "source_id": "j-doe-uuid"}
```

Re-points all relations from `source_id` to `target_id`, then deletes the source entity.

**4. Dismiss:**

```bash
POST /v1/agents/{agentID}/kg/dedup/dismiss
Content-Type: application/json

{"candidate_id": "candidate-uuid"}
```

Marks the pair as not-duplicate — it won't appear in future review queues.

---

## Searching the Graph

**Tool:** `knowledge_graph_search`

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Entity name, keyword, or `*` to list all (required) |
| `entity_type` | string | Filter: `person`, `organization`, `project`, `product`, `technology`, `task`, `event`, `document`, `concept`, `location` |
| `entity_id` | string | Start point for relationship traversal |
| `max_depth` | int | Traversal depth (default 2, max 3) |

### 3-Tier Search Fallback

The tool uses a 3-tier fallback strategy to ensure results are always returned:

1. **Traversal** (when `entity_id` provided) — Bidirectional multi-hop traversal up to `max_depth`, returns up to 20 results with path info and relation types
2. **Direct connections** (fallback if traversal returns nothing) — Bidirectional 1-hop relations, capped at 10
3. **Text search** (fallback if no connections) — Full-text search on entity names/descriptions, returns up to 10 results with their relations (5 per entity)

When all three tiers return nothing, the tool returns the top 10 existing entities as hints so the model knows what's available in the graph.

### Search modes

**Text search** — Find entities by name or keyword:
```
query: "John"
```

**List all** — Show all entities (up to 30):
```
query: "*"
```

**Traverse relationships** — Start from an entity and follow connections in both directions:
```
query: "*"
entity_id: "project-alpha"
max_depth: 2
```

Results include entity names, types, descriptions, depth, traversal path, and the relation type used to reach each entity.

---

## REST API Reference

All endpoints require authentication (`Authorization: Bearer <token>`). Add `?user_id=<id>` to scope results to a specific user.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/kg/entities` | List or search entities |
| `GET` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Get entity with its relations |
| `POST` | `/v1/agents/{agentID}/kg/entities` | Upsert entity |
| `DELETE` | `/v1/agents/{agentID}/kg/entities/{entityID}` | Delete entity (cascades relations) |
| `POST` | `/v1/agents/{agentID}/kg/traverse` | Traverse the graph from an entity |
| `POST` | `/v1/agents/{agentID}/kg/extract` | LLM-powered extraction from text |
| `GET` | `/v1/agents/{agentID}/kg/stats` | Graph statistics |
| `GET` | `/v1/agents/{agentID}/kg/graph` | Full graph for visualization |
| `POST` | `/v1/agents/{agentID}/kg/dedup/scan` | Scan for duplicate candidates |
| `GET` | `/v1/agents/{agentID}/kg/dedup` | List dedup candidates |
| `POST` | `/v1/agents/{agentID}/kg/merge` | Merge two entities |
| `POST` | `/v1/agents/{agentID}/kg/dedup/dismiss` | Dismiss a dedup candidate |

---

## Data Model

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

| Field | Description |
|-------|-------------|
| `external_id` | Human-readable slug (e.g., `john-doe`). Used for upsert dedup. |
| `properties` | Arbitrary key-value metadata from extraction |
| `source_id` | Optional reference to the source conversation or document |
| `confidence` | Extraction confidence (0.0–1.0); surviving entity in merges keeps the higher value |

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

Relations are directional: `source --relation_type--> target`. Deleting an entity cascades and removes all its relations.

---

## Entity Types

| Type | Examples |
|------|----------|
| `person` | Team members, contacts, stakeholders |
| `organization` | Companies, teams, departments |
| `project` | Initiatives, codebases, programs |
| `product` | Software products, services, features |
| `technology` | Languages, frameworks, platforms |
| `task` | Action items, tickets, assignments |
| `event` | Meetings, deadlines, milestones |
| `document` | Reports, specs, wikis, runbooks |
| `concept` | Methodologies, ideas, principles |
| `location` | Offices, cities, regions |

---

## Graph Statistics & Visualization

### Statistics

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

### Full Graph for Visualization

```bash
GET /v1/agents/{agentID}/kg/graph?user_id=xxx&limit=200
```

Returns all entities and relations suitable for rendering in a graph UI. Default limit is 200 entities; relations are capped at 3× the entity limit.

The web dashboard renders the graph using **ReactFlow** with **D3 Force Simulation** (`d3-force`) for automatic node positioning:

- **Force layout** — `forceSimulation` computes node positions using link distance, charge repulsion (`forceManyBody`), centering (`forceCenter`), and collision avoidance (`forceCollide`). Forces scale by node count (tighter for small graphs, spread for large).
- **Node sizing by type** — Each entity type has a different mass (organization=8, project=6, person=4, etc.), so hub entities naturally sit at the center.
- **Degree centrality** — When entities exceed the display limit (50), the graph keeps the most-connected hub nodes. Nodes with ≥4 connections get a glow highlight.
- **Interactive selection** — Clicking a node highlights its connected edges with labels, dims unrelated edges, and opens the entity detail dialog.
- **Theme support** — Dual-theme color palette (dark/light) with per-entity-type colors. Theme changes update colors without re-running the layout.
- **Performance** — Node components are `memo`-ized, layout runs in `setTimeout(0)` to avoid blocking, and edge updates use `useTransition` for responsive interaction.

---

## Shared Knowledge Graph

By default, the knowledge graph is scoped per agent **and** per user — each user builds their own graph. When `share_knowledge_graph` is enabled in the agent's workspace sharing config, the graph becomes agent-level (shared across all users):

```yaml
workspace_sharing:
  share_knowledge_graph: true
```

In shared mode, `user_id` is ignored for all KG operations — entities and relations from all users are stored and queried together. This is useful for team agents where everyone should see the same entity graph.

> **Note:** `share_knowledge_graph` is independent of `share_memory`. You can share memory without sharing the graph, or vice versa.

---

## Automatic Extraction on Memory Write

When an agent writes to its memory files (e.g., `MEMORY.md` or files under `memory/`), GoClaw automatically triggers KG extraction on the written content. This happens via the `MemoryInterceptor`, which calls the configured LLM to extract entities and relations from the new memory text.

This means agents continuously build their knowledge graph as they learn — no manual `/kg/extract` calls needed for normal conversations. The extract API is available for bulk imports or external integrations.

---

## Confidence Pruning

Remove low-confidence entities and relations in bulk using `PruneByConfidence`:

```bash
# Internal service call — prunes items below threshold
# Returns count of pruned entities and relations
PruneByConfidence(agentID, userID, minConfidence)
```

This is useful after bulk imports where many low-confidence items accumulate. Items with `confidence < minConfidence` are deleted; their relations cascade automatically.

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

## Knowledge Graph vs Knowledge Vault

The Knowledge Graph and [Knowledge Vault](knowledge-vault.md) are complementary systems:

| | Knowledge Graph | Knowledge Vault |
|--|----------------|-----------------|
| **What it stores** | Extracted entities and typed relations | Full documents (notes, specs, context files) |
| **How it's built** | Automatic LLM extraction from conversations | Agent writes files; VaultSyncWorker registers them |
| **Search** | Entity name / relationship traversal | Hybrid FTS + vector on title, path, content |
| **Links** | Typed relation edges (`works_on`, `manages`, …) | Wikilinks `[[target]]` and explicit references |
| **Scope** | Per-agent, optionally shared across team | personal / team / shared scope per document |

When an agent uses `vault_search`, the VaultSearchService fans out to **both** the vault and the knowledge graph simultaneously, merging results with weighted scoring.

---

## What's Next

- [Knowledge Vault](knowledge-vault.md) — Document-level knowledge store with wikilinks and semantic search
- [Memory System](../core-concepts/memory-system.md) — Vector-based long-term memory
- [Sessions & History](../core-concepts/sessions-and-history.md) — Conversation storage

<!-- goclaw-source: 1296cdbf | updated: 2026-04-11 -->
