## Phase 3 · UX Contracts & Editor Stability

**Status:** ☐ Not Started  
**Goal:** Deliver a seamless translation editing experience with predictable focus, accurate status indicators, and responsive rendering, delivered via a pluggable UI module layered on the core review surface.

### 1. Problem Statement

- Manual edits occasionally disappear (pre-Phase 1 issue) or reflow unpredictably.
- Status chips (Original / Auto / Manual) are not visually obvious or accessible.
- Editor focus is lost after save; keyboard shortcuts are inconsistent.
- Progress feedback is limited to sidebar; view lacks inline feedback.
- Translation UI is tightly coupled to `TranslationController`, preventing reuse or replacement of components.

### 2. Experience Principles

1. **Consistency** – Editing in translation mode should mirror review mode behaviours.
2. **Visibility** – Users must immediately see translation status, pending changes, and progress.
3. **Accessibility** – Keyboard and screen-reader support must be first-class.
4. **Responsiveness** – Long-running translations should feel interruptible and transparent.

### 3. Work Breakdown

| ID | Task | Details / Acceptance Criteria |
| --- | --- | --- |
| P3-T0 | **UI plugin contract** | Formalise `ReviewUIPlugin` interface (mount/unmount, events) and migrate translation view/sidebars to register through it. |
| P3-T1 | Focus & selection management | ✅ Implemented queued focus + selection restore; preserve cursor position after save and selection when switching sentences. |
| P3-T2 | Inline status chips | ✅ Accessible chips replace legacy dots with labels, tooltips, and ARIA status descriptions (Original, Auto, Manual, Out-of-sync, Synced). |
| P3-T3 | Inline progress feedback | ✅ Inline progress bar and per-sentence spinner wired to controller events, with aria-busy semantics and indeterminate state handling. |
| P3-T4 | Keyboard shortcuts | ✅ `Ctrl/Cmd+S` saves the active sentence; undo/redo shortcuts route to translation history when the inline editor is closed. |
| P3-T5 | Error states | ✅ Inline banner + sentence badges with retry affordances when translation fails. |
| P3-T6 | Accessibility audit | 🔄 Heading/region landmarks, roving tabindex, keyboard edit trigger implemented; contrast review pending. |
| P3-T7 | Performance polish | Virtualise long sentence lists; retain lazy-rendering of off-screen sentences. |
| P3-T8 | Plugin lifecycle QA | Ensure mounting/unmounting the translation plugin leaves core UI state intact (undo stack, comments).
| P3-T9 | Documentation & demos | Update user guide, record short screencast of translation workflow.
| P3-T10 | UI parity & persistence | Align translation editor/layout with review mode and resolve manual save regression.

### 4. Design Considerations

- Use event emitter pattern from Phase 1 adapter to trigger UI updates (e.g., `translation:sentence-updated`).
- Plugin registration ensures translation UI can be toggled without DOM coupling; mount returns cleanup handle.
- Status chips rely on adapter metadata (`method`, `status`, `provider`).
- Inline progress derived from provider events (`translating`, `complete`, `error`).
- Virtualisation: use `IntersectionObserver` or existing scroll handler to load editors lazily.

### 5. Validation Plan

- **UX testing**: Conduct moderated sessions (5 participants) editing translations to gather feedback.
- **Automated**: Playwright tests for keyboard flows, focus retention, screen-reader snapshots using axe-core.
- **Performance**: Benchmark scroll/render for 1k+ sentences; ensure time to interactive < 100ms per pane when virtualization enabled.

### 6. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Virtualisation conflicts with sentence alignment | Build abstraction for row heights; fallback to full render when virtualization disabled. |
| Accessibility regressions | Integrate axe-core/lighthouse into CI; manual review by accessibility specialist. |
| Feature creep | Stick to acceptance criteria; log enhancements separately. |

### 7. Dependencies

- Requires Phase 1 metadata to be accurate.
- Consumes provider events introduced in Phase 2.

### 8. Definition of Done

- All UX acceptance tests pass.
- Accessibility score ≥ 90 in lighthouse.
- Manual QA sign-off: editing loop, status visibility, progress feedback, keyboard support.
