# Editor Toolbar Improvements

**Status:** Implementation Required
**Date:** 2025-11-06

## Current Issues

### 1. Undo/Redo Always Greyed Out ⚠️
**Problem:** Undo/redo buttons are permanently disabled
**Root Cause:** Button state not being updated when editor history changes
**Impact:** Users cannot undo/redo via toolbar buttons (keyboard shortcuts still work)

### 2. Arrow Buttons Unclear 🤔
**Problem:** Left/right arrow buttons have unclear purpose
**Action Needed:** Investigate purpose or remove if not functional

### 3. Limited Header Support 📝
**Problem:** Only H2 and H3 supported, no H4-H6
**Impact:** Cannot format headers at levels 4, 5, or 6
**User Need:** Full header hierarchy support

### 4. Toolbar Layout Issues 📐
**Problem:** Toolbar is separate from action buttons (Save/Cancel)
**Goal:** Move toolbar to same row as Save/Cancel buttons
**Requirement:** Row should expand height to accommodate toolbar

## Proposed Solutions

### Fix 1: Enable Undo/Redo Buttons

**Implementation:**
- Listen to editor state changes
- Update button disabled state based on history stack
- Wire to Milkdown's undo/redo commands

```typescript
// In EditorToolbar class
private updateUndoRedoState(): void {
  if (!this.milkdownEditor) return;

  const view = this.milkdownEditor.ctx.get(editorViewCtx);
  const undoBtn = this.element?.querySelector('[data-action="undo"]');
  const redoBtn = this.element?.querySelector('[data-action="redo"]');

  if (undoBtn && redoBtn) {
    const canUndo = view.state.history$.canUndo();
    const canRedo = view.state.history$.canRedo();

    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
  }
}
```

### Fix 2: Add H4, H5, H6 Support

**Update TOOLBAR_BUTTON_GROUPS:**

```typescript
export type EditorToolbarAction =
  | 'undo'
  | 'redo'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'  // NEW
  | 'heading-5'  // NEW
  | 'heading-6'  // NEW
  | 'blockquote'
  // ... rest

// Add to button groups
[
  {
    action: 'heading-4',
    label: 'H4',
    title: 'Heading 4 (Ctrl+Alt+4)',
  },
  {
    action: 'heading-5',
    label: 'H5',
    title: 'Heading 5 (Ctrl+Alt+5)',
  },
  {
    action: 'heading-6',
    label: 'H6',
    title: 'Heading 6 (Ctrl+Alt+6)',
  },
]
```

### Fix 3: Move Toolbar to Button Row

**Current Structure:**
```
┌─────────────────────────────┐
│  Editor Content             │
│                             │
└─────────────────────────────┘
┌─────────────────────────────┐
│  Toolbar (separate)         │
│  [B] [I] [H2] [H3] ...     │
└─────────────────────────────┘
┌─────────────────────────────┐
│  [Cancel]  [Save]          │
└─────────────────────────────┘
```

**Proposed Structure:**
```
┌─────────────────────────────┐
│  Editor Content             │
│                             │
└─────────────────────────────┘
┌─────────────────────────────┐
│  [Cancel] [Save]           │
│  [B][I][H2][H3][H4][H5]... │  ← Same row, expandable
└─────────────────────────────┘
```

**CSS Changes:**
```css
.review-editor-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 48px; /* Accommodate buttons */
}

.review-editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.review-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--review-border-color);
}
```

## Implementation Plan

### Phase 1: Quick Fixes (This Sprint)
1. ✅ Create proposal documents
2. ⏳ Fix undo/redo button state
3. ⏳ Add H4, H5, H6 buttons
4. ⏳ Investigate arrow buttons

### Phase 2: Layout Refactor (Next Sprint)
1. ⏳ Move toolbar to button row
2. ⏳ Make row height expandable
3. ⏳ Test responsive behavior
4. ⏳ Update CSS for all editor modals

### Phase 3: Polish (Following Sprint)
1. ⏳ Add keyboard shortcuts for H4-H6
2. ⏳ Improve button visual feedback
3. ⏳ Add button grouping/separators
4. ⏳ Performance optimization

## Testing Checklist

- [ ] Undo/redo buttons enable/disable correctly
- [ ] Undo/redo buttons work when clicked
- [ ] H4, H5, H6 buttons create correct markdown
- [ ] Toolbar wraps nicely on smaller screens
- [ ] Save/Cancel buttons remain accessible
- [ ] No layout shifts when toolbar appears
- [ ] Keyboard shortcuts still work
- [ ] Context-aware mode works with new headers

## Notes

- Arrow buttons may be leftover from previous iteration - verify before removing
- Consider adding tooltip improvements while fixing buttons
- Toolbar collapse/expand feature should be preserved
- Ensure accessibility (ARIA labels, keyboard navigation)
