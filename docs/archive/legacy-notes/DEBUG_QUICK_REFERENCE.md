# Debug Mode Quick Reference

## Quick Start (2 minutes)

Add to your Quarto document YAML:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
---
```

Open Developer Console (F12) → see debug messages!

---

## Configuration Examples

### Basic Debugging
```yaml
review:
  debug:
    enabled: true
```

### Trace Specific Issue
```yaml
review:
  debug:
    enabled: true
    level: trace
    modules:
      - UIModule
```

### Full System Analysis
```yaml
review:
  debug:
    enabled: true
    level: debug
    exclude-modules:
      - GitModule
    format-timestamp: true
```

---

## Available Modules

- `UIModule` - User interface
- `ChangesModule` - Change tracking
- `CommentsModule` - Comments
- `MarkdownModule` - Markdown rendering
- `GitModule` - Git operations
- `UserModule` - Authentication
- `KeyboardShortcuts` - Keyboard handling
- `DocumentSearch` - Search functionality

---

## Log Levels

| Level | Verbosity | When to Use |
|-------|-----------|------------|
| `error` | Lowest | Production only |
| `warn` | Low | Stability issues |
| `info` | Medium | General debugging |
| `debug` | High | Development (default) |
| `trace` | Highest | Deep investigation |

---

## Browser Console Commands

```javascript
// Enable debug
window.debugLogger.enable('debug')

// Disable debug
window.debugLogger.disable()

// Configure
window.debugLogger.setConfig({
  modules: ['UIModule'],
  level: 'trace'
})

// Get config
window.debugLogger.getConfig()

// Show help
window.printDebugHelp()
```

---

## Common Scenarios

### "Edits aren't saving"
```yaml
review:
  debug:
    enabled: true
    level: trace
    modules: [ChangesModule, UIModule]
```

### "Search isn't working"
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules: [DocumentSearch]
```

### "Comments display wrong"
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules: [CommentsModule, MarkdownModule]
```

### "UI looks broken"
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules: [UIModule]
```

---

## Output Example

```
[DEBUG] [17:45:23.456] [UIModule] Component initialized
[TRACE] [17:45:24.234] [ChangesModule] Operation added
[INFO] [17:45:24.567] [MarkdownModule] Content rendered
[WARN] [17:45:25.123] [GitModule] Git not available
[ERROR] [17:45:26.001] [UIModule] Failed to save
```

Color-coded: 🔴 ERROR, 🟠 WARN, 🔵 INFO, 🟢 DEBUG, 🟡 TRACE

---

## Documentation

- **Full Guide:** `docs/user/DEBUG.md`
- **Example:** `example/debug-example.qmd`
- **Setup Details:** `DEBUG_MODE_SETUP.md`
- **Dev Guide:** `docs/dev/README.md` → Debug Mode section

---

## Tips

1. **Start simple** - Use `info` level first
2. **Focus on modules** - Filter to reduce noise
3. **Use timestamps** - Correlate events
4. **Check console** - F12 to view output
5. **Try examples** - See `example/debug-example.qmd`

---

## Still Stuck?

1. Increase level: `debug` → `trace`
2. Check spelling of module names
3. Try full system debug (no filtering)
4. Read `docs/user/DEBUG.md` for more
5. Open issue with console output

---

Happy debugging! 🐛
