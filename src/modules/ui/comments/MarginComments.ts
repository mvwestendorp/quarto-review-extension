import { createModuleLogger } from '@utils/debug';
import type { Comment } from '@/types';
import type { SectionCommentSnapshot } from './CommentController';
import { escapeHtml } from '../shared';
import { createDiv, createButton } from '@utils/dom-helpers';

const logger = createModuleLogger('MarginComments');

export interface MarginCommentsCallbacks {
  onNavigate: (elementId: string, commentKey: string) => void;
  onRemove: (elementId: string, comment: Comment) => void;
  onEdit: (elementId: string, comment: Comment) => void;
  onHover: (elementId: string, commentKey: string) => void;
  onLeave: () => void;
}

interface CommentPosition {
  top: number;
  elementId: string;
  commentId: string;
}

/**
 * MarginComments manages comments displayed in the document margin (right side),
 * similar to Quarto's margin references and notes.
 */
export class MarginComments {
  private container: HTMLElement | null = null;
  private sections: SectionCommentSnapshot[] = [];
  private callbacks: MarginCommentsCallbacks | null = null;
  private commentElements: Map<string, HTMLElement> = new Map();
  private scrollHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.ensureContainerCreated();
    this.setupScrollSync();
  }

  create(): HTMLElement {
    this.ensureContainerCreated();
    return this.container!;
  }

  getElement(): HTMLElement | null {
    return this.container;
  }

  updateSections(
    sections: SectionCommentSnapshot[],
    callbacks: MarginCommentsCallbacks
  ): void {
    this.sections = sections;
    this.callbacks = callbacks;
    this.refresh();
    logger.debug('Margin comments updated', { count: sections.length });
  }

  refresh(): void {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.commentElements.clear();

    if (this.sections.length === 0) {
      // Optional: Show empty state
      // const emptyMsg = createDiv('review-margin-comments-empty');
      // emptyMsg.textContent = '💬 No comments yet';
      // this.container.appendChild(emptyMsg);
      return;
    }

    const positions = this.calculateCommentPositions();

    this.sections.forEach((snapshot) => {
      snapshot.comments.forEach((comment) => {
        const commentKey = `${snapshot.element.id}:${comment.id}`;
        const position = positions.find(
          (p) =>
            p.elementId === snapshot.element.id && p.commentId === comment.id
        );

        if (!position) {
          logger.warn('No position calculated for comment', { commentKey });
          return;
        }

        const commentElement = this.renderComment(snapshot, comment, position);
        this.commentElements.set(commentKey, commentElement);
        this.container?.appendChild(commentElement);
      });
    });

    // Handle overlapping comments
    this.resolveCollisions();

    logger.debug('Margin comments refreshed', {
      count: this.commentElements.size,
    });
  }

  /**
   * Highlight a specific comment in the margin
   */
  highlightComment(elementId: string, commentKey?: string): void {
    this.commentElements.forEach((element, key) => {
      const [elId] = key.split(':');
      if (commentKey) {
        // Highlight specific comment
        if (key === commentKey) {
          element.classList.add('review-margin-comment-highlight');
        } else {
          element.classList.remove('review-margin-comment-highlight');
        }
      } else {
        // Highlight all comments for element
        if (elId === elementId) {
          element.classList.add('review-margin-comment-highlight');
        } else {
          element.classList.remove('review-margin-comment-highlight');
        }
      }
    });
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    this.commentElements.forEach((element) => {
      element.classList.remove('review-margin-comment-highlight');
    });
  }

  destroy(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.sections = [];
    this.callbacks = null;
    this.commentElements.clear();
  }

  private ensureContainerCreated(): void {
    if (this.container) return;

    this.container = createDiv('review-margin-comments-container');
    this.container.setAttribute('role', 'complementary');
    this.container.setAttribute('aria-label', 'Document comments');
  }

  /**
   * Calculate vertical positions for all comments based on their associated sections
   */
  private calculateCommentPositions(): CommentPosition[] {
    const positions: CommentPosition[] = [];

    this.sections.forEach((snapshot) => {
      const sectionElement = document.querySelector(
        `[data-section-id="${snapshot.element.id}"]`
      ) as HTMLElement;

      if (!sectionElement) {
        logger.warn('Section element not found for comment positioning', {
          sectionId: snapshot.element.id,
        });
        return;
      }

      const rect = sectionElement.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const absoluteTop = rect.top + scrollTop;

      // Stack multiple comments vertically for the same section
      snapshot.comments.forEach((comment, index) => {
        positions.push({
          top: absoluteTop + index * 140, // 140px spacing between comments
          elementId: snapshot.element.id,
          commentId: comment.id,
        });
      });
    });

    return positions;
  }

  /**
   * Render a single comment in the margin
   */
  private renderComment(
    snapshot: SectionCommentSnapshot,
    comment: Comment,
    position: CommentPosition
  ): HTMLElement {
    const commentKey = `${snapshot.element.id}:${comment.id}`;
    const commentWrapper = createDiv('review-margin-comment');
    commentWrapper.style.top = `${position.top}px`;
    commentWrapper.dataset.commentKey = commentKey;
    commentWrapper.dataset.elementId = snapshot.element.id;

    // Connector line (visual indicator)
    const connector = createDiv('review-margin-comment-connector');
    commentWrapper.appendChild(connector);

    // Comment card
    const card = createDiv('review-margin-comment-card');

    // Header with icon and position
    const header = createDiv('review-margin-comment-header');
    const icon = document.createElement('span');
    icon.className = 'review-margin-comment-icon';
    icon.textContent = '💬';
    header.appendChild(icon);

    const sectionIndex = this.sections.findIndex(
      (s) => s.element.id === snapshot.element.id
    );
    const commentIndex = snapshot.comments.findIndex(
      (c) => c.id === comment.id
    );
    const position_label = createDiv('review-margin-comment-position');
    position_label.textContent = `${sectionIndex + 1}/${commentIndex + 1}`;
    header.appendChild(position_label);

    card.appendChild(header);

    // Comment text
    const text = createDiv('review-margin-comment-text');
    text.innerHTML = escapeHtml(comment.content);
    card.appendChild(text);

    // Metadata (userId, timestamp)
    if (comment.userId || comment.timestamp) {
      const meta = createDiv('review-margin-comment-meta');
      const parts: string[] = [];
      if (comment.userId) parts.push(comment.userId);
      if (comment.timestamp) {
        const date = new Date(comment.timestamp);
        parts.push(date.toLocaleDateString());
      }
      meta.textContent = parts.join(' • ');
      card.appendChild(meta);
    }

    // Action buttons
    const actions = createDiv('review-margin-comment-actions');

    const viewBtn = createButton('View', 'review-margin-comment-action-btn');
    viewBtn.title = 'Navigate to section';
    viewBtn.onclick = (e) => {
      e.stopPropagation();
      this.callbacks?.onNavigate(snapshot.element.id, commentKey);
    };
    actions.appendChild(viewBtn);

    const editBtn = createButton('Edit', 'review-margin-comment-action-btn');
    editBtn.title = 'Edit comment';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      this.callbacks?.onEdit(snapshot.element.id, comment);
    };
    actions.appendChild(editBtn);

    const removeBtn = createButton(
      'Remove',
      'review-margin-comment-action-btn'
    );
    removeBtn.title = 'Remove comment';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.callbacks?.onRemove(snapshot.element.id, comment);
    };
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    commentWrapper.appendChild(card);

    // Hover interactions
    commentWrapper.addEventListener('mouseenter', () => {
      this.callbacks?.onHover(snapshot.element.id, commentKey);
    });

    commentWrapper.addEventListener('mouseleave', () => {
      this.callbacks?.onLeave();
    });

    return commentWrapper;
  }

  /**
   * Detect and resolve overlapping comments by adjusting positions
   */
  private resolveCollisions(): void {
    const commentArray = Array.from(this.commentElements.values());

    for (let i = 0; i < commentArray.length; i++) {
      for (let j = i + 1; j < commentArray.length; j++) {
        const comment1 = commentArray[i];
        const comment2 = commentArray[j];

        if (!comment1 || !comment2) continue;

        const rect1 = comment1.getBoundingClientRect();
        const rect2 = comment2.getBoundingClientRect();

        // Check for vertical overlap
        if (
          rect1.top < rect2.bottom &&
          rect1.bottom > rect2.top &&
          Math.abs(rect1.top - rect2.top) < 20
        ) {
          // Add collision class for visual adjustment
          comment2.classList.add('has-collision');
        }
      }
    }
  }

  /**
   * Setup scroll synchronization to update comment visibility
   */
  private setupScrollSync(): void {
    this.scrollHandler = () => {
      this.updateCommentVisibility();
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Also observe document height changes (if ResizeObserver is available)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // Recalculate positions when document size changes
        this.refresh();
      });

      const mainContent = document.querySelector('main');
      if (mainContent) {
        this.resizeObserver.observe(mainContent);
      }
    }
  }

  /**
   * Update comment visibility based on scroll position
   */
  private updateCommentVisibility(): void {
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    this.commentElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const absoluteTop = rect.top + scrollTop;

      // Fade out comments that are far from viewport
      const distanceFromViewport = Math.abs(
        absoluteTop - scrollTop - viewportHeight / 2
      );
      const threshold = viewportHeight * 1.5;

      if (distanceFromViewport > threshold) {
        element.classList.add('out-of-view');
      } else {
        element.classList.remove('out-of-view');
      }
    });
  }
}
