# Knowledge Vault

> A structured knowledge store that lets agents curate workspace documents with bidirectional wikilinks, semantic search, and team-scoped access — all layered on top of existing memory systems.

Knowledge Vault is a **v3-only** feature. It sits between agents and the episodic/KG stores, adding document-level notes with explicit relationships.

> **Vault vs Knowledge Graph** — Vault stores full documents (notes, context files, specs) with lexical + semantic search and wikilinks. The [Knowledge Graph](knowledge-graph.md) stores extracted *entities and relations* from conversations. They complement each other: vault for curated docs, KG for auto-extracted facts. The VaultSearchService fans out to both simultaneously.

---

## Architecture

| Component | Role |
|-----------|------|
| **VaultStore** | Document CRUD, link management, hybrid FTS + vector search |
| **VaultService** | Search coordinator: fan-out across vault, episodic, and KG stores with weighted ranking |
| **VaultSyncWorker** | Filesystem watcher: detects file changes (create/write/delete), syncs content hashes |
| **VaultRetriever** | Bridges vault search into the agent L0 memory system |
| **HTTP Handlers** | REST endpoints: list, get, search, links |

### Data Flow

```
Agent writes document → Workspace FS
                    ↓
          VaultSyncWorker detects change
                    ↓
       Update vault_documents (hash, metadata)
                    ↓
       On agent query: vault_search tool
                    ↓
  VaultSearchService (parallel fan-out)
       ↙            ↓            ↘
  Vault         Episodic     Knowledge Graph
  (0.4 weight)  (0.3 weight) (0.3 weight)
       ↘            ↓            ↙
    Normalize & Weight Scores
               ↓
        Return Top Results
```

### Scope Isolation

Documents are scoped by **tenant** (isolation boundary), **agent** (namespace), and **document scope**:

| Scope | Description |
|-------|-------------|
| `personal` | Agent-specific documents (per-agent context files, per-user work) |
| `team` | Team workspace documents shared across team members |
| `shared` | Cross-tenant shared knowledge (future) |

---

## Data Model

### vault_documents

Registry of document metadata. Content lives on the filesystem; the registry stores path, hash, embeddings, and links.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenant isolation |
| `agent_id` | UUID | Per-agent namespace |
| `scope` | TEXT | `personal` \| `team` \| `shared` |
| `path` | TEXT | Workspace-relative path (e.g., `workspace/notes/foo.md`) |
| `title` | TEXT | Display name |
| `doc_type` | TEXT | `context`, `memory`, `note`, `skill`, `episodic` |
| `content_hash` | TEXT | SHA-256 of file content (change detection) |
| `embedding` | vector(1536) | pgvector semantic similarity |
| `tsv` | tsvector | GIN FTS index on title + path |
| `metadata` | JSONB | Optional custom fields |

Unique constraint: `(agent_id, scope, path)` — one document per path per scope.

### vault_links

Bidirectional links between documents (wikilinks, explicit references).

| Column | Type | Notes |
|--------|------|-------|
| `from_doc_id` | UUID | Source document |
| `to_doc_id` | UUID | Target document |
| `link_type` | TEXT | `wikilink`, `reference`, etc. |
| `context` | TEXT | ~50-char surrounding text snippet |

Unique constraint: `(from_doc_id, to_doc_id, link_type)` — no duplicate links.

### vault_versions

Version history prepared for v3.1 — table exists but is empty in v3.0.

---

## Wikilinks

Agents can create bidirectional markdown links in `[[target]]` format.

### Syntax

```markdown
See [[architecture/components]] for details.
Reference [[SOUL.md|agent persona]] here.
Link [[../parent-project]] up.
```

- `[[path/to/file.md]]` — path-based target
- `[[name|display text]]` — display text is cosmetic only
- `.md` extension auto-appended if missing
- Empty or whitespace-only targets are skipped

### Resolution Strategy

When resolving a wikilink target:

1. **Exact path match** — find document by path
2. **With .md suffix** — retry if target lacks extension
3. **Basename search** — scan all agent docs, match by filename (case-insensitive)
4. **Unresolved** — silently skipped; backlinks can be incomplete

### Link Sync

`SyncDocLinks` keeps `vault_links` in sync with document content:

1. Extract all `[[...]]` patterns from content
2. Delete existing outgoing links for the document (replace strategy)
3. Resolve each target and create `vault_link` rows for resolved targets

This runs on every document upsert and on each VaultSyncWorker file event.

---

## Search

### Vault Search (Single Store)

Hybrid FTS + vector search on a single vault:

- **FTS**: PostgreSQL `plainto_tsquery()` on `tsv` (title + path keywords)
- **Vector**: pgvector cosine similarity on embeddings (semantic)
- **Scoring**: Scores from each method normalized to 0–1, then combined with query-time weights

### Unified Search (Cross-Store)

`VaultSearchService` fans out in parallel across all knowledge sources:

| Source | Weight | What it searches |
|--------|--------|-----------------|
| Vault | 0.4 | Document titles, paths, embeddings |
| Episodic | 0.3 | Session summaries |
| Knowledge Graph | 0.3 | Entity names and descriptions |

Results are normalized per source (max score = 1.0), weighted, merged, deduplicated by ID, and sorted by final score descending.

### Search Parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `Query` | string | — | Required: natural language |
| `AgentID` | string | — | Scope to agent |
| `TenantID` | string | — | Scope to tenant |
| `Scope` | string | all | `personal`, `team`, `shared` |
| `DocTypes` | []string | all | `context`, `memory`, `note`, `skill`, `episodic` |
| `MaxResults` | int | 10 | Final result set size |
| `MinScore` | float64 | 0.0 | Minimum score filter |

---

## Filesystem Sync

`VaultSyncWorker` watches workspace directories for changes using `fsnotify`:

1. **Debounce**: 500ms — multiple rapid changes collapse to one batch
2. For each changed file:
   - Compute SHA-256 hash
   - Compare to `vault_documents.content_hash`
   - If different: update hash in DB
   - If file deleted: mark `metadata["deleted"] = true`

**Note:** Sync is one-way — only registered documents are watched. New files must first be registered by an agent write. The vault does not write back to the filesystem.

---

## Agent Tools

### vault_search

Primary discovery tool. Searches across vault, episodic memory, and Knowledge Graph with unified ranking.

```json
{
  "query": "authentication flow",
  "scope": "team",
  "types": "context,note",
  "maxResults": 10
}
```

### vault_link

Creates an explicit link between two documents (similar to a wikilink, but programmatic).

```json
{
  "from": "docs/auth.md",
  "to": "SOUL.md",
  "context": "Persona reference"
}
```

The `from` and `to` fields are workspace-relative paths. `context` is an optional relationship description stored in `vault_links.context`.

---

## REST API

All endpoints require `Authorization: Bearer <token>`.

### Per-Agent Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/{agentID}/vault/documents` | List documents (scope, doc_type, limit, offset) |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}` | Get single document |
| `POST` | `/v1/agents/{agentID}/vault/search` | Unified search |
| `GET` | `/v1/agents/{agentID}/vault/documents/{docID}/links` | Outlinks + backlinks |

### Cross-Agent Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/vault/documents` | List across all tenant agents (filter by `agent_id`) |

### Example: Unified Search

```bash
POST /v1/agents/agent-123/vault/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "authentication flow",
  "scope": "personal",
  "max_results": 5
}
```

```json
[
  {
    "document": {
      "id": "doc-456",
      "path": "notes/auth.md",
      "title": "Authentication Flow",
      "doc_type": "note"
    },
    "score": 0.92,
    "source": "vault"
  },
  {
    "document": {"id": "episodic-789", "title": "Session-2026-04-06"},
    "score": 0.68,
    "source": "episodic"
  }
]
```

### Example: Get Links

```bash
GET /v1/agents/agent-123/vault/documents/doc-456/links
```

```json
{
  "outlinks": [
    {
      "id": "uuid",
      "to_doc_id": "uuid",
      "link_type": "wikilink",
      "context": "See [[target]] for details."
    }
  ],
  "backlinks": [
    {
      "id": "uuid",
      "from_doc_id": "uuid",
      "link_type": "wikilink",
      "context": "Reference [[auth.md]] here."
    }
  ]
}
```

---

## Requirements

- **PostgreSQL** with `pgvector` extension (embeddings)
- **Migration** `000038_vault_tables` must have run successfully
- **VaultStore** initialized during gateway startup
- **VaultSyncWorker** started for filesystem sync

No feature flag. Vault is active if the migration ran and VaultStore initialized.

---

## Limitations

- Vault documents are **not auto-injected** into the agent system prompt — they must be retrieved via `vault_search`
- FTS indexes title + path only; content requires vector embeddings for discovery
- Sync is **one-way** (filesystem → vault; vault does not write back)
- **No conflict resolution** — concurrent edits use last-write-wins
- **Version history** (`vault_versions` table) prepared for v3.1; empty in v3.0

---

## What's Next

- [Knowledge Graph](knowledge-graph.md) — Entity and relation graph auto-extracted from conversations
- [Memory System](/memory-system) — Vector-based long-term memory
- [Context Files](/context-files) — Static documents injected into agent context

<!-- goclaw-source: 1296cdbf | updated: 2026-04-11 -->
