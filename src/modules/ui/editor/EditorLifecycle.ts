import type { Editor } from '@milkdown/kit/core';

import { MODULE_EVENTS } from '../shared';
import type { DiffHighlightRange } from './MilkdownEditor';
import { MilkdownEditor } from './MilkdownEditor';

export interface InitializeOptions {
  container: HTMLElement;
  content: string;
  diffHighlights?: DiffHighlightRange[];
  elementType: string;
  onContentChange?: (markdown: string) => void;
}

export type LifecycleHook = (
  options: InitializeOptions
) => void | Promise<void>;
export type LifecycleCallback = (editor: Editor) => void | Promise<void>;

/**
 * Coordinates creation and teardown of Milkdown editor instances.
 * Ensures we never leak listeners or reuse corrupted plugin state between sessions.
 * Extensible via lifecycle hooks for subclasses and extensions.
 */
export class EditorLifecycle {
  private readonly createModule: () => MilkdownEditor;
  private module: MilkdownEditor | null = null;
  private editor: Editor | null = null;
  protected beforeInitializeHooks: LifecycleHook[] = [];
  protected afterInitializeHooks: LifecycleCallback[] = [];
  protected beforeDestroyHooks: LifecycleCallback[] = [];

  constructor(factory: () => MilkdownEditor = () => new MilkdownEditor()) {
    this.createModule = factory;
  }

  /**
   * Register a hook to run before editor initialization
   */
  onBeforeInitialize(hook: LifecycleHook): void {
    this.beforeInitializeHooks.push(hook);
  }

  /**
   * Register a hook to run after editor initialization completes
   */
  onAfterInitialize(hook: LifecycleCallback): void {
    this.afterInitializeHooks.push(hook);
  }

  /**
   * Register a hook to run before editor destruction
   */
  onBeforeDestroy(hook: LifecycleCallback): void {
    this.beforeDestroyHooks.push(hook);
  }

  /**
   * Initialize a new Milkdown editor session. Previous sessions are torn down first.
   */
  async initialize(options: InitializeOptions): Promise<Editor> {
    this.destroy();

    // Run before-initialize hooks
    for (const hook of this.beforeInitializeHooks) {
      await hook(options);
    }

    const module = this.createModule();
    this.module = module;

    if (options.onContentChange) {
      module.on(
        MODULE_EVENTS.EDITOR_CONTENT_CHANGED,
        (detail: { markdown: string }) => {
          options.onContentChange?.(detail.markdown);
        }
      );
    }

    await module.initialize(
      options.container,
      options.content,
      options.diffHighlights ?? [],
      options.elementType
    );

    this.editor = module.getInstance();
    if (!this.editor) {
      throw new Error(
        'Milkdown editor failed to provide instance after initialization'
      );
    }

    // Run after-initialize hooks
    for (const hook of this.afterInitializeHooks) {
      await hook(this.editor);
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
   * Get the current MilkdownEditor module (if any).
   */
  getModule(): MilkdownEditor | null {
    return this.module;
  }

  /**
   * Destroy any active Milkdown editor instance and clear references.
   */
  destroy(): void {
    if (this.editor) {
      // Run before-destroy hooks
      for (const hook of this.beforeDestroyHooks) {
        hook(this.editor);
      }
    }

    if (this.module) {
      this.module.destroy();
      this.module = null;
    }
    this.editor = null;
  }
}
