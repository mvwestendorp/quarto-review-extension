- sidebar comments do not stick -> css trick to have rows
- The buttons to the right for editing and commenting should be visible as long as the mouse hovers over the same vertical height as the paragraph the buttons are for

- figure captions edits make figure have scroll boxes, which is not good UI

- Output from code should not always be editable: [1] "Some code that is not editable." is a non editable codeblock

For lists, the milkdown editor has the following below, where html is showing in the editor:

First item

Second item

Deeply nested item" data-review-type="BulletList" class="review-editable" data-review-id="workspaces-quarto-review-extension-example-output-01-text-and-formatting.heading-level-1.lists.unordered-lists.bulletlist-6" data-review-origin="source"}

For non-list paragraphs it can also happen that the html tags are shown e.g. </ins>This text has a CSS class wow for [This text has a CSS class]{.highlight} wow

For another paragrpah the editor shows:

First item

Second item

a.  Sub-item A
b.  Sub-item B3.  Third item

Item with code: use function() here

But the third item is on a separate line. So even without making a change there is a difference after saving.

Adding test to the list gives:

✏️Edited
Just now
Original Markdown

-   Superscript: E=mc^2^ using `text^2^`
-   Subscript: H~2~O using `text~2~`
-   Combined: x^2^ + y^2^ = z^2^

Updated Markdown

- Superscript: E=mc^2^ using `text^2^`

- Subscript: H~~2~~O using `text~2~`

- Combined: x^2^ + y^2^ = z^2^

- Test

Updated HTML Source (with diff tags)

-   Superscript: E=mc^2^ using `text^2^<ins class="review-addition" data-critic-type="addition">
</ins>`
-   Subscript<ins class="review-addition" data-critic-type="addition">~</ins>: <ins class="review-addition" data-critic-type="addition">~</ins>H~2~O using `text~<ins class="review-addition" data-critic-type="addition">
</ins>2~`
-   Combined: x^2^ + y^2^ <ins class="review-addition" data-critic-type="addition">

- Test</ins>= z^2^

Rendered HTML Preview (from DOM)

    Superscript: E=mc^2^ using text^2^<ins class="review-addition" data-critic-type="addition"> </ins>

    Subscript: H2O using text~<ins class="review-addition" data-critic-type="addition"> </ins>2~

    Combined: x^2^ + y^2^

    Test= z^2^



- Adding a header shows the sharp sign: ## Greatest for adding h2 title greatest

# TODO Backlog

| Priority | Area                            | Task                                                                                                                                   | Source                              |
| -------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **High** | Translation Refactor (Phase A2) | Implement `TranslationModule.updateSegmentContent()` (task A2.6) so segment edits persist.                                             | TRANSLATION_REFACTORING_PROGRESS.md |
| **High** | Translation Refactor (Phase A2) | Add basic CSS styling for inline edit buttons (task A2.8) to keep the UI usable.                                                       | TRANSLATION_REFACTORING_PROGRESS.md |
| **High** | Translation Refactor (Phase A2) | Run an end-to-end segment editing workflow test (task A2.7) and fix any regressions uncovered.                                         | TRANSLATION_REFACTORING_PROGRESS.md |
| **High** | Translation Refactor            | Triage and fix bugs discovered during the immediate translation segment testing cycle.                                                 | TRANSLATION_REFACTORING_PROGRESS.md |
| **High** | Unified Persistence (Phase 2)   | Update `PersistenceManager.restoreLocalDraft()` to load via `UnifiedDocumentPersistence`, including translation restoration callbacks. | PHASE_1_IMPLEMENTATION_SUMMARY.md   |
| **High** | Unified Persistence (Phase 2)   | Wire `TranslationModule` to consume `onTranslationsImported` so UI state is restored when drafts load.                                 | PHASE_1_IMPLEMENTATION_SUMMARY.md   |
| **High** | Unified Persistence (Phase 2)   | Execute the full integration scenario (review edits → translation merge → reload) to validate the new callbacks.                       | PHASE_1_IMPLEMENTATION_SUMMARY.md   |
| **High** | Translation UX Phase 2          | Implement task 2.1 (toolbar consolidation) so translation mode uses the unified controls.                                              | IMPLEMENTATION_PROGRESS.md          |
| **High** | Translation UX Phase 2          | Implement task 2.2 (pre-create manual mode targets) to remove the current friction when adding translations.                           | IMPLEMENTATION_PROGRESS.md          |
| **High** | Translation UX Phase 3          | Remove the temporary textarea editor (task 3.1) in favor of the Milkdown-based experience.                                             | IMPLEMENTATION_PROGRESS.md          |
| **High** | Translation UX Phase 3          | Add tracked-change visualization inside translation mode (task 3.2) so reviewers can see diffs inline.                                 | IMPLEMENTATION_PROGRESS.md          |
| **High** | Architecture Decision           | Decide whether to accept the Phase 2 breaking changes; if approved, immediately start the Phase 2 implementation.                      | PHASE_1_UNIFIED_VISION.md           |
| **High** | Translation Strategy            | Kick off Phase A implementation after stakeholder review (analysis acceptance + prioritization).                                       | TRANSLATION_REFACTORING_ANALYSIS.md |

| Priority   | Area                              | Task                                                                                                                                                                | Source                               |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Medium** | Translation Refactor (Short Term) | Integrate the shared StateStore into the translation controller & view (tasks A.2-3).                                                                               | TRANSLATION_REFACTORING_PROGRESS.md  |
| **Medium** | Translation Refactor (Phase B)    | Complete service integration to hook translation state into persistence.                                                                                            | TRANSLATION_REFACTORING_PROGRESS.md  |
| **Medium** | Translation Refactor (Phase C)    | Ship the enhanced visual clues planned for Phase C.                                                                                                                 | TRANSLATION_REFACTORING_PROGRESS.md  |
| **Medium** | Unified Sidebar Cleanup           | Retire legacy `CommentsSidebar.ts` and remaining old sidebar CSS now that UnifiedSidebar handles comments end-to-end; update docs accordingly.                      | DEPRECATION_AUDIT.md                 |
| **Medium** | Translation Program               | Review the translation-refactor analysis with stakeholders, prioritize phases, and capture feedback loops.                                                          | TRANSLATION_REFACTORING_ANALYSIS.md  |
| **Medium** | Unified Persistence Rollout       | Test the new persistence facade with reviews-only and translations-only flows, merge Phase 1, and then extend to Phase 2 restoration.                               | ARCHITECTURE_ASSESSMENT_SUMMARY.md   |
| **Medium** | Unified Persistence Planning      | Plan the Phase 3 ChangesModule unification work and the potential Phase 4 storage unification.                                                                      | PHASE_1_UNIFIED_VISION.md            |
| **Medium** | Translation Mode Plan             | Once approval lands, begin Phase 1 Task 1.1 (critical merge implementation) for translation mode.                                                                   | TRANSLATION_MODE_PLAN.md             |
| **Medium** | Persistence TDD                   | Create `tests/integration/persistence-restoration.integration.test.ts`, write the Phase 1 test set (8 tests), run to observe failures, implement fixes, and re-run. | TDD_PERSISTENCE_STRATEGY.md          |
| **Medium** | Persistence Diagnostics           | Follow the operations restoration diagnostic workflow: enable targeted logging, run the manual test, capture log snapshots, and report where operations drop.       | OPERATIONS_RESTORATION_DIAGNOSTIC.md |
| **Medium** | Storage Inspection                | Audit `quarto-review:embedded-sources` in localStorage, ensure `EmbeddedSourceStore.ready` resolves before draft load, and log any serialization errors.            | OPERATIONS_STORAGE_ANALYSIS.md       |

| Priority | Area                             | Task                                                                                                                                                                                                                                                  | Source                                  |
| -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Low**  | Translation Refactor (Phase D/E) | Implement workflow improvements (Phase D), comprehensive testing (Phase E), user documentation, and evaluate removing `TranslationChangesModule`.                                                                                                     | TRANSLATION_REFACTORING_PROGRESS.md     |
| **Low**  | Sidebar API Enhancements         | Explore new UnifiedSidebar APIs (e.g., programmatic comment toggle, additional controls).                                                                                                                                                             | DEPRECATION_AUDIT.md                    |
| **Low**  | Translation Strategy             | Iterate on stakeholder feedback, monitor performance/storage post-Phase2, and document architectural patterns for future features.                                                                                                                    | ARCHITECTURE_ASSESSMENT_SUMMARY.md      |
| **Low**  | Translation Mode Nice-to-haves   | Deliver the “Should Have” checklist (undo/redo parity, tracked changes in sentence editor, large-doc perf, test coverage) plus the future nice-to-haves (live sync detection, previews, sentence reordering, translation memory, fuzzy highlighting). | TRANSLATION_MODE_PLAN.md                |
| **Low**  | Testing Enhancements             | Optional: run Playwright suites in headed mode, profile export performance, add new export formats, and add checksum validation to exported bundles.                                                                                                  | TESTING_SUMMARY.md / SESSION_SUMMARY.md |
| **Low**  | Persistence Improvements         | Future TDD items: automatic draft cleanup, storage quota monitoring, IndexedDB fallback, service worker/offline support, and analytics for draft usage.                                                                                               | TDD_PERSISTENCE_STRATEGY.md             |
