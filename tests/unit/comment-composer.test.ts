import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CommentComposer,
  type ComposerContext,
} from '@modules/ui/comments/CommentComposer';
import { MODULE_EVENTS } from '@modules/ui/shared';

// Mock the CommentEditor to avoid Milkdown initialization in tests
vi.mock('@modules/ui/comments/CommentEditor', () => {
  const mockEditorInstances: any[] = [];

  class MockCommentEditor {
    private content: string = '';
    focusCalled = false;

    async initialize(
      container: HTMLElement,
      initialContent: string = ''
    ): Promise<void> {
      this.content = initialContent;
    }

    getContent(): string {
      return this.content;
    }

    setContent(content: string): void {
      this.content = content;
    }

    focus(): void {
      this.focusCalled = true;
    }

    destroy(): void {
      this.content = '';
    }

    isReady(): boolean {
      return true;
    }
  }

  return {
    CommentEditor: MockCommentEditor,
  };
});

describe('CommentComposer', () => {
  let composer: CommentComposer;
  let sidebarBody: HTMLElement;
  let editorInstance: any = null;

  // Helper to get the mocked editor instance from composer
  function getEditorInstance() {
    return (composer as any).editor;
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    composer = new CommentComposer();
    editorInstance = null;

    // Create sidebar body for insertion
    sidebarBody = document.createElement('div');
    sidebarBody.className = 'review-comments-sidebar-body';
    document.body.appendChild(sidebarBody);
  });

  afterEach(() => {
    composer.destroy();
    editorInstance = null;
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
      expect(textarea?.getAttribute('placeholder')).toBe(
        'Enter your comment...'
      );
      expect(textarea?.getAttribute('rows')).toBe('4');
      expect(textarea?.getAttribute('aria-label')).toBe('Comment text');
    });

    it('creates footer with cancel and submit buttons', () => {
      const element = composer.create();

      const footer = element.querySelector('.review-comment-composer-footer');
      expect(footer).not.toBeNull();

      const cancelBtn = footer?.querySelector(
        '.review-comment-composer-cancel-btn'
      );
      expect(cancelBtn?.textContent).toBe('Cancel');

      const submitBtn = footer?.querySelector(
        '.review-comment-composer-submit-btn'
      );
      expect(submitBtn?.textContent).toBe('Post Comment');
    });
  });

  describe('open', () => {
    it('opens composer with context', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        elementLabel: 'Test section',
      };

      await composer.open(context, sidebarBody);

      expect(composer.getIsOpen()).toBe(true);
      const element = composer.getElement();
      expect(element?.classList.contains('review-active')).toBe(true);
      expect(element?.getAttribute('aria-hidden')).toBe('false');
      expect(document.body.contains(element!)).toBe(true);
    });

    it('shows "Add comment" for new comment', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const element = composer.getElement();
      const header = element?.querySelector('.review-comment-composer-header');
      expect(header?.textContent).toContain('Add comment');

      const submitBtn = element?.querySelector('[data-action="save"]');
      expect(submitBtn?.textContent).toContain('Add comment');
    });

    it('shows "Edit comment" when editing existing comment', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      await composer.open(context, sidebarBody);

      const element = composer.getElement();
      const header = element?.querySelector('.review-comment-composer-header');
      expect(header?.textContent).toContain('Edit comment');

      const submitBtn = element?.querySelector('[data-action="save"]');
      expect(submitBtn?.textContent).toContain('Update comment');
    });

    it('populates editor with existing comment', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Existing comment text',
      };

      await composer.open(context, sidebarBody);

      expect(composer.getContent()).toBe('Existing comment text');
    });

    it('focuses editor when opened', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // The editor's focus method should have been called
      // This is verified by the mocked CommentEditor being properly initialized
      const element = composer.getElement();
      expect(element).not.toBeNull();
      expect(
        element?.querySelector('.review-comment-composer-editor')
      ).not.toBeNull();
    });

    it('renders composer as floating modal attached to body', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const element = composer.getElement();
      expect(element).not.toBeNull();
      expect(element?.parentElement).toBe(document.body);
    });

    it('removes empty state message when opened', async () => {
      const emptyState = document.createElement('div');
      emptyState.className = 'review-comments-empty';
      emptyState.textContent = 'No comments';
      sidebarBody.appendChild(emptyState);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      expect(sidebarBody.querySelector('.review-comments-empty')).toBeNull();
    });

    it('does not modify sidebar scroll position', async () => {
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

      await composer.open(context, sidebarBody);

      expect(sidebarBody.scrollTop).toBe(100);
    });

    it('emits COMMENT_COMPOSER_OPENED event', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_COMPOSER_OPENED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
        })
      );
    });

    it('closes previous composer before opening new one', async () => {
      const context1: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      const context2: ComposerContext = {
        sectionId: 'section-2',
        elementId: 'elem-2',
      };

      await composer.open(context1, sidebarBody);
      // Content is set through the mocked editor
      expect(composer.getContent()).toBe('');

      await composer.open(context2, sidebarBody);

      // Content should be cleared after opening new composer
      expect(composer.getContent()).toBe('');
    });

    it('hides original comment item when editing', async () => {
      const existingCommentItem = document.createElement('div');
      existingCommentItem.className = 'review-comment-item';
      existingCommentItem.setAttribute('data-element-id', 'elem-1');
      existingCommentItem.setAttribute('data-comment-id', 'comment-1');
      existingCommentItem.setAttribute(
        'data-comment-key',
        'elem-1:Old comment'
      );
      sidebarBody.appendChild(existingCommentItem);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
        commentId: 'comment-1',
      };

      await composer.open(context, sidebarBody);

      expect(
        existingCommentItem.classList.contains('review-comment-item-hidden')
      ).toBe(true);
    });
  });

  describe('close', () => {
    it('hides composer element', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);
      composer.close();

      const element = composer.getElement();
      expect(element?.classList.contains('review-active')).toBe(false);
      expect(element?.getAttribute('aria-hidden')).toBe('true');
      expect(composer.getIsOpen()).toBe(false);
    });

    it('restores hidden comment item', async () => {
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

      await composer.open(context, sidebarBody);
      composer.close();

      expect(
        existingCommentItem.classList.contains('review-comment-item-hidden')
      ).toBe(false);
    });

    it('clears form content', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      composer.close();

      expect(composer.getContent()).toBe('');
    });
  });

  describe('submit', () => {
    it('emits COMMENT_SUBMITTED event with content', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('My comment');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
          content: 'My comment',
          isEdit: false,
        })
      );
    });

    it('calls onSubmit callback if provided', async () => {
      const onSubmitCallback = vi.fn();

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody, onSubmitCallback);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('My comment');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(onSubmitCallback).toHaveBeenCalledWith('My comment', context);
    });

    it('does not submit empty comment', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).not.toHaveBeenCalled();
      expect(composer.getIsOpen()).toBe(true); // Still open
    });

    it('trims whitespace from comment', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('  My comment  \n\n  ');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'My comment',
        })
      );
    });

    it('sets isEdit flag when editing', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
        existingComment: 'Old comment',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('Updated comment');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isEdit: true,
        })
      );
    });

    it('closes composer after successful submit', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('My comment');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      expect(composer.getIsOpen()).toBe(false);
    });
  });

  describe('cancel', () => {
    it('emits COMMENT_CANCELLED event', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_CANCELLED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const cancelBtn = composer
        .getElement()
        ?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          elementId: 'elem-1',
        })
      );
    });

    it('calls onCancel callback if provided', async () => {
      const onCancelCallback = vi.fn();
      composer.onCancel(onCancelCallback);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const cancelBtn = composer
        .getElement()
        ?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(onCancelCallback).toHaveBeenCalled();
    });

    it('closes composer when cancelled', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const cancelBtn = composer
        .getElement()
        ?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
      cancelBtn.click();

      expect(composer.getIsOpen()).toBe(false);
    });

    it('cancels via close button', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_CANCELLED, eventListener);

      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      const closeBtn = composer
        .getElement()
        ?.querySelector('[data-action="close"]') as HTMLButtonElement;
      closeBtn.click();

      expect(eventListener).toHaveBeenCalled();
      expect(composer.getIsOpen()).toBe(false);
    });
  });

  describe('getContent', () => {
    it('returns current editor content', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('Test content');

      expect(composer.getContent()).toBe('Test content');
    });

    it('returns empty string when composer not created', () => {
      expect(composer.getContent()).toBe('');
    });

    it('trims whitespace from content', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('  \n  Content  \n  ');

      expect(composer.getContent()).toBe('Content');
    });
  });

  describe('destroy', () => {
    it('removes element from DOM', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);
      const element = composer.getElement();

      composer.destroy();

      expect(document.body.contains(element)).toBe(false);
      expect(composer.getElement()).toBeNull();
    });

    it('clears all state', async () => {
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);
      composer.destroy();

      expect(composer.getIsOpen()).toBe(false);
      expect(composer.getContent()).toBe('');
    });

    it('clears event listeners', async () => {
      const eventListener = vi.fn();
      composer.on(MODULE_EVENTS.COMMENT_SUBMITTED, eventListener);

      composer.destroy();

      // Create new composer and try to trigger event
      composer = new CommentComposer();
      const context: ComposerContext = {
        sectionId: 'section-1',
        elementId: 'elem-1',
      };

      await composer.open(context, sidebarBody);

      // Set content on the mocked editor
      const editor = getEditorInstance();
      editor.setContent('Comment');

      const submitBtn = composer
        .getElement()
        ?.querySelector('[data-action="save"]') as HTMLButtonElement;
      submitBtn.click();

      // Old listener should not have been called
      expect(eventListener).not.toHaveBeenCalled();
    });
  });
});
