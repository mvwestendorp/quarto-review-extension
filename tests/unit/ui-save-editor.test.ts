import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UIConfig } from '@modules/ui';
import { UIModule } from '@modules/ui';
import { MarkdownModule } from '@modules/markdown';

const {
  getCommentControllerStub,
  resetCommentControllerStub,
  CommentControllerMock,
  MainSidebarMock,
} = vi.hoisted(() => {
  const createCommentControllerStub = () => ({
    consumeSectionCommentMarkup: vi.fn(),
    cacheSectionCommentMarkup: vi.fn(),
    clearSectionCommentMarkup: vi.fn(),
    clearSectionCommentMarkupFor: vi.fn(),
    extractSectionComments: vi
      .fn()
      .mockReturnValue({ content: '', commentMarkup: null }),
    appendSectionComments: vi.fn(
      (content: string, markup: string) => content + markup
    ),
    clearHighlight: vi.fn(),
    refreshUI: vi.fn(),
  });

  let currentStub: ReturnType<typeof createCommentControllerStub> | null = null;

  const CommentControllerMock = vi.fn(function MockCommentController() {
    currentStub = createCommentControllerStub();
    return currentStub;
  });

  const resetCommentControllerStub = () => {
    currentStub = null;
    CommentControllerMock.mockImplementation(function MockCommentController() {
      currentStub = createCommentControllerStub();
      return currentStub;
    });
  };

  const MainSidebarMock = vi.fn(function MockMainSidebar() {
    return {
      create: vi.fn().mockImplementation(() => {
        const element = document.createElement('div');
        element.className = 'review-toolbar review-persistent-sidebar';
        return element;
      }),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onTrackedChangesToggle: vi.fn(),
      onShowComments: vi.fn(),
      onToggleSidebar: vi.fn(),
      setCollapsed: vi.fn(),
      setTrackedChangesVisible: vi.fn(),
      updateUndoRedoState: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
      destroy: vi.fn(),
    };
  });

  return {
    getCommentControllerStub: () => currentStub,
    resetCommentControllerStub,
    CommentControllerMock,
    MainSidebarMock,
  };
});

vi.mock('@modules/ui/comments/CommentController', () => ({
  CommentController: CommentControllerMock,
}));

vi.mock('@modules/ui/sidebars/MainSidebar', () => ({
  MainSidebar: MainSidebarMock,
}));

vi.mock('@modules/ui/comments/CommentsSidebar', () => ({
  CommentsSidebar: vi.fn(function MockCommentsSidebar(this: unknown) {
    const element = document.createElement('div');
    element.className = 'review-comments-sidebar';
    const content = document.createElement('div');
    content.className = 'review-comments-sidebar-content';
    element.appendChild(content);
    return {
      getElement: vi.fn().mockReturnValue(element),
      getIsVisible: vi.fn().mockReturnValue(false),
      updateSections: vi.fn(),
      toggle: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/comments/CommentComposer', () => ({
  CommentComposer: vi.fn(function MockCommentComposer(this: unknown) {
    return {
      on: vi.fn(),
      close: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/comments/CommentBadges', () => ({
  CommentBadges: vi.fn(function MockCommentBadges(this: unknown) {
    return {
      refresh: vi.fn(),
      syncIndicators: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/sidebars/ContextMenuCoordinator', () => ({
  ContextMenuCoordinator: vi.fn(function MockContextMenuCoordinator() {
    return {
      close: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/editor/EditorLifecycle', () => ({
  EditorLifecycle: vi.fn(function MockEditorLifecycle() {
    return {
      initialize: vi.fn(),
      destroy: vi.fn(),
      getEditor: vi.fn().mockReturnValue(null),
    };
  }),
}));

vi.mock('@modules/ui/editor/EditorToolbar', () => ({
  EditorToolbar: vi.fn(function MockEditorToolbar() {
    return {
      setEditor: vi.fn(),
      setElementType: vi.fn(),
      create: vi.fn().mockReturnValue(document.createElement('div')),
      attachHandlers: vi.fn(),
      updateState: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/editor/EditorHistoryStorage', () => ({
  EditorHistoryStorage: vi.fn(function MockEditorHistoryStorage() {
    return {
      save: vi.fn(),
      get: vi.fn().mockReturnValue({
        elementId: '',
        states: [],
        lastUpdated: Date.now(),
      }),
      list: vi.fn().mockReturnValue([]),
      clear: vi.fn(),
      clearAll: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/change-summary', () => ({
  ChangeSummaryDashboard: vi.fn(function MockChangeSummaryDashboard() {
    return {
      destroy: vi.fn(),
    };
  }),
}));

const createStubConfig = (
  contentStore: Map<string, string>
): UIConfig & { changeMocks: { [key: string]: ReturnType<typeof vi.fn> } } => {
  const changeMocks = {
    replaceElementWithSegments: vi.fn(),
  };

  const markdownModule = new MarkdownModule();

  return {
    changes: {
      getElementById: vi.fn().mockImplementation((id: string) => ({
        id,
        metadata: { type: 'Para' },
      })),
      getElementContent: vi
        .fn()
        .mockImplementation((id: string) => contentStore.get(id) ?? ''),
      getElementContentWithTrackedChanges: vi.fn().mockReturnValue(''),
      replaceElementWithSegments: changeMocks.replaceElementWithSegments,
      getCurrentState: vi.fn().mockReturnValue([]),
      getOperations: vi.fn().mockReturnValue([]),
      initializeFromDOM: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
    } as any,
    markdown: {
      render: vi.fn((input) => markdownModule.render(input)),
      renderSync: vi.fn((input) => markdownModule.renderSync(input)),
      parseToAST: vi.fn((input) => markdownModule.parseToAST(input)),
    } as any,
    comments: {
      parse: vi.fn().mockReturnValue([]),
      createComment: vi.fn().mockReturnValue('{>>comment<<}'),
      accept: vi.fn().mockReturnValue(''),
      refresh: vi.fn(),
    } as any,
    inlineEditing: false,
    changeMocks,
  } as any;
};

describe('UIModule.saveEditor comment handling', () => {
  beforeEach(() => {
    resetCommentControllerStub();
    CommentControllerMock.mockClear();
    document.body.innerHTML = '';
    MainSidebarMock.mockClear();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears cached markup and removed segments when nothing is cached', () => {
    const contentStore = new Map<string, string>([
      ['section-1', 'Original content'],
    ]);
    const config = createStubConfig(contentStore);
    const ui = new UIModule(config as UIConfig);
    const commentStub = getCommentControllerStub();
    if (!commentStub) {
      throw new Error('Comment controller stub not initialized');
    }

    commentStub.consumeSectionCommentMarkup.mockReturnValue(undefined);
    commentStub.extractSectionComments.mockReturnValue({
      content: 'Original content',
      commentMarkup: null,
    });

    (ui as any).segmentContentIntoElements = vi.fn().mockReturnValue([
      { content: 'Updated content', metadata: { type: 'Para' } },
    ]);
    (ui as any).ensureSegmentDom = vi.fn();
    (ui as any).updateHeadingReferencesAfterSave = vi.fn();
    (ui as any).closeEditor = vi.fn();
    (ui as any).refresh = vi.fn();

    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1'],
      removedIds: ['obsolete-1'],
    });

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = 'Updated content';
    (ui as any).editorState.milkdownEditor = {} as any;

    (ui as any).saveEditor();

    expect(commentStub.consumeSectionCommentMarkup).toHaveBeenCalledWith(
      'section-1'
    );
    expect(commentStub.clearSectionCommentMarkup).toHaveBeenCalledWith(
      'section-1'
    );
    expect(commentStub.clearSectionCommentMarkupFor).toHaveBeenCalledWith([
      'obsolete-1',
    ]);
    expect(commentStub.cacheSectionCommentMarkup).not.toHaveBeenCalled();
  });

  it('re-caches markup on the new segment when cached markup exists', () => {
    const contentStore = new Map<string, string>([
      ['section-1', 'Original content {>>existing<<}'],
    ]);
    const config = createStubConfig(contentStore);
    const ui = new UIModule(config as UIConfig);
    const commentStub = getCommentControllerStub();
    if (!commentStub) {
      throw new Error('Comment controller stub not initialized');
    }

    commentStub.consumeSectionCommentMarkup.mockReturnValue('{>>cached<<}');
    commentStub.extractSectionComments.mockReturnValue({
      content: 'Original content',
      commentMarkup: '{>>existing<<}',
    });

    (ui as any).segmentContentIntoElements = vi.fn().mockReturnValue([
      { content: 'Updated content', metadata: { type: 'Para' } },
    ]);
    (ui as any).ensureSegmentDom = vi.fn();
    (ui as any).updateHeadingReferencesAfterSave = vi.fn();
    (ui as any).closeEditor = vi.fn();
    (ui as any).refresh = vi.fn();

    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1', 'section-1-new'],
      removedIds: [],
    });

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = 'Updated content';
    (ui as any).editorState.milkdownEditor = {} as any;

    (ui as any).saveEditor();

    expect(commentStub.cacheSectionCommentMarkup).toHaveBeenCalledWith(
      'section-1-new',
      '{>>cached<<}'
    );
    expect(commentStub.clearSectionCommentMarkup).toHaveBeenCalledWith(
      'section-1'
    );
  });

  it('preserves leading blank lines when segmenting content', () => {
    const contentStore = new Map<string, string>([
      ['section-1', '\nLeading paragraph'],
    ]);
    const config = createStubConfig(contentStore);
    const ui = new UIModule(config as UIConfig);

    const segments = (ui as any).segmentContentIntoElements(
      '\nLeading paragraph',
      { type: 'Para' }
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]?.content.startsWith('\n')).toBe(true);
    expect(segments[0]?.content.trim()).toBe('Leading paragraph');
  });
});
