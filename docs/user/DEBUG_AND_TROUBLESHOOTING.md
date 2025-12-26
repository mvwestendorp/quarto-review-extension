# Debug & Troubleshooting Guide

Complete guide for debugging issues and solving common problems with the Quarto Review Extension.

## Table of Contents

- [Quick Troubleshooting](#quick-troubleshooting)
- [Debug Mode Configuration](#debug-mode-configuration)
- [Common Issues & Solutions](#common-issues--solutions)
- [Performance Monitoring](#performance-monitoring)
- [Getting Help](#getting-help)

---

## Quick Troubleshooting

**For any issue, try these steps first:**

1. **Immediate fixes:**
   - Refresh the page (F5)
   - Clear browser cache
   - Try a different browser
   - Check internet connection

2. **If still having issues:**
   - Check browser console (F12 → Console tab)
   - Look for error messages
   - Try a simpler document
   - Try on a different device

3. **Last resort:**
   - Close and reopen browser
   - Restart computer
   - Enable debug mode (see below)
   - Contact support with error message

---

## Debug Mode Configuration

Debug mode helps developers and power users troubleshoot issues and monitor the behavior of the extension in real-time.

### Quick Start

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

### Configuration Options

#### Log Levels

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

#### Module-Specific Filtering

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

#### Exclude Specific Modules

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

#### Timestamp Control

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

### Debug Output

When debug mode is enabled, you'll see formatted output like:

```
[DEBUG] [17:45:23.456] [UIModule] Component initialized with props
[INFO] [17:45:23.567] [ChangesModule] Loaded 5 operations from state
[WARN] [17:45:24.123] [GitModule] Git operations are not yet supported in browser
[TRACE] [17:45:24.234] [UIModule] Rendering 12 editable sections
[ERROR] [17:45:25.001] [MarkdownModule] Failed to parse markdown: Invalid syntax
```

### Programmatic Control

After page load, you can control debug mode manually in the browser console:

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

## Common Issues & Solutions

### Search Issues

#### Problem: Search not finding text

**Solutions:**
1. Check spelling (search is case-insensitive by default)
2. Enable "Case Sensitive" toggle if searching for specific capitalization
3. Disable "Whole Word" toggle if search term might be part of a larger word
4. Use simpler, shorter search terms
5. Try searching for unique parts of the text

**Debug configuration:**
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

#### Problem: Regex search not working

**Solutions:**
1. Ensure `.*` toggle is enabled
2. Check regex syntax (use simple patterns first)
3. Remember special characters need escaping: `\.`, `\*`, `\[`
4. Test simpler patterns: `.` matches anything, `\d` matches digits

**Example Patterns:**
```
✓ Working: "Chapter[0-9]" finds "Chapter1", "Chapter2", etc.
✗ Not working: "[0-9" (missing closing bracket)
✗ Not working: "(word)" (parentheses need escaping)
```

#### Problem: Search freezing

**Solutions:**
1. Close and reopen search
2. Use simpler search terms
3. Disable regex if enabled
4. Refresh the page
5. Close other browser tabs to free up memory

---

### Editing Issues

#### Problem: Changes not appearing

**Solutions:**
1. Click outside the editor to save changes
2. Refresh the page if changes still don't appear
3. Check Change Summary Dashboard to confirm changes exist
4. Try making a new change to trigger an update

**Debug configuration:**
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

#### Problem: Can't click to edit element

**Solutions:**
1. Try double-clicking the element
2. Try clicking on a different part of the element
3. Try refreshing the page
4. Check browser console for errors (F12)

**Debug configuration:**
```yaml
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
```

Watch for:
- UI module initialization
- Component rendering
- Event handling
- State changes

#### Problem: Editor won't open

**Solutions:**
1. Refresh the page (F5 or Cmd+R)
2. Clear browser cache (Settings → Clear browsing data)
3. Try a different element
4. Try a different browser
5. Check internet connection

---

### Change Tracking Issues

#### Problem: Undo not working

**Solutions:**
1. Try Ctrl+Z (or Cmd+Z on Mac) instead of menu
2. Make sure you've made changes to undo
3. Try refreshing and making new changes
4. Check if undo history limit reached (rare)

#### Problem: Changes lost after refresh

**Solutions:**
1. Changes are usually saved, try looking in Change Summary
2. If truly lost, try checking browser history
3. In future, export changes regularly

**Tip:** Export your changes summary regularly using the Change Summary Dashboard!

#### Problem: Too many changes accumulated

**Solutions:**
1. Export and backup your changes summary
2. Clear history (start fresh session)
3. Use "Reject" to undo changes you don't want

---

### Browser Issues

#### Problem: Keyboard shortcuts not working

**Solutions:**
1. Check if another app is intercepting shortcuts
2. Check your keyboard layout settings
3. Try using menu instead of shortcuts
4. Try different modifier keys (Ctrl vs Cmd, etc.)
5. Try a different browser

#### Problem: Display glitches or rendering issues

**Solutions:**
1. Refresh the page (F5 or Cmd+R)
2. Clear browser cache
3. Try zooming: Ctrl+0 or Cmd+0 to reset zoom
4. Try full screen: F11
5. Try a different browser

#### Problem: Page loading slowly

**Solutions:**
1. Check internet connection
2. Close other browser tabs
3. Refresh the page
4. Try with a simpler document first
5. Try a different browser

---

### Performance Issues

#### Problem: Sluggish editing or search

**Solutions:**
1. Close other browser tabs
2. Restart the browser
3. Clear browser cache
4. Reduce document size (if possible)
5. Try with a simpler document

**Debug configuration:**
```yaml
review:
  debug:
    enabled: true
    level: debug
    format-timestamp: true
```

Compare timestamps between messages to identify slow operations.

#### Problem: High memory usage

**Solutions:**
1. Close browser tabs
2. Refresh the page
3. Export changes and start fresh
4. Try with a different browser

---

### Display Issues

#### Problem: Text is too small

**Solutions:**
1. Use browser zoom: Ctrl++ (or Cmd++)
2. Adjust in Settings if available
3. Check display scaling (Windows: Settings → Display)

#### Problem: High contrast or color issues

**Solutions:**
1. Check if high contrast mode is enabled
2. Try different browser theme
3. Check Settings for accessibility options
4. Try a different browser

#### Problem: Mobile UI not working properly

**Solutions:**
1. Rotate device to landscape
2. Try pinch-to-zoom (but use browser zoom instead)
3. Increase touch target size in Settings
4. Try desktop version on desktop browser
5. Clear mobile browser cache

---

### Data & Sync Issues

#### Problem: Changes not syncing

**Solutions:**
1. Check internet connection
2. Try refreshing the page
3. Ensure you're logged in
4. Check if sync is enabled in Settings
5. Try exporting manually instead

#### Problem: Multiple versions of document

**Solutions:**
1. Check your browser tabs - might be duplicate
2. Check file system for copies
3. Use version history if available
4. Verify you're editing the correct document

---

### Comment Issues

#### Problem: Comments not appearing

**Solutions:**
1. Refresh the page
2. Try adding comment again
3. Check if comments are enabled in Settings
4. Check document permissions

**Debug configuration:**
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

#### Problem: Can't add comment

**Solutions:**
1. Try selecting different text
2. Use the context menu or comment badge instead of a keyboard shortcut
3. Refresh the page
4. Check if you have permission to comment

---

### Export Issues

#### Problem: Export button not working

**Solutions:**
1. Try clicking again
2. Check if changes have been made
3. Try exporting a simpler summary
4. Refresh page and try again
5. Try using keyboard shortcut

#### Problem: Export formatting wrong

**Solutions:**
1. Export creates markdown format
2. Paste into text editor first (not directly into email)
3. Check if markdown is being rendered correctly
4. Try copying and pasting differently

---

## Performance Monitoring

Debug mode has minimal performance impact:
- Logs are only processed when enabled
- Filtering reduces output overhead
- Timestamps can be disabled for pure speed testing
- Module filtering prevents unnecessary logging

### Profile with Debug Mode

Use with browser DevTools Performance tab:

1. Open DevTools (F12)
2. Go to Performance tab
3. Enable debug mode with trace level
4. Start recording
5. Perform actions in document
6. Stop recording and analyze

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

### Scenario 3: Performance Issues

```yaml
review:
  debug:
    enabled: true
    level: debug
    format-timestamp: true
```

Compare timestamps between messages to identify slow operations.

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

## Understanding Error Messages

### What to do with error messages:

1. **Read the error** - Often tells you what's wrong
2. **Screenshot it** - For support tickets
3. **Note when it happens** - Helps identify pattern
4. **Try to reproduce** - Can you make it happen again?

### Common error codes:

| Error | Meaning | Solution |
|-------|---------|----------|
| 404 | Not found | Refresh page, check URL |
| 500 | Server error | Refresh, wait, try again |
| CORS | Permission issue | Refresh, check browser settings |
| Timeout | Too slow | Check connection, try again |

---

## Debug Mode Troubleshooting

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

## Getting Help

Still having issues?

- Check [FAQ](./FAQ.md) for common questions
- Review [Features Guide](./FEATURES.md) for feature help
- See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for command reference
- Contact support with:
  - What you were doing
  - What happened
  - Error message (if any)
  - Your browser and OS
  - Debug logs (if enabled)

We're here to help!

---

## Related Documentation

- [Quick Start](./QUICK_START.md) - Getting started guide
- [Features](./FEATURES.md) - Feature overview
- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) - Available shortcuts
- [FAQ](./FAQ.md) - Frequently asked questions
