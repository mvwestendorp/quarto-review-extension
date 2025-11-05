/**
 * TranslationController
 * Coordinates TranslationView, sidebar integration, and Translation Module
 */

import { createModuleLogger } from '@utils/debug';
import { TranslationView } from './TranslationView';
import { TranslationSettings } from './TranslationSettings';
import { TranslationEditorBridge } from './TranslationEditorBridge';
import {
  TranslationModule,
  TranslationExportService,
} from '@modules/translation';
import { TranslationChangesModule } from '@modules/translation/TranslationChangesModule';
import type {
  TranslationModuleConfig,
  Language,
  TranslationSegment,
} from '@modules/translation/types';
import type { StateStore } from '@/services/StateStore';
import type { TranslationState } from '@modules/ui/shared';

const logger = createModuleLogger('TranslationController');

export interface TranslationControllerConfig {
  container: HTMLElement;
  translationModuleConfig: TranslationModuleConfig;
  onNotification?: (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  onProgressUpdate?: (status: TranslationProgressStatus) => void;
  onBusyChange?: (busy: boolean) => void;
  translationModuleInstance?: TranslationModule;
  stateStore?: StateStore;
}

export interface TranslationProgressStatus {
  phase: 'idle' | 'running' | 'success' | 'error';
  message: string;
  percent?: number;
}

export class TranslationController {
  private config: TranslationControllerConfig;
  private translationModule: TranslationModule;
  private settings: TranslationSettings;
  private exportService: TranslationExportService;
  private changesModule: TranslationChangesModule;
  private editorBridge: TranslationEditorBridge;
  private view: TranslationView | null = null;
  private container: HTMLElement;
  private suppressChangeSync = false;
  private translationEventDisposers: Array<() => void> = [];
  private ownsTranslationModule = false;
  private stateStore: StateStore | null = null;
  private stateStoreUnsubscribe: (() => void) | null = null;

  constructor(config: TranslationControllerConfig) {
    this.config = config;
    this.container = config.container;
    this.settings = new TranslationSettings();

    // Initialize StateStore if provided
    if (config.stateStore) {
      this.stateStore = config.stateStore;
      // Subscribe to translation state changes
      this.stateStoreUnsubscribe = this.stateStore.on<TranslationState>(
        'translation:changed',
        (state: Readonly<TranslationState>) => {
          this.handleStateStoreUpdate(state);
        }
      );
      // Set initial state
      this.stateStore.setTranslationState({
        isActive: false,
      });
    }

    // Load user settings and apply them to the config
    this.applyUserSettings(config.translationModuleConfig);

    // Initialize translation module
    this.translationModule =
      config.translationModuleInstance ??
      new TranslationModule(config.translationModuleConfig);
    this.ownsTranslationModule = !config.translationModuleInstance;

    // Initialize export service
    this.exportService = new TranslationExportService();

    // Initialize changes module for tracking edits
    this.changesModule = new TranslationChangesModule();

    // Initialize editor bridge for Milkdown sentence editing
    this.editorBridge = new TranslationEditorBridge(this.changesModule, {
      showDiffHighlights: false,
      simpleToolbar: true,
    });

    logger.info('TranslationController initialized', {
      sourceLanguage: config.translationModuleConfig.config.sourceLanguage,
      targetLanguage: config.translationModuleConfig.config.targetLanguage,
      userSettings: this.settings.getAll(),
      hasStateStore: Boolean(this.stateStore),
    });
  }

  /**
   * Handle StateStore translation state updates
   */
  private handleStateStoreUpdate(state: Readonly<TranslationState>): void {
    logger.debug('StateStore translation state updated', state);
    // Handle state changes from StateStore if needed
    // For now, this is primarily used for external state updates
  }

  /**
   * Get selected source sentence ID from StateStore or local state
   */
  private getSelectedSourceSentenceId(): string | null {
    if (this.stateStore) {
      return this.stateStore.getTranslationState().selectedSourceSentenceId;
    }
    return null;
  }

  /**
   * Get selected target sentence ID from StateStore or local state
   */
  private getSelectedTargetSentenceId(): string | null {
    if (this.stateStore) {
      return this.stateStore.getTranslationState().selectedTargetSentenceId;
    }
    return null;
  }

  /**
   * Apply saved user settings to the translation module config
   */
  private applyUserSettings(config: TranslationModuleConfig): void {
    const savedSettings = this.settings.getAll();

    if (savedSettings.provider) {
      config.config.defaultProvider = savedSettings.provider;
    }

    if (savedSettings.sourceLanguage) {
      config.config.sourceLanguage = savedSettings.sourceLanguage;
    }

    if (savedSettings.targetLanguage) {
      config.config.targetLanguage = savedSettings.targetLanguage;
    }

    if (savedSettings.autoTranslateOnEdit !== undefined) {
      config.config.autoTranslateOnEdit = savedSettings.autoTranslateOnEdit;
    }

    if (savedSettings.showCorrespondenceLines !== undefined) {
      config.config.showCorrespondenceLines =
        savedSettings.showCorrespondenceLines;
    }

    if (savedSettings.highlightOnHover !== undefined) {
      config.config.highlightOnHover = savedSettings.highlightOnHover;
    }

    logger.debug('User settings applied to translation config', savedSettings);
  }

  /**
   * Initialize the translation UI
   */
  async initialize(): Promise<void> {
    logger.info('Initializing translation UI');

    try {
      // Initialize translation module
      await this.translationModule.initialize();

      this.translationModule.preCreateTargetSentences();

      // Initialize changes module with current sentences
      const document = this.translationModule.getDocument();
      if (document) {
        this.changesModule.initializeSentences([
          ...document.sourceSentences,
          ...document.targetSentences,
        ]);
      }

      // Create view (toolbar is now in sidebar, not here)
      this.createView();

      // Load initial document into view
      if (document) {
        this.view?.loadDocument(document);
      }

      this.notifyProgress({
        phase: 'idle',
        message: 'Translation ready',
      });

      // Subscribe to translation module updates
      const disposeState = this.translationModule.subscribe(() => {
        this.handleTranslationUpdate();
      });
      this.translationEventDisposers.push(disposeState);

      if (typeof (this.translationModule as any).on === 'function') {
        this.translationEventDisposers.push(
          (this.translationModule as any).on(
            'translation:sentence-updated',
            () => this.handleTranslationUpdate()
          )
        );
        this.translationEventDisposers.push(
          (this.translationModule as any).on('translation:state-updated', () =>
            this.handleTranslationUpdate()
          )
        );
      }

      // Subscribe to changes module updates
      const disposeChanges = this.changesModule.subscribe(() => {
        this.handleChangesUpdate();
      });
      this.translationEventDisposers.push(disposeChanges);

      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();

      this.showNotification('Translation module initialized', 'success');
    } catch (error) {
      logger.error('Failed to initialize translation UI', error);
      this.showNotification('Failed to initialize translation module', 'error');
      throw error;
    }
  }

  /**
   * Undo last translation edit
   */
  public canUndo(): boolean {
    return this.changesModule.canUndo();
  }

  /**
   * Redo last undone translation edit
   */
  public canRedo(): boolean {
    return this.changesModule.canRedo();
  }

  /**
   * Perform undo operation
   */
  public undo(): boolean {
    const result = this.changesModule.undo();
    if (result) {
      this.view?.refresh();
      this.showNotification('Translation edit undone', 'info');
    }
    return result;
  }

  /**
   * Perform redo operation
   */
  public redo(): boolean {
    const result = this.changesModule.redo();
    if (result) {
      this.view?.refresh();
      this.showNotification('Translation edit redone', 'info');
    }
    return result;
  }

  /**
   * Handle changes module updates
   */
  private handleChangesUpdate(): void {
    if (this.suppressChangeSync) {
      logger.debug(
        'Skipping change sync while controller applies direct translation update'
      );
      return;
    }

    const segments = this.changesModule.getCurrentState();
    if (segments.length === 0) {
      return;
    }

    const currentSegments = new Map(
      this.translationModule
        .getSegments()
        .map((segment) => [segment.id, segment])
    );

    segments.forEach((segment) => {
      const existing = currentSegments.get(segment.id);
      if (!existing || existing.content === segment.content) {
        return;
      }

      logger.debug('Syncing segment from undo/redo', {
        segmentId: segment.id,
        role: segment.role,
      });

      this.translationModule.updateSentence(
        segment.id,
        segment.content,
        segment.role === 'source'
      );
    });

    this.refreshViewFromState();
  }

  /**
   * Set up keyboard shortcuts for translation operations
   */
  private setupKeyboardShortcuts(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hasPrimaryModifier = e.ctrlKey || e.metaKey;
      if (!hasPrimaryModifier) {
        return;
      }

      const key = e.key.toLowerCase();

      // Ctrl/Cmd+S: Save current sentence when editor is active
      if (!e.altKey && key === 's') {
        if (this.view?.isEditorActive()) {
          e.preventDefault();
          void this.view.saveActiveEditor();
        }
        return;
      }

      // Ctrl/Cmd+Z: Undo translation change (when editor not active)
      if (!e.altKey && key === 'z' && !e.shiftKey) {
        if (this.view?.isEditorActive()) {
          return;
        }
        e.preventDefault();
        void this.undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo translation change
      if (!e.altKey && ((key === 'z' && e.shiftKey) || key === 'y')) {
        if (this.view?.isEditorActive()) {
          return;
        }
        e.preventDefault();
        void this.redo();
        return;
      }

      // Ctrl/Cmd+T: Translate document
      if (!e.altKey && key === 't' && !e.shiftKey) {
        e.preventDefault();
        void this.translateDocument();
        return;
      }

      // Ctrl/Cmd+Shift+T: Translate selected sentence
      if (!e.altKey && key === 't' && e.shiftKey) {
        e.preventDefault();
        void this.translateSentence();
        return;
      }

      // Ctrl+Alt+S or Cmd+Option+S: Swap languages
      if ((e.ctrlKey || e.metaKey) && e.altKey && key === 's') {
        e.preventDefault();
        this.swapLanguages();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Store the listener for cleanup
    (this as any).keydownListener = handleKeyDown;

    logger.info('Keyboard shortcuts registered for translation');
  }

  /**
   * Create the view
   */
  private createView(): void {
    const config = this.config.translationModuleConfig.config;
    const markdown = this.config.translationModuleConfig.markdown;

    this.view = new TranslationView(
      {
        showCorrespondenceLines: config.showCorrespondenceLines,
        highlightOnHover: config.highlightOnHover,
      },
      {
        onSourceSentenceEdit: (sentenceId: string, content: string) =>
          this.handleSourceSentenceEdit(sentenceId, content),
        onTargetSentenceEdit: (sentenceId: string, content: string) =>
          this.handleTargetSentenceEdit(sentenceId, content),
      },
      markdown,
      this.editorBridge,
      this.stateStore || undefined
    );

    const viewElement = this.view.create();
    this.container.appendChild(viewElement);
  }

  /**
   * Get available translation providers
   */
  public getAvailableProviders(): string[] {
    return this.translationModule.getAvailableProviders();
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): string[] {
    const languages = new Set<string>();
    const config = this.config.translationModuleConfig.config;

    languages.add(config.sourceLanguage);
    languages.add(config.targetLanguage);

    const savedSettings = this.settings.getAll();
    if (savedSettings.sourceLanguage) {
      languages.add(savedSettings.sourceLanguage);
    }
    if (savedSettings.targetLanguage) {
      languages.add(savedSettings.targetLanguage);
    }

    const document = this.translationModule.getDocument();
    if (document) {
      languages.add(document.metadata.sourceLanguage);
      languages.add(document.metadata.targetLanguage);
    }

    // Provide a stable default set to keep UI populated
    ['en', 'nl', 'fr'].forEach((lang) => languages.add(lang));

    return Array.from(languages);
  }

  /**
   * Translate the entire document (public method for sidebar integration)
   */
  public async translateDocument(): Promise<void> {
    logger.info('Translating document');

    const affectedSourceIds =
      this.translationModule
        .getDocument()
        ?.sourceSentences.map((sentence) => sentence.id) ?? [];
    this.markSentencesLoading(affectedSourceIds, true);
    this.clearSentenceErrors(affectedSourceIds);
    this.view?.setErrorBanner(null);

    this.setTranslationBusy(true);
    this.notifyProgress({
      phase: 'running',
      message: 'Preparing translation…',
      percent: 0,
    });

    // Set progress callback
    this.translationModule.setProgressCallback((progress) => {
      const percent =
        typeof progress.progress === 'number'
          ? Math.round(progress.progress * 100)
          : undefined;
      this.notifyProgress({
        phase: 'running',
        message: progress.message || 'Translating…',
        percent,
      });
    });

    try {
      await this.translationModule.translateDocument();

      this.showNotification('Document translated successfully', 'success');
      this.notifyProgress({
        phase: 'success',
        message: 'Document translated successfully',
        percent: 100,
      });
      this.view?.setErrorBanner(null);
      this.clearSentenceErrors(affectedSourceIds);
      this.notifyProgress({
        phase: 'idle',
        message: 'Translation ready',
      });
    } catch (error) {
      logger.error('Translation failed', error);
      this.showNotification('Translation failed', 'error');
      const message =
        error instanceof Error
          ? error.message || 'Document translation failed.'
          : 'Document translation failed.';
      this.notifyProgress({
        phase: 'error',
        message,
      });
      this.markSentencesError(affectedSourceIds, message);
      this.view?.setErrorBanner({
        message,
        onRetry: () => {
          void this.translateDocument();
        },
      });
    } finally {
      this.translationModule.setProgressCallback(() => {
        /* noop */
      });
      this.setTranslationBusy(false);
      this.markSentencesLoading(affectedSourceIds, false);
    }
  }

  /**
   * Translate selected sentence (public method for sidebar integration)
   */
  public async translateSentence(): Promise<void> {
    const selectedSourceSentenceId = this.getSelectedSourceSentenceId();
    if (!selectedSourceSentenceId) {
      this.showNotification('Please select a sentence first', 'warning');
      return;
    }

    logger.info('Translating selected sentence', {
      sentenceId: selectedSourceSentenceId,
    });

    const sourceSentenceId = selectedSourceSentenceId;
    this.markSentencesLoading([sourceSentenceId], true);
    this.clearSentenceErrors([sourceSentenceId]);

    this.setTranslationBusy(true);
    this.notifyProgress({
      phase: 'running',
      message: 'Translating selected sentence…',
    });

    try {
      await this.translationModule.translateSentence(sourceSentenceId);
      this.showNotification('Sentence translated successfully', 'success');
      this.notifyProgress({
        phase: 'success',
        message: 'Sentence translated successfully',
      });
      this.view?.setErrorBanner(null);
      this.clearSentenceErrors([sourceSentenceId]);
      this.notifyProgress({
        phase: 'idle',
        message: 'Translation ready',
      });
    } catch (error) {
      logger.error('Sentence translation failed', error);
      this.showNotification('Sentence translation failed', 'error');
      const message =
        error instanceof Error
          ? error.message || 'Sentence translation failed.'
          : 'Sentence translation failed.';
      this.notifyProgress({
        phase: 'error',
        message,
      });
      this.markSentencesError([sourceSentenceId], message);
      this.view?.setErrorBanner({
        message,
        onRetry: () => {
          void this.translateSentence();
        },
      });
    } finally {
      this.setTranslationBusy(false);
      this.markSentencesLoading([sourceSentenceId], false);
    }
  }

  /**
   * Set translation provider (public method for sidebar integration)
   */
  public setProvider(provider: string): void {
    logger.info('Changing provider', { provider });
    this.config.translationModuleConfig.config.defaultProvider = provider;
    this.settings.setSetting('provider', provider);
  }

  /**
   * Set source language (public method for sidebar integration)
   */
  public async setSourceLanguage(language: string): Promise<void> {
    logger.info('Changing source language', { language });

    this.config.translationModuleConfig.config.sourceLanguage =
      language as Language;
    this.settings.setSetting('sourceLanguage', language as Language);

    // Reinitialize with new language
    const document = this.translationModule.getDocument();
    if (document) {
      // Would need to re-segment with new language
      this.showNotification(`Source language changed to ${language}`, 'info');
    }
  }

  /**
   * Set target language (public method for sidebar integration)
   */
  public async setTargetLanguage(language: string): Promise<void> {
    logger.info('Changing target language', { language });

    this.config.translationModuleConfig.config.targetLanguage =
      language as Language;
    this.settings.setSetting('targetLanguage', language as Language);

    // Reinitialize with new language
    this.showNotification(`Target language changed to ${language}`, 'info');
  }

  /**
   * Swap source and target languages (public method for sidebar integration)
   */
  public swapLanguages(): void {
    const { sourceLanguage, targetLanguage } =
      this.config.translationModuleConfig.config;

    logger.info('Swapping languages', {
      from: sourceLanguage,
      to: targetLanguage,
    });

    this.config.translationModuleConfig.config.sourceLanguage = targetLanguage;
    this.config.translationModuleConfig.config.targetLanguage = sourceLanguage;

    // Save both languages to settings
    this.settings.setMultiple({
      sourceLanguage: targetLanguage,
      targetLanguage: sourceLanguage,
    });

    this.showNotification('Languages swapped', 'info');
  }

  /**
   * Set auto-translate on edit (public method for sidebar integration)
   */
  public setAutoTranslate(enabled: boolean): void {
    logger.info('Toggling auto-translate', { enabled });
    this.config.translationModuleConfig.config.autoTranslateOnEdit = enabled;
    this.settings.setSetting('autoTranslateOnEdit', enabled);
  }

  /**
   * Handle translation module updates
   */
  private handleTranslationUpdate(): void {
    logger.debug('Translation module updated');
    const selectedTargetSentenceId = this.getSelectedTargetSentenceId();
    const selectedSourceSentenceId = this.getSelectedSourceSentenceId();

    if (selectedTargetSentenceId) {
      this.view?.queueFocusOnSentence(selectedTargetSentenceId, 'target', {
        scrollIntoView: false,
      });
    } else if (selectedSourceSentenceId) {
      this.view?.queueFocusOnSentence(selectedSourceSentenceId, 'source', {
        scrollIntoView: false,
      });
    }

    this.refreshViewFromState();
  }

  /**
   * Get translation statistics
   */
  getStatistics() {
    return this.translationModule.getStats();
  }

  /**
   * Get the changes module for integration with UI
   */
  getChangesModule(): TranslationChangesModule {
    return this.changesModule;
  }

  getSegments(): TranslationSegment[] {
    return this.translationModule.getSegments();
  }

  getSegmentsForElement(
    elementId: string,
    role?: 'source' | 'target'
  ): TranslationSegment[] {
    return this.translationModule.getSegmentsForElement(elementId, role);
  }

  getTargetSegmentsForSource(sourceId: string): TranslationSegment[] {
    return this.translationModule.getTargetSegmentsForSource(sourceId);
  }

  public focusView(): void {
    this.view?.focusContainer();
  }

  /**
   * Export translated document (unified) - public method for sidebar integration
   */
  public async exportUnified(): Promise<void> {
    await this.exportTranslation('unified');
  }

  /**
   * Export translated document (separated) - public method for sidebar integration
   */
  public async exportSeparated(): Promise<void> {
    await this.exportTranslation('separated');
  }

  /**
   * Export translated document
   */
  private async exportTranslation(
    strategy: 'unified' | 'separated'
  ): Promise<void> {
    const document = this.translationModule.getDocument();
    if (!document) {
      this.showNotification('No translation to export', 'warning');
      return;
    }

    try {
      logger.info('Exporting translation', { strategy });
      const result = await this.exportService.exportTranslation(document, {
        strategy,
        languageMode: strategy === 'unified' ? 'target' : 'both',
      });

      const message =
        result.fileCount === 1
          ? `Exported ${result.filenames[0]}`
          : `Exported ${result.fileCount} files to ${result.downloadedAs}`;
      this.showNotification(message, 'success');
    } catch (error) {
      logger.error('Failed to export translation', error);
      this.showNotification('Failed to export translation', 'error');
    }
  }

  /**
   * Clear cached local translation models
   */
  public async clearLocalModelCache(): Promise<void> {
    try {
      this.translationModule.clearProviderCache('local');
      this.showNotification('Local translation model cache cleared', 'success');
    } catch (error) {
      logger.error('Failed to clear local translation cache', error);
      this.showNotification('Failed to clear local model cache', 'error');
    }
  }

  /**
   * Show notification
   */
  private showNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error'
  ): void {
    this.config.onNotification?.(message, type);
    logger.info('Notification', { message, type });
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    logger.info('Destroying translation controller');

    // Remove keyboard shortcut listener
    const keydownListener = (this as any).keydownListener;
    if (keydownListener) {
      document.removeEventListener('keydown', keydownListener);
      delete (this as any).keydownListener;
    }

    this.view?.destroy();
    this.editorBridge.destroy();

    this.translationEventDisposers.forEach((dispose) => {
      try {
        dispose?.();
      } catch (error) {
        logger.warn('Failed to dispose translation event listener', error);
      }
    });
    this.translationEventDisposers = [];

    // Unsubscribe from StateStore
    if (this.stateStoreUnsubscribe) {
      this.stateStoreUnsubscribe();
      this.stateStoreUnsubscribe = null;
    }

    // Reset translation state in StateStore
    if (this.stateStore) {
      this.stateStore.resetTranslationState();
    }

    if (this.ownsTranslationModule) {
      this.translationModule.destroy();
    }

    this.view = null;
    this.stateStore = null;
  }

  private markSentencesLoading(sourceIds: string[], loading: boolean): void {
    if (sourceIds.length === 0) {
      return;
    }

    sourceIds.forEach((sourceId) => {
      this.view?.setSentenceLoading(sourceId, 'source', loading);
      this.getTargetSegmentIds(sourceId).forEach((targetId) => {
        this.view?.setSentenceLoading(targetId, 'target', loading);
      });
    });
  }

  private markSentencesError(sourceIds: string[], message: string): void {
    if (sourceIds.length === 0) {
      return;
    }

    sourceIds.forEach((sourceId) => {
      this.view?.setSentenceError(sourceId, 'source', message);
      this.getTargetSegmentIds(sourceId).forEach((targetId) => {
        this.view?.setSentenceError(targetId, 'target', message);
      });
    });
  }

  private clearSentenceErrors(sourceIds: string[]): void {
    if (sourceIds.length === 0) {
      return;
    }

    sourceIds.forEach((sourceId) => {
      this.view?.setSentenceError(sourceId, 'source', null);
      this.getTargetSegmentIds(sourceId).forEach((targetId) => {
        this.view?.setSentenceError(targetId, 'target', null);
      });
    });
  }

  private getTargetSegmentIds(sourceId: string): string[] {
    return this.translationModule
      .getTargetSegmentsForSource(sourceId)
      .map((segment) => segment.id);
  }

  private notifyProgress(status: TranslationProgressStatus): void {
    this.view?.setDocumentProgress(status);
    this.config.onProgressUpdate?.(status);

    // Update StateStore with progress status
    if (this.stateStore) {
      this.stateStore.setTranslationState({
        progressPhase: status.phase,
        progressMessage: status.message,
        progressPercent: status.percent,
      });
    }
  }

  private setTranslationBusy(busy: boolean): void {
    this.config.onBusyChange?.(busy);

    // Update StateStore with busy state
    if (this.stateStore) {
      this.stateStore.setTranslationState({
        isBusy: busy,
      });
    }
  }

  private refreshViewFromState(): void {
    const document = this.translationModule.getDocument();
    if (!document) {
      return;
    }

    if (this.view) {
      this.view.loadDocument(document);
    }

    this.changesModule.synchronizeSentences([
      ...document.sourceSentences,
      ...document.targetSentences,
    ]);
    logger.debug('Refresh view from state', {
      targetPreview: document.targetSentences
        .slice(0, 3)
        .map((s) => ({ id: s.id, content: s.content })),
    });
  }

  /**
   * Handle source sentence edit - individual sentence level
   * Called when user edits a single sentence in translation view
   */
  private async handleSourceSentenceEdit(
    sentenceId: string,
    newContent: string
  ): Promise<void> {
    logger.info('Source sentence edited', {
      sentenceId,
      contentLength: newContent.length,
    });

    try {
      // Track the edit operation in TranslationChangesModule
      this.changesModule.editSentence(sentenceId, newContent, 'source');
      // Update internal translation state
      this.translationModule.updateSentence(sentenceId, newContent, true);
      this.translationModule.saveToStorageNow();
      this.showNotification('Source sentence updated', 'success');
      this.refreshViewFromState();

      // Auto-retranslate if enabled
      if (this.config.translationModuleConfig.config.autoTranslateOnEdit) {
        this.clearSentenceErrors([sentenceId]);
        this.markSentencesLoading([sentenceId], true);
        try {
          await this.translationModule.translateSentence(sentenceId);
          this.showNotification('Translation updated', 'success');
          this.refreshViewFromState();
          this.clearSentenceErrors([sentenceId]);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message || 'Sentence translation failed.'
              : 'Sentence translation failed.';
          this.markSentencesError([sentenceId], message);
          this.view?.setErrorBanner({
            message,
            onRetry: () => {
              this.handleSourceSentenceEdit(sentenceId, newContent).catch(
                (err) => {
                  logger.error('Retry translation failed', err);
                }
              );
            },
          });
        } finally {
          this.markSentencesLoading([sentenceId], false);
        }
      }
    } catch (error) {
      logger.error('Failed to update source sentence', error);
      this.showNotification('Failed to update sentence', 'error');
    }
  }

  /**
   * Handle target sentence edit - individual sentence level
   * Called when user edits a single sentence in translation view
   */
  private async handleTargetSentenceEdit(
    sentenceId: string,
    newContent: string
  ): Promise<void> {
    logger.info('Target sentence edited', {
      sentenceId,
      contentLength: newContent.length,
    });

    try {
      // Track the edit operation in TranslationChangesModule
      this.changesModule.editSentence(sentenceId, newContent, 'target');
      // Update internal translation state
      this.translationModule.updateSentence(sentenceId, newContent, false);
      this.translationModule.saveToStorageNow();
      this.showNotification('Target sentence updated', 'success');
      this.refreshViewFromState();
    } catch (error) {
      logger.error('Failed to update target sentence', error);
      this.showNotification('Failed to update sentence', 'error');
    }
  }
}
