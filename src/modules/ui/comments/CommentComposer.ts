/**
 * Comment Composer
 *
 * Manages the comment composition UI for creating and editing comments.
 * Provides a text editor interface with submission handling.
 * Uses event-driven architecture for decoupled communication.
 *
 * Extracted from UIModule index.ts to reduce monolithic complexity.
 */

import { createModuleLogger } from '@utils/debug';
import { MODULE_EVENTS, ModuleEventEmitter, type CommentSubmittedDetail, escapeHtml } from '../shared';

const logger = createModuleLogger('CommentComposer');

export interface ComposerContext {
  sectionId: string;
  elementId: string;
  existingComment?: string;
  elementLabel?: string;
}

/**
 * CommentComposer manages comment creation and editing
 * Now extends event emitter for event-driven communication
 */
export class CommentComposer extends ModuleEventEmitter {
  private element: HTMLElement | null = null;
  private isOpen = false;
  private currentContext: ComposerContext | null = null;
  private insertionAnchor: HTMLElement | null = null;
  private originalItem: HTMLElement | null = null;
  private onSubmitCallback: ((content: string, context: ComposerContext) => void) | null = null;
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
   * Handles DOM insertion and state management
   */
  open(
    context: ComposerContext,
    sidebarBody: HTMLElement,
    onSubmit?: (content: string, ctx: ComposerContext) => void
  ): void {
    // Clear previous composer if any
    this.close();

    if (!this.element) {
      this.create();
    }

    this.currentContext = context;

    if (onSubmit) {
      this.onSubmitCallback = onSubmit;
    }

    // Find insertion point if editing existing comment
    let insertionAnchor: HTMLElement | null = null;
    if (context.existingComment) {
      insertionAnchor = sidebarBody.querySelector(
        `.review-comment-item[data-element-id="${context.elementId}"][data-comment-key="${context.elementId}:${context.existingComment}"]`
      ) as HTMLElement | null;
    }

    this.insertionAnchor = insertionAnchor;
    if (insertionAnchor) {
      insertionAnchor.classList.add('review-comment-item-hidden');
      this.originalItem = insertionAnchor;
    }

    // Update HTML based on context
    const isEditing = Boolean(context.existingComment);
    const elementLabel = context.elementLabel || 'Document section';

    this.element!.innerHTML = `
      <div class="review-comment-composer-header">
        <span>${isEditing ? 'Edit comment' : 'Add comment'}</span>
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="close">✕</button>
      </div>
      <p class="review-comment-composer-context">${escapeHtml(elementLabel)}</p>
      <textarea class="review-comment-composer-input" rows="4" placeholder="Enter your comment..."></textarea>
      <div class="review-comment-composer-actions">
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
        <button class="review-btn review-btn-primary review-btn-sm" data-action="save">${isEditing ? 'Update' : 'Add'} comment</button>
      </div>
    `;

    // Insert into DOM
    if (this.insertionAnchor) {
      this.insertionAnchor.insertAdjacentElement('beforebegin', this.element!);
    } else {
      sidebarBody.prepend(this.element!);
    }

    // Remove empty state if present
    const emptyState = sidebarBody.querySelector('.review-comments-empty');
    emptyState?.remove();

    // Scroll to composer
    sidebarBody.scrollTop = 0;

    // Set up event handlers
    this.element!.querySelector('[data-action="close"]')?.addEventListener('click', () => this.cancel());
    this.element!.querySelector('[data-action="cancel"]')?.addEventListener('click', () => this.cancel());
    this.element!.querySelector('[data-action="save"]')?.addEventListener('click', () => this.submit());

    // Focus and populate textarea
    const textarea = this.element!.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      if (context.existingComment) {
        textarea.value = context.existingComment;
        textarea.select();
      }
      textarea.focus();
    }

    // Update state
    this.isOpen = true;
    this.element!.style.display = 'block';
    this.element!.setAttribute('aria-hidden', 'false');

    // Emit event
    this.emit(MODULE_EVENTS.COMMENT_COMPOSER_OPENED, {
      elementId: context.elementId,
      existingComment: context.existingComment ? { content: context.existingComment } : undefined,
    } as any);

    logger.debug('Comment composer opened', { context });
  }

  /**
   * Close the composer
   */
  close(): void {
    if (this.element) {
      this.element.style.display = 'none';
      this.element.setAttribute('aria-hidden', 'true');
    }

    // Restore original item visibility if hiding
    if (this.originalItem) {
      this.originalItem.classList.remove('review-comment-item-hidden');
      this.originalItem = null;
    }

    this.insertionAnchor = null;
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
    if (!this.element) return '';
    const textarea = this.element.querySelector('textarea') as HTMLTextAreaElement;
    return textarea ? textarea.value.trim() : '';
  }

  /**
   * Submit the comment
   */
  private submit(): void {
    const content = this.getContent();

    if (!content) {
      logger.warn('Empty comment submitted');
      return;
    }

    if (!this.currentContext) {
      logger.error('No context for comment submission');
      return;
    }

    // Emit event for UIModule to handle submission
    const isEdit = Boolean(this.currentContext.existingComment);
    this.emit(MODULE_EVENTS.COMMENT_SUBMITTED, {
      elementId: this.currentContext.elementId,
      content,
      isEdit,
    } as CommentSubmittedDetail);

    // Also call callback if provided
    if (this.onSubmitCallback) {
      this.onSubmitCallback(content, this.currentContext);
    }

    this.close();
    logger.debug('Comment submitted', { context: this.currentContext, content });
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
    if (!this.element) return;
    const textarea = this.element.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = '';
    }
    this.currentContext = null;
  }

  /**
   * Register submit handler
   */
  onSubmit(callback: (content: string, context: ComposerContext) => void): void {
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
    this.element = null;
    this.currentContext = null;
    this.insertionAnchor = null;
    this.originalItem = null;
    this.onSubmitCallback = null;
    this.onCancelCallback = null;
    this.clearListeners();
  }
}
