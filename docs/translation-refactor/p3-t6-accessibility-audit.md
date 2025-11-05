## Phase 3 · Task P3-T6 Accessibility Audit — Notes (2024-02-14)

### Overview
Goal is to ensure translation mode meets WCAG AA expectations for focus order, labeling, keyboard reachability, and status announcements.

### Current Findings
- **Heading structure**: translation view header nests statistics and progress but lacks landmark or heading to announce entering translation mode; screen readers simply encounter a div.
- **Buttons/controls**: retry button (new error banner) has text label but CTA is small; sentence action buttons (Cancel/Save) are standard but double-click is required to open editor—there is no keyboard shortcut to invoke editing beyond double-click (could consider `Enter`).
- **Focus management**: after inline edit save/cancel we return focus to sentence (good). Toggling translation mode hides the original document but focus isn't explicitly moved to the translation view container.
- **Status announcements**: progress banner uses `aria-live="polite"`, error banner uses `role="alert"`; sentence-level error messages rely on DOM text (should ensure `aria-live` update when set).
- **Keyboard navigation**: sentence cards are focusable via `tabindex="-1"`, but there is no roving tabindex to make them part of the tab order. Users must rely on click to select.
- **Contrast**: new status chips use color tokens, but need contrast check (manual verification pending). Error banner uses light red background—should confirm contrast ratio.

### Gaps / Todo Items
1. Add heading/landmark for translation region (`<h2>` or `role="region" aria-label="Translation workspace"`).
2. Ensure first focus after entering translation mode moves to the translation container.
3. Provide keyboard alternative for opening editor (e.g., `Enter` when sentence card focused).
4. Consider roving tabindex so sentences can be reached by Tab instead of requiring click.
5. Verify aria-live on sentence error message or trigger polite announcement when errors set.
6. Run axe-core snapshot once updates land.

### Next Steps
- Implement (1)-(4) in code; log any contrast issues to design backlog.
- Add unit/integration checks where feasible (keyboard open edit, focus management).

---

### Implementation notes (2024-02-14)
- Added region heading and automatic focus when entering translation mode.
- Introduced keyboard activation for sentence editing (`Enter` / `Space`) and roving tabindex semantics so sentence cards are reachable.
- Error banner and per-sentence badges now expose accessible alerts with retry controls.
- Unit coverage extended in `translation-ui.test.ts` to exercise banner and keyboard behaviours.
