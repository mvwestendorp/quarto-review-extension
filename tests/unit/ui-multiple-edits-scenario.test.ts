import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MilkdownEditor } from '@modules/ui/editor/MilkdownEditor';

/**
 * Multiple Edits Scenario Test
 *
 * This test reproduces the actual bug: when a user makes multiple edits
 * within the SAME editor session (without closing), then closes and reopens,
 * the editor fails to initialize with "o is not a function" error.
 *
 * Scenario:
 * 1. Open editor
 * 2. Make edit 1
 * 3. Make edit 2 (while editor still open)
 * 4. Make edit 3 (still open)
 * 5. Close editor
 * 6. Reopen editor <- THIS IS WHERE IT FAILS
 */

describe('Multiple Edits Within Same Session', () => {
  let container: HTMLElement;
  let editorContainer: HTMLElement;

  beforeEach(() => {
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

  it('should handle reopening after multiple edits in same session', async () => {
    const editor = new MilkdownEditor();
    const content = 'Test paragraph with some content.';
    const elementType = 'Para';

    // FIRST OPEN
    await editor.initialize(container, content, [], elementType);
    expect(editor.getInstance()).not.toBeNull();

    // Simulate multiple edits while editor is still open
    // (In UIModule, this would be from Milkdown's content change events)
    const edit1Content = 'Test paragraph with some content. [EDIT 1]';
    const edit2Content = 'Test paragraph with some content. [EDIT 1][EDIT 2]';
    const edit3Content = 'Test paragraph with some content. [EDIT 1][EDIT 2][EDIT 3]';

    // These would normally come from Milkdown's listener
    // Emit them to simulate the editing flow
    editor.emit('module:editor:content:changed', { markdown: edit1Content });
    editor.emit('module:editor:content:changed', { markdown: edit2Content });
    editor.emit('module:editor:content:changed', { markdown: edit3Content });

    // Close editor
    editor.destroy();

    // SECOND OPEN - THIS IS WHERE ERROR OCCURS
    // Reset DOM
    container.innerHTML = '<div class="review-editor-body"></div>';

    // Create NEW editor instance (as UIModule does)
    // But the issue might be in how the previous one left state
    const editor2 = new MilkdownEditor();

    // This should NOT throw "o is not a function"
    await expect(
      editor2.initialize(container, edit3Content, [], elementType)
    ).resolves.not.toThrow();

    expect(editor2.getInstance()).not.toBeNull();

    editor2.destroy();
  });

  it('should handle 3 open-edit-close cycles without error', async () => {
    const editor = new MilkdownEditor();
    const elementType = 'Para';

    for (let cycle = 0; cycle < 3; cycle++) {
      container.innerHTML = '<div class="review-editor-body"></div>';

      const baseContent = `Content cycle ${cycle}`;

      // Open editor
      await editor.initialize(container, baseContent, [], elementType);

      // Make multiple edits
      for (let editNum = 0; editNum < 5; editNum++) {
        editor.emit('module:editor:content:changed', {
          markdown: `${baseContent} [edit ${editNum}]`,
        });
      }

      // Close editor
      editor.destroy();
    }

    // If we got here without error, test passes
    expect(true).toBe(true);
  });

  it('should handle reinitialization with same instance after multiple edits', async () => {
    const editor = new MilkdownEditor();
    const elementType = 'Para';

    // Open once
    await editor.initialize(container, 'First content', [], elementType);

    // Emit multiple content changes
    for (let i = 0; i < 3; i++) {
      editor.emit('module:editor:content:changed', { markdown: `Edit ${i}` });
    }

    // Destroy
    editor.destroy();

    // Reinitialize SAME instance on same container
    container.innerHTML = '<div class="review-editor-body"></div>';

    // This should work without "o is not a function" error
    await expect(
      editor.initialize(container, 'Second open', [], elementType)
    ).resolves.not.toThrow();

    expect(editor.getInstance()).not.toBeNull();

    editor.destroy();
  });

  it('should properly clean up event listeners before reinitialization', async () => {
    const editor = new MilkdownEditor();
    const elementType = 'Para';
    const callLog: string[] = [];

    // Open and set up listener
    await editor.initialize(container, 'Content', [], elementType);

    editor.on('module:editor:content:changed', (detail: any) => {
      callLog.push(detail.markdown);
    });

    // Emit some events
    editor.emit('module:editor:content:changed', { markdown: 'edit 1' });
    expect(callLog).toHaveLength(1);

    // Destroy
    editor.destroy();

    // Reinitialize
    container.innerHTML = '<div class="review-editor-body"></div>';
    callLog.length = 0;

    // Add a new listener for the second session
    editor.on('module:editor:content:changed', (detail: any) => {
      callLog.push(`session2: ${detail.markdown}`);
    });

    await editor.initialize(container, 'Content 2', [], elementType);

    // Emit event in new session
    editor.emit('module:editor:content:changed', { markdown: 'edit 2' });

    // Should only have the new session's edit, not accumulated with old ones
    expect(callLog).toHaveLength(1);
    expect(callLog[0]).toContain('session2');

    editor.destroy();
  });
});
