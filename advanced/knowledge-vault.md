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
| **EnrichWorker** | Processes vault document upsert events to generate summaries, embeddings, and semantic links |
| **VaultRetriever** | Bridges vault search into the agent L0 memory system |
| **HTTP Handlers** | REST endpoints: list, get, search, links, tree, graph |

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

### Document Scope & Ownership Invariant

The `scope` field has a strict ownership invariant enforced at the database level by migration `000055` (`vault_documents_scope_consistency` CHECK constraint):

| `scope` | `agent_id` | `team_id` | Visibility |
|---------|------------|-----------|------------|
| `personal` | set | NULL | Owning agent only (within tenant) |
| `team` | NULL | set | Members of the team (within tenant) |
| `shared` | NULL | NULL | All agents within the tenant |
| `custom` | any | any | User-defined via `custom_scope` |

The CHECK constraint rejects any INSERT or UPDATE that violates the `scope × agent_id × team_id` relationship above. `scope='custom'` is the exception — it is intentionally unconstrained, allowing user-defined ownership semantics.

#### Agent Read Semantics

`vault_search`, `ListDocuments`, and `CountDocuments` always return:

- Documents owned by the querying agent (`agent_id = <agent>`)
- PLUS shared documents (`agent_id IS NULL`)

Within a team context (a `RunContext` with `TeamID` set), results also include team-scoped documents for that team (`scope = 'team'` with `team_id = <team>`). Tenant isolation (`tenant_id = <tenant>`) is always enforced regardless of scope.

---

## Data Model

### vault_documents

Registry of document metadata. Content lives on the filesystem; the registry stores path, hash, embeddings, and links.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenant isolation |
| `agent_id` | UUID | Per-agent namespace; **nullable** for team-scoped or tenant-shared files (migration 046) |
| `scope` | TEXT | `personal` \| `team` \| `shared` |
| `path` | TEXT | Workspace-relative path (e.g., `workspace/notes/foo.md`) |
| `title` | TEXT | Display name |
| `doc_type` | TEXT | `context`, `memory`, `note`, `skill`, `episodic`, `image`, `video`, `audio`, `document` |
| `content_hash` | TEXT | SHA-256 of file content (change detection) |
| `embedding` | vector(1536) | pgvector semantic similarity |
| `tsv` | tsvector | GIN FTS index on title + path + summary |
| `metadata` | JSONB | Optional custom fields |

### vault_links

Bidirectional links between documents (wikilinks, explicit references, and enrichment-generated semantic links).

| Column | Type | Notes |
|--------|------|-------|
| `from_doc_id` | UUID | Source document |
| `to_doc_id` | UUID | Target document |
| `link_type` | TEXT | `wikilink`, `reference`, `depends_on`, `extends`, `related`, `supersedes`, `contradicts`, `task_attachment`, `delegation_attachment` |
| `context` | TEXT | ~50-char surrounding text snippet |
| `metadata` | JSONB | Extra metadata from enrichment pipeline (migration 048) |

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

## Enrichment Pipeline

After each document upsert, **EnrichWorker** processes the event asynchronously to enrich vault documents with summaries, embeddings, and semantic links.

### What EnrichWorker does

1. Generates a text summary of the document content
2. Computes a vector embedding for semantic search
3. Classifies semantic relationships to other documents in the vault and creates `vault_link` rows

### Semantic link types

The classifier produces links with one of six relationship types:

| Type | Meaning |
|------|---------|
| `reference` | Document cites another as a source |
| `depends_on` | Document requires another to be meaningful |
| `extends` | Document adds to or builds upon another |
| `related` | General topical relationship |
| `supersedes` | Document replaces or obsoletes another |
| `contradicts` | Document conflicts with another |

### Special attachment link types

Two additional link types are created by the task/delegation system rather than the classifier:

- `task_attachment` — links a vault document to a team task it was attached to
- `delegation_attachment` — links a vault document to a delegation it was attached to

These are not affected by enrichment cleanup or rescan.

### Enrichment progress

Real-time enrichment progress is broadcast as WebSocket events. The UI shows per-document status while the worker runs.

### Stop and rescan controls

From the UI (or REST API), users can:
- **Stop enrichment** — halts the EnrichWorker for the current tenant
- **Trigger rescan** — re-queues all vault documents for re-enrichment (useful after model or config changes)

---

## Media Document Support

The vault accepts binary and media files in addition to text documents. Supported file types are controlled by an extension whitelist.

### doc_type values for media files

| `doc_type` | Used for |
|-----------|---------|
| `image` | PNG, JPG, GIF, WEBP, SVG, etc. |
| `video` | MP4, MOV, AVI, etc. |
| `audio` | MP3, WAV, OGG, etc. |
| `document` | PDF, DOCX, XLSX, etc. |

### Synthetic summaries for media

Because media files cannot be read as text, the vault uses `SynthesizeMediaSummary()` to generate a deterministic semantic summary from the filename and parent folder context. No LLM call is needed. The summary is stored in `vault_documents.summary` and included in the FTS index, enabling keyword discovery of media files by name and location.

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

Each result carries a **source-specific ID field** that tells you which follow-up tool to use:

| Source | ID field | Follow-up tool |
|--------|----------|---------------|
| `vault` | `doc_id` | `vault_read(doc_id=...)` |
| `kg` | `entity_id` | `knowledge_graph_search(entity_id=...)` |
| `episodic` | `episodic_id` | `memory_expand(id=episodic_id)` |

> **ID namespace protection:** If you pass a `entity_id` or `episodic_id` to `vault_read` by mistake, the tool returns a descriptive error telling you the correct tool to use — rather than a generic "document not found". Always use the `doc_id` from vault results with `vault_read`.

> **Note on linking:** Explicit document linking is now handled automatically by the enrichment pipeline. The `vault_link` agent tool has been removed. Links are created via wikilink syntax in document content (`[[target]]`) or generated semantically by EnrichWorker. You can view links via `GET /v1/agents/{agentID}/vault/documents/{docID}/links`.

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

### Cross-Agent Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/vault/documents` | List across all tenant agents (filter by `agent_id`) |
| `GET` | `/v1/vault/tree` | Tree view of vault structure |
| `GET` | `/v1/vault/graph` | Cross-tenant graph visualization (node limit: 2000, FA2 layout) |

### Enrichment Control Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/vault/enrichment/stop` | Stop the enrichment worker |

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

## Recent Migrations

| Migration | Name | What changed |
|-----------|------|--------------|
| 046 | `vault_nullable_agent_id` | Makes `vault_documents.agent_id` nullable for team-scoped and tenant-shared files |
| 048 | `vault_media_linking` | Adds `base_name` generated column on `team_task_attachments`; adds `metadata JSONB` on `vault_links`; fixes CASCADE FK constraints |
| 049 | `vault_path_prefix_index` | Adds concurrent index `idx_vault_docs_path_prefix` with `text_pattern_ops` for fast prefix queries |

---

## Requirements

- **PostgreSQL** with `pgvector` extension (embeddings)
- **Migration** `000038_vault_tables` must have run successfully
- **VaultStore** initialized during gateway startup
- **VaultSyncWorker** started for filesystem sync
- **EnrichWorker** started for automatic enrichment (summaries, embeddings, semantic links)

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
- [Memory System](../core-concepts/memory-system.md) — Vector-based long-term memory
- [Context Files](../agents/context-files.md) — Static documents injected into agent context

<!-- goclaw-source: 1b862707 | updated: 2026-04-20 -->
