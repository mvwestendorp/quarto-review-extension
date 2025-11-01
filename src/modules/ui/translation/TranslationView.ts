/**
 * TranslationView Component
 * Side-by-side view for source and target language editing with correspondence visualization
 */

import { createModuleLogger } from '@utils/debug';
import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
} from '@modules/translation/types';

const logger = createModuleLogger('TranslationView');

export interface TranslationViewConfig {
  showCorrespondenceLines: boolean;
  highlightOnHover: boolean;
}

export interface TranslationViewCallbacks {
  onSourceSentenceClick?: (sentenceId: string) => void;
  onTargetSentenceClick?: (sentenceId: string) => void;
  onSourceSentenceEdit?: (sentenceId: string, newContent: string) => void;
  onTargetSentenceEdit?: (sentenceId: string, newContent: string) => void;
}

export class TranslationView {
  private element: HTMLElement | null = null;
  private config: TranslationViewConfig;
  private callbacks: TranslationViewCallbacks;
  private document: TranslationDocument | null = null;

  // UI elements
  private sourcePane: HTMLElement | null = null;
  private targetPane: HTMLElement | null = null;
  private correspondenceCanvas: HTMLCanvasElement | null = null;

  // State
  private hoveredSourceId: string | null = null;
  private hoveredTargetId: string | null = null;
  private selectedSourceId: string | null = null;
  private selectedTargetId: string | null = null;

  constructor(
    config: TranslationViewConfig,
    callbacks: TranslationViewCallbacks
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Create and initialize the translation view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'review-translation-view';

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

    // Add correspondence canvas if enabled
    if (this.config.showCorrespondenceLines) {
      this.correspondenceCanvas = document.createElement('canvas');
      this.correspondenceCanvas.className =
        'review-translation-correspondence-canvas';
      content.appendChild(this.correspondenceCanvas);
    }

    container.appendChild(content);

    this.element = container;
    return container;
  }

  /**
   * Create header with statistics and controls
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'review-translation-view-header';

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

    header.appendChild(stats);
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

    // Draw correspondence lines
    if (this.config.showCorrespondenceLines) {
      this.drawCorrespondenceLines();
    }
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
   * Render sentences in a pane
   */
  private renderSentences(
    pane: HTMLElement,
    sentences: Sentence[],
    side: 'source' | 'target'
  ): void {
    pane.innerHTML = '';

    sentences.forEach((sentence) => {
      const sentenceElement = document.createElement('div');
      sentenceElement.className = 'review-translation-sentence';
      sentenceElement.dataset.sentenceId = sentence.id;
      sentenceElement.dataset.side = side;

      // Get translation status
      const status = this.getSentenceStatus(sentence.id, side);
      if (status) {
        sentenceElement.dataset.status = status;
      }

      // Create sentence content
      const content = document.createElement('div');
      content.className = 'review-translation-sentence-content';
      content.textContent = sentence.content;
      sentenceElement.appendChild(content);

      // Add status indicator
      const indicator = document.createElement('div');
      indicator.className = 'review-translation-sentence-indicator';
      indicator.title = this.getStatusLabel(status);
      sentenceElement.appendChild(indicator);

      // Add event listeners
      this.bindSentenceEvents(sentenceElement, sentence.id, side);

      pane.appendChild(sentenceElement);
    });
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
      const callback =
        side === 'source'
          ? this.callbacks.onSourceSentenceClick
          : this.callbacks.onTargetSentenceClick;
      callback?.(sentenceId);
    });

    // Hover to highlight correspondences
    if (this.config.highlightOnHover) {
      element.addEventListener('mouseenter', () => {
        this.hoverSentence(sentenceId, side);
      });

      element.addEventListener('mouseleave', () => {
        this.unhoverSentence(sentenceId, side);
      });
    }

    // Double-click to edit
    element.addEventListener('dblclick', () => {
      this.enableSentenceEdit(element, sentenceId, side);
    });
  }

  /**
   * Select a sentence and highlight its correspondences
   */
  private selectSentence(sentenceId: string, side: 'source' | 'target'): void {
    // Clear previous selection
    this.clearSelection();

    // Set selected
    if (side === 'source') {
      this.selectedSourceId = sentenceId;
    } else {
      this.selectedTargetId = sentenceId;
    }

    // Add selected class
    const element = this.findSentenceElement(sentenceId, side);
    element?.classList.add('review-translation-sentence-selected');

    // Highlight corresponding sentences
    this.highlightCorrespondences(sentenceId, side, 'selected');

    // Redraw correspondence lines
    if (this.config.showCorrespondenceLines) {
      this.drawCorrespondenceLines();
    }
  }

  /**
   * Hover over a sentence
   */
  private hoverSentence(sentenceId: string, side: 'source' | 'target'): void {
    if (side === 'source') {
      this.hoveredSourceId = sentenceId;
    } else {
      this.hoveredTargetId = sentenceId;
    }

    // Highlight corresponding sentences
    this.highlightCorrespondences(sentenceId, side, 'hover');

    // Redraw correspondence lines
    if (this.config.showCorrespondenceLines) {
      this.drawCorrespondenceLines();
    }
  }

  /**
   * Unhover from a sentence
   */
  private unhoverSentence(sentenceId: string, side: 'source' | 'target'): void {
    if (side === 'source') {
      this.hoveredSourceId = null;
    } else {
      this.hoveredTargetId = null;
    }

    // Remove hover highlights
    this.clearHoverHighlights();

    // Redraw correspondence lines
    if (this.config.showCorrespondenceLines) {
      this.drawCorrespondenceLines();
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
   * Find sentence element by ID and side
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
    this.selectedSourceId = null;
    this.selectedTargetId = null;

    if (!this.element) return;

    const selected = this.element.querySelectorAll(
      '.review-translation-sentence-selected'
    );
    selected.forEach((el) =>
      el.classList.remove('review-translation-sentence-selected')
    );
  }

  /**
   * Clear hover highlights
   */
  private clearHoverHighlights(): void {
    if (!this.element) return;

    const hovered = this.element.querySelectorAll(
      '.review-translation-sentence-hover'
    );
    hovered.forEach((el) =>
      el.classList.remove('review-translation-sentence-hover')
    );
  }

  /**
   * Enable inline editing for a sentence
   */
  private enableSentenceEdit(
    element: HTMLElement,
    sentenceId: string,
    side: 'source' | 'target'
  ): void {
    const contentEl = element.querySelector(
      '.review-translation-sentence-content'
    ) as HTMLElement;
    if (!contentEl) return;

    const originalText = contentEl.textContent || '';

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'review-translation-sentence-editor';
    textarea.value = originalText;

    // Replace content with textarea
    contentEl.innerHTML = '';
    contentEl.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // Handle save/cancel
    const save = () => {
      const newText = textarea.value.trim();
      if (newText && newText !== originalText) {
        contentEl.textContent = newText;
        const callback =
          side === 'source'
            ? this.callbacks.onSourceSentenceEdit
            : this.callbacks.onTargetSentenceEdit;
        callback?.(sentenceId, newText);
      } else {
        contentEl.textContent = originalText;
      }
    };

    const cancel = () => {
      contentEl.textContent = originalText;
    };

    // Enter to save, Escape to cancel
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });

    // Blur to save
    textarea.addEventListener('blur', save);
  }

  /**
   * Draw correspondence lines on canvas
   */
  private drawCorrespondenceLines(): void {
    if (!this.correspondenceCanvas || !this.document || !this.element) {
      return;
    }

    const canvas = this.correspondenceCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const content = this.element.querySelector('.review-translation-content');
    if (!content) return;

    canvas.width = content.clientWidth;
    canvas.height = content.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines for each correspondence
    this.document.correspondenceMap.pairs.forEach((pair) => {
      this.drawCorrespondenceLine(ctx, pair);
    });
  }

  /**
   * Draw a single correspondence line
   */
  private drawCorrespondenceLine(
    ctx: CanvasRenderingContext2D,
    pair: TranslationPair
  ): void {
    const sourceEl = this.findSentenceElement(pair.sourceId, 'source');
    const targetEl = this.findSentenceElement(pair.targetId, 'target');

    if (!sourceEl || !targetEl || !this.correspondenceCanvas) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const canvasRect = this.correspondenceCanvas.getBoundingClientRect();

    // Calculate positions relative to canvas
    const x1 = sourceRect.right - canvasRect.left;
    const y1 = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
    const x2 = targetRect.left - canvasRect.left;
    const y2 = targetRect.top + targetRect.height / 2 - canvasRect.top;

    // Determine line style based on status and selection
    const isSelected =
      pair.sourceId === this.selectedSourceId ||
      pair.targetId === this.selectedTargetId;
    const isHovered =
      pair.sourceId === this.hoveredSourceId ||
      pair.targetId === this.hoveredTargetId;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (isSelected) {
      ctx.strokeStyle = 'rgba(var(--review-color-primary-rgb), 0.8)';
      ctx.lineWidth = 2;
    } else if (isHovered) {
      ctx.strokeStyle = 'rgba(var(--review-color-primary-rgb), 0.5)';
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = this.getLineColorForStatus(pair.status);
      ctx.lineWidth = 1;
    }

    ctx.stroke();
  }

  /**
   * Get line color based on translation status
   */
  private getLineColorForStatus(status: string): string {
    const colors: Record<string, string> = {
      'auto-translated': 'rgba(var(--review-color-primary-rgb), 0.2)',
      manual: 'rgba(var(--review-color-success-rgb), 0.3)',
      edited: 'rgba(var(--review-color-warning-rgb), 0.3)',
      'out-of-sync': 'rgba(var(--review-color-danger-rgb), 0.3)',
      synced: 'rgba(var(--review-color-success-rgb), 0.2)',
    };
    return colors[status] || 'rgba(128, 128, 128, 0.2)';
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
   * Get the underlying DOM element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.sourcePane = null;
    this.targetPane = null;
    this.correspondenceCanvas = null;
    this.document = null;
  }
}
