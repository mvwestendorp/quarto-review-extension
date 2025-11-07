/**
 * Comment Composer
 *
 * Manages the comment composition UI for creating and editing comments.
 * Now uses Milkdown editor for rich text formatting support.
 * Supports markdown formatting: bold, italic, lists, code, etc.
 * Uses event-driven architecture for decoupled communication.
 *
 * Extracted from UIModule index.ts to reduce monolithic complexity.
 */

import { createModuleLogger } from '@utils/debug';
import {
  MODULE_EVENTS,
  ModuleEventEmitter,
  type CommentSubmittedDetail,
  //escapeHtml,
} from '../shared';
import { CommentEditor } from './CommentEditor';

const logger = createModuleLogger('CommentComposer');

export interface ComposerContext {
  sectionId: string;
  elementId: string;
  existingComment?: string;
  elementLabel?: string;
  commentId?: string; // ID of comment being edited
}

/**
 * CommentComposer manages comment creation and editing
 * Now extends event emitter for event-driven communication
 */
export class CommentComposer extends ModuleEventEmitter {
  private element: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private editor: CommentEditor | null = null;
  private isOpen = false;
  private currentContext: ComposerContext | null = null;
  private originalItem: HTMLElement | null = null;
  private onSubmitCallback:
    | ((content: string, context: ComposerContext) => void)
    | null = null;
  private onCancelCallback: (() => void) | null = null;

  /**
   * Create the composer element
   */
  create(): HTMLElement {
    const composer = document.createElement('div');
    composer.className = 'review-comment-composer';
    composer.setAttribute('role', 'dialog');
    composer.setAttribute('aria-label', 'Comment composer');

    // Header
    const header = document.createElement('div');
    header.className = 'review-comment-composer-header';

    const title = document.createElement('h3');
    title.textContent = 'Add Comment';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'review-comment-composer-close';
    closeBtn.setAttribute('aria-label', 'Close composer');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.cancel());
    header.appendChild(closeBtn);

    composer.appendChild(header);

    // Textarea
    const textareaContainer = document.createElement('div');
    textareaContainer.className = 'review-comment-composer-body';

    const textarea = document.createElement('textarea');
    textarea.className = 'review-comment-composer-textarea';
    textarea.placeholder = 'Enter your comment...';
    textarea.setAttribute('rows', '4');
    textarea.setAttribute('aria-label', 'Comment text');
    textareaContainer.appendChild(textarea);

    composer.appendChild(textareaContainer);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.className = 'review-comment-composer-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'review-comment-composer-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.cancel());
    footer.appendChild(cancelBtn);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'review-comment-composer-submit-btn';
    submitBtn.textContent = 'Post Comment';
    submitBtn.addEventListener('click', () => this.submit());
    footer.appendChild(submitBtn);

    composer.appendChild(footer);

    this.element = composer;
    return composer;
  }

  /**
   * Get the composer element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Open the composer for a specific context
   * Handles DOM insertion and state management as a floating modal
   * Now uses Milkdown editor for rich text support with overlay
   */
  async open(
    context: ComposerContext,
    sidebarBody: HTMLElement,
    onSubmit?: (content: string, ctx: ComposerContext) => void
  ): Promise<void> {
    logger.debug('Opening comment composer', {
      context,
      sidebarBodyExists: !!sidebarBody,
    });

    // Validate sidebar body exists
    if (!sidebarBody) {
      logger.error('Sidebar body is not available for comment composer');
      return;
    }

    // Clear previous composer if any
    this.close();

    if (!this.element) {
      this.create();
    }

    this.currentContext = context;

    if (onSubmit) {
      this.onSubmitCallback = onSubmit;
    }

    // Create overlay if it doesn't exist
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'review-comment-composer-overlay';
      document.body.appendChild(this.overlay);
      // Close when clicking outside the composer
      this.overlay.addEventListener('click', () => this.cancel());
    }

    // Find insertion point if editing existing comment
    let insertionAnchor: HTMLElement | null = null;
    if (context.existingComment && context.commentId) {
      // Use commentId for more reliable lookup
      insertionAnchor = sidebarBody.querySelector(
        `.review-comment-item[data-element-id="${context.elementId}"][data-comment-id="${context.commentId}"]`
      ) as HTMLElement | null;

      if (!insertionAnchor) {
        logger.debug('Comment item not found, trying alternative selector');
        insertionAnchor = sidebarBody.querySelector(
          `.review-comment-item[data-element-id="${context.elementId}"]`
        ) as HTMLElement | null;
      }
    }

    if (insertionAnchor) {
      insertionAnchor.classList.add('review-comment-item-hidden');
      this.originalItem = insertionAnchor;
      logger.debug('Hidden original comment item for editing');
    }

    const isEditing = Boolean(context.existingComment);

    // Ensure element exists and is valid
    if (!this.element) {
      logger.error('Failed to create composer element');
      return;
    }

    this.element.innerHTML = `
      <div class="review-comment-composer-header">
        <span>${isEditing ? 'Edit comment' : 'Add comment'}</span>
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="close">✕</button>
      </div>
      <div class="review-comment-composer-editor"></div>
      <div class="review-comment-composer-actions">
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
        <button class="review-btn review-btn-primary review-btn-sm" data-action="save">${isEditing ? 'Update' : 'Add'} comment</button>
      </div>
    `;

    // Insert composer as floating modal (always to body, not sidebar)
    if (
      !this.element.parentElement ||
      this.element.parentElement === sidebarBody
    ) {
      document.body.appendChild(this.element);
      logger.debug('Appended composer to body as floating modal');
    }

    // Remove empty state if present
    const emptyState = sidebarBody.querySelector('.review-comments-empty');
    if (emptyState) {
      emptyState.remove();
      logger.debug('Removed empty state');
    }

    // Initialize Milkdown editor
    const editorContainer = this.element.querySelector(
      '.review-comment-composer-editor'
    ) as HTMLElement | null;

    if (editorContainer) {
      try {
        logger.debug('Initializing Milkdown editor');
        this.editor = new CommentEditor();
        await this.editor.initialize(
          editorContainer,
          context.existingComment || ''
        );
        this.editor.focus();
        logger.debug('Milkdown editor initialized and focused');
      } catch (error) {
        logger.error('Failed to initialize comment editor', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'review-comment-composer-error';
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '10px';
        errorDiv.textContent = 'Failed to initialize editor. Please try again.';
        editorContainer.appendChild(errorDiv);
      }
    } else {
      logger.error('Editor container not found in DOM');
    }

    // Set up event handlers - use proper error handling
    const closeBtn = this.element.querySelector('[data-action="close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        logger.debug('Close button clicked');
        this.cancel();
      });
    } else {
      logger.warn('Close button not found');
    }

    const cancelBtn = this.element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        logger.debug('Cancel button clicked');
        this.cancel();
      });
    } else {
      logger.warn('Cancel button not found');
    }

    const saveBtn = this.element.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        logger.debug('Save button clicked');
        this.submit();
      });
    } else {
      logger.warn('Save button not found');
    }

    // Update state - add active class for modal display
    this.isOpen = true;
    this.element.classList.add('review-active');
    this.element.setAttribute('aria-hidden', 'false');

    // Activate overlay
    if (this.overlay) {
      this.overlay.classList.add('review-active');
    }

    // Emit event
    this.emit(MODULE_EVENTS.COMMENT_COMPOSER_OPENED, {
      elementId: context.elementId,
      existingComment: context.existingComment
        ? { content: context.existingComment }
        : undefined,
    } as any);

    logger.info('Comment composer opened successfully', {
      isEditing,
      contextElementId: context.elementId,
    });
  }

  /**
   * Close the composer
   */
  close(): void {
    if (this.element) {
      this.element.classList.remove('review-active');
      this.element.setAttribute('aria-hidden', 'true');
    }

    // Deactivate overlay
    if (this.overlay) {
      this.overlay.classList.remove('review-active');
    }

    // Restore original item visibility if hiding
    if (this.originalItem) {
      this.originalItem.classList.remove('review-comment-item-hidden');
      this.originalItem = null;
    }

    // Destroy editor
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    this.isOpen = false;
    this.clearForm();
  }

  /**
   * Check if composer is open
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get the current comment content
   */
  getContent(): string {
    if (this.editor) {
      return this.editor.getContent().trim();
    }
    return '';
  }

  /**
   * Submit the comment
   */
  private submit(): void {
    logger.debug('Submit called for comment composer');
    const content = this.getContent();
    logger.debug('Retrieved content from editor', {
      contentLength: content.length,
    });

    if (!content) {
      logger.warn('Empty comment submitted - ignoring');
      return;
    }

    if (!this.currentContext) {
      logger.error('No context for comment submission - cannot proceed');
      return;
    }

    // Emit event for UIModule to handle submission
    const isEdit = Boolean(this.currentContext.existingComment);
    logger.info('Emitting COMMENT_SUBMITTED event', {
      elementId: this.currentContext.elementId,
      contentLength: content.length,
      isEdit,
      commentId: this.currentContext.commentId,
    });

    this.emit(MODULE_EVENTS.COMMENT_SUBMITTED, {
      elementId: this.currentContext.elementId,
      content,
      isEdit,
      commentId: this.currentContext.commentId,
    } as CommentSubmittedDetail);

    // Also call callback if provided
    if (this.onSubmitCallback) {
      logger.debug('Calling submit callback');
      this.onSubmitCallback(content, this.currentContext);
    }

    this.close();
    logger.info('Comment submitted and composer closed');
  }

  /**
   * Cancel the composer
   */
  private cancel(): void {
    if (this.currentContext) {
      // Emit cancel event
      this.emit(MODULE_EVENTS.COMMENT_CANCELLED, {
        elementId: this.currentContext.elementId,
      });
    }

    this.close();
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    logger.debug('Comment composer cancelled');
  }

  /**
   * Clear the form
   */
  private clearForm(): void {
    if (this.editor) {
      this.editor.setContent('');
    }
    this.currentContext = null;
  }

  /**
   * Register submit handler
   */
  onSubmit(
    callback: (content: string, context: ComposerContext) => void
  ): void {
    this.onSubmitCallback = callback;
  }

  /**
   * Register cancel handler
   */
  onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  /**
   * Destroy the composer
   */
  destroy(): void {
    this.close();
    if (this.element) {
      this.element.remove();
    }
    if (this.overlay) {
      this.overlay.remove();
    }
    if (this.editor) {
      this.editor.destroy();
    }
    this.element = null;
    this.overlay = null;
    this.editor = null;
    this.currentContext = null;
    this.originalItem = null;
    this.onSubmitCallback = null;
    this.onCancelCallback = null;
    this.clearListeners();
  }
}
