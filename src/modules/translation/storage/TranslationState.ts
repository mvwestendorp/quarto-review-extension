/**
 * Translation State Manager
 * Manages the current translation document and notifies listeners of changes
 */

import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
  Language,
  TranslationSegment,
} from '../types';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('TranslationState');

export class TranslationState {
  private document: TranslationDocument | null = null;
  private listeners: Set<(doc: TranslationDocument) => void> = new Set();

  constructor(
    private sourceLanguage: Language,
    private targetLanguage: Language
  ) {}

  /**
   * Initialize with source sentences
   */
  initialize(sourceSentences: Sentence[]): void {
    const orderedSources = this.assignOrder(sourceSentences);
    this.document = {
      id: this.generateDocumentId(),
      sourceSentences: orderedSources,
      targetSentences: [],
      correspondenceMap: {
        pairs: [],
        forwardMapping: new Map(),
        reverseMapping: new Map(),
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
      },
      metadata: {
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalSentences: orderedSources.length,
        translatedCount: 0,
        manualCount: 0,
        autoCount: 0,
      },
    };
  }

  /**
   * Add a translation pair
   */
  addTranslationPair(pair: TranslationPair): void {
    if (!this.document) return;

    const existingIndex = this.document.correspondenceMap.pairs.findIndex(
      (p) => p.id === pair.id
    );

    if (existingIndex >= 0) {
      const previous = this.document.correspondenceMap.pairs[existingIndex];
      if (!previous) {
        return;
      }
      this.adjustMetadataForPair(previous, -1);

      const updatedPair: TranslationPair = {
        ...previous,
        ...pair,
        id: previous.id,
        lastModified: Date.now(),
      };

      this.document.correspondenceMap.pairs[existingIndex] = updatedPair;
      this.adjustMetadataForPair(updatedPair, 1);
      this.document.metadata.lastModified = Date.now();
      this.notifyListeners();
      return;
    }

    this.document.correspondenceMap.pairs.push({
      ...pair,
      lastModified: Date.now(),
    });

    // Update forward mapping
    const existing =
      this.document.correspondenceMap.forwardMapping.get(pair.sourceId) || [];
    if (!existing.includes(pair.targetId)) {
      existing.push(pair.targetId);
    }
    this.document.correspondenceMap.forwardMapping.set(pair.sourceId, existing);

    // Update reverse mapping
    const reverseExisting =
      this.document.correspondenceMap.reverseMapping.get(pair.targetId) || [];
    if (!reverseExisting.includes(pair.sourceId)) {
      reverseExisting.push(pair.sourceId);
    }
    this.document.correspondenceMap.reverseMapping.set(
      pair.targetId,
      reverseExisting
    );

    // Update metadata
    this.document.metadata.lastModified = Date.now();
    this.adjustMetadataForPair(pair, 1);

    this.notifyListeners();
  }

  /**
   * Add target sentences
   */
  addTargetSentences(sentences: Sentence[]): void {
    if (!this.document) return;

    const normalized = this.assignOrder(
      sentences,
      this.document.targetSentences
    );

    normalized.forEach((sentence) => {
      const existingIndex = this.document!.targetSentences.findIndex(
        (s) => s.id === sentence.id
      );

      if (existingIndex >= 0) {
        this.document!.targetSentences[existingIndex] = sentence;
      } else {
        this.document!.targetSentences.push(sentence);
      }
    });

    this.document.metadata.lastModified = Date.now();
    this.notifyListeners();
  }

  /**
   * Add source sentences
   */
  addSourceSentences(sentences: Sentence[]): void {
    if (!this.document) return;

    const normalized = this.assignOrder(
      sentences,
      this.document.sourceSentences
    );

    normalized.forEach((sentence) => {
      const existingIndex = this.document!.sourceSentences.findIndex(
        (s) => s.id === sentence.id
      );

      if (existingIndex >= 0) {
        this.document!.sourceSentences[existingIndex] = sentence;
      } else {
        this.document!.sourceSentences.push(sentence);
      }
    });

    this.document.metadata.lastModified = Date.now();
    this.document.metadata.totalSentences =
      this.document.sourceSentences.length;
    this.notifyListeners();
  }

  /**
   * Remove a sentence from the document
   */
  removeSentence(sentenceId: string, isSource: boolean): void {
    if (!this.document) return;

    if (isSource) {
      const index = this.document.sourceSentences.findIndex(
        (s) => s.id === sentenceId
      );
      if (index >= 0) {
        this.document.sourceSentences.splice(index, 1);
        this.document.metadata.totalSentences =
          this.document.sourceSentences.length;
      }
    } else {
      const index = this.document.targetSentences.findIndex(
        (s) => s.id === sentenceId
      );
      if (index >= 0) {
        this.document.targetSentences.splice(index, 1);
      }
    }

    // Remove correspondence pairs involving this sentence
    const pairsToRemove = this.document.correspondenceMap.pairs.filter((p) =>
      isSource ? p.sourceId === sentenceId : p.targetId === sentenceId
    );

    pairsToRemove.forEach((pair) => {
      this.adjustMetadataForPair(pair, -1);
      const pairIndex = this.document!.correspondenceMap.pairs.indexOf(pair);
      if (pairIndex >= 0) {
        this.document!.correspondenceMap.pairs.splice(pairIndex, 1);
      }

      // Remove from forward/reverse mappings
      if (isSource) {
        this.document!.correspondenceMap.forwardMapping.delete(sentenceId);
      } else {
        this.document!.correspondenceMap.reverseMapping.delete(sentenceId);
      }
    });

    this.document.metadata.lastModified = Date.now();
    this.notifyListeners();
  }

  /**
   * Get corresponding target sentence IDs for a source sentence
   */
  getCorrespondingTargets(sourceId: string): string[] {
    return this.document?.correspondenceMap.forwardMapping.get(sourceId) || [];
  }

  /**
   * Get corresponding source sentence IDs for a target sentence
   */
  getCorrespondingSources(targetId: string): string[] {
    return this.document?.correspondenceMap.reverseMapping.get(targetId) || [];
  }

  private assignOrder(
    incoming: Sentence[],
    existing: Sentence[] = []
  ): Sentence[] {
    const nextOrder = new Map<string, number>();

    existing.forEach((segment) => {
      const currentOrder =
        typeof segment.order === 'number' ? segment.order : 0;
      const stored = nextOrder.get(segment.elementId);
      if (stored === undefined || currentOrder + 1 > stored) {
        nextOrder.set(segment.elementId, currentOrder + 1);
      }
    });

    return incoming.map((segment) => {
      if (typeof segment.order === 'number') {
        const stored = nextOrder.get(segment.elementId);
        if (stored === undefined || segment.order + 1 > stored) {
          nextOrder.set(segment.elementId, segment.order + 1);
        }
        return segment;
      }

      const starting = nextOrder.get(segment.elementId) ?? 0;
      nextOrder.set(segment.elementId, starting + 1);

      return {
        ...segment,
        order: starting,
      };
    });
  }

  private toSegment(
    sentence: Sentence,
    role: 'source' | 'target'
  ): TranslationSegment {
    return {
      id: sentence.id,
      elementId: sentence.elementId,
      content: sentence.content,
      language: sentence.language,
      order: sentence.order ?? 0,
      role,
      sentenceId: sentence.id,
    };
  }

  private sortSegments(segments: TranslationSegment[]): TranslationSegment[] {
    return [...segments].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Update a sentence's content
   */
  updateSentence(
    sentenceId: string,
    newContent: string,
    isSource: boolean
  ): void {
    if (!this.document) return;

    const sentences = isSource
      ? this.document.sourceSentences
      : this.document.targetSentences;
    const sentence = sentences.find((s) => s.id === sentenceId);

    if (sentence) {
      const previous = sentence.content;
      sentence.content = newContent;
      sentence.hash = this.hashContent(newContent);
      logger.debug('TranslationState.updateSentence', {
        sentenceId,
        isSource,
        previous,
        newContent,
      });

      // Mark corresponding translations as out-of-sync
      const pairs = this.document.correspondenceMap.pairs.filter((p) =>
        isSource ? p.sourceId === sentenceId : p.targetId === sentenceId
      );

      pairs.forEach((pair) => {
        pair.status = 'out-of-sync';
        pair.lastModified = Date.now();
      });

      this.document.metadata.lastModified = Date.now();
      this.notifyListeners();
      return;
    }
    logger.warn('TranslationState.updateSentence - sentence not found', {
      sentenceId,
      isSource,
    });
  }

  setSentenceOrder(sentenceId: string, order: number): void {
    if (!this.document) {
      return;
    }

    const sentence = this.document.sourceSentences.find(
      (s) => s.id === sentenceId
    );
    if (sentence) {
      sentence.order = order;
      return;
    }

    const target = this.document.targetSentences.find(
      (s) => s.id === sentenceId
    );
    if (target) {
      target.order = order;
    }
  }

  /**
   * Get translation pair by ID
   */
  getPair(pairId: string): TranslationPair | undefined {
    return this.document?.correspondenceMap.pairs.find((p) => p.id === pairId);
  }

  /**
   * Update translation pair
   */
  updatePair(pairId: string, updates: Partial<TranslationPair>): void {
    if (!this.document) return;

    const index = this.document.correspondenceMap.pairs.findIndex(
      (p) => p.id === pairId
    );
    if (index === -1) {
      return;
    }

    const previous = this.document.correspondenceMap.pairs[index];
    if (!previous) {
      return;
    }
    const updatedPair: TranslationPair = {
      ...previous,
      ...updates,
      id: previous.id,
      lastModified: Date.now(),
    };

    this.adjustMetadataForPair(previous, -1);
    this.adjustMetadataForPair(updatedPair, 1);

    this.document.correspondenceMap.pairs[index] = updatedPair;
    this.document.metadata.lastModified = Date.now();
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (doc: TranslationDocument) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    if (this.document) {
      this.listeners.forEach((listener) => listener(this.document!));
    }
  }

  private adjustMetadataForPair(pair: TranslationPair, delta: number): void {
    if (!this.document) return;
    if (pair.status === 'untranslated' || delta === 0) {
      return;
    }

    this.document.metadata.translatedCount += delta;
    if (pair.method === 'automatic') {
      this.document.metadata.autoCount += delta;
    } else if (pair.method === 'manual') {
      this.document.metadata.manualCount += delta;
    }

    if (this.document.metadata.translatedCount < 0) {
      this.document.metadata.translatedCount = 0;
    }
    if (this.document.metadata.autoCount < 0) {
      this.document.metadata.autoCount = 0;
    }
    if (this.document.metadata.manualCount < 0) {
      this.document.metadata.manualCount = 0;
    }
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `trans-doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  /**
   * Get current document
   */
  getDocument(): TranslationDocument | null {
    if (!this.document) {
      return null;
    }

    const sourceSentences = [...this.document.sourceSentences].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return (a.startOffset ?? 0) - (b.startOffset ?? 0);
    });

    const targetSentences = [...this.document.targetSentences].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return (a.startOffset ?? 0) - (b.startOffset ?? 0);
    });

    return {
      ...this.document,
      sourceSentences,
      targetSentences,
    };
  }

  getSegments(): TranslationSegment[] {
    if (!this.document) {
      return [];
    }

    const segments: TranslationSegment[] = [];
    this.document.sourceSentences.forEach((sentence) => {
      segments.push(this.toSegment(sentence, 'source'));
    });
    this.document.targetSentences.forEach((sentence) => {
      segments.push(this.toSegment(sentence, 'target'));
    });
    return this.sortSegments(segments);
  }

  getSegmentsForElement(
    elementId: string,
    role?: 'source' | 'target'
  ): TranslationSegment[] {
    if (!this.document) {
      return [];
    }

    const segments: TranslationSegment[] = [];

    if (!role || role === 'source') {
      this.document.sourceSentences
        .filter((sentence) => sentence.elementId === elementId)
        .forEach((sentence) => {
          segments.push(this.toSegment(sentence, 'source'));
        });
    }

    if (!role || role === 'target') {
      this.document.targetSentences
        .filter((sentence) => sentence.elementId === elementId)
        .forEach((sentence) => {
          segments.push(this.toSegment(sentence, 'target'));
        });
    }

    return this.sortSegments(segments);
  }

  getTargetSegmentsForSource(sourceId: string): TranslationSegment[] {
    if (!this.document) {
      return [];
    }

    const segments: TranslationSegment[] = [];
    const targetIds =
      this.document.correspondenceMap.forwardMapping.get(sourceId) ?? [];

    targetIds.forEach((targetId) => {
      const sentence = this.document!.targetSentences.find(
        (s) => s.id === targetId
      );
      if (sentence) {
        segments.push(this.toSegment(sentence, 'target'));
      }
    });

    // Fallback: try to find target by ID patterns (for backwards compatibility)
    if (segments.length === 0) {
      // Try legacy trans-* pattern first (backwards compatibility)
      const legacyFallbackId = `trans-${sourceId}`;
      const legacyFallback = this.document.targetSentences.find(
        (s) => s.id === legacyFallbackId
      );
      if (legacyFallback) {
        segments.push(this.toSegment(legacyFallback, 'target'));
      } else {
        // Try new pattern: find target with same source ID in the ID
        // New IDs are: {elementId}-{targetLang}-{sourceIdHash}
        // We need to find a target whose ID includes the source's hash
        const sourceHash = this.hashContent(sourceId);
        const newPatternFallback = this.document.targetSentences.find((s) =>
          s.id.endsWith(`-${sourceHash}`)
        );
        if (newPatternFallback) {
          segments.push(this.toSegment(newPatternFallback, 'target'));
        }
      }
    }

    return this.sortSegments(segments);
  }

  /**
   * Reset state
   */
  reset(): void {
    this.document = null;
    this.listeners.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    translated: number;
    manual: number;
    auto: number;
    outOfSync: number;
  } {
    if (!this.document) {
      return { total: 0, translated: 0, manual: 0, auto: 0, outOfSync: 0 };
    }

    const outOfSync = this.document.correspondenceMap.pairs.filter(
      (p) => p.status === 'out-of-sync'
    ).length;

    return {
      total: this.document.metadata.totalSentences,
      translated: this.document.metadata.translatedCount,
      manual: this.document.metadata.manualCount,
      auto: this.document.metadata.autoCount,
      outOfSync,
    };
  }
}
