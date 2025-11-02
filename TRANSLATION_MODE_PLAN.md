# Translation Mode Implementation Plan

**Status:** Ready for Implementation
**Created:** 2025-11-02
**Priority:** HIGH - Data loss issues must be addressed

---

## ⚠️ CRITICAL WARNINGS

### 1. Data Loss: Translation Edits Not Synced to Review Mode

**Current Behavior:**
- When switching from review mode → translation mode: Review edits ARE preserved
- When switching from translation mode → review mode: Translation edits are NOT propagated back
- Translation edits exist only in `TranslationChangesModule` and `localStorage`, disconnected from main document

**Impact:**
- Users lose translation work when switching back to review mode
- Translation state saved to localStorage but remains disconnected from review operations
- Undo/redo history lost when switching modes

**Code Location:**
- `src/modules/ui/translation/TranslationController.ts:591-608` (destroy method)
- `src/modules/ui/index.ts:274-367` (toggleTranslation method)

### 2. No Out-of-Sync Detection

**Current Behavior:**
- No mechanism to detect if source content changed since translation began
- TranslationModule initializes from ChangesModule but doesn't track subsequent changes

**Impact:**
- Translation work can become invalid if source changes
- No warning that translation may be based on outdated source

---

## Architecture Analysis

### Mode Switching Flow

**Review Mode → Translation Mode:**
```
1. UIModule.toggleTranslation() (line 274)
2. Hide review UI (lines 296-298)
   - Original document hidden
   - Review sidebar hidden
   - Comments sidebar hidden
3. Create translation wrapper DOM
4. Initialize TranslationController
5. TranslationModule.initialize() (lines 60-86)
   - Gets state: changes.getCurrentState()
   - Segments into sentences
   - Initializes TranslationState
6. Register undo/redo callbacks (lines 348-359)
7. Render translation UI
```

**Translation Mode → Review Mode:**
```
1. UIModule.toggleTranslation() (line 274)
2. Destroy TranslationController (line 283)
   - Saves to localStorage
   - Cleans up UI
   - Does NOT sync to ChangesModule ⚠️
3. Show review UI (lines 287-289)
4. Resume review mode
```

### Data Storage

**Review Mode:**
- Primary: `ChangesModule` operations stack
- Persistence: `localStorage` review drafts (30s auto-save)
- Structure: Operations (insert/delete/update) on elements
- Undo/Redo: ChangesModule operation stack

**Translation Mode:**
- Primary: `TranslationChangesModule` + `TranslationState`
- Persistence: `localStorage` translation state (30s auto-save)
- Structure: Sentence-level edits, translation pairs
- Undo/Redo: TranslationChangesModule operation stack
- Key: Document hash (element IDs + language pair)

**Problem:** These systems are DISCONNECTED - translation edits never merge back to review.

---

## Gap Analysis

### 1. Duplicate Toolbar/Menu ⭐ HIGH

**Problem:** Buttons appear in two places
- MainSidebar: undo/redo/save
- TranslationToolbar: undo/redo/save + translation controls

**Files:**
- `src/modules/ui/translation/TranslationToolbar.ts`
- `src/modules/ui/components/MainSidebar.ts`

**Solution:**
- MainSidebar: Keep undo/redo/save (consistent with review mode)
- TranslationToolbar: Only translation-specific controls
  - Mode selector (Manual/AI)
  - Language selectors
  - Translation actions

### 2. Manual Mode Missing Target Pre-creation ⭐ HIGH

**Problem:** No 1:1 visual mapping in manual mode
- Source sentences rendered
- Target side empty until manual creation
- No visual correspondence

**Expected:**
- Pre-create empty target sentences
- Show empty containers mapping to source
- Click to edit

**Files:**
- `src/modules/translation/TranslationState.ts`
- `src/modules/ui/translation/TranslationView.ts`
- `src/modules/ui/translation/TranslationController.ts`

### 3. Textarea Fallback Still Present ⭐ MEDIUM

**Problem:** Sentence editing might use textarea fallback

**Files:**
- `src/modules/ui/translation/TranslationView.ts:664-730` (enableSentenceEditTextarea)
- Used as fallback when Milkdown fails (line 652-654)

**Solution:**
- Remove textarea creation code
- Use only TranslationEditorBridge with Milkdown
- Add error handling if editor fails

### 4. Data Sync Between Modes ⭐⭐⭐ CRITICAL

**Solution Design: Merge Translation Edits into ChangesModule**

**Approach:**
- On mode exit, convert translation edits → ChangesModule operations
- Update element content based on target sentences
- Create undoable merge operation

**Implementation:**
```typescript
// In UIModule.toggleTranslation() when exiting
if (isEntering === false && this.translationController) {
  // Get final translation state
  const translationDoc = this.translationModule.getDocument();

  // Merge back to elements
  const elementUpdates = this.translationModule.mergeToElements(translationDoc);

  // Apply as ChangesModule operations
  elementUpdates.forEach(update => {
    this.config.changes.updateElement(update.elementId, update.newContent);
  });

  // Now destroy
  this.translationController.destroy();
}
```

**Pros:**
- Single source of truth (ChangesModule)
- Review mode sees all changes
- Undo/redo can work across modes

**Cons:**
- Complex sentence → element mapping
- May lose translation metadata

### 5. Out-of-Sync Detection ⭐⭐ HIGH

**Solution:**

```typescript
class TranslationModule {
  private sourceSnapshot: string; // Hash of source

  async initialize(): Promise<void> {
    const elements = this.config.changes.getCurrentState();
    this.sourceSnapshot = this.computeHash(elements);
    // ... rest
  }

  hasSourceChanged(): boolean {
    const current = this.config.changes.getCurrentState();
    return this.computeHash(current) !== this.sourceSnapshot;
  }
}
```

**On mode exit:**
```typescript
if (this.translationModule.hasSourceChanged()) {
  await showWarningDialog(
    'Source content changed',
    'Original document modified since translation started. Continue?'
  );
}
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Data Loss Prevention)

#### Task 1.1: Translation-to-Review Merge ⭐⭐⭐ CRITICAL
**Priority:** CRITICAL
**Effort:** High

**Files:**
- `src/modules/ui/index.ts` (toggleTranslation)
- `src/modules/translation/index.ts` (add mergeToElements)
- `src/modules/translation/TranslationChangesModule.ts`

**Steps:**
1. Add `TranslationModule.mergeToElements()` method
   - Take TranslationDocument
   - Reconstruct element content from translated sentences
   - Return `Map<elementId, newContent>`
2. Modify `UIModule.toggleTranslation()` to call merge before destroying
3. Apply merged content as ChangesModule operations
4. Add unit tests for merge logic
5. Test manual and AI mode merging

**Acceptance Criteria:**
- [ ] Translation edits appear in review mode after switching
- [ ] Merged changes are undoable in review mode
- [ ] No data loss during mode switch
- [ ] Works for both manual and AI modes

#### Task 1.2: Out-of-Sync Detection ⭐⭐ HIGH
**Priority:** HIGH
**Effort:** Medium

**Files:**
- `src/modules/translation/index.ts`
- `src/modules/ui/index.ts`
- Create warning dialog component

**Steps:**
1. Add source hash tracking to TranslationModule
2. Compute hash on initialization
3. Add `hasSourceChanged()` method
4. Check before merging on mode exit
5. Show warning if out of sync
6. Offer options: Continue/Cancel/Re-initialize

**Acceptance Criteria:**
- [ ] Warning shown if source changed
- [ ] User can choose to continue or cancel
- [ ] Re-initialize option re-segments with new source

### Phase 2: UI Consolidation

#### Task 2.1: Consolidate Toolbars ⭐ HIGH
**Priority:** HIGH
**Effort:** Medium

**Files:**
- `src/modules/ui/translation/TranslationToolbar.ts`
- `src/modules/ui/components/MainSidebar.ts`
- `src/modules/ui/index.ts`

**Steps:**
1. Audit buttons in both toolbars
2. Remove undo/redo/save from TranslationToolbar
3. Keep only translation-specific controls:
   - Mode selector
   - Language selectors
   - Translation actions
4. Update CSS for consistency
5. Test all buttons remain functional

**Acceptance Criteria:**
- [ ] No duplicate undo/redo/save buttons
- [ ] Translation controls clearly separated
- [ ] Visual consistency with review mode
- [ ] All functionality preserved

#### Task 2.2: Pre-create Target Sentences ⭐ HIGH
**Priority:** HIGH
**Effort:** Medium

**Files:**
- `src/modules/translation/TranslationState.ts`
- `src/modules/ui/translation/TranslationController.ts`
- `src/modules/ui/translation/TranslationView.ts`

**Steps:**
1. Add `TranslationState.preCreateTargetSentences()`
2. Call when switching to manual mode
3. Create empty Sentence objects for each source
4. Update rendering to show empty containers
5. Add click-to-edit for empty targets
6. Update tests

**Acceptance Criteria:**
- [ ] Manual mode shows 1:1 source/target mapping
- [ ] Target sentences empty but visible
- [ ] Click opens Milkdown editor
- [ ] Visual alignment maintained

### Phase 3: Editor Unification

#### Task 3.1: Remove Textarea Fallback ⭐ MEDIUM
**Priority:** MEDIUM
**Effort:** Low

**Files:**
- `src/modules/ui/translation/TranslationView.ts`
- `src/modules/ui/translation/TranslationEditorBridge.ts`

**Steps:**
1. Search for textarea creation in TranslationView
2. Verify TranslationEditorBridge used for all edits
3. Remove textarea fallback code (lines 664-730)
4. Add error handling if Milkdown fails
5. Test sentence editing in both modes

**Acceptance Criteria:**
- [ ] No textarea elements in translation mode
- [ ] All editing uses Milkdown via TranslationEditorBridge
- [ ] Editor toolbar appears for sentence editing
- [ ] Graceful error handling

#### Task 3.2: Tracked Changes Visualization ⭐ MEDIUM
**Priority:** MEDIUM
**Effort:** High

**Files:**
- `src/modules/ui/translation/TranslationEditorBridge.ts`
- `src/modules/ui/editor/MilkdownEditor.ts`
- `src/modules/translation/TranslationChangesModule.ts`

**Steps:**
1. Add diff computation for sentence edits
2. Pass diff highlights to TranslationEditorBridge
3. Enable diffHighlights in editor initialization
4. Add toggle button for show/hide
5. Use same mechanism as review mode

**Acceptance Criteria:**
- [ ] Sentence edits show diff highlights
- [ ] Toggle controls visibility
- [ ] Diff works for multi-line sentences
- [ ] Acceptable performance

---

## Testing Plan

### Unit Tests
- `TranslationModule.mergeToElements()`: single/multiple/reordered/deleted sentences
- `TranslationState.preCreateTargetSentences()`: correct count, IDs, element associations
- Out-of-sync detection: content changes, whitespace-only changes

### Integration Tests
- Mode switching preserves all edits
- Translation edits appear in review mode
- Undo works after mode switch
- Auto-save triggers correctly

### Manual Testing
1. **Basic Flow:**
   - Make review edits → switch to translation → translate → switch back
   - Verify translation edits visible
   - Test undo

2. **Out-of-Sync:**
   - Switch to translation → back to review → make edits → to translation
   - Verify warning appears

3. **Manual Mode:**
   - Switch to manual
   - Verify target sentences visible
   - Edit multiple targets
   - Save and reload

---

## Risk Assessment

### High Risk
- **Data loss during merge:** Complex mapping could lose content
  - Mitigation: Extensive tests, backup to localStorage first
- **Performance with large docs:** Many sentences could slow merge
  - Mitigation: Profile with large docs, background processing

### Medium Risk
- **Undo/redo complexity:** Cross-mode undo error-prone
  - Mitigation: Start with mode-scoped undo, document limitations
- **UI state management:** Many parts could desync
  - Mitigation: Event-driven architecture, integration tests

### Low Risk
- **CSS conflicts:** Toolbar consolidation might break styling
  - Mitigation: Test across browsers, use existing patterns
- **Editor init failures:** Milkdown could fail
  - Mitigation: Error boundaries, graceful messaging

---

## Open Questions

1. **Should we prevent mode switching with unsaved changes?**
   - Pro: Prevents accidental data loss
   - Con: May be restrictive, auto-save exists

2. **How to handle sentence reordering?**
   - If user reorders in translation, how map back to elements?
   - Options: Preserve order, warn user, block reordering

3. **Should translation state tie to specific review draft?**
   - Currently uses document hash (element IDs)
   - Could link to review draft ID for tighter coupling

4. **What happens to comments during translation?**
   - Comments tied to element IDs and ranges
   - If content changes via translation, do comments become invalid?

---

## Success Criteria

### Must Have (MVP)
- [ ] No data loss when switching modes
- [ ] Translation edits visible in review mode
- [ ] Out-of-sync warning prevents invalid merges
- [ ] Single consolidated toolbar
- [ ] Manual mode shows pre-created targets
- [ ] All editing uses Milkdown

### Should Have (V1)
- [ ] Undo/redo works across mode switches
- [ ] Tracked changes in sentence editor
- [ ] Performance acceptable for large docs (>1000 sentences)
- [ ] Comprehensive test coverage

### Nice to Have (Future)
- [ ] Live sync detection in translation mode
- [ ] Preview diff before applying merge
- [ ] Sentence reordering support
- [ ] Translation memory integration
- [ ] Fuzzy match highlighting

---

## Key Files Reference

### Mode Switching
- `src/modules/ui/index.ts:274-367` - toggleTranslation()
- `src/modules/ui/index.ts:129-181` - createTranslationContainer()

### Translation State
- `src/modules/translation/index.ts:60-86` - initialize()
- `src/modules/translation/storage/TranslationState.ts` - State management
- `src/modules/translation/storage/TranslationPersistence.ts` - localStorage

### UI Components
- `src/modules/ui/translation/TranslationController.ts` - Main controller
- `src/modules/ui/translation/TranslationView.ts` - Side-by-side view
- `src/modules/ui/translation/TranslationToolbar.ts` - Toolbar controls
- `src/modules/ui/translation/TranslationEditorBridge.ts` - Milkdown integration

### Review Mode
- `src/modules/changes/ChangesModule.ts` - Review operations
- `src/modules/ui/editor/EditorLifecycle.ts` - Editor lifecycle
- `src/modules/ui/sidebars/MainSidebar.ts` - Main toolbar

---

**Next Steps:** Await approval, then begin Phase 1 Task 1.1 (Critical merge implementation)
