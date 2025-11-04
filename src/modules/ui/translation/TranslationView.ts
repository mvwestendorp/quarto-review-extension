/**
 * TranslationView Component
 * Side-by-side view for source and target language editing with correspondence visualization
 */

import { createModuleLogger } from '@utils/debug';
import type { MarkdownModule } from '@modules/markdown';
import type { TranslationDocument, Sentence } from '@modules/translation/types';
import type { TranslationEditorBridge } from './TranslationEditorBridge';
import type { TranslationProgressStatus } from './TranslationController';

const logger = createModuleLogger('TranslationView');

export interface TranslationViewConfig {
  showCorrespondenceLines: boolean;
  highlightOnHover: boolean;
}

export interface TranslationViewCallbacks {
  onSourceSegmentEdit?: (elementId: string, newContent: string) => void;
  onTargetSegmentEdit?: (elementId: string, newContent: string) => void;
}

type ActiveEditorContext = {
  sentence: Sentence;
  side: 'source' | 'target';
  sentenceElement: HTMLElement;
  contentEl: HTMLElement;
  save: () => boolean;
  cancel: () => void;
};

export class TranslationView {
  private element: HTMLElement | null = null;
  private callbacks: TranslationViewCallbacks;
  private document: TranslationDocument | null = null;
  private markdown: MarkdownModule | null = null;
  private editorBridge: TranslationEditorBridge | null = null;

  // UI elements
  private sourcePane: HTMLElement | null = null;
  private targetPane: HTMLElement | null = null;
  private syncScrollLock = false;
  private sourceScrollHandler: ((event: Event) => void) | null = null;
  private targetScrollHandler: ((event: Event) => void) | null = null;
  private alignFrameId: number | null = null;
  private readonly handleResize: () => void;
  private selectedSentence: { id: string; side: 'source' | 'target' } | null =
    null;
  private pendingFocus: {
    id: string;
    side: 'source' | 'target';
    scrollIntoView: boolean;
  } | null = null;
  private loadingSentences = new Set<string>();
  private sentenceErrors = new Map<string, string | null>();
  private progressStatus: TranslationProgressStatus | null = null;
  private progressElements: {
    container: HTMLElement | null;
    bar: HTMLElement | null;
    fill: HTMLElement | null;
    message: HTMLElement | null;
  } = {
    container: null,
    bar: null,
    fill: null,
    message: null,
  };
  private errorBannerElements: {
    container: HTMLElement | null;
    message: HTMLElement | null;
    retryButton: HTMLButtonElement | null;
  } = {
    container: null,
    message: null,
    retryButton: null,
  };
  private activeEditorContext: ActiveEditorContext | null = null;

  constructor(
    _config: TranslationViewConfig,
    callbacks: TranslationViewCallbacks,
    markdown?: MarkdownModule,
    editorBridge?: TranslationEditorBridge
  ) {
    this.callbacks = callbacks;
    this.markdown = markdown || null;
    this.editorBridge = editorBridge || null;
    this.handleResize = () => {
      this.scheduleSentenceAlignment();
    };
  }

  /**
   * Create and initialize the translation view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'review-translation-view';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Translation workspace');
    container.tabIndex = -1;

    // Create header with language labels
    const header = this.createHeader();
    container.appendChild(header);

    // Create main content area with two panes
    const content = document.createElement('div');
    content.className = 'review-translation-content';

    // Source pane
    const sourceContainer = document.createElement('div');
    sourceContainer.className =
      'review-translation-pane review-translation-source';

    const sourceHeader = document.createElement('div');
    sourceHeader.className = 'review-translation-pane-header';
    sourceHeader.innerHTML = `
      <h3>Source <span class="review-translation-lang-label" data-lang="source"></span></h3>
    `;
    sourceContainer.appendChild(sourceHeader);

    this.sourcePane = document.createElement('div');
    this.sourcePane.className = 'review-translation-pane-body';
    sourceContainer.appendChild(this.sourcePane);

    // Target pane
    const targetContainer = document.createElement('div');
    targetContainer.className =
      'review-translation-pane review-translation-target';

    const targetHeader = document.createElement('div');
    targetHeader.className = 'review-translation-pane-header';
    targetHeader.innerHTML = `
      <h3>Target <span class="review-translation-lang-label" data-lang="target"></span></h3>
    `;
    targetContainer.appendChild(targetHeader);

    this.targetPane = document.createElement('div');
    this.targetPane.className = 'review-translation-pane-body';
    targetContainer.appendChild(this.targetPane);

    // Add panes to content
    content.appendChild(sourceContainer);
    content.appendChild(targetContainer);

    container.appendChild(content);

    this.bindPaneScrollSync();
    window.addEventListener('resize', this.handleResize);

    this.element = container;
    return container;
  }

  /**
   * Create header with statistics and controls
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'review-translation-view-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'review-translation-header-left';

    const heading = document.createElement('h2');
    heading.className = 'review-translation-heading';
    heading.textContent = 'Translation workspace';
    headerLeft.appendChild(heading);

    const stats = document.createElement('div');
    stats.className = 'review-translation-stats';
    stats.innerHTML = `
      <span class="review-translation-stat">
        <span class="review-translation-stat-label">Total:</span>
        <span class="review-translation-stat-value" data-stat="total">0</span>
      </span>
      <span class="review-translation-stat">
        <span class="review-translation-stat-label">Translated:</span>
        <span class="review-translation-stat-value" data-stat="translated">0</span>
      </span>
      <span class="review-translation-stat">
        <span class="review-translation-stat-label">Progress:</span>
        <span class="review-translation-stat-value" data-stat="progress">0%</span>
      </span>
    `;
    headerLeft.appendChild(stats);
    header.appendChild(headerLeft);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'review-translation-progress-inline';
    progressContainer.hidden = true;

    const progressBar = document.createElement('div');
    progressBar.className = 'review-translation-progress-bar';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.dataset.indeterminate = 'false';

    const progressFill = document.createElement('div');
    progressFill.className = 'review-translation-progress-bar-fill';
    progressBar.appendChild(progressFill);

    const progressMessage = document.createElement('div');
    progressMessage.className = 'review-translation-progress-message';
    progressMessage.setAttribute('aria-live', 'polite');

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressMessage);
    header.appendChild(progressContainer);

    this.progressElements = {
      container: progressContainer,
      bar: progressBar,
      fill: progressFill,
      message: progressMessage,
    };

    const errorBanner = document.createElement('div');
    errorBanner.className = 'review-translation-error-banner';
    errorBanner.hidden = true;
    errorBanner.setAttribute('role', 'alert');

    const errorMessage = document.createElement('span');
    errorMessage.className = 'review-translation-error-text';
    errorBanner.appendChild(errorMessage);

    const retryButton = document.createElement('button');
    retryButton.className = 'review-translation-error-retry';
    retryButton.type = 'button';
    retryButton.hidden = true;
    retryButton.textContent = 'Retry';
    errorBanner.appendChild(retryButton);

    header.appendChild(errorBanner);

    this.errorBannerElements = {
      container: errorBanner,
      message: errorMessage,
      retryButton,
    };
    return header;
  }

  /**
   * Load translation document into the view
   */
  loadDocument(document: TranslationDocument): void {
    logger.info('Loading translation document', {
      sourceSentences: document.sourceSentences.length,
      targetSentences: document.targetSentences.length,
      pairs: document.correspondenceMap.pairs.length,
    });

    this.document = document;
    this.render();
  }

  /**
   * Render the entire view
   */
  private render(): void {
    if (!this.document || !this.sourcePane || !this.targetPane) {
      return;
    }

    // Update language labels
    this.updateLanguageLabels();

    // Render source segments (not sentences)
    this.renderSegments(
      this.sourcePane,
      this.document.sourceSentences,
      'source'
    );

    // Render target segments (not sentences)
    this.renderSegments(
      this.targetPane,
      this.document.targetSentences,
      'target'
    );

    // Update statistics
    this.updateStatistics();
    this.scheduleSentenceAlignment();
    this.restoreSelection();
    this.applyPendingFocus();
    this.applyLoadingStates();
    this.applyErrorStates();
    this.updateSentenceTabIndices();
    this.updateProgressUI();
  }

  /**
   * Update language labels in the UI
   */
  private updateLanguageLabels(): void {
    if (!this.element || !this.document) return;

    const sourceLabel = this.element.querySelector(
      '[data-lang="source"]'
    ) as HTMLElement;
    if (sourceLabel) {
      sourceLabel.textContent = `(${this.document.metadata.sourceLanguage.toUpperCase()})`;
    }

    const targetLabel = this.element.querySelector(
      '[data-lang="target"]'
    ) as HTMLElement;
    if (targetLabel) {
      targetLabel.textContent = `(${this.document.metadata.targetLanguage.toUpperCase()})`;
    }
  }

  /**
   * Render segments in a pane (segment-based, not sentence-based)
   * Groups sentences by elementId and merges them into segment content
   */
  private renderSegments(
    pane: HTMLElement,
    sentences: Sentence[],
    side: 'source' | 'target'
  ): void {
    pane.innerHTML = '';

    // Group sentences by elementId (document section)
    const segmentMap = new Map<string, Sentence[]>();
    sentences.forEach((sentence) => {
      const elementId = sentence.elementId;
      if (!segmentMap.has(elementId)) {
        segmentMap.set(elementId, []);
      }
      segmentMap.get(elementId)!.push(sentence);
    });

    // Render each segment (element) with merged sentence content
    Array.from(segmentMap.entries()).forEach(
      ([elementId, segmentSentences]) => {
        // Sort sentences by order and offset
        const orderedSentences = [...segmentSentences].sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return (a.startOffset ?? 0) - (b.startOffset ?? 0);
        });

        // Merge sentence content into segment content
        const mergedContent = orderedSentences
          .map((s) => s.content)
          .join('\n\n');

        // Create segment element (similar to review mode)
        const segmentElement = this.createSegmentElement(
          elementId,
          mergedContent,
          side
        );
        pane.appendChild(segmentElement);
      }
    );
  }

  /**
   * Create a segment element (element-level rendering, similar to review mode)
   */
  private createSegmentElement(
    elementId: string,
    content: string,
    side: 'source' | 'target'
  ): HTMLElement {
    const segmentElement = document.createElement('div');
    segmentElement.className = 'review-translation-segment';
    segmentElement.dataset.elementId = elementId;
    segmentElement.dataset.side = side;
    segmentElement.tabIndex = -1;

    // Create segment content container
    const contentEl = document.createElement('div');
    contentEl.className = 'review-translation-segment-content';

    // Render markdown content
    const hasContent = content.trim().length > 0;
    const isTarget = side === 'target';

    if (!hasContent && isTarget) {
      contentEl.innerHTML =
        '<span class="review-translation-placeholder">Add translation…</span>';
    } else if (this.markdown) {
      try {
        // Render as paragraph by default - we could enhance this to use actual element type
        const html = this.markdown.renderElement(content, 'Para');
        contentEl.innerHTML = html;
      } catch (error) {
        logger.warn('Failed to render markdown, falling back to plain text', {
          elementId,
          error,
        });
        contentEl.textContent = content;
      }
    } else {
      contentEl.textContent = content;
    }

    segmentElement.appendChild(contentEl);

    // Bind segment-level events (double-click to edit entire segment)
    this.bindSegmentEvents(segmentElement, elementId, side);

    return segmentElement;
  }

  private makeLoadingKey(
    sentenceId: string,
    side: 'source' | 'target'
  ): string {
    return `${side}:${sentenceId}`;
  }

  private isSentenceLoading(
    sentenceId: string,
    side: 'source' | 'target'
  ): boolean {
    return this.loadingSentences.has(this.makeLoadingKey(sentenceId, side));
  }

  public setSentenceLoading(
    sentenceId: string,
    side: 'source' | 'target',
    loading: boolean
  ): void {
    const key = this.makeLoadingKey(sentenceId, side);
    if (loading) {
      this.loadingSentences.add(key);
    } else {
      this.loadingSentences.delete(key);
    }

    const element = this.findSentenceElement(sentenceId, side);
    this.applyLoadingStateToElement(element, loading);
  }

  private applyLoadingStates(): void {
    if (!this.element) {
      return;
    }

    this.element
      .querySelectorAll('.review-translation-sentence[data-sentence-id]')
      .forEach((el) => {
        const element = el as HTMLElement;
        const sentenceId = element.dataset.sentenceId;
        const side = (element.dataset.side as 'source' | 'target') ?? 'source';
        if (!sentenceId) {
          return;
        }
        const shouldBeLoading = this.isSentenceLoading(sentenceId, side);
        this.applyLoadingStateToElement(element, shouldBeLoading);
      });
  }

  private applyLoadingStateToElement(
    element: HTMLElement | null,
    loading: boolean
  ): void {
    if (!element) {
      return;
    }

    element.classList.toggle('review-translation-sentence-loading', loading);
    if (loading) {
      element.setAttribute('aria-busy', 'true');
    } else {
      element.removeAttribute('aria-busy');
    }

    const spinner = element.querySelector(
      '[data-role="sentence-spinner"]'
    ) as HTMLElement | null;
    if (spinner) {
      spinner.hidden = !loading;
    }
  }

  public setDocumentProgress(status: TranslationProgressStatus): void {
    this.progressStatus = status;
    this.updateProgressUI();
  }

  private updateProgressUI(): void {
    const { container, bar, fill, message } = this.progressElements;
    if (!container || !bar || !fill || !message) {
      return;
    }

    const status = this.progressStatus;
    if (!status || status.phase === 'idle') {
      container.hidden = true;
      bar.dataset.indeterminate = 'false';
      bar.setAttribute('aria-valuenow', '0');
      fill.style.width = '0%';
      message.textContent = '';
      container.classList.remove('review-translation-progress-inline-error');
      return;
    }

    container.hidden = false;
    message.textContent = status.message || '';

    if (status.phase === 'error') {
      container.classList.add('review-translation-progress-inline-error');
    } else {
      container.classList.remove('review-translation-progress-inline-error');
    }

    if (typeof status.percent === 'number') {
      const percent = Math.max(0, Math.min(100, status.percent));
      bar.dataset.indeterminate = 'false';
      bar.setAttribute('aria-valuenow', percent.toString());
      fill.style.width = `${percent}%`;
    } else {
      bar.dataset.indeterminate = 'true';
      bar.removeAttribute('aria-valuenow');
      fill.style.width = '40%';
    }
  }

  /**
   * Bind events to a segment element (segment-based editing)
   */
  private bindSegmentEvents(
    element: HTMLElement,
    elementId: string,
    side: 'source' | 'target'
  ): void {
    // Click to select
    element.addEventListener('click', () => {
      this.selectSegment(elementId, side);
      // TODO: Add callback for segment click if needed
    });

    // Double-click to edit entire segment (like review mode)
    element.addEventListener('dblclick', async () => {
      await this.enableSegmentEdit(element, elementId, side);
    });

    // Keyboard activation
    element.addEventListener('keydown', async (event) => {
      if (event.defaultPrevented) {
        return;
      }

      const isActivationKey = event.key === 'Enter' || event.key === ' ';
      const isSegmentTarget =
        event.target === element && document.activeElement === element;

      if (!isActivationKey || !isSegmentTarget) {
        return;
      }

      if (this.isEditorActive()) {
        return;
      }

      event.preventDefault();
      await this.enableSegmentEdit(element, elementId, side);
    });
  }

  /**
   * Select a segment and highlight correspondences
   */
  private selectSegment(elementId: string, side: 'source' | 'target'): void {
    // Clear previous selection
    this.clearSelection();
    // TODO: Update selected state to track elementId instead of sentenceId
    // For now, keep selectedSentence for compatibility but it's semantically a segment
    this.selectedSentence = { id: elementId, side };

    // Add selected class
    const element = this.findSegmentElement(elementId, side);
    if (element) {
      element.classList.add('review-translation-segment-selected');
      element.tabIndex = 0;
    }

    // TODO: Highlight corresponding segments (element-level correspondence)
    this.scheduleSentenceAlignment();
  }

  /**
   * Highlight corresponding sentences
   */
  private highlightCorrespondences(
    sentenceId: string,
    side: 'source' | 'target',
    className: 'selected' | 'hover'
  ): void {
    if (!this.document) return;

    const correspondingIds = this.getCorrespondingIds(sentenceId, side);

    correspondingIds.forEach((id) => {
      const oppositeSide = side === 'source' ? 'target' : 'source';
      const element = this.findSentenceElement(id, oppositeSide);
      element?.classList.add(`review-translation-sentence-${className}`);
    });
  }

  /**
   * Get corresponding sentence IDs
   */
  private getCorrespondingIds(
    sentenceId: string,
    side: 'source' | 'target'
  ): string[] {
    if (!this.document) return [];

    const map = this.document.correspondenceMap;
    if (side === 'source') {
      return map.forwardMapping.get(sentenceId) || [];
    } else {
      return map.reverseMapping.get(sentenceId) || [];
    }
  }

  /**
   * Find segment element by element ID and side
   */
  private findSegmentElement(
    elementId: string,
    side: 'source' | 'target'
  ): HTMLElement | null {
    if (!this.element) return null;
    return this.element.querySelector(
      `.review-translation-segment[data-element-id="${elementId}"][data-side="${side}"]`
    );
  }

  /**
   * Find sentence element by ID and side
   * @deprecated Use findSegmentElement instead - sentences are internal only
   */
  private findSentenceElement(
    sentenceId: string,
    side: 'source' | 'target'
  ): HTMLElement | null {
    if (!this.element) return null;
    return this.element.querySelector(
      `[data-sentence-id="${sentenceId}"][data-side="${side}"]`
    );
  }

  /**
   * Clear all selection highlights
   */
  private clearSelection(): void {
    if (!this.element) return;

    const selected = this.element.querySelectorAll(
      '.review-translation-sentence-selected'
    );
    selected.forEach((el) =>
      el.classList.remove('review-translation-sentence-selected')
    );

    this.element
      .querySelectorAll('.review-translation-sentence')
      .forEach((el) => {
        (el as HTMLElement).tabIndex = -1;
      });
  }

  private restoreSelection(): void {
    if (!this.selectedSentence) {
      this.updateSentenceTabIndices();
      return;
    }
    const { id, side } = this.selectedSentence;
    const element = this.findSentenceElement(id, side);
    if (!element) {
      return;
    }
    element.classList.add('review-translation-sentence-selected');
    element.tabIndex = 0;
    this.highlightCorrespondences(id, side, 'selected');
  }

  private applyPendingFocus(): void {
    if (!this.pendingFocus) {
      return;
    }

    const { id, side, scrollIntoView } = this.pendingFocus;
    const element = this.findSentenceElement(id, side);
    if (element) {
      this.focusSentenceElement(element, scrollIntoView);
    }

    this.pendingFocus = null;
  }

  private focusSentenceElement(
    element: HTMLElement,
    scrollIntoView: boolean
  ): void {
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1');
    }
    element.focus();
    if (scrollIntoView && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  public isEditorActive(): boolean {
    return Boolean(this.activeEditorContext);
  }

  public saveActiveEditor(): boolean {
    if (!this.activeEditorContext) {
      return false;
    }
    return this.activeEditorContext.save();
  }

  public cancelActiveEditor(): void {
    if (!this.activeEditorContext) {
      return;
    }
    this.activeEditorContext.cancel();
  }

  private clearActiveEditorContext(): void {
    this.activeEditorContext = null;
  }

  public focusContainer(): void {
    this.element?.focus();
  }

  /**
   * Keep source and target panes scrolling in sync
   */
  private bindPaneScrollSync(): void {
    if (!this.sourcePane || !this.targetPane) {
      return;
    }

    if (this.sourceScrollHandler) {
      this.sourcePane.removeEventListener('scroll', this.sourceScrollHandler);
    }
    if (this.targetScrollHandler) {
      this.targetPane.removeEventListener('scroll', this.targetScrollHandler);
    }

    this.sourceScrollHandler = () => {
      if (this.syncScrollLock || !this.sourcePane || !this.targetPane) {
        return;
      }
      this.syncScrollLock = true;
      this.targetPane.scrollTop = this.sourcePane.scrollTop;
      this.syncScrollLock = false;
    };

    this.targetScrollHandler = () => {
      if (this.syncScrollLock || !this.sourcePane || !this.targetPane) {
        return;
      }
      this.syncScrollLock = true;
      this.sourcePane.scrollTop = this.targetPane.scrollTop;
      this.syncScrollLock = false;
    };

    this.sourcePane.addEventListener('scroll', this.sourceScrollHandler);
    this.targetPane.addEventListener('scroll', this.targetScrollHandler);
  }

  /**
   * Schedule sentence alignment on the next animation frame
   */
  private scheduleSentenceAlignment(): void {
    if (this.alignFrameId !== null) {
      cancelAnimationFrame(this.alignFrameId);
    }

    this.alignFrameId = window.requestAnimationFrame(() => {
      this.alignFrameId = null;
      this.alignSentenceHeights();
    });
  }

  /**
   * Ensure corresponding source/target sentences share the same height
   */
  private alignSentenceHeights(): void {
    if (!this.element || !this.document) {
      return;
    }

    // Reset any previous alignment
    this.element
      .querySelectorAll('.review-translation-sentence')
      .forEach((el) => {
        (el as HTMLElement).style.minHeight = '';
      });

    this.document.correspondenceMap.pairs.forEach((pair) => {
      const sourceEl = this.findSentenceElement(pair.sourceId, 'source');
      const targetEl = this.findSentenceElement(pair.targetId, 'target');

      if (!sourceEl || !targetEl) {
        return;
      }

      sourceEl.style.minHeight = '';
      targetEl.style.minHeight = '';

      const maxHeight = Math.max(sourceEl.offsetHeight, targetEl.offsetHeight);

      sourceEl.style.minHeight = `${maxHeight}px`;
      targetEl.style.minHeight = `${maxHeight}px`;
    });
  }

  /**
   * Enable inline editing for a segment (element-level editing)
   * Uses the same MilkdownEditor as review mode for consistent editing experience
   */
  private async enableSegmentEdit(
    element: HTMLElement,
    elementId: string,
    side: 'source' | 'target'
  ): Promise<void> {
    if (!this.document || !this.editorBridge) return;

    // Get all sentences for this element and merge into segment content
    const sentences =
      side === 'source'
        ? this.document.sourceSentences.filter((s) => s.elementId === elementId)
        : this.document.targetSentences.filter(
            (s) => s.elementId === elementId
          );

    if (sentences.length === 0) return;

    // Sort and merge sentences into complete segment content
    const orderedSentences = [...sentences].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return (a.startOffset ?? 0) - (b.startOffset ?? 0);
    });

    const segmentContent = orderedSentences.map((s) => s.content).join('\n\n');

    // Close any existing editor
    if (this.activeEditorContext) {
      this.cancelActiveEditor();
    }

    // Find content element
    const contentEl = element.querySelector(
      '.review-translation-segment-content'
    ) as HTMLElement;
    if (!contentEl) return;

    try {
      // Create editor container (same structure as review mode)
      const editorContainer = document.createElement('div');
      editorContainer.className =
        'review-translation-milkdown-editor review-inline-editor-container';
      const editorBody = document.createElement('div');
      editorBody.className = 'review-editor-body review-inline-editor-body';
      editorContainer.appendChild(editorBody);

      // Create action buttons (same as review mode)
      const actions = document.createElement('div');
      actions.className =
        'review-inline-editor-actions review-translation-editor-actions';
      actions.innerHTML = `
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
        <button class="review-btn review-btn-primary review-btn-sm" data-action="save">Save</button>
      `;

      // Replace content with editor
      contentEl.innerHTML = '';
      contentEl.appendChild(editorContainer);
      contentEl.appendChild(actions);

      // Initialize Milkdown editor for the entire segment (not individual sentences)
      await this.editorBridge.initializeSegmentEditor(
        editorContainer,
        elementId,
        segmentContent,
        side
      );

      logger.debug('Milkdown editor initialized for segment', {
        elementId,
        side,
        sentenceCount: sentences.length,
      });

      const removeEscapeListener = (): void => {
        document.removeEventListener('keydown', handleKeyDown);
      };

      const finishEditing = (destroyEditor: boolean): void => {
        removeEscapeListener();
        if (destroyEditor) {
          this.editorBridge?.destroy();
        }
        // Re-render the segment content
        if (this.markdown) {
          try {
            const html = this.markdown.renderElement(segmentContent, 'Para');
            contentEl.innerHTML = html;
          } catch (error) {
            logger.warn('Failed to render markdown after editing', { error });
            contentEl.textContent = segmentContent;
          }
        } else {
          contentEl.textContent = segmentContent;
        }
        element.focus();
        this.clearActiveEditorContext();
        this.scheduleSentenceAlignment();
      };

      // Handle save - calls callback with entire segment content
      const save = (): boolean => {
        const module = this.editorBridge?.getModule();
        const newContent = module?.getContent() || segmentContent;
        const saved = this.editorBridge?.saveSegmentEdit(
          elementId,
          newContent,
          side
        );

        if (saved) {
          // Call the appropriate callback with segment-level edit
          const callback =
            side === 'source'
              ? this.callbacks.onSourceSegmentEdit
              : this.callbacks.onTargetSegmentEdit;
          void callback?.(elementId, newContent);

          // Re-render with new content
          if (this.markdown) {
            try {
              const html = this.markdown.renderElement(newContent, 'Para');
              contentEl.innerHTML = html;
            } catch (error) {
              logger.warn('Failed to render markdown', { error });
              contentEl.textContent = newContent;
            }
          } else {
            contentEl.textContent = newContent;
          }
        } else {
          // Restore original content if save failed
          if (this.markdown) {
            try {
              const html = this.markdown.renderElement(segmentContent, 'Para');
              contentEl.innerHTML = html;
            } catch (error) {
              logger.error('Failed to render segment content', error);
              contentEl.textContent = segmentContent;
            }
          } else {
            contentEl.textContent = segmentContent;
          }
        }

        finishEditing(true);
        return Boolean(saved);
      };

      const cancel = (): void => {
        // Restore original content
        if (this.markdown) {
          try {
            const html = this.markdown.renderElement(segmentContent, 'Para');
            contentEl.innerHTML = html;
          } catch (error) {
            logger.error('Failed to render segment content', error);
            contentEl.textContent = segmentContent;
          }
        } else {
          contentEl.textContent = segmentContent;
        }
        this.editorBridge?.cancelEdit();
        finishEditing(false);
      };

      function handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }

      // Attach button event listeners
      actions
        .querySelector('[data-action="save"]')
        ?.addEventListener('click', () => {
          void save();
        });
      actions
        .querySelector('[data-action="cancel"]')
        ?.addEventListener('click', () => {
          cancel();
        });

      // Escape to cancel
      document.addEventListener('keydown', handleKeyDown);

      // Store active editor context (modified for segments)
      this.activeEditorContext = {
        sentence: orderedSentences[0]!, // Keep for type compatibility
        side,
        sentenceElement: element,
        contentEl,
        save,
        cancel,
      };
    } catch (error) {
      logger.error('Failed to initialize segment editor', {
        elementId,
        side,
        error,
      });
      this.editorBridge?.destroy();
      // Restore content display
      if (this.markdown) {
        try {
          const html = this.markdown.renderElement(segmentContent, 'Para');
          contentEl.innerHTML = html;
        } catch (renderError) {
          logger.error('Failed to render segment content', renderError);
          contentEl.textContent = segmentContent;
        }
      } else {
        contentEl.textContent = segmentContent;
      }
      // Show error message
      const message = document.createElement('div');
      message.className = 'review-translation-editor-error';
      message.setAttribute('role', 'alert');
      message.textContent =
        'Unable to load the translation editor. Please reload translation mode and try again.';
      contentEl.appendChild(message);
    }
  }

  /**
   * Update statistics display
   */
  private updateStatistics(): void {
    if (!this.element || !this.document) return;

    const stats = this.document.metadata;

    const totalEl = this.element.querySelector(
      '[data-stat="total"]'
    ) as HTMLElement;
    if (totalEl) {
      totalEl.textContent = stats.totalSentences.toString();
    }

    const translatedEl = this.element.querySelector(
      '[data-stat="translated"]'
    ) as HTMLElement;
    if (translatedEl) {
      translatedEl.textContent = stats.translatedCount.toString();
    }

    const progressEl = this.element.querySelector(
      '[data-stat="progress"]'
    ) as HTMLElement;
    if (progressEl) {
      const percentage =
        stats.totalSentences > 0
          ? Math.round((stats.translatedCount / stats.totalSentences) * 100)
          : 0;
      progressEl.textContent = `${percentage}%`;
    }
  }

  /**
   * Refresh the view (re-render)
   */
  refresh(): void {
    this.render();
  }

  /**
   * Queue focus restoration for a sentence on the next render cycle
   */
  public queueFocusOnSentence(
    sentenceId: string,
    side: 'source' | 'target',
    options?: { scrollIntoView?: boolean }
  ): void {
    this.selectedSentence = { id: sentenceId, side };
    this.pendingFocus = {
      id: sentenceId,
      side,
      scrollIntoView: options?.scrollIntoView ?? false,
    };
  }

  /**
   * Retrieve the currently selected sentence, if any
   */
  public getSelectedSentence(): {
    id: string;
    side: 'source' | 'target';
  } | null {
    return this.selectedSentence;
  }

  /**
   * Get the underlying DOM element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.isEditorActive()) {
      this.cancelActiveEditor();
    }

    if (this.sourcePane && this.sourceScrollHandler) {
      this.sourcePane.removeEventListener('scroll', this.sourceScrollHandler);
    }
    if (this.targetPane && this.targetScrollHandler) {
      this.targetPane.removeEventListener('scroll', this.targetScrollHandler);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.alignFrameId !== null) {
      cancelAnimationFrame(this.alignFrameId);
      this.alignFrameId = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.sourcePane = null;
    this.targetPane = null;
    this.document = null;
    this.sourceScrollHandler = null;
    this.targetScrollHandler = null;
    this.syncScrollLock = false;
    this.selectedSentence = null;
    this.pendingFocus = null;
    this.loadingSentences.clear();
    this.sentenceErrors.clear();
    this.progressStatus = null;
    this.progressElements = {
      container: null,
      bar: null,
      fill: null,
      message: null,
    };
    this.errorBannerElements = {
      container: null,
      message: null,
      retryButton: null,
    };
    this.activeEditorContext = null;
  }

  public setErrorBanner(
    state: { message: string; retryLabel?: string; onRetry?: () => void } | null
  ): void {
    const { container, message, retryButton } = this.errorBannerElements;
    if (!container || !message || !retryButton) {
      return;
    }

    if (!state) {
      container.hidden = true;
      message.textContent = '';
      retryButton.hidden = true;
      retryButton.onclick = null;
      return;
    }

    message.textContent = state.message;
    container.hidden = false;

    if (state.onRetry) {
      retryButton.hidden = false;
      retryButton.textContent = state.retryLabel ?? 'Retry';
      retryButton.onclick = () => {
        state.onRetry?.();
      };
    } else {
      retryButton.hidden = true;
      retryButton.onclick = null;
    }
  }

  public setSentenceError(
    sentenceId: string,
    side: 'source' | 'target',
    message?: string | null
  ): void {
    const key = this.makeLoadingKey(sentenceId, side);
    if (message === undefined || message === null) {
      this.sentenceErrors.delete(key);
    } else {
      this.sentenceErrors.set(key, message);
    }

    const element = this.findSentenceElement(sentenceId, side);
    this.applyErrorStateToElement(element, side);
  }

  public clearSentenceErrors(sentenceIds: string[]): void {
    sentenceIds.forEach((sourceId) => {
      const keySource = this.makeLoadingKey(sourceId, 'source');
      this.sentenceErrors.delete(keySource);
      const sourceElement = this.findSentenceElement(sourceId, 'source');
      this.applyErrorStateToElement(sourceElement, 'source');
    });
  }

  private applyErrorStates(): void {
    if (!this.element) {
      return;
    }

    this.element
      .querySelectorAll('.review-translation-sentence[data-sentence-id]')
      .forEach((el) => {
        const element = el as HTMLElement;
        const sentenceId = element.dataset.sentenceId;
        const side = (element.dataset.side as 'source' | 'target') ?? 'source';
        if (!sentenceId) {
          return;
        }
        this.applyErrorStateToElement(element, side);
      });
  }

  private applyErrorStateToElement(
    element: HTMLElement | null,
    side: 'source' | 'target'
  ): void {
    if (!element) {
      return;
    }

    const sentenceId = element.dataset.sentenceId ?? '';
    const key = this.makeLoadingKey(sentenceId, side);
    const message = this.sentenceErrors.get(key) ?? null;
    const hasError = message !== null;

    element.classList.toggle('review-translation-sentence-error', hasError);
    if (hasError) {
      element.setAttribute('data-error', 'true');
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('data-error');
      element.removeAttribute('aria-invalid');
    }

    const errorMessageEl = element.querySelector(
      '[data-role="sentence-error"]'
    ) as HTMLElement | null;
    if (errorMessageEl) {
      if (hasError) {
        errorMessageEl.hidden = false;
        errorMessageEl.textContent = message || 'Translation failed.';
      } else {
        errorMessageEl.hidden = true;
        errorMessageEl.textContent = '';
      }
    }
  }

  private updateSentenceTabIndices(): void {
    if (!this.element) {
      return;
    }

    const sentences = Array.from(
      this.element.querySelectorAll('.review-translation-sentence')
    ) as HTMLElement[];

    sentences.forEach((el) => {
      el.tabIndex = -1;
    });

    let target: HTMLElement | null = null;
    if (this.selectedSentence) {
      target = this.findSentenceElement(
        this.selectedSentence.id,
        this.selectedSentence.side
      );
    }

    if (!target && sentences.length > 0) {
      target = sentences[0] ?? null;
    }

    if (target) {
      target.tabIndex = 0;
    }
  }
}
