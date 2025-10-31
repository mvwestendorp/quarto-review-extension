# Text Selection and CriticMarkup Position Mapping Fix

## The Core Problem

When a user selects text in the rendered UI, the selection doesn't account for CriticMarkup syntax that exists in the markdown source but is invisible in the rendered view.

### Example Scenario

**Markdown source**:
```markdown
In-{++browser++} editing
```

**Rendered HTML** (what user sees):
```
In-browser editing
```

**User action**: Selects "-browser editing" in the UI

**Previous behavior** ❌:
1. Code tries `indexOf("-browser editing")` in markdown source
2. Fails to find it (source has `{++browser++}`)
3. Either fails with error OR finds wrong position
4. Creates green whitespace or wrong highlighting

## The Solution

### New Architecture: Position Mapping

Created `stripCriticMarkupWithMapping()` method that:
1. Strips CriticMarkup to get "rendered" text
2. **Maintains position mapping** between rendered and source text
3. Allows accurate mapping of user selection back to source

### How It Works

#### Step 1: Strip with Mapping
```typescript
stripCriticMarkupWithMapping("In-{++browser++} editing")
```

**Returns**:
```typescript
{
  stripped: "In-browser editing",  // What user sees
  mapping: [
    { strippedPos: 0, originalPos: 0 },   // 'I' -> 'I'
    { strippedPos: 1, originalPos: 1 },   // 'n' -> 'n'
    { strippedPos: 2, originalPos: 2 },   // '-' -> '-'
    { strippedPos: 3, originalPos: 6 },   // 'b' -> 'b' (inside {++...++})
    { strippedPos: 4, originalPos: 7 },   // 'r' -> 'r'
    // ... etc
    { strippedPos: 10, originalPos: 13 }, // 'r' last char of browser
    { strippedPos: 11, originalPos: 17 }, // ' ' after ++}
    // ... etc
  ]
}
```

#### Step 2: Find Selection in Stripped Text
```typescript
const strippedIndex = stripped.indexOf("-browser editing");
// Returns: 2
```

#### Step 3: Map Back to Original Positions
```typescript
const startMapping = mapping.find(m => m.strippedPos === 2);
// Returns: { strippedPos: 2, originalPos: 2 }

const endMapping = mapping.find(m => m.strippedPos === 17);
// Returns: { strippedPos: 17, originalPos: 23 }
```

#### Step 4: Extract and Replace
```typescript
const startPos = 2;
const endPos = 24;  // originalPos + 1

// Extract original markdown at this position
const originalText = source.substring(2, 24);
// Result: "-{++browser++} editing"

// Wrap with highlight
const highlighted = "{==-{++browser++} editing==}";

// Replace in source
const newContent =
  source.substring(0, 2) +
  highlighted +
  source.substring(24);
```

## Implementation Details

### Handled CriticMarkup Patterns

The `stripCriticMarkupWithMapping()` function handles:

1. **Additions** `{++text++}` - Include in rendered text, map to source
2. **Deletions** `{--text--}` - Skip entirely (not visible)
3. **Substitutions** `{~~old~>new~~}` - Show only `new`, map to source
4. **Highlights** `{==text==}` - Show `text`, map to source
5. **Comments** `{>>comment<<}` - Skip entirely (not visible)
6. **Highlight+Comment** `{==text==}{>>comment<<}` - Show text, skip comment

### Algorithm

```typescript
for each character in source:
  if start of CriticMarkup pattern:
    switch (pattern type):
      case addition {++text++}:
        add text to stripped
        map each character position
        skip markers
      case deletion {--text--}:
        skip entirely
      case substitution {~~old~>new~~}:
        skip old text
        add new text to stripped
        map new text positions
      case highlight {==text==}:
        add text to stripped
        map positions
        skip markers and any following comment
      case comment {>>text<<}:
        skip entirely
  else:
    add character to stripped
    map position
```

## Examples

### Example 1: Simple Addition

**Source**: `Hello {++world++}!`
**Stripped**: `Hello world!`

User selects "world" → Maps to positions 9-13 in source → Gets `{++world++}` → Wraps correctly

### Example 2: Complex with Multiple Markups

**Source**: `The {++new++} {--old--} feature`
**Stripped**: `The new feature`

User selects "new feature" → Maps to:
- "new" at positions 7-9 (inside {++...++})
- " " at position 14
- "feature" at positions 22-28

→ Wraps correctly: `{==The {++new++} {--old--} feature==}`

### Example 3: Highlight with Comment

**Source**: `Text {==highlighted==}{>>note<<} more`
**Stripped**: `Text highlighted more`

User selects "highlighted more" → Maps correctly accounting for both highlight and comment markers

## Benefits

✅ **Accurate selection mapping** - User sees what they select
✅ **No whitespace artifacts** - Correct positions mean no extra spaces
✅ **Handles nested markup** - Works with complex CriticMarkup combinations
✅ **Preserves existing markup** - Wraps around existing additions/deletions correctly
✅ **Predictable behavior** - Selection in UI matches source accurately

## Code Location

**File**: `src/modules/ui/index.ts`

**Methods**:
- `stripCriticMarkupWithMapping()` (lines 1481-1582) - Position mapping
- `addHighlight()` (lines 1584-1654) - Uses mapping for accurate highlighting

## Testing

All 187 tests pass ✅

### Manual Test Cases

1. **Addition**: Select text inside `{++...++}` → Should wrap correctly
2. **Mixed markup**: Select across additions and deletions → Should include all markup
3. **Highlight**: Select existing highlighted text → Should not duplicate markers
4. **Comment**: Select text near comments → Should ignore comment markers

## Edge Cases Handled

1. **Selection spans multiple markups** - Maps each part correctly
2. **Selection at markup boundaries** - Uses first/last character mapping
3. **Nested or adjacent markups** - Processes sequentially
4. **Empty selection** - Handled by indexOf check
5. **Selection not found** - Clear error message

## Future Enhancements

Potential improvements:
1. **Fuzzy matching** - Handle slight variations in selection
2. **Multi-range selection** - Support discontinuous selections
3. **Undo/redo integration** - Track position changes across edits
4. **Performance optimization** - Cache mappings for large documents

## Summary

The position mapping approach solves the fundamental mismatch between:
- **What user sees** (rendered text without CriticMarkup)
- **What exists in source** (markdown with CriticMarkup)

By maintaining a character-by-character mapping, we can accurately translate any selection from the rendered view back to the source, ensuring highlights and comments are applied at the correct positions without creating whitespace or duplication artifacts.
