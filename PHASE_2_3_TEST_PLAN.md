# Phase 2 & 3 Test Plan

## Phase 2: UI Consolidation

### Task 2.1: Consolidate Duplicate Toolbars

**Status:** Planned
**Test Strategy:** UI/Integration tests

#### Unit Tests (toolbar-consolidation.test.ts)
- [ ] MainSidebar undo/redo buttons only enabled in review mode
- [ ] MainSidebar buttons disabled in translation mode
- [ ] TranslationToolbar shows only translation-specific controls
- [ ] Translation mode button visibility correctly managed
- [ ] CSS classes applied correctly for mode switching
- [ ] Button event handlers properly bound

#### Integration Tests
- [ ] Mode switch hides review toolbar controls
- [ ] Mode switch shows translation-specific toolbar
- [ ] Toolbar buttons reflect correct state after mode toggle
- [ ] Visual consistency with review mode styling

#### Manual Testing
- [ ] Single consolidated toolbar in translation mode
- [ ] No duplicate undo/redo buttons visible
- [ ] All functionality preserved
- [ ] Responsive layout maintained

---

### Task 2.2: Pre-create Target Sentences in Manual Mode

**Status:** Planned
**Test Strategy:** Unit/Integration tests with DOM manipulation

#### Unit Tests (manual-mode-precreation.test.ts)
- [ ] preCreateTargetSentences() creates empty Sentences for each source
- [ ] Empty target sentences have correct structure
- [ ] Element ID associations preserved
- [ ] Created in correct order matching source sentences
- [ ] Language field set to target language
- [ ] Hash/offset fields initialized correctly
- [ ] Works with single source sentence
- [ ] Works with multiple source sentences
- [ ] Handles elements with no source sentences
- [ ] Idempotent (calling twice doesn't duplicate)

#### Integration Tests
- [ ] Manual mode initialization pre-creates targets
- [ ] UI renders empty target containers
- [ ] Click-to-edit functional on empty targets
- [ ] Visual 1:1 source/target mapping maintained
- [ ] Correspondence pairs created for pre-created sentences
- [ ] Switching between modes preserves pre-created sentences

#### Manual Testing
- [ ] Switch to manual mode, targets visible and empty
- [ ] Visual alignment between source and target
- [ ] Can click empty target to edit
- [ ] Edits recorded in TranslationChangesModule
- [ ] Pre-created sentences persist on mode switch
- [ ] Save/reload preserves pre-created structure

---

## Phase 3: Editor Unification

### Task 3.1: Remove Textarea Fallback

**Status:** Planned
**Test Strategy:** Unit tests + integration verification

#### Unit Tests (textarea-removal.test.ts)
- [ ] TranslationView.enableSentenceEdit() never creates textarea
- [ ] TranslationEditorBridge.initializeSentenceEditor() called for all edits
- [ ] Textarea creation code removed from codebase
- [ ] Error handling triggers graceful message (not textarea fallback)
- [ ] Editor initialization failures caught and logged
- [ ] DOM cleanup on editor failure
- [ ] Works with all sentence types (short, long, multiline)

#### Grep Verification
- [ ] No `<textarea>` in sentence editing code
- [ ] No `enableSentenceEditTextarea()` called in edit paths
- [ ] All edit paths go through TranslationEditorBridge

#### Integration Tests
- [ ] Double-click sentence opens Milkdown editor
- [ ] Sentence editing uses editor toolbar (not textarea)
- [ ] Edits tracked in TranslationChangesModule
- [ ] Save/cancel buttons work correctly
- [ ] Escape key cancels edit
- [ ] Editor focus management works

#### Manual Testing
- [ ] No textarea elements visible in translation mode
- [ ] Sentence editing always shows editor toolbar
- [ ] All editor features available (bold, italic, etc.)
- [ ] Performance acceptable
- [ ] Mobile compatibility maintained

---

### Task 3.2: Add Tracked Changes Visualization

**Status:** Planned
**Test Strategy:** Unit + visual regression tests

#### Unit Tests (sentence-tracked-changes.test.ts)
- [ ] computeSentenceDiff() calculates additions/deletions correctly
- [ ] Diff highlights generated for sentence edits
- [ ] Highlights include correct span positions
- [ ] DiffHighlightRange objects have correct type ('addition'/'modification')
- [ ] Handles edge cases (empty original, empty edited)
- [ ] Works with unicode content
- [ ] Works with special characters
- [ ] Performance acceptable for long sentences (>1000 chars)

#### Integration Tests
- [ ] Sentence edits show diff highlights in Milkdown
- [ ] Green/red highlights visual distinction clear
- [ ] Toggle button controls highlight visibility
- [ ] Highlights persist during edit session
- [ ] Highlights cleared after save
- [ ] Works in all translation modes (manual, auto)
- [ ] Undo/redo updates highlights correctly
- [ ] Performance with many edits acceptable

#### Visual Regression Tests
- [ ] Diff highlights render correctly
- [ ] Color contrast meets accessibility standards
- [ ] Highlights don't break editor layout
- [ ] Mobile display maintained

#### Manual Testing
- [ ] Edit sentence, see green additions
- [ ] Delete text, see red deletions
- [ ] Edit multi-line sentence, highlights correct
- [ ] Toggle button hides/shows highlights
- [ ] Open/close editor, highlights persist appropriately
- [ ] Large sentences still performant
- [ ] Accessibility: screen readers announce changes

---

## Cross-Phase Integration Tests

### Mode Switching with All Features
- [ ] Review → Translation: edits preserved, UI consolidated, targets pre-created
- [ ] Edit sentence in manual mode with tracked changes
- [ ] Undo/redo works in all scenarios
- [ ] Export functionality works after all changes
- [ ] Save/reload preserves all state

### Full Workflow Test
```
1. Make review edits
2. Switch to translation mode
3. Edit sentence with tracked changes
4. Switch back to review (merge applied)
5. Verify all edits present
6. Undo merge, verify original restored
7. Redo merge, verify reapplied
8. Export document
```

### Data Integrity Tests
- [ ] No data lost in mode switching
- [ ] Undo/redo maintains data consistency
- [ ] Save/reload preserves all changes
- [ ] Out-of-sync detection works correctly
- [ ] Merge operations undoable

### Performance Benchmarks
- [ ] Mode switching < 500ms
- [ ] Sentence editing initialization < 100ms
- [ ] Diff calculation < 50ms
- [ ] Merge operation < 1s for 100 elements
- [ ] Memory usage stable after multiple mode switches

### Accessibility Tests
- [ ] Tab navigation works through all controls
- [ ] Keyboard shortcuts documented and tested
- [ ] Screen reader announces mode/state changes
- [ ] Focus management appropriate
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Error messages clear and actionable

---

## Test Implementation Checklist

### Phase 2.1 Tests
- [ ] Create toolbar-consolidation.test.ts
- [ ] Create toolbar integration test file
- [ ] Run tests, verify all pass
- [ ] Check coverage > 80%

### Phase 2.2 Tests
- [ ] Create manual-mode-precreation.test.ts
- [ ] Create manual mode integration test file
- [ ] Run tests, verify all pass
- [ ] Check coverage > 80%

### Phase 3.1 Tests
- [ ] Create textarea-removal.test.ts
- [ ] Run grep verification
- [ ] Create integration test file
- [ ] Run tests, verify all pass

### Phase 3.2 Tests
- [ ] Create sentence-tracked-changes.test.ts
- [ ] Create visual regression test file
- [ ] Run tests, verify all pass
- [ ] Check coverage > 80%

### Integration Tests
- [ ] Create phase-2-3-integration.test.ts
- [ ] Create workflow tests
- [ ] Create performance benchmarks
- [ ] Create accessibility tests

---

## Test Coverage Goals

- **Unit Tests:** > 85% coverage
- **Integration Tests:** All major workflows covered
- **Manual Testing:** All user-facing features validated
- **Performance:** All benchmarks meet targets
- **Accessibility:** WCAG 2.1 AA compliant

---

## Continuous Integration

### Test Execution
```bash
npm test -- Phase 2 Tests
npm test -- Phase 3 Tests
npm test -- integration-tests
npm run lighthouse (for performance)
npm run axe (for accessibility)
```

### Pre-Commit Checks
- All tests passing
- No coverage regression
- No accessibility violations
- No performance regressions

### Pre-Merge Checks
- All test suites passing
- Coverage > 85%
- No Lighthouse warnings
- No accessibility issues

---

**Document Version:** 1.0
**Status:** Ready for Phase 2/3 Implementation
