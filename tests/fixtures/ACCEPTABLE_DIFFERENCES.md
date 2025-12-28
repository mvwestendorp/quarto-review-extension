# Acceptable Differences Between Pandoc and Remark Rendering

This document catalogs the known and acceptable differences between Quarto/Pandoc rendering and the Remark/Unified pipeline used for re-rendering after edits.

## CriticMarkup Processing

**Difference**: Pandoc renders literal CriticMarkup syntax, while Remark converts it to HTML

**Pandoc Output**:
```html
{++new text++}
```

**Remark Output**:
```html
<ins class="critic-addition">new text</ins>
```

**Why This Is Acceptable**:
- CriticMarkup is an **extension feature** not part of Pandoc
- Pandoc treats `{++...++}` as literal text
- Remark preprocesses CriticMarkup as intended by the extension
- The visual result in Remark is **correct** (shows tracked changes)

**Test Strategy**: Skip direct HTML comparison for elements containing CriticMarkup. Instead, verify:
- CriticMarkup markers are converted to appropriate HTML classes
- Content inside markers is rendered correctly (math, attributes, etc.)

## KaTeX Math Rendering

**Difference**: Internal HTML structure may vary between KaTeX versions

**Pandoc Output** (via MathJax or older KaTeX):
```html
<span class="math inline">\(E = mc^2\)</span>
```

**Remark Output** (via rehype-katex):
```html
<span class="katex"><span class="katex-html">...</span></span>
```

**Why This Is Acceptable**:
- Different math rendering libraries/versions
- Visual output is equivalent
- Both render LaTeX correctly

**Test Strategy**: Strip KaTeX internals and just verify presence of `.katex` class

## Display Math Context

**Difference**: Display math may render inline in some contexts

**Known Limitation**: remark-math has limitations with display math context

**Test Strategy**: Verify math is rendered (not literal), even if block vs inline differs

## Footnote References

**Difference**: Footnote HTML structure may differ

**Pandoc Output**:
```html
<a href="#fn1" class="footnote-ref" id="fnref1" role="doc-noteref"><sup>1</sup></a>
```

**Remark Output** (via remark-gfm):
```html
<sup><a href="#user-content-fn-1" id="user-content-fnref-1">1</a></sup>
```

**Why This Is Acceptable**:
- Different footnote implementations
- Both create functional footnote links
- Visual result is similar

**Test Strategy**: Verify footnote references are present, not exact HTML match

## Whitespace Normalization

**Difference**: Varying whitespace between tags

**Why This Is Acceptable**:
- Semantic meaning is unchanged
- Browser rendering is identical

**Test Strategy**: Normalize whitespace before comparison

## Summary

The parity tests serve as **regression detection** rather than exact HTML matching. The goal is to ensure that:

1. **Math is rendered** (not literal LaTeX)
2. **Pandoc attributes are converted** (not literal braces)
3. **CriticMarkup is processed** (shows tracked changes)
4. **Content is preserved** (no data loss)
5. **Visual output is equivalent** (not necessarily identical HTML)

When differences are found:
1. Check if they're documented here as acceptable
2. Verify the visual output is correct
3. Update normalization logic if needed
4. Add new acceptable difference if warranted
