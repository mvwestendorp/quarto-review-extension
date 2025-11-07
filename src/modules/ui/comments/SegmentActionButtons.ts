/**
 * Segment Action Buttons
 *
 * Manages edit and comment action buttons displayed on the right side of each segment.
 * Provides intuitive access to edit and comment functionality without click menus.
 *
 * Extracted to reduce UIModule complexity.
 */

// import { createModuleLogger } from '@utils/debug';

// const logger = createModuleLogger('SegmentActionButtons');

export interface SegmentActionCallbacks {
  onEdit: (elementId: string) => void;
  onAddComment: (elementId: string) => void;
}

/**
 * SegmentActionButtons manages edit and comment buttons for segments
 */
export class SegmentActionButtons {
  private buttons = new Map<string, HTMLDivElement>();
  private callbacks: SegmentActionCallbacks | null = null;

  /**
   * Set the callbacks for action buttons
   */
  setCallbacks(callbacks: SegmentActionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Create action buttons container with edit and comment buttons
   */
  private createButtonsContainer(sectionId: string): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'review-segment-actions';
    container.setAttribute('data-section-id', sectionId);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'review-segment-action-btn review-segment-action-edit';
    editBtn.setAttribute('title', 'Edit this section (or double-click)');
    editBtn.setAttribute('aria-label', 'Edit section');
    editBtn.innerHTML = '✎'; // Pencil icon
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks) {
        this.callbacks.onEdit(sectionId);
      }
    });
    container.appendChild(editBtn);

    // Comment button
    const commentBtn = document.createElement('button');
    commentBtn.className =
      'review-segment-action-btn review-segment-action-comment';
    commentBtn.setAttribute('title', 'Add or edit comment');
    commentBtn.setAttribute('aria-label', 'Add comment');
    commentBtn.innerHTML = '💬'; // Comment bubble
    commentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks) {
        this.callbacks.onAddComment(sectionId);
      }
    });
    container.appendChild(commentBtn);

    return container;
  }

  /**
   * Sync action buttons with current segments
   */
  syncButtons(sectionIds: string[]): void {
    const activeIds = new Set(sectionIds);

    // Remove buttons for sections that no longer exist
    for (const [sectionId, buttonContainer] of this.buttons) {
      if (!activeIds.has(sectionId)) {
        buttonContainer.remove();
        this.buttons.delete(sectionId);
      }
    }

    // Add or update buttons for active sections
    sectionIds.forEach((sectionId) => {
      const parentElement = document.querySelector(
        `[data-review-id="${sectionId}"]`
      ) as HTMLElement | null;

      if (
        !parentElement ||
        parentElement.classList.contains('review-editable-editing')
      ) {
        return;
      }

      this.ensureActionButtons(sectionId, parentElement);
    });
  }

  /**
   * Ensure action buttons exist for a section
   */
  private ensureActionButtons(
    sectionId: string,
    parentElement: HTMLElement
  ): void {
    let buttonContainer = this.buttons.get(sectionId);

    if (!buttonContainer || !buttonContainer.isConnected) {
      buttonContainer?.remove();
      buttonContainer = this.createButtonsContainer(sectionId);
      this.buttons.set(sectionId, buttonContainer);
    }

    // Add to parent if not already there
    if (!parentElement.contains(buttonContainer)) {
      parentElement.appendChild(buttonContainer);
    }

    // Ensure parent is relatively positioned for button positioning
    if (getComputedStyle(parentElement).position === 'static') {
      parentElement.style.position = 'relative';
    }

    // Add hover tracking to keep buttons visible when cursor is on same vertical level
    this.addHoverTracking(parentElement, buttonContainer);
  }

  /**
   * Add hover tracking to parent element to keep buttons visible
   * when cursor is on the same vertical level as the segment
   */
  private addHoverTracking(
    parentElement: HTMLElement,
    buttonContainer: HTMLElement
  ): void {
    // Skip if already has hover tracking
    if (parentElement.dataset.hoverTrackingAdded === 'true') {
      return;
    }
    parentElement.dataset.hoverTrackingAdded = 'true';

    const enterHandler = () => {
      parentElement.classList.add('review-segment-hovered');
    };

    const leaveHandler = () => {
      parentElement.classList.remove('review-segment-hovered');
    };

    // Track mouse position to detect when cursor is at same vertical level
    let isInVerticalZone = false;

    const mouseMoveHandler = (e: MouseEvent) => {
      const rect = parentElement.getBoundingClientRect();
      const isInVerticalRange =
        e.clientY >= rect.top && e.clientY <= rect.bottom;

      // Show buttons if cursor is at the same vertical level as the segment
      // Regardless of horizontal position, as long as user is at the same height
      if (isInVerticalRange) {
        if (!isInVerticalZone) {
          isInVerticalZone = true;
          enterHandler();
        }
      } else if (isInVerticalZone) {
        // Only hide when cursor moves vertically away from the segment
        isInVerticalZone = false;
        leaveHandler();
      }
    };

    // Standard hover for the segment itself
    parentElement.addEventListener('mouseenter', enterHandler);
    parentElement.addEventListener('mouseleave', leaveHandler);

    // Standard hover for the button container
    buttonContainer.addEventListener('mouseenter', enterHandler);
    buttonContainer.addEventListener('mouseleave', leaveHandler);

    // Track mouse move for extended zone
    document.addEventListener('mousemove', mouseMoveHandler);
  }

  /**
   * Clear all action buttons
   */
  clearAll(): void {
    for (const buttonContainer of this.buttons.values()) {
      buttonContainer.remove();
    }
    this.buttons.clear();
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.clearAll();
    this.callbacks = null;
  }
}
