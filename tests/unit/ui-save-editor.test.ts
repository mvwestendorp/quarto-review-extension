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
    sanitizeInlineCommentArtifacts: vi.fn(),
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
      onClearDrafts: vi.fn(),
      onExportClean: vi.fn(),
      onExportCritic: vi.fn(),
      onSubmitReview: vi.fn(),
      setSubmitReviewEnabled: vi.fn(),
      setSubmitReviewPending: vi.fn(),
      setCollapsed: vi.fn(),
      setTrackedChangesVisible: vi.fn(),
      updateUndoRedoState: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
      onToggleTranslation: vi.fn(),
      setTranslationEnabled: vi.fn(),
      setTranslationActive: vi.fn(),
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
): UIConfig & {
  changeMocks: { [key: string]: ReturnType<typeof vi.fn> };
  persistenceMocks: { [key: string]: ReturnType<typeof vi.fn> };
} => {
  const changeMocks = {
    replaceElementWithSegments: vi.fn(),
    toMarkdown: vi.fn().mockReturnValue('Full markdown content'),
  };
  changeMocks.replaceElementWithSegments.mockReturnValue({
    elementIds: [],
    removedIds: [],
  });

  const persistenceMocks = {
    saveDraft: vi.fn(),
    clearAll: vi.fn(),
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
      getCurrentState: vi.fn().mockImplementation(() =>
        Array.from(contentStore.entries()).map(([id, content]) => ({
          id,
          content,
          metadata: { type: 'Para' },
        }))
      ),
      getOperations: vi.fn().mockReturnValue([]),
      initializeFromDOM: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
      hasUnsavedOperations: vi.fn().mockReturnValue(false),
      markAsSaved: vi.fn(),
      toMarkdown: changeMocks.toMarkdown,
      setElementBaseline: vi.fn(),
      clearElementBaseline: vi.fn(),
      getElementBaseline: vi.fn(),
      clearAllBaselines: vi.fn(),
    } as any,
    markdown: {
      render: vi.fn((input) => markdownModule.render(input)),
      renderSync: vi.fn((input) => markdownModule.renderSync(input)),
      parseToAST: vi.fn((input) => markdownModule.parseToAST(input)),
      renderElement: vi.fn((content, type, level) =>
        markdownModule.renderElement(content, type, level)
      ),
    } as any,
    comments: {
      parse: vi.fn().mockReturnValue([]),
      createComment: vi.fn().mockReturnValue('{>>comment<<}'),
      accept: vi.fn().mockReturnValue(''),
      refresh: vi.fn(),
      getCommentsForElement: vi.fn().mockReturnValue([]),
      addComment: vi.fn(),
      updateComment: vi.fn().mockReturnValue(true),
      deleteComment: vi.fn().mockReturnValue(true),
    } as any,
    inlineEditing: false,
    persistence: {
      ...persistenceMocks,
      loadDraft: vi.fn().mockResolvedValue(null),
    } as any,
    changeMocks,
    persistenceMocks,
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

  it('removes leading blank lines when segmenting content directly', () => {
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
    expect(segments[0]?.content.startsWith('\n')).toBe(false);
    expect(segments[0]?.content).toBe('Leading paragraph');
  });

  it('strips leading blank lines on save and notifies the user', () => {
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

    (ui as any).ensureSegmentDom = vi.fn();
    (ui as any).updateHeadingReferencesAfterSave = vi.fn();
    (ui as any).closeEditor = vi.fn();
    (ui as any).refresh = vi.fn();

    const notificationSpy = vi
      .spyOn(ui as any, 'showNotification')
      .mockImplementation(() => {});

    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1'],
      removedIds: [],
    });

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = '\n\nUpdated content';
    (ui as any).editorState.milkdownEditor = {} as any;

    (ui as any).saveEditor();

    const segments = config.changeMocks.replaceElementWithSegments.mock
      .calls[0][1];
    expect(segments).toHaveLength(1);
    expect(segments[0]?.content.startsWith('\n')).toBe(false);
    expect(segments[0]?.content).toBe('Updated content');
    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy).toHaveBeenCalledWith(
      expect.stringContaining('Leading blank lines were removed'),
      'info'
    );

    notificationSpy.mockRestore();
  });

  it('strips leading HTML break tags on save and avoids additional operations', () => {
    const contentStore = new Map<string, string>([
      ['section-1', 'Original content'],
    ]);
    const config = createStubConfig(contentStore);
    const ui = new UIModule(config as UIConfig);
    const notificationSpy = vi
      .spyOn(ui as any, 'showNotification')
      .mockImplementation(() => {});

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = '<br />\nOriginal content';
    (ui as any).editorState.milkdownEditor = {} as any;

    const consumeSpy = getCommentControllerStub()?.consumeSectionCommentMarkup;
    consumeSpy?.mockReturnValue(undefined);

    config.changeMocks.replaceElementWithSegments.mockClear();
    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1'],
      removedIds: [],
    });

    (ui as any).saveEditor();

    expect(config.changeMocks.replaceElementWithSegments).toHaveBeenCalledTimes(
      1
    );
    const segments = config.changeMocks.replaceElementWithSegments.mock
      .calls[0][1];
    expect(segments).toHaveLength(1);
    expect(segments[0]?.content).toBe('Original content');
    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy).toHaveBeenCalledWith(
      expect.stringContaining('Leading blank lines were removed'),
      'info'
    );
    notificationSpy.mockRestore();
  });

  it('preserves generated segments when only leading whitespace changes', () => {
    const contentStore = new Map<string, string>([
      ['section-1', 'Original content'],
      ['temp-1', 'Test'],
    ]);
    const config = createStubConfig(contentStore);
    config.changes.getOperations.mockReturnValue([
      {
        id: 'op-1',
        type: 'insert',
        elementId: 'temp-1',
        timestamp: Date.now(),
        data: {
          type: 'insert',
          content: 'Test',
          metadata: { type: 'Para' },
          position: { after: 'section-1' },
          parentId: 'section-1',
          generated: true,
        },
      },
    ]);
    config.changes.getCurrentState.mockReturnValue([
      {
        id: 'section-1',
        content: 'Original content',
        metadata: { type: 'Para' },
      },
      {
        id: 'temp-1',
        content: 'Test',
        metadata: { type: 'Para' },
      },
    ]);

    const ui = new UIModule(config as UIConfig);
    const notificationSpy = vi
      .spyOn(ui as any, 'showNotification')
      .mockImplementation(() => {});

    config.changeMocks.replaceElementWithSegments.mockClear();
    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1', 'temp-1'],
      removedIds: [],
    });

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = '<br />Original content';
    (ui as any).editorState.milkdownEditor = {} as any;

    const generatedPreview = (ui as any).collectGeneratedSegments('section-1');
    expect(generatedPreview).toHaveLength(1);
    expect(generatedPreview[0]?.content).toBe('Test');

    (ui as any).saveEditor();

    const segments = config.changeMocks.replaceElementWithSegments.mock
      .calls[0][1];
    expect(segments).toHaveLength(2);
    expect(segments[1]?.content).toBe('Test');
    expect(notificationSpy).toHaveBeenCalled();

    notificationSpy.mockRestore();
  });

  it('preserves segment content when no edits are made', () => {
    const contentStore = new Map<string, string>([
      ['section-1', 'Original content'],
    ]);
    const config = createStubConfig(contentStore);
    const ui = new UIModule(config as UIConfig);

    const consumeSpy = getCommentControllerStub()?.consumeSectionCommentMarkup;
    consumeSpy?.mockReturnValue(undefined);

    config.changeMocks.replaceElementWithSegments.mockReturnValue({
      elementIds: ['section-1'],
      removedIds: [],
    });

    (ui as any).ensureSegmentDom = vi.fn();
    (ui as any).updateHeadingReferencesAfterSave = vi.fn();
    (ui as any).closeEditor = vi.fn();
    (ui as any).refresh = vi.fn();

    (ui as any).editorState.currentElementId = 'section-1';
    (ui as any).editorState.currentEditorContent = 'Original content';
    (ui as any).editorState.milkdownEditor = {} as any;

    (ui as any).saveEditor();

    expect(config.changeMocks.replaceElementWithSegments).toHaveBeenCalledTimes(1);
    const savedSegments = config.changeMocks.replaceElementWithSegments.mock
      .calls[0][1];
    expect(savedSegments).toHaveLength(1);
    expect(savedSegments[0]?.content).toBe('Original content');
    expect(config.persistenceMocks.saveDraft).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'section-1',
          content: 'Original content',
        }),
      ]),
      expect.any(Object)
    );
  });
});
