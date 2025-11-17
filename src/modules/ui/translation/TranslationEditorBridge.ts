/**
 * TranslationEditorBridge
 * Adapts EditorLifecycle for segment-level and sentence-level translation editing with Milkdown
 * Manages segment/sentence ↔ Milkdown content conversion
 *
 * Phase 2: Now supports segment-based editing (preferred) alongside legacy sentence editing
 */

import {
  EditorLifecycle,
  type InitializeOptions,
} from '../editor/EditorLifecycle';
import { TranslationChangesModule } from '@modules/translation/TranslationChangesModule';
import { createModuleLogger } from '@utils/debug';
import type { Sentence } from '@modules/translation/types';
import type { DiffHighlightRange } from '../editor/MilkdownEditor';

const logger = createModuleLogger('TranslationEditorBridge');

export interface SentenceEditorConfig {
  showDiffHighlights?: boolean;
  simpleToolbar?: boolean;
}

/**
 * Bridge between segment/sentence editing and Milkdown editor
 */
export class TranslationEditorBridge extends EditorLifecycle {
  private changesModule: TranslationChangesModule;

  // Segment-level editing state (preferred)
  private currentElementId: string | null = null;
  private currentSegmentContent: string | null = null;

  // Legacy sentence-level editing state (deprecated)
  private currentSentenceId: string | null = null;
  private currentLanguage: 'source' | 'target' | null = null;

  private editorConfig: SentenceEditorConfig = {
    showDiffHighlights: false,
    simpleToolbar: true,
  };

  constructor(
    changesModule: TranslationChangesModule,
    config?: SentenceEditorConfig
  ) {
    super();
    this.changesModule = changesModule;
    if (config) {
      this.editorConfig = { ...this.editorConfig, ...config };
    }
    logger.info('TranslationEditorBridge initialized');
  }

  /**
   * Initialize editor for an entire segment (element)
   * This is the preferred method for segment-based editing
   */
  async initializeSegmentEditor(
    container: HTMLElement,
    elementId: string,
    content: string,
    side: 'source' | 'target'
  ): Promise<void> {
    this.currentElementId = elementId;
    this.currentSegmentContent = content;
    this.currentLanguage = side;

    // Clear any sentence-level state
    this.currentSentenceId = null;

    const options: InitializeOptions = {
      container,
      content,
      diffHighlights: this.editorConfig.showDiffHighlights ? [] : undefined,
      elementType: 'Para', // Segments are typically rendered as paragraphs
      onContentChange: (markdown: string) => {
        // Track changes as user types
        this.onEditorContentChange(markdown);
      },
    };

    try {
      await this.initialize(options);
      logger.info('Segment editor initialized', {
        elementId,
        side,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error('Failed to initialize segment editor', error);
      throw error;
    }
  }

  /**
   * Initialize editor for a specific sentence
   * @deprecated Use initializeSegmentEditor instead - sentences are internal only
   */
  async initializeSentenceEditor(
    container: HTMLElement,
    sentence: Sentence,
    language: 'source' | 'target'
  ): Promise<void> {
    this.currentSentenceId = sentence.id;
    this.currentLanguage = language;

    // Clear any segment-level state
    this.currentElementId = null;
    this.currentSegmentContent = null;

    const options: InitializeOptions = {
      container,
      content: sentence.content,
      diffHighlights: this.editorConfig.showDiffHighlights ? [] : undefined,
      elementType: 'Para', // Sentences are rendered as paragraphs
      onContentChange: (markdown: string) => {
        // Track changes as user types
        this.onEditorContentChange(markdown);
      },
    };

    try {
      await this.initialize(options);
      logger.info('Sentence editor initialized', {
        sentenceId: sentence.id,
        language,
        contentLength: sentence.content.length,
      });
    } catch (error) {
      logger.error('Failed to initialize sentence editor', error);
      throw error;
    }
  }

  /**
   * Save edited segment
   * Returns true if content changed and was saved
   */
  public saveSegmentEdit(
    elementId: string,
    newContent: string,
    side: 'source' | 'target'
  ): boolean {
    if (!this.currentElementId || this.currentElementId !== elementId) {
      logger.warn('No matching segment editor active for save', {
        currentElementId: this.currentElementId,
        requestedElementId: elementId,
      });
      return false;
    }

    const editor = this.getEditor();
    const module = this.getModule();

    if (!editor || !module) {
      logger.error('Editor not initialized');
      return false;
    }

    // Check if content actually changed
    if (this.currentSegmentContent === newContent) {
      logger.debug('No content change detected');
      return false;
    }

    // Note: We don't record the operation here - that's handled by the controller
    // This method just validates the edit and returns success
    // The controller will call ChangesModule.edit() directly (extension pattern)

    logger.info('Segment edit validated', {
      elementId,
      side,
      contentLength: newContent.length,
    });

    return true;
  }

  /**
   * Save edited sentence
   * @deprecated Use saveSegmentEdit instead - sentences are internal only
   */
  public saveSentenceEdit(): boolean {
    if (!this.currentSentenceId || !this.currentLanguage) {
      logger.warn('No sentence editor active for save');
      return false;
    }

    const editor = this.getEditor();
    const module = this.getModule();

    if (!editor || !module) {
      logger.error('Editor not initialized');
      return false;
    }

    // Get markdown content from editor
    const newContent = module.getContent() || '';

    // Check if content actually changed
    const sentence = this.changesModule.getSentence(this.currentSentenceId);
    if (!sentence) {
      logger.warn('Sentence not found for save', {
        sentenceId: this.currentSentenceId,
      });
      return false;
    }

    if (sentence.content === newContent) {
      logger.debug('No content change detected');
      return false;
    }

    // Record operation in changes module
    this.changesModule.editSentence(
      this.currentSentenceId,
      newContent,
      this.currentLanguage
    );

    logger.info('Sentence edit saved', {
      sentenceId: this.currentSentenceId,
      language: this.currentLanguage,
    });

    return true;
  }

  /**
   * Cancel editing without saving
   */
  public cancelEdit(): void {
    logger.debug('Edit cancelled', {
      sentenceId: this.currentSentenceId,
    });
    this.currentSentenceId = null;
    this.currentLanguage = null;
    this.destroy();
  }

  /**
   * Get current edited sentence ID
   */
  public getCurrentSentenceId(): string | null {
    return this.currentSentenceId;
  }

  /**
   * Get current edited sentence language
   */
  public getCurrentLanguage(): 'source' | 'target' | null {
    return this.currentLanguage;
  }

  /**
   * Handle content changes during editing
   */
  private onEditorContentChange(markdown: string): void {
    logger.trace('Editor content changed', {
      sentenceId: this.currentSentenceId,
      length: markdown.length,
    });
  }

  /**
   * Check if editor has unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    if (!this.currentSentenceId) {
      return false;
    }

    const editor = this.getEditor();
    const module = this.getModule();

    if (!editor || !module) {
      return false;
    }

    const sentence = this.changesModule.getSentence(this.currentSentenceId);
    if (!sentence) {
      return false;
    }

    return module.getContent() !== sentence.content;
  }

  /**
   * Compute diff highlights between original and new content
   * This enables visual feedback showing what changed during editing
   */
  public computeDiffHighlights(
    originalContent: string,
    newContent: string
  ): DiffHighlightRange[] {
    const highlights: DiffHighlightRange[] = [];

    // Simple character-level diff computation
    // For more sophisticated diff, we could use a library like diff-match-patch
    // But for now, we'll use a simple approach

    // If content is identical, no highlights
    if (originalContent === newContent) {
      return highlights;
    }

    // Find common prefix and suffix
    let prefixLen = 0;
    const minLen = Math.min(originalContent.length, newContent.length);

    while (
      prefixLen < minLen &&
      originalContent[prefixLen] === newContent[prefixLen]
    ) {
      prefixLen++;
    }

    let suffixLen = 0;
    while (
      suffixLen < minLen - prefixLen &&
      originalContent[originalContent.length - 1 - suffixLen] ===
        newContent[newContent.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    // Determine what changed
    const oldMiddle = originalContent.substring(
      prefixLen,
      originalContent.length - suffixLen
    );
    const newMiddle = newContent.substring(
      prefixLen,
      newContent.length - suffixLen
    );

    if (oldMiddle.length > 0 && newMiddle.length === 0) {
      // Deletion
      highlights.push({
        start: prefixLen,
        end: prefixLen + oldMiddle.length,
        type: 'deletion',
      });
    } else if (oldMiddle.length === 0 && newMiddle.length > 0) {
      // Addition
      highlights.push({
        start: prefixLen,
        end: prefixLen + newMiddle.length,
        type: 'addition',
      });
    } else if (oldMiddle.length > 0 && newMiddle.length > 0) {
      // Modification
      highlights.push({
        start: prefixLen,
        end: prefixLen + newMiddle.length,
        type: 'modification',
      });
    }

    return highlights;
  }

  /**
   * Override destroy to clean up editor context (segment or sentence)
   */
  override destroy(): void {
    if (this.currentElementId) {
      logger.debug('Destroying segment editor', {
        elementId: this.currentElementId,
      });
    } else if (this.currentSentenceId) {
      logger.debug('Destroying sentence editor', {
        sentenceId: this.currentSentenceId,
      });
    }

    // Clear all state
    this.currentElementId = null;
    this.currentSegmentContent = null;
    this.currentSentenceId = null;
    this.currentLanguage = null;

    super.destroy();
  }
}
