# Lua Filter Test Suite

This directory contains tests for the Quarto Review Extension's Lua filter (`_extensions/review/review.lua`).

## Overview

The Lua filter is responsible for:
1. Detecting the document filename from Quarto metadata
2. Sanitizing the filename to create valid HTML IDs
3. Generating deterministic element IDs based on document structure

## Test Files

### `sanitize-identifier.test.lua`

Comprehensive test suite for the `sanitize_identifier()` function. Tests cover:

- **Basic filename handling**: Extension removal, simple filenames
- **Path handling**: Single and multiple directory levels, nested paths
- **Path normalization**: Windows backslashes, relative paths (./), Quarto temp dirs
- **Character handling**: Special characters, spaces, underscores, hyphens
- **Case conversion**: Uppercase, lowercase, mixed case
- **Edge cases**: Empty strings, nil values, only extensions, leading/trailing hyphens
- **Uniqueness**: Files with same name in different directories produce different IDs
- **Real-world examples**: Complex paths from actual project structures

## Running Tests

### Prerequisites

Lua 5.4 must be installed. The devcontainer includes it automatically.

```bash
# Check if lua5.4 is available
lua5.4 -v
```

### Run All Lua Tests

```bash
npm run test:lua
```

### Run Specific Test File

```bash
lua5.4 tests/lua/sanitize-identifier.test.lua
```

## Test Format

Each test file uses a simple custom test framework with assertions:

```lua
local suite = TestSuite

suite:add("Test description", function(s)
  -- Test code
  s:assertEqual(actual, expected, "Error message")
  s:assertContains(str, substring, "Error message")
end)
```

## Test Coverage

The test suite covers:

| Category | Tests | Examples |
|----------|-------|----------|
| Basic filenames | 4 | `.qmd`, `.md`, `.ts`, `.html` |
| Paths | 3 | Single/multiple dirs, deep nesting |
| Path normalization | 9 | Quarto temps, relative markers, Windows paths |
| Special characters | 6 | Hyphens, underscores, spaces, parens |
| Case handling | 3 | Uppercase, mixed case, CamelCase |
| Edge cases | 7 | Empty, nil, whitespace, only ext |
| Uniqueness | 1 | Same filename, different dirs |
| Real-world | 4 | API docs, chapters, modules, versions |
| **Windows paths** | **5** | C: drive, spaces, mixed separators, UNC, quarto dirs |
| **Relative paths (Windows)** | **2** | `.\chapters\intro.qmd`, mixed separators |
| **Drive letter edge cases** | **2** | UNC paths, unusual paths |
| **Unicode support** | **2** | Unicode characters, emojis |
| **Absolute paths** | **2** | Unix home paths, root paths |
| **TOTAL** | **52** | Comprehensive cross-platform coverage |

## Expected Test Output

When all tests pass:

```
Running Lua Filter Test Suite

============================================================
✓ Simple filename with extension
✓ Markdown file extension
✓ TypeScript file extension
... (49 more tests)
============================================================

Results: 52 passed, 0 failed
Total: 52 tests
```

## Test Examples

### Example 1: Basic filename sanitization

```lua
sanitize_identifier("document.qmd")
-- Returns: "document"
```

### Example 2: Path preservation for uniqueness

```lua
sanitize_identifier("chapters/intro.qmd")
-- Returns: "chapters-intro"

sanitize_identifier("appendix/intro.qmd")
-- Returns: "appendix-intro"
```

### Example 3: Quarto temp directory stripping

```lua
sanitize_identifier("/tmp/quarto-input-abc123/document.qmd")
-- Returns: "document"
```

### Example 4: Special character handling

```lua
sanitize_identifier("my document (draft).qmd")
-- Returns: "my-document-draft"
```

## Integration with CI/CD

The Lua test suite is designed to run as part of the development workflow:

1. **Local development**: Run `npm run test:lua` before committing
2. **Pre-commit hooks**: Can be added to `.husky/pre-commit` if needed
3. **CI/CD pipeline**: Can be integrated into GitHub Actions

Example GitHub Actions integration:

```yaml
- name: Test Lua Filter
  run: npm run test:lua
```

## Debugging

To debug test failures, examine:

1. **Test description**: Read the test name to understand what's being tested
2. **Error message**: Shows expected vs actual value
3. **Input value**: Check the input being sanitized
4. **Regex patterns**: Verify sanitization logic in `sanitize_identifier()`

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "lua5.4: command not found" | Lua not installed | Rebuild devcontainer |
| Unexpected hyphens | Regex pattern issue | Check `sanitize_identifier()` |
| Empty result | All characters stripped | Review special char handling |

## Related Documentation

- [review.lua](../../_extensions/review/review.lua) - Main Lua filter
- [ARCHITECTURE.md](../../docs/dev/ARCHITECTURE.md) - System design and ID generation
- [ID_PREFIX_FILENAME_IMPLEMENTATION.md](../../docs/archive/ID_PREFIX_FILENAME_IMPLEMENTATION.md) - Filename-first ID strategy

## Contributing

When adding tests:

1. Add to the appropriate category section
2. Include clear description
3. Test both happy path and edge cases
4. Run full suite before committing: `npm run test:lua`
5. Ensure all 52 tests pass (or update count if adding new tests)

Example test addition:

```lua
suite:add("New test case", function(s)
  local result = sanitize_identifier("input.ext")
  s:assertEqual(result, "expected", "Clear error message")
end)
```
