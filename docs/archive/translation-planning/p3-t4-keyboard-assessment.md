## Phase 3 · Task P3-T4 Keyboard Shortcuts — Current State & Gaps

Date: 2024-02-14  
Owner: Codex Agent  
Related work: `docs/translation-refactor/phase-3-ux-stability.md`

---

### 1. What exists today

- **Global translation shortcuts** – `TranslationController` registers document-level handlers for:
  - `Ctrl/Cmd + T` → translate entire document
  - `Ctrl/Cmd + Shift + T` → translate selected sentence
  - `Ctrl/Cmd + Alt/Option + S` → swap languages  
  These are active whenever translation mode is open, regardless of editor focus.

- **Milkdown editor behaviours** – While a sentence is in edit mode, Milkdown manages its own shortcuts (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Y`, formatting, etc.). Because edits are only persisted on explicit “Save”, this undo stack is isolated to the in-place editor and does **not** update the translation change history until Save is clicked.

- **Translation undo/redo** – The sidebar provides buttons wired to `TranslationController.undo/redo()`. Keyboard equivalents (`Ctrl/Cmd + Z`, `Shift + Ctrl/Cmd + Z`) are currently handled by Milkdown when the editor is focused, and by the browser/ChangesModule when it is not. There is no routing that explicitly calls the translation undo stack when the translation view (but not the inline editor) has focus.

- **Saving** – There is no keyboard shortcut for saving a sentence while in edit mode. Pressing `Ctrl/Cmd + S` falls back to the browser default (page save) and does **not** trigger `TranslationEditorBridge.saveSentenceEdit()`. The only way to confirm an edit is via the on-screen “Save” button.

---

### 2. Problems to solve for P3-T4

1. **Provide `Ctrl/Cmd + S` within translation edit mode**  
   - Should commit the current sentence via `TranslationEditorBridge.saveSentenceEdit()` and return focus to the sentence container (mirroring the button flow).
   - Must suppress the browser’s Save Page dialog.

2. **Route undo/redo to the translation change stack while translation mode is active**  
   - When a sentence editor is open, Milkdown should keep managing intra-editor undo/redo until the user saves or cancels.  
   - When no inline editor is active (or after Save), `Ctrl/Cmd + Z` / `Shift + Ctrl/Cmd + Z` should call `TranslationController.undo/redo()` so the translation history is affected instead of the review-mode ChangesModule.
   - Need to ensure these overrides only run while translation mode is toggled on to avoid interfering with review mode bindings.

3. **Avoid conflicts with existing shortcut infrastructure**  
   - Main UI already has a `KeyboardShortcutManager` (see `docs/user/KEYBOARD_SHORTCUTS.md`) and Milkdown also binds keys internally. We need to centralise translation-specific handlers to avoid double preventing or leaking listeners.

4. **Maintain accessibility expectations**  
   - Provide `aria-live` feedback (or toast notifications) after keyboard-triggered save/undo/redo so screen-reader users receive confirmation without relying on the mouse.

---

### 3. Proposed changes

| Area | Action |
| --- | --- |
| TranslationController | Extend `setupKeyboardShortcuts()` to intercept `Ctrl/Cmd + S`, `Ctrl/Cmd + Z`, `Shift + Ctrl/Cmd + Z` while translation mode is active. Delegate to the view/editor depending on whether an inline editor is open. |
| TranslationView / TranslationEditorBridge | Expose helpers (`isEditorActive`, `saveCurrentEdit`, etc.) so the controller can decide if there is a pending sentence edit. |
| Sidebar state | After invoking controller undo/redo via keyboard, keep the sidebar buttons in sync by calling `updateTranslationUndoRedoState()`. |
| Tests | Add unit coverage (likely in `translation-ui.test.ts`) to verify that keyboard events trigger the expected controller methods and that browser defaults are suppressed. Consider a focussed editor test to ensure Milkdown shortcuts still operate until save. |

---

### 4. Open questions / follow-ups

- Do we want `Esc` to exit translation mode entirely or only cancel inline edits? (Currently, `Esc` only cancels an active editor.)
- Should `Ctrl/Cmd + Enter` save-and-focus the next sentence? (Not in scope for P3-T4 but worth noting for UX discussion.)
- Need to audit existing keyboard shortcut documentation after implementation to keep docs/user guides accurate.

---

### 5. Implementation update — 2024-02-14

- `Ctrl/Cmd + S` now delegates to `TranslationView.saveActiveEditor()`, committing the inline editor and restoring focus without triggering the browser Save dialog.
- Undo/redo keyboard shortcuts (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`, `Ctrl/Cmd + Y`) route to the translation history when no editor is active, while allowing Milkdown to manage local undo stacks during editing.
- `TranslationView` tracks the active editor context and exposes `isEditorActive`, `saveActiveEditor`, and `cancelActiveEditor` so the controller can reason about keyboard interactions.
- Added `tests/unit/translation-shortcuts.test.ts` to cover the new key bindings; existing UI/merge suites remain green after the change.
