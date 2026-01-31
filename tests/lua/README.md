# Lua Filter Test Suite

This directory contains tests for the Quarto Review Extension's modular Lua filter.

## Overview

The extension now uses a modular Lua filter (`review-modular.lua`) that consists of 6 focused modules:
1. **path-utils** - Cross-platform path operations
2. **string-utils** - String sanitization and JSON conversion
3. **config** - Configuration loading and management
4. **project-detection** - Project root detection and source collection
5. **markdown-conversion** - Pandoc element to markdown conversion
6. **element-wrapping** - Element wrapping with review attributes

## Test Files

### `sanitize-identifier.test.lua`

Legacy test suite for the original monolithic filter's `sanitize_identifier()` function. Tests cover:

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
# Legacy sanitize-identifier tests
lua5.4 tests/lua/sanitize-identifier.test.lua

# Module tests
lua5.4 tests/lua/path-utils.test.lua
lua5.4 tests/lua/string-utils.test.lua
lua5.4 tests/lua/config.test.lua
lua5.4 tests/lua/project-detection.test.lua
lua5.4 tests/lua/markdown-conversion.test.lua
lua5.4 tests/lua/element-wrapping.test.lua
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

### `path-utils.test.lua` ✨ NEW

Comprehensive test suite for the `path-utils` module (~50 tests):

- **to_forward_slashes()**: Backslash conversion, nil handling, mixed slashes
- **normalize_path()**: Relative paths, parent refs, Windows/Unix paths, edge cases
- **join_paths()**: Path joining, nil handling, absolute paths, normalization
- **parent_directory()**: Parent extraction, root handling, Windows paths
- **make_relative()**: Relative path creation, non-matching paths, root handling
- **file_exists()**: File existence checking
- **read_file()**: File content reading, error handling
- **Cross-platform**: Windows backslashes, Unix paths, relative paths

### `string-utils.test.lua` ✨ NEW

Comprehensive test suite for the `string-utils` module (~35 tests):

- **escape_html()**: HTML entity escaping, special characters, quotes
- **deepcopy()**: Simple/nested tables, arrays, independence verification
- **table_to_json()**: JSON conversion, nested structures, arrays, booleans
- **generate_id()**: ID generation, uniqueness, prefixes
- **Edge cases**: Long strings, special characters, numeric keys

### `config.test.lua` ✨ NEW

Comprehensive test suite for the `config` module (~40 tests):

- **load_config()**: Meta loading, defaults, custom values, malformed input
- **detect_document_identifier()**: Title extraction, fallbacks, sanitization
- **build_debug_config()**: Debug configuration building, boolean flags
- **has_translation_support()**: Translation feature detection
- **debug_print()**: Debug output handling
- **build_embedded_sources_script()**: Source script generation
- **Configuration merging**: Meta precedence, defaults preservation

### `project-detection.test.lua` ✨ NEW

Comprehensive test suite for the `project-detection` module (~40 tests):

- **should_skip_directory()**: Directory filtering (.git, node_modules, etc.)
- **find_project_root()**: _quarto.yml detection, path traversal
- **get_primary_input_file()**: Input file detection from PANDOC_STATE
- **detect_project_root()**: Project root from quarto.project, environment vars
- **detect_project_root_from_extension()**: Extension path detection
- **collect_project_sources()**: Source file collection, filtering, relative paths
- **Edge cases**: Windows paths, empty strings, nil handling

### `markdown-conversion.test.lua` ✨ NEW

Comprehensive test suite for the `markdown-conversion` module (~35 tests):

- **codeblock_to_markdown()**: Code fence generation, language classes
- **Chunk options**: label, fig-cap, echo, eval formatting
- **Class filtering**: cell-, code-, quarto- prefix removal
- **Attribute filtering**: data- attribute exclusion
- **Option formatting**: Quotes, booleans, nil handling
- **Option sorting**: Priority ordering (label first)
- **Edge cases**: Empty code, nested backticks, multiline, special chars

### `element-wrapping.test.lua` ✨ NEW

Comprehensive test suite for the `element-wrapping` module (~45 tests):

- **create_filter_functions()**: Filter creation for all element types
- **Filter types**: Para, Header, CodeBlock, BulletList, OrderedList, BlockQuote, Table
- **Configuration**: enabled flag, editable_elements control, debug mode
- **Context handling**: section_stack, element_counters, processing_list flag
- **ID generation**: prefix, separator configuration
- **Edge cases**: All elements disabled, missing config fields

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

## Total Test Coverage

- **sanitize-identifier.test.lua**: 52 tests (legacy)
- **path-utils.test.lua**: ~50 tests  ✨
- **string-utils.test.lua**: ~35 tests ✨
- **config.test.lua**: ~40 tests ✨
- **project-detection.test.lua**: ~40 tests ✨
- **markdown-conversion.test.lua**: ~35 tests ✨
- **element-wrapping.test.lua**: ~45 tests ✨
- **TOTAL**: ~297 tests across 7 test files

## Related Documentation

- [review-modular.lua](../../_extensions/review/review-modular.lua) - Modular Lua filter (active)
- [review.lua](../../_extensions/review/review.lua) - Original monolithic filter (reference)
- [lib/](../../_extensions/review/lib/) - Modular Lua library
- [ARCHITECTURE.md](../../docs/dev/ARCHITECTURE.md) - System design and ID generation
- [REFACTORING_ROADMAP.md](../../docs/dev/planning/REFACTORING_ROADMAP.md) - Refactoring progress

## Contributing

When adding tests:

1. Add to the appropriate test file or create a new one
2. Include clear description
3. Test both happy path and edge cases
4. Run full suite before committing: `npm run test:lua`
5. Ensure all tests pass
6. Update test count in this README

Example test addition:

```lua
suite:add("New test case", function(s)
  local result = sanitize_identifier("input.ext")
  s:assertEqual(result, "expected", "Clear error message")
end)
```
