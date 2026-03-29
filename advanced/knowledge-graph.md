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

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
