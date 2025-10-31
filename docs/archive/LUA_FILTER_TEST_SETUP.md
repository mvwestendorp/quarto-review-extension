# Lua Filter Test Suite Setup

## Summary

A comprehensive test suite for the Lua filter (`_extensions/review/review.lua`) has been created to validate the filename-first ID prefix implementation.

## Changes Made

### 1. DevContainer Update

**File**: `.devcontainer/Dockerfile`

Added Lua 5.4 to the devcontainer so tests can run locally:

```dockerfile
# Lua for testing Lua filter
lua5.4 \
```

This enables running Lua filter tests during development and in CI/CD pipelines.

### 2. Lua Test Suite

**File**: `tests/lua/sanitize-identifier.test.lua`

A comprehensive test suite with 37 test cases covering:

- **Basic filename handling** (4 tests)
  - Simple filenames with various extensions (.qmd, .md, .ts, .html)
  - Extension removal validation

- **Path handling** (3 tests)
  - Single directory level: `chapters/intro.qmd` → `chapters-intro`
  - Multiple directory levels: `docs/api/reference.qmd` → `docs-api-reference`
  - Deep nesting: `src/modules/ui/components/editor.ts` → `src-modules-ui-components-editor`

- **Path normalization** (9 tests)
  - Relative paths: `./document.qmd` → `document`
  - Windows paths: `docs\api\reference.qmd` → `docs-api-reference`
  - Quarto temporary directories: `/tmp/quarto-input-abc123/document.qmd` → `document`
  - Mixed separators

- **Character handling** (6 tests)
  - Hyphens preserved: `my-document.qmd` → `my-document`
  - Underscores converted: `my_document.qmd` → `my-document`
  - Spaces converted: `my document.qmd` → `my-document`
  - Special characters removed: `document (draft).qmd` → `document-draft`

- **Case conversion** (3 tests)
  - Uppercase → lowercase: `DOCUMENT.QMD` → `document`
  - Mixed case handling: `My-Document.QMD` → `my-document`
  - CamelCase: `MyDocument.qmd` → `mydocument`

- **Edge cases** (7 tests)
  - Empty strings
  - Nil values
  - Whitespace only
  - Only extensions (falls back to "document")
  - Multiple dots
  - Leading/trailing hyphens
  - Multiple consecutive hyphens

- **Uniqueness validation** (1 test)
  - Files with same name in different directories produce different IDs
  - `chapters/intro.qmd` ≠ `appendix/intro.qmd`

- **Real-world examples** (4 tests)
  - API documentation paths
  - Chapters with spaces and hyphens
  - Source code module structures
  - Version-numbered documentation

### 3. NPM Script

**File**: `package.json`

Added test command:

```json
"test:lua": "lua5.4 tests/lua/sanitize-identifier.test.lua"
```

Run with: `npm run test:lua`

### 4. Test Documentation

**File**: `tests/lua/README.md`

Comprehensive documentation including:
- Test suite overview
- Running instructions
- Test coverage details
- Example outputs
- Debugging guide
- CI/CD integration notes

## How to Use

### Rebuild DevContainer

After updating the Dockerfile, rebuild the devcontainer:

1. Open Command Palette: `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type "Rebuild Container"
3. Wait for rebuild to complete

Or from terminal:
```bash
devcontainer build --workspace-folder .
```

### Run Tests

Once devcontainer is rebuilt:

```bash
# Run Lua filter tests
npm run test:lua

# Expected output (all tests passing)
Running Lua Filter Test Suite

============================================================
✓ Simple filename with extension
✓ Markdown file extension
... (35 more tests)
============================================================

Results: 37 passed, 0 failed
Total: 37 tests
```

## Test Quality Metrics

- **Total Tests**: 37
- **Categories**: 9 major areas
- **Edge Cases**: 7+ different edge cases covered
- **Real-world Examples**: 4 project-relevant scenarios
- **Uniqueness Validation**: Ensures files in different directories get unique IDs

## What's Being Tested

The test suite validates the `sanitize_identifier()` function from the Lua filter:

```lua
local function sanitize_identifier(value)
  -- 1. Normalize path separators
  -- 2. Strip Quarto temporary directories
  -- 3. Strip relative path markers (./)
  -- 4. Remove file extensions
  -- 5. Convert / to - for directory structure
  -- 6. Sanitize to valid ID characters (lowercase, hyphens)
  -- 7. Clean up consecutive hyphens
  -- 8. Remove leading/trailing hyphens
  -- 9. Fallback to 'document' if empty
end
```

## Next Steps

1. **Rebuild devcontainer** to install Lua 5.4
2. **Run test suite**: `npm run test:lua`
3. **Verify all 37 tests pass**
4. **Test actual rendering**: Render an example document and verify `data-review-id` attributes contain the filename prefix

## Files Modified/Created

| File | Change |
|------|--------|
| `.devcontainer/Dockerfile` | Added `lua5.4` package |
| `tests/lua/sanitize-identifier.test.lua` | Created (37 tests) |
| `tests/lua/README.md` | Created (test documentation) |
| `package.json` | Added `test:lua` script |

## Known Issues

**The filename prefix feature doesn't work yet** because:

1. The Lua filter code removes the fallback to `meta.title`, but
2. The `detect_document_identifier()` function returns `nil` when file paths aren't available, and
3. Tests only validate the `sanitize_identifier()` function, not the full ID generation pipeline

The test suite validates that the sanitization logic is correct. The actual file path detection from Quarto needs to be verified by:
- Rendering a document with the extension
- Inspecting the HTML to check `data-review-id` attributes
- Verifying they use the actual filename prefix

## Related Documentation

- [ID_PREFIX_FILENAME_IMPLEMENTATION.md](./ID_PREFIX_FILENAME_IMPLEMENTATION.md) - Feature design and implementation details
- [tests/lua/README.md](../../tests/lua/README.md) - Test suite documentation
- [review.lua](../../_extensions/review/review.lua) - Lua filter implementation
