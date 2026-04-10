#!/usr/bin/env python3
"""Batch update goclaw-source footers to target SHA/date across EN/VI/ZH."""

import os
import re
import sys

TARGET_SHA = "050aafc9"
TARGET_DATE = "2026-04-09"

# Footer patterns by language
FOOTER_REPLACEMENTS = {
    "en": f"<!-- goclaw-source: {TARGET_SHA} | updated: {TARGET_DATE} -->",
    "vi": f"<!-- goclaw-source: {TARGET_SHA} | cập nhật: {TARGET_DATE} -->",
    "zh": f"<!-- goclaw-source: {TARGET_SHA} | 更新: {TARGET_DATE} -->",
}

# Regex to match any goclaw-source footer
FOOTER_RE = re.compile(r"<!-- goclaw-source:.*?-->")

SKIP_DIRS = {"node_modules", "plans", "archive", ".git", ".github", ".wrangler", ".claude"}


def detect_lang(filepath):
    """Detect language from file path."""
    if filepath.startswith("vi/") or "/vi/" in filepath:
        return "vi"
    elif filepath.startswith("zh/") or "/zh/" in filepath:
        return "zh"
    return "en"


def process_file(filepath, root_dir):
    """Update footer in a single file. Returns True if updated."""
    full_path = os.path.join(root_dir, filepath)
    
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
    except (IOError, UnicodeDecodeError):
        return False
    
    # Skip if already up to date
    if TARGET_SHA in content:
        return False
    
    # Skip if no footer
    if not FOOTER_RE.search(content):
        return False
    
    lang = detect_lang(filepath)
    new_footer = FOOTER_REPLACEMENTS[lang]
    
    new_content = FOOTER_RE.sub(new_footer, content)
    
    if new_content == content:
        return False
    
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    return True


def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)
    
    updated = 0
    skipped = 0
    
    print(f"=== GoClaw Docs Footer Bump ===")
    print(f"Target SHA: {TARGET_SHA}")
    print(f"Target Date: {TARGET_DATE}")
    print(f"Root: {root_dir}")
    print()
    
    for dirpath, dirnames, filenames in os.walk("."):
        # Skip unwanted dirs
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        
        for filename in sorted(filenames):
            if not filename.endswith(".md"):
                continue
            
            filepath = os.path.join(dirpath, filename)
            # Normalize path
            filepath = filepath.lstrip("./")
            
            if process_file(filepath, root_dir):
                updated += 1
                print(f"  ✓ {filepath}")
            else:
                skipped += 1
    
    print()
    print(f"=== Summary ===")
    print(f"Updated: {updated} files")
    print(f"Skipped: {skipped} files")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
