import type { Editor } from '@milkdown/kit/core';

import { MODULE_EVENTS } from '../shared';
import type { DiffHighlightRange } from './MilkdownEditor';
import { MilkdownEditor } from './MilkdownEditor';

interface InitializeOptions {
  container: HTMLElement;
  content: string;
  diffHighlights?: DiffHighlightRange[];
  elementType: string;
  onContentChange?: (markdown: string) => void;
}

/**
 * Coordinates creation and teardown of Milkdown editor instances.
 * Ensures we never leak listeners or reuse corrupted plugin state between sessions.
 */
export class EditorLifecycle {
  private readonly createModule: () => MilkdownEditor;
  private module: MilkdownEditor | null = null;
  private editor: Editor | null = null;

  constructor(factory: () => MilkdownEditor = () => new MilkdownEditor()) {
    this.createModule = factory;
  }

  /**
   * Initialize a new Milkdown editor session. Previous sessions are torn down first.
   */
  async initialize(options: InitializeOptions): Promise<Editor> {
    this.destroy();

    const module = this.createModule();
    this.module = module;

    if (options.onContentChange) {
      module.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: { markdown: string }) => {
        options.onContentChange?.(detail.markdown);
      });
    }

    await module.initialize(
      options.container,
      options.content,
      options.diffHighlights ?? [],
      options.elementType
    );

    this.editor = module.getInstance();
    if (!this.editor) {
      throw new Error('Milkdown editor failed to provide instance after initialization');
    }

    return this.editor;
  }

  /**
   * Get the current Milkdown Editor instance (if any).
   */
  getEditor(): Editor | null {
    return this.editor;
  }

  /**
   * Destroy any active Milkdown editor instance and clear references.
   */
  destroy(): void {
    if (this.module) {
      this.module.destroy();
      this.module = null;
    }
    this.editor = null;
  }
}
