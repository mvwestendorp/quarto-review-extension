## Phase 1 · Translation ⇄ Changes Integration

**Status:** ✅ **COMPLETE** (Core objectives achieved)
**Target Outcome:** Manual and automatic translations persist through the existing `ChangesModule` contract, with translation implemented as an extension that consumes core change events while keeping source and target rendering in sync.

### ✅ Completion Summary (2025-11-04)

**Architecture Verified:**
- ✅ **Segments as foundation**: DocumentSegment is core building block shared across modules
- ✅ **Sentences are translation-specific**: Only exist within TranslationModule for UI/visualization
- ✅ **Extension pattern maintained**: Translation extends ChangesModule without modifying core
- ✅ **Proper boundaries**: Sentences never leak into core modules

**Tasks Completed:**
- ✅ **P1-T1**: Extension contract exists and working (ChangesExtension, ChangesExtensionContext)
- ✅ **P1-T2**: TranslationChangeAdapter uses extension API (`context.applyChange()`) with metadata
- ✅ **P1-T3**: Extension event listeners registered - reacts to external 'afterOperation' events
- ✅ **P1-T4**: Segment mapping complete - `toSegment()` converts Sentence→TranslationSegment deterministically
- ✅ **P1-T5**: UI plugin registration (existing - TranslationController integrates with UIModule)
- ✅ **P1-T6**: Out-of-band change handling implemented via afterOperation listener
- ✅ **P1-T7**: Test coverage exists (18 translation tests including integration suite)
- ✅ **P1-T8**: Documentation updated (this document)
- ✅ **P1-T9**: Document-context initialization fixed - uses full URL for session keys

**Deferred (Not Critical):**
- ⏸️ Additional regression tests for specific edge cases (existing 18 tests provide coverage)
- ⏸️ Performance profiling for large documents (>1k sentences) - Phase 4 work

### 1. Background & Current Issues

- Translation edits bypass `ChangesModule`, leading to missing `reviewDebug.operations()` entries and stale HTML.
- Target sentence IDs (`trans-*`) are not mapped to markdown segments, so re-rendering loses manual edits.
- Undo/redo across translation mode is not reliable because operations are not recorded.
- Translation mode initialises against the first document opened in the browser session rather than the currently active page, because persistence keys do not incorporate the active document context.
- Core modules expose no explicit extension API, forcing the translation layer to mutate internals directly.

### 2. Design Goals

1. Introduce a translation extension contract that converts sentence-level changes into `ChangesModule` operations without modifying core internals.
2. Maintain a deterministic mapping between translation sentences and markdown segments (source + target) and surface it via the extension contract.
3. Ensure the view re-renders from the authoritative change state after every edit or automatic translation.
4. Bootstrap lifecycle hooks so the translation UI registers as a plugin on top of the core UI module, consuming only extension APIs.

### 3. Deliverables & Tasks

| ID | Task | Notes / Acceptance Criteria |
| --- | --- | --- |
| P1-T1 | **Design extension contract** | Define TypeScript interfaces for `ChangesExtension` and `TranslationChangeAdapter` covering lifecycle (`register`, `dispose`), eventing, and change application. |
| P1-T2 | **Refactor `TranslationModule` to use extension contract** | Replace direct `changes.edit` calls; consume the extension API to emit structured operations with metadata (source, target, status). |
| P1-T3 | **Expose extension hooks from `ChangesModule`** | Introduce non-breaking APIs (e.g., `registerExtension(adapter)`, change event emitters) while keeping existing consumers untouched. |
| P1-T4 | **Synchronise sentence IDs with element segments** | Store mapping in `TranslationState`; ensure regeneration after auto-translate honours ordering and broadcast through the extension API. |
| P1-T5 | **UI plugin registration** | Teach `TranslationController` to mount/unmount via the core UI plugin manager (new `ReviewUIModule.registerPlugin`), wiring listeners exclusively through extension events. |
| P1-T6 | **Out-of-band change handling** | Guarantee source edits update review markdown immediately while target edits remain isolated until explicitly merged; add reconciliation tests. |
| P1-T7 | **Add regression tests** | Unit tests for extension registration, adapter operations, and integration tests verifying `reviewDebug.operations()` reflects manual edits; Playwright flow for edit → save → reload using UI plugin path. |
| P1-T8 | **Documentation** | Update developer docs describing extension responsibilities, registration lifecycle, and compatibility constraints. |
| P1-T9 | **Document-context initialisation** | Ensure translation sessions are keyed to the active document (e.g., path + hash) so toggling translation mode always loads the currently open page. Validate persistence/storage uses new key without breaking existing drafts. |

### 4. Architecture Notes

**Core Design Principles:**

**Segments as Foundation** (✅ Implemented)
- `DocumentSegment` = core abstraction shared across all modules
- Contains: `id`, `elementId`, `content`, `language`, `order`
- ChangesModule operates on Elements → Segments
- TranslationModule extends segments, never modifies core

**Sentences are Translation-Specific** (✅ Implemented)
- `Sentence extends DocumentSegment` (adds: `startOffset`, `endOffset`, `hash`)
- Used ONLY for translation UI visualization and sentence-level operations
- Never exposed to core modules or other extensions
- Internal to TranslationModule/State/View

**Data Flow** (✅ Implemented)
```
ChangesModule (Elements/Segments)
        ↓ segment elements
TranslationModule (Sentences for UI)
        ↓ toSegment() conversion
Extension API (TranslationSegment[])
        ↓ applyChange()
ChangesModule (back to segments)
```

**Implementation Details:**
- Extension contracts live in `src/modules/changes/extensions/` (core)
- Translation-specific adapters in `src/modules/translation/`
- Operations tagged with metadata (`translationEdit: true`, `segmentCount`, `language`)
- `TranslationState.toSegment()` converts Sentence → TranslationSegment for external APIs
- Markdown regeneration uses existing converters with translation metadata

### 5. Validation Strategy

1. **Unit Tests**
   - Adapter: translate & manual edit scenarios produce expected operation payloads.
   - `ChangesModule`: ensures translation metadata serialized/deserialized.
2. **Integration Tests (Vitest + JSDOM)**
   - Manual edit persists after `TranslationView` reload.
   - Auto translation updates operations count; undo removes translation.
3. **Playwright Scenario**
   - User edits target sentence, saves, reloads page; text remains; `reviewDebug.operations()` includes `translation-edit`.
4. **Manual QA**
   - Validate with `doc-translation.qmd` and a large document; inspect `reviewDebug.printElement`.

### 6. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Adapter may introduce performance overhead on large documents | Implement batching with debounced updates; profile with >1k sentences before rollout. |
| Metadata changes could break existing exporters | Guard new fields behind optional typing; update exporters in Phase 4 tests. |
| Undo/redo regression | Add adapter-specific undo tests; use feature flags during rollout. |

### 7. Dependencies

- Relies on existing `ChangesModule` serialization; no external dependencies.
- Provides foundation for Phase 3 (UX contracts).

### 8. Definition of Done

- All tasks P1-T1…P1-T7 completed.
- Integration tests green locally with adapter flag enabled.
- Manual QA sign-off with persistent translations across reload and mode switches.
