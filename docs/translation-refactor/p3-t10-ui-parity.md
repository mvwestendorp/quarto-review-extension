## Phase 3 · Task P3-T10 UI Parity & Persistence

**Status:** In Progress — 2025-02-15

### Problem Statement

- Review mode and translation mode render the document with different typography/layout, creating cognitive load when switching modes.
- The inline Milkdown editor in translation mode diverges from the review editor (toolbar, theme, behaviour).
- Saving edits in translation mode is unreliable: edited text often reverts after pressing save.

### Goals

1. Align translation mode appearance and editor behaviour with review mode while maintaining the side-by-side layout.
2. Fix the translation sentence persistence path so saving an edit reliably reflects in both the translation pane and the underlying change history.

### Scope

- Reuse shared CSS typography tokens and Milkdown configuration between review and translation editors.
- Ensure TranslationEditorBridge uses the same toolbar/marks/shortcuts as the review editor (or a documented subset).
- Audit TranslationChangesModule ↔ TranslationModule ↔ TranslationView flow for manual edits and resolve discrepancies so saved content persists.
- Update tests and documentation to reflect the unified UX.

### Out of Scope

- Additional translation-mode features (e.g., auto-translation improvements, provider UI).
- Large-scale redesign of side-by-side layout beyond parity fixes.

### Acceptance Criteria

- Opening the inline editor in translation mode matches the review editor (toolbar style, fonts, shortcuts) except for any intentionally disabled features.
- After editing and saving a sentence, the translation pane reflects the new text, and the change propagates to the translation module/state (confirmed via tests).
- Regression tests cover save-and-refresh scenarios for both source and target sentences.
- Documentation (Implementation Progress + Phase 3 plan) updated to record the changes.

### Tasks

- [x] Share review editor styles and configuration with TranslationEditorBridge.
- [x] Align source/target sentence typography with review-mode document styling.
- [x] Investigate and fix persistence gap for saved sentences (translation adapter/state updates).
- [x] Add tests ensuring saved content survives view refresh and translation mode toggle.
- [x] Update documentation and UX parity checklist.
- [ ] Harmonize terminology by introducing shared “segment” abstractions across translation and review modules, keeping “sentence” as a translation-specific facet only where necessary.
- [ ] Wire the new segment identities through TranslationController/View so interactions, undo/redo, and merge logic operate on shared segment ids instead of ad-hoc `trans-*` fallbacks.
- [ ] Validate the new segment wiring with regression tests (controller/view suites) and expand notes here with outcomes.

### Progress Notes (2025-02-16)
- Translation controller now synchronizes undo/redo via shared `TranslationSegment` metadata (`handleChangesUpdate`).
- `TranslationModule.syncElementWithChangesModule` + `TranslationChangeAdapter` consume the ordered segments and emit deterministic edits back to the review module.
- Targeted suites (`translation-controller`, `translation-ui`, `translation-view-selection`) and `tsc --noEmit` confirm the segment refactor did not break existing flows.

## Additional information on the harmonization of terminology

Findings

Translation still revolves around a bespoke Sentence model (src/modules/translation/types.ts (line 24)), while review mode speaks in “elements” and “segments” (src/modules/changes/index.ts (line 302)). The translation layer keeps its own sourceSentences / targetSentences arrays and a CorrespondenceMap keyed by sentence ids (src/modules/translation/storage/TranslationState.ts (line 120)), so we effectively maintain two vocabularies for the same underlying review segments.
TranslationChangeAdapter.applySentenceUpdate() (src/modules/translation/changes/TranslationChangeAdapter.ts:9) rebuilds element content by joining sentence bodies, but it never exposes its data as “segments.” That mismatch makes it hard for the changes module or downstream tooling to understand translation edits without re-parsing text.
TranslationView re-renders from Sentence data (src/modules/ui/translation/TranslationView.ts (line 274)), and the controller bridges to review by loading changesModule sentences (TranslationController.refreshViewFromState() at src/modules/ui/translation/TranslationController.ts:947). Because we clone sentence objects rather than working with shared segment identifiers, undo and merging rely on heuristics (trans-${sourceId} ids, see getTargetSentenceIds at src/modules/ui/translation/TranslationController.ts:908).
A new regression test (tests/unit/ui-translation-toggle.test.ts (line 439)) demonstrates persistence when translation closes, but it manipulates sentences directly on TranslationModule. That highlights the missing notion of a “translated segment” the rest of the app could understand.
Terminology Alignment Proposal

Introduce a shared “segment” shape
Add a DocumentSegment interface (id, elementId, order, content, language) colocated with the translation types, export it for reuse.
Define TranslationSegment as DocumentSegment & { role: 'source' | 'target'; sentenceId?: string }—keeps the translation-specific naming while anchoring to the shared terminology.
Refactor TranslationState to store segments
Rename sourceSentences/targetSentences to sourceSegments / targetSegments, create backwards-compat getters returning arrays of TranslationSegment.
Update metadata counters to speak in “segments” (e.g., totalSegments, translatedSegments) to match review nomenclature.
Ensure CorrespondenceMap tracks segmentIds and expose helpers returning both vocabulary sets during migration.
Bridge to ChangesModule with real segment ids
When segmenting an element, store the generated segment ids from ChangesModule.replaceElementWithSegments (look at changes/index.ts (line 431)) so translation segments can reference the existing ids instead of inventing trans-\*.
Adjust TranslationChangeAdapter to accept TranslationSegment objects and emit updates via shared segmentId, making the edit history consistent with review mode.
UI & controller updates
Update TranslationView props to use TranslationSegment; the UI can still label them “sentences” but the data contract uses the shared type.
Simplify controller focus/undo logic by keying off segment ids instead of reconstructing trans-${sourceId} fallbacks (src/modules/ui/translation/TranslationController.ts (line 903)).
Tests & docs migration
Gradually switch test fixtures to build TranslationSegments; keep adapters so existing tests referencing Sentence continue to pass during refactor.
Document the terminology change in the translation refactor plan (e.g., docs/translation-refactor/p3-t10-ui-parity.md) and add an action item to harmonize logs/debug messages.

### Progress Update (2025-02-15)

- Translation inline editor now reuses the review-mode container/actions classes (`review-inline-editor-container`, `review-inline-editor-actions`) and shares toolbar layout through `TranslationView` updates.
- Sentence typography inherits review tokens; `_extensions/review/assets/components/translation.css` now relies on `--review-color-text-on-light` and `--review-font-family-sans` for parity.
- Manual target edits persist end-to-end: `TranslationController.handleTargetSentenceEdit` synchronises translation state and change history, and `TranslationView` cleans up editor listeners on save/cancel.
- Added regression coverage:
  - `tests/unit/translation-view-editing.test.ts` verifies inline editor class parity and that saved edits trigger controller callbacks.
  - `tests/unit/ui-translation-toggle.test.ts` ensures opening/closing translation mode without edits leaves the `ChangesModule` untouched.
- Documentation reflects Phase 3 progress; remaining parity refinements can build on this foundation.
