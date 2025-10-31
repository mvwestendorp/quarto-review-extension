import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommentComposer, type ComposerContext } from '@modules/ui/comments/CommentComposer';
import { MODULE_EVENTS } from '@modules/ui/shared';

describe('CommentComposer', () => {
  let composer: CommentComposer;
  let sidebarBody: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    composer = new CommentComposer();

    // Create sidebar body for insertion
    sidebarBody = document.createElement('div');
    sidebarBody.className = 'review-comments-sidebar-body';
    document.body.appendChild(sidebarBody);
  });

  afterEach(() => {
    composer.destroy();
  });

  describe('create', () => {
    it('creates composer element with proper structure', () => {
      const element = composer.create();

      expect(element).not.toBeNull();
      expect(element.className).toContain('review-comment-composer');
      expect(element.getAttribute('role')).toBe('dialog');
    });

    it('creates header with title and close button', () => {
      const element = composer.create();

      const header = element.querySelector('.review-comment-composer-header');
      expect(header).not.toBeNull();

      const title = header?.querySelector('h3');
      expect(title?.textContent).toBe('Add Comment');

      const closeBtn = header?.querySelector('.review-comment-composer-close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.getAttribute('aria-label')).toBe('Close composer');
    });

    it('creates textarea with proper attributes', () => {
      const element = composer.create();

      const textarea = element.querySelector('textarea');
      expect(textarea).not.toBeNull();
      expect(textarea?.className).toContain('review-comment-composer-textarea');
      expect(textarea?.getAttribute('placeholder')).toBe('Enter your comment...');
      expect(textarea?.getAttribute('rows')).toBe('4');
      expect(textarea?.getAttribute('aria-label')).toBe('Comment text');
    });

    it('creates footer with cancel and submit buttons', () => {
      const element = composer.create();

      const footer = element.querySelector('.review-comment-composer-footer');
      expect(footer).not.toBeNull();

      const cancelBtn = footer?.querySelector('.review-comment-composer-cancel-btn');
      expect(cancelBtn?.textContent).toBe('Cancel');

      const submitBtn = footer?.querySelector('.review-comment-composer-submit-btn');
      expect(submitBtn?.textContent).toBe('Post Comment');
    });
  });

  describe('open', () => {
    it('opens composer with context', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        elementLabel: 'Test section',
      };

      composer.open(context, sidebarBody);

      expect(composer.getIsOpen()).toBe(true);
      const element = composer.getElement();
      expect(element?.style.display).toBe('block');
      expect(element?.getAttribute('aria-hidden')).toBe('false');
    });

    it('shows "Add comment" for new comment', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const element = composer.getElement();
      const header = element?.querySelector('.review-comment-composer-header');
      expect(header?.textContent).toContain('Add comment');

      const submitBtn = element?.querySelector('[data-action="save"]');
      expect(submitBtn?.textContent).toContain('Add comment');
    });

    it('shows "Edit comment" when editing existing comment', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      composer.open(context, sidebarBody);

      const element = composer.getElement();
      const header = element?.querySelector('.review-comment-composer-header');
      expect(header?.textContent).toContain('Edit comment');

      const submitBtn = element?.querySelector('[data-action="save"]');
      expect(submitBtn?.textContent).toContain('Update comment');
    });

    it('populates textarea with existing comment', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Existing comment text',
      };

      composer.open(context, sidebarBody);

      const element = composer.getElement();
      const textarea = element?.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing comment text');
    });

    it('focuses textarea when opened', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const element = composer.getElement();
      const textarea = element?.querySelector('textarea') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(textarea);
    });

    it('prepends composer to sidebar body', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      expect(sidebarBody.firstElementChild).toBe(composer.getElement());
    });

    it('removes empty state message when opened', () => {
      const emptyState = document.createElement('div');
      emptyState.className = 'review-comments-empty';
      emptyState.textContent = 'No comments';
      sidebarBody.appendChild(emptyState);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      expect(sidebarBody.querySelector('.review-comments-empty')).toBeNull();
    });

    it('scrolls sidebar to top', () => {
      sidebarBody.style.overflow = 'auto';
      sidebarBody.style.height = '100px';
      const tallContent = document.createElement('div');
      tallContent.style.height = '500px';
      sidebarBody.appendChild(tallContent);
      sidebarBody.scrollTop = 100;

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      expect(sidebarBody.scrollTop).toBe(0);
    });

    it('emits COMMENT_COMPOSER_OPENED event', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_COMPOSER_OPENED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
        })
      );
    });

    it('closes previous composer before opening new one', () => {
      const context1: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      const context2: ComposerContext = {
        sectionId: 'section-2',
        elementId: 'elem-2',
      };

      composer.open(context1, sidebarBody);
      const firstTextarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      firstTextarea.value = 'Some text';

      composer.open(context2, sidebarBody);

      const secondTextarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      expect(secondTextarea.value).toBe('');
    });

    it('hides original comment item when editing', () => {
      const existingCommentItem = document.createElement('div');
      existingCommentItem.className = 'review-comment-item';
      existingCommentItem.setAttribute('data-element-id', 'elem-1');
      existingCommentItem.setAttribute('data-comment-key', 'elem-1:Old comment');
      sidebarBody.appendChild(existingCommentItem);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      composer.open(context, sidebarBody);

      expect(existingCommentItem.classList.contains('review-comment-item-hidden')).toBe(true);
    });

    it('shows element label in context line', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        elementLabel: 'Paragraph 3: Introduction',
      };

      composer.open(context, sidebarBody);

      const contextLine = composer.getElement()?.querySelector('.review-comment-composer-context');
      expect(contextLine?.textContent).toContain('Paragraph 3: Introduction');
    });
  });

  describe('close', () => {
    it('hides composer element', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);
      composer.close();

      const element = composer.getElement();
      expect(element?.style.display).toBe('none');
      expect(element?.getAttribute('aria-hidden')).toBe('true');
      expect(composer.getIsOpen()).toBe(false);
    });

    it('restores hidden comment item', () => {
      const existingCommentItem = document.createElement('div');
      existingCommentItem.className = 'review-comment-item';
      existingCommentItem.setAttribute('data-element-id', 'elem-1');
      existingCommentItem.setAttribute('data-comment-key', 'elem-1:0');
      sidebarBody.appendChild(existingCommentItem);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      composer.open(context, sidebarBody);
      composer.close();

      expect(existingCommentItem.classList.contains('review-comment-item-hidden')).toBe(false);
    });

    it('clears form content', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Some comment text';

      composer.close();

      expect(composer.getContent()).toBe('');
    });
  });

  describe('submit', () => {
    it('emits COMMENT_SUBMITTED event with content', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'My comment';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
          content: 'My comment',
          isEdit: false,
        })
      );
    });

    it('calls onSubmit callback if provided', () => {
      const onSubmitCallback = vi.fn();

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody, onSubmitCallback);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'My comment';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(onSubmitCallback).toHaveBeenCalledWith('My comment', context);
    });

    it('does not submit empty comment', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).not.toHaveBeenCalled();
      expect(composer.getIsOpen()).toBe(true); // Still open
    });

    it('trims whitespace from comment', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = '  My comment  \n\n  ';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'My comment',
        })
      );
    });

    it('sets isEdit flag when editing', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Updated comment';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isEdit: true,
        })
      );
    });

    it('closes composer after successful submit', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'My comment';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(composer.getIsOpen()).toBe(false);
    });
  });

  describe('cancel', () => {
    it('emits COMMENT_CANCELLED event', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_CANCELLED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const cancelBtn = composer.getElement()?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
        })
      );
    });

    it('calls onCancel callback if provided', () => {
      const onCancelCallback = vi.fn();
      composer.onCancel(onCancelCallback);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const cancelBtn = composer.getElement()?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(onCancelCallback).toHaveBeenCalled();
    });

    it('closes composer when cancelled', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const cancelBtn = composer.getElement()?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(composer.getIsOpen()).toBe(false);
    });

    it('cancels via close button', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_CANCELLED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const closeBtn = composer.getElement()?.querySelector('[data-action="close"]') as HTMLButtonElement;
      closeBtn.click();

      expect(eventListener).toHaveBeenCalled();
      expect(composer.getIsOpen()).toBe(false);
    });
  });

  describe('getContent', () => {
    it('returns current textarea content', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Test content';

      expect(composer.getContent()).toBe('Test content');
    });

    it('returns empty string when composer not created', () => {
      expect(composer.getContent()).toBe('');
    });

    it('trims whitespace from content', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = '  \n  Content  \n  ';

      expect(composer.getContent()).toBe('Content');
    });
  });

  describe('destroy', () => {
    it('removes element from DOM', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);
      const element = composer.getElement();

      composer.destroy();

      expect(document.body.contains(element)).toBe(false);
      expect(composer.getElement()).toBeNull();
    });

    it('clears all state', () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);
      composer.destroy();

      expect(composer.getIsOpen()).toBe(false);
      expect(composer.getContent()).toBe('');
    });

    it('clears event listeners', () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      composer.destroy();

      // Create new composer and try to trigger event
      composer = new CommentComposer();
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      composer.open(context, sidebarBody);

      const textarea = composer.getElement()?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'Comment';

      const submitBtn = composer.getElement()?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      // Old listener should not have been called
      expect(eventListener).not.toHaveBeenCalled();
    });
  });
});
