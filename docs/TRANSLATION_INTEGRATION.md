# Translation Module Integration Guide

## Overview

The translation module has been integrated into the main QuartoReview application. This guide explains how to enable and use the translation features.

## Enabling Translation

### Option 1: YAML Configuration (Recommended)

Add translation configuration to your Quarto document's YAML frontmatter:

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
    autoTranslateOnLoad: false
    autoTranslateOnEdit: false
    showCorrespondenceLines: true
    highlightOnHover: true
---
```

### Option 2: JavaScript API

```javascript
const review = new QuartoReview({
  enableTranslation: true,
  translation: {
    sourceLanguage: 'en',
    targetLanguage: 'nl',
    defaultProvider: 'manual',
    autoTranslateOnLoad: false,
    autoTranslateOnEdit: false,
    showCorrespondenceLines: true,
    highlightOnHover: true,
    providers: {
      openai: {
        apiKey: 'your-api-key',  // Optional
        model: 'gpt-3.5-turbo'
      },
      local: {
        mode: 'balanced',  // 'fast' | 'balanced' | 'quality'
        backend: 'auto'    // 'auto' | 'webgpu' | 'wasm'
      }
    }
  }
});
```

## Translation Providers

### 1. Manual Provider

- **Use case**: Human translation workflow
- **Configuration**: None required (default)
- **How it works**: Users manually enter translations for each sentence

### 2. Local AI Provider

- **Use case**: Offline, privacy-focused translation
- **Configuration**:
  ```yaml
  providers:
    local:
      mode: balanced  # fast (Opus-MT), balanced (NLLB-600M), quality (NLLB-1.3B)
      backend: auto   # auto-detect WebGPU or fallback to WASM
  ```
- **Requirements**: Modern browser with WebAssembly support
- **Performance**:
  - Fast mode (Opus-MT): 0.2-0.4s per paragraph, 300MB model
  - Balanced mode (NLLB-600M): 0.5-1s per paragraph, 600MB model
  - Quality mode (NLLB-1.3B): 1-2s per paragraph, 1.3GB model
- **Supported languages**: EN ↔ NL ↔ FR (200 languages with NLLB)

### 3. OpenAI Provider

- **Use case**: Cloud-based high-quality translation
- **Configuration**:
  ```yaml
  providers:
    openai:
      apiKey: sk-...
      model: gpt-3.5-turbo
  ```
- **Requirements**: OpenAI API key
- **Performance**: 0.5-1s per paragraph

## User Interface

### Translation View

When translation mode is enabled, the UI provides:

1. **Side-by-side panes**
   - Left: Source language
   - Right: Target language

2. **Sentence highlighting**
   - Hover over any sentence to see its correspondence
   - Click to select and edit

3. **Correspondence visualization**
   - Lines connecting translated sentences
   - Color-coded by status:
     - Gray: Untranslated
     - Blue: Auto-translated
     - Green: Manual/Synced
     - Yellow: Edited
     - Red: Out-of-sync

4. **Translation toolbar**
   - Translate document button
   - Translate sentence button
   - Provider selector
   - Language swap button
   - Settings toggles

### Translation Workflow

1. **Initialize translation**
   - Document loads and segments into sentences
   - Source sentences are extracted

2. **Translate**
   - Option A: Click "Translate Document" for full auto-translation
   - Option B: Double-click individual sentences to translate manually
   - Option C: Enable "Auto-translate on load" for automatic translation

3. **Review and edit**
   - Review auto-translated content
   - Double-click any sentence to edit
   - Changes are tracked as "edited" or "manual"

4. **Export**
   - Export translations in two strategies:
     - **Unified**: Single Quarto project with language conditionals
     - **Separated**: Separate Quarto projects for each language

## Export Strategies

### Unified Export

Creates a single Quarto project with both languages:

```bash
# Directory structure
my-article.qmd           # Both languages with conditionals
my-article-nl.qmd        # Dutch version
_quarto.yml              # Multi-language config
.translation-metadata.json
```

**Use when:**
- You want to maintain one project
- Content is similar across languages
- You need language switcher in rendered output

### Separated Export

Creates separate projects for each language:

```bash
# Directory structure
en/
  ├── my-article.qmd
  ├── _quarto.yml
  ├── index.qmd
  └── README.md
nl/
  ├── my-article.qmd
  ├── _quarto.yml
  ├── index.qmd
  └── README.md
README.md                      # Root readme
.translation-metadata.json
.translation-mapping.json
styles-shared.css
```

**Use when:**
- You want fully independent projects
- Different navigation/structure per language
- Separate deployment per language

## API Reference

### TranslationModule Methods

```typescript
// Initialize translation
await translation.initialize();

// Translate entire document
await translation.translateDocument('openai');

// Translate single sentence
await translation.translateSentence('sentence-id', 'local');

// Update sentence
translation.updateSentence('sentence-id', 'New content', true);

// Get statistics
const stats = translation.getStats();
// { total: 10, translated: 8, manual: 2, auto: 6, outOfSync: 0 }

// Get available providers
const providers = translation.getAvailableProviders();
// ['manual', 'local', 'openai']

// Subscribe to changes
const unsubscribe = translation.subscribe((doc) => {
  console.log('Translation updated:', doc);
});

// Clean up
translation.destroy();
```

### Export Service

```typescript
import { TranslationExportService, UnifiedExporter, SeparatedExporter } from '@modules/translation/export';

// Using base service
const exporter = new TranslationExportService({
  primaryFilename: 'article.qmd',
  projectName: 'My Article'
});

const bundle = await exporter.createBundle(document, {
  strategy: 'unified',
  languageMode: 'both',
  includeMetadata: true,
  includeMapping: true
});

const result = exporter.downloadBundle(bundle);

// Using specialized exporters
const unifiedExporter = new UnifiedExporter({ primaryFilename: 'article.qmd' });
const separatedExporter = new SeparatedExporter({ primaryFilename: 'article.qmd' });
```

## Configuration Reference

### TranslationConfig

```typescript
interface TranslationConfig {
  enabled: boolean;
  sourceLanguage: 'en' | 'nl' | 'fr';
  targetLanguage: 'en' | 'nl' | 'fr';
  defaultProvider: 'manual' | 'local' | 'openai';
  autoTranslateOnEdit: boolean;
  autoTranslateOnLoad: boolean;
  showCorrespondenceLines: boolean;
  highlightOnHover: boolean;
  providers: {
    openai?: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
    };
    local?: {
      mode?: 'fast' | 'balanced' | 'quality';
      backend?: 'auto' | 'webgpu' | 'wasm';
      downloadOnLoad?: boolean;
    };
  };
}
```

## Examples

### Example 1: Manual Translation Workflow

```yaml
---
title: "Research Paper"
review:
  enabled: true
  mode: translation
  translation:
    sourceLanguage: en
    targetLanguage: fr
    defaultProvider: manual
---
```

1. User loads document
2. Document segments into sentences
3. User double-clicks sentences to add French translations
4. User exports as separated projects

### Example 2: Auto-Translation with Review

```yaml
---
title: "Blog Post"
review:
  enabled: true
  mode: translation
  translation:
    sourceLanguage: en
    targetLanguage: nl
    defaultProvider: local
    autoTranslateOnLoad: true
    providers:
      local:
        mode: balanced
---
```

1. Document loads and auto-translates using local AI
2. User reviews auto-translated content
3. User edits specific sentences for accuracy
4. User exports as unified project with conditionals

### Example 3: Professional Translation with OpenAI

```yaml
---
title: "Technical Documentation"
review:
  enabled: true
  mode: translation
  translation:
    sourceLanguage: en
    targetLanguage: nl
    defaultProvider: openai
    providers:
      openai:
        apiKey: sk-...
        model: gpt-4
---
```

1. Document loads
2. User clicks "Translate Document"
3. High-quality translation via GPT-4
4. User reviews and exports

## Troubleshooting

### Local AI not working

- Check browser supports WebAssembly
- Check sufficient memory (1-2GB for models)
- Try WASM backend if WebGPU fails
- Use fast mode for lower memory requirements

### OpenAI translation fails

- Verify API key is valid
- Check API rate limits
- Ensure network connectivity

### Correspondence lines not showing

- Enable `showCorrespondenceLines` in config
- Check sentences are properly aligned
- Verify canvas rendering support

## Performance Optimization

### For large documents (>100 paragraphs)

1. Use fast mode local AI or manual translation
2. Translate in batches using batch translation
3. Enable auto-translate on edit to avoid re-translating entire document
4. Use separated export for better performance

### For real-time collaboration

1. Disable auto-translate on load
2. Use manual provider for controlled workflow
3. Export frequently to save progress

## Browser Compatibility

| Browser | Manual | Local AI (WASM) | Local AI (WebGPU) | OpenAI |
|---------|--------|-----------------|-------------------|--------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ❌ | ✅ |
| Safari 15+ | ✅ | ✅ | ❌ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |

## Next Steps

1. Check [example/doc-translation.qmd](../example/doc-translation.qmd) for a working example
2. Read [API documentation](https://mvwestendorp.github.io/quarto-review-extension/api/) for advanced usage
3. Review [Translation Refactor Documentation](./translation-refactor/README.md) for implementation details
