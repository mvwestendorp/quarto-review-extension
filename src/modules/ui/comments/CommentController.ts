import type { CommentState } from '../shared';
import { MODULE_EVENTS } from '../shared';
import type { CommentsModule } from '@modules/comments';
import type { ChangesModule } from '@modules/changes';
import type { MarkdownModule } from '@modules/markdown';
import type { CommentComposer } from './CommentComposer';
import type { CommentsSidebar } from './CommentsSidebar';
import type { CommentBadges, CommentBadgeCallbacks } from './CommentBadges';
import type { Element as ReviewElement } from '@/types';
import { getAnimationDuration } from '../constants';

export interface CommentControllerConfig {
  changes: ChangesModule;
  comments: CommentsModule;
  markdown: MarkdownModule;
}

export interface CommentControllerCallbacks {
  requestRefresh: () => void;
  ensureSidebarVisible?: () => void;
  showNotification: (
    message: string,
    type?: 'info' | 'success' | 'error'
  ) => void;
  onComposerClosed?: () => void;
}

interface CommentComposerContext {
  elementId: string;
  existingComment?: ReturnType<CommentsModule['parse']>[0];
  commentKey?: string;
}

export class CommentController {
  private config: CommentControllerConfig;
  private commentState: CommentState;
  private sidebar: CommentsSidebar | null;
  private composer: CommentComposer | null;
  private badges: CommentBadges | null;
  private callbacks: CommentControllerCallbacks;
  private sectionCommentCache = new Map<string, string>();

  constructor(options: {
    config: CommentControllerConfig;
    commentState: CommentState;
    sidebar: CommentsSidebar | null;
    composer: CommentComposer | null;
    badges: CommentBadges | null;
    callbacks: CommentControllerCallbacks;
  }) {
    this.config = options.config;
    this.commentState = options.commentState;
    this.sidebar = options.sidebar;
    this.composer = options.composer;
    this.badges = options.badges;
    this.callbacks = options.callbacks;

    this.composer?.on(MODULE_EVENTS.COMMENT_SUBMITTED, (detail: any) => {
      this.handleSubmission(detail);
    });
    this.composer?.on(MODULE_EVENTS.COMMENT_CANCELLED, () => {
      this.closeComposer();
    });
  }

  public openComposer(context: CommentComposerContext): void {
    if (!this.composer || !this.sidebar) return;

    const sidebarElement = this.sidebar.getElement();
    if (!sidebarElement) {
      return;
    }

    const body = sidebarElement.querySelector(
      '.review-comments-sidebar-content'
    ) as HTMLElement | null;
    if (!body) {
      return;
    }

    this.closeComposer();

    const element = this.config.changes.getElementById(context.elementId);
    const elementLabel = element
      ? this.getElementLabel(element.content, element.metadata.type)
      : 'Document section';

    const existingCommentContent = context.existingComment?.content;

    this.composer.open(
      {
        sectionId: context.elementId,
        elementId: context.elementId,
        existingComment: existingCommentContent,
        elementLabel,
      },
      body
    );

    const composerElement = body.querySelector(
      '.review-comment-composer'
    ) as HTMLElement | null;
    if (composerElement) {
      composerElement.dataset.elementId = context.elementId;
      composerElement.dataset.commentKey = context.commentKey ?? '';
      if (context.existingComment) {
        composerElement.dataset.commentStart = String(
          context.existingComment.start
        );
      }
      this.commentState.activeCommentComposer = composerElement;
      this.commentState.activeComposerInsertionAnchor =
        composerElement.previousElementSibling as HTMLElement | null;
    }

    // Hide original comment item while editing
    if (context.commentKey) {
      const originalItem = body.querySelector<HTMLElement>(
        `.review-comment-item[data-comment-key="${context.commentKey}"]`
      );
      if (originalItem) {
        originalItem.classList.add('review-comment-item-hidden');
        this.commentState.activeComposerOriginalItem = originalItem;
      }
    }

    const textarea = body.querySelector(
      '.review-comment-composer-input'
    ) as HTMLTextAreaElement | null;
    textarea?.focus();
  }

  public closeComposer(): void {
    this.composer?.close();

    if (this.commentState.activeCommentComposer) {
      this.commentState.activeCommentComposer.remove();
      this.commentState.activeCommentComposer = null;
    }

    this.commentState.activeComposerInsertionAnchor = null;

    if (this.commentState.activeComposerOriginalItem) {
      this.commentState.activeComposerOriginalItem.classList.remove(
        'review-comment-item-hidden'
      );
      this.commentState.activeComposerOriginalItem = null;
    }

    this.callbacks.onComposerClosed?.();
    this.clearHighlight('composer');
  }

  public handleSubmission(detail: any): void {
    const { elementId, content, isEdit, start } = detail ?? {};
    if (!elementId || typeof content !== 'string') {
      return;
    }

    if (isEdit && typeof start === 'number') {
      this.updateSectionComment(elementId, start, content);
    } else {
      this.addSectionComment(elementId, content);
    }

    this.closeComposer();
  }

  public removeComment(
    elementId: string,
    match: ReturnType<CommentsModule['parse']>[0]
  ): void {
    try {
      const currentContent = this.config.changes.getElementContent(elementId);
      const newContent = this.config.comments.accept(currentContent, match);
      this.config.changes.edit(elementId, newContent);
      const extracted = this.extractSectionComments(newContent);
      this.cacheSectionCommentMarkup(elementId, extracted.commentMarkup);
      this.callbacks.requestRefresh();
      this.callbacks.ensureSidebarVisible?.();
      this.callbacks.showNotification('Comment removed', 'success');
    } catch (error) {
      console.error('Failed to remove comment:', error);
      this.callbacks.showNotification('Failed to remove comment', 'error');
    }
  }

  private addSectionComment(elementId: string, comment: string): void {
    try {
      const currentContent = this.config.changes.getElementContent(elementId);

      const existingComments = this.config.comments
        .parse(currentContent)
        .filter((m) => m.type === 'comment');

      const lastCommentIndex = existingComments.length - 1;
      const lastComment =
        lastCommentIndex >= 0 ? existingComments[lastCommentIndex] : undefined;
      const newContent = lastComment
        ? currentContent.substring(0, lastComment.start) +
          this.config.comments.createComment(comment) +
          currentContent.substring(lastComment.end)
        : currentContent + this.config.comments.createComment(comment);

      this.config.changes.edit(elementId, newContent);
      const extracted = this.extractSectionComments(newContent);
      this.cacheSectionCommentMarkup(elementId, extracted.commentMarkup);
      this.callbacks.requestRefresh();
      this.callbacks.ensureSidebarVisible?.();
      window.getSelection()?.removeAllRanges();
      this.callbacks.showNotification('Comment added successfully', 'success');
    } catch (error) {
      console.error('Failed to add section comment:', error);
      this.callbacks.showNotification('Failed to add comment', 'error');
    }
  }

  private updateSectionComment(
    elementId: string,
    start: number,
    comment: string
  ): void {
    try {
      const currentContent = this.config.changes.getElementContent(elementId);
      const comments = this.config.comments
        .parse(currentContent)
        .filter((m) => m.type === 'comment');
      const target = comments.find((match) => match.start === start);
      if (!target) {
        this.addSectionComment(elementId, comment);
        return;
      }

      const newContent =
        currentContent.substring(0, target.start) +
        this.config.comments.createComment(comment) +
        currentContent.substring(target.end);

      this.config.changes.edit(elementId, newContent);
      const extracted = this.extractSectionComments(newContent);
      this.cacheSectionCommentMarkup(elementId, extracted.commentMarkup);
      this.callbacks.requestRefresh();
      this.callbacks.ensureSidebarVisible?.();
      this.callbacks.showNotification('Comment updated', 'success');
    } catch (error) {
      console.error('Failed to update comment:', error);
      this.callbacks.showNotification('Failed to update comment', 'error');
    }
  }

  private getElementLabel(content: string, type: string): string {
    const plain = this.config.markdown
      .toPlainText(content)
      .replace(/\s+/g, ' ')
      .trim();
    return plain ? `${type}: ${plain}` : type;
  }

  public getSectionComments(): SectionCommentSnapshot[] {
    const rawState = this.config.changes.getCurrentState?.() ?? [];
    if (!Array.isArray(rawState)) {
      return [];
    }
    const parse =
      typeof this.config.comments.parse === 'function'
        ? this.config.comments.parse.bind(this.config.comments)
        : () => [];
    const snapshots: SectionCommentSnapshot[] = [];

    rawState.forEach((element) => {
      const matches = parse(element.content).filter(
        (m) => m.type === 'comment'
      );

      if (matches.length > 0) {
        snapshots.push({ element, matches });
      }
    });

    return snapshots;
  }

  public getCommentCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    this.getSectionComments().forEach(({ element, matches }) => {
      counts.set(element.id, matches.length);
    });
    return counts;
  }

  public refreshUI(options: { showSidebar?: boolean }): void {
    const sections = this.getSectionComments();

    if (options.showSidebar) {
      this.sidebar?.show();
    }

    this.sidebar?.updateSections(sections, {
      onNavigate: (elementId, commentKey) => {
        this.focusCommentAnchor(elementId, commentKey);
      },
      onRemove: (elementId, match) => {
        this.removeComment(elementId, match);
        this.clearHighlight();
      },
      onEdit: (elementId, match) => {
        this.openComposer({
          elementId,
          existingComment: match,
          commentKey: match ? `${elementId}:${match.start}` : undefined,
        });
      },
      onHover: (elementId, commentKey) => {
        this.highlightSection(elementId, 'hover', commentKey);
      },
      onLeave: () => {
        this.clearHighlight('hover');
      },
    });

    this.badges?.syncIndicators(sections, {
      onShowComments: (elementId, commentKey) => {
        this.sidebar?.show();
        if (commentKey) {
          this.focusCommentAnchor(elementId, commentKey);
        } else {
          this.highlightSection(elementId, 'hover');
        }
      },
      onOpenComposer: (elementId, match) => {
        this.openComposer({
          elementId,
          existingComment: match ?? undefined,
          commentKey: match ? `${elementId}:${match.start}` : undefined,
        });
      },
      onHover: (_elementId) => {
        this.highlightSection(_elementId, 'hover');
      },
      onLeave: () => {
        this.clearHighlight('hover');
      },
    });
  }

  public cacheSectionCommentMarkup(
    elementId: string,
    markup: string | null
  ): void {
    if (markup && markup.trim()) {
      this.sectionCommentCache.set(elementId, markup);
    } else {
      this.sectionCommentCache.delete(elementId);
    }
  }

  public consumeSectionCommentMarkup(elementId: string): string | undefined {
    const markup = this.sectionCommentCache.get(elementId);
    if (markup !== undefined) {
      this.sectionCommentCache.delete(elementId);
    }
    return markup;
  }

  public clearSectionCommentMarkup(elementId: string): void {
    this.sectionCommentCache.delete(elementId);
  }

  public clearSectionCommentMarkupFor(ids: string[]): void {
    ids.forEach((id) => this.sectionCommentCache.delete(id));
  }

  public extractSectionComments(content: string): {
    content: string;
    commentMarkup: string | null;
  } {
    let working = content;
    const captured: string[] = [];
    const pattern = /\s*\{>>[\s\S]*?<<\}\s*$/;

    while (true) {
      const match = working.match(pattern);
      if (!match || match.index === undefined) {
        break;
      }
      captured.unshift(match[0]);
      working = working.slice(0, match.index);
    }

    return {
      content: working.replace(/\s+$/u, ''),
      commentMarkup: captured.length > 0 ? captured.join('') : null,
    };
  }

  public appendSectionComments(content: string, commentMarkup: string): string {
    const base = content.replace(/\s+$/u, '');
    return `${base}${commentMarkup}`;
  }

  public highlightSection(
    elementId: string,
    source: 'hover' | 'composer',
    commentKey?: string
  ): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement | null;
    if (!element) {
      return;
    }

    if (
      this.commentState.activeHighlightedSection &&
      this.commentState.activeHighlightedSection !== element
    ) {
      this.commentState.activeHighlightedSection.classList.remove(
        'review-comment-section-highlight'
      );
    }

    this.commentState.activeHighlightedSection = element;
    this.commentState.highlightedBy = source;
    element.classList.add('review-comment-section-highlight');

    this.updateCommentHighlights(elementId, commentKey, source);

    if (this.commentState.activeCommentComposer) {
      const isComposerElement =
        this.commentState.activeCommentComposer.dataset.elementId === elementId;
      if (source === 'composer' && isComposerElement) {
        this.commentState.activeCommentComposer.classList.add(
          'review-comment-composer-active'
        );
      } else if (source === 'hover') {
        this.commentState.activeCommentComposer.classList.remove(
          'review-comment-composer-active'
        );
      }
    }

    this.sanitizeInlineCommentArtifacts(element);
  }

  public clearHighlight(source?: 'hover' | 'composer'): void {
    if (
      source &&
      this.commentState.highlightedBy &&
      this.commentState.highlightedBy !== source
    ) {
      return;
    }

    if (this.commentState.activeHighlightedSection) {
      this.commentState.activeHighlightedSection.classList.remove(
        'review-comment-section-highlight'
      );
    }
    this.commentState.activeHighlightedSection = null;
    this.commentState.highlightedBy = null;

    this.updateCommentHighlights(null, undefined, source ?? 'hover');

    if (
      source !== 'hover' &&
      this.commentState.activeCommentComposer &&
      source === 'composer'
    ) {
      this.commentState.activeCommentComposer.classList.remove(
        'review-comment-composer-active'
      );
    }

    if (source === 'hover' && this.commentState.activeCommentComposer) {
      const composerElementId =
        this.commentState.activeCommentComposer.dataset.elementId;
      const commentStart =
        this.commentState.activeCommentComposer.dataset.commentStart;
      if (composerElementId) {
        this.highlightSection(
          composerElementId,
          'composer',
          commentStart ? `${composerElementId}:${commentStart}` : undefined
        );
      }
    }
  }

  public focusCommentAnchor(elementId: string, commentKey: string): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement | null;
    if (!element) {
      return;
    }

    const anchor = element.querySelector(
      `[data-comment-anchor="${commentKey}"]`
    ) as HTMLElement | null;

    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      anchor.classList.add('review-comment-anchor-highlight');
      setTimeout(() => {
        anchor.classList.remove('review-comment-anchor-highlight');
      }, getAnimationDuration('LONG_HIGHLIGHT'));
      anchor.focus({ preventScroll: true });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('review-highlight-flash');
      setTimeout(() => {
        element.classList.remove('review-highlight-flash');
      }, getAnimationDuration('LONG_HIGHLIGHT'));
    }
  }

  private updateCommentHighlights(
    elementId: string | null,
    commentKey: string | undefined,
    source: 'hover' | 'composer'
  ): void {
    document
      .querySelectorAll<HTMLElement>('.review-comment-item')
      .forEach((item) =>
        item.classList.remove('review-comment-item-highlight')
      );

    if (!elementId) {
      return;
    }

    const items = document.querySelectorAll<HTMLElement>(
      `.review-comment-item[data-element-id="${elementId}"]`
    );

    if (commentKey) {
      items.forEach((item) => {
        if (item.dataset.commentKey === commentKey) {
          item.classList.add('review-comment-item-highlight');
        }
      });
    } else if (source === 'hover') {
      items.forEach((item) =>
        item.classList.add('review-comment-item-highlight')
      );
    }
  }

  public syncBadges(
    sections: SectionCommentSnapshot[],
    callbacks: CommentBadgeCallbacks
  ): void {
    this.badges?.syncIndicators(sections, callbacks);
  }

  public clearBadges(): void {
    this.badges?.clearAll();
  }

  public sanitizeInlineCommentArtifacts(element: HTMLElement): void {
    element
      .querySelectorAll<HTMLElement>('[data-critic-type="comment"]')
      .forEach((node) => {
        node.style.display = 'none';
        node.setAttribute('aria-hidden', 'true');
      });

    element
      .querySelectorAll<HTMLElement>('[data-critic-type="highlight"]')
      .forEach((node) => {
        node.classList.remove('review-comment-anchor');
        node.removeAttribute('data-comment-anchor');
        node.removeAttribute('tabindex');
        node.removeAttribute('role');
        node.style.backgroundColor = '';
      });
  }
}

export interface SectionCommentSnapshot {
  element: ReviewElement;
  matches: ReturnType<CommentsModule['parse']>;
}
