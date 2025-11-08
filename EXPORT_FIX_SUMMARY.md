# Export Fix: Prevent Creating Extra Files with Inferred Filenames

## Problem

In multi-page Quarto projects, when exporting changes:
- **Expected**: Export files for each page that has changes, using their original filenames
- **Actual**: Extra file created with an inferred filename that doesn't correspond to any actual source file

**Example**:
- Project has files: `index.qmd`, `about.html`, `debug-example.html`
- Changes made on multiple pages (index, about, debug-example)
- Export downloaded includes:
  - Original files (index.qmd, about.qmd, debug-example.qmd) ✅
  - **Extra file**: `workspaces-quarto-review-extension-example-output-debug-example.qmd` ❌

The extra file is created because:
1. Export logic detects multi-page changes (multiple page prefixes)
2. It creates inferred filenames from page prefixes using `inferQmdFilenameFromPagePrefix()`
3. But these inferred filenames don't match actual source files
4. Creates new files instead of updating the original files

## Root Cause

`collectFilesMultiPage()` was generating inferred filenames for page prefixes without verifying they correspond to actual source files in the project.

## Solution

### Change 1: Map Page Prefixes to Source Files
Added logic to map each page prefix to its actual source file:

```typescript
const pageToSourceFile = new Map<string, string>();
for (const source of context.sources) {
  // Try to match page prefix to source filename
  const inferredFilename = inferQmdFilenameFromPagePrefix(pagePrefix);
  if (source.filename === inferredFilename || source.filename.includes(pagePrefix)) {
    pageToSourceFile.set(pagePrefix, source.filename);
  }
}
```

### Change 2: Only Export Pages with Actual Source Files
Skip pages that don't have a source file mapping:

```typescript
const sourceFilename = pageToSourceFile.get(pagePrefix);

// Skip pages without a source file mapping (don't create inferred names)
if (!sourceFilename) {
  logger.warn('No source file found for page prefix, skipping export', {
    pagePrefix,
    availableSources: context.sources.map((s) => s.filename),
  });
  continue;
}

// Use the actual source filename, not inferred
files.push({
  filename: sourceFilename,  // ← Actual source filename
  content: pageContent,
  origin: 'active-document',
  primary: files.length === 0,
});
```

### Change 3: Fallback for Tests/Edge Cases
If multi-page changes are detected but no source files are available (which can happen in tests or when git isn't available), fall back to single-page export:

```typescript
if (hasMultiPageChanges) {
  const hasSourceFiles = context.sources.some(
    (s) => this.isQmdFile(s.filename) || this.isMdFile(s.filename)
  );

  if (hasSourceFiles) {
    return this.collectFilesMultiPage(format, context);
  }
  // Fall back to single-page if no sources available
}

return this.collectFilesSinglePage(primaryFilename, format, context);
```

## Files Modified

- **src/modules/export/index.ts**:
  - Enhanced `collectFiles()` with fallback logic (lines 206-241)
  - Enhanced `collectFilesMultiPage()` with page-to-source mapping (lines 312-382)

## Tests

✅ All export tests pass:
- `tests/unit/changes-export.integration.test.ts` (5 tests)
- `tests/unit/export-service.test.ts` (7 tests)
- `tests/integration/export-changes.integration.test.ts` (19 tests)
- `tests/unit/translation-export.test.ts` (19 tests)

## Result

**Before Fix**:
```
Export ZIP contains:
├── index.qmd (original file with changes)
├── about.qmd (original file with changes)
├── debug-example.qmd (original file with changes)
└── workspaces-quarto-review-extension-example-output-debug-example.qmd ❌ (extra)
```

**After Fix**:
```
Export ZIP contains:
├── index.qmd (with changes)
├── about.qmd (with changes)
└── debug-example.qmd (with changes)
```

Only files that actually exist in the project are exported, using their original filenames.
