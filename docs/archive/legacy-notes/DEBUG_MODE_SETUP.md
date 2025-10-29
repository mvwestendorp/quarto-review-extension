# Debug Mode Setup - Complete Implementation Summary

## Overview

Debug mode has been fully integrated into the Quarto Review extension, allowing developers to configure debugging directly in Quarto YAML front matter.

---

## What Was Implemented

### 1. **Lua Filter Integration** ✅
- **File:** `_extensions/review/review.lua`
- **Added Functions:**
  - `build_debug_config(meta)` - Reads debug config from YAML metadata
  - `meta_to_json(value)` - Converts Pandoc metadata to JSON-compatible values
  - `table_to_json(tbl)` - Converts Lua tables to JSON strings with fallback encoding
- **Updated:** `Meta()` function to pass debug config to JavaScript

### 2. **TypeScript Configuration** ✅
- **File:** `src/main.ts`
- **Added:**
  - Debug config parameter to `QuartoReviewConfig` interface
  - Debug configuration passed to `debugLogger.setConfig()` in constructor
  - Comprehensive JSDoc comments for all config options
- **Exported:**
  - `DebugConfig` type for TypeScript users
  - All debug utilities and module exports

### 3. **Documentation** ✅
- **File:** `docs/user/DEBUG.md`
  - Complete user guide (400+ lines)
  - Configuration examples
  - Module reference
  - Troubleshooting guide
  - Common scenarios

### 4. **Example Document** ✅
- **File:** `example/debug-example.qmd`
  - Demonstrates debug configuration in YAML
  - Interactive examples for testing
  - Instructions for using Developer Console

---

## Lua Filter Debug Output

The Lua filter now includes conditional debug printing that only outputs when enabled via YAML configuration. This provides low-level insight into element processing during the Quarto render phase.

### Debug Statements

The filter includes debug output for:

1. **Nested Review Divs Detection**
   - Reports when nested review-editable divs are found and stripped
   - Helps diagnose list element wrapping issues

2. **BulletList Processing**
   - Reports when BulletLists are wrapped
   - Warns when nested BulletLists are skipped

3. **OrderedList Processing**
   - Reports when OrderedLists are wrapped
   - Warns when nested OrderedLists are skipped

4. **Table Processing**
   - Reports when Tables are wrapped for editing
   - Warns when computational tables are skipped (from code output)

### Enabling Lua Filter Debug Output

Add to your Quarto document's YAML front matter:

```yaml
---
review:
  debug: true
---
```

Or globally in `_quarto.yml`:

```yaml
metadata:
  review:
    debug: true
```

### Viewing Lua Filter Output

Lua filter debug statements appear in the **Quarto render log**, not the browser console. Run:

```bash
quarto render document.qmd
```

When `review.debug: true`, you'll see messages like:

```
DEBUG: Wrapping BulletList
DEBUG: Wrapping Table
DEBUG: Skipping nested BulletList
DEBUG: Skipping computational table (has cell-output class)
```

### Debug Output Disabled by Default

When `review.debug` is not set or set to `false`, no debug statements are output, keeping the render log clean and the filter performance optimal.

---

## How It Works

### YAML Configuration

Users add debug configuration to their Quarto document:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
      - ChangesModule
    format-timestamp: true
---
```

### Processing Flow

1. **Quarto renders document** → Reads YAML front matter
2. **Lua filter processes metadata** → Extracts `review.debug` config
3. **Filter converts to JSON** → Passes to HTML initialization
4. **JavaScript receives config** → Passes to `QuartoReview` constructor
5. **JavaScript initializes logger** → `debugLogger.setConfig()` applies settings
6. **Browser console shows output** → Formatted debug messages appear

---

## Configuration Options

### Enabled/Disabled

```yaml
review:
  debug:
    enabled: true    # or false
```

### Log Levels

```yaml
level: error    # error, warn, info, debug, trace
```

### Module Filtering

```yaml
modules:           # Only log these modules
  - UIModule
  - ChangesModule

exclude-modules:   # Don't log these modules
  - GitModule
```

### Timestamps

```yaml
format-timestamp: true    # or false
```

### Complete Example

```yaml
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
      - ChangesModule
    exclude-modules:
      - GitModule
    format-timestamp: true
```

---

## Usage Examples

### Example 1: Debug UI Issues

```yaml
---
title: "UI Troubleshooting"
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
---
```

**What you'll see:**
- UI component initialization
- Event handling
- State changes
- Rendering operations

### Example 2: Trace All Changes

```yaml
---
title: "Change Analysis"
review:
  debug:
    enabled: true
    level: trace
    modules:
      - ChangesModule
---
```

**What you'll see:**
- Every operation performed
- Content modifications
- Undo/redo events
- History management

### Example 3: Full System Debug

```yaml
---
title: "Complete System Analysis"
review:
  debug:
    enabled: true
    level: debug
    exclude-modules:
      - GitModule
---
```

**What you'll see:**
- All modules except Git
- Comprehensive overview
- All system interactions

---

## Files Modified

### 1. `_extensions/review/review.lua`
- Added `build_debug_config()` function
- Added `meta_to_json()` function
- Added `table_to_json()` function
- Added `debug_print()` conditional logging function
- Updated `Meta()` filter to use debug config
- Replaced all 7 `print()` debug statements with `debug_print()` calls
- **Lines Added:** ~150

### 2. `src/main.ts`
- Added `debug?` parameter to `QuartoReviewConfig`
- Added debug logger initialization
- Exported `DebugConfig` type
- Added comprehensive JSDoc comments
- **Lines Modified:** ~25

### 3. `typedoc.json`
- Added `src/utils/debug.ts` to entry points
- Added `logLevel: "Error"` setting
- **Lines Modified:** 3

### 4. `vite.config.ts`
- Added `@utils` alias
- **Lines Modified:** 1

### 5. `vitest.config.ts`
- Added `@utils` alias
- **Lines Modified:** 1

### 6. `tsconfig.json`
- Added `@utils/*` path alias
- **Lines Modified:** 1

---

## Files Created

### 1. `docs/user/DEBUG.md`
Complete debug mode documentation with:
- Quick start guide
- Configuration reference
- Example scenarios
- Troubleshooting guide
- Browser console output guide
- Best practices
- API reference
- **Lines:** 400+

### 2. `example/debug-example.qmd`
Interactive example document demonstrating:
- Debug YAML configuration
- How to view debug output
- Example actions to try
- Configuration explanations
- Debug level options
- **Lines:** 150+

---

## Testing

### Build Status ✅
```
✓ TypeScript compilation: Passed
✓ Vite build: 888.63 kB (gzip: 228.47 kB)
✓ TypeDoc generation: Clean (0 warnings)
✓ Extension installation: Complete
```

### Lua Filter Validation ✅
- Functions added: `build_debug_config`, `meta_to_json`, `table_to_json`
- Integration point: `Meta()` filter
- JSON encoding: Fallback implemented
- No build errors

### JavaScript Integration ✅
- Config type exported from main.ts
- Debug config passed to QuartoReview constructor
- Logger initialization working
- All modules using debug logger

---

## Browser Console Output Format

When debug mode is enabled, you'll see formatted output:

```
[DEBUG] [17:45:23.456] [UIModule] Component initialized
[INFO] [17:45:23.567] [ChangesModule] Loaded 5 operations
[WARN] [17:45:24.123] [GitModule] Git not supported
[TRACE] [17:45:24.234] [UIModule] Rendering 12 sections
[ERROR] [17:45:25.001] [MarkdownModule] Parse failed
```

### Color Coding
- 🔴 [ERROR] - Red background
- 🟠 [WARN] - Orange background
- 🔵 [INFO] - Blue background
- 🟢 [DEBUG] - Teal background
- 🟡 [TRACE] - Yellow background

---

## Troubleshooting

### Debug output not showing?
1. Verify `enabled: true` in YAML
2. Open browser DevTools Console (F12)
3. Check that module names are correct
4. Verify log level is low enough

### Too much output?
1. Use module filtering
2. Increase log level (debug → info → warn)
3. Use `exclude-modules` to reduce noise
4. Disable timestamps with `format-timestamp: false`

### Performance concerns?
- Debug mode has minimal overhead
- Only active when `enabled: true`
- Filtering prevents unnecessary processing
- Can be disabled by removing YAML config

---

## API Reference

### QuartoReviewConfig in src/main.ts

```typescript
interface QuartoReviewConfig {
  autoSave?: boolean;
  autoSaveInterval?: number;
  gitProvider?: 'github' | 'gitlab' | 'gitea' | 'local';
  enableComments?: boolean;
  enableTranslation?: boolean;
  debug?: Partial<DebugConfig>;  // NEW
}
```

### DebugConfig from src/utils/debug.ts

```typescript
interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  modules?: string[];
  excludeModules?: string[];
  formatTimestamp: boolean;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
```

### Global JavaScript API

```javascript
window.debugLogger            // Logger instance
window.debugLogger.enable(level)
window.debugLogger.disable()
window.debugLogger.setConfig(config)
window.debugLogger.getConfig()

window.printDebugHelp()       // Show help
```

---

## Documentation

- **User Guide:** `docs/user/DEBUG.md` - Complete reference for end users
- **Example:** `example/debug-example.qmd` - Working example with demo
- **This Document:** Quick implementation reference

---

## Summary

Debug mode is now fully integrated into the Quarto Review extension:

✅ **YAML Configuration** - Set debug options in document front matter
✅ **Lua Filter** - Processes config and passes to JavaScript
✅ **TypeScript Types** - Full type support and exports
✅ **JavaScript Integration** - Config applied during initialization
✅ **Documentation** - Complete user guide and examples
✅ **Testing** - Build passes all checks
✅ **No Breaking Changes** - Fully backward compatible

Users can now easily enable debugging by adding a few lines to their Quarto YAML!

---

## Quick Start for Users

1. Add to Quarto YAML:
```yaml
review:
  debug:
    enabled: true
    level: debug
```

2. Open browser console: F12
3. See debug output with timestamps and module names
4. Done! 🎉

---

## For Developers

To see an example in action:
1. Open `example/debug-example.qmd` in Quarto
2. Render as HTML
3. Open Developer Console
4. Interact with the document
5. Watch debug messages appear

---

## Notes

- All changes are backward compatible
- No external dependencies added
- Minimal performance impact when disabled
- Production-ready code
- Comprehensive error handling
