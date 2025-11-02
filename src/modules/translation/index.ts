/**
 * Translation Module
 * Main entry point for translation functionality
 */

import { SentenceSegmenter } from './sentence-segmenter';
import { TranslationEngine } from './translation-engine';
import { CorrespondenceMapper } from './correspondence-mapper';
import { TranslationState } from './storage/TranslationState';
import { TranslationPersistence } from './storage/TranslationPersistence';
import { createModuleLogger } from '@utils/debug';
import type {
  TranslationModuleConfig,
  Sentence,
  TranslationProgress,
  TranslationDocument,
} from './types';

const logger = createModuleLogger('TranslationModule');

export * from './types';
export * from './export';

export class TranslationModule {
  private segmenter: SentenceSegmenter;
  private engine: TranslationEngine;
  private mapper: CorrespondenceMapper;
  private state: TranslationState;
  private persistence: TranslationPersistence | null = null;
  private config: TranslationModuleConfig;
  private progressCallback?: (progress: TranslationProgress) => void;
  private autoSaveEnabled = true;
  private autoSaveInterval: ReturnType<typeof setTimeout> | null = null;
  private sourceContentHash: string | null = null;

  constructor(
    config: TranslationModuleConfig,
    private enablePersistence = true,
    private autoSaveIntervalMs = 30000 // 30 seconds
  ) {
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

    // Initialize persistence if enabled
    if (this.enablePersistence) {
      this.setupPersistence();
    }
  }

  /**
   * Set up persistence and auto-save
   */
  private setupPersistence(): void {
    // Generate a document ID based on the document elements
    const documentElements = this.config.changes.getCurrentState() as Array<{
      id: string;
    }>;
    const documentHash = documentElements.map((el) => el.id).join('-');
    const docId = `doc-${documentHash}-${this.config.config.sourceLanguage}-${this.config.config.targetLanguage}`;

    this.persistence = new TranslationPersistence(docId);

    // Subscribe to state changes for auto-save
    this.state.subscribe(() => {
      if (this.autoSaveEnabled && this.persistence) {
        this.scheduleAutoSave();
      }
    });

    logger.info('Translation persistence initialized', { docId });
  }

  /**
   * Schedule auto-save with debouncing
   */
  private scheduleAutoSave(): void {
    // Clear existing timer
    if (this.autoSaveInterval) {
      clearTimeout(this.autoSaveInterval);
    }

    // Schedule new save
    this.autoSaveInterval = setTimeout(() => {
      this.saveToStorage();
    }, this.autoSaveIntervalMs);
  }

  /**
   * Save current state to storage
   */
  private saveToStorage(): void {
    if (!this.persistence) return;

    const doc = this.state.getDocument();
    if (doc) {
      this.persistence.saveDocument(doc);
      logger.debug('Translation auto-saved to storage');
    }
  }

  /**
   * Restore translation from storage if available
   */
  async restoreFromStorage(): Promise<boolean> {
    if (!this.persistence) return false;

    const savedDoc = this.persistence.loadDocument();
    if (!savedDoc) return false;

    try {
      // Check if saved document matches current language settings
      if (
        savedDoc.metadata.sourceLanguage !==
          this.config.config.sourceLanguage ||
        savedDoc.metadata.targetLanguage !== this.config.config.targetLanguage
      ) {
        logger.warn(
          'Saved translation language settings do not match current config'
        );
        return false;
      }

      // Initialize state with saved document data
      this.state.initialize(savedDoc.sourceSentences);

      // Restore target sentences
      if (savedDoc.targetSentences.length > 0) {
        this.state.addTargetSentences(savedDoc.targetSentences);
      }

      // Restore correspondence pairs
      savedDoc.correspondenceMap.pairs.forEach((pair) => {
        this.state.addTranslationPair(pair);
      });

      logger.info('Translation restored from storage', {
        documentId: savedDoc.id,
        sentenceCount: savedDoc.sourceSentences.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to restore translation from storage', error);
      return false;
    }
  }

  /**
   * Enable/disable auto-save
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    if (!enabled && this.autoSaveInterval) {
      clearTimeout(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Manually save to storage
   */
  saveToStorageNow(): void {
    this.saveToStorage();
  }

  /**
   * Clear stored translation
   */
  clearStoredTranslation(): void {
    if (this.persistence) {
      this.persistence.clearDocument();
      logger.info('Stored translation cleared');
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
    const elements = this.config.changes.getCurrentState() as Array<{
      id: string;
      content: string;
    }>;

    // Capture source content hash for out-of-sync detection
    this.sourceContentHash = this.computeSourceHash(elements);
    logger.debug('Source content hash captured', {
      hash: this.sourceContentHash,
      elementCount: elements.length,
    });

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
    const targetSentences: Sentence[] = translatedTexts.reduce<Sentence[]>(
      (accumulator, text, index) => {
        const sourceSentence = doc.sourceSentences[index];
        if (!sourceSentence) {
          return accumulator;
        }

        const translated = text ?? '';
        const targetSentence: Sentence = {
          id: `trans-${sourceSentence.id}`,
          elementId: sourceSentence.elementId,
          content: translated,
          language: this.config.config.targetLanguage,
          startOffset: 0,
          endOffset: translated.length,
          hash: this.hashContent(translated),
        };

        accumulator.push(targetSentence);
        return accumulator;
      },
      []
    );

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

    const targetSentenceId = `trans-${sentence.id}`;

    // Check if target sentence already exists
    const existingTarget = doc.targetSentences.find(
      (s) => s.id === targetSentenceId
    );

    if (existingTarget) {
      // Update existing target sentence in-place
      this.state.updateSentence(targetSentenceId, translatedText, false);

      // Update the pair status to reflect fresh translation
      const existingPair = doc.correspondenceMap.pairs.find(
        (p) => p.sourceId === sentenceId && p.targetId === targetSentenceId
      );
      if (existingPair) {
        this.state.updatePair(existingPair.id, {
          status: 'synced',
          provider,
          lastModified: Date.now(),
        });
      }
    } else {
      // Create new target sentence
      const targetSentence: Sentence = {
        id: targetSentenceId,
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
    // Clean up auto-save
    if (this.autoSaveInterval) {
      clearTimeout(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Save before destroying
    this.saveToStorage();

    this.state.reset();
    this.engine.destroy();
  }

  /**
   * Pre-create empty target sentences for all source sentences in manual translation mode
   * This allows users to start editing translations immediately without waiting for automatic translation
   */
  preCreateTargetSentences(): void {
    const doc = this.state.getDocument();
    if (!doc || doc.sourceSentences.length === 0) {
      logger.info('No source sentences to pre-create targets for');
      return;
    }

    // Check if targets already exist (idempotent - don't duplicate)
    if (doc.targetSentences.length > 0) {
      logger.info('Target sentences already exist, skipping pre-creation');
      return;
    }

    logger.info(
      'Pre-creating empty target sentences for manual translation mode',
      {
        sourceCount: doc.sourceSentences.length,
      }
    );

    // Create empty target sentence for each source sentence
    const targetSentences: Sentence[] = doc.sourceSentences.map((source) => {
      const targetSentence: Sentence = {
        id: `trans-${source.id}`,
        elementId: source.elementId,
        content: '',
        language: this.config.config.targetLanguage,
        startOffset: 0,
        endOffset: 0,
        hash: this.hashContent(''),
      };
      return targetSentence;
    });

    // Add all target sentences to state
    this.state.addTargetSentences(targetSentences);

    // Create 1:1 correspondence pairs between source and target sentences
    const pairs = doc.sourceSentences.map((source) => {
      const targetId = `trans-${source.id}`;
      const target = targetSentences.find((t) => t.id === targetId);
      if (!target) {
        throw new Error(`Failed to create target sentence for ${source.id}`);
      }

      return this.mapper.createManualPair(source, target);
    });

    // Add all pairs to state
    pairs.forEach((pair) => {
      this.state.addTranslationPair({
        ...pair,
        status: 'manual',
      });
    });

    logger.info('Target sentences pre-created successfully', {
      targetCount: targetSentences.length,
      pairCount: pairs.length,
    });
  }

  /**
   * Merge translation edits back to review mode
   * Reconstructs element content from translated sentences and returns updates
   */
  mergeToElements(): Map<string, string> {
    const doc = this.state.getDocument();
    if (!doc) {
      logger.warn('No translation document to merge');
      return new Map();
    }

    const elementUpdates = new Map<string, string>();

    // Group target sentences by element ID
    const sentencesByElement = new Map<string, string[]>();

    doc.targetSentences.forEach((sentence) => {
      const elementId = sentence.elementId;
      if (!sentencesByElement.has(elementId)) {
        sentencesByElement.set(elementId, []);
      }
      sentencesByElement.get(elementId)?.push(sentence.content);
    });

    // Reconstruct element content by merging translated sentences
    sentencesByElement.forEach((translatedSentences, elementId) => {
      // Join sentences with double newlines (markdown paragraph separator)
      const mergedContent = translatedSentences.join('\n\n');
      elementUpdates.set(elementId, mergedContent);

      logger.debug('Prepared element merge', {
        elementId,
        sentenceCount: translatedSentences.length,
        contentLength: mergedContent.length,
      });
    });

    logger.info('Translation merge prepared', {
      elementsUpdated: elementUpdates.size,
    });

    return elementUpdates;
  }

  /**
   * Apply merged translation to ChangesModule
   * Converts translation edits into ChangesModule operations
   */
  applyMergeToChanges(
    elementUpdates: Map<string, string>,
    changesModule: typeof this.config.changes
  ): boolean {
    if (elementUpdates.size === 0) {
      logger.info('No translation changes to apply');
      return false;
    }

    try {
      let appliedCount = 0;

      elementUpdates.forEach((newContent, elementId) => {
        const currentElement = changesModule.getElementById(elementId);
        if (!currentElement) {
          logger.warn('Element not found for merge', { elementId });
          return;
        }

        // Only apply if content changed
        if (currentElement.content !== newContent) {
          changesModule.edit(elementId, newContent);
          appliedCount++;

          logger.debug('Applied translation edit to element', {
            elementId,
            oldLength: currentElement.content.length,
            newLength: newContent.length,
          });
        }
      });

      if (appliedCount > 0) {
        logger.info('Translation merge applied', { appliedCount });
        return true;
      }

      logger.info('No content changes detected during merge');
      return false;
    } catch (error) {
      logger.error('Failed to apply translation merge', error);
      return false;
    }
  }

  /**
   * Check if source content has changed since translation was initialized
   */
  hasSourceChanged(): boolean {
    if (!this.sourceContentHash) {
      logger.warn('Source hash not available, cannot detect changes');
      return false;
    }

    try {
      const elements = this.config.changes.getCurrentState() as Array<{
        id: string;
        content: string;
      }>;

      const currentHash = this.computeSourceHash(elements);
      const hasChanged = currentHash !== this.sourceContentHash;

      if (hasChanged) {
        logger.warn(
          'Source content has changed since translation initialization',
          {
            originalHash: this.sourceContentHash,
            currentHash,
          }
        );
      }

      return hasChanged;
    } catch (error) {
      logger.error('Failed to check if source changed', error);
      return false;
    }
  }

  /**
   * Compute hash of all source element content
   */
  private computeSourceHash(
    elements: Array<{ id: string; content: string }>
  ): string {
    // Create a stable hash of all element content
    // Include both IDs and content to detect element reordering
    const combined = elements.map((el) => `${el.id}:${el.content}`).join('|');

    return this.hashContent(combined);
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
