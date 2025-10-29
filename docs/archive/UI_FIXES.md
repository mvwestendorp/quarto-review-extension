# UI Improvements Plan

## Issues Identified

### 1. Comment Badge Visibility
**Problem**: Highlighted text with comments - the comment text appears in Markdown but not in rendered HTML
**Root Cause**: Comment `<span>` elements are being removed by the DOM manipulation in `assignCommentAnchor()` (ui/index.ts:954-961)
**Fix**: Don't remove comment spans; instead, hide them with CSS and use data attributes

### 2. Standalone Comment UI
**Problem**: Empty blue circle + badge showing next to standalone comments
**Root Cause**: Standalone comments render as inline spans, creating visual artifacts
**Fix**: Position badge absolutely in top-right of editable container

### 3. Conflicting Interactions
**Problem**: Clicking opens editor + selecting text shows comment popup + selection shows comment dialog
**Current behavior**:
- Click element → Opens modal/inline editor
- Select text → Shows comment popup
- Mouseup → Handles text selection

**New UX Flow**:
- Single click: Do nothing (just allow text selection)
- Double click: Open editor
- Text selection: Show comment/highlight popup (existing)
- Right-click: Context menu with edit/comment options

### 4. Missing Persistent Sidebar
**Problem**: Undo/redo/comments are in various places
**Fix**: Create persistent sidebar with:
- Settings toggle
- Comments panel (existing, make permanent)
- Undo/Redo buttons
- Tracked changes toggle
- Help/info

### 5. HTML Duplication Bug
**Problem**: After series of actions, HTML duplicates for all sections
**Root Cause**: In `updateElementDisplay()`, setting `contentElem.innerHTML` without checking if we're replacing or appending
**Fix**: Clear and replace, don't append

## Implementation Plan

### Phase 1: Fix Critical Bugs
1. Fix HTML duplication in updateElementDisplay()
2. Fix comment span removal in assignCommentAnchor()
3. Add CSS to hide comment text but preserve in DOM

### Phase 2: Improve Interactions
1. Change single-click to not open editor
2. Add double-click to open editor
3. Keep selection popup for comments
4. Add right-click context menu for edit

### Phase 3: Persistent Sidebar
1. Create fixed sidebar on right side
2. Move undo/redo there
3. Add tracked changes toggle
4. Add settings section
5. Keep comments panel always accessible

### Phase 4: Polish
1. Improve standalone comment badge positioning
2. Add keyboard shortcuts
3. Add visual feedback
4. Improve animations
