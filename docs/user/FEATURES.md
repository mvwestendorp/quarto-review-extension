# Features Guide

Detailed documentation for all features in the Quarto Review Extension.

## 📝 In-Browser Editing

### How to Edit

1. **Click** on any text element in your document
2. The **editor will open** with that content
3. **Make your changes** using the WYSIWYG editor
4. **Click outside** or press `Escape` to save

### Editor Features

- **Formatting:** Bold, italic, underline, strikethrough
- **Lists:** Bullet points and numbered lists
- **Links:** Add and edit hyperlinks
- **Code:** Inline and block code formatting
- **Markdown:** Full markdown support

### Keyboard Shortcuts in Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+B` | Bold |
| `Ctrl/Cmd+I` | Italic |
| `Ctrl/Cmd+U` | Underline |
| `Escape` | Save and exit editor |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |

---

## 📊 Change Summary Dashboard

### What It Shows

The dashboard displays comprehensive statistics about all document changes.

#### Statistics Cards
- **Total Changes:** All edits, additions, deletions, substitutions
- **Elements Modified:** How many document elements were edited
- **Comments:** Total number of annotations in the document

#### Change Breakdown
Shows the distribution of change types:
- **Additions** ➕ - New text added
- **Deletions** ➖ - Text removed
- **Substitutions** 🔄 - Text changed

Each shows:
- Count of changes
- Percentage of total
- Character count (for additions/deletions)

#### Changes by Element Type
Distribution of changes across document elements:
- Headers (H1, H2, H3, etc.)
- Paragraphs
- Lists (bullet and numbered)
- Code blocks
- Block quotes
- And more

### Using the Dashboard

#### Opening
- Click "Change Summary" button in the toolbar
- Or use menu: View → Change Summary

#### Navigation
- **"First Change"** button - Jump to the first change
- **"Last Change"** button - Jump to the last change
- **Click any change** in the list - Navigate to that specific change

#### Exporting Summary
1. Click **"Export Summary"** button
2. Summary is **copied to clipboard** as markdown
3. **Paste** into email, document, or notes

Example exported summary:
```
# Document Change Summary

**Generated:** Oct 16, 2025 3:30 PM

## Statistics
- Total Changes: 42
- Elements Modified: 15
- Comments: 3
- Characters Added: 487
- Characters Removed: 234

## Change Breakdown
- Additions: 12
- Deletions: 8
- Substitutions: 22

## By Element Type
- Paragraph: 10
- Header: 3
- List: 2
```

---

## 🔍 Search & Find

### Opening Search

- **Mac:** `Cmd+F`
- **Windows/Linux:** `Ctrl+F`
- **Close:** `Escape`

### Search Interface

```
[Search input field]  [X close]
[Aa toggle]  [Ab| toggle]  [.* toggle]
[↑ prev]  [3/25]  [↓ next]
```

### Basic Search

Type any text to search:

```
Search: "important"
Result: Highlights all instances of "important"
Counter: "1/5" means 1st match of 5 total
```

### Search Options

#### Case Sensitive (🔤 toggle)

Default: OFF (finds "test", "TEST", "Test")
- **Toggle ON:** Only matches exact case ("test" won't match "TEST")

Example:
```
Search: "Review"
OFF: Finds "review", "Review", "REVIEW"
ON:  Finds only "Review"
```

#### Whole Word (📝 toggle)

Default: OFF (finds "test" anywhere)
- **Toggle ON:** Only matches complete words, not parts of words

Example:
```
Search: "test"
OFF: Finds "test", "testing", "tested"
ON:  Finds only standalone "test"
```

#### Regular Expressions (.* toggle)

Default: OFF (literal text search)
- **Toggle ON:** Use powerful regex patterns

### Regex Patterns

Common regex patterns:

| Pattern | Matches |
|---------|---------|
| `.` | Any character |
| `*` | Zero or more of previous |
| `+` | One or more of previous |
| `?` | Zero or one of previous |
| `\|` | OR (either option) |
| `[]` | Any character in brackets |
| `^` | Start of text |
| `$` | End of text |
| `\d` | Any digit |
| `\w` | Any word character |
| `\s` | Any whitespace |

### Regex Examples

```
Pattern             Matches
"^Chapter"          Text starting with "Chapter"
"[0-9]+"            Any sequence of digits (e.g., "123", "8")
"cat\|dog"          Either "cat" or "dog"
"\bthe\b"           Word "the" (whole word only)
"color|colour"      Either spelling
"\.pdf$"            Files ending in ".pdf"
"[A-Z]{3}"          Three uppercase letters
```

### Navigation

- **Next Match:** Press `Enter` or click ▼ button
- **Previous Match:** Press `Shift+Enter` or click ▲ button
- **Counter Shows:** Current position and total matches (e.g., "3 of 25")

### Search Results

Each match shows:
- **Context preview** - Text around the match (30 chars before and after)
- **Highlight** - Match highlighted in yellow
- **Smooth scroll** - Document scrolls to show the match

---

## 💬 Comments & Annotations

### Adding Comments

1. Select text in the document.
2. Use the inline quick menu or sidebar action to open the composer.
3. Type your comment and click **Save**.

### Comment Indicators

Comments appear as:
- **Highlighted text** with indicator
- **Comment marker** in the margin
- **Tooltip** showing the comment when hovered

### Managing Comments

- **Edit:** Open the comment and choose **Edit**
- **Delete:** Open the comment and choose **Delete**
- **Resolve:** Mark the thread as resolved once addressed
- **Reply:** Add a follow-up note within the same thread

### Comment Types

- **Suggestion:** Propose a change
- **Question:** Ask for clarification
- **Feedback:** General feedback
- **Note:** Internal reminder

---

## 📋 Change Tracking

### Understanding Tracked Changes

Changes are displayed using visual indicators:

**Additions** ✅
- Text shown in **green**
- Indicates new content

**Deletions** ❌
- Text shown **strikethrough in red**
- Indicates removed content

**Substitutions** 🔄
- Old text **strikethrough** (red)
- New text **highlighted** (green)

### Accepting Changes

Changes can be accepted (keep the new version):
1. Right-click on tracked change
2. Click "Accept"
3. Change is finalized

### Rejecting Changes

Reject a change to revert to original:
1. Right-click on tracked change
2. Click "Reject"
3. Original version is restored

### Change History

View all changes in the **Change Summary Dashboard**:
- See when each change was made
- Who made the change
- What exactly changed
- Accept or reject individual changes

---

## 🔄 Undo & Redo

### Undo

Revert your last action:
- **Keyboard:** `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux)
- **Menu:** Edit → Undo

### Redo

Reapply an undone action:
- **Keyboard:** `Cmd+Shift+Z` (Mac) or `Ctrl+Shift+Z` (Windows/Linux)
- **Menu:** Edit → Redo

### Undo Limit

- Unlimited undo history
- Each action is recorded
- Can undo/redo through entire session

---

## 🎯 Tips for Effective Use

### Organizing Your Review

1. **Read through** the entire document first
2. **Make edits** as you read
3. **Add comments** for significant changes
4. **Export summary** at the end

### Efficient Searching

- Use **whole word** when searching for specific terms
- Use **regex** for complex patterns
- Use **case sensitive** when looking for proper nouns

### Collaborative Reviewing

- **Use comments** to explain your changes
- **Export summary** to share with team
- **Use specific language** in annotations
- **Reference sections** clearly

### Quality Review

- ✅ Check spelling and grammar
- ✅ Ensure consistency
- ✅ Look for clarity issues
- ✅ Verify facts and citations
- ✅ Check formatting and structure

---

## Keyboard Shortcuts Reference

See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for a complete list.

## Troubleshooting

See [Troubleshooting](./TROUBLESHOOTING.md) for help with common issues.
