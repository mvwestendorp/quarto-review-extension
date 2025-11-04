import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('MainSidebar');

interface TranslationSidebarProgress {
  phase: 'idle' | 'running' | 'success' | 'error';
  message: string;
  percent?: number;
}

/**
 * MainSidebar manages the persistent main toolbar displayed beside the document.
 * It renders the undo/redo controls, tracked changes toggle, comment entry point,
 * and communicates user intent back to the orchestrating UIModule.
 */
export class MainSidebar {
  private element: HTMLElement | null = null;
  private undoBtn: HTMLButtonElement | null = null;
  private redoBtn: HTMLButtonElement | null = null;
  private trackedChangesToggle: HTMLInputElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private unsavedIndicator: HTMLElement | null = null;
  private exportCleanBtn: HTMLButtonElement | null = null;
  private exportCriticBtn: HTMLButtonElement | null = null;
  private submitReviewBtn: HTMLButtonElement | null = null;
  private readonly submitReviewLabel = '🚀 Submit Review';
  private submitReviewEnabled = false;
  private submitReviewPending = false;
  private translationBtn: HTMLButtonElement | null = null;
  private translationEnabled = false;
  private translationMode = false;

  // Translation tools elements
  private translationToolsSection: HTMLElement | null = null;
  private translateDocumentBtn: HTMLButtonElement | null = null;
  private translateSentenceBtn: HTMLButtonElement | null = null;
  private providerSelector: HTMLSelectElement | null = null;
  private sourceLanguageSelector: HTMLSelectElement | null = null;
  private targetLanguageSelector: HTMLSelectElement | null = null;
  private swapLanguagesBtn: HTMLButtonElement | null = null;
  private autoTranslateToggle: HTMLInputElement | null = null;
  private translationExportUnifiedBtn: HTMLButtonElement | null = null;
  private translationExportSeparatedBtn: HTMLButtonElement | null = null;
  private exitTranslationBtn: HTMLButtonElement | null = null;
  private clearModelCacheBtn: HTMLButtonElement | null = null;
  private translationProgressContainer: HTMLElement | null = null;
  private translationProgressBar: HTMLElement | null = null;
  private translationProgressText: HTMLElement | null = null;
  private translationBusy = false;
  private translateDocumentDefaultLabel = 'Translate Document';
  private translateSentenceDefaultLabel = 'Translate Selected';

  // Review tools elements
  private actionsSection: HTMLElement | null = null;
  private viewSection: HTMLElement | null = null;
  private reviewExportSection: HTMLElement | null = null;
  private reviewTranslationSection: HTMLElement | null = null;
  private sidebarTitle: HTMLElement | null = null;

  private onUndoCallback: (() => void) | null = null;
  private onRedoCallback: (() => void) | null = null;
  private onTranslationUndoCallback: (() => void) | null = null;
  private onTranslationRedoCallback: (() => void) | null = null;
  private onTrackedChangesCallback: ((enabled: boolean) => void) | null = null;
  private onToggleSidebarCallback: (() => void) | null = null;
  private onClearDraftsCallback: (() => void) | null = null;
  private onExportCleanCallback: (() => void) | null = null;
  private onExportCriticCallback: (() => void) | null = null;
  private onSubmitReviewCallback: (() => void) | null = null;
  private onToggleTranslationCallback: (() => void) | null = null;

  // Translation tools callbacks
  private onTranslateDocumentCallback: (() => void) | null = null;
  private onTranslateSentenceCallback: (() => void) | null = null;
  private onProviderChangeCallback: ((provider: string) => void) | null = null;
  private onSourceLanguageChangeCallback: ((lang: string) => void) | null =
    null;
  private onTargetLanguageChangeCallback: ((lang: string) => void) | null =
    null;
  private onSwapLanguagesCallback: (() => void) | null = null;
  private onAutoTranslateChangeCallback: ((enabled: boolean) => void) | null =
    null;
  private onTranslationExportUnifiedCallback: (() => void) | null = null;
  private onTranslationExportSeparatedCallback: (() => void) | null = null;
  private onClearLocalModelCacheCallback: (() => void) | null = null;

  /**
   * Lazily create (or return) the sidebar element.
   */
  create(): HTMLElement {
    if (this.element) {
      return this.element;
    }

    const container = document.createElement('div');
    container.className = 'review-toolbar review-persistent-sidebar';
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', 'Review tools');

    const header = document.createElement('div');
    header.className = 'review-sidebar-header';
    header.setAttribute('data-sidebar-label', 'Review');

    this.sidebarTitle = document.createElement('h3');
    this.sidebarTitle.textContent = 'Review Tools';
    header.appendChild(this.sidebarTitle);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'review-btn review-btn-icon';
    this.toggleBtn.setAttribute('data-action', 'toggle-sidebar');
    this.toggleBtn.setAttribute('title', 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-label', 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    this.toggleBtn.setAttribute('aria-label', 'Toggle sidebar visibility');

    const chevron = document.createElement('span');
    chevron.className = 'review-icon-chevron';
    chevron.textContent = '‹';
    this.toggleBtn.appendChild(chevron);

    this.toggleBtn.addEventListener('click', () => {
      this.onToggleSidebarCallback?.();
    });
    header.appendChild(this.toggleBtn);

    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'review-sidebar-body';

    // Actions section (undo/redo)
    this.actionsSection = document.createElement('div');
    this.actionsSection.className = 'review-sidebar-section';
    const actionsSection = this.actionsSection;

    const actionsTitle = document.createElement('h4');
    actionsTitle.textContent = 'Actions';
    actionsSection.appendChild(actionsTitle);

    this.undoBtn = document.createElement('button');
    this.undoBtn.className = 'review-btn review-btn-secondary review-btn-block';
    this.undoBtn.setAttribute('data-action', 'undo');
    this.undoBtn.setAttribute('title', 'Undo (Ctrl+Z)');
    this.undoBtn.setAttribute('aria-label', 'Undo (Ctrl+Z)');
    this.undoBtn.textContent = '↶ Undo';
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener('click', () => {
      this.onUndoCallback?.();
    });
    actionsSection.appendChild(this.undoBtn);

    this.redoBtn = document.createElement('button');
    this.redoBtn.className = 'review-btn review-btn-secondary review-btn-block';
    this.redoBtn.setAttribute('data-action', 'redo');
    this.redoBtn.setAttribute('title', 'Redo (Ctrl+Y)');
    this.redoBtn.setAttribute('aria-label', 'Redo (Ctrl+Y)');
    this.redoBtn.textContent = '↷ Redo';
    this.redoBtn.disabled = true;
    this.redoBtn.addEventListener('click', () => {
      this.onRedoCallback?.();
    });
    actionsSection.appendChild(this.redoBtn);

    body.appendChild(actionsSection);

    // View section (tracked changes)
    this.viewSection = document.createElement('div');
    this.viewSection.className = 'review-sidebar-section';
    const viewSection = this.viewSection;

    const viewTitle = document.createElement('h4');
    viewTitle.textContent = 'View';
    viewSection.appendChild(viewTitle);

    const trackedLabel = document.createElement('label');
    trackedLabel.className = 'review-checkbox-label';

    this.trackedChangesToggle = document.createElement('input');
    this.trackedChangesToggle.type = 'checkbox';
    this.trackedChangesToggle.setAttribute(
      'data-action',
      'toggle-tracked-changes'
    );
    this.trackedChangesToggle.setAttribute(
      'aria-label',
      'Show tracked changes'
    );
    this.trackedChangesToggle.className = 'review-sidebar-checkbox';
    this.trackedChangesToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      this.onTrackedChangesCallback?.(target.checked);
    });
    trackedLabel.appendChild(this.trackedChangesToggle);

    const trackedText = document.createElement('span');
    trackedText.className = 'review-sidebar-label-text';
    trackedText.textContent = 'Show tracked changes';
    trackedLabel.appendChild(trackedText);

    viewSection.appendChild(trackedLabel);
    body.appendChild(viewSection);

    this.reviewExportSection = document.createElement('div');
    this.reviewExportSection.className = 'review-sidebar-section';
    const exportSection = this.reviewExportSection;

    const exportTitle = document.createElement('h4');
    exportTitle.textContent = 'Export';
    exportSection.appendChild(exportTitle);

    this.exportCleanBtn = document.createElement('button');
    this.exportCleanBtn.className =
      'review-btn review-btn-primary review-btn-block';
    this.exportCleanBtn.setAttribute('data-action', 'export-qmd-clean');
    this.exportCleanBtn.setAttribute(
      'title',
      'Export QMD with accepted changes applied'
    );
    this.exportCleanBtn.setAttribute(
      'aria-label',
      'Export QMD with accepted changes applied'
    );
    this.exportCleanBtn.textContent = '🗂 Export Clean QMD';
    this.exportCleanBtn.disabled = true;
    this.exportCleanBtn.addEventListener('click', () => {
      this.onExportCleanCallback?.();
    });
    exportSection.appendChild(this.exportCleanBtn);

    this.exportCriticBtn = document.createElement('button');
    this.exportCriticBtn.className =
      'review-btn review-btn-secondary review-btn-block';
    this.exportCriticBtn.setAttribute('data-action', 'export-qmd-critic');
    this.exportCriticBtn.setAttribute(
      'title',
      'Export QMD with CriticMarkup annotations'
    );
    this.exportCriticBtn.setAttribute(
      'aria-label',
      'Export QMD with CriticMarkup annotations'
    );
    this.exportCriticBtn.textContent = '📝 Export with CriticMarkup';
    this.exportCriticBtn.disabled = true;
    this.exportCriticBtn.addEventListener('click', () => {
      this.onExportCriticCallback?.();
    });
    exportSection.appendChild(this.exportCriticBtn);

    this.submitReviewBtn = document.createElement('button');
    this.submitReviewBtn.className =
      'review-btn review-btn-primary review-btn-block';
    this.submitReviewBtn.setAttribute('data-action', 'submit-review');
    this.submitReviewBtn.setAttribute(
      'title',
      'Submit review changes to the configured Git provider'
    );
    this.submitReviewBtn.setAttribute(
      'aria-label',
      'Submit review changes to the configured Git provider'
    );
    this.submitReviewBtn.textContent = this.submitReviewLabel;
    this.submitReviewBtn.disabled = true;
    this.submitReviewBtn.addEventListener('click', () => {
      this.onSubmitReviewCallback?.();
    });
    exportSection.appendChild(this.submitReviewBtn);

    body.appendChild(exportSection);
    this.updateExportButtonStates();
    this.updateSubmitReviewButtonState();

    // Comments section hint
    const commentsSection = document.createElement('div');
    commentsSection.className = 'review-sidebar-section';

    const commentsTitle = document.createElement('h4');
    commentsTitle.textContent = 'Comments';
    commentsSection.appendChild(commentsTitle);

    const commentsInfo = document.createElement('p');
    commentsInfo.className = 'review-help-text';
    commentsInfo.textContent =
      'Open the comments panel to browse feedback and respond inline.';
    commentsSection.appendChild(commentsInfo);

    // body.appendChild(commentsSection);

    // Review Translation section (toggle button to enter translation mode)
    this.reviewTranslationSection = document.createElement('div');
    this.reviewTranslationSection.className = 'review-sidebar-section';
    const translationSection = this.reviewTranslationSection;

    const translationTitle = document.createElement('h4');
    translationTitle.textContent = 'Translation';
    translationSection.appendChild(translationTitle);

    this.translationBtn = document.createElement('button');
    this.translationBtn.className =
      'review-btn review-btn-secondary review-btn-block';
    this.translationBtn.setAttribute('data-action', 'toggle-translation');
    this.translationBtn.setAttribute(
      'title',
      'Open translation UI for document translation'
    );
    this.translationBtn.setAttribute('aria-label', 'Toggle translation UI');
    this.translationBtn.textContent = '🌐 Open Translation';
    this.translationBtn.disabled = true;
    this.translationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    translationSection.appendChild(this.translationBtn);

    body.appendChild(translationSection);

    const storageSection = document.createElement('div');
    storageSection.className = 'review-sidebar-section';

    const storageTitle = document.createElement('h4');
    storageTitle.textContent = 'Storage';
    storageSection.appendChild(storageTitle);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'review-btn review-btn-danger review-btn-block';
    clearBtn.setAttribute('data-action', 'clear-local-drafts');
    clearBtn.textContent = 'Clear local drafts';
    clearBtn.addEventListener('click', () => {
      this.onClearDraftsCallback?.();
    });
    storageSection.appendChild(clearBtn);

    body.appendChild(storageSection);

    // Translation Tools section (hidden by default, shown in translation mode)
    this.translationToolsSection = this.createTranslationToolsSection();
    this.translationToolsSection.style.display = 'none';
    body.appendChild(this.translationToolsSection);

    // Help section (static guidance)
    const helpSection = document.createElement('div');
    helpSection.className = 'review-sidebar-section review-sidebar-help';
    helpSection.innerHTML = `
      <h4>Help</h4>
      <p class="review-help-text">
        <strong>Click</strong> a section for quick actions<br>
        <strong>Double-click</strong> to edit text<br>
        <strong>💬 badge</strong> to review comments
      </p>
    `;
    //body.appendChild(helpSection);

    container.appendChild(body);

    this.element = container;
    logger.debug('Main sidebar created');
    return container;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  updateUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (this.undoBtn) {
      this.undoBtn.disabled = !canUndo;
      this.undoBtn.classList.toggle('review-btn-disabled', !canUndo);
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = !canRedo;
      this.redoBtn.classList.toggle('review-btn-disabled', !canRedo);
    }
    logger.debug('Undo/redo state updated', { canUndo, canRedo });
  }

  setTrackedChangesVisible(visible: boolean): void {
    if (this.trackedChangesToggle) {
      this.trackedChangesToggle.checked = visible;
      const label = this.trackedChangesToggle.closest('.review-checkbox-label');
      label?.classList.toggle('review-checkbox-active', visible);
    }
    logger.debug('Tracked changes visibility set', { visible });
  }

  getTrackedChangesEnabled(): boolean {
    return this.trackedChangesToggle?.checked ?? false;
  }

  private updateExportButtonStates(): void {
    const cleanEnabled = typeof this.onExportCleanCallback === 'function';
    if (this.exportCleanBtn) {
      this.exportCleanBtn.disabled = !cleanEnabled;
      this.exportCleanBtn.classList.toggle(
        'review-btn-disabled',
        !cleanEnabled
      );
    }

    const criticEnabled = typeof this.onExportCriticCallback === 'function';
    if (this.exportCriticBtn) {
      this.exportCriticBtn.disabled = !criticEnabled;
      this.exportCriticBtn.classList.toggle(
        'review-btn-disabled',
        !criticEnabled
      );
    }
  }

  private updateSubmitReviewButtonState(): void {
    if (!this.submitReviewBtn) return;
    const hasHandler = typeof this.onSubmitReviewCallback === 'function';
    const canClick =
      hasHandler && this.submitReviewEnabled && !this.submitReviewPending;
    this.submitReviewBtn.disabled = !canClick;
    this.submitReviewBtn.classList.toggle('review-btn-disabled', !canClick);
  }

  onUndo(callback: () => void): void {
    this.onUndoCallback = callback;
  }

  onRedo(callback: () => void): void {
    this.onRedoCallback = callback;
  }

  onTrackedChangesToggle(callback: (enabled: boolean) => void): void {
    this.onTrackedChangesCallback = callback;
  }

  onToggleSidebar(callback: () => void): void {
    this.onToggleSidebarCallback = callback;
  }

  onClearDrafts(callback: () => void): void {
    this.onClearDraftsCallback = callback;
  }

  onExportClean(callback?: () => void): void {
    this.onExportCleanCallback = callback ?? null;
    this.updateExportButtonStates();
  }

  onExportCritic(callback?: () => void): void {
    this.onExportCriticCallback = callback ?? null;
    this.updateExportButtonStates();
  }

  onSubmitReview(callback?: () => void): void {
    this.onSubmitReviewCallback = callback ?? null;
    this.submitReviewEnabled = Boolean(callback);
    this.updateSubmitReviewButtonState();
  }

  setSubmitReviewEnabled(enabled: boolean): void {
    this.submitReviewEnabled = enabled;
    this.updateSubmitReviewButtonState();
  }

  setSubmitReviewPending(pending: boolean): void {
    if (!this.submitReviewBtn) return;
    this.submitReviewPending = pending;
    if (pending) {
      this.submitReviewBtn.dataset.loading = 'true';
      this.submitReviewBtn.textContent = 'Submitting…';
    } else {
      delete this.submitReviewBtn.dataset.loading;
      this.submitReviewBtn.textContent = this.submitReviewLabel;
    }
    this.updateSubmitReviewButtonState();
  }

  onToggleTranslation(callback?: () => void): void {
    this.onToggleTranslationCallback = callback ?? null;
    this.translationEnabled = Boolean(callback);
    this.updateTranslationButtonState();
  }

  setTranslationEnabled(enabled: boolean): void {
    this.translationEnabled = enabled;
    this.updateTranslationButtonState();
  }

  setTranslationActive(active: boolean): void {
    if (!this.translationBtn) return;

    if (active) {
      this.translationBtn.textContent = '🌐 Close Translation';
      this.translationBtn.setAttribute('title', 'Close translation UI');
      this.translationBtn.classList.add('review-btn-active');
    } else {
      this.translationBtn.textContent = '🌐 Open Translation';
      this.translationBtn.setAttribute(
        'title',
        'Open translation UI for document translation'
      );
      this.translationBtn.classList.remove('review-btn-active');
    }
  }

  private updateTranslationButtonState(): void {
    if (!this.translationBtn) return;
    const hasHandler = typeof this.onToggleTranslationCallback === 'function';
    const canClick = hasHandler && this.translationEnabled;
    this.translationBtn.disabled = !canClick;
    this.translationBtn.classList.toggle('review-btn-disabled', !canClick);
  }

  private updateTranslationActionState(): void {
    const inMode = this.translationMode;
    const busy = this.translationBusy;

    const canTranslateDocument =
      Boolean(this.onTranslateDocumentCallback) && inMode && !busy;
    if (this.translateDocumentBtn) {
      this.translateDocumentBtn.disabled = !canTranslateDocument;
      this.translateDocumentBtn.classList.toggle(
        'review-btn-disabled',
        !canTranslateDocument
      );
    }

    const canTranslateSentence =
      Boolean(this.onTranslateSentenceCallback) && inMode && !busy;
    if (this.translateSentenceBtn) {
      this.translateSentenceBtn.disabled = !canTranslateSentence;
      this.translateSentenceBtn.classList.toggle(
        'review-btn-disabled',
        !canTranslateSentence
      );
    }

    const canExportUnified =
      Boolean(this.onTranslationExportUnifiedCallback) && inMode && !busy;
    if (this.translationExportUnifiedBtn) {
      this.translationExportUnifiedBtn.disabled = !canExportUnified;
      this.translationExportUnifiedBtn.classList.toggle(
        'review-btn-disabled',
        !canExportUnified
      );
    }

    const canExportSeparated =
      Boolean(this.onTranslationExportSeparatedCallback) && inMode && !busy;
    if (this.translationExportSeparatedBtn) {
      this.translationExportSeparatedBtn.disabled = !canExportSeparated;
      this.translationExportSeparatedBtn.classList.toggle(
        'review-btn-disabled',
        !canExportSeparated
      );
    }

    const providerEnabled =
      Boolean(this.onProviderChangeCallback) && inMode && !busy;
    if (this.providerSelector) {
      this.providerSelector.disabled = !providerEnabled;
    }

    const sourceLangEnabled =
      Boolean(this.onSourceLanguageChangeCallback) && inMode && !busy;
    if (this.sourceLanguageSelector) {
      this.sourceLanguageSelector.disabled = !sourceLangEnabled;
    }

    const targetLangEnabled =
      Boolean(this.onTargetLanguageChangeCallback) && inMode && !busy;
    if (this.targetLanguageSelector) {
      this.targetLanguageSelector.disabled = !targetLangEnabled;
    }

    const swapEnabled =
      Boolean(this.onSwapLanguagesCallback) && inMode && !busy;
    if (this.swapLanguagesBtn) {
      this.swapLanguagesBtn.disabled = !swapEnabled;
      this.swapLanguagesBtn.classList.toggle(
        'review-btn-disabled',
        !swapEnabled
      );
    }

    const autoTranslateEnabled =
      Boolean(this.onAutoTranslateChangeCallback) && inMode && !busy;
    if (this.autoTranslateToggle) {
      this.autoTranslateToggle.disabled = !autoTranslateEnabled;
    }

    const canClearCache = Boolean(this.onClearLocalModelCacheCallback) && !busy;
    if (this.clearModelCacheBtn) {
      this.clearModelCacheBtn.disabled = !canClearCache;
      this.clearModelCacheBtn.classList.toggle(
        'review-btn-disabled',
        !canClearCache
      );
    }
  }

  /**
   * Set translation mode - shows/hides translation tools section
   */
  setTranslationMode(active: boolean): void {
    this.translationMode = active;

    // Update sidebar title
    if (this.sidebarTitle) {
      this.sidebarTitle.textContent = active
        ? 'Translation Tools'
        : 'Review Tools';
    }

    // Show/hide review tools
    if (this.actionsSection) {
      this.actionsSection.style.display = active ? 'none' : '';
    }
    if (this.viewSection) {
      this.viewSection.style.display = active ? 'none' : '';
    }
    if (this.reviewExportSection) {
      this.reviewExportSection.style.display = active ? 'none' : '';
    }
    if (this.reviewTranslationSection) {
      this.reviewTranslationSection.style.display = active ? 'none' : '';
    }

    // Show/hide translation tools
    if (this.translationToolsSection) {
      this.translationToolsSection.style.display = active ? '' : 'none';
    }

    // Update undo/redo buttons based on mode
    if (active && this.undoBtn && this.redoBtn) {
      // In translation mode, use translation-specific undo/redo
      this.undoBtn.textContent = '↶ Undo Edit';
      this.redoBtn.textContent = '↷ Redo Edit';
      this.undoBtn.onclick = () => {
        this.onTranslationUndoCallback?.();
      };
      this.redoBtn.onclick = () => {
        this.onTranslationRedoCallback?.();
      };
    } else if (!active && this.undoBtn && this.redoBtn) {
      // Back to review mode
      this.undoBtn.textContent = '↶ Undo';
      this.redoBtn.textContent = '↷ Redo';
      this.undoBtn.onclick = () => {
        this.onUndoCallback?.();
      };
      this.redoBtn.onclick = () => {
        this.onRedoCallback?.();
      };
    }

    if (!active) {
      this.translationBusy = false;
      this.setTranslationProgress({ phase: 'idle', message: '' });
    }

    this.updateTranslationActionState();

    logger.debug('Translation mode set', { active });
  }

  setTranslationBusy(busy: boolean): void {
    if (this.translationBusy === busy) {
      return;
    }

    this.translationBusy = busy;

    if (this.translateDocumentBtn) {
      this.translateDocumentBtn.textContent = busy
        ? 'Translating…'
        : this.translateDocumentDefaultLabel;
    }

    if (this.translateSentenceBtn) {
      this.translateSentenceBtn.textContent = busy
        ? 'Translating…'
        : this.translateSentenceDefaultLabel;
    }

    this.updateTranslationActionState();
  }

  setTranslationProgress(status: TranslationSidebarProgress): void {
    if (
      !this.translationProgressContainer ||
      !this.translationProgressBar ||
      !this.translationProgressText
    ) {
      return;
    }

    if (status.phase === 'idle') {
      this.translationProgressContainer.style.display = 'none';
      this.translationProgressContainer.removeAttribute('data-phase');
      this.translationProgressBar.style.width = '0%';
      this.translationProgressText.textContent = '';
      return;
    }

    const percent =
      typeof status.percent === 'number'
        ? Math.max(0, Math.min(100, status.percent))
        : null;

    this.translationProgressContainer.style.display = '';
    this.translationProgressContainer.setAttribute('data-phase', status.phase);

    if (percent !== null) {
      this.translationProgressBar.style.width = `${percent}%`;
    } else if (status.phase === 'success') {
      this.translationProgressBar.style.width = '100%';
    } else {
      this.translationProgressBar.style.width = '15%';
    }

    this.translationProgressText.textContent =
      status.message || (status.phase === 'running' ? 'Translating…' : '');
  }

  /**
   * Register callback for translation undo
   */
  onTranslationUndo(callback?: () => void): void {
    this.onTranslationUndoCallback = callback ?? null;
  }

  /**
   * Register callback for translation redo
   */
  onTranslationRedo(callback?: () => void): void {
    this.onTranslationRedoCallback = callback ?? null;
  }

  /**
   * Update translation undo/redo state
   */
  updateTranslationUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (!this.translationMode) {
      return;
    }

    if (this.undoBtn) {
      this.undoBtn.disabled = !canUndo;
      this.undoBtn.classList.toggle('review-btn-disabled', !canUndo);
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = !canRedo;
      this.redoBtn.classList.toggle('review-btn-disabled', !canRedo);
    }
    logger.debug('Translation undo/redo state updated', { canUndo, canRedo });
  }

  /**
   * Register callback for translate document button
   */
  onTranslateDocument(callback?: () => void): void {
    this.onTranslateDocumentCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for translate selected sentence button
   */
  onTranslateSentence(callback?: () => void): void {
    this.onTranslateSentenceCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for provider change
   */
  onProviderChange(callback?: (provider: string) => void): void {
    this.onProviderChangeCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for source language change
   */
  onSourceLanguageChange(callback?: (lang: string) => void): void {
    this.onSourceLanguageChangeCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for target language change
   */
  onTargetLanguageChange(callback?: (lang: string) => void): void {
    this.onTargetLanguageChangeCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for swap languages button
   */
  onSwapLanguages(callback?: () => void): void {
    this.onSwapLanguagesCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for auto-translate toggle
   */
  onAutoTranslateChange(callback?: (enabled: boolean) => void): void {
    this.onAutoTranslateChangeCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for translation export unified
   */
  onTranslationExportUnified(callback?: () => void): void {
    this.onTranslationExportUnifiedCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Register callback for translation export separated
   */
  onTranslationExportSeparated(callback?: () => void): void {
    this.onTranslationExportSeparatedCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  onClearLocalModelCache(callback?: () => void): void {
    this.onClearLocalModelCacheCallback = callback ?? null;
    this.updateTranslationActionState();
  }

  /**
   * Update translation provider dropdown
   */
  updateTranslationProviders(providers: string[]): void {
    if (!this.providerSelector) return;
    this.providerSelector.innerHTML = '';
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider;
      this.providerSelector!.appendChild(option);
    });
    this.updateTranslationActionState();
  }

  /**
   * Update translation languages
   */
  updateTranslationLanguages(
    sourceLanguages: string[],
    targetLanguages: string[]
  ): void {
    if (this.sourceLanguageSelector) {
      this.sourceLanguageSelector.innerHTML = '';
      sourceLanguages.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.toUpperCase();
        this.sourceLanguageSelector!.appendChild(option);
      });
    }

    if (this.targetLanguageSelector) {
      this.targetLanguageSelector.innerHTML = '';
      targetLanguages.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.toUpperCase();
        this.targetLanguageSelector!.appendChild(option);
      });
    }

    this.updateTranslationActionState();
  }

  /**
   * Set auto-translate toggle state
   */
  setAutoTranslateEnabled(enabled: boolean): void {
    if (this.autoTranslateToggle) {
      this.autoTranslateToggle.checked = enabled;
      const label = this.autoTranslateToggle.closest('.review-checkbox-label');
      label?.classList.toggle('review-checkbox-active', enabled);
    }
  }

  /**
   * Update the toggle button to reflect the collapsed state managed by UIModule.
   */
  setCollapsed(collapsed: boolean): void {
    if (!this.toggleBtn) return;
    const chevron = this.toggleBtn.querySelector('.review-icon-chevron');
    if (chevron) {
      chevron.textContent = collapsed ? '›' : '‹';
    }
    this.toggleBtn.setAttribute(
      'title',
      collapsed ? 'Expand sidebar' : 'Collapse sidebar'
    );
    this.toggleBtn.setAttribute(
      'aria-label',
      collapsed ? 'Expand sidebar' : 'Collapse sidebar'
    );
    this.toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  setHasUnsavedChanges(hasUnsaved: boolean): void {
    if (!this.element) {
      return;
    }
    if (hasUnsaved) {
      if (!this.unsavedIndicator) {
        const indicator = document.createElement('div');
        indicator.className = 'review-unsaved-indicator';
        indicator.setAttribute('title', 'Unsaved changes');
        this.element.appendChild(indicator);
        this.unsavedIndicator = indicator;
      }
    } else {
      this.unsavedIndicator?.remove();
      this.unsavedIndicator = null;
    }
  }

  /**
   * Create translation tools section (shown in translation mode)
   */
  private createTranslationToolsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'review-sidebar-section';
    section.setAttribute('data-section', 'translation-tools');

    // Title
    const title = document.createElement('h4');
    title.textContent = 'Translation Tools';
    section.appendChild(title);

    // Translate buttons
    const translateActionsDiv = document.createElement('div');
    translateActionsDiv.style.marginBottom = '12px';

    this.translateDocumentBtn = document.createElement('button');
    this.translateDocumentBtn.className =
      'review-btn review-btn-primary review-btn-block';
    this.translateDocumentBtn.setAttribute('data-action', 'translate-document');
    this.translateDocumentBtn.setAttribute(
      'title',
      'Translate entire document (Ctrl+T)'
    );
    this.translateDocumentBtn.setAttribute(
      'aria-label',
      'Translate entire document'
    );
    this.translateDocumentBtn.textContent = 'Translate Document';
    this.translateDocumentBtn.disabled = true;
    this.translateDocumentBtn.addEventListener('click', () => {
      this.onTranslateDocumentCallback?.();
    });
    translateActionsDiv.appendChild(this.translateDocumentBtn);

    this.translateSentenceBtn = document.createElement('button');
    this.translateSentenceBtn.className =
      'review-btn review-btn-secondary review-btn-block';
    this.translateSentenceBtn.setAttribute('data-action', 'translate-sentence');
    this.translateSentenceBtn.setAttribute(
      'title',
      'Translate selected sentence (Ctrl+Shift+T)'
    );
    this.translateSentenceBtn.setAttribute(
      'aria-label',
      'Translate selected sentence'
    );
    this.translateSentenceBtn.textContent = 'Translate Selected';
    this.translateSentenceBtn.disabled = true;
    this.translateSentenceBtn.addEventListener('click', () => {
      this.onTranslateSentenceCallback?.();
    });
    translateActionsDiv.appendChild(this.translateSentenceBtn);

    this.translateDocumentDefaultLabel =
      this.translateDocumentBtn.textContent ??
      this.translateDocumentDefaultLabel;
    this.translateSentenceDefaultLabel =
      this.translateSentenceBtn.textContent ??
      this.translateSentenceDefaultLabel;

    section.appendChild(translateActionsDiv);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'review-translation-progress-container';
    progressContainer.style.display = 'none';
    progressContainer.setAttribute('aria-live', 'polite');
    progressContainer.innerHTML = `
      <div class="review-translation-progress-track">
        <div class="review-translation-progress-bar"></div>
      </div>
      <div class="review-translation-progress-text"></div>
    `;

    this.translationProgressContainer = progressContainer;
    this.translationProgressBar = progressContainer.querySelector(
      '.review-translation-progress-bar'
    ) as HTMLElement | null;
    this.translationProgressText = progressContainer.querySelector(
      '.review-translation-progress-text'
    ) as HTMLElement | null;

    section.appendChild(progressContainer);

    // Provider selector
    const providerDiv = document.createElement('div');
    providerDiv.style.marginBottom = '12px';

    const providerLabel = document.createElement('label');
    providerLabel.className = 'review-label';
    providerLabel.htmlFor = 'translation-provider-select';
    providerLabel.textContent = 'Provider:';
    providerLabel.style.display = 'block';
    providerLabel.style.marginBottom = '4px';
    providerDiv.appendChild(providerLabel);

    this.providerSelector = document.createElement('select');
    this.providerSelector.id = 'translation-provider-select';
    this.providerSelector.className = 'review-select';
    this.providerSelector.style.width = '100%';
    this.providerSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onProviderChangeCallback?.(target.value);
    });
    providerDiv.appendChild(this.providerSelector);

    section.appendChild(providerDiv);

    // Language selectors
    const languagesDiv = document.createElement('div');
    languagesDiv.style.marginBottom = '12px';

    const sourceLabel = document.createElement('label');
    sourceLabel.className = 'review-label';
    sourceLabel.htmlFor = 'translation-source-lang-select';
    sourceLabel.textContent = 'Source Language:';
    sourceLabel.style.display = 'block';
    sourceLabel.style.marginBottom = '4px';
    languagesDiv.appendChild(sourceLabel);

    this.sourceLanguageSelector = document.createElement('select');
    this.sourceLanguageSelector.id = 'translation-source-lang-select';
    this.sourceLanguageSelector.className = 'review-select';
    this.sourceLanguageSelector.style.width = '100%';
    this.sourceLanguageSelector.style.marginBottom = '8px';
    this.sourceLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onSourceLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.sourceLanguageSelector);

    const targetLabel = document.createElement('label');
    targetLabel.className = 'review-label';
    targetLabel.htmlFor = 'translation-target-lang-select';
    targetLabel.textContent = 'Target Language:';
    targetLabel.style.display = 'block';
    targetLabel.style.marginBottom = '4px';
    languagesDiv.appendChild(targetLabel);

    this.targetLanguageSelector = document.createElement('select');
    this.targetLanguageSelector.id = 'translation-target-lang-select';
    this.targetLanguageSelector.className = 'review-select';
    this.targetLanguageSelector.style.width = '100%';
    this.targetLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onTargetLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.targetLanguageSelector);

    this.swapLanguagesBtn = document.createElement('button');
    this.swapLanguagesBtn.className =
      'review-btn review-btn-secondary review-btn-sm review-btn-block';
    this.swapLanguagesBtn.setAttribute('data-action', 'swap-languages');
    this.swapLanguagesBtn.setAttribute(
      'title',
      'Swap source and target languages (Ctrl+Alt+S)'
    );
    this.swapLanguagesBtn.setAttribute(
      'aria-label',
      'Swap source and target languages'
    );
    this.swapLanguagesBtn.textContent = 'Swap Languages';
    this.swapLanguagesBtn.style.marginTop = '6px';
    this.swapLanguagesBtn.addEventListener('click', () => {
      this.onSwapLanguagesCallback?.();
    });
    languagesDiv.appendChild(this.swapLanguagesBtn);

    section.appendChild(languagesDiv);

    // Settings
    const settingsDiv = document.createElement('div');
    settingsDiv.style.marginBottom = '12px';

    const autoTranslateLabel = document.createElement('label');
    autoTranslateLabel.className = 'review-checkbox-label';

    this.autoTranslateToggle = document.createElement('input');
    this.autoTranslateToggle.type = 'checkbox';
    this.autoTranslateToggle.setAttribute(
      'data-action',
      'toggle-auto-translate'
    );
    this.autoTranslateToggle.setAttribute(
      'aria-label',
      'Auto-translate on edit'
    );
    this.autoTranslateToggle.className = 'review-sidebar-checkbox';
    this.autoTranslateToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.onAutoTranslateChangeCallback?.(target.checked);
    });
    autoTranslateLabel.appendChild(this.autoTranslateToggle);

    const autoTranslateText = document.createElement('span');
    autoTranslateText.className = 'review-sidebar-label-text';
    autoTranslateText.textContent = 'Auto-translate on edit';
    autoTranslateLabel.appendChild(autoTranslateText);

    settingsDiv.appendChild(autoTranslateLabel);

    section.appendChild(settingsDiv);

    // Export buttons (translation-specific)
    const translationExportDiv = document.createElement('div');
    translationExportDiv.style.marginBottom = '12px';

    this.translationExportUnifiedBtn = document.createElement('button');
    this.translationExportUnifiedBtn.className =
      'review-btn review-btn-primary review-btn-block review-btn-sm';
    this.translationExportUnifiedBtn.setAttribute(
      'data-action',
      'export-translation-unified'
    );
    this.translationExportUnifiedBtn.setAttribute(
      'title',
      'Export unified translation'
    );
    this.translationExportUnifiedBtn.setAttribute(
      'aria-label',
      'Export unified translation'
    );
    this.translationExportUnifiedBtn.textContent = 'Export Unified';
    this.translationExportUnifiedBtn.disabled = true;
    this.translationExportUnifiedBtn.addEventListener('click', () => {
      this.onTranslationExportUnifiedCallback?.();
    });
    translationExportDiv.appendChild(this.translationExportUnifiedBtn);

    this.translationExportSeparatedBtn = document.createElement('button');
    this.translationExportSeparatedBtn.className =
      'review-btn review-btn-secondary review-btn-block review-btn-sm';
    this.translationExportSeparatedBtn.setAttribute(
      'data-action',
      'export-translation-separated'
    );
    this.translationExportSeparatedBtn.setAttribute(
      'title',
      'Export separated translation'
    );
    this.translationExportSeparatedBtn.setAttribute(
      'aria-label',
      'Export separated translation'
    );
    this.translationExportSeparatedBtn.textContent = 'Export Separated';
    this.translationExportSeparatedBtn.disabled = true;
    this.translationExportSeparatedBtn.addEventListener('click', () => {
      this.onTranslationExportSeparatedCallback?.();
    });
    translationExportDiv.appendChild(this.translationExportSeparatedBtn);

    section.appendChild(translationExportDiv);

    this.clearModelCacheBtn = document.createElement('button');
    this.clearModelCacheBtn.className =
      'review-btn review-btn-secondary review-btn-block review-btn-sm';
    this.clearModelCacheBtn.setAttribute(
      'data-action',
      'clear-local-model-cache'
    );
    this.clearModelCacheBtn.setAttribute(
      'title',
      'Clear cached local translation models'
    );
    this.clearModelCacheBtn.setAttribute(
      'aria-label',
      'Clear cached local translation models'
    );
    this.clearModelCacheBtn.textContent = 'Clear Local Model Cache';
    this.clearModelCacheBtn.disabled = true;
    this.clearModelCacheBtn.addEventListener('click', () => {
      this.onClearLocalModelCacheCallback?.();
    });
    section.appendChild(this.clearModelCacheBtn);

    // Exit translation mode button
    this.exitTranslationBtn = document.createElement('button');
    this.exitTranslationBtn.className =
      'review-btn review-btn-danger review-btn-block';
    this.exitTranslationBtn.setAttribute('data-action', 'exit-translation');
    this.exitTranslationBtn.setAttribute(
      'title',
      'Exit translation mode and merge changes'
    );
    this.exitTranslationBtn.setAttribute('aria-label', 'Exit translation mode');
    this.exitTranslationBtn.textContent = 'Exit Translation';
    this.exitTranslationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    section.appendChild(this.exitTranslationBtn);

    this.updateTranslationActionState();

    return section;
  }

  destroy(): void {
    this.element?.remove();
    this.element = null;
    this.undoBtn = null;
    this.redoBtn = null;
    this.trackedChangesToggle = null;
    this.toggleBtn = null;
    this.exportCleanBtn = null;
    this.exportCriticBtn = null;
    this.submitReviewBtn = null;
    this.translationBtn = null;
    this.unsavedIndicator = null;
    this.translationToolsSection = null;
    this.translateDocumentBtn = null;
    this.translateSentenceBtn = null;
    this.providerSelector = null;
    this.sourceLanguageSelector = null;
    this.targetLanguageSelector = null;
    this.swapLanguagesBtn = null;
    this.autoTranslateToggle = null;
    this.translationExportUnifiedBtn = null;
    this.translationExportSeparatedBtn = null;
    this.exitTranslationBtn = null;
    this.clearModelCacheBtn = null;
    this.translationProgressContainer = null;
    this.translationProgressBar = null;
    this.translationProgressText = null;
    this.translationBusy = false;
    this.onUndoCallback = null;
    this.onRedoCallback = null;
    this.onTrackedChangesCallback = null;
    this.onToggleSidebarCallback = null;
    this.onClearDraftsCallback = null;
    this.onExportCleanCallback = null;
    this.onExportCriticCallback = null;
    this.onSubmitReviewCallback = null;
    this.onToggleTranslationCallback = null;
    this.onTranslateDocumentCallback = null;
    this.onTranslateSentenceCallback = null;
    this.onProviderChangeCallback = null;
    this.onSourceLanguageChangeCallback = null;
    this.onTargetLanguageChangeCallback = null;
    this.onSwapLanguagesCallback = null;
    this.onAutoTranslateChangeCallback = null;
    this.onTranslationExportUnifiedCallback = null;
    this.onTranslationExportSeparatedCallback = null;
    this.onClearLocalModelCacheCallback = null;
  }
}
