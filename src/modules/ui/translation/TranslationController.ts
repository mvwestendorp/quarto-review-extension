/**
 * TranslationController
 * Coordinates TranslationView, TranslationToolbar, and Translation Module
 */

import { createModuleLogger } from '@utils/debug';
import { TranslationView } from './TranslationView';
import { TranslationToolbar } from './TranslationToolbar';
import { TranslationModule } from '@modules/translation';
import type { TranslationConfig, Language } from '@modules/translation/types';

const logger = createModuleLogger('TranslationController');

export interface TranslationControllerConfig {
  container: HTMLElement;
  translationConfig: TranslationConfig;
  onNotification?: (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error'
  ) => void;
}

export class TranslationController {
  private config: TranslationControllerConfig;
  private translationModule: TranslationModule;
  private view: TranslationView | null = null;
  private toolbar: TranslationToolbar | null = null;
  private container: HTMLElement;

  // State
  private selectedSourceSentenceId: string | null = null;
  private selectedTargetSentenceId: string | null = null;

  constructor(config: TranslationControllerConfig) {
    this.config = config;
    this.container = config.container;

    // Initialize translation module
    this.translationModule = new TranslationModule(config.translationConfig);

    logger.info('TranslationController initialized', {
      sourceLanguage: config.translationConfig.sourceLanguage,
      targetLanguage: config.translationConfig.targetLanguage,
    });
  }

  /**
   * Initialize the translation UI
   */
  async initialize(sourceText: string): Promise<void> {
    logger.info('Initializing translation UI', {
      textLength: sourceText.length,
    });

    try {
      // Initialize translation module with source text
      await this.translationModule.initialize(sourceText);

      // Create toolbar
      this.createToolbar();

      // Create view
      this.createView();

      // Load initial document into view
      const document = this.translationModule.getDocument();
      if (document) {
        this.view?.loadDocument(document);
      }

      // Subscribe to translation module updates
      this.translationModule.subscribe(() => {
        this.handleTranslationUpdate();
      });

      this.showNotification('Translation module initialized', 'success');
    } catch (error) {
      logger.error('Failed to initialize translation UI', error);
      this.showNotification('Failed to initialize translation module', 'error');
      throw error;
    }
  }

  /**
   * Create the toolbar
   */
  private createToolbar(): void {
    const providers = this.translationModule.getAvailableProviders();
    const config = this.config.translationConfig;

    this.toolbar = new TranslationToolbar(
      {
        availableProviders: providers,
        defaultProvider: config.defaultProvider,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        availableLanguages: ['en', 'nl', 'fr'],
      },
      {
        onTranslateDocument: () => this.translateDocument(),
        onTranslateSentence: () => this.translateSelected(),
        onProviderChange: (provider) => this.changeProvider(provider),
        onSourceLanguageChange: (lang) => this.changeSourceLanguage(lang),
        onTargetLanguageChange: (lang) => this.changeTargetLanguage(lang),
        onSwapLanguages: () => this.swapLanguages(),
        onToggleAutoTranslate: (enabled) => this.toggleAutoTranslate(enabled),
        onToggleCorrespondenceLines: (enabled) =>
          this.toggleCorrespondenceLines(enabled),
      }
    );

    const toolbarElement = this.toolbar.create();
    this.container.appendChild(toolbarElement);
  }

  /**
   * Create the view
   */
  private createView(): void {
    const config = this.config.translationConfig;

    this.view = new TranslationView(
      {
        showCorrespondenceLines: config.showCorrespondenceLines,
        highlightOnHover: config.highlightOnHover,
      },
      {
        onSourceSentenceClick: (id) => this.handleSourceSentenceClick(id),
        onTargetSentenceClick: (id) => this.handleTargetSentenceClick(id),
        onSourceSentenceEdit: (id, content) =>
          this.handleSourceSentenceEdit(id, content),
        onTargetSentenceEdit: (id, content) =>
          this.handleTargetSentenceEdit(id, content),
      }
    );

    const viewElement = this.view.create();
    this.container.appendChild(viewElement);
  }

  /**
   * Translate the entire document
   */
  private async translateDocument(): Promise<void> {
    logger.info('Translating document');

    this.toolbar?.setTranslating(true, 'Translating document...');

    try {
      await this.translationModule.translateDocument((progress) => {
        this.toolbar?.setTranslating(
          true,
          `Translating... ${Math.round(progress * 100)}%`
        );
      });

      this.showNotification('Document translated successfully', 'success');
    } catch (error) {
      logger.error('Translation failed', error);
      this.showNotification('Translation failed', 'error');
    } finally {
      this.toolbar?.setTranslating(false);
    }
  }

  /**
   * Translate selected sentence
   */
  private async translateSelected(): Promise<void> {
    if (!this.selectedSourceSentenceId) {
      this.showNotification('Please select a sentence first', 'warning');
      return;
    }

    logger.info('Translating selected sentence', {
      sentenceId: this.selectedSourceSentenceId,
    });

    this.toolbar?.setTranslating(true, 'Translating sentence...');

    try {
      await this.translationModule.translateSentence(
        this.selectedSourceSentenceId
      );
      this.showNotification('Sentence translated successfully', 'success');
    } catch (error) {
      logger.error('Sentence translation failed', error);
      this.showNotification('Sentence translation failed', 'error');
    } finally {
      this.toolbar?.setTranslating(false);
    }
  }

  /**
   * Change translation provider
   */
  private changeProvider(provider: string): void {
    logger.info('Changing provider', { provider });
    // Provider change is handled by the translation module via config
    this.config.translationConfig.defaultProvider = provider;
  }

  /**
   * Change source language
   */
  private async changeSourceLanguage(language: Language): Promise<void> {
    logger.info('Changing source language', { language });

    this.config.translationConfig.sourceLanguage = language;

    // Reinitialize with new language
    const document = this.translationModule.getDocument();
    if (document) {
      // Would need to re-segment with new language
      this.showNotification(`Source language changed to ${language}`, 'info');
    }
  }

  /**
   * Change target language
   */
  private async changeTargetLanguage(language: Language): Promise<void> {
    logger.info('Changing target language', { language });

    this.config.translationConfig.targetLanguage = language;

    // Reinitialize with new language
    this.showNotification(`Target language changed to ${language}`, 'info');
  }

  /**
   * Swap source and target languages
   */
  private swapLanguages(): void {
    const { sourceLanguage, targetLanguage } = this.config.translationConfig;

    logger.info('Swapping languages', {
      from: sourceLanguage,
      to: targetLanguage,
    });

    this.config.translationConfig.sourceLanguage = targetLanguage;
    this.config.translationConfig.targetLanguage = sourceLanguage;

    this.toolbar?.updateLanguages(targetLanguage, sourceLanguage);

    this.showNotification('Languages swapped', 'info');
  }

  /**
   * Toggle auto-translate on edit
   */
  private toggleAutoTranslate(enabled: boolean): void {
    logger.info('Toggling auto-translate', { enabled });
    this.config.translationConfig.autoTranslateOnEdit = enabled;
  }

  /**
   * Toggle correspondence lines
   */
  private toggleCorrespondenceLines(enabled: boolean): void {
    logger.info('Toggling correspondence lines', { enabled });
    this.config.translationConfig.showCorrespondenceLines = enabled;
    this.view?.refresh();
  }

  /**
   * Handle source sentence click
   */
  private handleSourceSentenceClick(sentenceId: string): void {
    this.selectedSourceSentenceId = sentenceId;
    logger.debug('Source sentence selected', { sentenceId });
  }

  /**
   * Handle target sentence click
   */
  private handleTargetSentenceClick(sentenceId: string): void {
    this.selectedTargetSentenceId = sentenceId;
    logger.debug('Target sentence selected', { sentenceId });
  }

  /**
   * Handle source sentence edit
   */
  private async handleSourceSentenceEdit(
    sentenceId: string,
    newContent: string
  ): Promise<void> {
    logger.info('Source sentence edited', { sentenceId, newContent });

    try {
      await this.translationModule.updateSentence(sentenceId, newContent, true);
      this.showNotification('Source sentence updated', 'success');

      // Auto-retranslate if enabled
      if (this.config.translationConfig.autoTranslateOnEdit) {
        await this.translationModule.translateSentence(sentenceId);
        this.showNotification('Translation updated', 'success');
      }
    } catch (error) {
      logger.error('Failed to update source sentence', error);
      this.showNotification('Failed to update sentence', 'error');
    }
  }

  /**
   * Handle target sentence edit
   */
  private async handleTargetSentenceEdit(
    sentenceId: string,
    newContent: string
  ): Promise<void> {
    logger.info('Target sentence edited', { sentenceId, newContent });

    try {
      await this.translationModule.updateSentence(
        sentenceId,
        newContent,
        false
      );
      this.showNotification('Target sentence updated', 'success');
    } catch (error) {
      logger.error('Failed to update target sentence', error);
      this.showNotification('Failed to update sentence', 'error');
    }
  }

  /**
   * Handle translation module updates
   */
  private handleTranslationUpdate(): void {
    logger.debug('Translation module updated');

    // Refresh view with updated document
    const document = this.translationModule.getDocument();
    if (document && this.view) {
      this.view.loadDocument(document);
    }
  }

  /**
   * Get translation statistics
   */
  getStatistics() {
    return this.translationModule.getStatistics();
  }

  /**
   * Export translated document
   */
  async exportTranslation(): Promise<string> {
    const document = this.translationModule.getDocument();
    if (!document) {
      throw new Error('No document to export');
    }

    // Export logic would go here
    // For now, just return the target sentences joined
    return document.targetSentences.map((s) => s.content).join(' ');
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

    this.view?.destroy();
    this.toolbar?.destroy();
    this.translationModule.destroy();

    this.view = null;
    this.toolbar = null;
  }
}
