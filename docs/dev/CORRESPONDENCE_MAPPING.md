# Correspondence Mapping - Developer Documentation

## Overview

The Quarto Review Extension uses **deterministic correspondence mapping** to create stable, bidirectional links between:
1. Source markdown elements (in `.qmd` files)
2. Rendered HTML elements (in browser)
3. (Future) Translation equivalents across language versions

This document explains how the mapping works, how to verify it, and how to extend it for translations.

## Core Principle: Deterministic IDs

The system generates **structure-based IDs** that are:
- ✅ **Deterministic**: Same document → same IDs (no randomness, no heuristics)
- ✅ **Hierarchical**: Reflect document structure (sections, subsections)
- ✅ **Stable**: Minor edits don't break IDs
- ✅ **Reconstructable**: Can be regenerated from document structure

## ID Generation Algorithm

### Format

```
[prefix].[section-path].[element-type]-[counter]
```

### Examples

```
review.para-1                                    # First paragraph (no section)
review.sec-intro.para-1                          # First paragraph in Introduction
review.sec-intro.header-1                        # Introduction heading
review.sec-intro.methods.para-2                  # Second paragraph in Methods subsection
review.sec-intro.methods.results.codeblock-1     # First code block in Results sub-subsection
```

### Component Breakdown

1. **Prefix**: `review` (configurable via `_extension.yml`)
2. **Section Path**: Hierarchical section identifiers (e.g., `sec-intro.methods`)
3. **Element Type + Counter**: `para-1`, `header-2`, `bulletlist-1`, etc.

## How It Works

### Step 1: Lua Filter Processing (Quarto Render)

When Quarto renders the document, the Lua filter (`_extensions/review/review.lua`) processes each element:

```lua
-- Generates ID based on current context
function generate_id(element_type, level)
  local parts = {config.id_prefix}

  -- Add section hierarchy (e.g., ["sec-intro", "methods"])
  for _, section in ipairs(context.section_stack) do
    table.insert(parts, section)
  end

  -- Add element type and counter
  local key = element_type
  if level then
    key = key .. "-" .. level
  end

  context.element_counters[key] = (context.element_counters[key] or 0) + 1
  local counter = context.element_counters[key]

  table.insert(parts, element_type:lower() .. "-" .. counter)

  return table.concat(parts, config.id_separator)
end
```

### Step 2: HTML Output with Data Attributes

Each editable element is wrapped with data attributes, **including the original markdown**:

```html
<!-- Paragraph with formatting -->
<div class="review-editable"
     data-review-id="review.sec-intro.para-1"
     data-review-type="Para"
     data-review-origin="source"
     data-review-markdown="This is **bold** and *italic* text with a [link](https://example.com).">
  <p>This is <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>
</div>

<!-- Header -->
<div class="review-editable"
     data-review-id="review.sec-intro.methods.header-1"
     data-review-type="Header"
     data-review-level="2"
     data-review-origin="source"
     data-review-markdown="## Methods">
  <h2>Methods</h2>
</div>

<!-- Code Block with language -->
<div class="review-editable"
     data-review-id="review.sec-intro.codeblock-1"
     data-review-type="CodeBlock"
     data-review-origin="source"
     data-review-markdown="```javascript&#10;console.log(&quot;hello&quot;);&#10;```">
  <pre><code class="language-javascript">console.log("hello");</code></pre>
</div>
```

**Key Point**: The `data-review-markdown` attribute contains the **original markdown source** (HTML-escaped), enabling:
- ✅ Lossless round-trip editing (markdown → HTML → markdown)
- ✅ Preserve all formatting (bold, italic, links, code, etc.)
- ✅ Distribute HTML files only (no `.qmd` needed for reviewing)
- ✅ Edit markdown directly in browser without server

### Step 3: JavaScript Initialization

When the page loads, `ChangesModule.initializeFromDOM()` parses the HTML:

```typescript
public initializeFromDOM(): void {
  const editableElements = document.querySelectorAll('.review-editable');

  this.originalElements = Array.from(editableElements).map((elem) => {
    const id = elem.getAttribute('data-review-id') || '';
    const type = elem.getAttribute('data-review-type') || 'Para';
    const level = elem.getAttribute('data-review-level');

    const element: Element = {
      id,
      content: this.extractMarkdownContent(elem, metadata),
      metadata: {
        type: type as Element['metadata']['type'],
        level: level ? parseInt(level, 10) : undefined,
        // ...
      },
    };

    return element;
  });
}
```

This creates the correspondence:
```
HTML Element (data-review-id) ←→ JavaScript Element Object ←→ Markdown Source
```

## Distribute HTML Only Workflow

One of the key features of this extension is the ability to **distribute only the HTML file** for review, without requiring access to the `.qmd` source files or a Quarto installation.

### How It Works

1. **Author renders the document** (one time):
   ```bash
   quarto render document.qmd
   ```

2. **Author distributes the HTML file** (e.g., via email, web hosting, USB):
   ```
   document.html → Reviewer's browser
   ```

3. **Reviewer opens HTML in browser**:
   - No server required
   - No Quarto installation needed
   - No access to `.qmd` source needed
   - Just double-click the HTML file!

4. **Reviewer edits content**:
   - Click any paragraph/heading/code block
   - Edit the markdown in the modal
   - See live preview
   - Save changes (stored in-memory)

5. **Reviewer exports changes**:
   - Click "Export Changes" → Downloads `.json` file with operations
   - OR: Use git integration to commit/push changes

6. **Author imports changes**:
   - Load the `.json` operations file
   - Apply changes to original `.qmd`
   - OR: Pull changes from git

### Why This Works

The **embedded markdown** in `data-review-markdown` attributes means:
- ✅ All original content is in the HTML (no external files needed)
- ✅ Edits preserve formatting (bold, links, code, etc.)
- ✅ Changes can be exported as operation lists
- ✅ Works offline (no server calls)

### Security Note

Since the HTML embeds the original markdown, be aware that:
- The HTML file size is slightly larger (~10-20% increase)
- Anyone with the HTML can see the raw markdown source (view page source)
- This is acceptable for open review workflows
- For confidential documents, use access-controlled hosting

## Verification Process

### 1. Check Lua Filter Output

Render a document and inspect the HTML for correct attributes:

```bash
cd example
quarto render document.qmd
```

Look for elements like:

```html
<div class="review-editable"
     data-review-id="review.sec-intro.para-1"
     data-review-type="Para"
     data-review-origin="source">
```

### 2. Verify ID Determinism

Render the document twice:

```bash
quarto render document.qmd
cp _output/document.html test1.html
quarto render document.qmd
cp _output/document.html test2.html
diff test1.html test2.html
```

The `data-review-id` attributes should be **identical** between renders.

### 3. Test ID Stability

Make a minor edit (add a word to a paragraph), then re-render:

```bash
# Edit document.qmd - change one paragraph
quarto render document.qmd
```

**Expected**: IDs for unchanged elements remain the same; only edited section IDs may shift.

### 4. Verify JavaScript Initialization

Open browser console on rendered page:

```javascript
// Check that elements are initialized
document.querySelectorAll('.review-editable').length

// Inspect a specific element's data
const elem = document.querySelector('[data-review-id="review.sec-intro.para-1"]');
console.log({
  id: elem.getAttribute('data-review-id'),
  type: elem.getAttribute('data-review-type'),
  content: elem.textContent
});
```

## Current Status (as of 2025-10-10)

### ✅ Working

- **Paragraphs**: Correctly wrapped with all attributes
- **Lists (Bullet/Ordered)**: Correctly wrapped with all attributes
- **Code Blocks**: Correctly wrapped with all attributes
- **ID Generation**: Deterministic and hierarchical
- **Nested Elements**: Lists within lists work correctly

### ⚠️ Known Issues

**Issue #1: Headers wrapped in `<section>` tags instead of `<div>`**

Quarto post-processes headers into semantic `<section>` tags:

```html
<!-- Generated by Lua filter -->
<div class="review-editable" data-review-id="review.sec-intro.header-1" ...>
  <h1>Introduction</h1>
</div>

<!-- Post-processed by Quarto -->
<section id="sec-intro" class="level1"
         data-review-type="Header"
         data-review-id="review.sec-intro.header-1" ...>
  <h1>Introduction</h1>
</section>
```

**Result**: Headers are missing the `class="review-editable"` attribute, so they cannot be clicked to edit.

**Impact**: Headers are not editable in the UI.

**Potential Fix**:
1. Add `class="review-editable"` to `<section>` tags post-render (JavaScript patch)
2. Modify Lua filter to detect Quarto's section transformation
3. Use Quarto's `keep-md` option to preserve original structure

## Translation Correspondence (Future)

### Goal

Map equivalent elements across language versions:

```markdown
<!-- document_en.qmd -->
# Introduction {#sec-intro}
This is an example. {#para-1}

<!-- document_fr.qmd -->
# Introduction {#sec-intro}
Ceci est un exemple. {#para-1}
```

### Mapping Strategy

The **deterministic IDs** ensure 1:1 correspondence:

```
English                          French
├─ review.sec-intro.header-1  ←→  review.sec-intro.header-1
├─ review.sec-intro.para-1    ←→  review.sec-intro.para-1
└─ review.sec-intro.para-2    ←→  review.sec-intro.para-2
```

### Translation Workflow

1. **Render both documents** with the same ID structure
2. **Match elements by ID** (not by content)
3. **Display side-by-side** or overlay mode
4. **Track translation status** per element
5. **Sync edits** across language versions

### Benefits

- ✅ No heuristic matching (e.g., comparing text similarity)
- ✅ Handles reordered sections correctly
- ✅ Survives content edits
- ✅ Easy to implement (just ID comparison)

## API Reference

### Element Interface

```typescript
interface Element {
  id: string;                    // e.g., "review.sec-intro.para-1"
  content: string;               // Markdown content
  metadata: ElementMetadata;     // Type, level, attributes
  sourcePosition?: {             // Optional source location
    line: number;
    column: number;
  };
}

interface ElementMetadata {
  type: 'Para' | 'Header' | 'CodeBlock' | 'BulletList' | 'OrderedList' | 'BlockQuote';
  level?: number;                // For headers: 1-6
  attributes: Record<string, string>;
  classes: string[];
}
```

### Data Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `data-review-id` | string | Unique deterministic ID | `review.sec-intro.para-1` |
| `data-review-type` | string | Element type | `Para`, `Header`, `CodeBlock` |
| `data-review-level` | number | Header level (1-6) | `2` for `<h2>` |
| `data-review-markdown` | string | **Original markdown source (HTML-escaped)** | `This is **bold** text.` |
| `data-review-origin` | string | Source indicator | `source`, `user` |
| `data-review-source-line` | number | Source file line (optional) | `42` |
| `data-review-source-column` | number | Source file column (optional) | `0` |

## Testing the Mapping

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { ChangesModule } from '@/modules/changes';

describe('Correspondence Mapping', () => {
  it('should generate deterministic IDs', () => {
    // Create mock DOM
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="review.sec-intro.para-1"
           data-review-type="Para">
        <p>Test content</p>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const elements = changes.getCurrentState();
    expect(elements[0].id).toBe('review.sec-intro.para-1');
    expect(elements[0].metadata.type).toBe('Para');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('element IDs are deterministic across renders', async ({ page }) => {
  // First render
  await page.goto('http://localhost:8080/document.html');
  const ids1 = await page.locator('[data-review-id]').evaluateAll(
    elems => elems.map(e => e.getAttribute('data-review-id'))
  );

  // Re-render (simulated by reload)
  await page.reload();
  const ids2 = await page.locator('[data-review-id]').evaluateAll(
    elems => elems.map(e => e.getAttribute('data-review-id'))
  );

  // IDs should be identical
  expect(ids1).toEqual(ids2);
});
```

## Debugging Tips

### 1. Inspect Generated HTML

```bash
cd example/_output
grep -n "data-review-id" document.html | head -20
```

Look for patterns in ID structure.

### 2. Check Section Hierarchy

```bash
grep "data-review-id.*header" document.html
```

Verify section nesting is correct.

### 3. Count Elements

```bash
# Count paragraphs
grep -c "data-review-type=\"Para\"" document.html

# Count headers
grep -c "data-review-type=\"Header\"" document.html
```

### 4. Browser Console

```javascript
// Get all IDs
const ids = Array.from(document.querySelectorAll('[data-review-id]'))
  .map(el => el.getAttribute('data-review-id'));
console.table(ids);

// Check for duplicates
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
console.log('Duplicates:', duplicates);
```

## Configuration

### Lua Filter Config (`_extension.yml`)

```yaml
review:
  id-prefix: "review"           # Change to your prefix
  id-separator: "."             # Change separator (e.g., "-", "_")
  editable-elements:            # Which elements to wrap
    - Para
    - Header
    - CodeBlock
    - BulletList
    - OrderedList
    - BlockQuote
```

### JavaScript Config

```html
<div data-review data-review-config='{
  "autoSave": false,
  "enableComments": true,
  "enableTranslation": false
}'></div>
```

## Limitations

1. **Insertion Order Dependency**: Adding a paragraph before `para-5` will renumber all subsequent paragraphs
2. **Section Renaming**: Changing a section ID breaks correspondence for nested elements
3. **Quarto Post-Processing**: Some transformations (like headers → sections) require workarounds
4. **No Content Hashing**: IDs don't include content hash, so rearranged content keeps its ID

## Future Improvements

1. **Content-Aware IDs**: Include hash of first N characters for stability
2. **Explicit ID Attributes**: Allow manual ID specification in markdown
3. **ID Migration Tool**: Handle document restructuring with ID preservation
4. **Visual Diff**: Show changes in ID structure across versions

## References

- [Lua Filter Documentation](../../_extensions/review/review.lua)
- [Changes Module](../../src/modules/changes/index.ts)
- [Architecture Overview](ARCHITECTURE.md)
- [Quarto Extensions Guide](https://quarto.org/docs/extensions/)
