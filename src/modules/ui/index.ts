// UIModule.ts

// import { utils } from '@milkdown/kit';
import type { Root, Content, Heading as MdHeading, List as MdList } from 'mdast';
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
  createInitialEditorState,
  createInitialUIState,
  createInitialCommentState,
  type EditorState,
  type UIState,
  type CommentState,
} from './shared';
import {
  mergeSectionCommentIntoSegments,
  normalizeContentForComparison,
} from './shared/editor-content';
import { EditorHistoryStorage } from './editor/EditorHistoryStorage';

// CriticMarkup components are now handled by MilkdownEditor module
import { ChangeSummaryDashboard } from './change-summary';
import { createModuleLogger } from '@utils/debug';
import type { ChangesModule } from '@modules/changes';
import type { MarkdownModule } from '@modules/markdown';
import type { CommentsModule } from '@modules/comments';
import type { Element as ReviewElement, ElementMetadata } from '@/types';
import { UI_CONSTANTS, getAnimationDuration } from './constants';

const logger = createModuleLogger('UIModule');

export interface UIConfig {
  changes: ChangesModule;
  markdown: MarkdownModule;
  comments: CommentsModule;
  inlineEditing?: boolean; // Use inline editing instead of modal
}

interface HeadingReferenceInfo {
  reference: string;
  prefix: string;
  style: 'atx' | 'setext';
}


export class UIModule {
  private config: UIConfig;

  // Consolidated state objects (Phase 5)
  private editorState: EditorState = createInitialEditorState();
  private uiState: UIState = createInitialUIState();
  private commentState: CommentState = createInitialCommentState();

  // Cache and utility maps
  private headingReferenceLookup = new Map<string, HeadingReferenceInfo>();
  private activeHeadingReferenceCache = new Map<
    string,
    HeadingReferenceInfo
  >();

  // Configuration
  private changeSummaryDashboard: ChangeSummaryDashboard | null = null;

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

  constructor(config: UIConfig) {
    this.config = config;
    logger.debug('Initialized with tracked changes:', this.editorState.showTrackedChanges);

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
      commentState: this.commentState,
      sidebar: this.commentsSidebarModule,
      composer: this.commentComposerModule,
      badges: this.commentBadgesModule,
      callbacks: {
        requestRefresh: () => this.refresh(),
        ensureSidebarVisible: () => this.refreshCommentUI({ showSidebar: true }),
        showNotification: (message, type) => this.showNotification(message, type),
        onComposerClosed: () => this.commentController.clearHighlight('composer'),
      },
    });
    this.contextMenuCoordinator = new ContextMenuCoordinator({
      onEdit: (sectionId) => {
        this.openEditor(sectionId);
      },
      onComment: (sectionId) => {
        const element = this.config.changes.getElementById(sectionId);
        if (element) {
          this.openCommentComposer({ elementId: sectionId });
        }
      },
    });
    this.historyStorage = new EditorHistoryStorage({
      prefix: UI_CONSTANTS.EDITOR_HISTORY_STORAGE_PREFIX,
      maxSize: UI_CONSTANTS.MAX_HISTORY_SIZE_BYTES,
      maxStates: UI_CONSTANTS.MAX_HISTORY_STATES,
    });

    this.mainSidebarModule.onUndo(() => {
      if (this.config.changes.undo()) {
        this.refresh();
      }
    });
    this.mainSidebarModule.onRedo(() => {
      if (this.config.changes.redo()) {
        this.refresh();
      }
    });
    this.mainSidebarModule.onTrackedChangesToggle((enabled) => {
      this.toggleTrackedChanges(enabled);
    });
    this.mainSidebarModule.onShowComments(() => {
      const isVisible = this.commentsSidebarModule?.getIsVisible();
      if (!isVisible) {
        this.refreshCommentUI({ showSidebar: true });
      } else {
        this.commentsSidebarModule?.toggle();
      }
    });
    this.mainSidebarModule.onToggleSidebar(() => {
      this.toggleSidebarCollapsed();
    });

    this.cacheInitialHeadingReferences();
    // Initialize sidebar immediately so it's always visible
    this.initializeSidebar();
    requestAnimationFrame(() => {
      this.refreshCommentUI();
    });
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
    this.uiState.isSidebarCollapsed = collapsed;

    toolbar.classList.toggle('review-sidebar-collapsed', collapsed);
    if (document.body) {
      document.body.classList.toggle('review-sidebar-collapsed-mode', collapsed);
    }

    this.mainSidebarModule.setCollapsed(collapsed);
  }

  /**
   * Toggle visibility of tracked changes
   */
  public toggleTrackedChanges(force?: boolean): void {
    const nextState =
      typeof force === 'boolean'
        ? force
        : !this.editorState.showTrackedChanges;

    if (this.editorState.showTrackedChanges === nextState) {
      this.mainSidebarModule.setTrackedChangesVisible(nextState);
      return;
    }

    this.editorState.showTrackedChanges = nextState;
    this.mainSidebarModule.setTrackedChangesVisible(nextState);
    this.refresh();
  }

  /**
   * Get current tracked changes mode
   */
  public isShowingTrackedChanges(): boolean {
    return this.editorState.showTrackedChanges;
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
      if (e.key === 'Escape' && this.editorState.activeEditor) {
        this.closeEditor();
      }
    });
  }

  public openEditor(elementId: string): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement | null;
    if (!element) return;

    const targetElement = this.resolveListEditorTarget(element) ?? element;
    const targetId = targetElement.getAttribute('data-review-id');
    if (!targetId) return;

    if (targetId !== elementId) {
      logger.debug(
        `Redirecting edit to list root ${targetId} (clicked ${elementId})`
      );
    }

    // Check if inline editing is enabled
    if (this.config.inlineEditing) {
      this.openInlineEditor(targetId);
    } else {
      this.openModalEditor(targetId);
    }
  }

  private openModalEditor(elementId: string): void {
    const element = document.querySelector(`[data-review-id="${elementId}"]`);
    if (!element) return;

    this.editorState.currentElementId = elementId;
    logger.debug('Opening editor for', { elementId });
    logger.trace('Tracked changes enabled:', this.editorState.showTrackedChanges);

    // Restore editor history if available
    this.restoreEditorHistory(elementId);

    const type = element.getAttribute('data-review-type') || 'Para';

    const { plainContent, trackedContent, diffHighlights } =
      this.createEditorSession(elementId, type);

    logger.trace('Editor content (plain):', plainContent);
    if (this.editorState.showTrackedChanges) {
      logger.trace('Editor content (tracked):', trackedContent);
    }

    const modal = this.createEditorModal(plainContent, type);
    document.body.appendChild(modal);
    this.editorState.activeEditor = modal;

    // Delay so DOM renders
    requestAnimationFrame(() => {
      this.initializeMilkdown(modal, plainContent, diffHighlights);
    });
  }

  private openInlineEditor(elementId: string): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement;
    if (!element) return;

    // Close any existing inline editor
    this.closeEditor();

    this.editorState.currentElementId = elementId;

    // Restore editor history if available
    this.restoreEditorHistory(elementId);

    const type = element.getAttribute('data-review-type') || 'Para';

    const { plainContent, diffHighlights } =
      this.createEditorSession(elementId, type);

    // Mark element as being edited
    element.classList.add('review-editable-editing');

    // Wrap original content
    const originalContent = element.innerHTML;
    element.setAttribute('data-review-original-html', originalContent);
    element.innerHTML = `
      <div class="review-inline-editor-container">
        <div class="review-inline-editor-body"></div>
        <div class="review-inline-editor-actions">
          <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
          <button class="review-btn review-btn-primary review-btn-sm" data-action="save">Save</button>
        </div>
      </div>
    `;

    const inlineEditor = element.querySelector(
      '.review-inline-editor-container'
    ) as HTMLElement;
    this.editorState.activeEditor = inlineEditor;

    // Add event listeners
    inlineEditor.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeEditor());
    });

    inlineEditor
      .querySelector('[data-action="save"]')
      ?.addEventListener('click', () => {
        this.saveEditor();
      });

    // Initialize Milkdown
    requestAnimationFrame(() => {
      this.initializeMilkdown(inlineEditor, plainContent, diffHighlights);
    });
  }

  private async initializeMilkdown(
    container: HTMLElement,
    content: string,
    diffHighlights: DiffHighlightRange[] = []
  ): Promise<void> {
    try {
      // Determine the element type to configure toolbar/context behaviour.
      const elementId = this.editorState.currentElementId;
      let elementType = 'default';
      if (elementId) {
        const element = document.querySelector(`[data-review-id="${elementId}"]`) as HTMLElement | null;
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
          this.editorState.currentEditorContent = markdown;
        },
      });

      this.editorState.milkdownEditor = editor;

      logger.debug('Milkdown editor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Milkdown:', error);
      const editorContainer =
        (container.querySelector('.review-editor-body') as HTMLElement | null) ||
        (container.querySelector('.review-inline-editor-body') as HTMLElement | null);
      if (editorContainer) {
        editorContainer.innerHTML = `
          <div style="padding:20px; color:red;">
            Failed to initialize editor. Please try again.
            <pre>${error instanceof Error ? error.message : String(error)}</pre>
          </div>
        `;
      }
      this.editorState.activeEditorToolbar = null;
      this.editorLifecycle.destroy();
      this.editorState.milkdownEditor = null;
    }
  }

  public closeEditor(): void {
    // Save editor history before destroying the editor
    if (this.editorState.currentElementId) {
      this.saveEditorHistory(this.editorState.currentElementId);
    }

    this.editorLifecycle.destroy();
    this.editorState.milkdownEditor = null;
    this.editorState.activeEditorToolbar = null;
    if (this.editorState.activeEditor) {
      // For inline editing, restore the element
      if (this.config.inlineEditing && this.editorState.currentElementId) {
        const element = document.querySelector(
          `[data-review-id="${this.editorState.currentElementId}"]`
        ) as HTMLElement;
        if (element) {
      element.classList.remove('review-editable-editing');
      const cachedHtml = element.getAttribute('data-review-original-html');
      if (cachedHtml !== null) {
        element.innerHTML = cachedHtml;
        element.removeAttribute('data-review-original-html');
      }
      if (this.editorState.currentElementId) {
        this.commentController.clearSectionCommentMarkup(this.editorState.currentElementId);
      }
        }
      } else {
        // For modal editing, just remove the modal
        this.editorState.activeEditor.remove();
      }
      this.editorState.activeEditor = null;
      if (this.editorState.currentElementId) {
        this.activeHeadingReferenceCache.delete(this.editorState.currentElementId);
      }
      this.editorState.currentElementId = null;
      this.editorState.currentEditorContent = '';
    }
  }

  private saveEditor(): void {
    if (!this.editorState.milkdownEditor || !this.editorState.currentElementId) return;
    const elementId = this.editorState.currentElementId;

    // Get markdown content from tracked state
    let newContent = normalizeListMarkers(this.editorState.currentEditorContent);
    const cachedHeadingReference =
      this.activeHeadingReferenceCache.get(elementId);
    if (cachedHeadingReference) {
      newContent = this.applyHeadingReference(
        newContent,
        cachedHeadingReference
      );
    }
    this.editorState.currentEditorContent = newContent;

    const elementData = this.config.changes.getElementById(elementId);
    if (!elementData) {
      logger.error('Element not found for save:', { elementId });
      this.closeEditor();
      return;
    }

    const cachedSectionComment = this.commentController.consumeSectionCommentMarkup(elementId);

    const segments = this.segmentContentIntoElements(
      newContent,
      elementData.metadata
    );

    if (cachedSectionComment) {
      mergeSectionCommentIntoSegments(
        segments,
        cachedSectionComment,
        elementData.metadata,
        (content, markup) =>
          this.commentController.appendSectionComments(content, markup)
      );
    }

    const originalContent = normalizeListMarkers(
      this.config.changes.getElementContent(elementId)
    );
    const originalPrimary = this.commentController.extractSectionComments(originalContent).content;
    const newPrimaryContent = segments[0]?.content ?? '';

    const originalNormalized =
      normalizeContentForComparison(originalPrimary);
    const newNormalized =
      normalizeContentForComparison(newPrimaryContent);

    logger.debug('Saving editor');
    logger.trace('Original primary:', originalPrimary);
    logger.trace('New primary:', newPrimaryContent);

    const { elementIds, removedIds } =
      this.config.changes.replaceElementWithSegments(elementId, segments);

    this.ensureSegmentDom(elementIds, segments, removedIds);

    this.commentController.clearSectionCommentMarkup(elementId);
    this.commentController.clearSectionCommentMarkupFor(removedIds);
    if (cachedSectionComment && elementIds.length > 0) {
      const commentTargetId =
        elementIds[elementIds.length - 1];
      if (typeof commentTargetId === 'string') {
        this.commentController.cacheSectionCommentMarkup(
          commentTargetId,
          cachedSectionComment
        );
      }
    }

    this.updateHeadingReferencesAfterSave(
      elementId,
      segments,
      elementIds,
      removedIds
    );

    if (originalNormalized === newNormalized && segments.length === 1) {
      logger.debug('No meaningful content change detected for primary segment');
    }

    this.closeEditor();
    this.refresh();
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

    currentState.forEach((elem) => {
      const relevantOperations = operations.filter(
        (op) => op.elementId === elem.id
      );
      const isModified = relevantOperations.length > 0;

      // IMPORTANT: Always check if element was previously modified (shown in DOM)
      // This ensures undo/redo properly updates display even when removing operations
      const wasPreviouslyModified = elem.id === this.editorState.currentElementId ||
        document.querySelector(`[data-review-id="${elem.id}"][data-review-modified="true"]`);

      if (!isModified && !wasPreviouslyModified) {
        return;
      }

      // If showing tracked changes, get content with CriticMarkup visualization
      if (this.editorState.showTrackedChanges) {
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
      const domElement = document.querySelector(`[data-review-id="${elem.id}"]`);
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
    commentMarkup: string | null;
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

    const plainResult = this.commentController.extractSectionComments(preparedPlain);
    const trackedResult = this.commentController.extractSectionComments(preparedTracked);

    return {
      plainContent: plainResult.content,
      trackedContent: trackedResult.content,
      commentMarkup: plainResult.commentMarkup,
    };
  }

  private createEditorSession(elementId: string, type: string): {
    plainContent: string;
    trackedContent: string;
    diffHighlights: DiffHighlightRange[];
  } {
    const { plainContent, trackedContent, commentMarkup } =
      this.prepareEditorContentVariants(
        elementId,
        type,
        this.editorState.showTrackedChanges
      );

    this.commentController.cacheSectionCommentMarkup(elementId, commentMarkup);

    const diffHighlights = this.editorState.showTrackedChanges
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
    if (node.parentNode !== desiredParent || node.previousSibling !== previousNode) {
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
    this.mainSidebarModule.setTrackedChangesVisible(this.editorState.showTrackedChanges);
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
      logger.debug(
        'Skipped initial heading reference cache:',
        error
      );
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
    const style: 'atx' | 'setext' =
      trimmedLeading.startsWith('#') ? 'atx' : 'setext';

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
    const after = firstLineValue.slice(referencePosition + info.reference.length);
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
    lines[0] = trimLineEnd(
      `${withoutTrailing}${safePrefix}${info.reference}`
    );

    return lines.join(newline);
  }

  private syncHeadingReference(
    elementId: string,
    content: string
  ): void {
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
    let toolbar = document.querySelector('.review-toolbar') as HTMLElement | null;
    if (!toolbar) {
      toolbar = this.createPersistentSidebar();
      document.body.appendChild(toolbar);
      this.mainSidebarModule.setTrackedChangesVisible(this.editorState.showTrackedChanges);
      this.syncToolbarState();
      this.applySidebarCollapsedState(this.uiState.isSidebarCollapsed, toolbar);
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

  private openCommentComposer(context: {
    elementId: string;
    existingComment?: ReturnType<CommentsModule['parse']>[0];
  }): void {
    this.contextMenuCoordinator?.close();
    this.commentsSidebarModule?.show();

    const commentKey = context.existingComment
      ? `${context.elementId}:${context.existingComment.start}`
      : undefined;

    this.commentController.openComposer({
      elementId: context.elementId,
      existingComment: context.existingComment,
      commentKey,
    });

    this.commentController.highlightSection(context.elementId, 'composer', commentKey);
  }

  private refreshCommentUI(options: { showSidebar?: boolean } = {}): void {
    this.commentController.refreshUI({
      showSidebar: options.showSidebar,
    });
  }

  private wrapSectionContent(alreadyWrapped: boolean, nodes: ChildNode[]): HTMLElement {
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
    const notification = document.createElement('div');
    notification.className = `review-notification review-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('review-notification-show');
    }, 10);
    setTimeout(() => {
      notification.classList.remove('review-notification-show');
      setTimeout(() => notification.remove(), getAnimationDuration('SLOW'));
    }, UI_CONSTANTS.NOTIFICATION_DISPLAY_DURATION_MS);
  }

  public showLoading(message = 'Loading...'): HTMLElement {
    const loading = document.createElement('div');
    loading.className = 'review-loading';
    loading.innerHTML = `
      <div class="review-loading-content">
        <div class="review-loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loading);
    return loading;
  }

  public hideLoading(loading: HTMLElement): void {
    loading.remove();
  }

  public destroy(): void {
    this.closeEditor();

    // Clean up module instances and their event listeners
    this.editorToolbarModule?.destroy();
    this.commentsSidebarModule?.destroy();
    this.commentComposerModule?.destroy();
    this.commentBadgesModule?.destroy();
    this.contextMenuCoordinator?.destroy();
    this.changeSummaryDashboard?.destroy();
    this.mainSidebarModule.destroy();

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
  private saveEditorHistory(elementId: string): void {
    if (!elementId) {
      return;
    }

    this.historyStorage.save(elementId, this.editorState.currentEditorContent);
  }

  /**
   * Restore editor history from persistent storage
   */
  private restoreEditorHistory(elementId: string): void {
    const historyData = this.historyStorage.get(elementId);
    if (historyData.states.length === 0) {
      return;
    }

    logger.debug('Editor history restored for element', {
      elementId,
      stateCount: historyData.states.length,
      lastUpdated: new Date(historyData.lastUpdated).toLocaleString(),
    });
  }

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
