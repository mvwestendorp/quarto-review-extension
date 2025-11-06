/**
 * TranslationView Component
 * Side-by-side view for source and target language editing with correspondence visualization
 */

import { createModuleLogger } from '@utils/debug';
import type { MarkdownModule } from '@modules/markdown';
import type { TranslationDocument, Sentence } from '@modules/translation/types';
import type { TranslationEditorBridge } from './TranslationEditorBridge';
import type { TranslationProgressStatus } from './TranslationController';
import type { StateStore } from '@/services/StateStore';
import type { TranslationState } from '@modules/ui/shared';

const logger = createModuleLogger('TranslationView');

export interface TranslationViewConfig {
  showCorrespondenceLines: boolean;
  highlightOnHover: boolean;
}

export interface TranslationViewCallbacks {
  // Segment-level editing (primary editing mode)
  onSourceSegmentEdit?: (elementId: string, newContent: string) => void;
  onTargetSegmentEdit?: (elementId: string, newContent: string) => void;

  // Sentence-level editing (deprecated, kept for backward compatibility)
  onSourceSentenceEdit?: (sentenceId: string, newContent: string) => void;
  onTargetSentenceEdit?: (sentenceId: string, newContent: string) => void;
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
  private viewConfig: TranslationViewConfig;
  private callbacks: TranslationViewCallbacks;
  private document: TranslationDocument | null = null;
  private markdown: MarkdownModule | null = null;
  private editorBridge: TranslationEditorBridge | null = null;
  private stateStore: StateStore | null = null;
  private stateStoreUnsubscribe: (() => void) | null = null;

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
    config: TranslationViewConfig,
    callbacks: TranslationViewCallbacks,
    markdown?: MarkdownModule,
    editorBridge?: TranslationEditorBridge,
    stateStore?: StateStore
  ) {
    this.viewConfig = config;
    this.callbacks = callbacks;
    this.markdown = markdown || null;
    this.editorBridge = editorBridge || null;
    this.stateStore = stateStore || null;
    this.handleResize = () => {
      this.scheduleSentenceAlignment();
    };

    // Subscribe to StateStore translation state changes
    if (this.stateStore) {
      this.stateStoreUnsubscribe = this.stateStore.on<TranslationState>(
        'translation:changed',
        (state: Readonly<TranslationState>) => {
          this.handleStateStoreUpdate(state);
        }
      );
    }
  }

  /**
   * Handle StateStore translation state updates
   */
  private handleStateStoreUpdate(state: Readonly<TranslationState>): void {
    logger.debug('StateStore translation state updated in view', {
      isBusy: state.isBusy,
      progressPhase: state.progressPhase,
      hasSelectedSource: !!state.selectedSourceSentenceId,
      hasSelectedTarget: !!state.selectedTargetSentenceId,
    });

    // Update progress status if it changed
    if (
      state.progressPhase !== this.progressStatus?.phase ||
      state.progressMessage !== this.progressStatus?.message ||
      state.progressPercent !== this.progressStatus?.percent
    ) {
      this.setDocumentProgress({
        phase: state.progressPhase,
        message: state.progressMessage,
        percent: state.progressPercent,
      });
    }

    // Update selected sentence if it changed
    if (
      state.selectedSourceSentenceId &&
      state.selectedSourceSentenceId !== this.selectedSentence?.id
    ) {
      this.selectedSentence = {
        id: state.selectedSourceSentenceId,
        side: 'source',
      };
      // Re-apply selection UI if already rendered
      if (this.element) {
        this.restoreSelection();
      }
    } else if (
      state.selectedTargetSentenceId &&
      state.selectedTargetSentenceId !== this.selectedSentence?.id
    ) {
      this.selectedSentence = {
        id: state.selectedTargetSentenceId,
        side: 'target',
      };
      // Re-apply selection UI if already rendered
      if (this.element) {
        this.restoreSelection();
      }
    }
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

    // Render source sentences
    this.renderSentences(
      this.sourcePane,
      this.document.sourceSentences,
      'source'
    );

    // Render target sentences
    this.renderSentences(
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
   * Render sentences in a pane, grouped by document sections
   */
  private renderSentences(
    pane: HTMLElement,
    sentences: Sentence[],
    side: 'source' | 'target'
  ): void {
    pane.innerHTML = '';

    // Group sentences by elementId (document section)
    const sectionMap = new Map<string, Sentence[]>();
    sentences.forEach((sentence) => {
      const elementId = sentence.elementId;
      if (!sectionMap.has(elementId)) {
        sectionMap.set(elementId, []);
      }
      sectionMap.get(elementId)!.push(sentence);
    });

    // Render each section with its sentences
    Array.from(sectionMap.entries()).forEach(
      ([elementId, sectionSentences]) => {
        // Create section container (segment-level container)
        const sectionElement = document.createElement('div');
        sectionElement.className = 'review-translation-section';
        sectionElement.dataset.elementId = elementId;
        sectionElement.dataset.side = side;

        // Add section header with edit button
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'review-translation-section-header';

        const editButton = document.createElement('button');
        editButton.className = 'review-translation-edit-segment-btn';
        editButton.type = 'button';
        editButton.title = `Edit ${side} segment`;
        editButton.setAttribute('aria-label', `Edit ${side} segment`);
        editButton.innerHTML = `<span class="edit-icon">✏️</span> Edit Segment`;

        editButton.addEventListener('click', () => {
          void this.enableSegmentEdit(
            sectionElement,
            elementId,
            sectionSentences,
            side
          );
        });

        sectionHeader.appendChild(editButton);
        sectionElement.appendChild(sectionHeader);

        // Render sentences within the section (with visual status indicators)
        sectionSentences.forEach((sentence) => {
          const sentenceElement = this.createSentenceElement(sentence, side);
          sectionElement.appendChild(sentenceElement);
        });

        pane.appendChild(sectionElement);
      }
    );
  }

  /**
   * Create a single sentence element
   */
  private createSentenceElement(
    sentence: Sentence,
    side: 'source' | 'target'
  ): HTMLElement {
    const sentenceElement = document.createElement('div');
    sentenceElement.className = 'review-translation-sentence';
    sentenceElement.dataset.sentenceId = sentence.id;
    sentenceElement.dataset.side = side;
    sentenceElement.tabIndex = -1;

    // Get translation status
    const status = this.getSentenceStatus(sentence.id, side);
    if (status) {
      sentenceElement.dataset.status = status;
      // Add CSS class for styling based on status
      sentenceElement.classList.add(`review-translation-sentence-${status}`);
    }

    // Create sentence wrapper for better layout
    const wrapper = document.createElement('div');
    wrapper.className = 'review-translation-sentence-wrapper';

    // Create sentence content - render as styled HTML using document-style rendering
    const content = document.createElement('div');
    content.className = 'review-translation-sentence-content';

    // Render markdown as HTML if MarkdownModule is available
    if (this.markdown) {
      try {
        // Use renderElement for proper document-style formatting instead of inline
        const html = this.markdown.renderElement(sentence.content, 'Para');
        content.innerHTML = html;
      } catch (error) {
        logger.warn('Failed to render markdown, falling back to plain text', {
          sentenceId: sentence.id,
          error,
        });
        content.textContent = sentence.content;
      }
    } else {
      // Fallback to plain text if markdown module not available
      content.textContent = sentence.content;
    }

    wrapper.appendChild(content);

    // Add status chip for target sentences
    if (side === 'target' && status) {
      const statusChip = document.createElement('span');
      statusChip.className = 'review-translation-status-chip';
      statusChip.dataset.role = 'status-chip';
      statusChip.dataset.status = status;
      statusChip.setAttribute('role', 'status');
      statusChip.setAttribute('aria-label', this.getStatusAriaLabel(status));
      statusChip.textContent = this.getStatusLabel(status);
      wrapper.appendChild(statusChip);
    }

    sentenceElement.appendChild(wrapper);

    // Add spinner for loading states
    const spinner = document.createElement('div');
    spinner.className = 'review-translation-sentence-spinner';
    spinner.dataset.role = 'sentence-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');
    spinner.hidden = true;
    sentenceElement.appendChild(spinner);

    // Add error message container
    const errorMessage = document.createElement('div');
    errorMessage.className = 'review-translation-sentence-error-message';
    errorMessage.dataset.role = 'sentence-error';
    errorMessage.setAttribute('role', 'alert');
    errorMessage.hidden = true;
    sentenceElement.appendChild(errorMessage);

    // Add event listeners
    this.bindSentenceEvents(sentenceElement, sentence.id, side);

    return sentenceElement;
  }

  /**
   * Get translation status for a sentence
   */
  private getSentenceStatus(
    sentenceId: string,
    side: 'source' | 'target'
  ): string | null {
    if (!this.document) return null;

    const pairs = this.document.correspondenceMap.pairs.filter((pair) =>
      side === 'source'
        ? pair.sourceId === sentenceId
        : pair.targetId === sentenceId
    );

    if (pairs.length === 0) return 'untranslated';

    // Return the most relevant status
    const statuses = pairs.map((p) => p.status);
    if (statuses.includes('out-of-sync')) return 'out-of-sync';
    if (statuses.includes('manual')) return 'manual';
    if (statuses.includes('edited')) return 'edited';
    if (statuses.includes('auto-translated')) return 'auto-translated';
    return 'synced';
  }

  /**
   * Get human-readable status label
   */
  private getStatusLabel(status: string | null): string {
    const labels: Record<string, string> = {
      untranslated: 'Not translated',
      'auto-translated': 'Auto-translated',
      manual: 'Manual translation',
      edited: 'Edited',
      'out-of-sync': 'Out of sync',
      synced: 'Synced',
    };
    return status ? labels[status] || status : '';
  }

  /**
   * Get aria-label for status
   */
  private getStatusAriaLabel(status: string | null): string {
    const labels: Record<string, string> = {
      untranslated: 'Not translated',
      'auto-translated': 'Auto-translated',
      manual: 'Manually translated',
      edited: 'Edited',
      'out-of-sync': 'Out of sync',
      synced: 'Synced',
    };
    return status ? labels[status] || status : '';
  }

  /**
   * Bind events to a sentence element
   */
  private bindSentenceEvents(
    element: HTMLElement,
    sentenceId: string,
    side: 'source' | 'target'
  ): void {
    // Click to select
    element.addEventListener('click', () => {
      this.selectSentence(sentenceId, side);
    });

    // Hover to highlight correspondences
    if (this.viewConfig.highlightOnHover) {
      element.addEventListener('mouseenter', () => {
        this.hoverSentence(sentenceId, side);
      });

      element.addEventListener('mouseleave', () => {
        this.unhoverSentence(sentenceId, side);
      });
    }

    // NOTE: Double-click editing removed - editing now happens at segment level
    // via the "Edit Segment" button on the section container
  }

  /**
   * Select a sentence and highlight its correspondences
   */
  private selectSentence(sentenceId: string, side: 'source' | 'target'): void {
    // Clear previous selection
    this.clearSelection();

    // Set selected
    this.selectedSentence = { id: sentenceId, side };

    // Update StateStore if available
    if (this.stateStore) {
      this.stateStore.setTranslationState({
        selectedSourceSentenceId: side === 'source' ? sentenceId : null,
        selectedTargetSentenceId: side === 'target' ? sentenceId : null,
      });
    }

    // Add selected class
    const element = this.findSentenceElement(sentenceId, side);
    if (element) {
      element.classList.add('review-translation-sentence-selected');
      element.tabIndex = 0;
      element.focus();
    }

    // Highlight corresponding sentences
    this.highlightCorrespondences(sentenceId, side, 'selected');
  }

  /**
   * Hover a sentence
   */
  private hoverSentence(sentenceId: string, side: 'source' | 'target'): void {
    const element = this.findSentenceElement(sentenceId, side);
    if (element) {
      element.classList.add('review-translation-sentence-hover');
    }
    this.highlightCorrespondences(sentenceId, side, 'hover');
  }

  /**
   * Unhover a sentence
   */
  private unhoverSentence(sentenceId: string, side: 'source' | 'target'): void {
    const element = this.findSentenceElement(sentenceId, side);
    if (element) {
      element.classList.remove('review-translation-sentence-hover');
    }
    // Remove hover highlights from correspondences
    this.removeCorrespondenceHighlights('hover');
  }

  /**
   * Find a sentence element by ID
   */
  private findSentenceElement(
    sentenceId: string,
    side: 'source' | 'target'
  ): HTMLElement | null {
    const pane = side === 'source' ? this.sourcePane : this.targetPane;
    if (!pane) return null;
    return pane.querySelector(
      `[data-sentence-id="${sentenceId}"][data-side="${side}"]`
    );
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
   * Remove correspondence highlights
   */
  private removeCorrespondenceHighlights(
    className: 'selected' | 'hover'
  ): void {
    if (!this.element) return;
    const highlighted = this.element.querySelectorAll(
      `.review-translation-sentence-${className}`
    );
    highlighted.forEach((el) => {
      el.classList.remove(`review-translation-sentence-${className}`);
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
   * Enable inline editing for a segment (all sentences in an element)
   * This is the primary editing mode - edits the full segment with context
   */
  private async enableSegmentEdit(
    sectionElement: HTMLElement,
    elementId: string,
    sentences: Sentence[],
    side: 'source' | 'target'
  ): Promise<void> {
    if (!this.document || !this.editorBridge) return;

    // Ensure we have at least one sentence
    if (sentences.length === 0) {
      logger.error('Cannot enable segment edit with no sentences', {
        elementId,
        side,
      });
      return;
    }

    // Merge all sentences into segment content
    // Sort by order to ensure correct sequence
    const sortedSentences = [...sentences].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });

    const segmentContent = sortedSentences.map((s) => s.content).join('\n\n'); // Use paragraph breaks between sentences

    logger.debug('Opening segment editor', {
      elementId,
      side,
      sentenceCount: sentences.length,
      contentLength: segmentContent.length,
    });

    try {
      // Create editor container
      const editorContainer = document.createElement('div');
      editorContainer.className =
        'review-translation-segment-editor review-inline-editor-container';
      const editorBody = document.createElement('div');
      editorBody.className = 'review-editor-body review-inline-editor-body';
      editorContainer.appendChild(editorBody);

      // Create action buttons
      const actions = document.createElement('div');
      actions.className =
        'review-inline-editor-actions review-translation-editor-actions';
      actions.innerHTML = `
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
        <button class="review-btn review-btn-primary review-btn-sm" data-action="save">Save</button>
      `;

      // Hide sentences and show editor in section
      const sentenceElements = sectionElement.querySelectorAll(
        '.review-translation-sentence'
      );
      sentenceElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // Add editor to section
      sectionElement.appendChild(editorContainer);
      sectionElement.appendChild(actions);

      // Initialize Milkdown editor with full segment content
      await this.editorBridge.initializeSegmentEditor(
        editorContainer,
        elementId,
        segmentContent,
        side
      );

      logger.debug('Milkdown editor initialized for segment', {
        elementId,
        side,
      });

      const save = (): boolean => {
        // Get editor content using existing EditorLifecycle method
        const module = this.editorBridge?.getModule();
        if (!module) {
          logger.error('Editor module not available for save');
          return false;
        }

        const newContent = module.getContent() || '';

        // Validate using existing saveSegmentEdit method
        const isValid = this.editorBridge?.saveSegmentEdit(
          elementId,
          newContent,
          side
        );

        if (isValid) {
          // Call the segment edit callback - controller handles ChangesModule
          if (side === 'source' && this.callbacks.onSourceSegmentEdit) {
            this.callbacks.onSourceSegmentEdit(elementId, newContent);
          } else if (side === 'target' && this.callbacks.onTargetSegmentEdit) {
            this.callbacks.onTargetSegmentEdit(elementId, newContent);
          }

          // Clean up editor using existing destroy method
          this.editorBridge?.destroy();
          editorContainer.remove();
          actions.remove();

          // Show sentences again (they will be updated by the document reload)
          sentenceElements.forEach((el) => {
            (el as HTMLElement).style.display = '';
          });

          logger.debug('Segment edit saved', { elementId, side });
          return true;
        }
        return false;
      };

      const cancel = (): void => {
        this.editorBridge?.cancelEdit();
        editorContainer.remove();
        actions.remove();

        // Show sentences again
        sentenceElements.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });

        logger.debug('Segment edit cancelled', { elementId, side });
      };

      // Bind action buttons
      const saveBtn = actions.querySelector('[data-action="save"]');
      const cancelBtn = actions.querySelector('[data-action="cancel"]');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => save());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => cancel());
      }

      // Store editor context for keyboard shortcuts
      this.activeEditorContext = {
        sentence: sentences[0]!, // For compatibility - safe because we check length above
        side,
        sentenceElement: sectionElement,
        contentEl: sectionElement,
        save,
        cancel,
      };
    } catch (error) {
      logger.error('Failed to initialize segment editor', {
        elementId,
        side,
        error,
      });
      // Show error message in the section
      const errorEl = document.createElement('div');
      errorEl.className = 'review-translation-editor-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent =
        error instanceof Error ? error.message : 'Failed to initialize editor';
      sectionElement.appendChild(errorEl);
    }
  }

  /**
   * Enable inline editing for a sentence
   * @deprecated Use enableSegmentEdit instead - kept for backward compatibility
   */
  // @ts-expect-error - Deprecated method kept for backward compatibility
  private async enableSentenceEdit(
    element: HTMLElement,
    sentence: Sentence,
    side: 'source' | 'target'
  ): Promise<void> {
    if (!this.document || !this.editorBridge) return;

    const contentEl = element.querySelector(
      '.review-translation-sentence-content'
    ) as HTMLElement;
    if (!contentEl) return;

    try {
      // Create editor container
      const editorContainer = document.createElement('div');
      editorContainer.className =
        'review-translation-milkdown-editor review-inline-editor-container';
      const editorBody = document.createElement('div');
      editorBody.className = 'review-editor-body review-inline-editor-body';
      editorContainer.appendChild(editorBody);

      // Create action buttons
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

      // Initialize Milkdown editor
      await this.editorBridge.initializeSentenceEditor(
        editorContainer,
        sentence,
        side
      );

      logger.debug('Milkdown editor initialized for sentence', {
        sentenceId: sentence.id,
        side,
      });

      const save = (): boolean => {
        const saved = this.editorBridge?.saveSentenceEdit();
        if (saved) {
          // Restore rendered content with new content
          const module = this.editorBridge?.getModule();
          const newContent = module?.getContent() || sentence.content;

          // Update sentence content in document
          sentence.content = newContent;

          if (this.markdown) {
            try {
              const html = this.markdown.renderElement(newContent, 'Para');
              contentEl.innerHTML = html;
            } catch (error) {
              logger.error('Failed to render edited content', error);
              contentEl.textContent = newContent;
            }
          } else {
            contentEl.textContent = newContent;
          }

          // Notify callback
          const callback =
            side === 'source'
              ? this.callbacks.onSourceSentenceEdit
              : this.callbacks.onTargetSentenceEdit;
          callback?.(sentence.id, newContent);
        } else {
          // Restore original display
          this.restoreSentenceDisplay(contentEl, sentence);
        }

        this.editorBridge?.destroy();
        this.activeEditorContext = null;
        return Boolean(saved);
      };

      const cancel = (): void => {
        this.restoreSentenceDisplay(contentEl, sentence);
        this.editorBridge?.cancelEdit();
        this.activeEditorContext = null;
      };

      // Set active editor context
      this.activeEditorContext = {
        sentence,
        side,
        sentenceElement: element,
        contentEl,
        save,
        cancel,
      };

      // Attach button event listeners
      actions
        .querySelector('[data-action="save"]')
        ?.addEventListener('click', save);
      actions
        .querySelector('[data-action="cancel"]')
        ?.addEventListener('click', cancel);

      // Escape to cancel
      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
    } catch (error) {
      logger.error('Failed to initialize Milkdown editor for sentence', error);
      // Show error message
      const errorEl = document.createElement('div');
      errorEl.className = 'review-translation-editor-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent =
        error instanceof Error ? error.message : 'Failed to initialize editor';
      contentEl.innerHTML = '';
      contentEl.appendChild(errorEl);
    }
  }

  /**
   * Restore rendered display of a sentence
   */
  private restoreSentenceDisplay(
    contentEl: HTMLElement,
    sentence: Sentence
  ): void {
    if (this.markdown) {
      try {
        const html = this.markdown.renderElement(sentence.content, 'Para');
        contentEl.innerHTML = html;
      } catch {
        contentEl.textContent = sentence.content;
      }
    } else {
      contentEl.textContent = sentence.content;
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

    // Unsubscribe from StateStore
    if (this.stateStoreUnsubscribe) {
      this.stateStoreUnsubscribe();
      this.stateStoreUnsubscribe = null;
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
    this.stateStore = null;
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
