# Translation Sidebar Consolidation Plan

## Problem Statement

Currently, when switching to translation mode:
- **Review Mode**: Toolbar buttons are in the MainSidebar (right sidebar)
- **Translation Mode**: MainSidebar is hidden, replaced with a separate translation container with toolbar at the TOP
- This creates UI inconsistency and redundancy

## User Experience Issue

Users experience:
1. Different UI layouts between modes (sidebar vs top bar)
2. Redundant toolbar (buttons at top instead of in sidebar)
3. Inconsistent spatial organization

## Solution

**Keep the same sidebar visible in both modes**, with mode-specific button sections:

### Review Mode (Current)
```
MainSidebar (right side):
├── Review Tools
│   ├── Undo/Redo buttons
│   ├── Tracked Changes toggle
│   ├── Export buttons
│   └── Submit Review button
├── Translation Toggle button
└── Storage section
```

### Translation Mode (Proposed)
```
MainSidebar (right side) - STAYS VISIBLE:
├── Translation Tools (REPLACES Review Tools)
│   ├── Undo/Redo buttons (for translation)
│   ├── Translate buttons (Document/Selected)
│   ├── Provider selector
│   ├── Language selectors + Swap
│   ├── Settings (auto-translate, correspondence lines)
│   └── Export buttons
└── Exit Translation button
```

## Implementation Steps

### 1. Extend MainSidebar to Support Translation Mode Sections

**File**: `src/modules/ui/sidebars/MainSidebar.ts`

#### Add new methods:
- `createTranslationToolsSection()` - Create translation-specific buttons
- `setTranslationToolsVisible(visible)` - Show/hide translation tools section
- `onTranslateDocument(callback)` - Hook for translate all button
- `onTranslateSentence(callback)` - Hook for translate selected button
- `onProviderChange(callback)` - Hook for provider selector
- `setProvider(provider)` - Update provider display
- `onSourceLanguageChange(callback)` - Hook for source language
- `onTargetLanguageChange(callback)` - Hook for target language
- `onSwapLanguages(callback)` - Hook for swap button
- `onToggleAutoTranslate(callback)` - Hook for auto-translate setting
- `onToggleCorrespondenceLines(callback)` - Hook for correspondence lines setting
- `updateTranslationProviders(providers)` - Update available providers
- `updateTranslationLanguages(source, target)` - Update language display

#### Modify existing methods:
- `setTranslationMode(active)` - Changed to show/hide translation section instead of changing callbacks
- Remove callback switching logic (no longer needed)

### 2. Update UIModule.toggleTranslation()

**File**: `src/modules/ui/index.ts`

#### When entering translation mode (lines 339-405):
1. ✅ Hide original document (unchanged)
2. ❌ REMOVE: Hide review sidebar (will keep it visible)
3. ✅ Hide comments sidebar (unchanged)
4. CHANGE: Instead of creating separate translation container
   - Don't create `#translation-mode-wrapper`
   - Create main translation view area directly in `.review-translation-main`
   - Append to body or keep in document flow
5. Initialize TranslationController with main translation area
6. Call `mainSidebarModule.setTranslationMode(true)` to show translation tools in sidebar
7. Register translation-specific callbacks on sidebar buttons
8. Update button states

#### When exiting translation mode (lines 281-337):
1. ✅ Merge changes (unchanged)
2. ✅ Destroy translation controller (unchanged)
3. ✅ Show original document (unchanged)
4. CHANGE: Don't show review sidebar (it stays visible)
5. ✅ Show comments sidebar (unchanged)
6. Call `mainSidebarModule.setTranslationMode(false)` to show review tools
7. Restore review-specific callbacks

### 3. Update CSS Layout

**File**: `_extensions/review/assets/components/translation.css`

#### Changes:
1. Remove `.review-translation-toolbar` styling from top
2. Update `.review-translation-main` to be side-by-side with sidebar:
   - Width: calc(100% - 330px) (accounting for sidebar)
   - Remove top toolbar space
3. Update `.review-translation-mode-wrapper` layout
4. Keep MainSidebar visible (don't hide with `body.translation-mode`)

### 4. Update TranslationController

**File**: `src/modules/ui/translation/TranslationController.ts`

#### Changes:
- Remove `appendToolbarTo()` method (no longer needed)
- Remove toolbar creation from `initialize()` or move to sidebar setup
- Keep `createToolbar()` but use it only for the sidebar integration
- Update to accept sidebar callbacks instead of appending toolbar

### 5. MainSidebar Structure Changes

#### New section organization:
```typescript
// In createBody() method, add:
private createTranslationToolsSection(): HTMLElement {
  // Create section with:
  // - Translate Document button
  // - Translate Selected button
  // - Provider selector
  // - Language controls
  // - Settings toggles
  // - Export buttons (reuse existing)
}

// Modify createActionsSection() to be conditional:
// - Show in review mode
// - Hide in translation mode

// Modify createViewSection() to be conditional:
// - Show in review mode (tracked changes)
// - Hide in translation mode
```

## Benefits

1. **Consistency**: Same sidebar layout in both modes
2. **Space Efficiency**: No redundant top toolbar
3. **Familiarity**: Users keep same button locations
4. **Maintainability**: Single sidebar component manages all modes
5. **Accessibility**: Better keyboard navigation with predictable layouts

## Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `src/modules/ui/sidebars/MainSidebar.ts` | Add translation tools sections, new methods | Medium |
| `src/modules/ui/index.ts` | Update toggleTranslation() logic, remove wrapper | Medium |
| `src/modules/ui/translation/TranslationController.ts` | Remove toolbar appending | Low |
| `_extensions/review/assets/components/translation.css` | Update layout, remove top toolbar | Medium |
| `src/modules/ui/translation/TranslationToolbar.ts` | May be refactored or removed | Low |

## Testing Checklist

- [ ] Review mode: All buttons work correctly
- [ ] Switch to translation mode: Sidebar stays visible
- [ ] Translation buttons appear in sidebar
- [ ] Undo/Redo work in translation mode
- [ ] Translate Document button works
- [ ] Translate Selected sentence works
- [ ] Provider selector works
- [ ] Language selectors work
- [ ] Auto-translate toggle works
- [ ] Correspondence lines toggle works
- [ ] Export buttons work
- [ ] Exit translation mode: Review buttons reappear
- [ ] Merge completes successfully
- [ ] No console errors or warnings
- [ ] Responsive layout maintained
- [ ] Sidebar collapse/expand works in both modes
- [ ] Keyboard navigation works correctly

## Rollback Plan

If issues occur:
1. Keep translation wrapper approach as fallback
2. Can toggle back to top toolbar with CSS
3. No database/persistent data affected

## Estimated Effort

- Implementation: 4-6 hours
- Testing: 2-3 hours
- Total: ~8 hours

## Priority

**High** - Improves user experience consistency and reduces UI complexity
