# Features Guide

## In-Browser Editing

**How to Edit:**
1. Click any text element
2. Make changes in the editor
3. Press `Escape` or click outside to save

**Editor Features:**
- Formatting: Bold, italic, underline, strikethrough
- Lists: Bullet and numbered
- Links and code
- Full markdown support

**Shortcuts:** `Ctrl/Cmd+B` (bold), `Ctrl/Cmd+I` (italic), `Ctrl/Cmd+Z` (undo)

## Change Summary Dashboard

Shows comprehensive change statistics:

**Statistics:**
- Total changes and elements modified
- Comments count
- Character changes

**Change Breakdown:**
- Additions ➕ - New text (count, percentage, characters)
- Deletions ➖ - Removed text
- Substitutions 🔄 - Changed text

**Changes by Element:** Distribution across headers, paragraphs, lists, code blocks, etc.

**Opening:** Click "Change Summary" in toolbar

**Navigation:** Use "First Change" / "Last Change" buttons or click any change in the list

**Export:** Click "Export Summary" to copy markdown to clipboard

## Search & Find

**Open:** `Cmd/Ctrl+F`
**Close:** `Escape`

**Search Options:**
- **Case Sensitive (Aa):** Match exact case
- **Whole Word (Ab|):** Match complete words only
- **Regex (.*):** Use regular expression patterns

**Common Regex:**
- `.` = any character
- `*` = zero or more
- `^` = start of text
- `$` = end of text
- `\d` = digit
- `[abc]` = any of a, b, c

**Navigation:** `Enter` (next), `Shift+Enter` (previous)

## Comments & Annotations

**Add Comment:**
1. Select text
2. Use quick menu or sidebar
3. Type and save

**Manage:**
- Edit, delete, or resolve comments
- Reply to create threads

## Change Tracking

**Visual Indicators:**
- Additions: Green text
- Deletions: Red strikethrough
- Substitutions: Red strikethrough (old) + green (new)

**CriticMarkup in Code:** CriticMarkup syntax appears literally in code blocks (standard markdown behavior). Use inline code for formatted diffs.

## Undo & Redo

**Undo:** `Cmd/Ctrl+Z`
**Redo:** `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`
**History:** Unlimited undo

## Tips

**Organizing Reviews:**
1. Read document first
2. Make edits as you read
3. Add comments for significant changes
4. Export summary at the end

**Efficient Searching:**
- Use whole word for specific terms
- Use regex for complex patterns
- Use case sensitive for proper nouns

**Quality Review:**
- Check spelling and grammar
- Ensure consistency
- Verify facts and citations
- Check formatting

See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for complete shortcut list.
