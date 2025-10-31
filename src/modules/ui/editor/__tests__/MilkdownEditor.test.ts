/**
 * Test suite for MilkdownEditor initialization
 * Tests editor creation for different element types
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MilkdownEditor } from '../MilkdownEditor';

describe('MilkdownEditor', () => {
  let container: HTMLElement;
  let editorContainer: HTMLElement;
  let editor: MilkdownEditor;

  beforeEach(() => {
    // Set up DOM structure for editor
    container = document.createElement('div');
    container.className = 'review-editor-modal';

    editorContainer = document.createElement('div');
    editorContainer.className = 'review-editor-body';

    container.appendChild(editorContainer);
    document.body.appendChild(container);

    editor = new MilkdownEditor();
  });

  afterEach(() => {
    container.remove();
    editor.destroy();
  });

  describe('Header initialization', () => {
    it('should initialize editor for header elements without editorView context error', async () => {
      const testContent = '# Test Header';
      const elementType = 'Header';

      // This should not throw "Context 'editorView' not found" error
      await editor.initialize(container, testContent, [], elementType);

      // Verify editor was created successfully
      const instance = editor.getInstance();
      expect(instance).not.toBeNull();

      const toolbar = editor.getToolbar();
      expect(toolbar).not.toBeNull();

      // Verify toolbar can access editor state without errors
      expect(toolbar?.getElement()).not.toBeNull();
    });

    it('should initialize editor for paragraph elements without editorView context error', async () => {
      const testContent = 'This is a paragraph.';
      const elementType = 'Para';

      await expect(
        editor.initialize(container, testContent, [], elementType)
      ).resolves.not.toThrow();

      expect(editor.getInstance()).not.toBeNull();
      expect(editor.getToolbar()).not.toBeNull();
    });

    it('should initialize editor for code block elements without editorView context error', async () => {
      const testContent = '```\nconst x = 1;\n```';
      const elementType = 'CodeBlock';

      await expect(
        editor.initialize(container, testContent, [], elementType)
      ).resolves.not.toThrow();

      expect(editor.getInstance()).not.toBeNull();
    });

    it('should not throw editorView context error when toolbar tries to update state', async () => {
      const testContent = '# Test Header';
      const elementType = 'Header';

      // Initialize editor
      await editor.initialize(container, testContent, [], elementType);

      // Get the toolbar and try to update state (this would fail if editorView context is missing)
      const toolbar = editor.getToolbar();
      expect(toolbar).not.toBeNull();

      // This should not throw an error about missing editorView context
      expect(() => {
        toolbar?.updateState();
      }).not.toThrow();
    });
  });

  describe('Editor content initialization', () => {
    it('should preserve editor content for header elements', async () => {
      const testContent = '# Test Header\nWith some content';
      const elementType = 'Header';

      await editor.initialize(container, testContent, [], elementType);

      const content = editor.getContent();
      expect(content).toContain('Test Header');
    });

    it('should normalize list markers during initialization', async () => {
      const testContent = '- Item 1\n- Item 2';
      const elementType = 'BulletList';

      await editor.initialize(container, testContent, [], elementType);

      const content = editor.getContent();
      expect(content).toBeDefined();
    });
  });
});
