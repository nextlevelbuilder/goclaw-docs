#!/usr/bin/env bash
# audit-docs.sh — Find doc pages whose goclaw-source SHA is behind latest goclaw commit
# Usage: ./scripts/audit-docs.sh [--update]
#   --update  Update all outdated pages with current SHA and today's date

set -euo pipefail

GOCLAW_DIR="$(cd "$(dirname "$0")/../../goclaw" 2>/dev/null && pwd)" || {
  echo "Error: ../goclaw directory not found"; exit 1
}
DOCS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LATEST_SHA=$(git -C "$GOCLAW_DIR" log -1 --format="%h")
TODAY=$(date +%Y-%m-%d)
UPDATE=false
[[ "${1:-}" == "--update" ]] && UPDATE=true

echo "GoClaw latest: $LATEST_SHA"
echo "Scanning docs in: $DOCS_DIR"
echo "---"

outdated=0
total=0
no_meta=0

while IFS= read -r f; do
  total=$((total + 1))
  meta=$(grep -o 'goclaw-source: [a-f0-9]*' "$f" 2>/dev/null | head -1 | awk '{print $2}' || true)

  if [[ -z "$meta" ]]; then
    no_meta=$((no_meta + 1))
    echo "[NO META] $f"
    if $UPDATE; then
      if [[ "$f" == */vi/* ]]; then
        printf '\n<!-- goclaw-source: %s | cập nhật: %s -->\n' "$LATEST_SHA" "$TODAY" >> "$f"
      else
        printf '\n<!-- goclaw-source: %s | updated: %s -->\n' "$LATEST_SHA" "$TODAY" >> "$f"
      fi
    fi
    continue
  fi

  if [[ "$meta" != "$LATEST_SHA" ]]; then
    outdated=$((outdated + 1))
    echo "[OUTDATED] $f  (has: $meta)"
    if $UPDATE; then
      sed -i '' "s/goclaw-source: $meta/goclaw-source: $LATEST_SHA/" "$f"
      sed -i '' "s/\(updated\|cập nhật\): [0-9-]*/\1: $TODAY/" "$f"
    fi
  fi
done < <(find "$DOCS_DIR" -name "*.md" \
  -not -path "*/plans/*" -not -path "*/.claude/*" \
  -not -path "*/docs/*" -not -path "*/archive/*" \
  -not -name "README.md" -not -name "CLAUDE.md" \
  -not -name "CONTRIBUTING.md" -not -name "INDEX.md")

echo "---"
echo "Total: $total | Outdated: $outdated | No metadata: $no_meta"
if $UPDATE && [[ $((outdated + no_meta)) -gt 0 ]]; then
  echo "Updated all to: $LATEST_SHA ($TODAY)"
fi
