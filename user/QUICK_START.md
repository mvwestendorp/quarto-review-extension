# Quick Start Guide

Get started with Quarto Review Extension in 5 minutes.

## Prerequisites

- Node.js 20+
- Quarto 1.8+

## Installation

1. Clone or download the extension
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```

The build process automatically copies compiled assets to `_extensions/review/assets/`.

## Basic Usage

### Edit Text

1. Open your Quarto document in a browser
2. Click any text element to open the editor
3. Make your changes
4. Press `Escape` or click outside to save

All edits are automatically tracked with change tracking.

### Search for Text

- Press `Cmd+F` (Mac) or `Ctrl+F` (Windows/Linux)
- Type your search term
- Press `Enter` to find the next match
- Use `Shift+Enter` for previous match

### View All Changes

- Click "Change Summary" in the toolbar
- See comprehensive statistics on all document edits
- Export summary as markdown for reports
- Navigate to specific changes with one click

### Undo Changes

- Press `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux) to undo
- Press `Cmd+Shift+Z` (Mac) or `Ctrl+Y` (Windows/Linux) to redo

## Next Steps

- [Full Features Guide](./FEATURES.md) - Learn all available features
- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) - Complete shortcut reference
- [FAQ](./FAQ.md) - Answers to common questions
- [Translation Mode](./TRANSLATION.md) - Side-by-side translation features

## Need Help?

See [Debug & Troubleshooting](./DEBUG_AND_TROUBLESHOOTING.md) for common issues and solutions.
