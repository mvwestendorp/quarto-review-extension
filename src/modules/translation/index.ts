/**
 * Translation Module
 * Main entry point for translation functionality
 */

import { SentenceSegmenter } from './sentence-segmenter';
import { TranslationEngine } from './translation-engine';
import { CorrespondenceMapper } from './correspondence-mapper';
import { TranslationState } from './storage/TranslationState';
import type {
  TranslationModuleConfig,
  Sentence,
  TranslationProgress,
  TranslationDocument,
} from './types';

export * from './types';

export class TranslationModule {
  private segmenter: SentenceSegmenter;
  private engine: TranslationEngine;
  private mapper: CorrespondenceMapper;
  private state: TranslationState;
  private config: TranslationModuleConfig;
  private progressCallback?: (progress: TranslationProgress) => void;

  constructor(config: TranslationModuleConfig) {
    this.config = config;

    this.segmenter = new SentenceSegmenter();
    this.engine = new TranslationEngine(config.config);
    this.mapper = new CorrespondenceMapper();
    this.state = new TranslationState(
      config.config.sourceLanguage,
      config.config.targetLanguage
    );

    // Set up progress callback
    if (this.progressCallback) {
      this.engine.setProgressCallback(this.progressCallback);
    }
  }

  /**
   * Set progress callback for translation operations
   */
  setProgressCallback(callback: (progress: TranslationProgress) => void): void {
    this.progressCallback = callback;
    this.engine.setProgressCallback(callback);
  }

  /**
   * Initialize translation for current document
   */
  async initialize(): Promise<void> {
    // Get current document elements from ChangesModule
    const elements = this.config.changes.getCurrentState();

    // Segment all elements into sentences
    const sourceSentences: Sentence[] = [];

    elements.forEach((element) => {
      const sentences = this.segmenter.segmentText(
        element.content,
        this.config.config.sourceLanguage,
        element.id
      );
      sourceSentences.push(...sentences);
    });

    // Initialize state with source sentences
    this.state.initialize(sourceSentences);

    // If auto-translate on load, translate now
    if (this.config.config.autoTranslateOnLoad) {
      await this.translateDocument();
    }
  }

  /**
   * Translate entire document
   */
  async translateDocument(providerName?: string): Promise<void> {
    const doc = this.state.getDocument();
    if (!doc) {
      throw new Error('Translation not initialized');
    }

    this.progressCallback?.({
      stage: 'translating',
      progress: 0,
      message: 'Starting translation...',
    });

    const provider = providerName || this.config.config.defaultProvider;

    // Translate all source sentences
    const sourceTexts = doc.sourceSentences.map((s) => s.content);

    const translatedTexts = await this.engine.translateBatch(
      sourceTexts,
      this.config.config.sourceLanguage,
      this.config.config.targetLanguage,
      provider
    );

    // Create target sentences
    const targetSentences: Sentence[] = translatedTexts.map((text, index) => {
      const sourceSentence = doc.sourceSentences[index];
      return {
        id: `trans-${sourceSentence.id}`,
        elementId: sourceSentence.elementId,
        content: text,
        language: this.config.config.targetLanguage,
        startOffset: 0,
        endOffset: text.length,
        hash: this.hashContent(text),
      };
    });

    // Add target sentences to state
    this.state.addTargetSentences(targetSentences);

    // Create correspondence mapping
    const pairs = this.mapper.createMapping(
      doc.sourceSentences,
      targetSentences,
      'automatic'
    );

    // Add all pairs to state
    pairs.forEach((pair) => {
      this.state.addTranslationPair({
        ...pair,
        provider,
      });
    });

    this.progressCallback?.({
      stage: 'complete',
      progress: 1,
      message: 'Translation complete!',
    });
  }

  /**
   * Translate a single sentence
   */
  async translateSentence(
    sentenceId: string,
    providerName?: string
  ): Promise<void> {
    const doc = this.state.getDocument();
    if (!doc) {
      throw new Error('Translation not initialized');
    }

    const sentence = doc.sourceSentences.find((s) => s.id === sentenceId);
    if (!sentence) {
      throw new Error(`Sentence ${sentenceId} not found`);
    }

    const provider = providerName || this.config.config.defaultProvider;

    const translatedText = await this.engine.translate(
      sentence.content,
      this.config.config.sourceLanguage,
      this.config.config.targetLanguage,
      provider
    );

    // Create target sentence
    const targetSentence: Sentence = {
      id: `trans-${sentence.id}`,
      elementId: sentence.elementId,
      content: translatedText,
      language: this.config.config.targetLanguage,
      startOffset: 0,
      endOffset: translatedText.length,
      hash: this.hashContent(translatedText),
    };

    this.state.addTargetSentences([targetSentence]);

    // Create pair
    const pair = this.mapper.createManualPair(sentence, targetSentence);
    this.state.addTranslationPair({
      ...pair,
      provider,
    });
  }

  /**
   * Update a sentence (source or target)
   */
  updateSentence(
    sentenceId: string,
    newContent: string,
    isSource: boolean
  ): void {
    this.state.updateSentence(sentenceId, newContent, isSource);

    // If auto-translate on edit and this is a source edit
    if (this.config.config.autoTranslateOnEdit && isSource) {
      // Re-translate affected target sentences
      void this.retranslateAffectedSentences(sentenceId);
    }
  }

  /**
   * Re-translate sentences that are out of sync
   */
  async retranslateAffectedSentences(sourceId: string): Promise<void> {
    const targetIds = this.state.getCorrespondingTargets(sourceId);

    if (targetIds.length > 0) {
      await this.translateSentence(sourceId);
    }
  }

  /**
   * Get current translation document
   */
  getDocument(): TranslationDocument | null {
    return this.state.getDocument();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (doc: TranslationDocument) => void): () => void {
    return this.state.subscribe(listener);
  }

  /**
   * Get translation statistics
   */
  getStats(): {
    total: number;
    translated: number;
    manual: number;
    auto: number;
    outOfSync: number;
  } {
    return this.state.getStats();
  }

  /**
   * Get available translation providers
   */
  getAvailableProviders(): string[] {
    return this.engine.getAvailableProviders();
  }

  /**
   * Initialize a specific provider
   */
  async initializeProvider(providerName: string): Promise<void> {
    await this.engine.initializeProvider(providerName);
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(providerName: string): Promise<boolean> {
    return this.engine.isProviderAvailable(providerName);
  }

  /**
   * Reset translation
   */
  reset(): void {
    this.state.reset();
  }

  /**
   * Destroy module
   */
  destroy(): void {
    this.state.reset();
    this.engine.destroy();
  }

  /**
   * Hash content for change detection
   */
  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export default TranslationModule;
