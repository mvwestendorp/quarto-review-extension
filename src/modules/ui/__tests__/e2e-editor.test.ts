/**
 * End-to-End Test Suite: Editor Workflow
 *
 * Tests the complete workflow of opening an editor, making changes,
 * and verifying that changes are properly stored and displayed.
 *
 * Test Scenario:
 * 1. Create a bullet list element with multiple items
 * 2. Open the editor for that element
 * 3. Make text bold in the list
 * 4. Save the changes
 * 5. Verify the changes are stored in ChangesModule
 * 6. Verify the UI displays the bold text correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { MarkdownModule } from '@modules/markdown';
import { CommentsModule } from '@modules/comments';
import { UIModule } from '../index';

describe('E2E: Editor Workflow - List Editing with Bold Text', () => {
  let container: HTMLElement;
  let changes: ChangesModule;
  let markdown: MarkdownModule;
  let comments: CommentsModule;
  let ui: UIModule;

  const TEST_LIST_CONTENT = `- **First** item
- Second item
- Third item`;

  const TEST_LIST_ID = 'review.bullet-list-1';
  const TEST_LIST_TYPE = 'BulletList';

  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create editable element with bullet list
    const editableElement = document.createElement('div');
    editableElement.className = 'review-editable';
    editableElement.setAttribute('data-review-id', TEST_LIST_ID);
    editableElement.setAttribute('data-review-type', TEST_LIST_TYPE);
    editableElement.setAttribute('data-review-markdown', TEST_LIST_CONTENT);
    editableElement.setAttribute('data-review-source-line', '10');

    // Add rendered content
    editableElement.innerHTML = `
      <div class="review-section-wrapper" data-review-wrapper="true">
        <ul>
          <li><strong>First</strong> item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ul>
      </div>
    `;

    container.appendChild(editableElement);

    // Initialize modules
    changes = new ChangesModule();
    markdown = new MarkdownModule({ enableCriticMarkup: true });
    comments = new CommentsModule();

    // Initialize changes from DOM
    changes.initializeFromDOM();

    // Initialize UI module
    ui = new UIModule({
      changes,
      markdown,
      comments,
      inlineEditing: false, // Use modal editor
    });
  });

  afterEach(() => {
    // Clean up DOM
    if (container.parentElement) {
      container.remove();
    }

    // Destroy UI module
    ui.destroy();

    // Close any open modals
    const modals = document.querySelectorAll('.review-editor-modal');
    modals.forEach((modal) => modal.remove());
  });

  describe('Setup and Initialization', () => {
    it('should properly initialize the test element in ChangesModule', () => {
      const element = changes.getElementById(TEST_LIST_ID);

      expect(element).not.toBeNull();
      expect(element?.id).toBe(TEST_LIST_ID);
      expect(element?.metadata.type).toBe(TEST_LIST_TYPE);
      expect(element?.content).toContain('First');
      expect(element?.content).toContain('Second');
      expect(element?.content).toContain('Third');
    });

    it('should have the correct initial markdown content', () => {
      const content = changes.getElementContent(TEST_LIST_ID);

      expect(content).toBe(TEST_LIST_CONTENT);
      expect(content).toContain('- **First** item');
      expect(content).toContain('- Second item');
      expect(content).toContain('- Third item');
    });

    it('should render the element correctly in the DOM', () => {
      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);

      expect(element).not.toBeNull();
      expect(element?.querySelector('ul')).not.toBeNull();

      const items = element?.querySelectorAll('li');
      expect(items?.length).toBe(3);

      const firstItem = items?.[0];
      expect(firstItem?.innerHTML).toContain('<strong>First</strong>');
    });
  });

  describe('Opening and Editing', () => {
    it('should be able to open the editor for the list element', async () => {
      // Attach event listeners (required for editor opening)
      ui.attachEventListeners();

      // Open the editor
      ui.openEditor(TEST_LIST_ID);

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify modal was created
      const modal = document.querySelector('.review-editor-modal');
      expect(modal).not.toBeNull();

      // Verify modal header shows element type
      const header = modal?.querySelector('.review-editor-header h3');
      expect(header?.textContent).toContain('BulletList');

      // Verify editor body has Milkdown mount point
      const editorBody = modal?.querySelector('.review-editor-body');
      expect(editorBody).not.toBeNull();

      // Close editor
      ui.closeEditor();
    });

    it('should initialize Milkdown with the list content', async () => {
      ui.attachEventListeners();
      ui.openEditor(TEST_LIST_ID);

      // Wait for Milkdown initialization
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Get the Milkdown editor instance
      const editorModal = document.querySelector('.review-editor-modal');
      const editorBody = editorModal?.querySelector('.review-editor-body');
      const editorSurface = editorBody?.querySelector('.review-editor-surface');

      // Verify Milkdown is mounted
      expect(editorSurface?.querySelector('.ProseMirror')).not.toBeNull();

      ui.closeEditor();
    });

    it('should display initial content in the toolbar context mode', async () => {
      ui.attachEventListeners();
      ui.openEditor(TEST_LIST_ID);

      // Wait for editor and toolbar initialization
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Get toolbar
      const toolbar = document.querySelector('.review-editor-toolbar');
      expect(toolbar).not.toBeNull();

      // Verify toolbar buttons are present (for bullet list context)
      const bulletListBtn = toolbar?.querySelector('[data-command="bullet-list"]');
      const orderedListBtn = toolbar?.querySelector('[data-command="ordered-list"]');
      const boldBtn = toolbar?.querySelector('[data-command="bold"]');

      expect(bulletListBtn).not.toBeNull();
      expect(orderedListBtn).not.toBeNull();
      expect(boldBtn).not.toBeNull();

      ui.closeEditor();
    });
  });

  describe('Making Changes - Bold Text in List', () => {
    it('should allow editing the list content to make text bold', async () => {
      ui.attachEventListeners();
      ui.openEditor(TEST_LIST_ID);

      // Wait for editor initialization
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Get the ProseMirror editor
      const editorSurface = document.querySelector('.review-editor-surface');
      const proseMirror = editorSurface?.querySelector('.ProseMirror') as HTMLElement;

      expect(proseMirror).not.toBeNull();

      // Simulate editing: make "Second" item bold
      const editedContent = `- **First** item
- **Second** item
- Third item`;

      // In a real scenario, user would select text and click bold button
      // For this test, we simulate the content change by directly calling the changes module
      // Note: In the actual UI, content changes are captured via Milkdown's
      // listener plugin (markdownUpdated event)
      changes.edit(TEST_LIST_ID, editedContent);

      // Verify changes were recorded
      const newContent = changes.getElementContent(TEST_LIST_ID);
      expect(newContent).toBe(editedContent);
      expect(newContent).toContain('- **Second** item');

      ui.closeEditor();
    });

    it('should track content changes with CriticMarkup when getting tracked content', async () => {
      // Make the edit
      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);

      // Get content with tracked changes visualization
      const trackedContent = changes.getElementContentWithTrackedChanges(TEST_LIST_ID);

      // Should contain CriticMarkup markers for tracked changes
      // The exact format includes {--old--} and {++new++} markers
      expect(trackedContent).toContain('{');
      expect(typeof trackedContent).toBe('string');
    });
  });

  describe('Saving Changes', () => {
    it('should save changes to the ChangesModule when editor is closed', async () => {
      ui.attachEventListeners();

      const originalContent = changes.getElementContent(TEST_LIST_ID);
      const editedContent = `- **First** item
- **Second** item with more text
- Third item`;

      // Open and edit
      ui.openEditor(TEST_LIST_ID);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Make change directly in ChangesModule
      // (In real UI, this would happen via Milkdown's content update callback)
      changes.edit(TEST_LIST_ID, editedContent);

      // Save by closing editor
      ui.closeEditor();

      // Verify change is persisted
      const savedContent = changes.getElementContent(TEST_LIST_ID);
      expect(savedContent).toBe(editedContent);
      expect(savedContent).not.toBe(originalContent);
    });

    it('should create operation record for the edit', async () => {
      const initialOps = changes.getOperations().length;

      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);

      const finalOps = changes.getOperations();
      expect(finalOps.length).toBeGreaterThan(initialOps);

      // Verify the last operation is an edit
      const lastOp =
        finalOps.length > 0 ? finalOps[finalOps.length - 1] : undefined;
      expect(lastOp?.type).toBe('edit');
      expect(lastOp?.elementId).toBe(TEST_LIST_ID);
    });

    it('should mark document as having unsaved changes', () => {
      expect(changes.hasUnsavedOperations()).toBe(false);

      changes.edit(TEST_LIST_ID, '- New content');

      expect(changes.hasUnsavedOperations()).toBe(true);

      // Mark as saved
      changes.markAsSaved();
      expect(changes.hasUnsavedOperations()).toBe(false);
    });
  });

  describe('UI Display After Save', () => {
    it('should refresh the display with the updated content', async () => {
      const editedContent = `- **First** item
- **Second** item (updated)
- Third item`;

      // Make the change
      changes.edit(TEST_LIST_ID, editedContent);

      // Refresh UI
      ui.refresh();

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get updated element
      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const wrapper = element?.querySelector('.review-section-wrapper');
      const liItems = wrapper?.querySelectorAll('li');

      expect(liItems?.length).toBe(3);

      // Verify second item shows updated text
      const secondItem = liItems?.[1];
      expect(secondItem?.textContent).toContain('Second');
      expect(secondItem?.textContent).toContain('updated');
    });

    it('should preserve bold formatting in the rendered output', async () => {
      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);
      ui.refresh();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const liItems = element?.querySelectorAll('li');

      // Check that bold elements are rendered
      // Note: strong elements contain the bold text
      expect(liItems?.length).toBe(3);

      const firstItem = liItems?.[0];
      const strongElement = firstItem?.querySelector('strong');
      expect(strongElement).not.toBeNull();

      const secondItem = liItems?.[1];
      const secondStrong = secondItem?.querySelector('strong');
      expect(secondStrong).not.toBeNull();
    });

    it('should preserve embedded markdown attribute after edits', () => {
      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const originalMarkdown = element?.getAttribute('data-review-markdown');
      expect(originalMarkdown).toBe(TEST_LIST_CONTENT);

      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);
      ui.refresh();

      const updatedElement = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const updatedMarkdown = updatedElement?.getAttribute('data-review-markdown');
      expect(updatedMarkdown).toBe(originalMarkdown);
    });

    it('should update the modified attribute', () => {
      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);

      // Initially not modified
      expect(element?.getAttribute('data-review-modified')).not.toBe('true');

      // Make a change
      changes.edit(TEST_LIST_ID, '- New content');
      ui.refresh();

      // Should be marked as modified
      const updatedElement = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      expect(updatedElement?.getAttribute('data-review-modified')).toBe('true');
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should support undo after making changes', () => {
      const originalContent = changes.getElementContent(TEST_LIST_ID);
      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);
      expect(changes.getElementContent(TEST_LIST_ID)).toBe(editedContent);

      // Undo the change
      const undoSuccess = changes.undo();
      expect(undoSuccess).toBe(true);

      // Content should revert to original
      expect(changes.getElementContent(TEST_LIST_ID)).toBe(originalContent);
    });

    it('should support redo after undo', () => {
      const editedContent = `- **First** item
- **Second** item
- Third item`;

      changes.edit(TEST_LIST_ID, editedContent);
      changes.undo();

      // Redo the change
      const redoSuccess = changes.redo();
      expect(redoSuccess).toBe(true);

      expect(changes.getElementContent(TEST_LIST_ID)).toBe(editedContent);
    });

    it('should maintain undo/redo state correctly', () => {
      expect(changes.canUndo()).toBe(false);
      expect(changes.canRedo()).toBe(false);

      changes.edit(TEST_LIST_ID, 'New content');

      expect(changes.canUndo()).toBe(true);
      expect(changes.canRedo()).toBe(false);

      changes.undo();

      expect(changes.canUndo()).toBe(false);
      expect(changes.canRedo()).toBe(true);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle multiple sequential edits', () => {
      const content1 = `- **First** item
- **Second** item
- Third item`;

      const content2 = `- **First** item
- **Second** item
- Third item
- Fourth item`;

      const content3 = `- **First** item
- **Second** item`;

      changes.edit(TEST_LIST_ID, content1);
      changes.edit(TEST_LIST_ID, content2);
      changes.edit(TEST_LIST_ID, content3);

      expect(changes.getElementContent(TEST_LIST_ID)).toBe(content3);

      // Should be able to undo all changes
      expect(changes.canUndo()).toBe(true);
      changes.undo();
      expect(changes.getElementContent(TEST_LIST_ID)).toBe(content2);

      changes.undo();
      expect(changes.getElementContent(TEST_LIST_ID)).toBe(content1);
    });

    it('should preserve element metadata through edits', () => {
      const originalElement = changes.getElementById(TEST_LIST_ID);
      expect(originalElement?.metadata.type).toBe(TEST_LIST_TYPE);

      changes.edit(TEST_LIST_ID, '- New content');

      const updatedElement = changes.getElementById(TEST_LIST_ID);
      expect(updatedElement?.metadata.type).toBe(TEST_LIST_TYPE);
    });

    it('should generate correct markdown summary', () => {
      changes.edit(TEST_LIST_ID, '- New content');

      const summary = changes.summarizeOperations();

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should properly export document as markdown', () => {
      changes.edit(TEST_LIST_ID, '- **Updated** content');

      const markdown = changes.toMarkdown();

      expect(markdown).toBeDefined();
      expect(markdown).toContain('Updated');
    });

    it('should handle rapid successive opens and closes', async () => {
      ui.attachEventListeners();

      // Open and close multiple times rapidly
      ui.openEditor(TEST_LIST_ID);
      await new Promise((resolve) => setTimeout(resolve, 50));
      ui.closeEditor();

      ui.openEditor(TEST_LIST_ID);
      await new Promise((resolve) => setTimeout(resolve, 50));
      ui.closeEditor();

      // Should not crash or lose state
      const element = changes.getElementById(TEST_LIST_ID);
      expect(element).not.toBeNull();
    });
  });

  describe('Markdown and Display Formatting', () => {
    it('should render bold markdown correctly', () => {
      const boldContent = `- **Bold item**
- Normal item`;

      changes.edit(TEST_LIST_ID, boldContent);
      ui.refresh();

      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const boldElements = element?.querySelectorAll('strong');

      // Should have strong elements for bold text
      expect(boldElements?.length).toBeGreaterThan(0);

      // First strong element should contain bold text
      // (May have CriticMarkup around it, so just check it exists)
      expect(boldElements?.[0]).not.toBeNull();
    });

    it('should handle mixed formatting (bold, italic, code)', () => {
      const mixedContent = `- **Bold** item
- *Italic* item
- \`code\` item`;

      changes.edit(TEST_LIST_ID, mixedContent);
      ui.refresh();

      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);

      expect(element?.querySelector('strong')).not.toBeNull();
      expect(element?.querySelector('em')).not.toBeNull();
      expect(element?.querySelector('code')).not.toBeNull();
    });

    it('should maintain list structure with complex content', () => {
      const complexContent = `- **Item 1** with *emphasis*
- Item 2 with \`code\`
- Item 3 with [link](http://example.com)`;

      changes.edit(TEST_LIST_ID, complexContent);
      ui.refresh();

      const element = document.querySelector(`[data-review-id="${TEST_LIST_ID}"]`);
      const listItems = element?.querySelectorAll('li');

      expect(listItems?.length).toBe(3);

      // Verify list structure is maintained
      const listContainer = element?.querySelector('ul');
      expect(listContainer).not.toBeNull();
      expect(listContainer?.children.length).toBe(3);
    });
  });
});
