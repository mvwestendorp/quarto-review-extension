# Translation Mode

## Overview

Side-by-side document translation with automatic or manual workflows, maintaining sentence-level correspondence.

## Enabling Translation Mode

```yaml
---
review:
  enabled: true
  mode: translation
  translation:
    sourceLanguage: en
    targetLanguage: nl
    defaultProvider: manual
---
```

## Workflow

1. Document loads with source text in left pane
2. Translate automatically or manually
3. Click sentences to edit translations
4. Changes auto-save to browser storage
5. Export when complete

## Translation Methods

**Automatic Translation:**
- `Ctrl/Cmd+T` - Translate entire document
- `Ctrl/Cmd+Shift+T` - Translate selected sentence
- Providers: Manual, OpenAI, Local AI

**Manual Translation:**
- Double-click target sentence to edit
- `Ctrl/Cmd+S` to save, `Escape` to cancel
- Tab/Shift+Tab to navigate

**Hybrid:** Use automatic for draft, manually refine

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+T` | Translate document |
| `Ctrl/Cmd+Shift+T` | Translate sentence |
| `Ctrl/Cmd+Alt+S` | Swap languages |
| `Double-click` | Edit sentence |
| `Ctrl/Cmd+S` | Save edit |

## Features

**Auto-saving:** Every 30 seconds, survives browser restarts

**Sentence Correspondence:** Hover/click to highlight matching sentences

**Progress Tracking:** Count of total/translated/manual/auto/out-of-sync sentences

**Export Formats:** Markdown, DOCX, HTML, JSON, TMX

## Provider Configuration

**OpenAI:**
```yaml
translation:
  defaultProvider: openai
  providers:
    openai:
      apiKey: sk-...
      model: gpt-3.5-turbo
```

**Local AI:**
```yaml
translation:
  defaultProvider: local
  providers:
    local:
      mode: balanced  # fast, balanced, or quality
      backend: auto
```

## Status Indicators

- **Original** (gray) - Source sentence
- **Untranslated** (light gray) - Not yet translated
- **Auto-translated** (blue) - AI translated
- **Manual** (green) - Manually edited
- **Out-of-sync** (red) - Source changed after translation

## Tips

1. Read document first
2. Use automatic translation for initial draft
3. Review and refine auto-translations
4. Use consistent terminology
5. Export periodically

## Troubleshooting

**Translations not saving:** Check browser storage, enable third-party cookies

**Slow translation:** Switch to Local AI "fast" mode, close other tabs

**Auto-translation not working:** Check API key, verify internet connection

**Lost translations:** Export regularly, don't clear browser data

See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for complete shortcut reference.
