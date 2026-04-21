#!/bin/bash
# Compare upstream tags and copy changed files
# Usage: ./upstream.sh v1.2.3 v2.0.0

set -e

UPSTREAM_REPO="https://github.com/mapcentia/vidi.git"
OLD_TAG="${1:-}"
NEW_TAG="${2:-}"
OUTPUT_DIR="upstream-changes"
TEMP_UPSTREAM="/tmp/vidi-upstream"

if [ -z "$OLD_TAG" ] || [ -z "$NEW_TAG" ]; then
    echo "Usage: $0 <old-tag> <new-tag>"
    echo "Example: $0 v1.2.3 v2.0.0"
    exit 1
fi

echo "📥 Cloning upstream repo (temporary)..."
rm -rf "$TEMP_UPSTREAM"
git clone "$UPSTREAM_REPO" "$TEMP_UPSTREAM" --quiet 2>/dev/null || exit 1

cd "$TEMP_UPSTREAM"
echo "🔍 Comparing $OLD_TAG -> $NEW_TAG..."

# Verify tags exist
if ! git rev-parse "$OLD_TAG" &>/dev/null; then
    echo "❌ Tag $OLD_TAG not found in upstream"
    cd - > /dev/null
    rm -rf "$TEMP_UPSTREAM"
    exit 1
fi
if ! git rev-parse "$NEW_TAG" &>/dev/null; then
    echo "❌ Tag $NEW_TAG not found in upstream"
    cd - > /dev/null
    rm -rf "$TEMP_UPSTREAM"
    exit 1
fi

echo ""
echo "📊 Changed Files Summary:"
echo "========================"
git diff "$OLD_TAG" "$NEW_TAG" --stat
echo ""

# Export changed files
cd - > /dev/null
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo "📦 Copying changed files to $OUTPUT_DIR/..."

cd "$TEMP_UPSTREAM"
git diff "$OLD_TAG" "$NEW_TAG" --name-only | while read file; do
    mkdir -p "$OLDPWD/$OUTPUT_DIR/$(dirname "$file")"
    git show "$NEW_TAG:$file" > "$OLDPWD/$OUTPUT_DIR/$file" 2>/dev/null || true
done

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_UPSTREAM"

echo "✅ Done! Changed files are in $OUTPUT_DIR/"
echo ""
echo "📋 Copying files to repo root for git management..."
cp -rf "$OUTPUT_DIR"/* ..
rm -rf "$OUTPUT_DIR"

echo "✅ Files integrated into repo. Run 'git status' to review."
echo "   Discard changes with 'git checkout .' if needed."
