# Translation Module - Interactive Demo Guide

## Overview

This guide demonstrates how to use the translation module interactively within the Quarto Review Extension.

## Quick Start

### Opening the Translation UI

1. Open a document in the Quarto Review Extension
2. Look at the sidebar on the right
3. Click on the **"🌐 Open Translation"** button in the Translation section
4. The translation interface will appear with:
   - Translation toolbar at the top
   - Side-by-side view of source and target content
   - Statistics panel showing translation progress

### Core Features

#### 1. Translate Entire Document

**Button:** "Translate All" in the Actions section

**Keyboard Shortcut:** `Ctrl+T` (Windows/Linux) or `Cmd+T` (Mac)

**What it does:**
- Segments the document into sentences
- Translates all sentences using the selected provider
- Shows progress percentage (0-100%)
- Updates the target pane in real-time

**Example:**
```
English (Source):
"Hello, how are you today? I hope you're having a great day."

Dutch (Target):
"Hallo, hoe gaat het vandaag met je? Ik hoop dat je een geweldige dag hebt."
```

#### 2. Translate Selected Sentence

**Button:** "Translate Selected" in the Actions section

**Keyboard Shortcut:** `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

**What it does:**
- Translates only the currently selected sentence
- Useful for refining specific translations
- Much faster than translating the entire document

**Usage:**
1. Click on a sentence in the source pane to select it
2. Press `Ctrl+Shift+T` or click "Translate Selected"
3. The corresponding target sentence updates

#### 3. Provider Selection

**Location:** Provider dropdown in the toolbar

**Available Providers:**
- **Manual** - Manually edit translations without automatic translation
- **Local AI (WebGPU)** - Uses transformer models locally (fastest for small documents)
- **OpenAI** - Uses GPT-based translation (requires API key)
- **Google Translate** - (Available for future integration)
- **DeepL** - (Available for future integration)

**Provider Performance:**
| Provider | Speed | Quality | Requires Key | Offline |
|----------|-------|---------|--------------|---------|
| Manual | N/A | User-dependent | No | Yes |
| Local AI | Fast (0.2-1s/sentence) | Good | No | Yes |
| OpenAI | Medium (0.5-1s) | Excellent | Yes | No |
| Google | Medium (0.3-0.8s) | Good | Yes | No |

#### 4. Language Selection

**Location:** Language dropdowns in the toolbar

**Supported Languages:**
- English (en)
- Dutch (nl)
- French (fr)

**Swap Languages:** Click the ↔️ button between language dropdowns

**Keyboard Shortcut:** `Ctrl+Alt+S` (Windows/Linux) or `Cmd+Option+S` (Mac)

**Example Workflow:**
1. Set Source: English, Target: Dutch
2. Translate document → Dutch translation appears
3. Click swap or press `Ctrl+Alt+S`
4. Now Source: Dutch, Target: English
5. Translate again → English back-translation appears

#### 5. View Correspondence Lines

**Toggle:** "Show correspondence lines" checkbox in Settings

**What it shows:**
- Canvas-rendered lines connecting source sentences to their target translations
- Shows sentence alignment quality
- Helps identify mistranslations or misalignments

**Color coding:**
- Solid line = Strong correspondence (high confidence)
- Dashed line = Weak correspondence (uncertain alignment)

#### 6. Auto-translate on Edit

**Toggle:** "Auto-translate on edit" checkbox in Settings

**When enabled:**
- Editing a source sentence automatically triggers retranslation
- Target sentence updates immediately after editing
- Useful for iterative refinement

**When disabled:**
- You must manually trigger translation
- Better for batch processing

#### 7. Inline Editing

**Source Pane:**
- Double-click a sentence to edit the source text
- Changes are tracked automatically
- Original and edited versions compared

**Target Pane:**
- Double-click a sentence to edit the translation
- Manually review and correct translations
- Marks sentence as "manually edited"

**Status Indicators:**
- 🟢 Untranslated - No translation yet
- 🟡 Auto-translated - Translated by provider
- 🔵 Manual - Manually translated or edited
- 🟠 Out-of-sync - Source changed, translation outdated
- ✅ Synced - Translation matches current source

## Workflow Examples

### Example 1: Quick Document Translation

**Goal:** Translate a document from English to Dutch

1. Open document in Quarto Review
2. Click "🌐 Open Translation"
3. Verify source language = English, target = Dutch
4. Select provider: "Local AI (WebGPU)"
5. Click "Translate All" or press `Ctrl+T`
6. Wait for progress to reach 100%
7. Review translations in target pane
8. Make manual edits where needed
9. Click "🌐 Close Translation" when done

**Time estimate:** 2-5 minutes (depending on document size)

### Example 2: Back-Translation Quality Check

**Goal:** Verify translation quality using back-translation

1. Translate English → Dutch (see Example 1)
2. Press `Ctrl+Alt+S` to swap languages
3. Click "Translate All" to translate Dutch → English
4. Compare back-translation to original
5. Large differences indicate quality issues
6. Manually correct Dutch translations for low-quality sections
7. Repeat step 2-6 until satisfied

**Time estimate:** 5-10 minutes

### Example 3: Bilingual Document Creation

**Goal:** Create a document with both English and Dutch visible

1. Enable "Show correspondence lines"
2. Translate English → Dutch
3. Resize panes to show both side-by-side
4. Use "Export" to save bilingual version
5. Both versions available for reference

**Time estimate:** 3-5 minutes

### Example 4: Iterative Refinement

**Goal:** Gradually improve translations through iteration

1. Enable "Auto-translate on edit"
2. Select provider: "Manual"
3. Manually enter Dutch translations
4. Double-click source sentences to read context
5. Type translation in target pane
6. Press Enter to move to next sentence
7. After manual review, select "Local AI" provider
8. Re-run auto-translate on remaining untranslated sections
9. Fine-tune AI translations manually

**Time estimate:** Variable (depends on document complexity)

## Keyboard Shortcut Reference

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Translate All | `Ctrl+T` | `Cmd+T` |
| Translate Selected | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| Swap Languages | `Ctrl+Alt+S` | `Cmd+Option+S` |
| Accept Suggestion | `Enter` | `Return` |
| Cancel Edit | `Escape` | `Escape` |

## Tips & Tricks

### Performance Optimization

1. **For large documents:**
   - Use "Local AI" provider (offline, predictable)
   - Translate in batches of 10-20 sentences
   - Monitor progress indicator

2. **For better translations:**
   - Manual review of Auto-AI results
   - Back-translation verification
   - Provide context through section headings

3. **Memory considerations:**
   - Close translation UI when not in use
   - Reload page if experiencing slowness
   - Disable correspondence lines for very large documents

### Quality Checks

1. **Automated checks:**
   - Look for very short or very long translations (possible errors)
   - Check correspondence lines for misalignments
   - Review sentences marked "out-of-sync"

2. **Manual review:**
   - Read full sentences (not word-by-word)
   - Check terminology consistency
   - Verify grammar and formatting

3. **Cultural adaptation:**
   - Idioms may not translate literally
   - Numbers and dates follow different formats
   - Honorifics and formality levels vary

## Advanced Features

### Export Options

**When closing translation UI:**
- Option to export bilingual version
- Choose export format:
  - Unified (single document with language conditionals)
  - Separated (individual language projects)

### Translation Statistics

**Available in Statistics Panel:**
- Total sentences: Count of all sentences
- Translated: Count of translated sentences
- Progress: Percentage completion
- Manual: Count of manually edited sentences
- Average confidence: Quality metric for AI translations

### Correspondence Mapping

**Shows:**
- One-to-one sentence mappings (ideal)
- One-to-many mappings (sentence split)
- Many-to-one mappings (sentence merged)
- Alignment confidence scores

## Troubleshooting

### Issue: "Translation failed"

**Solutions:**
1. Check network connection (if using cloud provider)
2. Verify API key is set (for OpenAI)
3. Try with Local AI provider (no dependencies)
4. Reload the page and try again

### Issue: "Progress stuck at X%"

**Solutions:**
1. Wait longer (large documents take time)
2. Check browser console for errors (F12)
3. Try translating fewer sentences first
4. Switch to different provider

### Issue: "Poor translation quality"

**Solutions:**
1. Try different provider (OpenAI often better quality)
2. Manually review and edit translations
3. Use context sections (add titles for context)
4. Back-translate to verify accuracy

### Issue: "Correspondence lines not showing"

**Solutions:**
1. Check "Show correspondence lines" is enabled
2. Zoom out to see lines clearly
3. Try reducing number of sentences
4. Disable/re-enable to refresh

## Getting Help

For issues or feature requests:
- Check the main translation documentation: `TRANSLATION_INTEGRATION.md`
- See the implementation plan: `TRANSLATION_MODULE_IMPLEMENTATION_PLAN.md`
- Review local AI options: `LOCAL_TRANSLATION_OPTIONS.md`

## Next Steps

1. Try translating a test document
2. Experiment with different providers
3. Practice keyboard shortcuts
4. Build confidence with small documents
5. Scale up to larger projects

Happy translating! 🌐

