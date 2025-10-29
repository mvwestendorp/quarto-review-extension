# Debug Mode Guide

Debug mode helps developers and power users troubleshoot issues and monitor the behavior of the Quarto Review extension in real-time.

## Quick Start

Add debug configuration to your Quarto document's YAML front matter:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
---
```

Then open your browser's Developer Console (F12 or Cmd+Option+I) to see debug output.

---

## Configuration Options

### Basic Setup

The simplest debug configuration:

```yaml
review:
  debug:
    enabled: true
```

This enables debug mode with the default `info` log level.

### Log Levels

Set the verbosity level for debug output:

```yaml
review:
  debug:
    enabled: true
    level: error      # Only show errors
```

**Available Levels** (from least to most verbose):
- `error` - Errors only
- `warn` - Errors and warnings
- `info` - General information (default)
- `debug` - Detailed debugging information
- `trace` - Most verbose (includes all tracing)

### Example: Different Log Levels

```yaml
---
title: "Debugging UI Issues"
review:
  debug:
    enabled: true
    level: debug      # Show detailed debugging info
---
```

```yaml
---
title: "Troubleshooting Changes"
review:
  debug:
    enabled: true
    level: trace      # Show everything
---
```

---

## Module-Specific Filtering

### Log Only Specific Modules

Focus on specific parts of the extension:

```yaml
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
      - ChangesModule
```

**Available Modules:**
- `UIModule` - User interface and editing
- `ChangesModule` - Change tracking and management
- `CommentsModule` - Comments functionality
- `MarkdownModule` - Markdown rendering
- `GitModule` - Version control operations
- `UserModule` - Authentication and permissions
- `KeyboardShortcuts` - Keyboard command handling
- `DocumentSearch` - Find and search functionality
- `DebugLogger` - Debug system itself

### Exclude Specific Modules

Filter out noisy modules:

```yaml
review:
  debug:
    enabled: true
    level: debug
    exclude-modules:
      - GitModule      # Don't log git operations
      - KeyboardShortcuts
```

### Combined Filtering

Include specific modules AND exclude others:

```yaml
review:
  debug:
    enabled: true
    level: trace
    modules:
      - UIModule
      - ChangesModule
    exclude-modules:
      - GitModule      # Exclude takes precedence
```

---

## Timestamp Control

### Enable/Disable Timestamps

```yaml
# Show timestamps (default)
review:
  debug:
    enabled: true
    format-timestamp: true

# Without timestamps (cleaner output)
review:
  debug:
    enabled: true
    format-timestamp: false
```

Timestamps appear in HH:MM:SS.mmm format and help correlate events.

---

## Complete Examples

### Example 1: Debugging UI Issues

```yaml
---
title: "Fixing Sidebar Problems"
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
    format-timestamp: true
---
```

**Output will show:**
- UI module initialization
- Component rendering
- Event handling
- State changes

---

### Example 2: Troubleshooting Changes

```yaml
---
title: "Change Tracking Issues"
review:
  debug:
    enabled: true
    level: trace
    modules:
      - ChangesModule
    format-timestamp: true
---
```

**Output will show:**
- Every change operation
- Content modifications
- Undo/redo operations
- History management

---

### Example 3: Full System Debugging

```yaml
---
title: "Full System Analysis"
review:
  debug:
    enabled: true
    level: debug
    exclude-modules:
      - GitModule  # Git operations not relevant
---
```

**Output will show:**
- All modules EXCEPT Git
- Medium verbosity
- Timestamps enabled
- Complete system overview

---

### Example 4: Search Debugging

```yaml
---
title: "Search Feature Testing"
review:
  debug:
    enabled: true
    level: trace
    modules:
      - DocumentSearch
    format-timestamp: true
---
```

**Output will show:**
- Search query processing
- Match detection
- Navigation events
- Highlighting updates

---

## Browser Console Output

When debug mode is enabled, you'll see formatted output like:

```
[DEBUG] [17:45:23.456] [UIModule] Component initialized with props
[INFO] [17:45:23.567] [ChangesModule] Loaded 5 operations from state
[WARN] [17:45:24.123] [GitModule] Git operations are not yet supported in browser
[TRACE] [17:45:24.234] [UIModule] Rendering 12 editable sections
[ERROR] [17:45:25.001] [MarkdownModule] Failed to parse markdown: Invalid syntax
```

### Color Coding

Debug output uses color-coded prefixes:
- 🔴 `[ERROR]` - Red background
- 🟠 `[WARN]` - Orange background
- 🔵 `[INFO]` - Blue background
- 🟢 `[DEBUG]` - Teal background
- 🟡 `[TRACE]` - Yellow background

---

## Performance Monitoring

Debug mode has minimal performance impact:
- Logs are only processed when enabled
- Filtering reduces output overhead
- Timestamps can be disabled for pure speed testing
- Module filtering prevents unnecessary logging

### Tip: Profile with Debug Mode

Use with browser DevTools Performance tab:

1. Open DevTools (F12)
2. Go to Performance tab
3. Enable debug mode with trace level
4. Start recording
5. Perform actions in document
6. Stop recording and analyze

---

## Programmatic Control

### In Browser Console

After page load, you can control debug mode manually:

```javascript
// Enable debug mode
window.debugLogger.enable('debug')

// Disable debug mode
window.debugLogger.disable()

// Configure specific modules
window.debugLogger.setConfig({
  modules: ['UIModule', 'ChangesModule'],
  level: 'trace'
})

// Get current configuration
const config = window.debugLogger.getConfig()
console.log(config)

// Display debug help
window.printDebugHelp()
```

---

## Common Debugging Scenarios

### Scenario 1: Changes Not Being Saved

```yaml
review:
  debug:
    enabled: true
    level: debug
    modules:
      - ChangesModule
      - UIModule
```

Watch for:
- `Operation added` messages
- Content change events
- Save operation calls

---

### Scenario 2: Search Not Finding Text

```yaml
review:
  debug:
    enabled: true
    level: trace
    modules:
      - DocumentSearch
```

Watch for:
- Query parsing
- Content scanning
- Match detection

---

### Scenario 3: Performance Issues

```yaml
review:
  debug:
    enabled: true
    level: debug
    format-timestamp: true
```

Compare timestamps between messages to identify slow operations.

---

### Scenario 4: Comment Issues

```yaml
review:
  debug:
    enabled: true
    level: trace
    modules:
      - CommentsModule
```

Watch for:
- Comment parsing
- Display rendering
- Event handling

---

## Disabling Debug Mode

### Remove from YAML

Simply delete the debug configuration:

```yaml
# Before
review:
  debug:
    enabled: true
    level: debug

# After (removed)
---
title: "My Document"
---
```

### Or Explicitly Disable

```yaml
review:
  debug:
    enabled: false
```

---

## Tips & Tricks

### Tip 1: Reduce Noise

Use module filtering to focus on one area:

```yaml
review:
  debug:
    enabled: true
    modules:
      - UIModule  # Only UIModule
```

### Tip 2: Increase Verbosity Gradually

Start with `info`, move to `debug`, then `trace`:

```yaml
# Stage 1: Get overview
level: info

# Stage 2: See details
level: debug

# Stage 3: Full tracing
level: trace
```

### Tip 3: Compare Behaviors

Use timestamps to compare different actions:

```yaml
review:
  debug:
    enabled: true
    format-timestamp: true
```

### Tip 4: Exclude Noisy Modules

Git module is often verbose:

```yaml
review:
  debug:
    enabled: true
    exclude-modules:
      - GitModule
```

### Tip 5: Use Browser Features

Right-click on console messages to:
- Filter output
- Copy full message
- Search for patterns
- Export logs

---

## Troubleshooting Debug Mode

### Q: No debug output appears

**A:** Check:
1. Debug is enabled in YAML (`enabled: true`)
2. Browser console is open (F12)
3. Correct log level is set
4. Module name is correct

### Q: Too much output

**A:** Solution:
1. Use module filtering to focus area
2. Increase log level from `trace` → `debug` → `info`
3. Disable timestamps with `format-timestamp: false`
4. Exclude noisy modules

### Q: Performance degradation

**A:** Solution:
1. Use `info` level instead of `trace`
2. Filter to specific modules
3. Disable timestamps
4. Disable debug mode when done

### Q: Can't find specific message

**A:** Solution:
1. Use browser console's search (Cmd+F)
2. Filter to specific module
3. Increase log level
4. Check module spelling

---

## Best Practices

1. **Enable during development only** - Don't ship with debug enabled
2. **Use appropriate log levels** - Don't always use `trace`
3. **Filter modules when possible** - Reduce noise
4. **Use timestamps for correlation** - Helps find patterns
5. **Disable when testing performance** - Clean baseline
6. **Check logs regularly** - Don't let errors accumulate
7. **Share logs with support** - Include timestamps and module info

---

## API Reference

### QuartoReviewConfig Interface

```typescript
interface QuartoReviewConfig {
  debug?: {
    enabled?: boolean;           // Enable debug mode
    level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    modules?: string[];          // Include only these modules
    excludeModules?: string[];   // Exclude these modules
    formatTimestamp?: boolean;   // Show timestamps (default: true)
  };
}
```

### Global Debug Object

```javascript
window.debugLogger         // Main logger instance
window.printDebugHelp()    // Display help guide
```

---

## Support

If debug mode isn't working as expected:

1. Check the [Troubleshooting](./TROUBLESHOOTING.md) guide
2. Review [Features](./FEATURES.md) for related functionality
3. Check browser console for errors
4. Verify YAML syntax is correct
5. See [FAQ](./FAQ.md) for common issues

---

## Related Documentation

- [Quick Start](./QUICK_START.md) - Getting started guide
- [Features](./FEATURES.md) - Feature overview
- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) - Available shortcuts
- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
