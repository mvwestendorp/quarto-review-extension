# No HTML to Markdown Conversion

## Design Principle

**The Quarto Review Extension NEVER converts HTML to markdown.**

This is a core architectural decision that ensures:
- ✅ Lossless round-trip editing (no information loss)
- ✅ Preserves all markdown formatting (bold, links, code, etc.)
- ✅ No parsing ambiguity or heuristics
- ✅ Simple, deterministic behavior

## How It Works

### 1. Markdown Embedding (Lua Filter)

When Quarto renders a document, the Lua filter embeds the **original markdown** in HTML attributes:

```html
<div class="review-editable"
     data-review-id="review.sec-intro.para-1"
     data-review-markdown="This is **bold** and *italic* text.">
  <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
</div>
```

The `data-review-markdown` attribute contains the original markdown source (HTML-escaped).

### 2. Reading Embedded Markdown (JavaScript)

When the JavaScript initializes, it reads **only** from the `data-review-markdown` attribute:

```typescript
// src/modules/changes/index.ts
private extractMarkdownContent(elem: globalThis.Element): string {
  const embeddedMarkdown = elem.getAttribute('data-review-markdown');

  if (!embeddedMarkdown) {
    throw new Error('Missing data-review-markdown attribute');
  }

  return this.unescapeHtml(embeddedMarkdown);
}
```

If the attribute is missing, it **throws an error** (document not rendered with extension).

### 3. Editing Flow

```
User edits in modal → Types markdown → Saves
                                        ↓
                            Changes module stores markdown
                                        ↓
                            toMarkdown() returns full document
```

At no point is HTML parsed or converted back to markdown.

### 4. Markdown to HTML (One Direction Only)

The `MarkdownModule` only converts **markdown → HTML** for preview/display:

```typescript
// ✅ Allowed: markdown → HTML
public render(markdown: string): string {
  return this.md.render(markdown);
}

// ❌ Does NOT exist: HTML → markdown
// No such method exists in the codebase
```

## Verification

### Automated Tests

**Shell Script Test**: `tests/verify-markdown-embedding.sh`

```bash
./tests/verify-markdown-embedding.sh
```

Checks:
- All editable elements have `data-review-markdown` attribute
- Markdown formatting is preserved (bold, links, etc.)
- HTML entities are properly escaped
- CriticMarkup syntax is preserved

**Unit Test**: `tests/unit/no-html-conversion.test.ts`

```bash
npm test tests/unit/no-html-conversion.test.ts
```

Verifies:
- ✅ Missing `data-review-markdown` throws error
- ✅ `toMarkdown()` returns markdown, not HTML
- ✅ No HTML→markdown methods exist
- ✅ All element types require embedded markdown
- ✅ Edits preserve markdown format

### Manual Verification

```bash
# Render document
cd example
quarto render document.qmd

# Check HTML output
grep -o 'data-review-markdown="[^"]*\*\*[^"]*"' _output/document.html | head -5

# Should show embedded markdown like:
# data-review-markdown="This is **bold** text"
```

## Code Locations

### Reading Embedded Markdown

1. **Changes Module** (`src/modules/changes/index.ts:72-85`)
   ```typescript
   private extractMarkdownContent(elem: globalThis.Element): string {
     const embeddedMarkdown = elem.getAttribute('data-review-markdown');
     if (!embeddedMarkdown) {
       throw new Error('Missing data-review-markdown attribute');
     }
     return this.unescapeHtml(embeddedMarkdown);
   }
   ```

2. **UI Module** (`src/modules/ui/index.ts:243-255`)
   ```typescript
   private getElementContent(element: globalThis.Element): string {
     const embeddedMarkdown = element.getAttribute('data-review-markdown');
     if (!embeddedMarkdown) {
       throw new Error('Missing data-review-markdown attribute');
     }
     return this.unescapeHtml(embeddedMarkdown);
   }
   ```

### Markdown Output

**Changes Module** (`src/modules/changes/index.ts:361-364`)
```typescript
public toMarkdown(): string {
  const elements = this.getCurrentState();
  return elements.map((e) => e.content).join('\n\n');
}
```

This returns **only markdown** (no HTML parsing).

## What About...?

### Q: What about `sanitize()` and `toPlainText()` in MarkdownModule?

**A:** These are legitimate helpers:

```typescript
// ✅ Sanitize: HTML → safer HTML (removes scripts/events)
public sanitize(html: string): string {
  // Removes dangerous tags/attributes
}

// ✅ Plain text: markdown → HTML → plain text
public toPlainText(markdown: string): string {
  const html = this.render(markdown); // markdown → HTML
  return temp.textContent || '';      // HTML → text (not markdown!)
}
```

Neither of these is HTML→markdown conversion.

### Q: What if someone tries to add HTML→markdown conversion?

**A:** The unit tests will fail:

```typescript
// This test ensures no HTML→markdown methods exist
expect(markdown.htmlToMarkdown).toBeUndefined();
expect(markdown.parseHtml).toBeUndefined();
expect(markdown.fromHtml).toBeUndefined();
```

### Q: What if the HTML file is hand-edited (no embedded markdown)?

**A:** It throws a clear error:

```
Error: Missing data-review-markdown attribute on element review.sec-intro.para-1.
The document was not rendered with the Quarto review extension.
Please render with: quarto render --filter review
```

## Benefits of This Approach

1. **Lossless Editing**: No information is lost between edits
2. **No Ambiguity**: No need to guess markdown syntax from HTML
3. **Format Preservation**: Bold, italic, links, code all preserved exactly
4. **Simple Architecture**: One-way flow (markdown → HTML), no parsing
5. **Distribute HTML Only**: Original markdown embedded in file
6. **Error Detection**: Missing attribute = clear error message

## Related Documentation

- [CORRESPONDENCE_MAPPING.md](CORRESPONDENCE_MAPPING.md) - How elements are tracked
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system design
- [tests/verify-markdown-embedding.sh](tests/verify-markdown-embedding.sh) - Shell test
- [tests/unit/no-html-conversion.test.ts](tests/unit/no-html-conversion.test.ts) - Unit test

## Enforcement

To ensure this principle is maintained:

1. **Run tests regularly**:
   ```bash
   npm test tests/unit/no-html-conversion.test.ts
   ./tests/verify-markdown-embedding.sh
   ```

2. **Code review checklist**:
   - [ ] No `innerHTML` or `textContent` used to extract markdown
   - [ ] All markdown reading uses `data-review-markdown` attribute
   - [ ] No HTML parsing libraries added (turndown, etc.)
   - [ ] `toMarkdown()` only uses `element.content` (which is markdown)

3. **CI/CD**:
   Both tests run automatically on every commit.

## Migration Note

If you have existing HTML files without embedded markdown, they need to be re-rendered:

```bash
# Re-render with extension
quarto render document.qmd --filter review
```

The extension will NOT work with old HTML files that lack `data-review-markdown` attributes.
