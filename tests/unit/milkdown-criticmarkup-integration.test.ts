/**
 * Integration test for Milkdown with CriticMarkup
 * This test reproduces the actual cyclic reference error that occurs in the browser
 */

import { describe, it, expect } from 'vitest';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import {
  criticAddition,
  criticDeletion,
  criticHighlight,
  criticComment,
  criticSubstitution,
  criticMarkupPlugin,
  criticMarkupRemarkPlugin,
  criticKeymap,
} from '../../src/modules/ui/criticmarkup';

describe('Milkdown CriticMarkup Integration', () => {
  it('should initialize Milkdown editor with CriticMarkup in list without cyclic error', async () => {
    const markdown = `-   First item
-   Second item with some {++added text++}
-   Third item`;

    // Create a mock DOM element for the editor
    const container = document.createElement('div');
    document.body.appendChild(container);

    let initError: Error | null = null;

    try {
      // This should reproduce the cyclic reference error if it exists
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, markdown);
        })
        .use(commonmark)
        .use(gfm)
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticMarkupPlugin as any)
        .create();

      // If we got here, no cyclic error occurred
      expect(editor).toBeDefined();

      // Clean up
      editor.destroy();
    } catch (error) {
      initError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    // Check for cyclic reference error
    if (initError) {
      console.error('Initialization error:', initError.message);
      expect(initError.message).not.toContain('cyclic');
      expect(initError.message).not.toContain('circular');
    }

    expect(initError).toBeNull();
  });

  it('should initialize with paragraph containing CriticMarkup', async () => {
    const markdown = 'This is a paragraph with {++added text++} and {--deleted text--}.';

    const container = document.createElement('div');
    document.body.appendChild(container);

    let initError: Error | null = null;

    try {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, markdown);
        })
        .use(commonmark)
        .use(gfm)
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticMarkupPlugin as any)
        .create();

      expect(editor).toBeDefined();
      editor.destroy();
    } catch (error) {
      initError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    if (initError) {
      console.error('Initialization error:', initError.message);
    }

    expect(initError).toBeNull();
  });

  it('should handle comment markup without cyclic error', async () => {
    const markdown = 'Text with {>>a standalone comment<<} here.';

    const container = document.createElement('div');
    document.body.appendChild(container);

    let initError: Error | null = null;

    try {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, markdown);
        })
        .use(commonmark)
        .use(gfm)
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticMarkupPlugin as any)
        .create();

      expect(editor).toBeDefined();
      editor.destroy();
    } catch (error) {
      initError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    if (initError) {
      console.error('Initialization error:', initError.message);
    }

    expect(initError).toBeNull();
  });

  it('should handle highlight with comment', async () => {
    const markdown = "Here's an example with {==highlighted text==}{>>This is a note<<}.";

    const container = document.createElement('div');
    document.body.appendChild(container);

    let initError: Error | null = null;

    try {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, markdown);
        })
        .use(commonmark)
        .use(gfm)
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticMarkupPlugin as any)
        .create();

      expect(editor).toBeDefined();
      editor.destroy();
    } catch (error) {
      initError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    if (initError) {
      console.error('Initialization error:', initError.message);
    }

    expect(initError).toBeNull();
  });

  it('should match browser config and serialize markdown without cyclic error', async () => {
    const markdown = `-   First item
-   Second item with some {++added text++}
-   Third item`;

    const container = document.createElement('div');
    document.body.appendChild(container);

    let testError: Error | null = null;
    let serializedMarkdown: string | null = null;

    try {
      // Match EXACT browser configuration
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, markdown);

          // Add listener like browser does
          ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
            console.log('[Test] Markdown updated:', md);
            serializedMarkdown = md;
          });
        })
        .config(nord) // Browser uses nord theme
        .use(commonmark)
        .use(gfm)
        .use(listener) // Browser uses listener
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticKeymap) // Browser uses keymap
        .use(criticMarkupPlugin as any)
        .create();

      expect(editor).toBeDefined();

      // Try to get the markdown back out - this is where cyclic errors might occur
      const view = editor.ctx.get(editorViewCtx);
      expect(view).toBeDefined();

      // Try JSON.stringify on the state - this will throw if there are cycles
      let stringifyError: Error | null = null;
      try {
        JSON.stringify(view.state);
      } catch (e) {
        stringifyError = e as Error;
      }

      if (stringifyError) {
        console.error('[Test] JSON.stringify error:', stringifyError.message);
        expect(stringifyError.message).not.toContain('cyclic');
        expect(stringifyError.message).not.toContain('circular');
      }

      // Clean up
      editor.destroy();
    } catch (error) {
      testError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    if (testError) {
      console.error('[Test] Error:', testError.message);
      console.error('[Test] Stack:', testError.stack);
      expect(testError.message).not.toContain('cyclic');
      expect(testError.message).not.toContain('circular');
    }

    expect(testError).toBeNull();
  });

  it('should handle adding new comment without cyclic error', async () => {
    const initialMarkdown = 'This is a test paragraph.';
    const updatedMarkdown = 'This is a test paragraph.\n{>>A new comment<<}';

    const container = document.createElement('div');
    document.body.appendChild(container);

    let testError: Error | null = null;

    try {
      let capturedMarkdown: string = '';

      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, initialMarkdown);

          ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
            capturedMarkdown = md;
          });
        })
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .use(criticMarkupRemarkPlugin)
        .use(criticAddition)
        .use(criticDeletion)
        .use(criticHighlight)
        .use(criticComment)
        .use(criticSubstitution)
        .use(criticKeymap)
        .use(criticMarkupPlugin as any)
        .create();

      // Simulate adding a comment by updating the content
      editor.action((ctx) => {
        ctx.set(defaultValueCtx, updatedMarkdown);
      });

      // Wait a bit for the update to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to serialize the state
      let stringifyError: Error | null = null;
      try {
        const view = editor.ctx.get(editorViewCtx);
        JSON.stringify(view.state);
      } catch (e) {
        stringifyError = e as Error;
      }

      if (stringifyError) {
        console.error('[Test] Stringify error after update:', stringifyError.message);
      }

      expect(stringifyError).toBeNull();

      editor.destroy();
    } catch (error) {
      testError = error as Error;
    } finally {
      document.body.removeChild(container);
    }

    if (testError) {
      console.error('[Test] Error:', testError.message);
    }

    expect(testError).toBeNull();
  });
});
