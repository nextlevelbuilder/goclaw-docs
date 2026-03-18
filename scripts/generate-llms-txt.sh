#!/usr/bin/env bash
# generate-llms-txt.sh — Generate llms.txt and llms-full.txt for EN and VI
# Output: llms.txt, llms-full.txt, vi/llms.txt, vi/llms-full.txt
# Follows llmstxt.org spec

set -euo pipefail

DOCS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
README="$DOCS_DIR/README.md"

# --- Helpers ---

# Strip frontmatter, HTML comments, metadata lines, trailing whitespace
strip_markdown() {
  sed -E '
    /^<!--/,/-->$/d
    /^goclaw-source:/d
    /^last-updated:/d
  ' "$1" | awk '
    BEGIN { in_fm=0; fm_done=0 }
    /^---$/ && !fm_done { if (!in_fm) { in_fm=1; next } else { in_fm=0; fm_done=1; next } }
    in_fm { next }
    { sub(/[[:space:]]+$/, ""); print }
  '
}

# Extract first non-empty paragraph after H1 as description
extract_desc() {
  awk '
    /^# / { found=1; next }
    found && /^[[:space:]]*$/ { if (got_text) exit; next }
    found && /^[^#\[]/ { got_text=1; printf "%s ", $0 }
    found && got_text && /^$/ { exit }
  ' "$1" | sed 's/[[:space:]]*$//'
}

# Extract H1 title from a markdown file
extract_title() {
  grep -m1 '^# ' "$1" 2>/dev/null | sed 's/^# //' || basename "$1" .md
}

# --- Parse README DOC MAP ---
# Extracts section headers and page links in order

generate_index() {
  local prefix="$1"  # "" for EN, "vi/" for VI
  local out_index="$2"
  local out_full="$3"
  local project_desc="Enterprise AI Agent Platform — multi-tenant gateway for AI agents"

  if [[ -n "$prefix" ]]; then
    printf "# GoClaw (Tiếng Việt)\n\n> %s\n\n" "$project_desc" > "$out_index"
    printf "# GoClaw — Tài liệu đầy đủ (Tiếng Việt)\n\n> %s\n\n" "$project_desc" > "$out_full"
  else
    printf "# GoClaw\n\n> %s\n\n" "$project_desc" > "$out_index"
    printf "# GoClaw — Full Documentation\n\n> %s\n\n" "$project_desc" > "$out_full"
  fi

  local current_section=""

  # Parse README for ## headers and markdown links
  while IFS= read -r line; do
    # Section header (## Getting Started, ## Core Concepts, etc.)
    if [[ "$line" =~ ^##[[:space:]]+(.*) ]]; then
      section="${BASH_REMATCH[1]}"
      # Skip non-doc sections
      [[ "$section" == "Contributing" || "$section" == "Structure" ]] && continue
      current_section="$section"
      printf "\n## %s\n" "$section" >> "$out_index"
      continue
    fi

    # Page link: - [Title](path/to/file.md)
    local link_re='^[[:space:]]*-[[:space:]]*\[([^]]+)\]\(([^)]+\.md)\)'
    if [[ "$line" =~ $link_re ]]; then
      local title="${BASH_REMATCH[1]}"
      local path="${BASH_REMATCH[2]}"
      local full_path="$DOCS_DIR/${prefix}${path}"

      [[ ! -f "$full_path" ]] && continue

      # Index entry: title + description
      local desc
      desc=$(extract_desc "$full_path" | sed 's/^> //')
      [[ -z "$desc" ]] && desc="$title"
      printf -- "- [%s](%s%s): %s\n" "$title" "$prefix" "$path" "$desc" >> "$out_index"

      # Full content entry
      printf "\n---\n\n" >> "$out_full"
      strip_markdown "$full_path" >> "$out_full"
      printf "\n" >> "$out_full"
    fi
  done < "$README"
}

# --- Main ---

echo "Generating llms.txt files from: $DOCS_DIR"

# EN
generate_index "" "$DOCS_DIR/llms.txt" "$DOCS_DIR/llms-full.txt"
echo "  ✓ llms.txt ($(wc -l < "$DOCS_DIR/llms.txt" | tr -d ' ') lines)"
echo "  ✓ llms-full.txt ($(wc -l < "$DOCS_DIR/llms-full.txt" | tr -d ' ') lines)"

# VI
mkdir -p "$DOCS_DIR/vi"
generate_index "vi/" "$DOCS_DIR/vi/llms.txt" "$DOCS_DIR/vi/llms-full.txt"
echo "  ✓ vi/llms.txt ($(wc -l < "$DOCS_DIR/vi/llms.txt" | tr -d ' ') lines)"
echo "  ✓ vi/llms-full.txt ($(wc -l < "$DOCS_DIR/vi/llms-full.txt" | tr -d ' ') lines)"

echo "Done."
