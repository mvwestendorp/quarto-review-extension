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
import { TranslationChangeAdapter } from './changes/TranslationChangeAdapter';
import type {
  TranslationModuleConfig,
  TranslationConfig,
  Sentence,
  TranslationProgress,
  TranslationDocument,
  TranslationPair,
  TranslationSegment,
} from './types';
import type {
  ChangesExtension,
  ChangesExtensionContext,
  ChangesExtensionEvent,
  ExtensionChange,
} from '@modules/changes';
import type {
  TranslationExtensionEvent,
  TranslationEventPayloadMap,
} from './types';

const logger = createModuleLogger('TranslationModule');

export * from './types';
export * from './export';

export class TranslationModule implements ChangesExtension {
  private segmenter: SentenceSegmenter;
  private engine: TranslationEngine;
  private mapper: CorrespondenceMapper;
  private state: TranslationState;
  private persistence: TranslationPersistence | null = null;
  private config: TranslationModuleConfig;
  private changeAdapter: TranslationChangeAdapter;
  private documentId: string;
  private progressCallback?: (progress: TranslationProgress) => void;
  private autoSaveEnabled = true;
  private autoSaveInterval: ReturnType<typeof setTimeout> | null = null;
  private sourceContentHash: string | null = null;
  private extensionDispose: (() => void) | null = null;
  private extensionContext: ChangesExtensionContext | null = null;
  private translationEventHandlers = new Map<
    TranslationExtensionEvent,
    Set<(payload: any) => void>
  >();

  constructor(
    config: TranslationModuleConfig,
    private enablePersistence = true,
    private autoSaveIntervalMs = 30000 // 30 seconds
  ) {
    this.config = config;
    this.documentId = config.documentId ?? this.resolveDocumentId();
    this.changeAdapter = new TranslationChangeAdapter(config.changes);

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

  public get id(): string {
    return 'translation-extension';
  }

  /**
   * Accessor for the current module configuration.
   * Returns a shallow copy so callers can safely derive UI configuration.
   */
  public getModuleConfig(): TranslationModuleConfig {
    return {
      ...this.config,
      config: this.getSettings(),
    };
  }

  /**
   * Retrieve current translation settings.
   * Provider configs are cloned to avoid external mutation of internal state.
   */
  public getSettings(): TranslationConfig {
    const providers = this.config.config.providers ?? {};
    return {
      ...this.config.config,
      providers: {
        ...providers,
        openai: providers.openai ? { ...providers.openai } : undefined,
        google: providers.google ? { ...providers.google } : undefined,
        local: providers.local ? { ...providers.local } : undefined,
      },
    };
  }

  /**
   * Current document identifier used for persistence.
   */
  public getDocumentId(): string {
    return this.documentId;
  }

  private resolveDocumentId(): string {
    if (typeof window !== 'undefined' && window.location) {
      return (
        window.location.pathname + window.location.search + window.location.hash
      );
    }
    return 'unknown-document';
  }

  /**
   * Set up persistence and auto-save
   */
  private setupPersistence(): void {
    if (!TranslationPersistence.isAvailable()) {
      logger.warn(
        'Skipping translation persistence setup: local storage unavailable'
      );
      this.persistence = null;
      return;
    }

    // Generate a document ID based on the document elements
    const documentElements = this.config.changes.getCurrentState() as Array<{
      id: string;
    }>;
    const documentHash = documentElements.map((el) => el.id).join('-');
    const normalizedHash = documentHash.length > 0 ? documentHash : 'empty';
    const docId = `doc-${this.documentId}-${normalizedHash}-${this.config.config.sourceLanguage}-${this.config.config.targetLanguage}`;

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
  async restoreFromStorage(
    expectedSourceSentences?: Sentence[]
  ): Promise<boolean> {
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

      if (
        expectedSourceSentences &&
        !this.areSourceSentencesCompatible(
          savedDoc.sourceSentences,
          expectedSourceSentences
        )
      ) {
        logger.warn(
          'Saved translation source no longer matches current document; skipping restore'
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

      this.emitTranslationEvent('translation:state-updated', {
        document: this.state.getDocument(),
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
    this.registerWithChangesModule();

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

    const restored = await this.restoreFromStorage(sourceSentences);
    if (restored) {
      const restoredDoc = this.state.getDocument();
      logger.debug('Translation initialized from persisted state', {
        sourceCount: restoredDoc?.sourceSentences.length ?? 0,
        targetCount: restoredDoc?.targetSentences.length ?? 0,
      });

      this.emitTranslationEvent('translation:state-updated', {
        document: restoredDoc ?? null,
      });
      return;
    }

    // Initialize state with source sentences
    this.state.initialize(sourceSentences);

    // If auto-translate on load, translate now
    if (this.config.config.autoTranslateOnLoad) {
      await this.translateDocument();
    }

    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
    });
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

    const newTargetSentences: Sentence[] = [];
    const pairsToAdd: TranslationPair[] = [];
    const affectedElements = new Set<string>();

    translatedTexts.forEach((text, index) => {
      const sourceSentence = doc.sourceSentences[index];
      if (!sourceSentence) {
        return;
      }

      const translated = text ?? '';
      const targetSentenceId = `trans-${sourceSentence.id}`;
      const existingTarget = doc.targetSentences.find(
        (s) => s.id === targetSentenceId
      );
      const targetOrder =
        typeof sourceSentence.order === 'number' ? sourceSentence.order : index;

      if (existingTarget) {
        if (typeof existingTarget.order !== 'number') {
          this.state.setSentenceOrder(targetSentenceId, targetOrder);
        }
        this.state.updateSentence(targetSentenceId, translated, false);

        const existingPair = doc.correspondenceMap.pairs.find(
          (p) =>
            p.sourceId === sourceSentence.id && p.targetId === targetSentenceId
        );

        if (existingPair) {
          this.state.updatePair(existingPair.id, {
            status: 'auto-translated',
            provider,
            method: 'automatic',
            targetText: translated,
            isManuallyEdited: false,
          });
        } else {
          const newPair = this.mapper.createMapping(
            [sourceSentence],
            [
              {
                ...existingTarget,
                content: translated,
                endOffset: translated.length,
                hash: this.hashContent(translated),
              },
            ],
            'automatic'
          )[0];

          if (newPair) {
            pairsToAdd.push({
              ...newPair,
              status: 'auto-translated',
              provider,
              method: 'automatic',
              isManuallyEdited: false,
            });
          }
        }
        affectedElements.add(existingTarget.elementId);
      } else {
        const targetSentence: Sentence = {
          id: targetSentenceId,
          elementId: sourceSentence.elementId,
          content: translated,
          language: this.config.config.targetLanguage,
          order: targetOrder,
          startOffset: 0,
          endOffset: translated.length,
          hash: this.hashContent(translated),
        };

        newTargetSentences.push(targetSentence);
        const newPair = this.mapper.createMapping(
          [sourceSentence],
          [targetSentence],
          'automatic'
        )[0];

        if (newPair) {
          pairsToAdd.push({
            ...newPair,
            status: 'auto-translated',
            provider,
            method: 'automatic',
            isManuallyEdited: false,
          });
        }
        affectedElements.add(targetSentence.elementId);
      }
    });

    if (newTargetSentences.length > 0) {
      this.state.addTargetSentences(newTargetSentences);
    }

    pairsToAdd.forEach((pair) => {
      this.state.addTranslationPair(pair);
    });

    const updatedDoc = this.state.getDocument();
    if (updatedDoc) {
      affectedElements.forEach((elementId) => {
        this.syncElementWithChangesModule(elementId, 'target');
      });
    }

    this.progressCallback?.({
      stage: 'complete',
      progress: 1,
      message: 'Translation complete!',
    });

    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
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
    const targetOrder =
      typeof sentence.order === 'number'
        ? sentence.order
        : doc.targetSentences.filter(
            (target) => target.elementId === sentence.elementId
          ).length;

    if (existingTarget) {
      if (typeof existingTarget.order !== 'number') {
        this.state.setSentenceOrder(targetSentenceId, targetOrder);
      }
      // Update existing target sentence in-place
      this.state.updateSentence(targetSentenceId, translatedText, false);

      // Update the pair status to reflect fresh translation
      const existingPair = doc.correspondenceMap.pairs.find(
        (p) => p.sourceId === sentenceId && p.targetId === targetSentenceId
      );
      if (existingPair) {
        this.state.updatePair(existingPair.id, {
          status: 'auto-translated',
          method: 'automatic',
          provider,
          targetText: translatedText,
          isManuallyEdited: false,
          lastModified: Date.now(),
        });
      }
      const updatedDoc = this.state.getDocument();
      if (updatedDoc) {
        this.syncElementWithChangesModule(existingTarget.elementId, 'target');
      }
    } else {
      // Create new target sentence
      const targetSentence: Sentence = {
        id: targetSentenceId,
        elementId: sentence.elementId,
        content: translatedText,
        language: this.config.config.targetLanguage,
        order: targetOrder,
        startOffset: 0,
        endOffset: translatedText.length,
        hash: this.hashContent(translatedText),
      };

      this.state.addTargetSentences([targetSentence]);

      // Create pair
      const pair = this.mapper.createMapping(
        [sentence],
        [targetSentence],
        'automatic'
      )[0];

      if (pair) {
        this.state.addTranslationPair({
          ...pair,
          status: 'auto-translated',
          provider,
          method: 'automatic',
          isManuallyEdited: false,
        });
      }

      const updatedDoc = this.state.getDocument();
      if (updatedDoc) {
        this.syncElementWithChangesModule(targetSentence.elementId, 'target');
      }
    }

    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
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
    logger.debug('Updating sentence', { sentenceId, isSource, newContent });
    this.state.updateSentence(sentenceId, newContent, isSource);

    const doc = this.state.getDocument();
    if (!doc) {
      return;
    }

    if (isSource) {
      const sourceSentence = doc.sourceSentences.find(
        (s) => s.id === sentenceId
      );
      if (sourceSentence) {
        this.syncElementWithChangesModule(sourceSentence.elementId, 'source');
      }

      if (this.config.config.autoTranslateOnEdit) {
        // Re-translate affected target sentences asynchronously
        void this.retranslateAffectedSentences(sentenceId);
      }

      return;
    }

    const pair = doc.correspondenceMap.pairs.find(
      (p) => p.targetId === sentenceId
    );

    if (pair) {
      const trimmed = newContent.trim();
      const status = trimmed.length > 0 ? 'manual' : 'untranslated';
      logger.debug('Updating pair metadata after target edit', {
        pairId: pair.id,
        status,
        trimmedLength: trimmed.length,
      });
      this.state.updatePair(pair.id, {
        status,
        targetText: newContent,
        method: status === 'manual' ? 'manual' : pair.method,
        provider: status === 'manual' ? 'manual' : pair.provider,
        isManuallyEdited: status === 'manual',
      });

      const targetSentence = doc.targetSentences.find(
        (s) => s.id === sentenceId
      );
      if (!targetSentence) {
        return;
      }

      this.syncElementWithChangesModule(targetSentence.elementId, 'target');
    }

    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
    });
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

  getSegments(): TranslationSegment[] {
    return this.state.getSegments();
  }

  getSegmentsForElement(
    elementId: string,
    role?: 'source' | 'target'
  ): TranslationSegment[] {
    return this.state.getSegmentsForElement(elementId, role);
  }

  getTargetSegmentsForSource(sourceId: string): TranslationSegment[] {
    return this.state.getTargetSegmentsForSource(sourceId);
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

    if (this.extensionDispose) {
      this.extensionDispose();
      this.extensionDispose = null;
    }

    this.extensionContext = null;

    this.state.reset();
    this.engine.destroy();

    this.emitTranslationEvent('translation:state-updated', {
      document: null,
    });
  }

  /**
   * Clear cached models for a provider
   */
  clearProviderCache(provider?: string): void {
    this.engine.clearProviderCache(provider);
  }

  private syncElementWithChangesModule(
    elementId: string,
    role: 'source' | 'target'
  ): void {
    if (!elementId) {
      return;
    }

    const segments = this.getSegmentsForElement(elementId, role);

    if (segments.length === 0) {
      logger.debug('No target sentences for element when syncing', {
        elementId,
        role,
      });
      return;
    }

    const mergedContent = this.mergeSegmentsContent(segments);

    if (this.extensionContext) {
      const change: ExtensionChange = {
        type: 'edit',
        elementId,
        newContent: mergedContent,
        source: this.id,
      };

      this.extensionContext.applyChange(change);
    } else {
      this.changeAdapter.applySentenceUpdate({ elementId, segments });
    }

    const document = this.state.getDocument();
    const sentences =
      role === 'source'
        ? (document?.sourceSentences.filter(
            (sentence) => sentence.elementId === elementId
          ) ?? [])
        : (document?.targetSentences.filter(
            (sentence) => sentence.elementId === elementId
          ) ?? []);

    this.emitTranslationEvent('translation:sentence-updated', {
      elementId,
      sentences,
    });
  }

  private mergeSegmentsContent(segments: TranslationSegment[]): string {
    if (segments.length === 0) {
      return '';
    }

    const ordered = [...segments].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.id.localeCompare(b.id);
    });
    return ordered.map((segment) => segment.content).join('\n\n');
  }

  public on<E extends TranslationExtensionEvent>(
    event: E,
    handler: (payload: TranslationEventPayloadMap[E]) => void
  ): () => void {
    if (!this.translationEventHandlers.has(event)) {
      this.translationEventHandlers.set(event, new Set());
    }

    const handlers = this.translationEventHandlers.get(event);
    handlers?.add(handler as unknown as (payload: any) => void);

    return () => {
      handlers?.delete(handler as unknown as (payload: any) => void);
    };
  }

  private emitTranslationEvent<E extends TranslationExtensionEvent>(
    event: E,
    payload: TranslationEventPayloadMap[E]
  ): void {
    this.translationEventHandlers
      .get(event)
      ?.forEach((handler) => handler(payload));

    this.extensionContext?.emit(
      event as ChangesExtensionEvent,
      payload as unknown
    );
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

    const targetSentences: Sentence[] = [];
    const placeholderPairs: TranslationPair[] = [];

    doc.sourceSentences.forEach((source, index) => {
      const targetOrder =
        typeof source.order === 'number' ? source.order : index;
      const targetSentence: Sentence = {
        id: `trans-${source.id}`,
        elementId: source.elementId,
        content: '',
        language: this.config.config.targetLanguage,
        order: targetOrder,
        startOffset: 0,
        endOffset: 0,
        hash: this.hashContent(''),
      };

      targetSentences.push(targetSentence);

      const pair = this.mapper.createManualPair(source, targetSentence);

      if (pair) {
        placeholderPairs.push({
          ...pair,
          status: 'untranslated',
          isManuallyEdited: false,
        });
      }
    });

    this.state.addTargetSentences(targetSentences);
    placeholderPairs.forEach((pair) => this.state.addTranslationPair(pair));

    logger.info('Target sentences pre-created successfully', {
      targetCount: targetSentences.length,
      pairCount: placeholderPairs.length,
    });

    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
    });
  }

  private registerWithChangesModule(): void {
    if (this.extensionDispose) {
      return;
    }

    const changesAny = this.config.changes as unknown as {
      registerExtension?: (extension: ChangesExtension) => () => void;
    };

    if (typeof changesAny.registerExtension !== 'function') {
      logger.debug(
        'ChangesModule does not expose extension registry; skipping translation extension registration'
      );
      return;
    }

    try {
      this.extensionDispose = changesAny.registerExtension(this);
      logger.debug('Translation extension registered with ChangesModule');
    } catch (error) {
      logger.error('Failed to register translation extension', error);
    }
  }

  register(context: ChangesExtensionContext): void {
    this.extensionContext = context;
  }

  dispose(): void {
    this.extensionContext = null;
  }

  /**
   * React to element changes from ChangesModule (extension pattern)
   * When an element is edited, re-segment the content and update internal translation state
   */
  onElementChanged(change: ExtensionChange): void {
    // Ignore changes that originated from this extension (avoid circular updates)
    if (change.type === 'edit' && change.source !== this.id) {
      logger.debug('Element changed externally, updating translation state', {
        elementId: change.elementId,
        contentLength: change.newContent.length,
      });

      this.handleExternalElementEdit(change.elementId, change.newContent);
    }
  }

  /**
   * Handle external element edit (from UI or other modules)
   * Re-segments the content and updates internal translation state
   */
  private handleExternalElementEdit(
    elementId: string,
    newContent: string
  ): void {
    const doc = this.state.getDocument();
    if (!doc) {
      logger.warn('No translation document available for external edit', {
        elementId,
      });
      return;
    }

    // Determine if this is a source or target element
    const isSourceElement = doc.sourceSentences.some(
      (s) => s.elementId === elementId
    );
    const isTargetElement = doc.targetSentences.some(
      (s) => s.elementId === elementId
    );

    if (!isSourceElement && !isTargetElement) {
      logger.warn('Element not found in translation document', { elementId });
      return;
    }

    const language = isSourceElement
      ? this.config.config.sourceLanguage
      : this.config.config.targetLanguage;

    // Re-segment the new content into sentences
    const newSentences = this.segmenter.segmentText(
      newContent,
      language,
      elementId
    );

    logger.debug('Re-segmented element content', {
      elementId,
      oldSentenceCount: isSourceElement
        ? doc.sourceSentences.filter((s) => s.elementId === elementId).length
        : doc.targetSentences.filter((s) => s.elementId === elementId).length,
      newSentenceCount: newSentences.length,
    });

    // Replace sentences for this element in internal state
    if (isSourceElement) {
      this.replaceSourceSentencesForElement(elementId, newSentences);

      // Mark corresponding target sentences as out-of-sync
      this.markTargetSentencesOutOfSync(elementId);
    } else {
      this.replaceTargetSentencesForElement(elementId, newSentences);

      // Update correspondence pairs if needed
      this.updateCorrespondenceForElement(elementId);
    }

    // Emit translation-specific event
    this.emitTranslationEvent('translation:state-updated', {
      document: this.state.getDocument(),
    });
  }

  /**
   * Replace all source sentences for an element
   */
  private replaceSourceSentencesForElement(
    elementId: string,
    newSentences: Sentence[]
  ): void {
    const doc = this.state.getDocument();
    if (!doc) return;

    // Remove all existing source sentences for this element
    const existingSentenceIds = doc.sourceSentences
      .filter((s) => s.elementId === elementId)
      .map((s) => s.id);

    existingSentenceIds.forEach((id) => {
      this.state.removeSentence(id, true);
    });

    // Add new sentences
    this.state.addSourceSentences(newSentences);

    logger.debug('Replaced source sentences for element', {
      elementId,
      removedCount: existingSentenceIds.length,
      addedCount: newSentences.length,
    });
  }

  /**
   * Replace all target sentences for an element
   */
  private replaceTargetSentencesForElement(
    elementId: string,
    newSentences: Sentence[]
  ): void {
    const doc = this.state.getDocument();
    if (!doc) return;

    // Remove all existing target sentences for this element
    const existingSentenceIds = doc.targetSentences
      .filter((s) => s.elementId === elementId)
      .map((s) => s.id);

    existingSentenceIds.forEach((id) => {
      this.state.removeSentence(id, false);
    });

    // Add new sentences
    this.state.addTargetSentences(newSentences);

    logger.debug('Replaced target sentences for element', {
      elementId,
      removedCount: existingSentenceIds.length,
      addedCount: newSentences.length,
    });
  }

  /**
   * Mark target sentences as out-of-sync when source changes
   */
  private markTargetSentencesOutOfSync(sourceElementId: string): void {
    const doc = this.state.getDocument();
    if (!doc) return;

    // Find all pairs that reference this source element
    const affectedPairs = doc.correspondenceMap.pairs.filter((pair) => {
      const sourceSentence = doc.sourceSentences.find(
        (s) => s.id === pair.sourceId
      );
      return sourceSentence?.elementId === sourceElementId;
    });

    affectedPairs.forEach((pair) => {
      this.state.updatePair(pair.id, {
        status: 'out-of-sync',
      });
    });

    logger.debug('Marked target sentences as out-of-sync', {
      sourceElementId,
      affectedPairCount: affectedPairs.length,
    });
  }

  /**
   * Update correspondence for an element after target sentences change
   */
  private updateCorrespondenceForElement(targetElementId: string): void {
    const doc = this.state.getDocument();
    if (!doc) return;

    // Find source sentences that correspond to this target element
    const targetSentences = doc.targetSentences.filter(
      (s) => s.elementId === targetElementId
    );

    // Find existing pairs that reference these target sentences
    const existingPairIds = doc.correspondenceMap.pairs
      .filter((pair) =>
        targetSentences.some((target) => target.id === pair.targetId)
      )
      .map((pair) => pair.id);

    // Update each pair to reflect manual editing
    existingPairIds.forEach((pairId) => {
      const pair = doc.correspondenceMap.pairs.find((p) => p.id === pairId);
      if (pair) {
        const targetSentence = targetSentences.find(
          (s) => s.id === pair.targetId
        );
        if (targetSentence) {
          this.state.updatePair(pairId, {
            status: targetSentence.content.trim() ? 'manual' : 'untranslated',
            method: targetSentence.content.trim() ? 'manual' : pair.method,
            provider: targetSentence.content.trim() ? 'manual' : pair.provider,
            isManuallyEdited: true,
            targetText: targetSentence.content,
          });
        }
      }
    });

    logger.debug('Updated correspondence for element', {
      targetElementId,
      updatedPairCount: existingPairIds.length,
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

    const statusByTargetId = new Map<string, TranslationPair['status']>();
    doc.correspondenceMap.pairs.forEach((pair) => {
      statusByTargetId.set(pair.targetId, pair.status);
    });

    // Group target sentences by element ID
    const sentencesByElement = new Map<
      string,
      { sentences: Sentence[]; meaningfulStatuses: Set<string> }
    >();

    doc.targetSentences.forEach((sentence) => {
      const elementId = sentence.elementId;
      if (!sentencesByElement.has(elementId)) {
        sentencesByElement.set(elementId, {
          sentences: [],
          meaningfulStatuses: new Set<string>(),
        });
      }
      const bucket = sentencesByElement.get(elementId)!;
      bucket.sentences.push(sentence);
      const status = statusByTargetId.get(sentence.id);
      if (status && status !== 'untranslated') {
        bucket.meaningfulStatuses.add(status);
      }
    });

    // Reconstruct element content by merging translated sentences
    sentencesByElement.forEach((data, elementId) => {
      const ordered = [...data.sentences].sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return (a.startOffset ?? 0) - (b.startOffset ?? 0);
      });

      const hasNonEmptyContent = ordered.some(
        (sentence) => sentence.content.trim().length > 0
      );

      if (!hasNonEmptyContent && data.meaningfulStatuses.size === 0) {
        logger.debug(
          'Skipping merge for element without translated content or status',
          { elementId }
        );
        return;
      }

      // Join sentences with double newlines (markdown paragraph separator)
      const mergedContent = ordered.map((s) => s.content).join('\n\n');
      elementUpdates.set(elementId, mergedContent);

      logger.debug('Prepared element merge', {
        elementId,
        sentenceCount: ordered.length,
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

  private areSourceSentencesCompatible(
    saved: Sentence[],
    current: Sentence[]
  ): boolean {
    if (saved.length !== current.length) {
      return false;
    }

    for (const [index, savedSentence] of saved.entries()) {
      const currentSentence = current[index];
      if (!currentSentence) {
        return false;
      }

      if (
        savedSentence.id !== currentSentence.id ||
        savedSentence.elementId !== currentSentence.elementId ||
        savedSentence.content !== currentSentence.content
      ) {
        return false;
      }
    }

    return true;
  }
}

export default TranslationModule;
