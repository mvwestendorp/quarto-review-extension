import { createModuleLogger } from '@utils/debug';
import type { CriticMarkupMatch } from '@modules/comments';
import type { SectionCommentSnapshot } from './CommentController';

const logger = createModuleLogger('CommentsSidebar');

export interface CommentsSidebarCallbacks {
  onNavigate: (elementId: string, commentKey: string) => void;
  onRemove: (elementId: string, match: CriticMarkupMatch) => void;
  onEdit: (elementId: string, match: CriticMarkupMatch) => void;
  onHover: (elementId: string, commentKey: string) => void;
  onLeave: () => void;
}

/**
 * CommentsSidebar manages the sidebar UI for viewing and managing comments.
 */
export class CommentsSidebar {
  private element: HTMLElement | null = null;
  private isVisible = false;
  private sections: SectionCommentSnapshot[] = [];
  private callbacks: CommentsSidebarCallbacks | null = null;

  constructor() {
    this.ensureElementCreated();
  }

  create(): HTMLElement {
    this.ensureElementCreated();
    return this.element!;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  show(): void {
    this.ensureElementCreated();
    if (!this.element) return;

    if (!this.element.parentNode) {
      document.body.appendChild(this.element);
    }

    this.element.classList.add('review-sidebar-open');
    this.isVisible = true;
    this.element.setAttribute('aria-hidden', 'false');
    logger.debug('Comments sidebar shown');
  }

  hide(): void {
    if (!this.element) return;

    this.element.classList.remove('review-sidebar-open');
    this.isVisible = false;
    this.element.setAttribute('aria-hidden', 'true');
    logger.debug('Comments sidebar hidden');
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
      this.refresh();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  updateSections(sections: SectionCommentSnapshot[], callbacks: CommentsSidebarCallbacks): void {
    this.sections = sections;
    this.callbacks = callbacks;
    this.refresh();
    logger.debug('Comments updated', { count: sections.length });
  }

  refresh(): void {
    if (!this.element) return;

    const content = this.element.querySelector('.review-comments-sidebar-content');
    if (!content) return;

    content.innerHTML = '';

    if (this.sections.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'review-comments-empty';
      emptyMsg.textContent = 'No comments yet';
      content.appendChild(emptyMsg);
      return;
    }

    this.sections.forEach((snapshot) => {
      const section = document.createElement('div');
      section.className = 'review-comments-section';
      section.dataset.sectionId = snapshot.element.id;

      const header = document.createElement('div');
      header.className = 'review-comments-section-header';
      header.textContent = this.getSectionLabel(snapshot);
      section.appendChild(header);

      const list = document.createElement('div');
      list.className = 'review-comments-list';

      snapshot.matches.forEach((match, index) => {
        const item = this.renderComment(snapshot, match, index);
        list.appendChild(item);
      });

      section.appendChild(list);
      content.appendChild(section);
    });

    logger.debug('Comments sidebar refreshed');
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.sections = [];
    this.callbacks = null;
    this.isVisible = false;
  }

  private ensureElementCreated(): void {
    if (this.element) return;

    const sidebar = document.createElement('div');
    sidebar.className = 'review-comments-sidebar';
    sidebar.setAttribute('role', 'region');
    sidebar.setAttribute('aria-label', 'Comments');

    const header = document.createElement('div');
    header.className = 'review-comments-sidebar-header';

    const title = document.createElement('h2');
    title.textContent = 'Comments';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'review-comments-sidebar-close';
    closeBtn.setAttribute('aria-label', 'Close comments');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    sidebar.appendChild(header);

    const content = document.createElement('div');
    content.className = 'review-comments-sidebar-content';
    sidebar.appendChild(content);

    this.element = sidebar;
  }

  private renderComment(
    snapshot: SectionCommentSnapshot,
    match: CriticMarkupMatch,
    index: number
  ): HTMLElement {
    const elementId = snapshot.element.id;
    const commentKey = `${elementId}:${match.start}`;

    const container = document.createElement('div');
    container.className = 'review-comment-item';
    container.dataset.commentKey = commentKey;
    container.dataset.elementId = elementId;
    container.dataset.commentStart = String(match.start);
    container.setAttribute('role', 'article');

    const header = document.createElement('div');
    header.className = 'review-comment-item-header';
    header.innerHTML = `
      <span class="review-comment-position">${index + 1}/${snapshot.matches.length}</span>
      <span class="review-comment-link" aria-hidden="true">⟶</span>
    `;
    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'review-comment-item-body';
    body.innerHTML = `<div class="review-comment-text">${this.escapeHtml(
      this.extractPlainText(match.content)
    )}</div>`;
    container.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'review-comment-item-actions';
    actions.innerHTML = `
      <button class="review-comment-action-btn" data-action="goto">View</button>
      <button class="review-comment-action-btn" data-action="remove">Remove</button>
    `;
    container.appendChild(actions);

    if (this.callbacks) {
      container
        .querySelector('[data-action="goto"]')
        ?.addEventListener('click', () => {
          this.callbacks?.onNavigate(elementId, commentKey);
        });

      container
        .querySelector('[data-action="remove"]')
        ?.addEventListener('click', () => {
          this.callbacks?.onRemove(elementId, match);
        });

      container.addEventListener('mouseenter', () => {
        this.callbacks?.onHover(elementId, commentKey);
      });

      container.addEventListener('mouseleave', () => {
        this.callbacks?.onLeave();
      });

      container.addEventListener('dblclick', () => {
        this.callbacks?.onEdit(elementId, match);
      });
    }

    return container;
  }

  private getSectionLabel(snapshot: SectionCommentSnapshot): string {
    const plain = this.extractPlainText(snapshot.element.content);
    const type = snapshot.element.metadata.type;
    return plain ? `${type}: ${plain}` : type;
  }

  private extractPlainText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
