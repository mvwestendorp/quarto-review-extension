# Translation UI Segment-Based Refactoring Plan

## Executive Summary

The current translation UI incorrectly renders and edits at the **sentence level**, while the architectural principle is that editing should happen at the **segment/element level**. Sentences are an internal translation-engine concern for live translation and should not be exposed in the UI.

## Current Architecture Issues

### Problem 1: Sentence-Based UI Rendering
- `TranslationView.renderSentences()` creates individual DOM elements for each sentence
- Each sentence is click able, editable, and has its own status indicators
- This creates parallel DOM hierarchies (elements contain sentences)

### Problem 2: Sentence-Level Editing
- Double-clicking a sentence opens an editor for just that sentence
- `TranslationEditorBridge.initializeSentenceEditor()` edits individual sentences
- After editing, controller merges all sentences in an element - inefficient

### Problem 3: Inconsistent with Review Mode
- Review mode: Edit entire segments/elements with full toolbar
- Translation mode: Edit individual sentences with reduced context
- Users get different editing experiences

## Correct Architecture

### Principle: Translation as an Extension

**Translation mode is an EXTENSION to the core review system, not a separate system.**

```
Core Architecture:
  ChangesModule (owns all document segments)
    └─ Elements/Segments (the source of truth)

UIModule (review mode)
    └─ Renders and edits segments directly
    └─ Uses ChangesModule.edit() for all changes

TranslationModule (extension)
    └─ REGISTERS with ChangesModule as an extension
    └─ Provides translation-specific features on top of segments
    └─ Internal: Sentences (for translation API only)
    └─ Never creates its own segment store

TranslationUI (extension UI)
    └─ Also renders and edits segments (same as UIModule)
    └─ Shows source + target side-by-side
    └─ Uses same ChangesModule.edit() API
    └─ Uses same MilkdownEditor
    └─ Extension adds: language selection, translation buttons, correspondence visualization
```

### Key Architectural Principles:

1. **Single Source of Truth**: ChangesModule owns ALL segments
2. **Extension Pattern**: TranslationModule extends, doesn't duplicate
3. **Shared APIs**: Both review and translation use `ChangesModule.edit(elementId, content)`
4. **Shared Editor**: Both use the same MilkdownEditor configuration
5. **Extension Features Only**: Translation adds language handling, live translation, correspondence - nothing more

### Translation UI Should:
1. Render source and target **segments** side-by-side (same segments as review mode)
2. Display segment content directly from ChangesModule (no separate sentence DOM)
3. Edit entire segments using the same editor as review mode
4. Call `ChangesModule.edit()` directly - no intermediate merging
5. Sentences exist only for:
   - Internal correspondence tracking (which source sentence → which target sentence)
   - Live translation API calls (translate individual sentences)
   - **Never in the DOM, never in the editing UI**

### What Translation Extension Adds:

**To ChangesModule segments:**
- Language metadata (source language, target language)
- Translation status (untranslated, auto-translated, manual, out-of-sync)
- Correspondence data (which source elements map to which target elements)

**To UI:**
- Side-by-side source/target panes
- Translation controls (translate button, provider selection)
- Progress indicators for translation operations
- Correspondence visualization (lines connecting related segments)

**Internal to Translation Engine:**
- Sentence segmentation (for API calls only)
- Translation provider management
- Translation state persistence

## Implementation Plan

### Phase 1: Update TranslationView Rendering

**File:** `src/modules/ui/translation/TranslationView.ts`

**Changes:**
1. Replace `renderSentences()` with `renderSegments()`
2. Group by elementId and merge sentences into segment content
3. Create segment elements similar to review mode:
   ```typescript
   <div class="review-translation-segment" data-element-id="..." data-side="source|target">
     <div class="review-translation-segment-content">
       <!-- Merged markdown from all sentences -->
     </div>
   </div>
   ```
4. Remove sentence-specific CSS classes and event handlers
5. Bind events at segment level (double-click segment to edit)

### Phase 2: Update Editing Flow

**Files:**
- `src/modules/ui/translation/TranslationController.ts`
- `src/modules/ui/translation/TranslationEditorBridge.ts`

**Changes:**
1. Remove `handleSourceSentenceEdit()` and `handleTargetSentenceEdit()`
2. Add `handleSourceSegmentEdit()` and `handleTargetSegmentEdit()`
3. Edit handler receives `(elementId, newContent, side)` not `(sentenceId, ...)`
4. Controller calls `changes.edit(elementId, newContent)` directly
5. No sentence merging needed - content is already complete

**EditorBridge:**
1. Remove `initializeSentenceEditor()`
2. Add `initializeSegmentEditor(container, elementId, content, side)`
3. Use full MilkdownEditor configuration (same as review mode)
4. Include full toolbar with all formatting options

### Phase 3: Update Controller Integration (Extension Pattern)

**File:** `src/modules/ui/translation/TranslationController.ts`

**Current (Wrong) - Bypasses Extension:**
```typescript
// Edits individual sentence, then manually syncs
handleTargetSentenceEdit(sentenceId, newContent) {
  translationModule.updateSentence(sentenceId, newContent, false);
  // Get element, merge all sentences
  const merged = mergeAllSentencesInElement();
  changes.edit(elementId, merged);  // Direct call, bypassing extension
}
```

**Correct (Extension Pattern):**
```typescript
// Edits entire segment via ChangesModule
// TranslationModule listens and reacts as an extension
handleTargetSegmentEdit(elementId, newContent) {
  // Directly edit the segment in ChangesModule (same as review mode)
  this.config.translationModuleConfig.changes.edit(elementId, newContent);

  // TranslationModule, registered as extension, receives notification via:
  // - Extension.onElementChanged(elementId, newContent)
  // - Internally re-segments content into sentences
  // - Updates translation state and correspondence
}
```

**Key Insight:** The controller should NOT call TranslationModule directly for edits. It should call ChangesModule, and let the extension react.

### Phase 4: Extension Event Handlers (React to ChangesModule)

**File:** `src/modules/translation/index.ts`

**Implement Extension Interface:**
```typescript
// TranslationModule already implements ChangesExtension
// Update the onElementChanged handler to react to edits

onElementChanged(change: ExtensionChange): void {
  if (change.type === 'edit' && change.source !== this.id) {
    // Another module (UI, translation controller) edited an element
    // Re-segment the content and update internal translation state
    this.handleExternalElementEdit(change.elementId, change.newContent);
  }
}

private handleExternalElementEdit(elementId: string, newContent: string): void {
  // Determine if this is source or target element
  const isSource = this.isSourceElement(elementId);
  const language = isSource
    ? this.config.config.sourceLanguage
    : this.config.config.targetLanguage;

  // Re-segment the new content into sentences
  const newSentences = this.segmenter.segmentText(newContent, language, elementId);

  // Replace sentences for this element in internal state
  if (isSource) {
    this.state.replaceSourceSentences(elementId, newSentences);
  } else {
    this.state.replaceTargetSentences(elementId, newSentences);
  }

  // Update correspondence pairs if needed
  this.updateCorrespondenceForElement(elementId);

  // Emit translation-specific event
  this.emitTranslationEvent('translation:state-updated', {
    document: this.state.getDocument(),
  });
}
```

**Key Insight:** TranslationModule REACTS to edits made via ChangesModule, it doesn't drive them. This is the extension pattern.

### Phase 5: Remove Sentence-Level APIs

**Files to Clean:**
- Remove `TranslationChangesModule` entirely (sentence-level tracking)
- Remove `editSentence()` from controllers
- Remove sentence callbacks from `TranslationViewCallbacks`
- Remove sentence-specific UI methods in TranslationView
- Update CSS to remove `.review-translation-sentence` classes

## Migration Strategy

### Step 1: Add Segment-Based Methods (Non-Breaking)
- Add new segment rendering methods alongside existing ones
- Add new segment edit handlers
- Test segment-based flow in isolation

### Step 2: Switch View to Use Segments
- Update `TranslationView.render()` to call `renderSegments()` instead of `renderSentences()`
- Update event bindings to segment level
- Test UI rendering

### Step 3: Switch Editing to Segments
- Update controller to use segment edit handlers
- Update EditorBridge to work at segment level
- Test editing flow

### Step 4: Remove Sentence UI Code
- Delete `renderSentences()`, `createSentenceElement()`, etc.
- Remove sentence event handlers
- Clean up CSS

### Step 5: Internal Cleanup
- Remove `TranslationChangesModule`
- Remove sentence-level APIs that are no longer needed
- Keep internal sentence tracking for translation engine only

## Expected Outcomes

### User Experience
- Consistent editing between review mode and translation mode
- Same editor, same toolbar, same feel
- Edit entire segments at once (more context, more efficient)

### Code Quality
- ~1200 lines of sentence-specific UI code removed
- Simpler controller logic (no sentence merging needed)
- Single source of truth for segment content

### Architecture
- Clean separation: segments for UI/editing, sentences for translation internals
- No cross-dependencies between translation sentences and changes tracking
- Translation module is a true extension of the changes system

## Testing Strategy

1. **Unit Tests**: Update to test segment-level APIs
2. **Integration Tests**: Test segment edit → changes → translation flow
3. **E2E Tests**: Test UI rendering and editing at segment level
4. **Manual Testing**: Compare translation mode editing with review mode

## Files Affected

### Primary Changes
- `src/modules/ui/translation/TranslationView.ts` - Complete rewrite of rendering
- `src/modules/ui/translation/TranslationController.ts` - New segment handlers
- `src/modules/ui/translation/TranslationEditorBridge.ts` - Segment editing
- `src/modules/translation/index.ts` - Add segment update methods

### Removals
- `src/modules/translation/TranslationChangesModule.ts` - Delete entire file
- Sentence-specific methods in multiple files

### CSS Updates
- Remove `.review-translation-sentence` and related classes
- Add `.review-translation-segment` classes
- Reuse review mode segment styles where possible

## Timeline Estimate

- Phase 1 (Rendering): 2-3 hours
- Phase 2 (Editing): 2-3 hours
- Phase 3 (Controller): 1-2 hours
- Phase 4 (State): 2-3 hours
- Phase 5 (Cleanup): 1-2 hours
- Testing: 2-3 hours

**Total: ~12-16 hours of development**

## Risks and Mitigations

### Risk: Breaking Existing Tests
**Mitigation**: Update tests incrementally, keep sentence-based code temporarily

### Risk: Translation Engine Coupling
**Mitigation**: Keep internal sentence tracking, only change UI/editing layer

### Risk: Correspondence Visualization
**Mitigation**: Correspondence can still work at element level, showing which source/target segments are paired

## Decision Log

### Why Not Keep Sentence UI?
- Creates architectural inconsistency
- Complicates editing (merge required)
- Different UX from review mode
- Violates segment-based principle

### Why Remove TranslationChangesModule?
- Undo/redo should work at segment level (use main ChangesModule)
- Sentence-level undo doesn't make architectural sense
- Reduces code duplication

### Why Re-segment on Edit?
- User edits may change sentence boundaries
- Need to keep translation engine's sentence tracking fresh
- Allows live translation to work with updated sentences
