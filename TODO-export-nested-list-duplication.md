# Export Duplication Bug - Nested Lists

## Issue

When exporting a document with nested lists, the exported markdown contains duplicated content. Nested list items appear twice:
1. Once inside their parent list's markdown (correct)
2. Again as standalone items at the end of the file (incorrect)

## Example

After editing "Nested item 1" to "Test", the export produces:

```markdown
# First occurrence (correct)
- First item
- Second item
  - Test
  - Nested item 2
    - Deeply nested item

# Second occurrence (incorrect - duplicated)
-   Nested item 1
-   Nested item 2
    -   Deeply nested item
```

## Root Cause

1. **Pandoc wraps nested lists separately**: Each nested list gets its own `<div data-review-id="..." data-review-markdown="...">` wrapper in the DOM
2. **Export iterates all elements**: The `buildBodyFromElements()` function in `src/modules/export/index.ts` exports ALL elements with `data-review-id`
3. **Parent markdown includes children**: The parent list's `data-review-markdown` attribute already contains the complete markdown INCLUDING nested items
4. **No parent/child filtering**: Export doesn't check if an element is a child of another element being exported

## Location

File: `src/modules/export/index.ts`
Function: `buildBodyFromElements()` (line 772)

```typescript
private buildBodyFromElements(
  elements: ElementSnapshot[],
  format: ExportFormat,
  commentMap: Map<string, CommentMarkupBlock>,
  operationsByElement: Map<string, Operation[]>
): string {
  const sections = elements
    .filter((element) => {
      const type = element.metadata?.type;
      return type !== 'DocumentTitle' && type !== 'Title';
    })
    .map((element) =>
      this.renderElementContent(
        element,
        format,
        commentMap,
        operationsByElement
      )
    )
    .filter((segment) => segment && segment.trim().length > 0);

  return sections.join('\n\n');
}
```

## Solution Approach

### Option 1: Filter out child elements
Build a tree of element relationships and skip exporting elements that are children of other elements:

```typescript
private buildBodyFromElements(...): string {
  // 1. Build parent/child map from DOM structure
  const childElements = this.identifyChildElements(elements);

  // 2. Filter out children that are already in parent's markdown
  const topLevelElements = elements.filter(el => !childElements.has(el.id));

  // 3. Export only top-level elements
  const sections = topLevelElements.map(...)...
}
```

### Option 2: Parse parent markdown to exclude children
When exporting a parent element, detect and exclude any child elements from the final output:

```typescript
private renderElementContent(...): string {
  let content = element.content;

  // If this element has child elements in DOM, they're already in the markdown
  // No additional processing needed - just export the markdown as-is

  return content;
}
```

### Option 3: Mark nested elements in Lua filter
Add a flag to nested elements in the Pandoc Lua filter so export can skip them:

```lua
-- In element-wrapping.lua
if is_nested_in_list then
  div.attributes["data-review-nested"] = "true"
end
```

```typescript
// In export
const sections = elements
  .filter((element) => {
    if (element.metadata?.nested) return false; // Skip nested
    return type !== 'DocumentTitle' && type !== 'Title';
  })
```

## Testing

Create a test that:
1. Exports a document with nested lists after editing
2. Verifies each list item appears exactly once
3. Verifies nested structure is preserved
4. Verifies edits are reflected correctly

## Priority

**Medium** - The export works but produces duplicated content. The diff generation and UI display are correct.

## Related Files

- `src/modules/export/index.ts` - Export logic
- `_extensions/review/lib/element-wrapping.lua` - Element wrapping in Pandoc
- Tests: Create `tests/unit/export-duplication.test.ts`
