/**
 * TranslationChangesModule
 * Tracks edits to translated sentences with undo/redo support
 * Extends EditTrackingModule for consistent change tracking
 */

import type { Operation, OperationData } from '@/types';
import { EditTrackingModule } from '@modules/changes/EditTrackingModule';
import { createModuleLogger } from '@utils/debug';
import type { Sentence, TranslationSegment } from './types';

const logger = createModuleLogger('TranslationChangesModule');

export interface SentenceEditData {
  previousContent: string;
  newContent: string;
  language: 'source' | 'target';
  sentenceId: string;
  elementId: string;
}

/**
 * Tracks edits to translation sentences
 * Maintains edit history for source and target sentences separately
 */
export class TranslationChangesModule extends EditTrackingModule {
  private sentences: Map<string, Sentence> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    super();
    logger.info('TranslationChangesModule initialized');
  }

  /**
   * Initialize sentences from translation document
   */
  public initializeSentences(sentences: Sentence[]): void {
    this.sentences.clear();
    sentences.forEach((sentence) => {
      this.sentences.set(sentence.id, { ...sentence });
    });
    logger.info('Sentences initialized', { count: sentences.length });
  }

  /**
   * Synchronize sentences with latest state without clearing history
   */
  public synchronizeSentences(sentences: Sentence[]): void {
    let modified = false;
    const incoming = new Set<string>();

    sentences.forEach((sentence) => {
      incoming.add(sentence.id);
      const existing = this.sentences.get(sentence.id);
      if (!existing) {
        this.sentences.set(sentence.id, { ...sentence });
        modified = true;
        return;
      }

      if (
        existing.content !== sentence.content ||
        existing.hash !== sentence.hash
      ) {
        existing.content = sentence.content;
        existing.hash = sentence.hash;
        modified = true;
      }
    });

    Array.from(this.sentences.keys()).forEach((id) => {
      if (!incoming.has(id)) {
        this.sentences.delete(id);
        modified = true;
      }
    });

    if (modified) {
      logger.debug('TranslationChangesModule synchronized sentences', {
        count: this.sentences.size,
      });
      this.notifyListeners();
    }
  }

  /**
   * Get current sentence state
   */
  public getSentence(sentenceId: string): TranslationSegment | undefined {
    const sentence = this.sentences.get(sentenceId);
    if (!sentence) {
      return undefined;
    }

    return this.toSegment(sentence);
  }

  /**
   * Get all sentences in current state
   */
  public getCurrentState(): TranslationSegment[] {
    return Array.from(this.sentences.values()).map((sentence) =>
      this.toSegment(sentence)
    );
  }

  /**
   * Edit a sentence - records operation and updates state
   */
  public editSentence(
    sentenceId: string,
    newContent: string,
    language: 'source' | 'target'
  ): void {
    const sentence = this.sentences.get(sentenceId);
    if (!sentence) {
      logger.warn('Attempted to edit non-existent sentence', { sentenceId });
      return;
    }

    const previousContent = sentence.content;
    if (previousContent === newContent) {
      logger.debug('Edit resulted in no content change', { sentenceId });
      return;
    }

    const editData: SentenceEditData = {
      previousContent,
      newContent,
      language,
      sentenceId,
      elementId: sentence.elementId,
    };

    // Add operation to tracking
    this.addOperation('edit', sentenceId, editData as unknown as OperationData);

    // Update sentence in memory
    sentence.content = newContent;
    sentence.hash = this.hashContent(newContent);

    logger.info('Sentence edited', {
      sentenceId,
      language,
      oldLength: previousContent.length,
      newLength: newContent.length,
    });

    this.notifyListeners();
  }

  /**
   * Get edits for a specific sentence
   */
  public getEditsForSentence(sentenceId: string): Operation[] {
    return this.getOperationsForElement(sentenceId).filter(
      (op) => op.type === 'edit'
    );
  }

  /**
   * Check if a sentence has been edited
   */
  public isSentenceEdited(sentenceId: string): boolean {
    return this.getEditsForSentence(sentenceId).length > 0;
  }

  /**
   * Get all edits to source sentences
   */
  public getSourceEdits(): Operation[] {
    return this.operations.filter(
      (op) =>
        op.type === 'edit' &&
        (op.data as unknown as SentenceEditData).language === 'source'
    );
  }

  /**
   * Get all edits to target sentences
   */
  public getTargetEdits(): Operation[] {
    return this.operations.filter(
      (op) =>
        op.type === 'edit' &&
        (op.data as unknown as SentenceEditData).language === 'target'
    );
  }

  /**
   * Get edit count for statistics
   */
  public getEditCount(language?: 'source' | 'target'): number {
    if (!language) {
      return this.operations.filter((op) => op.type === 'edit').length;
    }

    if (language === 'source') {
      return this.getSourceEdits().length;
    }

    return this.getTargetEdits().length;
  }

  /**
   * Subscribe to changes
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Override undo to update sentences
   */
  public undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const operation = this.operations[this.operations.length - 1];
    if (!operation) {
      return false;
    }

    const data = operation.data as unknown as SentenceEditData;
    if (operation.type === 'edit' && data) {
      // Restore previous content
      const sentence = this.sentences.get(data.sentenceId);
      if (sentence) {
        sentence.content = data.previousContent;
        sentence.hash = this.hashContent(data.previousContent);
      }
    }

    this.operations.pop();
    this.redoStack.push(operation);
    this.saved = false;

    logger.info('Undo operation', {
      operationId: operation.id,
      type: operation.type,
    });

    this.notifyListeners();
    return true;
  }

  /**
   * Override redo to update sentences
   */
  public redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const operation = this.redoStack.pop();
    if (!operation) {
      return false;
    }

    if (operation.type === 'edit') {
      const data = operation.data as unknown as SentenceEditData;
      const sentence = this.sentences.get(data.sentenceId);
      if (sentence) {
        sentence.content = data.newContent;
        sentence.hash = this.hashContent(data.newContent);
      }
    }

    this.operations.push(operation);
    this.saved = false;

    logger.info('Redo operation', {
      operationId: operation.id,
      type: operation.type,
    });

    this.notifyListeners();
    return true;
  }

  /**
   * Implement abstract method: reconstruct state from operations
   */
  protected reconstructState(): void {
    // Sentences are already updated by undo/redo
    // This is called as a safety hook for completeness
    logger.debug('State reconstructed from operations');
    this.notifyListeners();
  }

  /**
   * Simple content hash for change detection
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private toSegment(sentence: Sentence): TranslationSegment {
    const role = this.deriveRole(sentence.id);
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

  private deriveRole(sentenceId: string): 'source' | 'target' {
    if (sentenceId.startsWith('trans-')) {
      return 'target';
    }
    return 'source';
  }

  /**
   * Export operations for persistence
   */
  public exportOperations(): Operation[] {
    return this.getOperations();
  }

  /**
   * Restore operations from storage
   */
  public importOperations(operations: Operation[]): void {
    this.initializeWithOperations(operations);
    this.reconstructState();
    logger.info('Operations imported', { count: operations.length });
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.reset();
    logger.info('Translation change history cleared');
  }
}
