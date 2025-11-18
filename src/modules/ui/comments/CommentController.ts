import type { CommentState } from '../shared';
import { MODULE_EVENTS } from '../shared';
import type { CommentsModule } from '@modules/comments';
import type { ChangesModule } from '@modules/changes';
import type { MarkdownModule } from '@modules/markdown';
import type { CommentComposer } from './CommentComposer';
import type { CommentsSidebar } from './CommentsSidebar';
import type { MarginComments } from './MarginComments';
import type { CommentBadges, CommentBadgeCallbacks } from './CommentBadges';
import type { Element as ReviewElement } from '@/types';
import { getAnimationDuration } from '../constants';
import { addClass, removeClass } from '@utils/dom-helpers';

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
  persistDocument?: () => void;
  getUserId?: () => string;
}

interface CommentComposerContext {
  elementId: string;
  existingComment?: string;
  commentKey?: string;
  commentId?: string;
}

export class CommentController {
  private config: CommentControllerConfig;
  private commentState: CommentState;
  private sidebar: CommentsSidebar | null;
  private marginComments: MarginComments | null;
  private composer: CommentComposer | null;
  private badges: CommentBadges | null;
  private callbacks: CommentControllerCallbacks;

  constructor(options: {
    config: CommentControllerConfig;
    commentState: CommentState;
    sidebar: CommentsSidebar | null;
    marginComments?: MarginComments | null;
    composer: CommentComposer | null;
    badges: CommentBadges | null;
    callbacks: CommentControllerCallbacks;
  }) {
    this.config = options.config;
    this.commentState = options.commentState;
    this.sidebar = options.sidebar;
    this.marginComments = options.marginComments ?? null;
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

  public async openComposer(context: CommentComposerContext): Promise<void> {
    if (!this.composer) return;

    this.closeComposer();

    const element = this.config.changes.getElementById(context.elementId);
    const elementLabel = element
      ? this.getElementLabel(element.content, element.metadata.type)
      : 'Document section';

    const existingCommentContent = context.existingComment;

    // CommentComposer now handles its own DOM insertion as a floating modal
    // No need to pass sidebar body - it appends to document.body
    await this.composer.open(
      {
        sectionId: context.elementId,
        elementId: context.elementId,
        existingComment: existingCommentContent,
        elementLabel,
        commentId: context.commentId,
      },
      document.body // Pass document.body since composer will find or create its container
    );

    const composerElement = document.querySelector(
      '.review-comment-composer'
    ) as HTMLElement | null;
    if (composerElement) {
      composerElement.dataset.elementId = context.elementId;
      composerElement.dataset.commentKey = context.commentKey ?? '';
      if (context.commentId) {
        composerElement.dataset.commentId = context.commentId;
      }
      this.commentState.activeCommentComposer = composerElement;
      // Note: insertion anchor is no longer relevant for floating modal
      this.commentState.activeComposerInsertionAnchor = null;
    }

    // Hide original comment item while editing (if it exists in sidebar)
    if (context.commentKey && this.sidebar) {
      const sidebarElement = this.sidebar.getElement();
      if (sidebarElement) {
        const originalItem = sidebarElement.querySelector<HTMLElement>(
          `.review-comment-item[data-comment-key="${context.commentKey}"]`
        );
        if (originalItem) {
          addClass(originalItem, 'review-comment-item-hidden');
          this.commentState.activeComposerOriginalItem = originalItem;
        }
      }
    }
  }

  public closeComposer(): void {
    this.composer?.close();

    if (this.commentState.activeCommentComposer) {
      this.commentState.activeCommentComposer.remove();
      this.commentState.activeCommentComposer = null;
    }

    this.commentState.activeComposerInsertionAnchor = null;

    if (this.commentState.activeComposerOriginalItem) {
      removeClass(
        this.commentState.activeComposerOriginalItem,
        'review-comment-item-hidden'
      );
      this.commentState.activeComposerOriginalItem = null;
    }

    this.callbacks.onComposerClosed?.();
    this.clearHighlight('composer');
  }

  public handleSubmission(detail: any): void {
    const { elementId, content, isEdit, commentId } = detail ?? {};
    if (!elementId || typeof content !== 'string') {
      return;
    }

    if (isEdit && commentId) {
      this.updateSectionComment(commentId, content);
    } else {
      this.addSectionComment(elementId, content);
    }

    this.closeComposer();
  }

  public removeComment(commentId: string): void {
    try {
      // Delete comment from CommentsModule (not from content)
      const success = this.config.comments.deleteComment(commentId);

      if (!success) {
        this.callbacks.showNotification('Comment not found', 'error');
        return;
      }

      this.callbacks.requestRefresh();
      // Show sidebar after refresh completes (sidebar will show remaining comments or empty state)
      this.callbacks.ensureSidebarVisible?.();
      this.callbacks.persistDocument?.();
      this.callbacks.showNotification('Comment removed', 'success');
    } catch (error) {
      console.error('Failed to remove comment:', error);
      this.callbacks.showNotification('Failed to remove comment', 'error');
    }
  }

  private addSectionComment(elementId: string, comment: string): void {
    try {
      // Get userId from callback or use anonymous
      const userId = this.callbacks.getUserId?.() ?? 'anonymous';

      // Store comment in CommentsModule (not in content)
      this.config.comments.addComment(elementId, comment, userId, 'comment');

      this.callbacks.requestRefresh();
      // Show sidebar after refresh completes
      this.callbacks.ensureSidebarVisible?.();
      this.callbacks.persistDocument?.();
      window.getSelection()?.removeAllRanges();
      this.callbacks.showNotification('Comment added successfully', 'success');
    } catch (error) {
      console.error('Failed to add section comment:', error);
      this.callbacks.showNotification('Failed to add comment', 'error');
    }
  }

  private updateSectionComment(commentId: string, content: string): void {
    try {
      // Update comment in CommentsModule (not in content)
      const success = this.config.comments.updateComment(commentId, content);

      if (!success) {
        this.callbacks.showNotification('Comment not found', 'error');
        return;
      }

      this.callbacks.requestRefresh();
      // Show sidebar after refresh completes
      this.callbacks.ensureSidebarVisible?.();
      this.callbacks.persistDocument?.();
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

    const snapshots: SectionCommentSnapshot[] = [];

    rawState.forEach((element) => {
      // Get comments from CommentsModule storage instead of parsing content
      const comments = this.config.comments.getCommentsForElement(element.id);

      if (comments.length > 0) {
        snapshots.push({ element, comments });
      }
    });

    return snapshots;
  }

  public getCommentCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    this.getSectionComments().forEach(({ element, comments }) => {
      counts.set(element.id, comments.length);
    });
    return counts;
  }

  public refreshUI(options: { showSidebar?: boolean }): void {
    const sections = this.getSectionComments();

    if (options.showSidebar) {
      this.sidebar?.show();
    }

    const commentCallbacks = {
      onNavigate: (elementId: string, commentKey: string) => {
        this.focusCommentAnchor(elementId, commentKey);
      },
      onRemove: (_elementId: string, comment: any) => {
        this.removeComment(comment.id);
        this.clearHighlight();
      },
      onEdit: (elementId: string, comment: any) => {
        // Use inline editing for MarginComments, fallback to composer for sidebar
        if (this.marginComments) {
          // Inline editing handled by MarginComments itself
          // No need to call anything here as it's triggered directly from the component
        } else {
          this.openComposer({
            elementId,
            existingComment: comment.content,
            commentId: comment.id,
            commentKey: `${elementId}:${comment.id}`,
          });
        }
      },
      onSaveEdit: (_elementId: string, commentId: string, content: string) => {
        this.updateSectionComment(commentId, content);
      },
      onCancelEdit: () => {
        // Nothing special needed on cancel
      },
      onHover: (elementId: string, commentKey: string) => {
        this.highlightSection(elementId, 'hover', commentKey);
        this.marginComments?.highlightComment(elementId, commentKey);
      },
      onLeave: () => {
        this.clearHighlight('hover');
        this.marginComments?.clearHighlights();
      },
    };

    // Update sidebar (if present)
    this.sidebar?.updateSections(sections, commentCallbacks);

    // Update margin comments (if present)
    this.marginComments?.updateSections(sections, commentCallbacks);

    this.badges?.syncIndicators(sections, {
      onShowComments: (elementId, commentKey) => {
        this.sidebar?.show();
        if (commentKey) {
          this.focusCommentAnchor(elementId, commentKey);
          this.marginComments?.highlightComment(elementId, commentKey);
        } else {
          this.highlightSection(elementId, 'hover');
          this.marginComments?.highlightComment(elementId);
        }
      },
      onOpenComposer: (elementId, comment) => {
        this.openComposer({
          elementId,
          existingComment: comment?.content,
          commentKey: comment ? `${elementId}:${comment.id}` : undefined,
          commentId: comment?.id,
        });
      },
      onHover: (_elementId) => {
        this.highlightSection(_elementId, 'hover');
        this.marginComments?.highlightComment(_elementId);
      },
      onLeave: () => {
        this.clearHighlight('hover');
        this.marginComments?.clearHighlights();
      },
    });
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
      removeClass(
        this.commentState.activeHighlightedSection,
        'review-comment-section-highlight'
      );
    }

    this.commentState.activeHighlightedSection = element;
    this.commentState.highlightedBy = source;
    addClass(element, 'review-comment-section-highlight');

    this.updateCommentHighlights(elementId, commentKey, source);

    if (this.commentState.activeCommentComposer) {
      const isComposerElement =
        this.commentState.activeCommentComposer.dataset.elementId === elementId;
      if (source === 'composer' && isComposerElement) {
        addClass(
          this.commentState.activeCommentComposer,
          'review-comment-composer-active'
        );
      } else if (source === 'hover') {
        removeClass(
          this.commentState.activeCommentComposer,
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
      removeClass(
        this.commentState.activeHighlightedSection,
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
      removeClass(
        this.commentState.activeCommentComposer,
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
      addClass(anchor, 'review-comment-anchor-highlight');
      setTimeout(() => {
        removeClass(anchor, 'review-comment-anchor-highlight');
      }, getAnimationDuration('LONG_HIGHLIGHT'));
      anchor.focus({ preventScroll: true });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addClass(element, 'review-highlight-flash');
      setTimeout(() => {
        removeClass(element, 'review-highlight-flash');
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
      .forEach((item) => removeClass(item, 'review-comment-item-highlight'));

    if (!elementId) {
      return;
    }

    const items = document.querySelectorAll<HTMLElement>(
      `.review-comment-item[data-element-id="${elementId}"]`
    );

    if (commentKey) {
      items.forEach((item) => {
        if (item.dataset.commentKey === commentKey) {
          addClass(item, 'review-comment-item-highlight');
        }
      });
    } else if (source === 'hover') {
      items.forEach((item) => addClass(item, 'review-comment-item-highlight'));
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
        removeClass(node, 'review-comment-anchor');
        node.removeAttribute('data-comment-anchor');
        node.removeAttribute('tabindex');
        node.removeAttribute('role');
        node.style.backgroundColor = '';
      });
  }
}

export interface SectionCommentSnapshot {
  element: ReviewElement;
  comments: ReturnType<CommentsModule['getCommentsForElement']>;
}
