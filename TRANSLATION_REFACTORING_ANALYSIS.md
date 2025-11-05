# Translation Module Refactoring Analysis

**Date:** 2025-11-05
**Status:** Analysis Phase
**Goal:** Align translation module with recent architectural refactoring while preserving sentence-level functionality

---

## Current State

### What's Already Implemented ✅

**Phase 1 - Critical Fixes (Complete)**
- ✅ Translation-to-review merge (prevents data loss)
- ✅ Out-of-sync detection
- ✅ Persistence stabilization
- ✅ Extension registry scaffolding

**Phase 2 - UI Consolidation (Complete)**
- ✅ Toolbar consolidation
- ✅ Manual mode target pre-creation

**Phase 3 - UX Stability (Partially Complete)**
- ✅ Focus & selection management (T1)
- ✅ Inline status chips (T2)
- ✅ Inline progress feedback (T3)
- ✅ Keyboard shortcuts (T4)
- ✅ Error states (T5)
- 🔄 Accessibility audit (T6) - in progress
- ☐ Performance polish (T7)
- ☐ Plugin lifecycle QA (T8)
- ☐ Documentation & demos (T9)
- ☐ UI parity & persistence (T10)

### Recent Architectural Changes (Not Yet Applied to Translation)

1. **Central State Management (StateStore)**
   - UIModule and EditorManager now use StateStore
   - Translation components still use local state
   - Commit: `1174416` and `2a8aa46`

2. **Service Extraction Pattern**
   - NotificationService, LoadingService, PersistenceManager, EditorManager extracted
   - Translation controller could benefit from these services
   - Commit: Various in roadmap

3. **Integration Test Infrastructure**
   - Comprehensive multi-module tests added
   - Translation module needs integration test coverage
   - Commit: `668a21e`

---

## Architecture Analysis

### Core Principle: Dual-Level Architecture

**CRITICAL DISTINCTION:**
- **Editing**: Happens at SEGMENT level (full context, consistent with review mode)
- **Visual Cues + Translation**: Happens at SENTENCE level (fine-grained control)

```
┌─────────────────────────────────────┐
│   ChangesModule (Core)              │
│   - Elements/Segments (atomic units)│
│   - Undo/redo at segment level      │
└─────────────────────────────────────┘
            ↑
            │ extends via ChangesExtension
            │
┌─────────────────────────────────────┐
│   TranslationModule (Extension)     │
│   - Segments → Sentences mapping    │
│   - Sentence-level correspondence   │
│   - Translation status tracking     │
│   - Provider orchestration          │
└─────────────────────────────────────┘
            ↑
            │ consumes
            │
┌─────────────────────────────────────┐
│   TranslationView (UI Layer)        │
│   - RENDERS: Sentence-level visual  │
│   - STATUS: Per-sentence indicators │
│   - EDITS: Segment-level via        │
│     ChangesModule (full context)    │
│   - TRANSLATES: Sentence-level ops  │
└─────────────────────────────────────┘
```

**Segment (Editing Unit):**
```
┌─ Segment (Click to edit entire segment) ──────────┐
│                                                    │
│  • Sentence 1 [Auto-translated] [Translate]       │
│  • Sentence 2 [Manual] [Approve]                  │
│  • Sentence 3 [Out-of-sync] [Re-translate]        │
│                                                    │
│  [Edit Segment] ← Opens Milkdown for full segment │
└────────────────────────────────────────────────────┘
```

**Key Architecture Points:**

1. **Editing (Segment-level):**
   - User clicks "Edit" on a segment (not individual sentences)
   - Opens Milkdown editor with FULL segment content
   - All sentences in segment visible during edit
   - Changes saved at segment level via ChangesModule
   - Undo/redo works at segment level

2. **Visual Cues (Sentence-level):**
   - Each sentence shows its translation status
   - Color coding, icons, status chips per sentence
   - Hover highlights corresponding sentence in other pane
   - Correspondence lines connect related sentences

3. **Translation Operations (Sentence-level):**
   - "Translate this sentence" button per sentence
   - Can translate individual sentences without full segment
   - Translation status tracked per sentence
   - Approval workflow per sentence

4. **Benefits:**
   - Natural editing with full context (segment-level)
   - Fine-grained translation control (sentence-level)
   - Clear visual feedback (sentence-level)
   - Consistent with review mode editing (segment-level)

---

## Current Implementation vs Target Architecture

### What's Currently Correct ✅

1. **Sentence-level rendering** - Sentences are displayed with individual status indicators
2. **Sentence-level translation operations** - Can translate individual sentences
3. **Visual status indicators** - Status chips showing auto/manual/edited per sentence
4. **Correspondence visualization** - Lines connecting related sentences

### What Needs to Change 🔧

1. **Editing Level** (Currently: sentence-level → Should be: segment-level)
   - **Current:** Double-clicking a sentence opens editor for just that sentence
   - **Target:** Clicking "Edit" on a segment opens editor for entire segment
   - **Implementation:**
     - Remove sentence double-click editing
     - Add segment-level edit button/trigger
     - Editor receives full segment content (all sentences merged)
     - After save, segment content is split back into sentences for status tracking

2. **Editor Bridge** (Currently: sentence-focused → Should be: segment-focused)
   - **Current:** `TranslationEditorBridge` has `initializeSentenceEditor()`
   - **Target:** Should have `initializeSegmentEditor()`
   - **Implementation:**
     - Update EditorBridge to work with segments (element IDs)
     - Pass full segment content to Milkdown
     - Use same editor configuration as review mode

3. **Callbacks** (Currently: sentence IDs → Should be: element IDs)
   - **Current:** `onSourceSentenceEdit(sentenceId, content)`
   - **Target:** `onSourceSegmentEdit(elementId, content)`
   - **Implementation:**
     - Update callback signatures
     - Controller receives element ID and full segment content
     - TranslationModule re-segments content into sentences internally

4. **TranslationChangesModule** (Currently: separate undo stack → Should be: use ChangesModule)
   - **Current:** Separate undo/redo for translation at sentence level
   - **Target:** Use main ChangesModule for segment-level undo/redo
   - **Implementation:**
     - Remove TranslationChangesModule
     - Translation edits go through ChangesModule
     - TranslationModule listens to ChangesModule operations
     - Re-segments content after each edit

### What to Keep (Already Correct) ✅

- Sentence rendering and display
- Status indicators per sentence
- Sentence-level translation buttons
- Correspondence mapping
- Progress tracking
- Error states per sentence
- Keyboard shortcuts
- Focus management

---

## Gap Analysis

### 1. State Management Integration

**Current:** Translation components use local state
```typescript
// TranslationController.ts
private selectedSourceSentenceId: string | null = null;
private selectedTargetSentenceId: string | null = null;
```

**Needed:** Integrate with central StateStore
```typescript
// Use state store for translation state
this.stateStore.setTranslationState({
  selectedSourceSentence: '...',
  selectedTargetSentence: '...',
  mode: 'manual' | 'automatic',
  busy: false,
})
```

**Benefits:**
- Consistent state access across components
- Better debugging via state snapshots
- Reactive updates across UI
- Proper cleanup on mode switching

---

### 2. Module Reuse Opportunities

**Storage:**
- Current: `TranslationPersistence` (separate localStorage implementation)
- Opportunity: Leverage `PersistenceManager` service for unified storage strategy
- Could share auto-save logic, storage availability checks, size limits

**Notifications:**
- Current: Direct `onNotification` callback
- Opportunity: Use `NotificationService` for consistent UI feedback

**Loading States:**
- Current: Custom progress tracking
- Opportunity: Use `LoadingService` for unified busy states

---

### 3. Visual Clues Enhancement

**Current Status Indicators:**
- untranslated (not yet translated)
- auto-translated (automatically translated)
- manual (manually entered)
- edited (auto-translated then edited)
- out-of-sync (source changed)
- synced (up to date)

**Missing/Unclear:**
- "Approved" state (human reviewed and approved auto-translation)
- Clear visual distinction between:
  - Original text (no translation needed)
  - Empty (awaiting translation)
  - Draft (work in progress)
  - Final (human approved)

**Proposed Enhancement:**
```typescript
type TranslationStatus =
  | 'original'          // Source text, no translation
  | 'awaiting'          // Empty target, awaiting translation
  | 'auto-translated'   // AI-generated, not reviewed
  | 'human-reviewed'    // Human reviewed auto-translation
  | 'manually-entered'  // Human-written translation
  | 'edited'            // Modified after initial translation
  | 'out-of-sync'       // Source changed since translation
  | 'approved'          // Final, approved by human
```

**Visual Design:**
- Color coding: gray (awaiting), blue (auto), green (approved), yellow (edited), red (out-of-sync)
- Icons: robot (auto), person (manual), checkmark (approved), warning (out-of-sync)
- Accessibility: ARIA labels, patterns (not just color), keyboard navigation

---

### 4. Editing Workflow Clarity

**Current Flow:**
1. User double-clicks sentence
2. Editor opens for that sentence
3. User edits
4. User saves
5. Status updates to "manual" or "edited"

**Enhancement Needed:**
- Clear indication of what's being edited (which sentence in which language)
- Highlight corresponding sentence in other pane during edit
- Show preview of changes before committing
- Keyboard navigation between sentences
- Quick actions: "Translate this", "Approve", "Edit", "Revert"

---

### 5. Correspondence Visualization

**Current:**
- Correspondence pairs tracked in `CorrespondenceMap`
- Lines can be drawn between corresponding sentences (if enabled)

**Enhancement Needed:**
- Visual indication of 1:1, 1:N, N:1 mappings
- Highlight sentence groups that map together
- Show confidence scores for automatic correspondences
- Allow manual adjustment of correspondence

---

### 6. Export and Persistence

**Current:**
- `TranslationExportService` handles export
- Separate from main export pipeline

**Integration Opportunity:**
- Hook into `QmdExportService` for unified export
- Support exporting source, target, or bilingual formats
- Include translation metadata in exports
- Resume translation across sessions

---

## Refactoring Plan

### Phase A: State Management Integration (2-3 hours)

**Status:** ✅ Task 1 Complete | 🔄 Tasks 2-3 In Progress

**Tasks:**
1. ✅ Extend StateStore with translation state domain
2. 🔄 Update TranslationController to use StateStore
3. 🔄 Update TranslationView to react to state changes
4. Remove local state management code

**Files:**
- ✅ `src/services/StateStore.ts` - Added translation state
- ✅ `src/modules/ui/shared/UIState.ts` - Added TranslationState interface
- 🔄 `src/modules/ui/translation/TranslationController.ts` - Use StateStore
- 🔄 `src/modules/ui/translation/TranslationView.ts` - Subscribe to state

---

### Phase A2: Segment-Level Editing (3-4 hours) **[NEW - CRITICAL]**

**Status:** ☐ Not Started

**Goal:** Change editing from sentence-level to segment-level while keeping sentence-level visual cues

**Tasks:**
1. Update TranslationView rendering to show segments with sentence visual cues inside
2. Add segment-level edit triggers (edit button per segment)
3. Update TranslationEditorBridge to work with segments instead of sentences
4. Change callbacks from `onSentenceEdit()` to `onSegmentEdit()`
5. Update TranslationController to handle segment edits
6. Ensure TranslationModule re-segments content after edits
7. Remove sentence double-click editing
8. Keep sentence-level translation buttons and status indicators

**Files:**
- `src/modules/ui/translation/TranslationView.ts` - Render segments, add edit triggers
- `src/modules/ui/translation/TranslationEditorBridge.ts` - Change to segment editing
- `src/modules/ui/translation/TranslationController.ts` - Handle segment callbacks
- `src/modules/translation/index.ts` - Re-segmentation logic

**Key Changes:**
```typescript
// Before (sentence-level editing):
onSentenceEdit(sentenceId: string, newContent: string)

// After (segment-level editing):
onSegmentEdit(elementId: string, newContent: string)
// TranslationModule internally re-segments the content into sentences
```

**Visual Structure:**
```
Segment Container
├─ Sentence 1 (visual status, translate button)
├─ Sentence 2 (visual status, translate button)
├─ Sentence 3 (visual status, translate button)
└─ [Edit Segment] button (opens full segment in Milkdown)
```

---

### Phase B: Service Integration (2-3 hours)

**Tasks:**
1. Use PersistenceManager for translation persistence
2. Use NotificationService for user feedback
3. Use LoadingService for busy states
4. Remove duplicate service code

**Files:**
- `src/modules/translation/storage/TranslationPersistence.ts` - Refactor to use PersistenceManager
- `src/modules/ui/translation/TranslationController.ts` - Use services

---

### Phase C: Visual Clues Enhancement (3-4 hours)

**Tasks:**
1. Expand translation status types
2. Design and implement new status indicators
3. Add approval workflow UI
4. Improve accessibility of status indicators
5. Add icons and better color coding

**Files:**
- `src/modules/translation/types.ts` - Extend TranslationStatus
- `src/modules/ui/translation/TranslationView.ts` - Update status rendering
- `_extensions/review/assets/translation.css` - Add new styles

---

### Phase D: Workflow Improvements (3-4 hours)

**Tasks:**
1. Add quick actions toolbar per sentence
2. Improve keyboard navigation
3. Add edit preview/confirmation
4. Show context during editing
5. Add bulk operations (translate all, approve all visible)

**Files:**
- `src/modules/ui/translation/TranslationView.ts` - Add quick actions
- `src/modules/ui/translation/TranslationController.ts` - Handle actions

---

### Phase E: Testing & Documentation (2-3 hours)

**Tasks:**
1. Add integration tests for translation workflow
2. Update user documentation
3. Add inline code documentation
4. Create demo/tutorial video

**Files:**
- `tests/integration/translation-workflow.test.ts` - New tests
- `docs/user/TRANSLATION_GUIDE.md` - User guide
- Code comments throughout

---

## Timeline

**Total Estimate:** 15-21 hours (updated with Phase A2)

**Priority Order:**
1. ✅ Phase A Task 1 (State Management) - COMPLETE - Foundation established
2. **Phase A2 (Segment-Level Editing) - NEXT - Critical architecture fix**
3. Phase A Tasks 2-3 (Controller/View StateStore integration)
4. Phase C (Visual Clues) - Most user-visible improvement
5. Phase D (Workflow) - Enhanced UX
6. Phase B (Services) - Code quality improvement
7. Phase E (Testing) - Ensure quality

**Rationale for Phase A2 Priority:**
Phase A2 (segment-level editing) is critical because:
- Aligns editing with core architecture (segments are the atomic unit)
- Consistent with review mode (same editing experience)
- Foundation for proper undo/redo integration
- Enables removal of TranslationChangesModule
- Must be done before other refactoring to avoid rework

---

## Success Criteria

### User Experience
- [ ] Clear visual distinction between auto and manual translations
- [ ] Easy to see what's been edited vs what's original
- [ ] Obvious which sentences are out-of-sync
- [ ] Simple approval workflow for auto-translations
- [ ] Keyboard-accessible throughout

### Code Quality
- [ ] Consistent with StateStore pattern
- [ ] Reuses services where appropriate
- [ ] Well-tested with integration tests
- [ ] Documented for future maintainers

### Architecture
- [ ] Sentences remain visible refinement layer
- [ ] Proper extension of core segment system
- [ ] Clean separation of concerns
- [ ] Extensible for future enhancements

---

## Open Questions

1. **Approval Workflow:** Should there be a formal "approve" button, or is editing sufficient?
2. **Batch Operations:** How important is "translate all visible sentences" vs one-at-a-time?
3. **Correspondence UI:** Should users be able to manually adjust sentence correspondence?
4. **Export Formats:** What bilingual export formats are needed (side-by-side, interleaved, separate files)?

---

## Next Steps

1. Review this analysis with stakeholders
2. Prioritize phases based on user needs
3. Begin Phase A implementation
4. Iterate with user feedback
