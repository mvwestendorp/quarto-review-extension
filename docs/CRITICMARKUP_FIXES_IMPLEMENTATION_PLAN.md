# CriticMarkup Display & Tracking Issues - Implementation Plan

## Executive Summary

There are 4 interconnected issues related to how CriticMarkup is displayed, stored, and edited. They stem from a fundamental design issue: **the editor loads "clean" content without CriticMarkup annotations, losing information about what was added/deleted.**

---

## Issue 1: Comment Composer Should Use Milkdown Editor

### Current State
- Comments use plain `<textarea>` (line 157 in CommentComposer.ts)
- No formatting options (bold, italic, lists, etc.)
- No syntax highlighting
- Requests: "Use Milkdown editor for comments with formatting support"

### Root Cause
- CommentComposer designed with simple HTML form approach
- Milkdown integration not implemented for comments

### Implementation Steps

#### Step 1: Create CommentEditor Class
**New File**: `/src/modules/ui/comments/CommentEditor.ts`

```typescript
import { Milkdown, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { nord } from '@milkdown/theme-nord'; // or choose theme

export class CommentEditor {
  private editor: Milkdown | null = null;
  private container: HTMLElement | null = null;
  private content: string = '';

  async initialize(container: HTMLElement, initialContent: string = ''): Promise<void> {
    this.container = container;
    this.content = initialContent;

    this.editor = new Milkdown()
      .use(nord) // Theme
      .use(commonmark) // Basic markdown support: bold, italic, lists, code
      // NOTE: DO NOT include criticMarkupPlugin to avoid syntax conflicts
      .config((ctx) => {
        ctx.set(rootCtx, { root: container });
        ctx.set(defaultValueCtx, initialContent);
      })
      .create();

    await this.editor.waitForPluginLoaded('commonmark');
  }

  getContent(): string {
    if (!this.editor) return '';
    // Get markdown from editor
    return this.editor.view.state.doc.textContent;
  }

  setContent(content: string): void {
    if (!this.editor) return;
    // Update editor content
    this.editor.setMarkdown(content);
    this.content = content;
  }

  focus(): void {
    if (!this.editor) return;
    this.editor.focus();
  }

  destroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}
```

#### Step 2: Update CommentComposer to Use CommentEditor
**File**: `/src/modules/ui/comments/CommentComposer.ts`

Replace textarea with CommentEditor:

```typescript
export class CommentComposer extends ModuleEventEmitter {
  private element: HTMLElement | null = null;
  private editor: CommentEditor | null = null; // ADD THIS
  private isOpen = false;
  // ... rest of properties

  create(): HTMLElement {
    const composer = document.createElement('div');
    composer.className = 'review-comment-composer';
    // ... header and footer creation ...

    // Instead of textarea:
    const editorContainer = document.createElement('div');
    editorContainer.className = 'review-comment-composer-editor';
    composer.appendChild(editorContainer);

    this.element = composer;
    return composer;
  }

  async open(
    context: ComposerContext,
    sidebarBody: HTMLElement,
    onSubmit?: (content: string, ctx: ComposerContext) => void
  ): Promise<void> {
    // ... existing code ...

    // Initialize editor in the container
    const editorContainer = this.element!.querySelector('.review-comment-composer-editor');
    if (editorContainer) {
      this.editor = new CommentEditor();
      await this.editor.initialize(
        editorContainer as HTMLElement,
        context.existingComment || ''
      );
      this.editor.focus();
    }
  }

  getContent(): string {
    if (this.editor) {
      return this.editor.getContent();
    }
    return '';
  }

  close(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    // ... existing code ...
  }

  destroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    // ... existing code ...
  }
}
```

#### Step 3: Add CSS for Comment Editor
**File**: `/_extensions/review/assets/components/comments.css`

```css
.review-comment-composer-editor {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-height: 120px;
  padding: 8px;
  margin: 12px 0;
  background: var(--bg-color);
}

.review-comment-composer-editor .milkdown {
  font-size: 14px;
  line-height: 1.5;
}

.review-comment-composer-editor .milkdown-editor {
  min-height: 120px;
}
```

---

## Issue 2: CriticMarkup Not Displayed Consistently

### Current State
- Pre-existing CriticMarkup in markdown: not visible until after edit
- Manually added CriticMarkup: only character-level syntax rendered (whitespace + green line)
- Reopening editor: correct formatting appears

### Root Causes

**Cause 2A: Initial Content Load**
- `ChangesModule.getElementContent()` returns CLEAN content (no CriticMarkup)
- Content loaded into editor doesn't have `{--...--}` syntax
- Milkdown parser can't render marks from non-existent syntax

**Cause 2B: Display After Edit**
- After edit, `getElementContentWithTrackedChanges()` IS called for export
- This wraps changes in CriticMarkup syntax
- When viewed in markdown, syntax appears correctly
- But in editor, if reopened, it's displayed as clean text again

**Cause 2C: Manual CriticMarkup Entry**
- User types `{--deleted text--}` manually
- Milkdown's criticMarkupRemarkPlugin parses this correctly
- But only the syntax characters get marked (whitespace + line)
- The actual deletion content not visible until after re-parse

### Solution: Load Editor with Tracked Changes Included

#### Option A: Always Show Tracked Changes (Recommended)
When opening element for editing, load with CriticMarkup included:

**File**: `/src/modules/ui/index.ts` (In `openEditor` method around line 1450)

```typescript
async openEditor(elementId: string): Promise<void> {
  const element = this.config.changes.getElementById(elementId);
  if (!element) return;

  // CHANGE: Load with tracked changes instead of clean content
  const content = this.config.changes.getElementContentWithTrackedChanges(elementId);
  // Previously was:
  // const content = this.config.changes.getElementContent(elementId);

  // ... rest of initialization ...
  await this.editorLifecycle.initializeEditor(
    container,
    content, // Now includes CriticMarkup syntax
    elementType,
    elementId
  );
}
```

#### Step 1: Update ChangesModule to Ensure Baseline is Set
**File**: `/src/modules/changes/index.ts`

```typescript
// In constructor or initialization:
public initializeFromDOM(container?: HTMLElement): void {
  // ... existing code ...

  // Ensure baseline is set for each element
  for (const element of this.elements) {
    if (!this.baselines.has(element.id)) {
      // New element - set baseline to empty string
      // This allows generateChanges("", content) to mark entire content as addition
      this.baselines.set(element.id, "");
    }
  }
}

// When replacing content with segments:
public replaceElementWithSegments(elementId: string, segments: any[]): {
  elementIds: string[];
  removedIds: string[];
} {
  // ... existing code ...

  // Make sure baseline is set to old content
  const oldContent = this.getElementById(elementId)?.content || "";
  if (!this.baselines.has(elementId)) {
    this.baselines.set(elementId, oldContent);
  }

  // ... rest of code ...
}
```

#### Step 2: Ensure Milkdown Properly Parses CriticMarkup
**File**: `/src/modules/ui/editor/MilkdownEditor.ts` (around line 110)

The editor already loads with CriticMarkup plugins, but verify they're parsing correctly:

```typescript
async initialize(
  container: HTMLElement,
  content: string,
  diffHighlights: DiffHighlightRange[] = [],
  elementType: string = 'default'
): Promise<void> {
  // Make sure content is not escaped HTML
  // It should be raw markdown with {--...--} syntax
  const normalizedContent = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  this.editor = new Milkdown()
    .use(nord)
    .use(commonmark)
    .use(gfm) // GitHub Flavored Markdown
    .use(criticMarkupRemarkPlugin) // This parses {--...--} syntax
    .use(criticKeymap) // Keyboard shortcuts
    .config((ctx) => {
      ctx.set(rootCtx, { root: container });
      ctx.set(defaultValueCtx, normalizedContent); // Pass with CriticMarkup syntax
      // ... rest of config
    })
    .create();

  // ...
}
```

---

## Issue 3: Editor Shows Clean Content Instead of Tracked Changes

### Current State
- When editing, deleted text is missing (clean content)
- Strikethrough markup not visible in editor
- After save, diff shows entire changed content as new

### Root Cause
- `getElementContent()` strips CriticMarkup during save/load cycle
- Element baseline not preserved across edits
- When diff is calculated, it compares against empty/wrong baseline

### Solution: Preserve Baseline Across Edits

#### Step 1: Track Baseline Explicitly
**File**: `/src/modules/changes/index.ts`

```typescript
private baselines: Map<string, string> = new Map();

// Initialize baselines when loading from DOM
public initializeFromDOM(container?: HTMLElement): void {
  // ... existing code ...

  for (const element of this.elements) {
    // Store original content as baseline
    this.baselines.set(element.id, element.content);
  }
}

// When editing, compare against baseline
public edit(
  elementId: string,
  newContent: string,
  userId?: string,
  newMetadata?: any
): Operation | null {
  const element = this.getElementById(elementId);
  if (!element) return null;

  const baseline = this.baselines.get(elementId) || element.content;

  // Create changes comparing new content against baseline
  const changes = generateChanges(baseline, newContent);

  // Store operation
  const op: Operation = {
    id: this.generateId(),
    type: 'edit',
    elementId,
    timestamp: Date.now(),
    userId,
    data: {
      oldContent: baseline,
      newContent,
      metadata: newMetadata,
    },
  };

  this.addOperation(op);

  // Update element (store the new content, not clean)
  element.content = newContent;

  // Update baseline for next comparison
  this.baselines.set(elementId, newContent);

  return op;
}

// New method: get element with CriticMarkup for editing
public getElementContentForEditing(id: string): string {
  const element = this.getElementById(id);
  if (!element) return '';

  // Return content with CriticMarkup annotations
  return this.getElementContentWithTrackedChanges(id);
}
```

#### Step 2: Load Editor Content Correctly
**File**: `/src/modules/ui/index.ts` (In `openEditor` method)

```typescript
async openEditor(elementId: string): Promise<void> {
  const element = this.config.changes.getElementById(elementId);
  if (!element) return;

  // Load with CriticMarkup for editing
  const content = this.config.changes.getElementContentForEditing(elementId);

  // Initialize editor with this content
  // When user saves, the content (with CriticMarkup syntax) is diff'd
  await this.editorLifecycle.initializeEditor(
    container,
    content,
    elementType,
    elementId
  );

  // Store reference to original baseline
  (this as any).editingElementBaseline = this.config.changes.getElementBaseline?.(elementId);
}

// When saving
async saveEditor(elementId: string): Promise<void> {
  const newContent = this.editorState.currentEditorContent;
  const baseline = (this as any).editingElementBaseline || '';

  // Save with the content as-is (including any CriticMarkup)
  // The diff will be calculated against baseline
  await this.config.changes.edit(elementId, newContent);
}
```

---

## Issue 4: New Section Additions Not Marked with CriticMarkup

### Current State
- When adding new text as a new section, no green addition markers
- Export doesn't include `{++...++}` markup for new sections
- Works correctly for edits to existing sections

### Root Cause
- New elements created with empty/undefined baseline
- `generateChanges("", newContent)` not recognizing content as addition
- `changesToCriticMarkup()` only marks line-level changes, not first addition

### Solution: Ensure New Elements Have Empty Baseline

#### Step 1: Mark New Elements Explicitly
**File**: `/src/modules/changes/index.ts`

```typescript
// When creating new element
public addElement(element: ReviewElement, metadata?: ElementMetadata): void {
  this.elements.push(element);

  // For new elements, set baseline to empty string
  // This ensures generateChanges("", content) marks it as addition
  this.baselines.set(element.id, "");
}

// When segmenting produces new elements
public replaceElementWithSegments(
  elementId: string,
  segments: any[]
): { elementIds: string[]; removedIds: string[] } {
  // ... existing code ...

  const newElementIds: string[] = [];
  for (const segment of segments) {
    const newId = `${elementId}-seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For new segments, set baseline to empty
    this.baselines.set(newId, "");

    newElementIds.push(newId);
  }

  // ... rest of code ...
}
```

#### Step 2: Update changesToCriticMarkup to Handle Empty Baseline
**File**: `/src/modules/changes/converters.ts`

```typescript
export function changesToCriticMarkup(
  oldContent: string,
  changes: TextChange[]
): string {
  // Handle new content case (empty baseline)
  if (!oldContent && changes.length > 0) {
    // If baseline is empty and there's content, mark entire content as addition
    return `{++${changes.map(c => c.text).join('')}++}`;
  }

  // ... existing code for changes ...
}
```

#### Step 3: Ensure Export Includes New Sections with CriticMarkup
**File**: `/src/modules/export/index.ts`

When exporting in "critic" format:

```typescript
private async collectFiles(
  primaryFilename: string,
  format: ExportFormat,
  context: ProjectContext
): Promise<ExportedFile[]> {
  // ...
  if (format === 'critic') {
    // Use tracked markdown which includes CriticMarkup for all changes
    // including new sections
    content = this.changes.toTrackedMarkdown();

    // Verify all elements have baselines
    const allElements = this.changes.getCurrentState();
    for (const elem of allElements) {
      if (!this.changes.getElementBaseline(elem.id)) {
        // Element might be new - treat as complete addition
        logger.warn(`Element ${elem.id} has no baseline - will export as complete addition`);
      }
    }
  }
  // ...
}
```

#### Step 4: Update getElementContentWithTrackedChanges
**File**: `/src/modules/changes/index.ts`

```typescript
public getElementContentWithTrackedChanges(id: string): string {
  const element = this.getElementById(id);
  const baseline = this.getElementBaseline(id) || this.baselines.get(id) || "";

  if (!element) return '';

  const targetContent = element.content;

  // If baseline is empty (new element), wrap entire content as addition
  if (!baseline) {
    return `{++${targetContent}++}`;
  }

  const changes = generateChanges(baseline, targetContent);
  return changesToCriticMarkup(baseline, changes);
}
```

---

## Testing Strategy

### Test 1: Comment Editor with Formatting
```typescript
// Should allow bold, italic, lists in comments
const editor = new CommentEditor();
await editor.initialize(container, "");
await editor.setContent("This is **bold** and *italic* text");
const content = editor.getContent();
expect(content).toContain("**bold**");
expect(content).toContain("*italic*");
```

### Test 2: CriticMarkup Display Consistency
```typescript
// Should display pre-existing CriticMarkup
const content = "Some {--deleted--} {++added++} text";
await editor.initialize(container, content);
// Verify marks are rendered (del, ins elements in DOM)
const marks = container.querySelectorAll('[data-critic]');
expect(marks.length).toBeGreaterThan(0);
```

### Test 3: Tracked Changes in Editor
```typescript
// Should show strikethrough for deleted text
const contentWithChanges = "Original {--old--} text";
await editor.initialize(container, contentWithChanges);
// Verify deletion mark is visible
const deletions = container.querySelectorAll('del[data-critic="deletion"]');
expect(deletions.length).toBeGreaterThan(0);
```

### Test 4: New Section CriticMarkup
```typescript
// Should mark entire new section as addition
const baseline = "";
const newContent = "This is a brand new section";
const changes = generateChanges(baseline, newContent);
const markup = changesToCriticMarkup(baseline, changes);
expect(markup).toContain("{++");
expect(markup).toContain("++}");
```

---

## Implementation Order

1. **Phase 1: Comment Editor** (Issue 1)
   - Create CommentEditor class
   - Update CommentComposer to use Milkdown
   - Add CSS styling
   - **Time: 2-3 hours**

2. **Phase 2: Baseline Management** (Issues 3, 4)
   - Implement baseline tracking in ChangesModule
   - Update edit() method to preserve baseline
   - Add getElementContentForEditing() method
   - **Time: 2-3 hours**

3. **Phase 3: Editor Content Loading** (Issues 2, 3)
   - Update openEditor() to load tracked content
   - Update MilkdownEditor initialization
   - Verify CriticMarkup parsing works correctly
   - **Time: 1-2 hours**

4. **Phase 4: Export Updates** (Issues 2, 4)
   - Update changesToCriticMarkup() for empty baselines
   - Update getElementContentWithTrackedChanges()
   - Verify export includes all CriticMarkup
   - **Time: 1-2 hours**

5. **Phase 5: Testing**
   - Add unit tests for each phase
   - Integration tests for full workflow
   - Manual testing with actual Quarto files
   - **Time: 2-3 hours**

**Total Estimated Time: 8-13 hours of development**

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Baseline tracking breaks undo/redo | High | Verify operations still store oldContent/newContent correctly |
| CriticMarkup parsing fails for complex syntax | Medium | Test with real Quarto files, add edge case tests |
| Performance degrades with large documents | Medium | Profile performance, optimize if needed |
| Comments lose formatting on reimport | Low | Test round-trip of comment markdown |

---

## Success Criteria

- [ ] Comment editor supports bold, italic, lists, code formatting
- [ ] Pre-existing CriticMarkup displays on first open of editor
- [ ] Deleted text shows with strikethrough when editing
- [ ] New sections export with `{++...++}` markup
- [ ] All 4 issues resolved in integration test
- [ ] No performance degradation with 100+ elements
- [ ] Undo/redo still works correctly
- [ ] Comments preserve formatting across save/load

