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

### Core Principle: Sentences as Refinement Layer

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
│   - Sentence-level visualization    │
│   - Status indicators per sentence  │
│   - Edits segments via ChangesModule│
│   - Sentences guide translation flow│
└─────────────────────────────────────┘
```

**Key Insight:** Sentences are NOT internal-only. They are a visible refinement layer that:
- Guide translation workflow (smaller, manageable units)
- Track correspondence between source and target at fine granularity
- Show translation status (auto vs manual, edited, synced, out-of-sync)
- Enable selective translation (translate one sentence at a time)

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

**Tasks:**
1. Extend StateStore with translation state domain
2. Update TranslationController to use StateStore
3. Update TranslationView to react to state changes
4. Remove local state management code

**Files:**
- `src/services/StateStore.ts` - Add translation state
- `src/modules/ui/translation/TranslationController.ts` - Use StateStore
- `src/modules/ui/translation/TranslationView.ts` - Subscribe to state

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

**Total Estimate:** 12-17 hours

**Priority Order:**
1. Phase A (State Management) - Foundation for everything else
2. Phase C (Visual Clues) - Most user-visible improvement
3. Phase D (Workflow) - Enhanced UX
4. Phase B (Services) - Code quality improvement
5. Phase E (Testing) - Ensure quality

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
