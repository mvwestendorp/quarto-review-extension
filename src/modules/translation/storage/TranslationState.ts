/**
 * Translation State Manager
 * Manages the current translation document and notifies listeners of changes
 */

import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
  Language,
} from '../types';

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
    this.document = {
      id: this.generateDocumentId(),
      sourceSentences,
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
        totalSentences: sourceSentences.length,
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

    this.document.correspondenceMap.pairs.push(pair);

    // Update forward mapping
    const existing =
      this.document.correspondenceMap.forwardMapping.get(pair.sourceId) || [];
    existing.push(pair.targetId);
    this.document.correspondenceMap.forwardMapping.set(pair.sourceId, existing);

    // Update reverse mapping
    const reverseExisting =
      this.document.correspondenceMap.reverseMapping.get(pair.targetId) || [];
    reverseExisting.push(pair.sourceId);
    this.document.correspondenceMap.reverseMapping.set(
      pair.targetId,
      reverseExisting
    );

    // Update metadata
    this.document.metadata.lastModified = Date.now();
    this.document.metadata.translatedCount++;
    if (pair.method === 'automatic') {
      this.document.metadata.autoCount++;
    } else if (pair.method === 'manual') {
      this.document.metadata.manualCount++;
    }

    this.notifyListeners();
  }

  /**
   * Add target sentences
   */
  addTargetSentences(sentences: Sentence[]): void {
    if (!this.document) return;

    this.document.targetSentences.push(...sentences);
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
      sentence.content = newContent;
      sentence.hash = this.hashContent(newContent);

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

    const pair = this.document.correspondenceMap.pairs.find(
      (p) => p.id === pairId
    );
    if (pair) {
      Object.assign(pair, updates);
      pair.lastModified = Date.now();
      this.document.metadata.lastModified = Date.now();
      this.notifyListeners();
    }
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
    return this.document;
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
