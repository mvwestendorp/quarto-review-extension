/**
 * Milkdown Editor Manager
 *
 * Encapsulates all Milkdown editor initialization, setup, and lifecycle management.
 * Handles both modal and inline editor modes with proper configuration and plugin setup.
 * Uses event-driven architecture for decoupled communication.
 *
 * Extracted from UIModule index.ts to reduce monolithic complexity.
 */

import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/ctx';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history, historyProviderConfig } from '@milkdown/kit/plugin/history';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';

import { createModuleLogger } from '@utils/debug';
import { createDiv } from '@utils/dom-helpers';
import {
  MODULE_EVENTS,
  ModuleEventEmitter,
  normalizeListMarkers,
  formatMarkdownWithPrettier,
  normalizeBlockquoteParagraphs,
} from '../shared';
import { $prose } from '@milkdown/utils';
import { EditorToolbar } from './EditorToolbar';

const logger = createModuleLogger('MilkdownEditor');

/**
 * Diff highlight range for tracked changes visualization
 */
export interface DiffHighlightRange {
  start: number;
  end: number;
  type: 'addition' | 'deletion' | 'modification';
}

/**
 * MilkdownEditor manages editor initialization and lifecycle
 * Now extends event emitter for event-driven communication
 */
export class MilkdownEditor extends ModuleEventEmitter {
  private instance: Editor | null = null;
  private toolbar: EditorToolbar | null = null;
  private currentContent: string = '';
  private contentUpdateCallback: ((content: string) => void) | null = null;

  /**
   * Set callback for content updates
   */
  setContentUpdateCallback(callback: (content: string) => void): void {
    this.contentUpdateCallback = callback;
  }

  /**
   * Get the current Milkdown instance
   */
  getInstance(): Editor | null {
    return this.instance;
  }

  /**
   * Get the toolbar instance
   */
  getToolbar(): EditorToolbar | null {
    return this.toolbar;
  }

  /**
   * Get current editor content from the editor instance
   * Falls back to cached content if editor is not available
   *
   * Note: This is a synchronous method that returns cached content.
   * For formatted content, use getFormattedContent() instead.
   */
  getContent(): string {
    // Try to get content directly from editor if available
    if (this.instance) {
      try {
        // Milkdown editor has a getMarkdown() method that returns current markdown
        const markdown = (this.instance as any).getMarkdown?.();
        if (typeof markdown === 'string' && markdown.length > 0) {
          // Normalize blockquote paragraphs to fix Milkdown serialization issues
          return normalizeBlockquoteParagraphs(markdown);
        }
        // If getMarkdown returned empty, try falling back to cached
        if (typeof markdown === 'string') {
          logger.debug('Editor returned empty markdown, using cached content', {
            cachedLength: this.currentContent.length,
          });
          return this.currentContent;
        }
      } catch (error) {
        logger.debug(
          'Failed to get markdown from editor, using cached content',
          {
            error,
          }
        );
      }
    }
    // Fallback to cached content if no editor instance
    return this.currentContent;
  }

  /**
   * Get current editor content and format it with Prettier
   *
   * This fixes Milkdown's markdown serialization issues including:
   * - Missing line breaks between list items (Issue #343)
   * - Inconsistent indentation
   * - Whitespace normalization
   *
   * @returns Formatted markdown content
   */
  async getFormattedContent(): Promise<string> {
    const rawContent = this.getContent();
    return formatMarkdownWithPrettier(rawContent);
  }

  /**
   * Initialize Milkdown editor in a container
   * @param container - The HTML container element for the editor
   * @param content - Initial markdown content
   * @param diffHighlights - Optional diff highlights for tracked changes
   * @param elementType - The type of element being edited (header, paragraph, etc.)
   */
  async initialize(
    container: HTMLElement,
    content: string,
    diffHighlights: DiffHighlightRange[] = [],
    elementType: string = 'default'
  ): Promise<void> {
    // Find the editor body - works for both modal and inline
    const editorContainer =
      (container.querySelector('.review-editor-body') as HTMLElement | null) ||
      (container.querySelector(
        '.review-inline-editor-body'
      ) as HTMLElement | null);
    if (!editorContainer) {
      throw new Error('Editor container not found');
    }

    const { mount, toolbarElement } = this.prepareLayout(editorContainer);

    try {
      // Initialize current content with normalizations
      let initialContent = normalizeListMarkers(content);
      initialContent = normalizeBlockquoteParagraphs(initialContent);
      this.currentContent = initialContent;

      const editorBuilder = Editor.make()
        .config((ctx: Ctx) => {
          ctx.set(rootCtx, mount);
          ctx.set(defaultValueCtx, initialContent);
          // Configure history plugin with a reasonable depth
          ctx.set(historyProviderConfig.key, {
            depth: 100,
            newGroupDelay: 500,
          });

          const listenerManager = ctx.get(listenerCtx);
          // Listen for markdown changes
          listenerManager
            .markdownUpdated((_ctx: Ctx, markdown: string) => {
              let normalized = normalizeListMarkers(markdown);
              normalized = normalizeBlockquoteParagraphs(normalized);
              this.currentContent = normalized;
              if (this.contentUpdateCallback) {
                this.contentUpdateCallback(normalized);
              }
              // Emit event for content change
              this.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, {
                markdown: normalized,
              });
              logger.trace('Markdown updated:', normalized);
            })
            .selectionUpdated(() => {
              if (this.toolbar) {
                this.toolbar.updateState();
              }
              // Emit event for selection change
              this.emit(MODULE_EVENTS.EDITOR_SELECTION_CHANGED, {
                from: 0,
                to: 0,
              });
            })
            .focus(() => {
              if (this.toolbar) {
                this.toolbar.updateState();
              }
              // Emit event for focus
              this.emit(MODULE_EVENTS.EDITOR_FOCUSED, {});
            })
            .blur(() => {
              if (this.toolbar) {
                this.toolbar.updateState();
              }
              // Emit event for blur
              this.emit(MODULE_EVENTS.EDITOR_BLURRED, {});
            });
        })
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .use(history);

      if (diffHighlights.length > 0) {
        editorBuilder.use(this.createTrackedHighlightPlugin(diffHighlights));
      }

      // Create Milkdown editor
      this.instance = await editorBuilder.create();

      // Initialize toolbar AFTER editor is created (so editorViewCtx exists)
      this.toolbar = new EditorToolbar();
      this.toolbar.setEditor(this.instance);
      this.toolbar.setElementType(elementType);
      const toolbarInstance = this.toolbar.create();
      toolbarElement.appendChild(toolbarInstance);
      this.toolbar.attachHandlers();
      this.toolbar.updateState();

      // Emit event for editor ready
      this.emit(MODULE_EVENTS.EDITOR_READY, {
        editor: this.instance,
      } as any);

      logger.debug('Milkdown editor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Milkdown:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      editorContainer.innerHTML = `
        <div style="padding:20px; color:red;">
          Failed to initialize editor. Please try again.
          <pre>${errorMessage}</pre>
        </div>
      `;
      throw error;
    }
  }

  /**
   * Prepare editor layout with toolbar and mount point
   */
  private prepareLayout(container: HTMLElement): {
    mount: HTMLElement;
    toolbarElement: HTMLElement;
  } {
    let layout = container.querySelector(
      '.review-editor-layout'
    ) as HTMLElement | null;
    let mount = layout?.querySelector(
      '.review-editor-surface'
    ) as HTMLElement | null;
    let toolbarElement = layout?.querySelector(
      '.review-editor-toolbar-container'
    ) as HTMLElement | null;

    if (!layout || !mount || !toolbarElement) {
      container.innerHTML = '';

      layout = createDiv('review-editor-layout');

      const contentWrapper = createDiv('review-editor-content');

      mount = createDiv('review-editor-surface');
      contentWrapper.appendChild(mount);

      toolbarElement = createDiv('review-editor-toolbar-container');
      contentWrapper.appendChild(toolbarElement);

      layout.appendChild(contentWrapper);
      container.appendChild(layout);
    }

    if (!mount || !toolbarElement) {
      throw new Error('Failed to prepare editor layout');
    }

    return { mount, toolbarElement };
  }

  /**
   * Create tracked highlight plugin for diff visualization
   */
  private createTrackedHighlightPlugin(ranges: DiffHighlightRange[]) {
    const trackedHighlightPluginKey = new PluginKey('reviewTrackedHighlight');

    // Wrap the plugin with $prose to create a proper MilkdownPlugin descriptor
    return $prose(() => {
      return new Plugin({
        key: trackedHighlightPluginKey,
        state: {
          init: (_config: any, { doc }: any): DecorationSet => {
            if (ranges.length === 0) {
              return DecorationSet.empty;
            }
            return DecorationSet.create(
              doc,
              this.buildTrackedHighlightDecorations(doc, ranges)
            );
          },
          apply(tr: any, old: DecorationSet): DecorationSet {
            if (ranges.length === 0 || old === DecorationSet.empty) {
              return old;
            }
            if (!tr.docChanged) {
              return old;
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state: any): DecorationSet | null {
            const decorations = trackedHighlightPluginKey.getState(state) as
              | DecorationSet
              | undefined;
            return decorations ?? null;
          },
        },
      });
    });
  }

  /**
   * Build decorations for tracked changes
   */
  private buildTrackedHighlightDecorations(
    doc: ProseNode,
    ranges: DiffHighlightRange[]
  ): Decoration[] {
    if (ranges.length === 0) {
      return [];
    }

    const decorations: Decoration[] = [];

    ranges.forEach((range) => {
      if (range.end <= range.start) {
        return;
      }

      const from = this.offsetToDocPosition(doc, range.start);
      const to = this.offsetToDocPosition(doc, range.end);

      if (from === -1 || to === -1) {
        return;
      }

      const className =
        range.type === 'addition'
          ? 'review-tracked-addition'
          : range.type === 'deletion'
            ? 'review-tracked-deletion'
            : 'review-tracked-modification';

      decorations.push(Decoration.inline(from, to, { class: className }));
    });

    return decorations;
  }

  /**
   * Convert character offset to ProseMirror document position
   */
  private offsetToDocPosition(doc: ProseNode, offset: number): number {
    let currentOffset = 0;
    let foundPos = -1;

    doc.descendants((node: any, pos: number) => {
      if (foundPos !== -1) return false; // Stop iteration

      if (node.isText) {
        const nodeLength = node.text.length;
        if (currentOffset + nodeLength >= offset) {
          foundPos = pos + (offset - currentOffset);
          return false;
        }
        currentOffset += nodeLength;
      } else if (node.isBlock && node !== doc) {
        currentOffset += 2; // Account for block boundaries
      }

      return true;
    });

    return foundPos !== -1 ? foundPos : -1;
  }

  /**
   * Destroy the editor and clean up
   */
  destroy(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
    if (this.toolbar) {
      this.toolbar.destroy();
      this.toolbar = null;
    }
    this.currentContent = '';
    this.contentUpdateCallback = null;
    this.clearListeners();
  }
}
