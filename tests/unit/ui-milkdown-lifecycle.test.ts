import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UIConfig } from '@modules/ui';
import { UIModule } from '@modules/ui';

const {
  milkdownEditorInstances,
  getMilkdownEditorMock,
  resetMilkdownEditorMocks,
} = vi.hoisted(() => {
  type MockedEditorInstance = {
    initialize: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    getInstance: ReturnType<typeof vi.fn>;
    getToolbar: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    clearListeners: ReturnType<typeof vi.fn>;
  };

  const instances: MockedEditorInstance[] = [];
  let constructorMock: ReturnType<typeof vi.fn> | null = null;

  const ensureConstructor = () => {
    if (!constructorMock) {
      constructorMock = vi.fn(function MockMilkdownEditorConstructor() {
        const instance: MockedEditorInstance = {
          initialize: vi.fn().mockResolvedValue(undefined),
          destroy: vi.fn(),
          on: vi.fn(),
          getInstance: vi.fn().mockReturnValue({ destroy: vi.fn() }),
          getToolbar: vi.fn().mockReturnValue(null),
          emit: vi.fn(),
          clearListeners: vi.fn(),
        };
        instances.push(instance);
        return instance;
      });
    }
    return constructorMock;
  };

  const reset = () => {
    instances.length = 0;
    constructorMock?.mockClear();
  };

  return {
    milkdownEditorInstances: instances,
    getMilkdownEditorMock: ensureConstructor,
    resetMilkdownEditorMocks: reset,
  };
});

const { createNoopClassMock } = vi.hoisted(() => {
  const factory = () =>
    vi.fn(function NoopClassMock(this: unknown) {
      return {};
    });
  return { createNoopClassMock: factory };
});

vi.mock('@modules/ui/editor/MilkdownEditor', () => ({
  MilkdownEditor: getMilkdownEditorMock(),
}));

vi.mock('@modules/ui/editor/EditorToolbar', () => ({
  EditorToolbar: vi.fn(function MockEditorToolbar(this: unknown) {
    return {
      setEditor: vi.fn(),
      setElementType: vi.fn(),
      create: vi.fn().mockImplementation(() => document.createElement('div')),
      attachHandlers: vi.fn(),
      updateState: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@modules/ui/editor/EditorHistory', () => ({
  EditorHistory: createNoopClassMock(),
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
      getIsVisible: vi.fn().mockReturnValue(true),
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

vi.mock('@modules/ui/sidebars/MainSidebar', () => ({
  MainSidebar: vi.fn(function MockMainSidebar(this: unknown) {
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
  }),
}));

vi.mock('@modules/ui/sidebars/ContextMenu', () => ({
  ContextMenu: vi.fn(function MockContextMenu(this: unknown) {
    return {
      onEdit: vi.fn(),
      onComment: vi.fn(),
      open: vi.fn(),
    };
  }),
}));

const createStubConfig = (): UIConfig => ({
  changes: {
    getElementById: vi.fn().mockReturnValue(null),
    getElementContent: vi.fn().mockReturnValue(''),
    getElementContentWithTrackedChanges: vi.fn().mockReturnValue(''),
    replaceElementWithSegments: vi.fn().mockReturnValue({
      elementIds: [],
      removedIds: [],
    }),
    getCurrentState: vi.fn().mockReturnValue([]),
    getOperations: vi.fn().mockReturnValue([]),
    initializeFromDOM: vi.fn(),
    canUndo: vi.fn().mockReturnValue(false),
    canRedo: vi.fn().mockReturnValue(false),
    toMarkdown: vi.fn().mockReturnValue('Full markdown content'),
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
});

describe('UIModule Milkdown lifecycle handling', () => {
  beforeEach(() => {
    resetMilkdownEditorMocks();
    document.body.innerHTML = '';
  });

  it('destroys any previous MilkdownEditor before creating a new one', async () => {
    const ui = new UIModule(createStubConfig());
    const container = document.createElement('div');
    container.innerHTML = '<div class="review-editor-body"></div>';

    await (ui as any).initializeMilkdown(container, 'First content');
    expect(getMilkdownEditorMock()).toHaveBeenCalledTimes(1);

    const firstInstance = milkdownEditorInstances[0];

    await (ui as any).initializeMilkdown(container, 'Second content');
    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(getMilkdownEditorMock()).toHaveBeenCalledTimes(2);
    expect(milkdownEditorInstances[1].initialize).toHaveBeenCalled();
  });

  it('tears down the active MilkdownEditor during closeEditor()', async () => {
    const ui = new UIModule(createStubConfig());
    const container = document.createElement('div');
    container.innerHTML = '<div class="review-editor-body"></div>';

    await (ui as any).initializeMilkdown(container, 'Session content');
    const activeInstance = milkdownEditorInstances[0];
    const lifecycle = (ui as any).editorLifecycle;
    expect(lifecycle).toBeDefined();
    expect(lifecycle.getEditor()).not.toBeNull();

    (ui as any).editorState.activeEditor = null;
    (ui as any).editorState.currentElementId = null;

    ui.closeEditor();

    expect(activeInstance.destroy).toHaveBeenCalledTimes(1);
    expect(lifecycle.getEditor()).toBeNull();
    expect((ui as any).editorState.milkdownEditor).toBeNull();
  });
});
