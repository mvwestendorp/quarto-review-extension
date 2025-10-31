import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MilkdownEditor } from '@modules/ui/editor/MilkdownEditor';

/**
 * Editor Reopen After Edit Test
 *
 * Reproduces the exact scenario where the error occurs:
 * 1. User opens editor for a section
 * 2. User makes edits
 * 3. User closes the editor
 * 4. User opens the editor again (THIS IS WHERE THE ERROR OCCURS)
 *
 * The error: "Failed to initialize editor. Please try again."
 * Root cause: "o is not a function"
 */

describe('Editor Reopen After Edit - Reproduces "o is not a function" error', () => {
  let container: HTMLElement;
  let editorContainer: HTMLElement;

  beforeEach(() => {
    // Set up DOM structure
    container = document.createElement('div');
    container.className = 'review-editor-modal';

    editorContainer = document.createElement('div');
    editorContainer.className = 'review-editor-body';

    container.appendChild(editorContainer);
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should be able to open editor, make changes, close, and reopen without error', async () => {
    const content = 'Test paragraph with some content.';
    const elementType = 'Para';

    // FIRST OPEN - User opens editor
    const editor1 = new MilkdownEditor();
    await editor1.initialize(container, content, [], elementType);

    expect(editor1.getInstance()).not.toBeNull();
    expect(editor1.getToolbar()).not.toBeNull();

    // Simulate editing
    const newContent = 'Test paragraph with some content. [EDITED]';

    // Close editor
    editor1.destroy();

    // SECOND OPEN - User opens editor again (ERROR OCCURS HERE)
    // This is where "o is not a function" happens
    const editor2 = new MilkdownEditor();

    // This should NOT throw
    await expect(
      editor2.initialize(container, newContent, [], elementType)
    ).resolves.not.toThrow();

    expect(editor2.getInstance()).not.toBeNull();
    expect(editor2.getToolbar()).not.toBeNull();

    editor2.destroy();
  });

  it('should handle multiple successive editor opens and closes', async () => {
    const content = 'Original content';
    const elementType = 'Para';

    // Open and close editor 3 times
    for (let i = 0; i < 3; i++) {
      const editor = new MilkdownEditor();

      const testContent = `${content} [edit ${i}]`;

      // Should NOT throw "o is not a function"
      await expect(
        editor.initialize(container, testContent, [], elementType)
      ).resolves.not.toThrow();

      expect(editor.getInstance()).not.toBeNull();
      editor.destroy();
    }
  });

  it('should maintain editor state across multiple opens', async () => {
    const originalContent = 'Original paragraph text';
    const elementType = 'Para';

    // First open
    const editor1 = new MilkdownEditor();
    await editor1.initialize(container, originalContent, [], elementType);
    const content1 = editor1.getContent();
    expect(content1).toBeTruthy();
    editor1.destroy();

    // Second open with modified content
    const modifiedContent = 'Original paragraph text with modifications';
    const editor2 = new MilkdownEditor();
    await editor2.initialize(container, modifiedContent, [], elementType);
    const content2 = editor2.getContent();
    expect(content2).toBeTruthy();
    expect(content2).toContain('modifications');
    editor2.destroy();

    // Third open
    const editor3 = new MilkdownEditor();
    await expect(
      editor3.initialize(container, modifiedContent, [], elementType)
    ).resolves.not.toThrow();
    editor3.destroy();
  });

  it('should handle rapid open-close-open cycles', async () => {
    const content = 'Test content';
    const elementType = 'Para';

    // Rapid cycle
    for (let cycle = 0; cycle < 3; cycle++) {
      const editor = new MilkdownEditor();

      await expect(
        editor.initialize(
          container,
          `${content} cycle ${cycle}`,
          [],
          elementType
        )
      ).resolves.not.toThrow();

      expect(editor.getInstance()).not.toBeNull();

      // Immediately close and continue
      editor.destroy();
    }
  });

  it('should not have lingering state that causes plugin initialization to fail', async () => {
    const content = 'Paragraph content';
    const elementType = 'Para';

    // First editor
    const editor1 = new MilkdownEditor();
    await editor1.initialize(container, content, [], elementType);

    // Get toolbar to trigger any side effects
    const toolbar1 = editor1.getToolbar();
    toolbar1?.updateState();

    editor1.destroy();

    // Second editor - should NOT fail
    const editor2 = new MilkdownEditor();

    // The error would occur here if plugins are corrupted
    await expect(
      editor2.initialize(container, content, [], elementType)
    ).resolves.not.toThrow();

    expect(editor2.getInstance()).not.toBeNull();
    editor2.destroy();
  });
});
