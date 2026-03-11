# Knowledge Graph

> Agents automatically extract entities and relationships from conversations, building a searchable graph of people, projects, and concepts.

## Overview

GoClaw's knowledge graph system has two parts:

1. **Extraction** — After conversations, an LLM extracts entities (people, projects, concepts) and relationships from the text
2. **Search** — Agents use the `knowledge_graph_search` tool to query the graph, traverse relationships, and discover connections

The graph is scoped per agent and per user — each agent builds its own graph from its conversations.

---

## How Extraction Works

After a conversation, GoClaw sends the text (up to 6,000 characters) to an LLM with a structured extraction prompt. The LLM returns:

- **Entities** — People, projects, tasks, events, concepts, locations, organizations
- **Relations** — Typed connections between entities (e.g., "works_on", "reports_to")

Each entity and relation has a **confidence score** (0.0–1.0). Only items above the threshold (default **0.75**) are stored.

**Constraints:**
- Max 15 entities per extraction
- Entity IDs are lowercase with hyphens
- Descriptions max 50 characters
- Temperature 0.0 for deterministic results

---

## Searching the Graph

**Tool:** `knowledge_graph_search`

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Entity name, keyword, or `*` to list all |
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

**Traverse relationships** — Start from an entity and follow connections:
```
entity_id: "project-alpha"
max_depth: 2
```

Results include entity names, types, descriptions, and relationships with resolved names.

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
  Alice --leads--> Project Alpha
  Bob --works_on--> Project Alpha
  Project Alpha --uses--> GraphQL
```

An agent can then answer questions like *"Who is working on Project Alpha?"* by traversing the graph.

---

## What's Next

- [Memory System](../core-concepts/memory-system.md) — Vector-based long-term memory
- [Sessions & History](../core-concepts/sessions-and-history.md) — Conversation storage
