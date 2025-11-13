import { describe, it, expect, vi } from 'vitest';
import { CommentEditor } from '@/modules/ui/comments/CommentEditor';
import { editorViewCtx } from '@milkdown/kit/core';

describe('CommentEditor focus behavior', () => {
  it('focuses the underlying Milkdown view via action()', () => {
    const editor = new CommentEditor() as any;
    const focusSpy = vi.fn();
    const getSpy = vi.fn((token: unknown) => {
      if (token === editorViewCtx) {
        return { focus: focusSpy };
      }
      throw new Error('Unknown token');
    });

    editor.editor = {
      action: (callback: (ctx: { get: typeof getSpy }) => void) =>
        callback({ get: getSpy }),
    };
    editor.isInitialized = true;

    editor.focus();

    expect(getSpy).toHaveBeenCalledWith(editorViewCtx);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});
