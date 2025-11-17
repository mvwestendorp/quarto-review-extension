/**
 * Context Menu
 *
 * Manages the right-click context menu for quick actions on document sections.
 * Provides actions like edit section and add comment.
 *
 * Extracted from UIModule index.ts to reduce monolithic complexity.
 */

import { createModuleLogger } from '@utils/debug';
import { createDiv, createButton } from '@utils/dom-helpers';

const logger = createModuleLogger('ContextMenu');

export interface MenuPosition {
  x: number;
  y: number;
}

/**
 * ContextMenu manages right-click context menu
 */
export class ContextMenu {
  private element: HTMLElement | null = null;
  private isOpen = false;
  private currentSectionId: string | null = null;
  private onEditCallback: ((sectionId: string) => void) | null = null;
  private onCommentCallback: ((sectionId: string) => void) | null = null;
  private clickListener: ((e: Event) => void) | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Create the context menu element
   */
  create(): HTMLElement {
    const menu = createDiv('review-context-menu');
    menu.setAttribute('role', 'menu');
    menu.style.display = 'none';

    // Edit action
    const editItem = createButton(
      'Edit',
      'review-context-menu-item review-context-menu-edit'
    );
    editItem.setAttribute('role', 'menuitem');
    editItem.addEventListener('click', () => {
      if (this.currentSectionId && this.onEditCallback) {
        this.onEditCallback(this.currentSectionId);
      }
      this.close();
    });
    menu.appendChild(editItem);

    // Comment action
    const commentItem = createButton(
      'Add Comment',
      'review-context-menu-item review-context-menu-comment'
    );
    commentItem.setAttribute('role', 'menuitem');
    commentItem.addEventListener('click', () => {
      if (this.currentSectionId && this.onCommentCallback) {
        this.onCommentCallback(this.currentSectionId);
      }
      this.close();
    });
    menu.appendChild(commentItem);

    // Close on click outside
    this.clickListener = () => {
      if (this.isOpen) this.close();
    };
    document.addEventListener('click', this.clickListener);

    // Close on escape
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.keydownListener);

    this.element = menu;
    document.body.appendChild(menu);
    return menu;
  }

  /**
   * Get the context menu element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Open the context menu at a position
   */
  open(sectionId: string, position: MenuPosition): void {
    if (!this.element) {
      this.create();
    }

    this.currentSectionId = sectionId;

    // Position the menu
    this.element!.style.left = `${position.x}px`;
    this.element!.style.top = `${position.y}px`;

    // Show the menu
    this.element!.style.display = 'block';
    this.isOpen = true;

    // Focus first item for accessibility
    const firstItem = this.element!.querySelector(
      'button'
    ) as HTMLButtonElement;
    if (firstItem) {
      firstItem.focus();
    }

    logger.debug('Context menu opened', { sectionId, position });
  }

  /**
   * Close the context menu
   */
  close(): void {
    if (!this.element) return;
    this.element.style.display = 'none';
    this.isOpen = false;
    this.currentSectionId = null;
    logger.debug('Context menu closed');
  }

  /**
   * Check if menu is open
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Register edit handler
   */
  onEdit(callback: (sectionId: string) => void): void {
    this.onEditCallback = callback;
  }

  /**
   * Register comment handler
   */
  onComment(callback: (sectionId: string) => void): void {
    this.onCommentCallback = callback;
  }

  /**
   * Destroy the context menu
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
    }
    // Remove document event listeners to prevent leaks
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
      this.clickListener = null;
    }
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
    this.element = null;
    this.onEditCallback = null;
    this.onCommentCallback = null;
  }
}
