import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIModule } from '@modules/ui';
import { ChangesModule } from '@modules/changes';
import { MarkdownModule } from '@modules/markdown';
import { TranslationModule } from '@modules/translation';
import type { CommentsModule } from '@modules/comments';

const {
  UnifiedSidebarMock,
  getUnifiedSidebarInstance,
  CommentControllerMock,
  CommentsSidebarMock,
  CommentComposerMock,
  CommentBadgesMock,
  ContextMenuCoordinatorMock,
  EditorToolbarMock,
  EditorLifecycleMock,
  ChangeSummaryDashboardMock,
  ReviewSubmissionModalMock,
  TranslationPluginMock,
  getPluginInstances,
} = vi.hoisted(() => {
  const sidebarInstances: any[] = [];

  const UnifiedSidebarMock = vi.fn(function MockUnifiedSidebar() {
    const instance: any = {
      create: vi.fn().mockImplementation(() => {
        const element = document.createElement('div');
        element.className = 'review-toolbar review-persistent-sidebar';
        return element;
      }),
      destroy: vi.fn(),
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
      onToggleTranslation: vi.fn().mockImplementation((callback) => {
        instance.__toggleTranslation = callback;
      }),
      setTranslationEnabled: vi.fn(),
      setTranslationMode: vi.fn(),
      setTranslationBusy: vi.fn(),
      setTranslationActive: vi.fn(),
      updateTranslationProviders: vi.fn(),
      updateTranslationLanguages: vi.fn(),
      setTranslationProgress: vi.fn(),
      updateTranslationUndoRedoState: vi.fn(),
      onTranslateDocument: vi.fn(),
      onTranslateSentence: vi.fn(),
      onProviderChange: vi.fn(),
      onSourceLanguageChange: vi.fn(),
      onTargetLanguageChange: vi.fn(),
      onSwapLanguages: vi.fn(),
      onAutoTranslateChange: vi.fn(),
      onTranslationExportUnified: vi.fn(),
      onTranslationExportSeparated: vi.fn(),
      onClearLocalModelCache: vi.fn(),
      onTranslationUndo: vi.fn(),
      onTranslationRedo: vi.fn(),
      updateComments: vi.fn(),
    };
    sidebarInstances.push(instance);
    return instance;
  });

  const getUnifiedSidebarInstance = () =>
    sidebarInstances[sidebarInstances.length - 1];

  const CommentControllerMock = vi.fn(function MockCommentController() {
    return {
      getSectionComments: vi.fn().mockReturnValue([]),
      focusCommentAnchor: vi.fn(),
      removeComment: vi.fn(),
      clearHighlight: vi.fn(),
      clearSectionCommentMarkup: vi.fn(),
      clearSectionCommentMarkupFor: vi.fn(),
      consumeSectionCommentMarkup: vi.fn(),
      appendSectionComments: vi.fn(
        (content: string, markup: string | null) => content + (markup ?? '')
      ),
      cacheSectionCommentMarkup: vi.fn(),
      extractSectionComments: vi
        .fn()
        .mockReturnValue({ content: '', commentMarkup: null }),
      openComposer: vi.fn().mockResolvedValue(undefined),
      highlightSection: vi.fn(),
      refreshUI: vi.fn(),
      sanitizeInlineCommentArtifacts: vi.fn(),
    };
  });

  const CommentsSidebarMock = vi.fn(function MockCommentsSidebar() {
    const element = document.createElement('div');
    element.className = 'review-comments-sidebar';
    element.style.display = 'none';
    document.body.appendChild(element);
    return {
      getElement: vi.fn().mockReturnValue(element),
      getIsVisible: vi.fn().mockReturnValue(false),
      updateSections: vi.fn(),
      toggle: vi.fn(),
      show: vi.fn(() => {
        element.style.display = '';
      }),
      hide: vi.fn(() => {
        element.style.display = 'none';
      }),
      destroy: vi.fn(() => {
        element.remove();
      }),
    };
  });

  const CommentComposerMock = vi.fn(function MockCommentComposer() {
    return {
      on: vi.fn(),
      close: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
    };
  });

  const CommentBadgesMock = vi.fn(function MockCommentBadges() {
    return {
      refresh: vi.fn(),
      syncIndicators: vi.fn(),
      destroy: vi.fn(),
    };
  });

  const ContextMenuCoordinatorMock = vi.fn(function MockContextMenuCoordinator() {
    return {
      close: vi.fn(),
    };
  });

  const EditorToolbarMock = vi.fn(function MockEditorToolbar() {
    return {
      create: vi.fn().mockReturnValue(document.createElement('div')),
      attachHandlers: vi.fn(),
      setEditor: vi.fn(),
      setElementType: vi.fn(),
      updateState: vi.fn(),
      destroy: vi.fn(),
    };
  });

  const EditorLifecycleMock = vi.fn(function MockEditorLifecycle() {
    return {
      initialize: vi.fn(),
      destroy: vi.fn(),
      onBeforeInitialize: vi.fn(),
      onAfterInitialize: vi.fn(),
      onBeforeDestroy: vi.fn(),
    };
  });

  const ChangeSummaryDashboardMock = vi.fn(function MockChangeSummaryDashboard() {
    return {
      update: vi.fn(),
      destroy: vi.fn(),
    };
  });

  const ReviewSubmissionModalMock = vi.fn(function MockReviewSubmissionModal() {
    return {
      open: vi.fn(),
      destroy: vi.fn(),
    };
  });

  const pluginInstances: Array<{
    controller: ReturnType<typeof createControllerStub> | null;
    mount: vi.Mock;
    handleDispose: vi.Mock | null;
  }> = [];

  const createControllerStub = () => ({
    focusView: vi.fn(),
    getAvailableProviders: vi.fn().mockReturnValue(['manual']),
    getAvailableLanguages: vi.fn().mockReturnValue(['en', 'nl']),
    canUndo: vi.fn().mockReturnValue(false),
    canRedo: vi.fn().mockReturnValue(false),
    translateDocument: vi.fn().mockResolvedValue(undefined),
    translateSentence: vi.fn().mockResolvedValue(undefined),
    setProvider: vi.fn(),
    setSourceLanguage: vi.fn().mockResolvedValue(undefined),
    setTargetLanguage: vi.fn().mockResolvedValue(undefined),
    swapLanguages: vi.fn(),
    setAutoTranslate: vi.fn(),
    exportUnified: vi.fn().mockResolvedValue(undefined),
    exportSeparated: vi.fn().mockResolvedValue(undefined),
    clearLocalModelCache: vi.fn().mockResolvedValue(undefined),
    undo: vi.fn().mockReturnValue(false),
    redo: vi.fn().mockReturnValue(false),
  });

  class TranslationPluginMock {
    public readonly id = 'translation-ui';
    public controller: ReturnType<typeof createControllerStub> | null = null;
    public handleDispose: vi.Mock | null = null;
    public mount = vi.fn(
      (context: { container: HTMLElement; events?: { on?: () => () => void } }) => {
        const controller = createControllerStub();
        this.controller = controller;
        const dispose = vi.fn(() => {
          context.container.innerHTML = '';
        });
        this.handleDispose = dispose;
        context.container.appendChild(document.createElement('div'));
        pluginInstances.push(this);
        return {
          dispose,
          ready: Promise.resolve(),
        };
      }
    );
    public getController() {
      return this.controller;
    }
  }

  return {
    UnifiedSidebarMock,
    getUnifiedSidebarInstance,
    CommentControllerMock,
    CommentsSidebarMock,
    CommentComposerMock,
    CommentBadgesMock,
    ContextMenuCoordinatorMock,
    EditorToolbarMock,
    EditorLifecycleMock,
    ChangeSummaryDashboardMock,
    ReviewSubmissionModalMock,
    TranslationPluginMock,
    getPluginInstances: () => pluginInstances,
  };
});

vi.mock('@modules/ui/sidebars/UnifiedSidebar', () => ({
  UnifiedSidebar: UnifiedSidebarMock,
}));

vi.mock('@modules/ui/comments/CommentController', () => ({
  CommentController: CommentControllerMock,
}));

vi.mock('@modules/ui/comments/CommentsSidebar', () => ({
  CommentsSidebar: CommentsSidebarMock,
}));

vi.mock('@modules/ui/comments/CommentComposer', () => ({
  CommentComposer: CommentComposerMock,
}));

vi.mock('@modules/ui/comments/CommentBadges', () => ({
  CommentBadges: CommentBadgesMock,
}));

vi.mock('@modules/ui/sidebars/ContextMenuCoordinator', () => ({
  ContextMenuCoordinator: ContextMenuCoordinatorMock,
}));

vi.mock('@modules/ui/editor/EditorToolbar', () => ({
  EditorToolbar: EditorToolbarMock,
}));

vi.mock('@modules/ui/editor/EditorLifecycle', () => ({
  EditorLifecycle: EditorLifecycleMock,
}));

vi.mock('@modules/ui/change-summary', () => ({
  ChangeSummaryDashboard: ChangeSummaryDashboardMock,
}));

vi.mock('@modules/ui/modals/ReviewSubmissionModal', () => ({
  default: ReviewSubmissionModalMock,
}));

vi.mock('@modules/ui/plugins/TranslationPlugin', () => ({
  TranslationPlugin: TranslationPluginMock,
}));

vi.mock('@utils/debug-tools', () => ({
  initializeDebugTools: vi.fn(),
}));

describe('UIModule translation toggle side-effects', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    document.body.innerHTML = `
      <div id="quarto-document-content">
        <div class="review-editable"
             data-review-id="section-1"
             data-review-type="Para"
             data-review-markdown="Paragraph one.">
          <p>Paragraph one.</p>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    getPluginInstances().splice(0);
  });

  it('keeps document unchanged when translation mode opens and closes without edits', async () => {
    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const markdown = new MarkdownModule({});

    const commentsModule = {
      parse: vi.fn().mockReturnValue([]),
      createComment: vi.fn(),
      accept: vi.fn(),
      refresh: vi.fn(),
      getCommentsForElement: vi.fn().mockReturnValue([]),
      addComment: vi.fn(),
      updateComment: vi.fn().mockReturnValue(true),
      deleteComment: vi.fn().mockReturnValue(true),
    } as unknown as CommentsModule;

    const translationModuleStub = {
      getModuleConfig: vi.fn().mockImplementation(() => ({
        config: {
          enabled: true,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          defaultProvider: 'manual',
          autoTranslateOnEdit: false,
          autoTranslateOnLoad: false,
          showCorrespondenceLines: true,
          highlightOnHover: true,
          providers: {},
        },
        changes,
        markdown,
        documentId: 'test-doc',
      })),
      hasSourceChanged: vi.fn().mockReturnValue(false),
      mergeToElements: vi.fn().mockReturnValue([]),
      applyMergeToChanges: vi.fn().mockReturnValue(false),
      on: vi.fn().mockReturnValue(() => {
        /* no-op disposer */
      }),
    };

    const ui = new UIModule({
      changes,
      markdown,
      comments: commentsModule,
      translation: translationModuleStub as unknown as any,
    });

    const refreshSpy = vi.spyOn(ui, 'refresh').mockImplementation(() => {});
    const notificationSpy = vi
      .spyOn(ui, 'showNotification')
      .mockImplementation(() => {});

    const initialOperations = changes.getOperations().length;
    const initialState = JSON.stringify(changes.getCurrentState());

    await (ui as any).toggleTranslation();

    expect(changes.getOperations()).toHaveLength(initialOperations);

    const sidebarInstance = getUnifiedSidebarInstance();
    expect(sidebarInstance?.setTranslationMode).toHaveBeenCalledWith(true);

    await (ui as any).toggleTranslation();

    expect(translationModuleStub.mergeToElements).toHaveBeenCalledTimes(1);
    expect(translationModuleStub.applyMergeToChanges).toHaveBeenCalledWith(
      [],
      changes
    );
    expect(changes.getOperations()).toHaveLength(initialOperations);
    expect(JSON.stringify(changes.getCurrentState())).toBe(initialState);

    const pluginInstances = getPluginInstances();
    expect(pluginInstances.length).toBe(1);
    const plugin = pluginInstances[0];
    expect(plugin.mount).toHaveBeenCalledTimes(1);
    expect(plugin.handleDispose).toBeDefined();
    expect(plugin.handleDispose).toHaveBeenCalledTimes(1);

    const translationContainer = document.querySelector(
      '#translation-view-container'
    );
    expect(translationContainer).toBeNull();

    refreshSpy.mockRestore();
    notificationSpy.mockRestore();
  });

  it('persists manual target edits when closing translation mode', async () => {
    document.body.innerHTML = `
      <div id="quarto-document-content">
        <div class="review-editable"
             data-review-id="section-1"
             data-review-type="Para"
             data-review-markdown="Hello world.">
          <p>Hello world.</p>
        </div>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const markdown = new MarkdownModule({});
    const commentsModule = {
      parse: vi.fn().mockReturnValue([]),
      createComment: vi.fn(),
      accept: vi.fn(),
      refresh: vi.fn(),
      getCommentsForElement: vi.fn().mockReturnValue([]),
      addComment: vi.fn(),
      updateComment: vi.fn().mockReturnValue(true),
      deleteComment: vi.fn().mockReturnValue(true),
    } as unknown as CommentsModule;

    const translationModule = new TranslationModule(
      {
        config: {
          enabled: true,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          defaultProvider: 'manual',
          autoTranslateOnEdit: false,
          autoTranslateOnLoad: false,
          showCorrespondenceLines: true,
          highlightOnHover: true,
          providers: {},
        },
        changes,
        markdown,
        documentId: 'test-doc-persist',
      },
      false
    );

    await translationModule.initialize();
    translationModule.preCreateTargetSentences();

    const ui = new UIModule({
      changes,
      markdown,
      comments: commentsModule,
      translation: translationModule,
    });

    const confirmStub = vi
      .spyOn(window, 'confirm')
      .mockImplementation(() => true);

    await (ui as any).toggleTranslation();

    const controller = (ui as any).translationController;
    expect(controller).toBeDefined();

    const persistedDoc = translationModule.getDocument();
    expect(persistedDoc?.targetSentences.length).toBeGreaterThan(0);
    const sentenceId = persistedDoc?.targetSentences[0]?.id;
    expect(sentenceId).toBeDefined();

    translationModule.updateSentence(
      sentenceId as string,
      'Hallo wereld.',
      false
    );
    translationModule.saveToStorageNow();

    const updatedDoc = translationModule.getDocument();
    const updatedSentence = updatedDoc?.targetSentences.find(
      (sentence) => sentence.id === sentenceId
    );
    expect(updatedSentence?.content).toBe('Hallo wereld.');

    await (ui as any).toggleTranslation();

    const mergedContent = changes.getElementContent('section-1');
    expect(mergedContent).toContain('Hallo wereld.');

    translationModule.destroy();
    confirmStub.mockRestore();
  });
});
