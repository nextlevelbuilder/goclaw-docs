#!/bin/bash
# Batch update goclaw-source footers to target SHA/date
# Usage: ./scripts/bump-footers.sh

TARGET_SHA="050aafc9"
TARGET_DATE="2026-04-09"

# EN footer format
EN_FOOTER="<!-- goclaw-source: ${TARGET_SHA} | updated: ${TARGET_DATE} -->"
# VI footer format  
VI_FOOTER="<!-- goclaw-source: ${TARGET_SHA} | cập nhật: ${TARGET_DATE} -->"
# ZH footer format
ZH_FOOTER="<!-- goclaw-source: ${TARGET_SHA} | 更新: ${TARGET_DATE} -->"

UPDATED=0
SKIPPED=0

update_footer() {
    local file="$1"
    local new_footer="$2"
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Check if already up to date
    if grep -q "$TARGET_SHA" "$file" 2>/dev/null; then
        SKIPPED=$((SKIPPED + 1))
        return
    fi
    
    # Check if file has a goclaw-source footer
    if ! grep -q "goclaw-source:" "$file" 2>/dev/null; then
        return
    fi
    
    # Replace the footer line
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|<!-- goclaw-source:.*-->|${new_footer}|g" "$file"
    else
        sed -i "s|<!-- goclaw-source:.*-->|${new_footer}|g" "$file"
    fi
    
    UPDATED=$((UPDATED + 1))
    echo "  ✓ $file"
}

echo "=== GoClaw Docs Footer Bump ==="
echo "Target SHA: $TARGET_SHA"
echo "Target Date: $TARGET_DATE"
echo ""

# Find all stale .md files with goclaw-source footer
echo "--- EN pages ---"
for f in $(grep -rl "goclaw-source:" --include="*.md" . | grep -v node_modules | grep -v plans/ | grep -v archive/ | grep -v "^./vi/" | grep -v "^./zh/" | grep -v CLAUDE.md | sort); do
    update_footer "$f" "$EN_FOOTER"
done

echo ""
echo "--- VI pages ---"
for f in $(grep -rl "goclaw-source:" --include="*.md" vi/ 2>/dev/null | sort); do
    update_footer "$f" "$VI_FOOTER"
done

echo ""
echo "--- ZH pages ---"
for f in $(grep -rl "goclaw-source:" --include="*.md" zh/ 2>/dev/null | sort); do
    update_footer "$f" "$ZH_FOOTER"
done

echo ""
echo "=== Summary ==="
echo "Updated: $UPDATED files"
echo "Already current: $SKIPPED files"
