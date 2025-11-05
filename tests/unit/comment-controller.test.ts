import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type Mock,
} from 'vitest';
import { CommentController } from '@modules/ui/comments/CommentController';
import { MODULE_EVENTS } from '@modules/ui/shared';
import { getAnimationDuration } from '@modules/ui/constants';

type CommentMatch = {
  type: string;
  start: number;
  end: number;
  content: string;
};

const createMockConfig = () => {
  const contentStore = new Map<string, string>();
  contentStore.set(
    'section-1',
    'Paragraph content{>>existing comment<<}'
  );

  const parseMock = vi.fn((content: string): CommentMatch[] => {
    const matches: CommentMatch[] = [];
    let index = 0;
    const regex = /\{>>(.+?)<<?\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content))) {
      matches.push({
        type: 'comment',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
      index += 1;
    }
    return matches;
  });

  const createCommentMock = vi
    .fn()
    .mockImplementation((comment: string) => `{>>${comment}<<}`);

  const acceptMock = vi
    .fn()
    .mockImplementation((content: string, match: CommentMatch) => {
      return (
        content.slice(0, match.start) + content.slice(match.end)
      );
    });

  return {
    config: {
      changes: {
        getElementById: vi.fn().mockImplementation((id: string) => ({
          id,
          content: contentStore.get(id) ?? '',
          metadata: { type: 'Para' },
        })),
        getElementContent: vi
          .fn()
          .mockImplementation((id: string) => contentStore.get(id) ?? ''),
        edit: vi
          .fn()
          .mockImplementation((id: string, next: string) => {
            contentStore.set(id, next);
          }),
      },
      comments: {
        parse: parseMock,
        createComment: createCommentMock,
        accept: acceptMock,
        getCommentsForElement: vi.fn().mockReturnValue([]),
        addComment: vi.fn().mockReturnValue({ id: 'comment-1', elementId: 'elem-1', content: 'Test', userId: 'user-1', timestamp: Date.now(), resolved: false, type: 'comment' }),
        updateComment: vi.fn().mockReturnValue(true),
        deleteComment: vi.fn().mockReturnValue(true),
      },
      markdown: {
        renderSync: vi.fn(),
      },
    },
    store: contentStore,
    parseMock,
    createCommentMock,
    acceptMock,
  };
};

const createMocks = () => {
  const sidebarElement = document.createElement('div');
  sidebarElement.className = 'review-comments-sidebar';
  const body = document.createElement('div');
  body.className = 'review-comments-sidebar-content';
  sidebarElement.appendChild(body);

  const sidebar = {
    getElement: vi.fn().mockReturnValue(sidebarElement),
    getIsVisible: vi.fn().mockReturnValue(true),
    updateSections: vi.fn(),
    toggle: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    destroy: vi.fn(),
  };

  const composer = {
    on: vi.fn(),
    close: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  };

  const badges = {
    refresh: vi.fn(),
    syncIndicators: vi.fn(),
    destroy: vi.fn(),
  };

  const callbacks = {
    requestRefresh: vi.fn(),
    ensureSidebarVisible: vi.fn(),
    showNotification: vi.fn(),
    onComposerClosed: vi.fn(),
  };

  return { sidebar, composer, badges, callbacks, sidebarElement, body };
};

const attachController = () => {
  const configBundle = createMockConfig();
  const mocks = createMocks();
  const controller = new CommentController({
    config: configBundle.config as any,
    commentState: {
      activeSelection: null,
      activeHighlightElements: new Map(),
      activeCommentComposer: null,
      activeComposerInsertionAnchor: null,
      activeComposerOriginalItem: null,
    },
    sidebar: mocks.sidebar as any,
    composer: mocks.composer as any,
    badges: mocks.badges as any,
    callbacks: mocks.callbacks,
  });

  return { controller, configBundle, mocks };
};

describe('CommentController section comment caching', () => {
beforeEach(() => {
  document.body.innerHTML = `
      <div class="review-main">
        <div data-review-id="section-1" class="review-editable">Paragraph content</div>
      </div>
    `;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

  it('adds comment to CommentsModule storage', () => {
    const { controller, configBundle, mocks } = attachController();

    controller['addSectionComment']('section-1', 'new comment');

    // Should call addComment on CommentsModule instead of changes.edit
    expect(configBundle.config.comments.addComment).toHaveBeenCalledWith(
      'section-1',
      'new comment',
      'anonymous',
      'comment'
    );
    // Should show success notification
    expect(mocks.callbacks.showNotification).toHaveBeenCalledWith(
      'Comment added successfully',
      'success'
    );
  });

  it('updates existing comment in CommentsModule storage', () => {
    const { controller, configBundle, mocks } = attachController();

    // Update comment by ID (new signature)
    controller['updateSectionComment']('comment-1', 'updated text');

    // Should call updateComment on CommentsModule instead of changes.edit
    expect(configBundle.config.comments.updateComment).toHaveBeenCalledWith(
      'comment-1',
      'updated text'
    );
    // Should show success notification
    expect(mocks.callbacks.showNotification).toHaveBeenCalledWith(
      'Comment updated',
      'success'
    );
  });

  it('removes comment from CommentsModule storage', () => {
    const { controller, configBundle, mocks } = attachController();

    // Remove comment by ID (new signature)
    controller.removeComment('comment-1');

    // Should call deleteComment on CommentsModule instead of changes.edit
    expect(configBundle.config.comments.deleteComment).toHaveBeenCalledWith(
      'comment-1'
    );
    // Should trigger refresh and notifications
    expect(mocks.callbacks.requestRefresh).toHaveBeenCalled();
    expect(mocks.callbacks.ensureSidebarVisible).toHaveBeenCalled();
    expect(mocks.callbacks.showNotification).toHaveBeenCalledWith(
      'Comment removed',
      'success'
    );
  });

  it('handles comment submission and adds to CommentsModule', () => {
    const { controller, configBundle, mocks } = attachController();

    const composerHandlers =
      (mocks.composer.on as Mock).mock.calls as Array<
        [symbol, (detail?: unknown) => void]
      >;
    const submitHandler = composerHandlers.find(
      (call) => call[0] === MODULE_EVENTS.COMMENT_SUBMITTED
    )?.[1];

    expect(typeof submitHandler).toBe('function');
    submitHandler?.({
      elementId: 'section-1',
      content: 'submitted comment',
      isEdit: false,
    });

    // Should call addComment on CommentsModule
    expect(configBundle.config.comments.addComment).toHaveBeenCalledWith(
      'section-1',
      'submitted comment',
      'anonymous',
      'comment'
    );
    // Should show success notification
    expect(mocks.callbacks.showNotification).toHaveBeenCalledWith(
      'Comment added successfully',
      'success'
    );
  });

  it('highlights comment sections and sanitizes inline artifacts', () => {
    const { controller, mocks } = attachController();
    document.body.appendChild(mocks.sidebarElement);
    const section = document.querySelector(
      '[data-review-id="section-1"]'
    ) as HTMLElement;

    const criticComment = document.createElement('span');
    criticComment.dataset.criticType = 'comment';
    section.appendChild(criticComment);

    const criticHighlight = document.createElement('span');
    criticHighlight.dataset.criticType = 'highlight';
    criticHighlight.dataset.commentAnchor = 'section-1:0';
    criticHighlight.tabIndex = 0;
    criticHighlight.setAttribute('role', 'button');
    section.appendChild(criticHighlight);

    const commentItem = document.createElement('div');
    commentItem.className = 'review-comment-item';
    commentItem.dataset.elementId = 'section-1';
    commentItem.dataset.commentKey = 'section-1:0';
    mocks.body.appendChild(commentItem);

    controller.highlightSection('section-1', 'hover', 'section-1:0');

    expect(section.classList.contains('review-comment-section-highlight')).toBe(
      true
    );
    expect(commentItem.classList.contains('review-comment-item-highlight')).toBe(
      true
    );
    expect(criticComment.style.display).toBe('none');
    expect(criticComment.getAttribute('aria-hidden')).toBe('true');
    expect(criticHighlight.getAttribute('data-comment-anchor')).toBeNull();
    expect(criticHighlight.classList.contains('review-comment-anchor')).toBe(
      false
    );
    mocks.sidebarElement.remove();
  });

  it('clears highlight state based on source prioritisation', () => {
    const { controller } = attachController();
    const section = document.querySelector(
      '[data-review-id="section-1"]'
    ) as HTMLElement;

    controller.highlightSection('section-1', 'composer', 'section-1:0');
    expect(section.classList.contains('review-comment-section-highlight')).toBe(
      true
    );

    controller.clearHighlight('composer');
    expect(section.classList.contains('review-comment-section-highlight')).toBe(
      false
    );

    controller.highlightSection('section-1', 'hover');
    expect(section.classList.contains('review-comment-section-highlight')).toBe(
      true
    );
    controller.clearHighlight('hover');
    expect(section.classList.contains('review-comment-section-highlight')).toBe(
      false
    );
  });

  it('focuses comment anchors and removes highlight after animation duration', () => {
    vi.useFakeTimers();
    const { controller } = attachController();
    const section = document.querySelector(
      '[data-review-id="section-1"]'
    ) as HTMLElement;
    const anchor = document.createElement('span');
    anchor.dataset.commentAnchor = 'section-1:0';
    anchor.scrollIntoView = vi.fn();
    section.appendChild(anchor);

    controller.focusCommentAnchor('section-1', 'section-1:0');

    expect(anchor.classList.contains('review-comment-anchor-highlight')).toBe(
      true
    );

    vi.advanceTimersByTime(getAnimationDuration('LONG_HIGHLIGHT'));
    vi.advanceTimersByTime(getAnimationDuration('LONG_HIGHLIGHT'));

    expect(anchor.classList.contains('review-comment-anchor-highlight')).toBe(
      false
    );
    vi.useRealTimers();
  });
});
