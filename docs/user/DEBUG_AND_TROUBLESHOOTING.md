# Debug & Troubleshooting

## Quick Fixes

Try these first:
1. Refresh page (F5)
2. Clear browser cache
3. Check browser console (F12)
4. Try different browser

## Debug Mode

Enable debug mode to see detailed console output:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
---
```

**Log Levels:** `error`, `warn`, `info`, `debug`, `trace`

**Module Filtering:**
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
      - ChangesModule
```

**Available Modules:** UIModule, ChangesModule, CommentsModule, MarkdownModule, GitModule, UserModule, KeyboardShortcuts, DocumentSearch

**Console Control:**
```javascript
window.debugLogger.enable('debug')
window.debugLogger.disable()
window.printDebugHelp()
```

## Common Issues

### Search Not Finding Text
- Check spelling
- Disable "Case Sensitive" and "Whole Word"
- Try simpler search terms
- Enable debug: `modules: [DocumentSearch]`

### Changes Not Appearing
- Click outside editor to save
- Refresh page
- Check Change Summary Dashboard
- Enable debug: `modules: [ChangesModule, UIModule]`

### Editor Won't Open
- Refresh page
- Clear browser cache
- Try different element
- Check console for errors

### Undo Not Working
- Try `Ctrl/Cmd+Z`
- Make sure changes exist
- Refresh and try again

### Keyboard Shortcuts Not Working
- Check if another app intercepts shortcut
- Try using menu instead
- Try different browser

### Slow Performance
- Close other tabs
- Restart browser
- Clear cache
- Try simpler document

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| 404 | Not found | Refresh page |
| 500 | Server error | Wait and retry |
| CORS | Permission issue | Check browser settings |
| Timeout | Too slow | Check connection |

## Debug Scenarios

**Changes not saving:**
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules: [ChangesModule, UIModule]
```

**Search issues:**
```yaml
review:
  debug:
    enabled: true
    level: trace
    modules: [DocumentSearch]
```

**Performance issues:**
```yaml
review:
  debug:
    enabled: true
    level: debug
    format-timestamp: true
```

Compare timestamps to identify slow operations.

## Need More Help?

- Check [FAQ](./FAQ.md)
- Review [Features Guide](./FEATURES.md)
- See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)
- Contact support with error messages and browser info
