/**
 * Comment Editor
 *
 * Manages Milkdown editor integration for comment composition.
 * Supports basic markdown formatting: bold, italic, lists, code, etc.
 * Notably excludes CriticMarkup marks to avoid syntax conflicts.
 *
 * Uses Milkdown core with commonmark preset for formatting support.
 */

import { createModuleLogger } from '@utils/debug';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { nord } from '@milkdown/theme-nord';

const logger = createModuleLogger('CommentEditor');

export class CommentEditor {
  private editor: Editor | null = null;
  private container: HTMLElement | null = null;
  private content: string = '';
  private isInitialized = false;

  /**
   * Initialize Milkdown editor in the given container
   */
  async initialize(
    container: HTMLElement,
    initialContent: string = ''
  ): Promise<void> {
    this.container = container;
    this.content = initialContent;

    try {
      // Create editor using the Builder API
      this.editor = await Editor.make()
        .config((ctx: any) => {
          ctx.set(rootCtx, container);
          ctx.set(defaultValueCtx, initialContent);
        })
        .config(nord) // Apply Nord theme
        .use(commonmark) // Commonmark preset for markdown support
        .create();

      this.isInitialized = true;
      logger.info('CommentEditor initialized', {
        contentLength: initialContent.length,
      });
    } catch (error) {
      logger.error('Failed to initialize CommentEditor', error);
      throw error;
    }
  }

  /**
   * Get markdown content from editor
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Set markdown content in editor
   */
  setContent(content: string): void {
    this.content = content;

    if (!this.editor || !this.isInitialized) {
      return;
    }

    try {
      (this.editor as any).setMarkdown(content);
      logger.debug('Content set in editor', { length: content.length });
    } catch (error) {
      logger.warn('Failed to set content in editor', error);
    }
  }

  /**
   * Focus the editor
   */
  focus(): void {
    if (!this.editor || !this.isInitialized) {
      return;
    }

    try {
      (this.editor as any).focus();
      logger.debug('Editor focused');
    } catch (error) {
      logger.warn('Failed to focus editor', error);
    }
  }

  /**
   * Check if editor is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.editor !== null;
  }

  /**
   * Cleanup and destroy editor
   */
  destroy(): void {
    if (this.editor) {
      try {
        this.editor.destroy();
      } catch (error) {
        logger.warn('Error destroying editor', error);
      }
      this.editor = null;
    }

    if (this.container) {
      try {
        this.container.innerHTML = '';
      } catch (error) {
        logger.warn('Error clearing container', error);
      }
      this.container = null;
    }

    this.isInitialized = false;
    logger.info('CommentEditor destroyed');
  }
}
