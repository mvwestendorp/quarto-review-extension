/**
 * EditorManager
 * Handles all editor operations and state management
 */

import { createModuleLogger } from '@utils/debug';
import type { ChangesModule } from '@modules/changes';
import type { CommentsModule } from '@modules/comments';
import type { MarkdownModule } from '@modules/markdown';
import { EditorLifecycle } from '@modules/ui/editor/EditorLifecycle';
import { EditorToolbar } from '@modules/ui/editor/EditorToolbar';
import { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';
import type { DiffHighlightRange } from '@modules/ui/editor/MilkdownEditor';
import type { ElementMetadata } from '@/types';
import { NotificationService } from './NotificationService';
import { StateStore } from './StateStore';

const logger = createModuleLogger('EditorManager');

export interface EditorManagerConfig {
  changes: ChangesModule;
  comments?: CommentsModule;
  markdown: MarkdownModule;
  historyStorage: EditorHistoryStorage;
  notificationService: NotificationService;
  editorLifecycle: EditorLifecycle;
}

export interface EditorCallbacks {
  getElementContent: (elementId: string) => string;
  getElementContentWithTrackedChanges: (elementId: string) => string;
  segmentContentIntoElements: (
    content: string,
    metadata: ElementMetadata
  ) => Array<{ content: string; metadata: ElementMetadata }>;
  replaceElementWithSegments: (
    elementId: string,
    segments: Array<{ content: string; metadata: ElementMetadata }>
  ) => { elementIds: string[] };
  ensureSegmentDom: (
    elementIds: string[],
    segments: Array<{ content: string; metadata: ElementMetadata }>,
    removedIds: string[]
  ) => void;
  resolveListEditorTarget: (element: HTMLElement) => HTMLElement | null;
  refresh: () => void;
  onEditorClosed: () => void;
  onEditorSaved: () => void;
  initializeMilkdown: (
    container: HTMLElement,
    content: string,
    diffHighlights?: DiffHighlightRange[]
  ) => void;
  createEditorSession: (
    elementId: string,
    type: string
  ) => {
    plainContent: string;
    trackedContent?: string;
    diffHighlights?: DiffHighlightRange[];
  };
  openDrawerEditor?: (
    elementId: string,
    content: string,
    diffHighlights?: DiffHighlightRange[]
  ) => void;
  closeDrawerEditor?: () => void;
}

/**
 * Manager for all editor operations
 */
export class EditorManager {
  private config: EditorManagerConfig;
  private callbacks: EditorCallbacks;
  private stateStore: StateStore;
  private editorLifecycle: EditorLifecycle;
  private editorToolbar: EditorToolbar | null = null;
  private isOperationInProgress = false;

  constructor(
    config: EditorManagerConfig,
    callbacks: EditorCallbacks,
    stateStore: StateStore
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.stateStore = stateStore;
    this.editorLifecycle = config.editorLifecycle;
    this.editorToolbar = new EditorToolbar();
  }

  /**
   * Check if editor is currently open
   */
  public isEditorOpen(): boolean {
    return !!this.stateStore.getEditorState().currentElementId;
  }

  /**
   * Get current element being edited
   */
  public getCurrentElementId(): string | null {
    return this.stateStore.getEditorState().currentElementId;
  }

  /**
   * Check if device is mobile-sized (should use drawer editor)
   */
  private isMobileScreen(): boolean {
    return window.innerWidth < 1024;
  }

  /**
   * Open editor for an element
   */
  public openEditor(elementId: string): void {
    // Prevent concurrent editor operations
    if (this.isOperationInProgress) {
      logger.warn('Editor operation already in progress, ignoring request');
      return;
    }

    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement | null;
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const targetElement =
      this.callbacks.resolveListEditorTarget(element) ?? element;
    const targetId = targetElement.getAttribute('data-review-id');
    if (!targetId) {
      throw new Error(`Target element ${elementId} has no data-review-id`);
    }

    if (targetId !== elementId) {
      logger.debug(
        `Redirecting edit to list root ${targetId} (clicked ${elementId})`
      );
    }

    // Set lock before opening editor
    this.isOperationInProgress = true;

    try {
      // Use drawer editor on mobile screens, inline editor on desktop
      if (this.isMobileScreen() && this.callbacks.openDrawerEditor) {
        this.openDrawerEditorMode(targetId);
      } else {
        this.openInlineEditor(targetId);
      }
    } catch (error) {
      logger.error('Failed to open editor:', error);
      this.isOperationInProgress = false;
      this.config.notificationService.error('Failed to open editor');
      throw error; // Re-throw to propagate the error to the caller
    }
  }

  /**
   * Open drawer editor (for mobile screens)
   */
  private openDrawerEditorMode(elementId: string): void {
    // Close any existing editor
    this.closeEditor();

    this.stateStore.setEditorState({ currentElementId: elementId });

    // Set baseline for tracked changes calculation
    const currentContent = this.config.changes.getElementContent(elementId);
    this.config.changes.setElementBaseline(elementId, currentContent);

    // Restore editor history if available
    this.restoreEditorHistory(elementId);

    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement;
    const type = element?.getAttribute('data-review-type') || 'Para';

    const { plainContent, trackedContent, diffHighlights } =
      this.callbacks.createEditorSession(elementId, type);

    // Use tracked content if tracked changes are enabled, otherwise use plain content
    const showTrackedChanges =
      this.stateStore.getEditorState().showTrackedChanges;
    const contentToDisplay = showTrackedChanges
      ? trackedContent || plainContent
      : plainContent;

    // Mark element as being edited (visual indicator in document)
    if (element) {
      element.classList.add('review-editable-editing');
    }

    // Store that we're in drawer mode
    this.stateStore.setEditorState({ activeEditor: 'drawer' as any });

    // Open drawer editor via callback
    if (this.callbacks.openDrawerEditor) {
      this.callbacks.openDrawerEditor(
        elementId,
        contentToDisplay,
        diffHighlights
      );
    }

    logger.debug(`Opened drawer editor for element ${elementId}`);
  }

  /**
   * Open inline editor
   */
  private openInlineEditor(elementId: string): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement;
    if (!element) {
      this.isOperationInProgress = false;
      return;
    }

    // Close any existing inline editor
    this.closeEditor();

    this.stateStore.setEditorState({ currentElementId: elementId });

    // Set baseline for tracked changes calculation
    const currentContent = this.config.changes.getElementContent(elementId);
    this.config.changes.setElementBaseline(elementId, currentContent);

    // Restore editor history if available
    this.restoreEditorHistory(elementId);

    const type = element.getAttribute('data-review-type') || 'Para';

    const { plainContent, trackedContent, diffHighlights } =
      this.callbacks.createEditorSession(elementId, type);

    // Use tracked content if tracked changes are enabled, otherwise use plain content
    const showTrackedChanges =
      this.stateStore.getEditorState().showTrackedChanges;
    const contentToDisplay = showTrackedChanges
      ? trackedContent || plainContent
      : plainContent;

    // Mark element as being edited
    element.classList.add('review-editable-editing');

    // Cache original HTML for restoration on cancel
    const originalContent = element.innerHTML;
    element.setAttribute('data-review-original-html', originalContent);

    // Create inline editor structure with buttons
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
    this.stateStore.setEditorState({ activeEditor: inlineEditor });

    // Add event listeners
    inlineEditor.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeEditor());
    });

    inlineEditor
      .querySelector('[data-action="save"]')
      ?.addEventListener('click', () => {
        this.saveEditor();
      });

    // Initialize Milkdown in the inline editor
    requestAnimationFrame(() => {
      this.callbacks.initializeMilkdown(
        inlineEditor,
        contentToDisplay,
        diffHighlights
      );
    });
  }

  /**
   * Close the current editor
   */
  public closeEditor(): void {
    const editorState = this.stateStore.getEditorState();

    // Save editor history before destroying the editor
    if (editorState.currentElementId) {
      this.saveEditorHistory(editorState.currentElementId);
      // Clear the baseline for this element when closing the editor
      this.config.changes.clearElementBaseline(editorState.currentElementId);
    }

    this.editorLifecycle.destroy();

    // Check if we're in drawer mode or inline mode
    const isDrawerMode = editorState.activeEditor === ('drawer' as any);

    if (isDrawerMode) {
      // Close drawer editor
      if (this.callbacks.closeDrawerEditor) {
        this.callbacks.closeDrawerEditor();
      }

      // Remove editing class from element
      if (editorState.currentElementId) {
        const element = document.querySelector(
          `[data-review-id="${editorState.currentElementId}"]`
        ) as HTMLElement;
        if (element) {
          element.classList.remove('review-editable-editing');
        }
      }
    } else {
      // Restore the element from inline editing
      if (editorState.activeEditor && editorState.currentElementId) {
        const element = document.querySelector(
          `[data-review-id="${editorState.currentElementId}"]`
        ) as HTMLElement;
        if (element) {
          element.classList.remove('review-editable-editing');
          const cachedHtml = element.getAttribute('data-review-original-html');
          if (cachedHtml !== null) {
            element.innerHTML = cachedHtml;
            element.removeAttribute('data-review-original-html');
          }
        }
      }
    }

    // Clear all editor state
    this.stateStore.setEditorState({
      activeEditor: null,
      currentElementId: null,
      currentEditorContent: '',
      milkdownEditor: null,
      activeEditorToolbar: null,
    });

    // Release editor operation lock
    this.isOperationInProgress = false;

    // Notify callback
    this.callbacks.onEditorClosed();
  }

  /**
   * Save the current editor content
   */
  public async saveEditor(): Promise<void> {
    const editorState = this.stateStore.getEditorState();

    if (!editorState.milkdownEditor || !editorState.currentElementId) {
      return;
    }

    const elementId = editorState.currentElementId;
    const element = this.config.changes.getElementById(elementId);
    if (!element) {
      logger.error('Element not found for saving:', elementId);
      return;
    }

    try {
      // Get formatted content from Milkdown editor
      let newContent = editorState.currentEditorContent;

      // Apply Prettier formatting to fix Milkdown serialization issues
      const milkdownEditorInstance = this.editorLifecycle.getModule();
      if (milkdownEditorInstance) {
        try {
          newContent = await milkdownEditorInstance.getFormattedContent();
          logger.debug('Applied Prettier formatting to editor content');
        } catch (error) {
          logger.warn(
            'Prettier formatting failed, using unformatted content:',
            error
          );
        }
      }

      // Segment the content and replace element
      const segments = this.callbacks.segmentContentIntoElements(
        newContent,
        element.metadata
      );
      const { elementIds } = this.callbacks.replaceElementWithSegments(
        elementId,
        segments
      );
      this.callbacks.ensureSegmentDom(elementIds, segments, []);

      this.callbacks.onEditorSaved();
      this.closeEditor();
      this.callbacks.refresh();
    } catch (error) {
      logger.error('Failed to save editor content:', error);
      this.config.notificationService.error('Failed to save changes');
    }
  }

  /**
   * Cancel editor without saving
   */
  public cancelEditor(): void {
    this.closeEditor();
  }

  /**
   * Save editor history to persistent storage
   */
  private saveEditorHistory(elementId: string): void {
    const editorState = this.stateStore.getEditorState();
    if (!editorState.currentEditorContent) {
      return;
    }
    this.config.historyStorage.save(
      elementId,
      editorState.currentEditorContent
    );
  }

  /**
   * Restore editor history from persistent storage
   */
  private restoreEditorHistory(elementId: string): void {
    const history = this.config.historyStorage.get(elementId);
    if (!history || history.states.length === 0) {
      return;
    }
    const lastState = history.states[history.states.length - 1];
    if (lastState && lastState.content) {
      this.stateStore.setEditorState({
        currentEditorContent: lastState.content,
      });
      logger.debug('Restored editor history for', elementId);
    }
  }

  /**
   * Get editor lifecycle instance
   */
  public getLifecycle(): EditorLifecycle {
    return this.editorLifecycle;
  }

  /**
   * Get editor toolbar instance
   */
  public getToolbar(): EditorToolbar | null {
    return this.editorToolbar;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.closeEditor();
    this.editorLifecycle.destroy();
    this.editorToolbar?.destroy();
  }
}
