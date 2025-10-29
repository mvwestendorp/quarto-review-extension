# User Documentation

Welcome to the Quarto Review Extension! This documentation will help you use all the features effectively.

## Quick Start

1. **Start reviewing** - Click any text element in your Quarto document to edit it
2. **See changes** - Changes are automatically tracked and highlighted
3. **Add comments** - Annotate specific sections with feedback
4. **View summary** - Check the Change Summary Dashboard for statistics
5. **Find text** - Use Cmd+F / Ctrl+F to search the document

## Table of Contents

- **[Features Guide](./FEATURES.md)** - Detailed feature explanations
- **[Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)** - All keyboard shortcuts
- **[Debug Mode](./DEBUG.md)** - Troubleshooting and development guidance
- **[FAQ](./FAQ.md)** - Common questions and answers
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Solving common issues

## Core Features

### 📝 In-Browser Editing

Click on any text element to open the editor. Make your changes and they'll be automatically tracked.

### 📊 Change Summary Dashboard

See all your changes at a glance with:
- Total changes count
- Breakdown by change type (additions, deletions, substitutions)
- Statistics by element type
- Export summary as markdown

**Quick access:** Open the Change Summary Dashboard from the toolbar

### 🔍 Search & Find

Use browser-like search to find text anywhere in your document.

- **Mac:** `Cmd+F`
- **Windows/Linux:** `Ctrl+F`

### 💬 Comments & Annotations

Use the comment sidebar to capture feedback. Comment badges on the page highlight sections with open threads.

### 📋 Change Tracking

All edits are tracked with full history. Undo and redo your changes as needed.

### 🔄 Collaboration

Share the rendered HTML or coordinate through Git to collaborate. Real-time multi-user editing is on the roadmap.

## Getting Started

### First Time Setup

1. Open your Quarto document in the Review Extension
2. Click on any element you want to edit
3. Make your changes in the editor
4. Click outside or press Escape to save
5. Changes are automatically saved to your local history

### Making Your First Edit

```
Before: "This is the original text"
After:  "This is the edited text"
```

The change will appear as a tracked modification that you can view in the Change Summary.

### Using Search

```
1. Press Cmd+F (Mac) or Ctrl+F (Windows/Linux)
2. Type what you're looking for
3. Use Enter or ↓ button to find next occurrence
4. Click on any match to navigate to it
```

## Understanding Changes

### Change Types

**Additions** ➕
- Text that was added
- Shown in green highlighting

**Deletions** ➖
- Text that was removed
- Shown in red strikethrough

**Substitutions** 🔄
- Text that was changed
- Old version crossed out, new version highlighted

### Change Summary

The Change Summary Dashboard shows:

```
📊 Change Summary
├── Total Changes: 42
├── Elements Modified: 15
└── Comments: 8

📈 Additions:      12 (28%)
➖ Deletions:      8 (19%)
🔄 Substitutions:  22 (52%)
```

## Common Tasks

### Find Text

1. Press `Cmd+F` / `Ctrl+F`
2. Type text to find
3. Navigate using Enter / Shift+Enter or the arrow buttons
4. Edit the highlighted element directly in the document

### Export Changes

1. Open Change Summary Dashboard
2. Click "Export Summary"
3. Summary is copied to clipboard
4. Paste into email, document, etc.

### View Change History

1. Open Change Summary Dashboard
2. Scroll through "Changes List"
3. Click any change to navigate to it

### Undo a Change

- **Keyboard:** `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux)
- **Menu:** Edit → Undo

### Redo a Change

- **Keyboard:** `Cmd+Shift+Z` (Mac) or `Ctrl+Shift+Z` (Windows/Linux)
- **Menu:** Edit → Redo

## Tips & Tricks

### Efficient Editing

- **Double-click** to select words
- **Triple-click** to select entire paragraph
- Use **arrow keys** to navigate
- Use **Shift+arrow** to select text

### Powerful Search

- Use `.` for regex to match any character
- Use `[abc]` to match any of a, b, or c
- Use `*` for zero or more of previous character
- Example: `^Chapter` finds text at start of elements

### Keyboard Shortcuts

- `Cmd+F` / `Ctrl+F` - Open search
- `Cmd+Z` / `Ctrl+Z` - Undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` - Redo
- `Escape` - Close search or exit editing

See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for the complete list.

## Best Practices

### Naming Conventions

- Use clear, descriptive edit descriptions
- Reference specific sections or paragraphs
- Include context in comments

### Organization

- Group related changes together
- Review changes regularly
- Export summaries for record-keeping
- Keep comments focused and actionable

### Collaboration

- Communicate with other reviewers
- Use comments for feedback
- Reference line numbers or sections
- Export summaries to share progress

## Troubleshooting

### Changes Not Appearing

1. Click outside the editor to save
2. Refresh the page if needed
3. Check the Change Summary Dashboard

### Search Not Finding Text

- Check spelling (search is case-insensitive by default)
- Try enabling "Case Sensitive" toggle
- Try using "Whole Word" option
- Use simpler search terms

### Edits Not Saving

- Ensure you clicked outside the editor
- Check your internet connection
- Try refreshing the page
- Check browser console for errors

See [Troubleshooting](./TROUBLESHOOTING.md) for more help.

## Debug Mode (For Developers)

Having trouble? Enable debug mode to see detailed information in your browser console:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
---
```

Then open Developer Console (F12) to see debug messages. See [Debug Mode](./DEBUG.md) for complete details.

## Next Steps

1. Read [Features Guide](./FEATURES.md) for detailed explanations
2. Check [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for quick reference
3. Browse [FAQ](./FAQ.md) for common questions
4. See [Troubleshooting](./TROUBLESHOOTING.md) if you have issues
5. Try [Debug Mode](./DEBUG.md) if you need detailed diagnostics

## Need Help?

- Check [FAQ](./FAQ.md) for common questions
- Review [Troubleshooting](./TROUBLESHOOTING.md) guide
- Check [Features Guide](./FEATURES.md) for detailed help
- See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for command reference

## Feedback

We'd love to hear your feedback! Please let us know:
- Features you'd like to see
- Bugs or issues
- Suggestions for improvement

Happy reviewing! 🎉
