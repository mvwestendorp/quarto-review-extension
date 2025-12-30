# TODO: Multi-Paragraph Blockquote Segmentation (Pandoc Re-render Issue)

## Current Issue

Multi-paragraph blockquotes (with empty lines between paragraphs) are being split into separate editable segments. Each paragraph gets its own `data-review-id` instead of the entire blockquote being treated as a single segment.

## Example

Source markdown:
```markdown
> This is a blockquote. It can span multiple lines and contain other formatting.
>
> You can also have multiple paragraphs in a blockquote.
```

**Current behavior**: Creates 3 segments
- Para segment for first paragraph
- Para segment for second paragraph
- BlockQuote segment wrapping both (creating nested segments)

**Expected behavior**: Single BlockQuote segment containing all paragraphs

## Root Cause

Pandoc's filter system processes elements bottom-up by default:
1. Para elements inside the BlockQuote get wrapped as individual segments first
2. Then the BlockQuote wrapper is applied, creating nested editable divs
3. The post-processing `unwrap_nested_editable` filter should remove nested Para divs from BlockQuotes but isn't being called properly

## Files Modified (Current State)

- `_extensions/review/review-modular.lua` - Added logic to check for BlockQuote type in unwrap function
- `_extensions/review/lib/element-wrapping.lua` - Simplified (removed attempt at pre-marking)

## Attempted Solutions

1. **Pre-marking approach**: Tried to mark Para elements inside BlockQuotes before wrapping
   - Used `context.inside_blockquote` flag
   - Tried separate Pandoc-level filter pass
   - Issue: Pre-processing filter never gets called due to filter ordering

2. **Post-processing approach**: Enhanced `unwrap_nested_editable` to detect BlockQuotes
   - Added check for `data-review-type="BlockQuote"`
   - Should unwrap nested Para divs after all wrapping is done
   - Issue: Function appears to not be executing (no debug output)

## Next Steps to Investigate

1. **Pandoc `traverse='topdown'` option**:
   - Research proper syntax for topdown traversal in Pandoc Lua filters
   - May need to restructure filter return to use this correctly
   - Check Pandoc documentation for filter traversal order specification

2. **Alternative: Handle in JavaScript**:
   - Could detect and merge segments on the client side when initializing
   - Check `data-review-type` and merge adjacent Para segments inside BlockQuote

3. **Debug why `unwrap_nested_editable` isn't executing**:
   - Verify filter is properly registered in return statement
   - Check if there's a scoping issue with the function
   - Try simpler test case to ensure Div filter is working at all

## Root Cause Analysis

**CONFIRMED**: The issue occurs when Pandoc re-renders the HTML after an edit is saved:

1. **Source markdown is correct**: `> Para 1\n>\n> Para 2` (with `>` on blank line)
2. **Pandoc's `pandoc.write()` in Lua filter removes the `>`**: Outputs `> Para 1\n\n> Para 2`
3. **This gets stored in `data-review-markdown` attribute**: Without the `>`
4. **TypeScript normalization works**: Editor correctly normalizes when content goes in/out
5. **But when saved back to source and Pandoc re-renders**: Two separate blockquotes are created

## What's Working

✅ **Footnote segmentation** - Fixed with Note cleanup filter in Lua
✅ **BlockQuote nested segments** - Fixed with walk method in BlockQuote filter
✅ **TypeScript normalization** - `normalizeBlockquoteParagraphs()` works in editor
✅ **Tests passing** - All 21 tests for blockquote/footnote normalization pass

## What's NOT Working

❌ **Pandoc re-render after edit** - When Pandoc re-renders HTML after saving edits, it creates TWO separate `<blockquote>` elements instead of one because `pandoc.write()` in the Lua filter strips the `>` from blank lines

## Solution Needed

Add blockquote normalization to the Lua filter in `markdown-conversion.lua`:

1. After `pandoc.write()` converts BlockQuote to markdown
2. Before storing in `data-review-markdown` attribute
3. Apply same logic as TypeScript `normalizeBlockquoteParagraphs()`:
   - Find blank lines between blockquote lines
   - Replace them with `>` lines

This ensures the markdown stored in `data-review-markdown` is already normalized, so when Pandoc re-renders after edits, it creates ONE blockquote, not two.

## Files to Modify

**`_extensions/review/lib/markdown-conversion.lua`**
- Add `normalize_blockquote_paragraphs()` function (Lua version of TypeScript function)
- Call it in `element_to_markdown()` for BlockQuote elements
- Apply normalization AFTER `pandoc.write()` but BEFORE returning

## Additional Footnote Issue

**OBSERVED**: Footnotes also show phantom changes when saved without edits:

**Before editing**:
```html
<p>Here's a footnote reference<a href="#fn1">...</a> and another one<a href="#fn2">...</a>.</p>
```

**After saving without edits**:
- Empty deletion marker appears: `<del class="review-deletion" data-critic-type="deletion"></del>`
- Footnote definitions appear as insertions: `[^1]:` and `[^2]:`
- Malformed HTML with `</ins>` appearing inside code blocks

**Likely cause**: Similar to blockquotes, Pandoc's markdown writer changes footnote format during serialization, causing phantom changes.

## Related Work Completed

- Fixed: Blockquote diff generation issue (completed in `src/modules/changes/converters.ts`)
- Partially Fixed: Footnote segmentation (Note cleanup filter in `review-modular.lua` prevents nested wrapping)
- Fixed: BlockQuote nested segments (walk method in `element-wrapping.lua`)
- Added: TypeScript normalization functions and tests
- Test file: `tests/unit/blockquote-issue.test.ts`, `tests/unit/normalize-blockquote-paragraphs.test.ts`, `tests/unit/footnote-segmentation.test.ts`

**Note**: Unit tests pass because they test TypeScript normalization in isolation. The real issue is in Lua filter's markdown serialization via `pandoc.write()`.
