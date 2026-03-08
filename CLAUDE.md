# GoClaw Docs

## Source of Truth
- **ALWAYS** read actual `goclaw/` source code (sibling directory `../goclaw/`) when writing docs — never assume behavior
- **DO NOT** reference, copy from, or base content on files in the `archive/` directory — they are outdated AI-oriented technical docs kept only for historical reference
- Cross-check features, config fields, and CLI commands against the latest codebase

## Plan
- Restructure plan: `../plans/260307-0238-goclaw-docs-restructure/`
- README.md menu must match plan phases exactly — do not add/remove pages without updating plan first

## DOC MAP (README.md)
- **ALWAYS** update `README.md` DOC MAP when adding, removing, or renaming doc pages
- The DOC MAP is the single source of navigation — every `.md` page must be listed there
- Also update cross-references in other pages (What's Next sections, INDEX.md, etc.)
- Keep the Structure tree at the bottom of README.md in sync with actual directories

## Writing
- Follow template in `CONTRIBUTING.md`
- Tone: friendly, concise, no jargon without explanation
- Code blocks: copy-paste ready, tested against current GoClaw
- Diagrams: Mermaid inline
- Source of truth: read actual `goclaw/` code, not assumptions
