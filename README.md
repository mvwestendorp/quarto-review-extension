# Web Review Extension for Quarto

A comprehensive web-based review system for Quarto documents that enables collaborative commenting, text editing, and version tracking through an interactive web interface.

## Overview

The Web Review extension transforms static Quarto HTML documents into interactive review platforms. Reviewers can add comments, suggest changes, and collaborate with authors without needing access to the original Quarto source files. All review data is embedded within the HTML document, making it self-contained and easily shareable.

## Features

### 🗨️ **Interactive Commenting System**
- Select any text to add contextual comments
- Comment on paragraphs, headers, code blocks, and figures
- Threaded comment discussions with author replies
- Comment resolution and status tracking

### ✏️ **Text Editing and Change Tracking**
- Edit text directly in the browser
- Real-time diff visualization (side-by-side or inline)
- Track all modifications with timestamps
- Accept/reject change workflow for authors

### 📁 **Embedded Source Management**
- Original Quarto source files embedded in HTML output
- Element-to-source mapping for precise change tracking
- Export/import review packages for collaboration
- Maintain document integrity across review cycles

### 🔄 **Version Control Integration**
- Simple versioning system with change history
- Git-like diff generation for text changes
- Fallback storage for environments without git
- Automatic source file synchronization

### 🎨 **Multiple Review Modes**
- **Review Mode**: Add comments and suggest changes
- **Author Mode**: Accept/reject changes and reply to comments
- **Read-only Mode**: View document without review features

## Installation

### Option 1: Direct Installation

#### Using the Install Script (Recommended)
```bash
# Clone or download the extension
git clone <repository-url>
cd quarto-web-review

# Run the installation script
./install.sh /path/to/your/project
```

#### Manual Installation
```bash
# Clone or download the extension
git clone <repository-url>
cd quarto-web-review

# Copy to your Quarto project
cp -r _extensions/web-review /path/to/your/project/_extensions/
```

### Option 2: Quarto Extension Manager
```bash
# Install from repository (when published)
quarto add <extension-repository>
```

## Usage

After installation, you can reference the extension in your Quarto documents in two ways:

### Method 1: Direct Filter Path (Always Works)
```yaml
format: 
  html:
    filters:
      - _extensions/web-review/web-review.lua
```

### Method 2: Extension Name (After `quarto add`)
```yaml
format: 
  html:
    filters:
      - web-review
```

## Quick Start

1. **Add the extension to your Quarto document:**

```yaml
---
title: "My Document"
format: 
  html:
    filters:
      - _extensions/web-review/web-review.lua
web-review:
  enabled: true
  mode: "review"
---
```

2. **Render your document:**

```bash
quarto render document.qmd
```

3. **Share the HTML file** with reviewers - no additional setup required!

## Configuration

### Basic Configuration

```yaml
web-review:
  enabled: true                    # Enable/disable the extension
  mode: "review"                   # review, author, or read-only
  debug: false                     # Enable debug logging (default: false)
  features:
    comments: true                 # Enable commenting system
    editing: true                  # Enable text editing
    versioning: true               # Enable version control
    diff-view: true                # Enable diff visualization
```

### UI Configuration

```yaml
web-review:
  ui:
    theme: "default"               # UI theme
    sidebar-position: "right"      # right or left
    diff-style: "side-by-side"     # side-by-side or inline
```

### Storage Configuration

```yaml
web-review:
  storage:
    embed-sources: true            # Embed source files in HTML
    auto-save: true                # Auto-save to localStorage
```

## Usage Guide

### For Reviewers

1. **Adding Comments:**
   - Select any text in the document
   - Click the comment button that appears
   - Type your comment and submit

2. **Suggesting Changes:**
   - Double-click on any editable element
   - Modify the text in the edit dialog
   - Save your changes

3. **Viewing Changes:**
   - Click the "View Changes" button in the toolbar
   - Review all suggested modifications
   - Preview individual changes with diff visualization

4. **Exporting Review:**
   - Click "Save Review" to download your review data
   - Share the JSON file with the document author

### For Authors

1. **Switch to Author Mode:**
   - Use the mode selector in the toolbar
   - Or set `mode: "author"` in the document YAML

2. **Reviewing Comments:**
   - View all comments in the sidebar
   - Reply to comments with clarifications
   - Mark comments as resolved when addressed

3. **Managing Changes:**
   - Accept or reject individual changes
   - Use batch operations for multiple changes
   - Preview changes before accepting

4. **Importing Reviews:**
   - Load review JSON files from reviewers
   - Merge multiple review sessions
   - Export final document with accepted changes

## API Reference

### WebReview Class

The main class that handles all review functionality.

```javascript
// Initialize with custom configuration
const webReview = new WebReview({
  mode: 'review',
  features: {
    comments: true,
    editing: true,
    versioning: true,
    diffView: true
  }
});

// Add a comment programmatically
webReview.addComment(rangeId, 'Comment text');

// Switch modes
webReview.switchMode('author');

// Accept a change
webReview.acceptChange(changeId);

// Export review data
const reviewData = await webReview.exportReview();
```

### DiffViewer Class

Handles diff visualization and comparison.

```javascript
const diffViewer = new DiffViewer('side-by-side');

// Create HTML diff
const htmlDiff = diffViewer.createHtmlDiff(original, modified);

// Create unified diff
const unifiedDiff = diffViewer.createUnifiedDiff(original, modified);
```

### VersionControl Class

Manages source files and version tracking.

```javascript
const versionControl = new VersionControl();

// Save a file
await versionControl.saveFile('document.qmd', content, 'Update message');

// Get file history
const history = await versionControl.getFileHistory('document.qmd');

// Create diff between versions
const diff = await versionControl.createDiff('document.qmd', 'v1', 'v2');
```

## Advanced Features

### Custom Styling

Override default styles by adding CSS:

```css
/* Custom theme colors */
.web-review-container {
  --primary-color: #your-color;
  --sidebar-width: 450px;
}

/* Custom comment styling */
.comment-thread {
  border-left: 3px solid var(--primary-color);
}
```

### Event Hooks

Listen to extension events:

```javascript
document.addEventListener('web-review:comment-added', (event) => {
  console.log('New comment:', event.detail);
});

document.addEventListener('web-review:change-accepted', (event) => {
  console.log('Change accepted:', event.detail);
});
```

### Integration with External Systems

Export review data for integration with other tools:

```javascript
// Export to specific format
const exportData = await webReview.exportReview();

// Send to external API
fetch('/api/reviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(exportData)
});
```

## Testing

Run the comprehensive test suite:

```bash
# Open test runner in browser
open _extensions/web-review/tests/test-runner.html

# Or serve with a local server
python -m http.server 8000
# Navigate to http://localhost:8000/_extensions/web-review/tests/test-runner.html
```

The test suite includes:
- Unit tests for all components
- Integration tests for workflows
- Cross-browser compatibility tests
- Performance benchmarks

## Browser Support

- **Chrome/Chromium**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Required Features
- ES6 classes and modules
- Fetch API
- Local Storage
- CSS Grid and Flexbox

## Troubleshooting

### Debug Mode

Enable debug logging to troubleshoot issues:

```yaml
web-review:
  enabled: true
  debug: true  # Enable detailed logging
```

With debug mode enabled, you'll see detailed logs in:
- **Quarto render output** (Lua filter logs)
- **Browser console** (JavaScript logs)

This helps identify issues with file loading, comment tracking, and other functionality.

### Quick Test

Run the included test script to verify your installation:

```bash
./test-extension.sh
```

This script will:
- Verify the extension is properly installed
- Test rendering with a simple document
- Start a local server for browser testing
- Provide detailed error information

### Common Issues

**Extension not loading:**
- Verify the extension is in `_extensions/web-review/`
- Check that the filter is listed in your YAML frontmatter:
  - Use `- _extensions/web-review/web-review.lua` for direct installation
  - Use `- web-review` only after `quarto add` installation
- Ensure Quarto version compatibility (1.2.0+)
- Enable debug mode (`debug: true`) to see detailed error messages

**Lua filter errors:**
- Enable debug mode to see detailed error messages
- Check the error message for specific line numbers
- Ensure your document has valid YAML frontmatter
- Check that all required metadata is properly formatted

**Comments not saving:**
- Check browser localStorage permissions
- Verify `auto-save` is enabled in configuration
- Check browser console for JavaScript errors

**Source files not embedded:**
- Ensure `embed-sources: true` in configuration
- Verify source files exist in the project directory
- Check file permissions for reading source files

**Diff visualization not working:**
- Verify diff2html library is loading correctly
- Check network connectivity for CDN resources
- Try switching to inline diff style

### Performance Optimization

For large documents:
- Disable auto-save: `auto-save: false`
- Use inline diff style: `diff-style: "inline"`
- Limit embedded sources: `embed-sources: false`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Setup

```bash
git clone <repository-url>
cd quarto-web-review

# Test the extension
./test-extension.sh

# Enable debug mode in your test documents
# Add to your QMD frontmatter:
# web-review:
#   debug: true
```

## License

MIT License - see LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Core commenting and editing functionality
- Diff visualization
- Source file embedding
- Multiple review modes
- Comprehensive test suite

## Support

- **Documentation**: See this README and inline code comments
- **Issues**: Report bugs via GitHub issues
- **Discussions**: Use GitHub discussions for questions
- **Examples**: See `example.qmd` and test documents

## Acknowledgments

- Built on top of Quarto's extension system
- Uses Rangy for text selection and highlighting
- Diff visualization powered by diff2html
- Version control inspired by isomorphic-git
- Test framework using Mocha and Chai