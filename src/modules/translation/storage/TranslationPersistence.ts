/**
 * Translation Persistence Manager
 * Handles saving and loading translation state to/from local storage
 */

import { createModuleLogger } from '@utils/debug';
import type { TranslationDocument, Sentence } from '../types';

const logger = createModuleLogger('TranslationPersistence');

const STORAGE_KEY_PREFIX = 'quarto_review_translation_';
const STORAGE_METADATA_KEY = 'quarto_review_translation_metadata';
const MAX_METADATA_ENTRIES = 10;

interface StorageMetadata {
  documentId: string;
  sourceLanguage: string;
  targetLanguage: string;
  savedAt: number;
  version: number;
}

export class TranslationPersistence {
  private storageKey: string;
  private metadataKey = STORAGE_METADATA_KEY;
  private readonly VERSION = 1;
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private static storageWarningLogged = false;

  constructor(private documentId: string) {
    this.storageKey = `${STORAGE_KEY_PREFIX}${documentId}`;
  }

  static isAvailable(): boolean {
    return Boolean(resolveStorage());
  }

  /**
   * Save translation document to local storage
   */
  saveDocument(document: TranslationDocument): boolean {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }

    try {
      const serialized = this.serializeDocument(document);

      if (serialized.length > this.MAX_STORAGE_SIZE) {
        logger.warn('Document exceeds maximum storage size', {
          size: serialized.length,
          max: this.MAX_STORAGE_SIZE,
        });
        return false;
      }

      storage.setItem(this.storageKey, serialized);

      const metadata: StorageMetadata = {
        documentId: document.id,
        sourceLanguage: document.metadata.sourceLanguage,
        targetLanguage: document.metadata.targetLanguage,
        savedAt: Date.now(),
        version: this.VERSION,
      };
      this.saveMetadata(metadata, storage);

      logger.info('Translation document saved to storage', {
        documentId: document.id,
        sentenceCount: document.sourceSentences.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to save translation document', error);
      return false;
    }
  }

  /**
   * Load translation document from local storage
   */
  loadDocument(): TranslationDocument | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    try {
      const serialized = storage.getItem(this.storageKey);
      if (!serialized) {
        logger.debug('No saved translation document found');
        return null;
      }

      const document = this.deserializeDocument(serialized);
      logger.info('Translation document loaded from storage', {
        documentId: document.id,
        sentenceCount: document.sourceSentences.length,
      });

      return document;
    } catch (error) {
      logger.error('Failed to load translation document', error);
      return null;
    }
  }

  /**
   * Check if a translation document exists in storage
   */
  hasDocument(): boolean {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }

    try {
      return storage.getItem(this.storageKey) !== null;
    } catch (error) {
      logger.warn('Failed to check translation persistence', error);
      return false;
    }
  }

  /**
   * Clear translation document from storage
   */
  clearDocument(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(this.storageKey);
      logger.info('Translation document cleared from storage', {
        documentId: this.documentId,
      });
    } catch (error) {
      logger.error('Failed to clear translation document', error);
    }
  }

  /**
   * Get all saved translation documents
   */
  static getAllDocuments(): TranslationDocument[] {
    const documents: TranslationDocument[] = [];
    const storage = resolveStorage();
    if (!storage) {
      return documents;
    }

    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const serialized = storage.getItem(key);
          if (!serialized) continue;
          try {
            const document = JSON.parse(serialized) as TranslationDocument;
            documents.push(document);
          } catch {
            logger.warn('Failed to parse stored document', { key });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to retrieve all documents from storage', error);
    }

    return documents;
  }

  /**
   * Clear all saved translation documents
   */
  static clearAll(): void {
    const storage = resolveStorage();
    if (!storage) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (
          key &&
          (key.startsWith(STORAGE_KEY_PREFIX) || key === STORAGE_METADATA_KEY)
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => storage.removeItem(key));
      logger.info('All translation documents cleared from storage');
    } catch (error) {
      logger.error('Failed to clear all translation documents', error);
    }
  }

  /**
   * Serialize document for storage
   */
  private serializeDocument(document: TranslationDocument): string {
    const serializableMap = {
      ...document,
      correspondenceMap: {
        ...document.correspondenceMap,
        forwardMapping: Object.fromEntries(
          document.correspondenceMap.forwardMapping
        ),
        reverseMapping: Object.fromEntries(
          document.correspondenceMap.reverseMapping
        ),
      },
    };

    return JSON.stringify(serializableMap);
  }

  /**
   * Deserialize document from storage
   */
  private deserializeDocument(serialized: string): TranslationDocument {
    const parsed = JSON.parse(serialized);

    const document: TranslationDocument = {
      ...parsed,
      correspondenceMap: {
        ...parsed.correspondenceMap,
        forwardMapping: new Map(
          Object.entries(parsed.correspondenceMap.forwardMapping)
        ),
        reverseMapping: new Map(
          Object.entries(parsed.correspondenceMap.reverseMapping)
        ),
      },
    };

    document.sourceSentences = this.ensureSegmentOrder(
      document.sourceSentences
    );
    document.targetSentences = this.ensureSegmentOrder(
      document.targetSentences
    );

    return document;
  }

  private ensureSegmentOrder(segments: Sentence[]): Sentence[] {
    return segments.map((segment, index) => ({
      ...segment,
      order: typeof segment.order === 'number' ? segment.order : index,
    }));
  }

  /**
   * Save metadata about stored translations
   */
  private saveMetadata(metadata: StorageMetadata, storage: Storage): void {
    try {
      const allMetadata = this.getMetadataList(storage);
      const existing = allMetadata.findIndex(
        (m) => m.documentId === metadata.documentId
      );

      if (existing >= 0) {
        allMetadata[existing] = metadata;
      } else {
        allMetadata.push(metadata);
      }

      if (allMetadata.length > MAX_METADATA_ENTRIES) {
        allMetadata.splice(0, allMetadata.length - MAX_METADATA_ENTRIES);
      }

      storage.setItem(this.metadataKey, JSON.stringify(allMetadata));
    } catch (error) {
      logger.warn('Failed to save translation metadata', error);
    }
  }

  /**
   * Get list of metadata for all stored translations
   */
  private getMetadataList(storage: Storage): StorageMetadata[] {
    try {
      const stored = storage.getItem(this.metadataKey);
      return stored ? (JSON.parse(stored) as StorageMetadata[]) : [];
    } catch (error) {
      logger.warn('Failed to retrieve translation metadata list', error);
      return [];
    }
  }

  /**
   * Get metadata for a specific document
   */
  getMetadata(): StorageMetadata | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    try {
      const list = this.getMetadataList(storage);
      return list.find((m) => m.documentId === this.documentId) || null;
    } catch (error) {
      logger.warn('Failed to retrieve metadata', error);
      return null;
    }
  }

  /**
   * Check if stored document is stale (older than specified time in ms)
   */
  isStale(maxAgeMs: number): boolean {
    const metadata = this.getMetadata();
    if (!metadata) return true;

    const age = Date.now() - metadata.savedAt;
    return age > maxAgeMs;
  }

  private getStorage(): Storage | null {
    const storage = resolveStorage();
    if (!storage && !TranslationPersistence.storageWarningLogged) {
      TranslationPersistence.storageWarningLogged = true;
      logger.warn(
        'Local storage not available in this environment; translation persistence disabled'
      );
    }
    return storage;
  }
}

function resolveStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      return window.localStorage;
    }
  } catch {
    // Access to window.localStorage can throw (e.g., privacy settings)
  }

  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return (globalThis as { localStorage?: Storage }).localStorage ?? null;
    }
  } catch {
    // Ignore failures when probing globalThis
  }

  return null;
}
