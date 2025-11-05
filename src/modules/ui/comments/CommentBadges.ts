import type { Comment } from '@/types';
import type { SectionCommentSnapshot } from './CommentController';

export interface CommentBadgeCallbacks {
  onShowComments: (elementId: string, commentKey: string) => void;
  onOpenComposer: (elementId: string, comment: Comment | null) => void;
  onHover: (elementId: string) => void;
  onLeave: () => void;
}

/**
 * Manages comment indicators rendered on document sections.
 */
export class CommentBadges {
  private indicators = new Map<string, HTMLButtonElement>();
  private latestComment = new Map<string, Comment | null>();

  syncIndicators(
    sections: SectionCommentSnapshot[],
    callbacks: CommentBadgeCallbacks
  ): void {
    const activeIds = new Set(sections.map((section) => section.element.id));

    for (const [sectionId, indicator] of this.indicators) {
      if (!activeIds.has(sectionId)) {
        indicator.remove();
        this.indicators.delete(sectionId);
        this.latestComment.delete(sectionId);
      }
    }

    sections.forEach((snapshot) => {
      const domElement = document.querySelector(
        `[data-review-id="${snapshot.element.id}"]`
      ) as HTMLElement | null;
      if (
        !domElement ||
        domElement.classList.contains('review-editable-editing')
      ) {
        return;
      }

      const indicator = this.ensureIndicator(
        snapshot.element.id,
        domElement,
        callbacks
      );
      this.updateIndicator(indicator, domElement, snapshot);
    });
  }

  clearAll(): void {
    for (const indicator of this.indicators.values()) {
      indicator.remove();
    }
    this.indicators.clear();
    this.latestComment.clear();
  }

  private ensureIndicator(
    sectionId: string,
    domElement: HTMLElement,
    callbacks: CommentBadgeCallbacks
  ): HTMLButtonElement {
    let indicator = this.indicators.get(sectionId);

    if (!indicator || !indicator.isConnected) {
      indicator?.remove();
      indicator = this.createIndicator(sectionId, callbacks);
      this.indicators.set(sectionId, indicator);
    }

    if (!domElement.contains(indicator)) {
      domElement.appendChild(indicator);
    }

    return indicator;
  }

  private createIndicator(
    sectionId: string,
    callbacks: CommentBadgeCallbacks
  ): HTMLButtonElement {
    const indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.className =
      'review-section-comment-indicator review-badge-positioned';

    const icon = document.createElement('span');
    icon.className = 'review-badge-icon';
    icon.textContent = '💬';
    indicator.appendChild(icon);

    const countSpan = document.createElement('span');
    countSpan.className = 'review-badge-count is-hidden';
    countSpan.textContent = '1';
    indicator.appendChild(countSpan);

    const stop = (event: Event) => {
      event.stopPropagation();
      if (event instanceof MouseEvent) {
        event.preventDefault();
      }
    };

    indicator.addEventListener('mousedown', stop);
    indicator.addEventListener('mouseup', stop);
    indicator.addEventListener('click', (event) => {
      stop(event);
      const commentKey = indicator.dataset.commentKey ?? '';
      callbacks.onShowComments(sectionId, commentKey);
    });

    indicator.addEventListener('dblclick', (event) => {
      stop(event);
      const comment = this.latestComment.get(sectionId) ?? null;
      callbacks.onOpenComposer(sectionId, comment);
    });

    indicator.addEventListener('mouseenter', () => {
      callbacks.onHover(sectionId);
    });

    indicator.addEventListener('mouseleave', () => {
      callbacks.onLeave();
    });

    return indicator;
  }

  private updateIndicator(
    indicator: HTMLButtonElement,
    domElement: HTMLElement,
    snapshot: SectionCommentSnapshot
  ): void {
    const { element, comments } = snapshot;
    const firstComment = comments[0] ?? null;
    this.latestComment.set(element.id, firstComment);

    const count = comments.length;
    const countSpan = indicator.querySelector('.review-badge-count');
    if (countSpan) {
      countSpan.textContent = count > 1 ? String(count) : '1';
      countSpan.classList.toggle('is-hidden', count <= 1);
    }

    const commentKey = firstComment
      ? `${element.id}:${firstComment.id}`
      : element.id;
    indicator.dataset.commentKey = commentKey;
    indicator.dataset.commentId = firstComment ? firstComment.id : '';

    const preview = (firstComment?.content || '')
      .replace(/\s+/g, ' ')
      .trim();
    const tooltip =
      count > 1
        ? `${count} comments${preview ? ` • "${preview}"` : ''}`
        : `Comment${preview ? ` • "${preview}"` : ''}`;

    indicator.setAttribute('title', tooltip);
    indicator.setAttribute('aria-label', tooltip);

    if (getComputedStyle(domElement).position === 'static') {
      domElement.style.position = 'relative';
    }

    domElement
      .querySelectorAll('.review-section-comment-indicator')
      .forEach((existing) => {
        if (existing !== indicator) {
          existing.parentElement?.removeChild(existing);
        }
      });
  }

  destroy(): void {
    this.clearAll();
  }
}
