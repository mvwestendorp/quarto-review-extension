import { createModuleLogger } from '@utils/debug';
import type { Comment } from '@/types';
import type { SectionCommentSnapshot } from './CommentController';
import { escapeHtml } from '../shared';
import { createDiv, createButton, setAttributes } from '@utils/dom-helpers';

const logger = createModuleLogger('CommentsSidebar');

export interface CommentsSidebarCallbacks {
  onNavigate: (elementId: string, commentKey: string) => void;
  onRemove: (elementId: string, comment: Comment) => void;
  onEdit: (elementId: string, comment: Comment) => void;
  onHover: (elementId: string, commentKey: string) => void;
  onLeave: () => void;
}

/**
 * CommentsSidebar manages the sidebar UI for viewing and managing comments.
 */
export class CommentsSidebar {
  private element: HTMLElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private collapsed = true;
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
    this.setCollapsed(false);
    this.refresh();
    logger.debug('Comments sidebar shown');
  }

  hide(): void {
    this.setCollapsed(true);
    logger.debug('Comments sidebar hidden');
  }

  toggle(): void {
    this.ensureElementCreated();
    this.setCollapsed(!this.collapsed);
    if (!this.collapsed) {
      this.refresh();
    }
  }

  getIsVisible(): boolean {
    return !this.collapsed;
  }

  updateSections(
    sections: SectionCommentSnapshot[],
    callbacks: CommentsSidebarCallbacks
  ): void {
    this.sections = sections;
    this.callbacks = callbacks;
    this.refresh();
    logger.debug('Comments updated', { count: sections.length });
  }

  refresh(): void {
    if (!this.element) return;

    const content = this.element.querySelector(
      '.review-comments-sidebar-content'
    );
    if (!content) return;

    content.innerHTML = '';

    if (this.sections.length === 0) {
      const emptyMsg = createDiv('review-comments-empty');
      emptyMsg.textContent = 'No comments yet';
      content.appendChild(emptyMsg);
      return;
    }

    this.sections.forEach((snapshot) => {
      const section = createDiv('review-comments-section');
      section.dataset.sectionId = snapshot.element.id;

      /*const header = createDiv('review-comments-section-header');
      header.textContent = this.getSectionLabel(snapshot);
      section.appendChild(header);*/

      const list = createDiv('review-comments-list');

      snapshot.comments.forEach((comment, index) => {
        const item = this.renderComment(snapshot, comment, index);
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
    this.toggleBtn = null;
    this.collapsed = true;
    document.body.classList.remove('review-comments-sidebar-open');
  }

  private ensureElementCreated(): void {
    if (this.element) return;

    const sidebar = createDiv(
      'review-comments-sidebar review-persistent-sidebar review-sidebar-collapsed'
    );
    setAttributes(sidebar, {
      role: 'region',
      'aria-label': 'Comments',
      'aria-hidden': 'true',
    });

    const header = createDiv('review-sidebar-header');
    setAttributes(header, { 'data-sidebar-label': 'Comments' });

    const title = document.createElement('h3');
    title.textContent = 'Comments';
    header.appendChild(title);

    this.toggleBtn = createButton('', 'review-btn review-btn-icon');
    setAttributes(this.toggleBtn, {
      'data-action': 'toggle-comments-sidebar',
      'aria-label': 'Expand comments panel',
      title: 'Expand comments panel',
      'aria-expanded': 'false',
    });
    const chevron = document.createElement('span');
    chevron.className = 'review-icon-chevron';
    chevron.textContent = '‹';
    this.toggleBtn.appendChild(chevron);
    this.toggleBtn.addEventListener('click', () => this.toggle());
    header.appendChild(this.toggleBtn);

    sidebar.appendChild(header);

    const content = createDiv(
      'review-sidebar-body review-comments-sidebar-body'
    );

    const listContainer = createDiv('review-comments-sidebar-content');
    content.appendChild(listContainer);

    sidebar.appendChild(content);

    this.element = sidebar;
    document.body.appendChild(sidebar);
    this.setCollapsed(true, false);
  }

  private setCollapsed(collapsed: boolean, updateBodyClass = true): void {
    if (!this.element) return;
    this.collapsed = collapsed;
    this.element.classList.toggle('review-sidebar-collapsed', collapsed);
    this.element.setAttribute('aria-hidden', collapsed ? 'true' : 'false');

    if (updateBodyClass && document.body) {
      document.body.classList.toggle(
        'review-comments-sidebar-open',
        !collapsed
      );
    }

    if (this.toggleBtn) {
      this.toggleBtn.setAttribute(
        'title',
        collapsed ? 'Expand comments panel' : 'Collapse comments panel'
      );
      this.toggleBtn.setAttribute(
        'aria-label',
        collapsed ? 'Expand comments panel' : 'Collapse comments panel'
      );
      this.toggleBtn.setAttribute(
        'aria-expanded',
        collapsed ? 'false' : 'true'
      );
      const chevron = this.toggleBtn.querySelector('.review-icon-chevron');
      if (chevron) {
        chevron.textContent = collapsed ? '‹' : '›';
      }
    }
  }

  private renderComment(
    snapshot: SectionCommentSnapshot,
    comment: Comment,
    index: number
  ): HTMLElement {
    const elementId = snapshot.element.id;
    const commentKey = `${elementId}:${comment.id}`;

    const container = createDiv('review-comment-item');
    container.dataset.commentKey = commentKey;
    container.dataset.elementId = elementId;
    container.dataset.commentId = comment.id;
    setAttributes(container, { role: 'article' });

    const header = createDiv('review-comment-item-header');
    header.innerHTML = `
      <span class="review-comment-position">${index + 1}/${snapshot.comments.length}</span>
      <span class="review-comment-link" aria-hidden="true">⟶</span>
    `;
    container.appendChild(header);

    const body = createDiv('review-comment-item-body');
    body.innerHTML = `<div class="review-comment-text">${escapeHtml(
      this.extractPlainText(comment.content)
    )}</div>`;
    container.appendChild(body);

    const actions = createDiv('review-comment-item-actions');
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
          this.callbacks?.onRemove(elementId, comment);
        });

      container.addEventListener('mouseenter', () => {
        this.callbacks?.onHover(elementId, commentKey);
      });

      container.addEventListener('mouseleave', () => {
        this.callbacks?.onLeave();
      });

      container.addEventListener('dblclick', () => {
        this.callbacks?.onEdit(elementId, comment);
      });
    }

    return container;
  }

  private extractPlainText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
