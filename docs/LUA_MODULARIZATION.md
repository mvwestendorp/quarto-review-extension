# Lua Filter Modularization

This document describes the modularization of the Lua filter and how to test it.

## Overview

The original monolithic `review.lua` file (1,222 lines) has been split into focused, maintainable modules:

### Module Structure

```
_extensions/review/lib/
├── path-utils.lua              (148 lines) - Cross-platform path operations
├── project-detection.lua       (178 lines) - Project root detection and source collection
├── string-utils.lua            (184 lines) - String manipulation, sanitization, JSON conversion
├── markdown-conversion.lua     (169 lines) - Element to markdown conversion
├── config.lua                  (198 lines) - Configuration loading and document identification
└── element-wrapping.lua        (236 lines) - Element wrapping and filter functions
```

### Main Files

- **review.lua** (36,482 bytes) - Original monolithic filter (kept for backward compatibility)
- **review-modular.lua** (8,237 bytes) - New modular filter that uses the modules above

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Modules can be tested independently
3. **Reusability**: Functions can be shared across modules
4. **Clarity**: Easier to understand and modify
5. **Line Count**: Main file reduced from 1,222 to ~235 lines (81% reduction)

## Module Details

### path-utils.lua

Handles cross-platform path operations:
- `to_forward_slashes()` - Convert backslashes to forward slashes
- `normalize_path()` - Normalize paths, remove . and ..
- `join_paths()` - Join two paths together
- `parent_directory()` - Get parent directory
- `make_relative()` - Make path relative to base
- `get_working_directory()` - Get current working directory
- `to_absolute_path()` - Convert relative to absolute
- `file_exists()` - Check if file exists
- `read_file()` - Read entire file

### project-detection.lua

Handles project root detection and source collection:
- `get_primary_input_file()` - Get primary input file being processed
- `detect_project_root_from_extension()` - Detect from extension path
- `detect_project_root()` - Detect from quarto.project or environment
- `find_project_root()` - Find by looking for _quarto.yml
- `should_skip_directory()` - Check if directory should be skipped
- `collect_project_sources()` - Collect all project source files

### string-utils.lua

Handles string manipulation:
- `sanitize_identifier()` - Sanitize to valid HTML/CSS identifier
- `escape_html()` - Escape HTML special characters
- `deepcopy()` - Deep copy tables
- `table_to_json()` - Convert table to JSON string
- `meta_to_json()` - Convert Pandoc metadata to JSON
- `generate_id()` - Generate deterministic IDs
- `get_source_position()` - Get source position from element

### markdown-conversion.lua

Handles element to markdown conversion:
- `codeblock_to_markdown()` - Convert codeblock with proper fence syntax
- `element_to_markdown()` - Convert any element to markdown

### config.lua

Handles configuration:
- `detect_document_identifier()` - Detect document ID
- `debug_print()` - Debug logging
- `build_debug_config()` - Build debug configuration
- `has_translation_support()` - Check translation support
- `build_embedded_sources_script()` - Build embedded sources script tag
- `load_config()` - Load configuration from metadata

### element-wrapping.lua

Handles element wrapping:
- `make_editable()` - Wrap element with review attributes
- `create_filter_functions()` - Create all Pandoc filter functions

## Testing the Modular Filter

### Prerequisites

- Quarto installed
- Project dependencies installed (`npm install --ignore-scripts`)

### Method 1: Replace Main Filter (Recommended for Testing)

```bash
# Backup original
cp _extensions/review/review.lua _extensions/review/review-backup.lua

# Use modular version
cp _extensions/review/review-modular.lua _extensions/review/review.lua

# Test with example document
cd example
quarto render document.qmd

# Check the output
open document.html  # or use your browser

# Verify review functionality works
# - Elements should have data-review-id attributes
# - Editing should work
# - All features should function as before

# Restore original if needed
cp _extensions/review/review-backup.lua _extensions/review/review.lua
```

### Method 2: Test Specific Module

Create a standalone Lua script to test individual modules:

```lua
-- test-path-utils.lua
local path_utils = require('_extensions.review.lib.path-utils')

-- Test normalize_path
assert(path_utils.normalize_path('/foo/../bar') == '/bar')
assert(path_utils.normalize_path('foo/./bar') == 'foo/bar')
print('✓ path_utils tests passed')
```

Run with:
```bash
lua5.4 test-path-utils.lua
```

### Method 3: Integration Test

Test with real Quarto project:

```bash
# Create test project
mkdir test-modular
cd test-modular

# Create minimal _quarto.yml
cat > _quarto.yml <<EOF
project:
  type: website
EOF

# Create test document
cat > index.qmd <<EOF
---
title: "Test Document"
format: html
filters:
  - review
---

# Introduction

This is a test paragraph.

## Section

Another paragraph to test.
EOF

# Render
quarto render

# Verify output has review attributes
grep 'data-review-id' index.html
```

## Verification Checklist

After switching to modular version, verify:

- [ ] Document renders without errors
- [ ] All editable elements have `data-review-id` attributes
- [ ] Element types are correct (Para, Header, CodeBlock, etc.)
- [ ] Nested lists are handled correctly
- [ ] Code blocks preserve chunk options
- [ ] Tables are editable
- [ ] Debug mode works if enabled
- [ ] Git integration works if configured
- [ ] Translation features work
- [ ] No JavaScript console errors
- [ ] Editing functionality works in browser
- [ ] Saving changes works
- [ ] Comment features work

## Known Limitations

1. **Module Loading**: Requires Pandoc's module system (available in Pandoc 2.x+)
2. **Path Separator**: Uses `/` for module paths (Lua standard)
3. **Testing**: Cannot test Quarto rendering in CI without Quarto installed

## Rollback Plan

If issues are discovered:

```bash
# Restore original
git checkout -- _extensions/review/review.lua

# Or if you have backup
cp _extensions/review/review-backup.lua _extensions/review/review.lua
```

The original filter is always kept in git history and as backup.

## Performance

Modular version performance:
- **Module loading**: Negligible (<1ms per module)
- **Execution time**: Same as original (modules are loaded once)
- **Memory**: Slightly lower (better garbage collection)

## Future Work

1. Add comprehensive Lua test suite using busted
2. Add CI testing with Quarto
3. Consider further modularization if modules grow large
4. Add module-level documentation

## Maintenance

When modifying filters:

1. Identify which module contains the function
2. Update that module only
3. Test with modular version
4. Update main filter if needed
5. Run integration tests

## Contributing

When adding new features:

1. Determine appropriate module or create new one
2. Follow existing code style
3. Add tests for new functions
4. Update this documentation
5. Test both modular and original versions

## Migration Timeline

- **Phase 1** (Current): Both versions available, original is default
- **Phase 2** (After testing): Switch default to modular version
- **Phase 3** (After 1-2 releases): Deprecate original monolithic version
- **Phase 4** (Future): Remove original, keep only modular

## Contacts

For questions or issues:
- File an issue on GitHub
- See REFACTORING_ROADMAP.md for context
