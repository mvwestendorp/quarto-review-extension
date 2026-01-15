#!/bin/bash
# Generate test fixtures from Quarto-rendered HTML
#
# This script:
# 1. Renders the example .qmd files with Quarto
# 2. Extracts fixtures from the rendered HTML
# 3. Saves them for use in parity tests

set -e

echo "🔨 Generating Pandoc rendering fixtures..."
echo ""

# Navigate to project root
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/../.."

# Files to extract fixtures from (text formatting and advanced features have the most variety)
SOURCE_FILES=(
    "01-text-and-formatting"
    "02-layout-and-structure"
    "03-advanced-features"
)

# Navigate to example directory
cd example

# Check if rendered files exist, render if needed
NEED_RENDER=false
for file in "${SOURCE_FILES[@]}"; do
    if [ ! -f "_output/${file}.html" ]; then
        NEED_RENDER=true
        break
    fi
done

if [ "$NEED_RENDER" = true ]; then
    echo "📝 Rendering example files with Quarto..."
    for file in "${SOURCE_FILES[@]}"; do
        if [ -f "${file}.qmd" ]; then
            echo "  Rendering ${file}.qmd..."
            quarto render "${file}.qmd" --quiet 2>/dev/null || {
                echo "  ⚠️  Failed to render ${file}.qmd, skipping..."
                continue
            }
        fi
    done
    echo "✓ Quarto render complete"
    echo ""
fi

# Extract fixtures from each file
cd ..
echo "🔍 Extracting fixtures from rendered HTML..."

# Create a temporary combined fixtures file
TEMP_DIR=$(mktemp -d)
ALL_FIXTURES="$TEMP_DIR/all-fixtures.json"
echo "[]" > "$ALL_FIXTURES"

for file in "${SOURCE_FILES[@]}"; do
    HTML_PATH="example/_output/${file}.html"
    if [ -f "$HTML_PATH" ]; then
        echo "  Processing ${file}.html..."
        TEMP_FILE="$TEMP_DIR/${file}.json"
        node tests/fixtures/extract-fixtures.mjs "$HTML_PATH" "$TEMP_FILE" 2>/dev/null || {
            echo "    ⚠️  Failed to extract from ${file}.html"
            continue
        }
        # Merge fixtures (using node for JSON manipulation)
        node -e "
            const fs = require('fs');
            const all = JSON.parse(fs.readFileSync('$ALL_FIXTURES'));
            const newFixtures = JSON.parse(fs.readFileSync('$TEMP_FILE'));
            const merged = [...all, ...newFixtures];
            fs.writeFileSync('$ALL_FIXTURES', JSON.stringify(merged, null, 2));
        "
    else
        echo "  ⚠️  ${HTML_PATH} not found, skipping..."
    fi
done

# Move combined fixtures to final location
mv "$ALL_FIXTURES" tests/fixtures/pandoc-renders.json
rm -rf "$TEMP_DIR"

# Count fixtures
FIXTURE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('tests/fixtures/pandoc-renders.json')).length)")

echo ""
echo "✅ Fixtures generated successfully!"
echo "   Total fixtures: $FIXTURE_COUNT"
echo ""
echo "Next steps:"
echo "  1. Run parity tests: npm run test:parity"
echo "  2. Review any failures to identify acceptable differences"
echo "  3. Update tests or fixtures as needed"
