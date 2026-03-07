# Contributing to GoClaw Docs

## Writing Guidelines

### Page Template

Every doc page follows this structure:

```markdown
# Page Title

> One-line description of what this page covers.

## Overview

Brief intro (2-3 sentences). What will the reader learn?

## Main Content

Core material with examples, diagrams, and code blocks.

## Examples

```language
// Copy-paste ready code
```

## Common Issues

| Problem | Solution |
|---------|----------|
| ... | ... |

## What's Next

- [Next logical page](link.md)
- [Related topic](link.md)
```

### Tone

- Friendly, concise, no jargon without explanation
- Write for developers who haven't read the source code
- Use "you" to address the reader
- Prefer active voice

### Code Blocks

- Must be copy-paste ready
- Test against current GoClaw before submitting
- Include expected output where helpful
- Use language hints: `go`, `bash`, `json`, `yaml`

### Diagrams

- Use Mermaid.js inline (renders on GitHub + SPA site)
- Keep diagrams simple — max 10 nodes
- Add a text description below for accessibility

### Links

- Use relative paths: `../core-concepts/agents-explained.md`
- Always link forward to "What's Next" pages
- Link back to prerequisites when relevant

## Bilingual Process

1. Write the English version first in the appropriate directory
2. Create the Vietnamese mirror in `vi/` with the same path
3. Translate all content including code comments
4. Keep technical terms (GoClaw, agent, provider, etc.) untranslated
5. Update both versions when making changes

## File Naming

- Use kebab-case: `what-is-goclaw.md`, not `WhatIsGoClaw.md`
- Be descriptive: `creating-agents.md`, not `agents.md`
- Match the nav structure in README.md

## Pull Request Checklist

- [ ] Page follows the template structure
- [ ] No broken links
- [ ] Code blocks tested
- [ ] Mermaid diagrams render
- [ ] Vietnamese mirror updated (if applicable)
- [ ] README.md nav updated (if new page)
