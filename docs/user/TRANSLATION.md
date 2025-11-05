# Translation Mode User Guide

## Overview

Translation Mode enables side-by-side document translation with automatic or manual translation workflows. It provides a dedicated interface for translating documents while maintaining sentence-level correspondence between source and target languages.

## Getting Started

### Enabling Translation Mode

**Option 1: YAML Configuration (Recommended)**

Add to your Quarto document:

```yaml
---
title: "My Document"
review:
  enabled: true
  mode: translation
  translation:
    sourceLanguage: en
    targetLanguage: nl
    defaultProvider: manual
---
```

**Option 2: Via Sidebar**

1. Open the document in review mode
2. Click the "Translation" button in the sidebar
3. Configure source and target languages
4. Choose translation provider

### Basic Workflow

1. **Initialize:** Document loads in translation mode with source text in left pane
2. **Translate:** Use automatic translation or translate manually
3. **Edit:** Click any sentence to edit its translation
4. **Save:** Changes are automatically saved to browser storage
5. **Export:** Export translations in various formats when complete

## User Interface

### Layout

```
┌──────────────────────────────────────────────────┐
│  Translation Header (Progress, Settings)         │
├─────────────────────┬────────────────────────────┤
│  Source Language    │  Target Language           │
│  (Read-only)        │  (Editable)                │
│                     │                            │
│  ┌───────────────┐  │  ┌───────────────┐        │
│  │ Sentence 1    │  │  │ Translation 1 │        │
│  └───────────────┘  │  └───────────────┘        │
│                     │                            │
│  ┌───────────────┐  │  ┌───────────────┐        │
│  │ Sentence 2    │  │  │ Translation 2 │        │
│  └───────────────┘  │  └───────────────┘        │
│                     │                            │
└─────────────────────┴────────────────────────────┘
```

### Visual Indicators

**Status Chips:** Each sentence displays a colored chip indicating its translation status:

- **Original** (gray): Source language sentence
- **Untranslated** (light gray): Target sentence not yet translated
- **Auto-translated** (blue): Automatically translated by AI
- **Manual** (green): Manually entered or edited translation
- **Out-of-sync** (red): Source sentence changed after translation
- **Synced** (green): Translation matches current source

### Progress Indicator

The header shows overall progress:
- Number of sentences translated
- Percentage complete
- Current operation status (idle, translating, complete, error)

## Translation Methods

### 1. Automatic Translation

Automatically translate entire document or individual sentences using AI providers.

**Translate Entire Document:**
- Click "Translate Document" button
- Or use keyboard shortcut: `Ctrl/Cmd+T`
- Progress bar shows translation status

**Translate Single Sentence:**
- Select a sentence (click on it)
- Click "Translate Sentence" button
- Or use keyboard shortcut: `Ctrl/Cmd+Shift+T`

**Available Providers:**
- **Manual:** No automatic translation (manual entry only)
- **OpenAI:** High-quality cloud-based translation (requires API key)
- **Local AI:** Browser-based offline translation (no API key needed)
- **Google Translate:** Coming soon
- **DeepL:** Coming soon

### 2. Manual Translation

Directly edit translations without automatic translation.

**To Edit a Sentence:**
1. Double-click the target sentence
2. Or click once to select, then press Enter
3. Edit the translation text
4. Press `Ctrl/Cmd+S` to save or `Escape` to cancel

**Tips:**
- Use Tab to navigate between sentences
- Use Shift+Tab to navigate backwards
- Undo/Redo work within the editor (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`)

### 3. Hybrid Approach

Combine automatic and manual translation:

1. Use automatic translation for initial draft
2. Review and manually edit translations for accuracy
3. Sentences show "Manual" status after editing

## Keyboard Shortcuts

### Translation Operations

| Windows/Linux | Mac | Action |
|--------------|-----|--------|
| `Ctrl+T` | `Cmd+T` | Translate entire document |
| `Ctrl+Shift+T` | `Cmd+Shift+T` | Translate selected sentence |
| `Ctrl+Alt+S` | `Cmd+Option+S` | Swap source and target languages |

### Editing Translations

| Windows/Linux | Mac | Action |
|--------------|-----|--------|
| `Double-click` | `Double-click` | Edit sentence |
| `Enter` | `Enter` | Edit selected sentence |
| `Ctrl+S` | `Cmd+S` | Save current edit |
| `Escape` | `Escape` | Cancel current edit |
| `Ctrl+Z` | `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` | `Cmd+Shift+Z` | Redo |

### Navigation

| Windows/Linux | Mac | Action |
|--------------|-----|--------|
| `Click` | `Click` | Select sentence |
| `Tab` | `Tab` | Next sentence |
| `Shift+Tab` | `Shift+Tab` | Previous sentence |
| `Home` | `Home` | First sentence |
| `End` | `End` | Last sentence |

## Features

### Automatic Saving

All translation progress is automatically saved to your browser's local storage:
- Saves every 30 seconds when changes are made
- Restores your work when you reload the page
- Survives browser restarts (until you clear browser data)

**Manual Save:**
- Translations save immediately when you finish editing a sentence
- No need to manually save the document

### Sentence Correspondence

The system maintains correspondence between source and target sentences:
- **Highlighting:** Hover over a sentence to see its corresponding translation
- **Selection:** Click a sentence to highlight its correspondence
- **Alignment:** Sentences are visually aligned side-by-side

### Progress Tracking

Monitor your translation progress:
- **Total sentences:** Total count of sentences in document
- **Translated:** Number of completed translations
- **Manual:** Number of manually edited translations
- **Auto:** Number of auto-translations
- **Out-of-sync:** Number of translations needing review

### Export Options

Export your completed translations:

**Format Options:**
- **Markdown:** Target language as markdown file
- **DOCX:** Microsoft Word format
- **HTML:** Web-ready format
- **JSON:** Data interchange format
- **TMX:** Translation Memory eXchange (industry standard)

**Export Methods:**
1. Click "Export" button in header
2. Choose format
3. File downloads automatically

## Settings

### Language Settings

**Source Language:**
- Language of the original document
- Read-only once translation starts
- Common languages: English (en), Spanish (es), French (fr), German (de), Dutch (nl), etc.

**Target Language:**
- Language you're translating to
- Can be changed (starts new translation session)
- Supports 100+ languages

**Changing Languages:**
- Use language dropdown in header
- Or use keyboard shortcut: `Ctrl/Cmd+Alt+S` to swap

### Provider Settings

**Select Provider:**
- Click provider dropdown in header
- Choose from available providers
- Settings saved per-browser

**OpenAI Configuration:**
```yaml
translation:
  defaultProvider: openai
  providers:
    openai:
      apiKey: sk-...  # Your OpenAI API key
      model: gpt-3.5-turbo  # or gpt-4
```

**Local AI Configuration:**
```yaml
translation:
  defaultProvider: local
  providers:
    local:
      mode: balanced  # fast, balanced, or quality
      backend: auto   # auto, webgpu, or wasm
```

### Display Settings

**Show Correspondence Lines:**
- Visual lines connecting related sentences
- Toggle in settings menu

**Highlight on Hover:**
- Automatically highlight corresponding sentence on hover
- Toggle in settings menu

**Auto-translate on Edit:**
- Automatically re-translate when source sentence changes
- Disabled by default

## Tips and Best Practices

### Translation Workflow

1. **Review First:** Read through the source document before translating
2. **Use Automatic:** Let AI handle the initial translation draft
3. **Edit Carefully:** Review and refine auto-translations
4. **Be Consistent:** Use consistent terminology throughout
5. **Save Often:** Translations auto-save, but export periodically

### Quality Assurance

1. **Check Status:** Review all "Out-of-sync" sentences
2. **Review Auto-translations:** Don't blindly trust AI translations
3. **Read Aloud:** Read translations aloud to catch awkward phrasing
4. **Use Context:** Consider document context when translating
5. **Get Feedback:** Have native speakers review when possible

### Performance Tips

1. **Browser Choice:** Modern browsers (Chrome, Edge, Firefox) perform best
2. **Local AI:** Use "fast" mode for quick drafts, "quality" for final translations
3. **Batch Operations:** Translate entire document at once rather than sentence-by-sentence
4. **Close Tabs:** Close other tabs to free up memory for large documents
5. **Clear Storage:** Periodically clear browser storage if experiencing issues

## Troubleshooting

### Common Issues

**Problem:** Translations not saving
**Solution:**
- Check browser storage isn't full
- Ensure third-party cookies enabled
- Try different browser

**Problem:** Slow translation speed
**Solution:**
- Switch to faster provider (Local AI "fast" mode)
- Reduce browser extensions
- Close unnecessary tabs

**Problem:** Auto-translation not working
**Solution:**
- Check API key is valid (for OpenAI)
- Verify internet connection (for cloud providers)
- Try manual translation as fallback

**Problem:** Lost translations after reload
**Solution:**
- Check browser storage settings
- Export translations regularly
- Don't clear browser data

### Error Messages

**"Translation failed":**
- Provider may be unavailable
- Check internet connection
- Try different provider
- Click "Retry" button

**"Source content changed":**
- Original document was modified
- Review affected translations
- Re-translate out-of-sync sentences

**"Storage unavailable":**
- Browser storage disabled
- Enable local storage in browser settings
- Use private/incognito mode with caution

## Advanced Features

### Re-segmentation

When you edit source or target content, sentences are automatically re-segmented:
- Maintains sentence boundaries
- Updates correspondence mappings
- Marks affected translations as "Out-of-sync"

### State Management

Translation state is managed centrally for consistency:
- Progress tracked across UI components
- Selection synchronized between panes
- Settings persisted across sessions

### Accessibility

Full keyboard navigation and screen reader support:
- All features accessible via keyboard
- ARIA labels for screen readers
- High contrast mode support
- Adjustable font sizes

## FAQ

**Q: Can I translate between any two languages?**
A: Most providers support 50-100 languages. Check provider documentation for specific language support.

**Q: Are translations stored on a server?**
A: No, translations are stored only in your browser's local storage for privacy.

**Q: Can I use translation mode offline?**
A: Yes, use the Local AI provider for complete offline translation.

**Q: How accurate is automatic translation?**
A: Quality varies by provider and language pair. Always review auto-translations for accuracy.

**Q: Can I import existing translations?**
A: Not yet, but this feature is planned for a future release.

**Q: What happens to my translations when I clear browser data?**
A: Translations stored in local storage will be lost. Export regularly to avoid data loss.

**Q: Can multiple people collaborate on a translation?**
A: Not currently. Collaborative translation is planned for a future release.

**Q: Is there a word/character limit?**
A: Limits depend on the provider. Local AI has no limits. Cloud providers may have API limits.

## Support and Feedback

**Getting Help:**
- Check [Troubleshooting](./TROUBLESHOOTING.md) guide
- Review [FAQ](./FAQ.md)
- Search [existing issues](https://github.com/mvwestendorp/quarto-review-extension/issues)

**Reporting Issues:**
- Include browser and version
- Describe steps to reproduce
- Attach console errors if applicable
- Export your document state if possible

**Feature Requests:**
- Open an issue on GitHub
- Describe the use case
- Explain expected behavior

## Related Documentation

- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) - Complete shortcut reference
- [Features Guide](./FEATURES.md) - All review extension features
- [Quick Start](./QUICK_START.md) - Getting started with review mode
- [Translation Integration](../TRANSLATION_INTEGRATION.md) - Developer guide
- [StateStore Architecture](../translation-refactor/STATESTORE_INTEGRATION.md) - Technical architecture

## Version History

**Version 0.2.0** (Current)
- Added StateStore integration for reactive state management
- Improved re-segmentation support
- Enhanced keyboard shortcuts
- Better progress tracking

**Version 0.1.0**
- Initial translation mode release
- Basic auto-translation
- Manual editing support
- Export functionality
