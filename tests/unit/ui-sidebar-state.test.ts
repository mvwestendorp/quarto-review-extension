import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UIConfig } from '@modules/ui';
import { UIModule } from '@modules/ui';

const {
  getMainSidebarInstances,
  getMainSidebarConstructor,
  resetMainSidebarMocks,
  getHistoryStorageInstances,
  resetHistoryStorageMocks,
  getHistoryStorageConstructor,
} = vi.hoisted(() => {
  type MockMainSidebar = {
    create: ReturnType<typeof vi.fn>;
    onUndo: ReturnType<typeof vi.fn>;
    onRedo: ReturnType<typeof vi.fn>;
    onTrackedChangesToggle: ReturnType<typeof vi.fn>;
    onToggleSidebar: ReturnType<typeof vi.fn>;
    onClearDrafts: ReturnType<typeof vi.fn>;
    onExportClean: ReturnType<typeof vi.fn>;
    onExportCritic: ReturnType<typeof vi.fn>;
    onSubmitReview: ReturnType<typeof vi.fn>;
    setSubmitReviewEnabled: ReturnType<typeof vi.fn>;
    setSubmitReviewPending: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    setTrackedChangesVisible: ReturnType<typeof vi.fn>;
    updateUndoRedoState: ReturnType<typeof vi.fn>;
    setHasUnsavedChanges: ReturnType<typeof vi.fn>;
    onToggleTranslation: ReturnType<typeof vi.fn>;
    setTranslationEnabled: ReturnType<typeof vi.fn>;
    setTranslationActive: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  const instances: MockMainSidebar[] = [];
  const historyInstances: any[] = [];

  const constructor = vi.fn(function MockMainSidebar(this: unknown) {
    const instance: MockMainSidebar = {
      create: vi.fn().mockImplementation(() => {
        const element = document.createElement('div');
        element.className = 'review-toolbar review-persistent-sidebar';
        return element;
      }),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onTrackedChangesToggle: vi.fn(),
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
    instances.push(instance);
    return instance;
  });

  const historyConstructor = vi.fn(function MockEditorHistoryStorage(this: unknown) {
    const instance = {
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
    historyInstances.push(instance);
    return instance;
  });

  return {
    getMainSidebarInstances: () => instances,
    getMainSidebarConstructor: () => constructor,
    resetMainSidebarMocks: () => {
      instances.length = 0;
      constructor.mockClear();
    },
    getHistoryStorageInstances: () => historyInstances,
    resetHistoryStorageMocks: () => {
      historyInstances.length = 0;
      historyConstructor.mockClear();
    },
    getHistoryStorageConstructor: () => historyConstructor,
  };
});

vi.mock('@modules/ui/editor/EditorLifecycle', () => ({
  EditorLifecycle: vi.fn(function MockEditorLifecycle(this: unknown) {
    return {
      initialize: vi.fn(),
      destroy: vi.fn(),
      getEditor: vi.fn().mockReturnValue(null),
    };
  }),
}));

vi.mock('@modules/ui/editor/EditorToolbar', () => ({
  EditorToolbar: vi.fn(function MockEditorToolbar(this: unknown) {
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
  EditorHistoryStorage: getHistoryStorageConstructor(),
}));

vi.mock('@modules/ui/comments/CommentsSidebar', () => ({
  CommentsSidebar: vi.fn(function MockCommentsSidebar(this: unknown) {
    const element = document.createElement('div');
    element.className = 'review-comments-sidebar';
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
      off: vi.fn(),
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

vi.mock('@modules/ui/comments/CommentController', () => ({
  CommentController: vi.fn(function MockCommentController(this: unknown) {
    return {
      refreshUI: vi.fn(),
      highlightSection: vi.fn(),
      clearSectionCommentMarkup: vi.fn(),
      clearSectionCommentMarkupFor: vi.fn(),
      cacheSectionCommentMarkup: vi.fn(),
      consumeSectionCommentMarkup: vi.fn().mockReturnValue(null),
      appendSectionComments: vi.fn(),
      extractSectionComments: vi.fn().mockReturnValue({ content: '', markup: [] }),
      openComposer: vi.fn(),
      clearHighlight: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/sidebars/MainSidebar', () => ({
  MainSidebar: getMainSidebarConstructor(),
}));

vi.mock('@modules/ui/sidebars/ContextMenu', () => ({
  ContextMenu: vi.fn(function MockContextMenu(this: unknown) {
    return {
      onEdit: vi.fn(),
      onComment: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/sidebars/ContextMenuCoordinator', () => ({
  ContextMenuCoordinator: vi.fn(function MockContextMenuCoordinator(
    this: unknown
  ) {
    return {
      close: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/change-summary', () => ({
  ChangeSummaryDashboard: vi.fn(function MockChangeSummary(this: unknown) {
    return {
      destroy: vi.fn(),
    };
  }),
}));

const createStubConfig = (overrides: Partial<UIConfig> = {}): UIConfig => {
  const base: UIConfig = {
    changes: {
      getElementById: vi.fn().mockReturnValue({
        id: 'elem-1',
        metadata: { type: 'Para' },
      }),
      getElementContent: vi.fn().mockReturnValue('Original content'),
      getElementContentWithTrackedChanges: vi.fn().mockReturnValue(''),
      replaceElementWithSegments: vi.fn().mockReturnValue({
        elementIds: ['elem-1'],
        removedIds: [],
      }),
      getCurrentState: vi.fn().mockReturnValue([]),
      getOperations: vi.fn().mockReturnValue([]),
      initializeFromDOM: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
      toMarkdown: vi.fn().mockReturnValue('Full markdown content'),
      undo: vi.fn().mockReturnValue(false),
      redo: vi.fn().mockReturnValue(false),
    } as any,
    markdown: {
      render: vi.fn(),
      renderSync: vi.fn(),
      toPlainText: vi.fn().mockReturnValue('Plain text'),
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
      saveDraft: vi.fn(),
      clearAll: vi.fn(),
      loadDraft: vi.fn().mockResolvedValue(null),
    } as any,
  };

  return {
    ...base,
    ...overrides,
  };
};

describe('UIModule sidebar state handling', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetMainSidebarMocks();
    resetHistoryStorageMocks();
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    // Mock window.location.reload for all tests
    reloadSpy = vi.fn();
    vi.stubGlobal('location', {
      ...window.location,
      reload: reloadSpy,
    });
    reloadSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('toggleSidebarCollapsed updates DOM and notifies MainSidebar', () => {
    const ui = new UIModule(createStubConfig());
    const mainSidebar = getMainSidebarInstances()[0];
    expect(mainSidebar).toBeDefined();

    ui.toggleSidebarCollapsed();

    const toolbar = document.querySelector(
      '.review-toolbar'
    ) as HTMLElement | null;
    expect(toolbar).not.toBeNull();
    expect(toolbar?.classList.contains('review-sidebar-collapsed')).toBe(true);
    expect(
      document.body.classList.contains('review-sidebar-collapsed-mode')
    ).toBe(true);
    expect(mainSidebar?.setCollapsed).toHaveBeenLastCalledWith(true);
    expect((ui as any).uiState.isSidebarCollapsed).toBe(true);

    ui.toggleSidebarCollapsed(false);

    expect(toolbar?.classList.contains('review-sidebar-collapsed')).toBe(false);
    expect(
      document.body.classList.contains('review-sidebar-collapsed-mode')
    ).toBe(false);
    expect(mainSidebar?.setCollapsed).toHaveBeenLastCalledWith(false);
    expect((ui as any).uiState.isSidebarCollapsed).toBe(false);
  });

  it('clears local drafts when confirmation is accepted', async () => {
    vi.useFakeTimers();
    const config = createStubConfig();
    const ui = new UIModule(config);
    const mainSidebar = getMainSidebarInstances()[0];
    expect(mainSidebar).toBeDefined();

    const clearCallback = mainSidebar?.onClearDrafts.mock.calls[0]?.[0];
    expect(clearCallback).toBeInstanceOf(Function);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const clearPromise = clearCallback();
    await clearPromise;

    // Advance timers to trigger the setTimeout for reload
    vi.advanceTimersByTime(150);

    expect(confirmSpy).toHaveBeenCalled();
    expect(config.persistence.clearAll).toHaveBeenCalled();
    const historyInstance = getHistoryStorageInstances()[0];
    expect(historyInstance.clearAll).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does not clear local drafts when confirmation is declined', async () => {
    const config = createStubConfig();
    const ui = new UIModule(config);
    const mainSidebar = getMainSidebarInstances()[0];
    expect(mainSidebar).toBeDefined();

    const clearCallback = mainSidebar?.onClearDrafts.mock.calls[0]?.[0];
    expect(clearCallback).toBeInstanceOf(Function);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await clearCallback();

    expect(confirmSpy).toHaveBeenCalled();
    expect(config.persistence.clearAll).not.toHaveBeenCalled();
    const historyInstance = getHistoryStorageInstances()[0];
    expect(historyInstance.clearAll).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('registers export handlers when exporter is provided', async () => {
    const exporter = {
      exportToQmd: vi.fn().mockResolvedValue({
        fileCount: 1,
        filenames: ['example.qmd'],
        downloadedAs: 'bundle.zip',
      }),
    };

    const config = createStubConfig({ exporter: exporter as any });
    const ui = new UIModule(config);
    const mainSidebar = getMainSidebarInstances()[0];

    expect(mainSidebar?.onExportClean).toHaveBeenCalledWith(expect.any(Function));
    expect(mainSidebar?.onExportCritic).toHaveBeenCalledWith(expect.any(Function));

    const handler = mainSidebar?.onExportClean.mock.calls[0]?.[0];
    expect(handler).toBeInstanceOf(Function);

    // Directly exercise export logic for coverage
    const notifySpy = vi
      .spyOn(ui as unknown as { showNotification: (...args: unknown[]) => void }, 'showNotification')
      .mockImplementation(() => undefined);

    try {
      await (ui as any).handleExportQmd('clean');
      expect(exporter.exportToQmd).toHaveBeenCalledWith({ format: 'clean' });
      expect(notifySpy).toHaveBeenCalledWith('Exported example.qmd', 'success');
    } finally {
      notifySpy.mockRestore();
    }
  });

  it('surfaces export failures to the user', async () => {
    const exporter = {
      exportToQmd: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const config = createStubConfig({ exporter: exporter as any });
    const ui = new UIModule(config);
    const notifySpy = vi
      .spyOn(ui as unknown as { showNotification: (...args: unknown[]) => void }, 'showNotification')
      .mockImplementation(() => undefined);

    try {
      await (ui as any).handleExportQmd('critic');

      expect(exporter.exportToQmd).toHaveBeenCalledWith({ format: 'critic' });
      expect(notifySpy).toHaveBeenLastCalledWith(
        'Failed to export QMD files.',
        'error'
      );
    } finally {
      notifySpy.mockRestore();
    }
  });

  it('notifies when export service is unavailable', async () => {
    const config = createStubConfig({ exporter: undefined });
    const ui = new UIModule(config);
    const notifySpy = vi
      .spyOn(ui as unknown as { showNotification: (...args: unknown[]) => void }, 'showNotification')
      .mockImplementation(() => undefined);

    try {
      await (ui as any).handleExportQmd('clean');

      expect(notifySpy).toHaveBeenCalledWith(
        'Export service is not configured.',
        'error'
      );
    } finally {
      notifySpy.mockRestore();
    }
  });
});
