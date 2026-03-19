# GoClaw Docs

## Source of Truth
- **ALWAYS** read actual `goclaw/` source code (sibling directory `../goclaw/`) when writing docs — never assume behavior
- **DO NOT** reference, copy from, or base content on files in the `archive/` directory — they are outdated AI-oriented technical docs kept only for historical reference
- Cross-check features, config fields, and CLI commands against the latest codebase

## Plan
- Restructure plan: `../plans/260307-0238-goclaw-docs-restructure/`
- README.md menu must match plan phases exactly — do not add/remove pages without updating plan first

## DOC MAP — Triple Sync (CRITICAL)
When adding, removing, or renaming doc pages, **ALL THREE** must be updated together:
1. `README.md` — DOC MAP links + Structure tree page counts
2. `js/docs-app.js` — `DOC_MAP` object (hash key → file path + titles)
3. `index.html` — sidebar `<a class="sidebar-link">` entries

- Every `.md` page in the filesystem must appear in all three locations
- Also update cross-references in other pages (What's Next sections, INDEX.md, etc.)

## Writing
- Follow template in `CONTRIBUTING.md`
- Tone: friendly, concise, no jargon without explanation
- Code blocks: copy-paste ready, tested against current GoClaw
- Diagrams: Mermaid inline
- Source of truth: read actual `goclaw/` code, not assumptions
