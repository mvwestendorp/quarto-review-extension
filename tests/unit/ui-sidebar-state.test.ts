import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UIConfig } from '@modules/ui';
import { UIModule } from '@modules/ui';

const {
  getMainSidebarInstances,
  getMainSidebarConstructor,
  resetMainSidebarMocks,
} = vi.hoisted(() => {
  type MockMainSidebar = {
    create: ReturnType<typeof vi.fn>;
    onUndo: ReturnType<typeof vi.fn>;
    onRedo: ReturnType<typeof vi.fn>;
    onTrackedChangesToggle: ReturnType<typeof vi.fn>;
    onShowComments: ReturnType<typeof vi.fn>;
    onToggleSidebar: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    setTrackedChangesVisible: ReturnType<typeof vi.fn>;
    updateUndoRedoState: ReturnType<typeof vi.fn>;
    setHasUnsavedChanges: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  const instances: MockMainSidebar[] = [];

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
      onShowComments: vi.fn(),
      onToggleSidebar: vi.fn(),
      setCollapsed: vi.fn(),
      setTrackedChangesVisible: vi.fn(),
      updateUndoRedoState: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
      destroy: vi.fn(),
    };
    instances.push(instance);
    return instance;
  });

  return {
    getMainSidebarInstances: () => instances,
    getMainSidebarConstructor: () => constructor,
    resetMainSidebarMocks: () => {
      instances.length = 0;
      constructor.mockClear();
    },
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
  EditorHistoryStorage: vi.fn(function MockEditorHistoryStorage(this: unknown) {
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

const createStubConfig = (): UIConfig => ({
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
  } as any,
  markdown: {
    render: vi.fn(),
    renderSync: vi.fn(),
  } as any,
  comments: {
    parse: vi.fn().mockReturnValue([]),
    createComment: vi.fn().mockReturnValue('{>>comment<<}'),
    accept: vi.fn().mockReturnValue(''),
    refresh: vi.fn(),
  } as any,
  inlineEditing: false,
});

describe('UIModule sidebar state handling', () => {
  beforeEach(() => {
    resetMainSidebarMocks();
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
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
});
