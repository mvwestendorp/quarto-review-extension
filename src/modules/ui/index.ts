// UIModule.ts

// import { utils } from '@milkdown/kit';
import type {
  Root,
  Content,
  Heading as MdHeading,
  List as MdList,
} from 'mdast';
import type { Position, Point } from 'unist';
// Import from extracted modules
import type { DiffHighlightRange } from './editor/MilkdownEditor';
import { EditorLifecycle } from './editor/EditorLifecycle';
import { EditorToolbar } from './editor/EditorToolbar';
import { CommentsSidebar } from './comments/CommentsSidebar';
import { CommentComposer } from './comments/CommentComposer';
import { CommentBadges } from './comments/CommentBadges';
import { CommentController } from './comments/CommentController';
import { MainSidebar } from './sidebars/MainSidebar';
import { ContextMenuCoordinator } from './sidebars/ContextMenuCoordinator';
import {
  normalizeListMarkers,
  trimLineStart,
  trimLineEnd,
  isSetextUnderline,
  isWhitespaceChar,
  type CommentState,
  type EditorState,
  type UIState,
} from './shared';
import { normalizeContentForComparison } from './shared/editor-content';
import { EditorHistoryStorage } from './editor/EditorHistoryStorage';
import { QmdExportService, type ExportFormat } from '@modules/export';
import ReviewSubmissionModal, {
  type ReviewSubmissionInitialValues,
} from './modals/ReviewSubmissionModal';
import GitReviewService from '@modules/git/review-service';
import type { UserModule } from '@modules/user';

// CriticMarkup components are now handled by MilkdownEditor module
import { ChangeSummaryDashboard } from './change-summary';
import { createModuleLogger } from '@utils/debug';
import { initializeDebugTools } from '@utils/debug-tools';
import type { ChangesModule } from '@modules/changes';
import type { MarkdownModule } from '@modules/markdown';
import type { CommentsModule } from '@modules/comments';
import LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import type { Element as ReviewElement, ElementMetadata } from '@/types';
import { UI_CONSTANTS } from './constants';
import { TranslationController } from './translation/TranslationController';
import { TranslationPlugin } from './plugins/TranslationPlugin';
import type {
  PluginHandle,
  ReviewUIPlugin,
  ReviewUIContext,
} from './plugins/types';
import type {
  TranslationModule,
  TranslationModuleConfig,
} from '@modules/translation';
import { NotificationService } from '@/services/NotificationService';
import { LoadingService } from '@/services/LoadingService';
import { PersistenceManager } from '@/services/PersistenceManager';
import {
  EditorManager,
  type EditorManagerConfig,
  type EditorCallbacks,
} from '@/services/EditorManager';
import { StateStore } from '@/services/StateStore';

const logger = createModuleLogger('UIModule');

export interface UIConfig {
  changes: ChangesModule;
  markdown: MarkdownModule;
  comments: CommentsModule;
  inlineEditing?: boolean; // Use inline editing instead of modal
  persistence?: LocalDraftPersistence;
  exporter?: QmdExportService;
  reviewService?: GitReviewService;
  user?: UserModule;
  translation?: import('@modules/translation').TranslationModule;
}

interface HeadingReferenceInfo {
  reference: string;
  prefix: string;
  style: 'atx' | 'setext';
}

export class UIModule {
  private config: UIConfig;

  // Central state store (replaces individual state objects)
  private stateStore: StateStore;

  // Cache and utility maps
  private headingReferenceLookup = new Map<string, HeadingReferenceInfo>();
  private activeHeadingReferenceCache = new Map<string, HeadingReferenceInfo>();

  // Configuration
  private changeSummaryDashboard: ChangeSummaryDashboard | null = null;
  private exporter?: QmdExportService;
  private reviewService?: GitReviewService;
  private reviewSubmissionModal?: ReviewSubmissionModal;
  private userModule?: UserModule;

  // Module instances (for Phase 3 integration - will be used when code replacement completes)
  private editorLifecycle: EditorLifecycle;
  private editorToolbarModule: EditorToolbar | null = null;
  private mainSidebarModule: MainSidebar;
  private commentsSidebarModule: CommentsSidebar | null = null;
  private commentComposerModule: CommentComposer | null = null;
  private commentBadgesModule: CommentBadges | null = null;
  private contextMenuCoordinator: ContextMenuCoordinator | null = null;
  private commentController: CommentController;
  private historyStorage: EditorHistoryStorage;
  private globalShortcutsBound = false;
  private localPersistence?: LocalDraftPersistence;
  private isSubmittingReview = false;
  private commentsImportedFromStorage = false;
  private translationController: TranslationController | null = null;
  private translationModule?: TranslationModule;
  private pluginHandles = new Map<string, PluginHandle>();
  private translationPlugin: TranslationPlugin | null = null;
  private notificationService: NotificationService;
  private loadingService: LoadingService;
  private persistenceManager: PersistenceManager;
  private editorManager!: EditorManager; // Initialized after dependencies
  // UI plugins will be introduced during extension refactor (Phase 3)

  constructor(config: UIConfig) {
    this.config = config;
    this.exporter = config.exporter;
    this.reviewService = config.reviewService;
    this.userModule = config.user;
    this.localPersistence = config.persistence;
    this.translationModule = config.translation;

    // Initialize central state store
    this.stateStore = new StateStore();

    // Set up reactive listeners for state changes
    this.setupStateListeners();

    // Initialize services
    this.notificationService = new NotificationService();
    this.loadingService = new LoadingService();

    logger.debug(
      'Initialized with tracked changes:',
      this.stateStore.getEditorState().showTrackedChanges
    );

    // Initialize module instances
    // NOTE: EditorLifecycle initializes Milkdown on-demand to prevent plugin state corruption
    this.editorLifecycle = new EditorLifecycle();
    this.editorToolbarModule = new EditorToolbar();
    this.mainSidebarModule = new MainSidebar();
    this.commentsSidebarModule = new CommentsSidebar();
    this.commentComposerModule = new CommentComposer();
    this.commentBadgesModule = new CommentBadges();
    this.commentController = new CommentController({
      config: {
        changes: this.config.changes,
        comments: this.config.comments,
        markdown: this.config.markdown,
      },
      commentState: this.stateStore.getCommentState() as CommentState,
      sidebar: this.commentsSidebarModule,
      composer: this.commentComposerModule,
      badges: this.commentBadgesModule,
      callbacks: {
        requestRefresh: () => this.refresh(),
        ensureSidebarVisible: () =>
          this.refreshCommentUI({ showSidebar: true }),
        showNotification: (message, type) =>
          this.showNotification(message, type),
        onComposerClosed: () =>
          this.commentController.clearHighlight('composer'),
        persistDocument: () => this.persistenceManager.persistDocument(),
        getUserId: () => this.userModule?.getCurrentUser?.()?.id ?? 'anonymous',
      },
    });
    this.contextMenuCoordinator = new ContextMenuCoordinator({
      onEdit: (sectionId) => {
        this.openEditor(sectionId);
      },
      onComment: (sectionId) => {
        const element = this.config.changes.getElementById(sectionId);
        if (element) {
          void this.openCommentComposer({ elementId: sectionId });
        }
      },
    });
    this.historyStorage = new EditorHistoryStorage({
      prefix: UI_CONSTANTS.EDITOR_HISTORY_STORAGE_PREFIX,
      maxSize: UI_CONSTANTS.MAX_HISTORY_SIZE_BYTES,
      maxStates: UI_CONSTANTS.MAX_HISTORY_STATES,
    });

    // Initialize persistence manager
    this.persistenceManager = new PersistenceManager(
      {
        localPersistence: this.localPersistence,
        changes: this.config.changes,
        comments: this.config.comments,
        historyStorage: this.historyStorage,
        notificationService: this.notificationService,
      },
      {
        onDraftRestored: (elements) => {
          elements.forEach((entry) => {
            const element = this.config.changes.getElementById(entry.id);
            if (!element) {
              return;
            }
            const segments = this.segmentContentIntoElements(
              entry.content,
              (entry.metadata as ElementMetadata | undefined) ??
                element.metadata
            );
            const { elementIds, removedIds } =
              this.config.changes.replaceElementWithSegments(
                entry.id,
                segments
              );
            this.ensureSegmentDom(elementIds, segments, removedIds);
          });
        },
        onCommentsImported: () => {
          // Mark that comments were imported to avoid duplicate migration
          this.commentsImportedFromStorage = true;
        },
        refresh: () => this.refresh(),
      }
    );

    // Initialize EditorManager with callbacks
    const editorManagerConfig: EditorManagerConfig = {
      changes: this.config.changes,
      comments: this.config.comments,
      markdown: this.config.markdown,
      inlineEditing: this.config.inlineEditing ?? false,
      historyStorage: this.historyStorage,
      notificationService: this.notificationService,
      editorLifecycle: this.editorLifecycle,
    };

    const editorCallbacks: EditorCallbacks = {
      getElementContent: (elementId) =>
        this.config.changes.getElementContent(elementId),
      getElementContentWithTrackedChanges: (elementId) =>
        this.config.changes.getElementContentWithTrackedChanges(elementId),
      segmentContentIntoElements: (content, metadata) =>
        this.segmentContentIntoElements(content, metadata),
      replaceElementWithSegments: (elementId, segments) =>
        this.config.changes.replaceElementWithSegments(elementId, segments),
      ensureSegmentDom: (elementIds, segments, removedIds) =>
        this.ensureSegmentDom(elementIds, segments, removedIds),
      resolveListEditorTarget: (element) =>
        this.resolveListEditorTarget(element),
      refresh: () => this.refresh(),
      onEditorClosed: () => {
        // Clear heading reference cache
        const currentElementId =
          this.stateStore.getEditorState().currentElementId;
        if (currentElementId) {
          this.activeHeadingReferenceCache.delete(currentElementId);
        }
      },
      onEditorSaved: () => {
        // Placeholder for future save-specific logic
      },
      createEditorModal: (content, type) =>
        this.createEditorModal(content, type),
      initializeMilkdown: (container, content, diffHighlights) =>
        this.initializeMilkdown(container, content, diffHighlights ?? []),
      createEditorSession: (elementId, type) =>
        this.createEditorSession(elementId, type),
    };

    this.editorManager = new EditorManager(
      editorManagerConfig,
      editorCallbacks,
      this.stateStore
    );

    this.mainSidebarModule.onUndo(() => {
      if (this.config.changes.undo()) {
        this.refresh();
      }
    });
    initializeDebugTools({
      changes: this.config.changes,
      comments: this.config.comments,
    });
    this.mainSidebarModule.onRedo(() => {
      if (this.config.changes.redo()) {
        this.refresh();
      }
    });
    const enableExport = Boolean(this.exporter);
    this.mainSidebarModule.onExportClean(
      enableExport
        ? () => {
            void this.handleExportQmd('clean');
          }
        : undefined
    );
    this.mainSidebarModule.onExportCritic(
      enableExport
        ? () => {
            void this.handleExportQmd('critic');
          }
        : undefined
    );
    const enableReviewSubmit = Boolean(this.reviewService);
    this.mainSidebarModule.onSubmitReview(
      enableReviewSubmit
        ? () => {
            void this.handleSubmitReview();
          }
        : undefined
    );
    this.mainSidebarModule.setSubmitReviewEnabled(enableReviewSubmit);
    this.mainSidebarModule.onTrackedChangesToggle((enabled) => {
      this.toggleTrackedChanges(enabled);
    });
    this.mainSidebarModule.onToggleSidebar(() => {
      this.toggleSidebarCollapsed();
    });
    this.mainSidebarModule.onClearDrafts(() => {
      void this.persistenceManager.confirmAndClearLocalDrafts();
    });

    this.cacheInitialHeadingReferences();
    // Initialize sidebar immediately so it's always visible
    this.initializeSidebar();

    // Migrate any inline comments to CommentsModule storage
    this.migrateInlineComments();

    requestAnimationFrame(() => {
      this.refreshCommentUI();
    });

    if (this.localPersistence) {
      void this.persistenceManager.restoreLocalDraft();
    }
  }

  /**
   * Initialize the persistent sidebar on page load
   */
  private initializeSidebar(): void {
    // Create sidebar immediately after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.getOrCreateToolbar();
      });
    } else {
      this.getOrCreateToolbar();
    }
  }

  /**
   * Set up reactive listeners for state changes
   * Automatically updates UI when state changes occur
   */
  private setupStateListeners(): void {
    // Listen for editor state changes
    this.stateStore.on<EditorState>('editor:changed', (editorState) => {
      logger.debug('Editor state changed', editorState);

      // When showTrackedChanges changes, update the sidebar UI
      // Note: refresh() is already called when toggleTrackedChanges is invoked,
      // so we only need to ensure the sidebar reflects the current state
      this.mainSidebarModule.setTrackedChangesVisible(
        editorState.showTrackedChanges
      );
    });

    // Listen for UI state changes
    this.stateStore.on<UIState>('ui:changed', (uiState) => {
      logger.debug('UI state changed', uiState);

      // Update sidebar collapsed state in the UI
      const toolbar = document.querySelector(
        '.review-toolbar'
      ) as HTMLElement | null;
      if (toolbar) {
        toolbar.classList.toggle(
          'review-sidebar-collapsed',
          uiState.isSidebarCollapsed
        );
        if (document.body) {
          document.body.classList.toggle(
            'review-sidebar-collapsed-mode',
            uiState.isSidebarCollapsed
          );
        }
        this.mainSidebarModule.setCollapsed(uiState.isSidebarCollapsed);
      }

      // Also update comments sidebar collapsed state
      const commentsSidebar = document.querySelector(
        '.review-comments-sidebar'
      );
      if (commentsSidebar) {
        commentsSidebar.classList.toggle(
          'review-sidebar-collapsed',
          uiState.isSidebarCollapsed
        );
      }
    });

    // Listen for comment state changes
    this.stateStore.on('comment:changed', (commentState) => {
      logger.debug('Comment state changed', commentState);
      // Comment state changes are handled by CommentController
      // which already has a reference to the state
    });

    logger.info('State listeners initialized - UI will react to state changes');
  }

  public toggleSidebarCollapsed(force?: boolean): void {
    const sidebar = this.getOrCreateToolbar();
    const nextState =
      typeof force === 'boolean'
        ? force
        : !sidebar.classList.contains('review-sidebar-collapsed');
    this.applySidebarCollapsedState(nextState, sidebar);
  }

  private applySidebarCollapsedState(
    collapsed: boolean,
    sidebar?: HTMLElement
  ): void {
    const toolbar = sidebar ?? this.getOrCreateToolbar();
    this.stateStore.setUIState({ isSidebarCollapsed: collapsed });

    toolbar.classList.toggle('review-sidebar-collapsed', collapsed);
    if (document.body) {
      document.body.classList.toggle(
        'review-sidebar-collapsed-mode',
        collapsed
      );
    }

    // Also collapse/expand the comments sidebar
    const commentsSidebar = document.querySelector('.review-comments-sidebar');
    if (commentsSidebar) {
      commentsSidebar.classList.toggle('review-sidebar-collapsed', collapsed);
    }

    this.mainSidebarModule.setCollapsed(collapsed);
  }

  private mountUIPlugin(
    plugin: ReviewUIPlugin,
    context: ReviewUIContext
  ): PluginHandle {
    this.unmountUIPlugin(plugin.id);
    const handle = plugin.mount(context);
    this.pluginHandles.set(plugin.id, handle);
    return handle;
  }

  private unmountUIPlugin(id: string): void {
    const handle = this.pluginHandles.get(id);
    if (!handle) {
      return;
    }
    try {
      handle.dispose();
    } catch (error) {
      logger.warn('Failed to dispose UI plugin', { id, error });
    }
    this.pluginHandles.delete(id);
  }

  private ensureTranslationPlugin(): TranslationPlugin {
    if (!this.translationModule) {
      throw new Error('Translation module is not available');
    }

    if (!this.translationPlugin) {
      this.translationPlugin = new TranslationPlugin({
        translationModule: this.translationModule,
        resolveConfig: () => this.resolveTranslationModuleConfig(),
        notify: (message, type) => {
          const mappedType = type === 'warning' ? 'info' : type;
          this.showNotification(message, mappedType);
        },
        onProgress: (status) => {
          this.mainSidebarModule.setTranslationProgress(status);
        },
        onBusyChange: (busy) => {
          this.mainSidebarModule.setTranslationBusy(busy);
        },
      });
    }

    return this.translationPlugin;
  }

  private buildTranslationPluginContext(
    container: HTMLElement
  ): ReviewUIContext {
    return {
      container,
      events: {
        on: (event: string, handler: (...args: any[]) => void) => {
          const module = this.translationModule as unknown as {
            on?: (
              event: string,
              handler: (...args: any[]) => void
            ) => () => void;
          };

          if (!module || typeof module.on !== 'function') {
            return () => {
              /* no-op */
            };
          }

          return module.on(event, handler);
        },
      },
    };
  }

  private resolveTranslationModuleConfig(): TranslationModuleConfig {
    if (!this.translationModule) {
      throw new Error('Translation module is not available');
    }

    const config = this.translationModule.getModuleConfig();
    const documentId = this.getTranslationDocumentId();
    if (documentId) {
      config.documentId = documentId;
    }
    return config;
  }

  private getTranslationDocumentId(): string | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  private registerTranslationSidebarCallbacks(): void {
    if (!this.translationController) {
      return;
    }

    this.mainSidebarModule.onTranslateDocument(() => {
      void this.translationController?.translateDocument();
    });
    this.mainSidebarModule.onTranslateSentence(() => {
      void this.translationController?.translateSentence();
    });
    this.mainSidebarModule.onProviderChange((provider) => {
      this.translationController?.setProvider(provider);
    });
    this.mainSidebarModule.onSourceLanguageChange((lang) => {
      void this.translationController?.setSourceLanguage(lang);
    });
    this.mainSidebarModule.onTargetLanguageChange((lang) => {
      void this.translationController?.setTargetLanguage(lang);
    });
    this.mainSidebarModule.onSwapLanguages(() => {
      this.translationController?.swapLanguages();
    });
    this.mainSidebarModule.onAutoTranslateChange((enabled) => {
      this.translationController?.setAutoTranslate(enabled);
    });
    this.mainSidebarModule.onTranslationExportUnified(() => {
      void this.translationController?.exportUnified();
    });
    this.mainSidebarModule.onTranslationExportSeparated(() => {
      void this.translationController?.exportSeparated();
    });
    this.mainSidebarModule.onClearLocalModelCache(() => {
      void this.translationController?.clearLocalModelCache();
    });

    this.mainSidebarModule.onTranslationUndo(() => {
      if (this.translationController?.undo()) {
        this.updateTranslationUndoRedoState();
      }
    });
    this.mainSidebarModule.onTranslationRedo(() => {
      if (this.translationController?.redo()) {
        this.updateTranslationUndoRedoState();
      }
    });
  }

  private resetTranslationSidebarCallbacks(): void {
    this.mainSidebarModule.onTranslateDocument(undefined);
    this.mainSidebarModule.onTranslateSentence(undefined);
    this.mainSidebarModule.onProviderChange(undefined);
    this.mainSidebarModule.onSourceLanguageChange(undefined);
    this.mainSidebarModule.onTargetLanguageChange(undefined);
    this.mainSidebarModule.onSwapLanguages(undefined);
    this.mainSidebarModule.onAutoTranslateChange(undefined);
    this.mainSidebarModule.onTranslationExportUnified(undefined);
    this.mainSidebarModule.onTranslationExportSeparated(undefined);
    this.mainSidebarModule.onClearLocalModelCache(undefined);
    this.mainSidebarModule.onTranslationUndo(undefined);
    this.mainSidebarModule.onTranslationRedo(undefined);
  }

  /**
   * Toggle translation UI
   */
  private async toggleTranslation(): Promise<void> {
    if (!this.translationModule) {
      this.showNotification('Translation module is not available', 'error');
      return;
    }

    try {
      if (this.translationController) {
        // Close existing translation UI - merge changes back to review before destroying
        logger.info('Exiting translation mode, merging changes');

        // Check if source content has changed while in translation mode
        if (this.translationModule.hasSourceChanged()) {
          const userConfirmed = window.confirm(
            'The source document has been modified since you started translating.\n\n' +
              'Your translation may be based on outdated source text.\n\n' +
              'Do you want to continue and merge the translation changes?\n\n' +
              '(Click OK to merge translation, or Cancel to discard translation)'
          );

          if (!userConfirmed) {
            logger.info('User cancelled translation merge due to out-of-sync');
            this.showNotification(
              'Translation merge cancelled - source was modified',
              'info'
            );
            return;
          }

          this.showNotification(
            'Merging translation despite source modifications',
            'info'
          );
        }

        // Merge translation edits back to review mode
        const elementUpdates = this.translationModule.mergeToElements();
        const mergeApplied = this.translationModule.applyMergeToChanges(
          elementUpdates,
          this.config.changes
        );

        if (mergeApplied) {
          this.showNotification(
            'Translation changes merged to review mode',
            'success'
          );
        }

        // Clean up translation UI through plugin manager
        this.unmountUIPlugin('translation-ui');
        this.translationController = null;
        this.resetTranslationSidebarCallbacks();

        // Remove translation view container
        const translationView = document.querySelector(
          '#translation-view-container'
        );
        translationView?.remove();

        // Show original content and comments (sidebar stays visible)
        this.showOriginalDocument(true);
        this.showCommentsSidebar(true);
        document.body.classList.remove('translation-mode');

        // Switch sidebar back to review mode
        this.mainSidebarModule.setTranslationMode(false);
        this.mainSidebarModule.setTranslationActive(false);

        // Refresh review mode to show merged changes
        this.refresh();

        this.showNotification('Translation UI closed', 'info');
      } else {
        // Open translation UI - hide original document and comments (keep main sidebar visible)
        this.showOriginalDocument(false);
        this.showCommentsSidebar(false);
        document.body.classList.add('translation-mode');

        // Create translation view container (directly in document, no separate wrapper needed)
        const container = document.createElement('div');
        container.id = 'translation-view-container';
        container.className = 'review-translation-view';

        // Insert translation view into document
        const mainContent = document.querySelector('#quarto-document-content');
        if (mainContent?.parentNode) {
          mainContent.parentNode.insertBefore(container, mainContent);
        } else {
          document.body.insertBefore(container, document.body.firstChild);
        }

        const plugin = this.ensureTranslationPlugin();
        const handle = this.mountUIPlugin(
          plugin,
          this.buildTranslationPluginContext(container)
        );

        if (handle.ready) {
          await handle.ready;
        }

        this.translationController = plugin.getController();
        if (!this.translationController) {
          throw new Error('Translation controller failed to initialize');
        }

        this.translationController.focusView();

        // Set up translation mode in sidebar (show translation tools, hide review tools)
        this.mainSidebarModule.setTranslationMode(true);
        this.mainSidebarModule.setTranslationBusy(false);
        this.registerTranslationSidebarCallbacks();

        // Update sidebar with translation providers and languages
        const providers = this.translationController.getAvailableProviders();
        this.mainSidebarModule.updateTranslationProviders(providers);

        const languages = this.translationController.getAvailableLanguages();
        this.mainSidebarModule.updateTranslationLanguages(languages, languages);

        this.updateTranslationUndoRedoState();
        this.mainSidebarModule.setTranslationActive(true);

        this.showNotification('Translation UI opened', 'success');
      }
    } catch (error) {
      logger.error('Failed to toggle translation UI', error);
      this.showNotification('Failed to toggle translation UI', 'error');
    }
  }

  /**
   * Show or hide original document content
   */
  private showOriginalDocument(show: boolean): void {
    const editableElements = document.querySelectorAll('.review-editable');
    editableElements.forEach((elem) => {
      (elem as HTMLElement).style.display = show ? '' : 'none';
    });
  }

  /**
   * Show or hide comments sidebar
   */
  private showCommentsSidebar(show: boolean): void {
    const sidebar = document.querySelector('.review-comments-sidebar');
    if (sidebar) {
      (sidebar as HTMLElement).style.display = show ? '' : 'none';
    }
  }

  /**
   * Toggle visibility of tracked changes
   */
  public toggleTrackedChanges(force?: boolean): void {
    const currentShowTrackedChanges =
      this.stateStore.getEditorState().showTrackedChanges;
    const nextState =
      typeof force === 'boolean' ? force : !currentShowTrackedChanges;

    if (currentShowTrackedChanges === nextState) {
      this.mainSidebarModule.setTrackedChangesVisible(nextState);
      return;
    }

    this.stateStore.setEditorState({ showTrackedChanges: nextState });
    this.mainSidebarModule.setTrackedChangesVisible(nextState);
    this.refresh();
  }

  /**
   * Get current tracked changes mode
   */
  public isShowingTrackedChanges(): boolean {
    return this.stateStore.getEditorState().showTrackedChanges;
  }

  public attachEventListeners(): void {
    this.bindEditableElements(document);
    this.bindGlobalShortcuts();
  }

  private bindEditableElementEvents(elem: HTMLElement): void {
    if (elem.dataset.reviewEventsBound === 'true') {
      return;
    }
    elem.dataset.reviewEventsBound = 'true';

    elem.addEventListener('click', (e) => {
      if (this.shouldIgnoreInteraction(e, elem)) {
        return;
      }
      if (e instanceof MouseEvent && e.detail > 1) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      const id = elem.getAttribute('data-review-id');
      if (id) {
        const mouseEvent = e as MouseEvent;
        this.contextMenuCoordinator?.openFromEvent(elem, mouseEvent);
      }
    });

    elem.addEventListener('dblclick', (e) => {
      if (this.shouldIgnoreInteraction(e, elem)) {
        return;
      }
      e.preventDefault();
      const id = elem.getAttribute('data-review-id');
      if (id) {
        this.openEditor(id);
      }
    });

    elem.addEventListener('mouseenter', () => {
      if (!elem.classList.contains('review-editable-editing')) {
        elem.classList.add('review-hover');
      }
    });

    elem.addEventListener('mouseleave', () => {
      elem.classList.remove('review-hover');
    });

    elem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private shouldIgnoreInteraction(event: Event, elem: HTMLElement): boolean {
    if (event instanceof MouseEvent && event.button !== 0) {
      return true;
    }
    if (elem.classList.contains('review-editable-editing')) {
      return true;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('.review-inline-editor-container')) {
      return true;
    }
    if (target?.closest('.review-section-comment-indicator')) {
      return true;
    }
    return false;
  }

  private bindEditableElements(root: ParentNode): void {
    const editableElements = root.querySelectorAll?.('[data-review-id]') ?? [];
    editableElements.forEach((elem) => {
      if (elem instanceof HTMLElement) {
        this.bindEditableElementEvents(elem);
      }
    });
  }

  private bindGlobalShortcuts(): void {
    if (this.globalShortcutsBound) {
      return;
    }
    this.globalShortcutsBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.stateStore.getEditorState().activeEditor) {
        this.closeEditor();
      }
    });
  }

  public openEditor(elementId: string): void {
    // Delegate to EditorManager
    this.editorManager.openEditor(elementId);
  }

  private async initializeMilkdown(
    container: HTMLElement,
    content: string,
    diffHighlights: DiffHighlightRange[] = []
  ): Promise<void> {
    this.stateStore.setEditorState({ currentEditorContent: content });
    try {
      // Determine the element type to configure toolbar/context behaviour.
      const elementId = this.stateStore.getEditorState().currentElementId;
      let elementType = 'default';
      if (elementId) {
        const element = document.querySelector(
          `[data-review-id="${elementId}"]`
        ) as HTMLElement | null;
        if (element) {
          elementType = element.getAttribute('data-review-type') || 'Para';
        }
      }

      const editor = await this.editorLifecycle.initialize({
        container,
        content,
        diffHighlights,
        elementType,
        onContentChange: (markdown) => {
          this.stateStore.setEditorState({ currentEditorContent: markdown });
        },
      });

      this.stateStore.setEditorState({ milkdownEditor: editor });

      logger.debug('Milkdown editor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Milkdown:', error);
      const editorContainer =
        (container.querySelector(
          '.review-editor-body'
        ) as HTMLElement | null) ||
        (container.querySelector(
          '.review-inline-editor-body'
        ) as HTMLElement | null);
      if (editorContainer) {
        editorContainer.innerHTML = `
          <div style="padding:20px; color:red;">
            Failed to initialize editor. Please try again.
            <pre>${error instanceof Error ? error.message : String(error)}</pre>
          </div>
        `;
      }
      this.stateStore.setEditorState({
        activeEditorToolbar: null,
        milkdownEditor: null,
      });
      this.editorLifecycle.destroy();

      // TODO: Notify EditorManager of initialization failure to release operation lock
      // For now, the lock will timeout or be released on next successful operation
    }
  }

  public closeEditor(): void {
    // Delegate to EditorManager
    this.editorManager.closeEditor();
  }

  private saveEditor(): void {
    const editorState = this.stateStore.getEditorState();
    if (!editorState.milkdownEditor || !editorState.currentElementId) return;
    const elementId = editorState.currentElementId;

    // Get markdown content from tracked state
    let newContent = normalizeListMarkers(editorState.currentEditorContent);
    const cachedHeadingReference =
      this.activeHeadingReferenceCache.get(elementId);
    if (cachedHeadingReference) {
      newContent = this.applyHeadingReference(
        newContent,
        cachedHeadingReference
      );
    }

    const leadingWhitespaceResult = this.stripLeadingBlankLines(newContent);
    if (leadingWhitespaceResult.removed) {
      newContent = leadingWhitespaceResult.content;
      this.showWhitespaceIgnoredNotification();
    }
    this.stateStore.setEditorState({ currentEditorContent: newContent });

    const elementData = this.config.changes.getElementById(elementId);
    if (!elementData) {
      logger.error('Element not found for save:', { elementId });
      this.closeEditor();
      return;
    }

    const segments = this.segmentContentIntoElements(
      newContent,
      elementData.metadata
    );

    const originalContentRaw = this.config.changes.getElementContent(elementId);
    const originalContent = normalizeListMarkers(originalContentRaw);
    const strippedOriginal =
      this.stripLeadingBlankLines(originalContent).content;

    const originalNormalized = normalizeContentForComparison(strippedOriginal);
    const newNormalized = normalizeContentForComparison(newContent);
    const noTextChange = originalNormalized === newNormalized;

    if (noTextChange) {
      const generatedSegments = this.collectGeneratedSegments(elementId);
      if (generatedSegments.length > 0) {
        segments.push(...generatedSegments);
      }
    }

    logger.debug('Saving editor');
    logger.trace('Original normalized:', originalNormalized);
    logger.trace('New normalized:', newNormalized);

    const { elementIds, removedIds } =
      this.config.changes.replaceElementWithSegments(elementId, segments);

    this.ensureSegmentDom(elementIds, segments, removedIds);

    this.updateHeadingReferencesAfterSave(
      elementId,
      segments,
      elementIds,
      removedIds
    );

    if (originalNormalized === newNormalized && segments.length === 1) {
      logger.debug('No meaningful content change detected for primary segment');
    }

    this.persistenceManager.persistDocument();

    this.closeEditor();
    this.refresh();
  }

  private async handleExportQmd(format: ExportFormat): Promise<void> {
    if (!this.exporter) {
      this.showNotification('Export service is not configured.', 'error');
      return;
    }

    try {
      const result = await this.exporter.exportToQmd({ format });
      const message =
        result.fileCount === 1
          ? `Exported ${result.filenames[0]}`
          : `Exported ${result.fileCount} files to ${result.downloadedAs}`;
      this.showNotification(message, 'success');
    } catch (error) {
      logger.error('Failed to export QMD files', error);
      this.showNotification('Failed to export QMD files.', 'error');
    }
  }

  private async handleSubmitReview(): Promise<void> {
    if (!this.reviewService) {
      this.showNotification(
        'Git review submission is not configured.',
        'error'
      );
      return;
    }
    if (this.isSubmittingReview) {
      return;
    }

    const reviewer = this.getReviewerDisplayName();
    const repoConfig = this.reviewService.getRepositoryConfig();
    const baseBranch = repoConfig?.baseBranch ?? 'main';
    const format: ExportFormat = this.stateStore.getEditorState()
      .showTrackedChanges
      ? 'critic'
      : 'clean';

    const initialValues = this.buildReviewInitialValues(reviewer, baseBranch);
    const modal = this.getReviewSubmissionModal();
    const formValues = await modal.open(initialValues);
    if (!formValues) {
      return;
    }

    const resolvedReviewer = formValues.reviewer.trim() || reviewer;
    const resolvedBranch = this.sanitizeBranchName(
      formValues.branchName.trim() || initialValues.branchName
    );
    const resolvedBaseBranch = formValues.baseBranch.trim() || baseBranch;
    const resolvedCommitMessage =
      formValues.commitMessage.trim() || initialValues.commitMessage;
    const resolvedTitle =
      formValues.pullRequestTitle.trim() || initialValues.pullRequestTitle;
    const resolvedBody = formValues.pullRequestBody.trim();
    const patToken = formValues.patToken;

    if (formValues.requirePat) {
      this.reviewService.updateAuthToken(patToken);
    } else if (patToken) {
      this.reviewService.updateAuthToken(patToken);
    }

    const loading = this.showLoading('Submitting review to Git…');
    this.isSubmittingReview = true;
    this.mainSidebarModule.setSubmitReviewPending(true);

    try {
      const context = await this.reviewService.submitReview({
        reviewer: resolvedReviewer,
        branchName: resolvedBranch,
        baseBranch: resolvedBaseBranch,
        commitMessage: resolvedCommitMessage,
        format,
        pullRequest: {
          title: resolvedTitle,
          body: resolvedBody,
          draft: formValues.draft,
        },
      });

      const pr = context.result.pullRequest;
      const message = pr.url
        ? `Review submitted: ${pr.url}`
        : `Review submitted: PR #${pr.number}`;
      this.showNotification(message, 'success');
    } catch (error) {
      logger.error('Failed to submit git review', error);
      const message =
        error instanceof Error && error.message
          ? `Review submission failed: ${error.message}`
          : 'Failed to submit review to Git provider.';
      this.showNotification(message, 'error');
    } finally {
      this.hideLoading(loading);
      this.isSubmittingReview = false;
      this.mainSidebarModule.setSubmitReviewPending(false);
      this.mainSidebarModule.setSubmitReviewEnabled(
        Boolean(this.reviewService)
      );
    }
  }

  private getReviewerDisplayName(): string {
    const user = this.userModule?.getCurrentUser?.();
    if (!user) {
      return 'Reviewer';
    }
    return (
      user.name?.trim() || user.email?.trim() || user.id?.trim() || 'Reviewer'
    );
  }

  private buildPullRequestBody(reviewer: string): string {
    const lines = [
      `Automated review submission by ${reviewer}.`,
      '',
      'This pull request was generated from the Quarto Review web UI.',
    ];
    return lines.join('\n');
  }

  private buildReviewInitialValues(
    reviewer: string,
    baseBranch: string
  ): ReviewSubmissionInitialValues {
    const requirePat = this.reviewService!.requiresAuthToken();
    return {
      reviewer,
      baseBranch,
      branchName: this.generateSuggestedBranchName(reviewer),
      commitMessage: `Review updates from ${reviewer}`,
      pullRequestTitle: `Review updates from ${reviewer}`,
      pullRequestBody: this.buildPullRequestBody(reviewer),
      draft: false,
      requirePat,
      patToken: '',
    };
  }

  private getReviewSubmissionModal(): ReviewSubmissionModal {
    if (!this.reviewSubmissionModal) {
      this.reviewSubmissionModal = new ReviewSubmissionModal();
    }
    return this.reviewSubmissionModal;
  }

  private generateSuggestedBranchName(reviewer: string): string {
    const slug = reviewer
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .slice(0, 19);
    const raw = slug ? `review/${slug}-${timestamp}` : `review/${timestamp}`;
    return this.sanitizeBranchName(raw);
  }

  private sanitizeBranchName(name: string): string {
    const cleaned = name
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^A-Za-z0-9._/-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'review-branch';
  }

  private createEditorModal(_content: string, type: string): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'review-editor-modal';
    modal.innerHTML = `
      <div class="review-editor-container">
        <div class="review-editor-header">
          <h3>Edit ${type}</h3>
          <button class="review-btn review-btn-secondary" data-action="close">✕</button>
        </div>
        <div class="review-editor-body"></div>
        <div class="review-editor-footer">
          <button class="review-btn review-btn-secondary" data-action="cancel">Cancel</button>
          <button class="review-btn review-btn-primary" data-action="save">Save</button>
        </div>
      </div>
    `;

    modal
      .querySelector('[data-action="close"]')
      ?.addEventListener('click', () => this.closeEditor());
    modal
      .querySelector('[data-action="cancel"]')
      ?.addEventListener('click', () => this.closeEditor());
    modal
      .querySelector('[data-action="save"]')
      ?.addEventListener('click', () => this.saveEditor());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeEditor();
      }
    });

    return modal;
  }

  public refresh(): void {
    const currentState = this.config.changes.getCurrentState();
    const operations = this.config.changes.getOperations();

    // CRITICAL FIX: Track which elements have modifications to properly handle undo/redo
    // When undoing, elements that previously had operations now have none,
    // but we still need to refresh their display to show original state
    const currentlyModifiedIds = new Set(
      operations.filter((op) => op.type === 'edit').map((op) => op.elementId)
    );

    const currentElementId = this.stateStore.getEditorState().currentElementId;
    const showTrackedChanges =
      this.stateStore.getEditorState().showTrackedChanges;

    currentState.forEach((elem) => {
      const relevantOperations = operations.filter(
        (op) => op.elementId === elem.id
      );
      const isModified = relevantOperations.length > 0;

      // IMPORTANT: Always check if element was previously modified (shown in DOM)
      // This ensures undo/redo properly updates display even when removing operations
      const wasPreviouslyModified =
        elem.id === currentElementId ||
        document.querySelector(
          `[data-review-id="${elem.id}"][data-review-modified="true"]`
        );

      if (!isModified && !wasPreviouslyModified) {
        return;
      }

      // If showing tracked changes, get content with CriticMarkup visualization
      if (showTrackedChanges) {
        const hasEdits = relevantOperations.some((op) => op.type === 'edit');

        if (hasEdits) {
          // Get content with tracked changes visualization
          const contentWithChanges =
            this.config.changes.getElementContentWithTrackedChanges(elem.id);

          // Create a modified element for display
          const displayElem = {
            ...elem,
            content: contentWithChanges,
          };
          this.updateElementDisplay(displayElem);
        } else {
          this.updateElementDisplay(elem);
        }
      } else {
        this.updateElementDisplay(elem);
      }
    });

    // Update modified marker for all elements
    // Elements WITH modifications get the marker, elements WITHOUT get it removed
    currentState.forEach((elem) => {
      const domElement = document.querySelector(
        `[data-review-id="${elem.id}"]`
      );
      if (!domElement) return;

      if (currentlyModifiedIds.has(elem.id)) {
        domElement.setAttribute('data-review-modified', 'true');
      } else {
        // CRITICAL FIX: Remove modified marker when undo removes all operations
        domElement.removeAttribute('data-review-modified');
      }
    });

    this.updateUnsavedIndicator();
    this.refreshCommentUI();
    this.syncToolbarState();
  }

  /**
   * Clean nested review-editable div fences from markdown content
   * Removes patterns like: ::: {class="review-editable" ...} content :::
   */
  private cleanNestedDivs(content: string): string {
    // Remove pandoc div fences that represent nested review-editable elements
    // Pattern: ::: {class="review-editable" ...} ... :::
    // Also handles data-review-* attributes in any order
    return content.replace(
      /:::\s*\{[^}]*review-editable[^}]*\}[\s\S]*?:::/g,
      ''
    );
  }

  private prepareEditorContent(
    elementId: string,
    content: string,
    type: string,
    options: { skipHeadingCache?: boolean } = {}
  ): string {
    const { skipHeadingCache = false } = options;

    if (type !== 'Header') {
      if (!skipHeadingCache) {
        this.activeHeadingReferenceCache.delete(elementId);
      }
      return content;
    }

    const headingReference = this.ensureHeadingReferenceInfo(
      elementId,
      content
    );

    if (headingReference) {
      const strippedContent = this.removeHeadingReference(
        content,
        headingReference
      );
      if (!skipHeadingCache) {
        this.activeHeadingReferenceCache.set(elementId, headingReference);
      }
      return strippedContent;
    }

    if (!skipHeadingCache) {
      this.activeHeadingReferenceCache.delete(elementId);
    }
    return content;
  }

  private prepareEditorContentVariants(
    elementId: string,
    type: string,
    showTrackedChanges: boolean
  ): {
    plainContent: string;
    trackedContent: string;
  } {
    const rawPlain = this.config.changes.getElementContent(elementId);
    const rawTracked = showTrackedChanges
      ? this.config.changes.getElementContentWithTrackedChanges(elementId)
      : rawPlain;

    const cleanedPlain = this.cleanNestedDivs(rawPlain);
    const cleanedTracked = this.cleanNestedDivs(rawTracked);

    const preparedPlain = this.prepareEditorContent(
      elementId,
      cleanedPlain,
      type
    );
    const preparedTracked = this.prepareEditorContent(
      elementId,
      cleanedTracked,
      type,
      { skipHeadingCache: true }
    );

    return {
      plainContent: preparedPlain,
      trackedContent: preparedTracked,
    };
  }

  private createEditorSession(
    elementId: string,
    type: string
  ): {
    plainContent: string;
    trackedContent: string;
    diffHighlights: DiffHighlightRange[];
  } {
    const showTrackedChanges =
      this.stateStore.getEditorState().showTrackedChanges;
    const { plainContent, trackedContent } = this.prepareEditorContentVariants(
      elementId,
      type,
      showTrackedChanges
    );

    const diffHighlights = showTrackedChanges
      ? this.computeDiffHighlightRanges(trackedContent)
      : [];

    return { plainContent, trackedContent, diffHighlights };
  }

  private updateHeadingReferencesAfterSave(
    elementId: string,
    segments: { content: string; metadata: ElementMetadata }[],
    updatedElementIds: string[],
    removedIds: string[]
  ): void {
    this.headingReferenceLookup.delete(elementId);
    removedIds.forEach((id) => {
      this.headingReferenceLookup.delete(id);
      this.activeHeadingReferenceCache.delete(id);
    });
    updatedElementIds.forEach((id, index) => {
      const segment = segments[index];
      if (!segment || !id) {
        return;
      }
      if (segment.metadata?.type === 'Header') {
        this.syncHeadingReference(id, segment.content);
      }
    });
  }

  private computeDiffHighlightRanges(
    trackedContent: string
  ): DiffHighlightRange[] {
    if (!trackedContent) {
      return [];
    }

    const ranges: DiffHighlightRange[] = [];

    const additionPattern = /\{\+\+([\s\S]*?)\+\+\}/g;
    let additionMatch: RegExpExecArray | null;
    while ((additionMatch = additionPattern.exec(trackedContent)) !== null) {
      const matchIndex = additionMatch?.index ?? 0;
      const additionGroup = additionMatch?.[1] ?? '';
      if (!additionGroup) {
        continue;
      }
      const prefix = trackedContent.slice(0, matchIndex);
      const start = this.plainLengthForDiff(prefix);
      const addition = this.plainifyForDiff(additionGroup);
      if (!addition) {
        continue;
      }
      ranges.push({
        start,
        end: start + addition.length,
        type: 'addition',
      });
    }

    const substitutionPattern = /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g;
    let substitutionMatch: RegExpExecArray | null;
    while (
      (substitutionMatch = substitutionPattern.exec(trackedContent)) !== null
    ) {
      const matchIndex = substitutionMatch?.index ?? 0;
      const replacementGroup = substitutionMatch?.[2] ?? '';
      if (!replacementGroup) {
        continue;
      }
      const prefix = trackedContent.slice(0, matchIndex);
      const start = this.plainLengthForDiff(prefix);
      const replacement = this.plainifyForDiff(replacementGroup);
      if (!replacement) {
        continue;
      }
      ranges.push({
        start,
        end: start + replacement.length,
        type: 'modification',
      });
    }

    return ranges;
  }

  private plainLengthForDiff(segment: string): number {
    if (!segment) {
      return 0;
    }
    return this.plainifyForDiff(segment).length;
  }

  private plainifyForDiff(segment: string): string {
    if (!segment) {
      return '';
    }
    return segment
      .replace(/\{\+\+([\s\S]*?)\+\+\}/g, '$1')
      .replace(/\{--([\s\S]*?)--\}/g, '')
      .replace(/\{~~([\s\S]*?)~>([\s\S]*?)~~\}/g, '$2')
      .replace(/\{==([\s\S]*?)==\}/g, '$1')
      .replace(/\{>>([\s\S]*?)<<\}/g, '');
  }

  private segmentContentIntoElements(
    content: string,
    originalMetadata: ElementMetadata
  ): { content: string; metadata: ElementMetadata }[] {
    const trimmed = content.trim();
    if (!trimmed) {
      return [
        {
          content: '',
          metadata: originalMetadata,
        },
      ];
    }

    const ast = this.config.markdown.parseToAST(content) as Root;
    const children = ast.children as Content[];
    if (!children || children.length === 0) {
      return [
        {
          content,
          metadata: originalMetadata,
        },
      ];
    }

    const offsets = this.buildLineOffsets(content);
    const segments: { content: string; metadata: ElementMetadata }[] = [];

    children.forEach((node, index) => {
      const start = this.positionToIndex(offsets, node.position?.start);
      const nextNode = children[index + 1];
      const end = nextNode
        ? this.positionToIndex(offsets, nextNode.position?.start)
        : content.length;

      let segmentContent = content.slice(start, end);
      segmentContent = this.normalizeSegmentContent(segmentContent);
      if (!segmentContent.trim()) {
        return;
      }

      const metadata = this.deriveMetadataFromNode(
        node,
        index === 0 ? originalMetadata : undefined
      );
      segments.push({
        content: segmentContent,
        metadata,
      });
    });

    if (segments.length === 0) {
      return [
        {
          content,
          metadata: originalMetadata,
        },
      ];
    }

    return segments;
  }

  private buildLineOffsets(text: string): number[] {
    const offsets: number[] = [0];
    let index = 0;
    const length = text.length;

    while (index < length) {
      const char = text[index];
      if (char === '\r') {
        if (index + 1 < length && text[index + 1] === '\n') {
          offsets.push(index + 2);
          index += 2;
          continue;
        }
        offsets.push(index + 1);
        index += 1;
        continue;
      }
      if (char === '\n') {
        offsets.push(index + 1);
      }
      index += 1;
    }

    return offsets;
  }

  private positionToIndex(
    offsets: number[],
    position?: Position | Point
  ): number {
    if (!position) {
      return 0;
    }

    const line = 'line' in position ? position.line : (position as any).line;
    const column =
      'column' in position ? position.column : (position as any).column;

    const lineIndex = Math.max(0, Math.min(offsets.length - 1, line - 1));
    const base = offsets[lineIndex] ?? 0;
    return base + Math.max(0, column - 1);
  }

  private normalizeSegmentContent(text: string): string {
    let cleaned = text;
    const leadingPattern = /^(?:\s*\r?\n)+/;
    const trailingPattern = /(\r?\n\s*)+$/;

    cleaned = cleaned.replace(leadingPattern, '');
    cleaned = cleaned.replace(trailingPattern, (match) => {
      return match.includes('\n') ? '' : match;
    });

    return cleaned.trimEnd();
  }

  private stripLeadingBlankLines(content: string): {
    content: string;
    removed: boolean;
  } {
    if (!content) {
      return { content, removed: false };
    }
    const stripped = content.replace(/^(?:\s*(?:<br\s*\/?>|\r?\n))+/, '');
    return {
      content: stripped,
      removed: stripped.length !== content.length,
    };
  }

  private showWhitespaceIgnoredNotification(): void {
    this.showNotification(
      'Leading blank lines were removed because whitespace-only changes are ignored.',
      'info'
    );
  }

  private collectGeneratedSegments(
    elementId: string
  ): { content: string; metadata: ElementMetadata }[] {
    const operations = this.config.changes.getOperations?.() ?? [];
    if (!operations.length) {
      return [];
    }

    const activeIds = new Set<string>();
    for (const op of operations) {
      if (op.type === 'insert') {
        const insertData = op.data as { parentId?: string };
        if (insertData.parentId === elementId) {
          activeIds.add(op.elementId);
        }
      } else if (op.type === 'delete') {
        if (activeIds.has(op.elementId)) {
          activeIds.delete(op.elementId);
        }
      }
    }

    if (activeIds.size === 0) {
      return [];
    }

    const state = this.config.changes.getCurrentState?.() ?? [];
    if (!state.length) {
      return [];
    }

    const ordered: { content: string; metadata: ElementMetadata }[] = [];
    let afterParent = false;
    for (const element of state) {
      if (element.id === elementId) {
        afterParent = true;
        continue;
      }
      if (!afterParent) {
        continue;
      }
      if (activeIds.has(element.id)) {
        ordered.push({
          content: element.content,
          metadata: element.metadata,
        });
      } else if (ordered.length > 0) {
        break;
      } else {
        break;
      }
    }

    return ordered;
  }

  private deriveMetadataFromNode(
    node: Content,
    fallback?: ElementMetadata
  ): ElementMetadata {
    switch (node.type) {
      case 'heading': {
        const heading = node as MdHeading;
        return {
          type: 'Header',
          level: heading.depth,
          attributes:
            fallback && fallback.type === 'Header'
              ? { ...fallback.attributes }
              : undefined,
          classes:
            fallback && fallback.type === 'Header'
              ? [...(fallback.classes ?? [])]
              : undefined,
        };
      }
      case 'code': {
        return {
          type: 'CodeBlock',
        };
      }
      case 'list': {
        const list = node as MdList;
        return {
          type: list.ordered ? 'OrderedList' : 'BulletList',
        };
      }
      case 'blockquote': {
        return {
          type: 'BlockQuote',
        };
      }
      case 'table': {
        return {
          type: 'Div',
        };
      }
      case 'paragraph': {
        return {
          type: 'Para',
          attributes:
            fallback && fallback.type === 'Para'
              ? { ...fallback.attributes }
              : undefined,
          classes:
            fallback && fallback.type === 'Para'
              ? [...(fallback.classes ?? [])]
              : undefined,
        };
      }
      default: {
        if (fallback) {
          return {
            ...fallback,
          };
        }
        return {
          type: 'Div',
        };
      }
    }
  }

  private ensureSegmentDom(
    elementIds: string[],
    segments: { content: string; metadata: ElementMetadata }[],
    removedIds: string[]
  ): void {
    this.removeObsoleteSegmentNodes(removedIds);
    this.syncSegmentNodes(elementIds, segments);
  }

  private removeObsoleteSegmentNodes(ids: string[]): void {
    ids.forEach((id) => {
      const existing = document.querySelector(
        `[data-review-id="${id}"]`
      ) as HTMLElement | null;
      if (existing?.parentElement) {
        existing.parentElement.removeChild(existing);
      }
    });
  }

  private syncSegmentNodes(
    elementIds: string[],
    segments: { content: string; metadata: ElementMetadata }[]
  ): void {
    for (let index = 1; index < elementIds.length; index++) {
      const id = elementIds[index];
      const previousId = elementIds[index - 1];
      if (!id || !previousId) {
        continue;
      }
      const existing = document.querySelector(
        `[data-review-id="${id}"]`
      ) as HTMLElement | null;
      if (!existing) {
        this.createAndInsertSegmentNode(id, previousId, segments[index]);
        continue;
      }
      this.ensureSegmentOrder(existing, previousId);
    }
  }

  private createAndInsertSegmentNode(
    id: string,
    previousId: string,
    segment?: { content: string; metadata: ElementMetadata }
  ): void {
    const metadata = segment?.metadata;
    if (!segment || !metadata) {
      return;
    }
    const node = this.createEditableShell(id, metadata);
    this.insertEditableAfter(previousId, node);
    this.bindEditableElementEvents(node);
  }

  private ensureSegmentOrder(node: HTMLElement, previousId: string): void {
    const previousNode = document.querySelector(
      `[data-review-id="${previousId}"]`
    ) as HTMLElement | null;
    if (!previousNode || !previousNode.parentNode) {
      return;
    }
    const desiredParent = previousNode.parentNode;
    const anchor = previousNode.nextSibling;
    if (
      node.parentNode !== desiredParent ||
      node.previousSibling !== previousNode
    ) {
      desiredParent.insertBefore(node, anchor);
    }
  }

  private createEditableShell(
    id: string,
    metadata: ElementMetadata
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'review-editable review-editable-generated';
    wrapper.setAttribute('data-review-id', id);
    wrapper.setAttribute('data-review-type', metadata.type);
    if (metadata.level) {
      wrapper.setAttribute('data-review-level', String(metadata.level));
    }
    wrapper.setAttribute('data-review-origin', 'generated');
    return wrapper;
  }

  private insertEditableAfter(referenceId: string, element: HTMLElement): void {
    const reference = document.querySelector(
      `[data-review-id="${referenceId}"]`
    );
    if (reference && reference.parentNode) {
      reference.parentNode.insertBefore(element, reference.nextSibling);
      return;
    }
    document.body.appendChild(element);
  }

  private syncToolbarState(): void {
    const canUndo = this.config.changes.canUndo();
    const canRedo = this.config.changes.canRedo();
    this.mainSidebarModule.updateUndoRedoState(canUndo, canRedo);
    this.mainSidebarModule.setTrackedChangesVisible(
      this.stateStore.getEditorState().showTrackedChanges
    );
  }

  /**
   * Update translation undo/redo button state in sidebar
   */
  private updateTranslationUndoRedoState(): void {
    if (!this.translationController) {
      return;
    }
    const canUndo = this.translationController.canUndo();
    const canRedo = this.translationController.canRedo();
    this.mainSidebarModule.updateTranslationUndoRedoState(canUndo, canRedo);
  }

  private cacheInitialHeadingReferences(): void {
    try {
      const elements = this.config.changes.getCurrentState();
      elements.forEach((element) => {
        if (element.metadata.type !== 'Header') {
          return;
        }
        const info = this.extractHeadingReferenceInfo(element.content);
        if (info) {
          this.headingReferenceLookup.set(element.id, info);
        }
      });
    } catch (error) {
      logger.debug('Skipped initial heading reference cache:', error);
    }
  }

  private ensureHeadingReferenceInfo(
    elementId: string,
    content: string
  ): HeadingReferenceInfo | null {
    const existing = this.headingReferenceLookup.get(elementId);
    if (existing) {
      return existing;
    }
    const extracted = this.extractHeadingReferenceInfo(content);
    if (extracted) {
      this.headingReferenceLookup.set(elementId, extracted);
      return extracted;
    }
    return null;
  }

  private extractHeadingReferenceInfo(
    content: string
  ): HeadingReferenceInfo | null {
    if (!content) {
      return null;
    }
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(newline);
    if (lines.length === 0) {
      return null;
    }

    const firstLineOriginal = lines[0];
    const firstLine = firstLineOriginal ? trimLineEnd(firstLineOriginal) : '';
    const closingIndex = firstLine.lastIndexOf('}');
    if (closingIndex === -1 || closingIndex !== firstLine.length - 1) {
      return null;
    }

    const openingIndex = firstLine.lastIndexOf('{', closingIndex);
    if (openingIndex === -1) {
      return null;
    }

    const reference = firstLine.slice(openingIndex, closingIndex + 1).trim();
    if (!reference.startsWith('{#')) {
      return null;
    }

    let prefixStart = openingIndex;
    while (prefixStart > 0 && firstLine.charAt(prefixStart - 1) === ' ') {
      prefixStart--;
    }
    const prefix = firstLine.slice(prefixStart, openingIndex);

    const trimmedLeading = trimLineStart(firstLine);
    const style: 'atx' | 'setext' = trimmedLeading.startsWith('#')
      ? 'atx'
      : 'setext';

    return {
      reference,
      prefix,
      style,
    };
  }

  private removeHeadingReference(
    content: string,
    info: HeadingReferenceInfo
  ): string {
    if (!content) {
      return content;
    }
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(newline);
    if (lines.length === 0) {
      return content;
    }

    const firstLineValue = lines[0];
    if (!firstLineValue) {
      return content;
    }
    const referencePosition = firstLineValue.lastIndexOf(info.reference);
    if (referencePosition === -1) {
      return content;
    }

    const prefixStart = referencePosition - info.prefix.length;
    if (prefixStart < 0) {
      return content;
    }
    const prefixSegment = firstLineValue.slice(prefixStart, referencePosition);

    let removalStart = referencePosition;

    if (info.prefix.length > 0) {
      if (prefixSegment === info.prefix) {
        removalStart = prefixStart;
      } else {
        // Fallback: remove any immediate whitespace before the attribute
        let whitespaceStart = referencePosition;
        while (
          whitespaceStart > 0 &&
          isWhitespaceChar(firstLineValue.charAt(whitespaceStart - 1))
        ) {
          whitespaceStart--;
        }
        removalStart = whitespaceStart;
      }
    } else {
      while (
        removalStart > 0 &&
        isWhitespaceChar(firstLineValue.charAt(removalStart - 1))
      ) {
        removalStart--;
      }
    }

    const before = firstLineValue.slice(0, removalStart);
    const after = firstLineValue.slice(
      referencePosition + info.reference.length
    );
    lines[0] = trimLineEnd(before + after);

    return lines.join(newline);
  }

  private applyHeadingReference(
    content: string,
    info: HeadingReferenceInfo
  ): string {
    if (!content) {
      return content;
    }
    const cleaned = this.removeHeadingReference(content, info);
    const newline = cleaned.includes('\r\n') ? '\r\n' : '\n';
    const lines = cleaned.split(newline);
    if (lines.length === 0) {
      return cleaned;
    }

    const firstLineValue = lines[0];
    if (!firstLineValue) {
      return cleaned;
    }
    const trimmedLeading = trimLineStart(firstLineValue);
    const isAtx = trimmedLeading.startsWith('#');
    const secondLine = lines.length > 1 ? lines[1] : undefined;
    const isSetext = secondLine
      ? isSetextUnderline(trimLineEnd(secondLine))
      : false;

    if (info.style === 'atx' && !isAtx) {
      return cleaned;
    }
    if (info.style === 'setext' && !isSetext) {
      return cleaned;
    }

    const safePrefix = info.prefix.length > 0 ? info.prefix : ' ';
    const withoutTrailing = trimLineEnd(firstLineValue);
    lines[0] = trimLineEnd(`${withoutTrailing}${safePrefix}${info.reference}`);

    return lines.join(newline);
  }

  private syncHeadingReference(elementId: string, content: string): void {
    const updated = this.extractHeadingReferenceInfo(content);
    if (updated) {
      this.headingReferenceLookup.set(elementId, updated);
    } else {
      this.headingReferenceLookup.delete(elementId);
    }
  }

  private updateElementDisplay(elem: ReviewElement): void {
    const domElement = document.querySelector(
      `[data-review-id="${elem.id}"]`
    ) as HTMLElement | null;
    if (!domElement) return;

    domElement.setAttribute('data-review-type', elem.metadata.type);
    if (elem.metadata.level !== undefined) {
      domElement.setAttribute('data-review-level', String(elem.metadata.level));
    } else {
      domElement.removeAttribute('data-review-level');
    }

    // Clean content: remove any nested review-editable fence divs
    let cleanContent = this.cleanNestedDivs(elem.content);

    // For headings, remove persistent Pandoc references for display
    // and normalize CriticMarkup to a single line to avoid rendering issues
    if (elem.metadata.type === 'Header') {
      const headingReference = this.ensureHeadingReferenceInfo(
        elem.id,
        cleanContent
      );
      if (headingReference) {
        cleanContent = this.removeHeadingReference(
          cleanContent,
          headingReference
        );
      }
      cleanContent = this.normalizeCriticMarkupNewlines(cleanContent);
    }

    logger.trace('Updating display for', { elementId: elem.id });
    logger.trace('Content:', cleanContent);

    // Render using Remark with CriticMarkup support
    const html = this.config.markdown.renderElement(
      cleanContent,
      elem.metadata.type,
      elem.metadata.level
    );

    logger.trace('Rendered HTML:', html);

    if (domElement.classList.contains('review-editable-editing')) {
      return;
    }

    const contentElem = domElement.querySelector(
      ':scope > :not([data-review-id]):not(.review-section-comment-indicator)'
    );

    const removableNodes = Array.from(domElement.childNodes).filter((node) => {
      if (node === contentElem) return false;
      if (node instanceof HTMLElement) {
        if (node.classList.contains('review-section-comment-indicator')) {
          return false;
        }
        if (node.hasAttribute('data-review-id')) {
          return false;
        }
      }
      return true;
    });

    removableNodes.forEach((node) => {
      if (node.parentNode === domElement) {
        domElement.removeChild(node);
      }
    });

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const newNodes: ChildNode[] = [];
    while (temp.firstChild) {
      const child = temp.firstChild;
      newNodes.push(child);
      temp.removeChild(child);
    }

    if (contentElem) {
      const firstNewElement = newNodes.find(
        (node): node is HTMLElement => node instanceof HTMLElement
      );

      if (firstNewElement && contentElem instanceof HTMLElement) {
        const combinedClasses = new Set<string>();
        firstNewElement.className
          .split(/\s+/)
          .filter(Boolean)
          .forEach((cls) => combinedClasses.add(cls));
        contentElem.classList.forEach((cls) => combinedClasses.add(cls));
        firstNewElement.className = Array.from(combinedClasses).join(' ');

        Array.from(contentElem.attributes).forEach((attr) => {
          if (attr.name === 'class') return;
          if (!firstNewElement.hasAttribute(attr.name)) {
            firstNewElement.setAttribute(attr.name, attr.value);
          }
        });
      }

      if (newNodes.length > 0) {
        const wrapper = this.wrapSectionContent(
          contentElem.getAttribute('data-review-wrapper') === 'true',
          newNodes
        );
        contentElem.replaceWith(wrapper);
      } else {
        contentElem.remove();
      }
    } else if (newNodes.length > 0) {
      const indicator = domElement.querySelector(
        ':scope > .review-section-comment-indicator'
      );
      const wrapper = this.wrapSectionContent(false, newNodes);
      if (indicator) {
        domElement.insertBefore(wrapper, indicator);
      } else {
        domElement.appendChild(wrapper);
      }
    }

    this.commentController.sanitizeInlineCommentArtifacts(domElement);
  }

  /**
   * Normalize newlines within CriticMarkup for single-line contexts (like headings)
   * Converts: {++ test\n++} → {++ test ++}
   */
  private normalizeCriticMarkupNewlines(content: string): string {
    // Replace newlines within CriticMarkup with spaces
    return content
      .replace(/\{\+\+([\s\S]+?)\+\+\}/g, (_match, text) => {
        return `{++${text.replace(/\s+/g, ' ').trim()}++}`;
      })
      .replace(/\{--([\s\S]+?)--\}/g, (_match, text) => {
        return `{--${text.replace(/\s+/g, ' ').trim()}--}`;
      })
      .replace(/\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g, (_match, old, newText) => {
        return `{~~${old.replace(/\s+/g, ' ').trim()}~>${newText.replace(/\s+/g, ' ').trim()}~~}`;
      })
      .replace(/\{>>([\s\S]+?)<<\}/g, (_match, text) => {
        return `{>>${text.replace(/\s+/g, ' ').trim()}<<}`;
      })
      .replace(/\{==([\s\S]+?)==\}/g, (_match, text) => {
        return `{==${text.replace(/\s+/g, ' ').trim()}==}`;
      });
  }

  /**
   * For list items/sub-lists, resolve the highest ancestor list element so edits apply to the full list.
   */
  private resolveListEditorTarget(element: HTMLElement): HTMLElement | null {
    const selector =
      '[data-review-type="BulletList"], [data-review-type="OrderedList"]';
    let current = element.closest(selector) as HTMLElement | null;
    if (!current) {
      return null;
    }

    let highest = current;
    while (current) {
      const parent = current.parentElement?.closest(
        selector
      ) as HTMLElement | null;
      if (!parent) break;
      highest = parent;
      current = parent;
    }

    return highest;
  }

  private updateUnsavedIndicator(): void {
    const hasUnsaved = this.config.changes.hasUnsavedOperations();
    if (hasUnsaved) {
      this.getOrCreateToolbar();
    }
    this.mainSidebarModule.setHasUnsavedChanges(hasUnsaved);
  }

  private getOrCreateToolbar(): HTMLElement {
    let toolbar = document.querySelector(
      '.review-toolbar'
    ) as HTMLElement | null;
    if (!toolbar) {
      toolbar = this.createPersistentSidebar();
      document.body.appendChild(toolbar);
      this.mainSidebarModule.setTrackedChangesVisible(
        this.stateStore.getEditorState().showTrackedChanges
      );
      this.syncToolbarState();
      this.applySidebarCollapsedState(
        this.stateStore.getUIState().isSidebarCollapsed,
        toolbar
      );

      // Set up translation toggle after sidebar is created
      const enableTranslation = Boolean(this.translationModule);
      this.mainSidebarModule.onToggleTranslation(
        enableTranslation
          ? () => {
              void this.toggleTranslation();
            }
          : undefined
      );
      this.mainSidebarModule.setTranslationEnabled(enableTranslation);
    }
    return toolbar;
  }

  /**
   * Create persistent sidebar with all controls
   */
  private createPersistentSidebar(): HTMLElement {
    const sidebar = this.mainSidebarModule.create();

    if (!this.changeSummaryDashboard) {
      this.changeSummaryDashboard = new ChangeSummaryDashboard(this.config);
    }

    return sidebar;
  }

  private async openCommentComposer(context: {
    elementId: string;
    existingComment?: string;
    commentId?: string;
  }): Promise<void> {
    this.contextMenuCoordinator?.close();
    this.commentsSidebarModule?.show();

    const commentKey = context.commentId
      ? `${context.elementId}:${context.commentId}`
      : undefined;

    await this.commentController.openComposer({
      elementId: context.elementId,
      existingComment: context.existingComment,
      commentKey,
      commentId: context.commentId,
    });

    this.commentController.highlightSection(
      context.elementId,
      'composer',
      commentKey
    );
  }

  private refreshCommentUI(options: { showSidebar?: boolean } = {}): void {
    this.commentController.refreshUI({
      showSidebar: options.showSidebar,
    });
  }

  private wrapSectionContent(
    alreadyWrapped: boolean,
    nodes: ChildNode[]
  ): HTMLElement {
    if (alreadyWrapped) {
      const fragment = document.createDocumentFragment();
      nodes.forEach((node) => fragment.appendChild(node));
      const container = document.createElement('div');
      container.setAttribute('data-review-wrapper', 'true');
      container.className = 'review-section-wrapper';
      container.appendChild(fragment);
      return container;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'review-section-wrapper';
    wrapper.setAttribute('data-review-wrapper', 'true');
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node));
    wrapper.appendChild(fragment);
    return wrapper;
  }

  /**
   * Scroll to and highlight an element
   */
  /**
   * Remove a comment from the content
   */
  public showNotification(
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ): void {
    this.notificationService.show(message, type);
  }

  public showLoading(message = 'Loading...'): HTMLElement {
    return this.loadingService.show({ message });
  }

  public hideLoading(loading: HTMLElement): void {
    this.loadingService.hide(loading);
  }

  /**
   * Migrate inline CriticMarkup comments to CommentsModule storage
   * This is a one-time migration for existing documents with inline comments
   */
  private migrateInlineComments(): void {
    // Skip migration if comments were already imported from localStorage
    if (this.commentsImportedFromStorage) {
      logger.debug(
        'Skipping inline comment migration - comments already imported from storage'
      );
      return;
    }

    const elements = this.config.changes.getCurrentState();
    let migratedCount = 0;

    elements.forEach((element) => {
      // Parse content for inline comments
      const matches = this.config.comments.parse(element.content);
      const commentMatches = matches.filter((m) => m.type === 'comment');

      if (commentMatches.length === 0) {
        return;
      }

      // Add each comment to CommentsModule storage
      commentMatches.forEach((match) => {
        const userId = this.userModule?.getCurrentUser?.()?.id ?? 'migrated';
        this.config.comments.addComment(
          element.id,
          match.content || match.comment || '',
          userId,
          'comment'
        );
        migratedCount++;
      });

      // Remove inline comments from content to avoid duplication
      // This will create an edit operation, but only once during initial migration
      let cleanedContent = element.content;
      commentMatches.forEach((match) => {
        cleanedContent = this.config.comments.accept(cleanedContent, match);
      });

      // Update element with cleaned content
      if (cleanedContent !== element.content) {
        this.config.changes.edit(element.id, cleanedContent, 'migration');
      }
    });

    if (migratedCount > 0) {
      logger.info(
        `Migrated ${migratedCount} inline comments to CommentsModule storage`
      );
      // Refresh UI to show migrated comments
      requestAnimationFrame(() => {
        this.refreshCommentUI();
      });

      // Save to localStorage with cleaned content to prevent false differences on next load
      this.persistenceManager.persistDocument('Migrated inline comments');
    }
  }

  public destroy(): void {
    this.closeEditor();

    // Clean up state store listeners
    this.stateStore.destroy();

    // Clean up translation controller
    if (this.translationController) {
      this.translationController.destroy();
      this.translationController = null;
    }
    // Remove translation mode wrapper and container
    const translationWrapper = document.querySelector(
      '#translation-mode-wrapper'
    );
    translationWrapper?.remove();
    const translationContainer = document.querySelector(
      '#translation-ui-container'
    );
    translationContainer?.remove();

    // Clean up module instances and their event listeners
    this.editorToolbarModule?.destroy();
    this.commentsSidebarModule?.destroy();
    this.commentComposerModule?.destroy();
    this.commentBadgesModule?.destroy();
    this.contextMenuCoordinator?.destroy();
    this.changeSummaryDashboard?.destroy();
    this.mainSidebarModule.destroy();

    // Clean up services
    this.notificationService.destroy();
    this.loadingService.destroy();

    // Remove DOM elements
    const toolbar = document.querySelector('.review-toolbar');
    toolbar?.remove();
    const editableElements = document.querySelectorAll('.review-editable');
    editableElements.forEach((elem) => {
      const clone = elem.cloneNode(true);
      elem.parentNode?.replaceChild(clone, elem);
    });
  }

  /**
   * Save editor history to persistent localStorage for undo/redo
   * Stores multiple snapshots of editor content per section
   */

  /**
   * Get all stored editor histories for debugging/info
   */
  public getStoredHistories(): Array<{
    elementId: string;
    stateCount: number;
    lastUpdated: string;
    size: number;
  }> {
    return this.historyStorage.list();
  }

  /**
   * Clear editor history for a specific element
   */
  public clearElementHistory(elementId: string): void {
    this.historyStorage.clear(elementId);
  }

  /**
   * Clear all editor histories
   */
  public clearAllHistories(): void {
    this.historyStorage.clearAll();
  }
}

export default UIModule;
