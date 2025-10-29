#!/bin/bash
# Test script to verify markdown is embedded in HTML output

set -e

echo "🧪 Testing Markdown Embedding in HTML Output"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if example HTML exists
HTML_FILE="example/_output/document.html"
if [ ! -f "$HTML_FILE" ]; then
  echo -e "${RED}❌ Error: $HTML_FILE not found${NC}"
  echo "Please render the example first: cd example && quarto render"
  exit 1
fi

echo "📄 Checking: $HTML_FILE"
echo ""

# Test 1: Check for data-review-markdown attribute existence
echo "Test 1: Checking for data-review-markdown attributes..."
MARKDOWN_ATTRS=$(grep -c 'data-review-markdown=' "$HTML_FILE" || true)
if [ "$MARKDOWN_ATTRS" -gt 0 ]; then
  echo -e "${GREEN}✓ Found $MARKDOWN_ATTRS elements with data-review-markdown${NC}"
else
  echo -e "${RED}✗ No data-review-markdown attributes found!${NC}"
  exit 1
fi
echo ""

# Test 2: Check for markdown formatting preservation (bold syntax)
echo "Test 2: Checking for bold markdown syntax (**text**)..."
if grep -q 'data-review-markdown.*\*\*.*\*\*' "$HTML_FILE"; then
  echo -e "${GREEN}✓ Bold markdown syntax found in embedded markdown${NC}"
  # Show example
  grep -o 'data-review-markdown="[^"]*\*\*[^"]*\*\*[^"]*"' "$HTML_FILE" | head -1 | sed 's/^/  Example: /'
else
  echo -e "${YELLOW}⚠ No bold syntax found (might be OK if document has none)${NC}"
fi
echo ""

# Test 3: Check for paragraph elements with markdown
echo "Test 3: Checking paragraph elements have markdown..."
PARA_WITH_MARKDOWN=$(grep 'data-review-type="Para"' "$HTML_FILE" | grep -c 'data-review-markdown=' || true)
TOTAL_PARAS=$(grep -c 'data-review-type="Para"' "$HTML_FILE" || true)
if [ "$PARA_WITH_MARKDOWN" -eq "$TOTAL_PARAS" ] && [ "$TOTAL_PARAS" -gt 0 ]; then
  echo -e "${GREEN}✓ All $TOTAL_PARAS paragraphs have embedded markdown${NC}"
else
  echo -e "${RED}✗ Only $PARA_WITH_MARKDOWN/$TOTAL_PARAS paragraphs have markdown${NC}"
  exit 1
fi
echo ""

# Test 4: Check for header elements with markdown
echo "Test 4: Checking header elements have markdown..."
HEADERS_WITH_MARKDOWN=$(grep 'data-review-type="Header"' "$HTML_FILE" | grep -c 'data-review-markdown=' || true)
TOTAL_HEADERS=$(grep -c 'data-review-type="Header"' "$HTML_FILE" || true)
if [ "$HEADERS_WITH_MARKDOWN" -eq "$TOTAL_HEADERS" ] && [ "$TOTAL_HEADERS" -gt 0 ]; then
  echo -e "${GREEN}✓ All $TOTAL_HEADERS headers have embedded markdown${NC}"
else
  echo -e "${RED}✗ Only $HEADERS_WITH_MARKDOWN/$TOTAL_HEADERS headers have markdown${NC}"
  exit 1
fi
echo ""

# Test 5: Check for list elements with markdown
echo "Test 5: Checking list elements have markdown..."
LISTS_WITH_MARKDOWN=$(grep 'data-review-type="BulletList\|OrderedList"' "$HTML_FILE" | grep -c 'data-review-markdown=' || true)
TOTAL_LISTS=$(grep -c 'data-review-type="BulletList\|OrderedList"' "$HTML_FILE" || true)
if [ "$LISTS_WITH_MARKDOWN" -eq "$TOTAL_LISTS" ] && [ "$TOTAL_LISTS" -gt 0 ]; then
  echo -e "${GREEN}✓ All $TOTAL_LISTS lists have embedded markdown${NC}"
else
  echo -e "${RED}✗ Only $LISTS_WITH_MARKDOWN/$TOTAL_LISTS lists have markdown${NC}"
  exit 1
fi
echo ""

# Test 6: Check that markdown is HTML-escaped
echo "Test 6: Checking markdown is properly HTML-escaped..."
if grep -q 'data-review-markdown="[^"]*&amp;[^"]*"' "$HTML_FILE" || \
   grep -q 'data-review-markdown="[^"]*&lt;[^"]*"' "$HTML_FILE" || \
   grep -q 'data-review-markdown="[^"]*&gt;[^"]*"' "$HTML_FILE"; then
  echo -e "${GREEN}✓ HTML entities are properly escaped in markdown${NC}"
else
  echo -e "${YELLOW}⚠ No HTML escaping found (might be OK if no special chars)${NC}"
fi
echo ""

# Test 7: Check for CriticMarkup syntax preservation
echo "Test 7: Checking CriticMarkup syntax preservation..."
if grep -q 'data-review-markdown="[^"]*{++\|{--\|{~~\|{>>' "$HTML_FILE"; then
  echo -e "${GREEN}✓ CriticMarkup syntax found in embedded markdown${NC}"
  # Show example
  grep -o 'data-review-markdown="[^"]*{[+\-~>][+\-~>][^"]*"' "$HTML_FILE" | head -1 | sed 's/^/  Example: /'
else
  echo -e "${YELLOW}⚠ No CriticMarkup found (might be OK if document has none)${NC}"
fi
echo ""

# Test 8: Verify markdown can be decoded
echo "Test 8: Testing markdown extraction and decoding..."
TEST_ELEMENT=$(grep -m 1 'data-review-markdown=' "$HTML_FILE" | sed 's/.*data-review-markdown="\([^"]*\)".*/\1/')
if [ -n "$TEST_ELEMENT" ]; then
  # Decode HTML entities (simple test)
  DECODED=$(echo "$TEST_ELEMENT" | sed 's/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&#39;/'"'"'/g')
  if [ ${#DECODED} -gt 0 ]; then
    echo -e "${GREEN}✓ Markdown can be extracted and decoded${NC}"
    echo "  Decoded example (first 80 chars): ${DECODED:0:80}"
  else
    echo -e "${RED}✗ Failed to decode markdown${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Could not find test element${NC}"
  exit 1
fi
echo ""

# Summary
echo "=============================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Total elements with markdown: $MARKDOWN_ATTRS"
echo "  - Paragraphs: $PARA_WITH_MARKDOWN/$TOTAL_PARAS"
echo "  - Headers: $HEADERS_WITH_MARKDOWN/$TOTAL_HEADERS"
echo "  - Lists: $LISTS_WITH_MARKDOWN/$TOTAL_LISTS"
echo ""
echo "✨ The correspondence mapping is working correctly!"
echo "   Original markdown is embedded in the HTML file."
