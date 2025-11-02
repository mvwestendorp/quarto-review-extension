/**
 * Translation Persistence Manager
 * Handles saving and loading translation state to/from local storage
 */

import { createModuleLogger } from '@utils/debug';
import type { TranslationDocument } from '../types';

const logger = createModuleLogger('TranslationPersistence');

const STORAGE_KEY_PREFIX = 'quarto_review_translation_';
const STORAGE_METADATA_KEY = 'quarto_review_translation_metadata';

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

  constructor(private documentId: string) {
    this.storageKey = `${STORAGE_KEY_PREFIX}${documentId}`;
  }

  /**
   * Save translation document to local storage
   */
  saveDocument(document: TranslationDocument): boolean {
    try {
      // Serialize the document
      const serialized = this.serializeDocument(document);

      // Check storage size
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        logger.warn('Document exceeds maximum storage size', {
          size: serialized.length,
          max: this.MAX_STORAGE_SIZE,
        });
        return false;
      }

      // Save document
      localStorage.setItem(this.storageKey, serialized);

      // Save metadata
      const metadata: StorageMetadata = {
        documentId: document.id,
        sourceLanguage: document.metadata.sourceLanguage,
        targetLanguage: document.metadata.targetLanguage,
        savedAt: Date.now(),
        version: this.VERSION,
      };
      this.saveMetadata(metadata);

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
    try {
      const serialized = localStorage.getItem(this.storageKey);
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
    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * Clear translation document from storage
   */
  clearDocument(): void {
    try {
      localStorage.removeItem(this.storageKey);
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
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            try {
              const document = JSON.parse(serialized) as TranslationDocument;
              documents.push(document);
            } catch {
              logger.warn('Failed to parse stored document', { key });
            }
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
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith(STORAGE_KEY_PREFIX) || key === STORAGE_METADATA_KEY)
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      logger.info('All translation documents cleared from storage');
    } catch (error) {
      logger.error('Failed to clear all translation documents', error);
    }
  }

  /**
   * Serialize document for storage
   */
  private serializeDocument(document: TranslationDocument): string {
    // Convert Maps to objects for JSON serialization
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

    // Reconstruct Maps from objects
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

    return document;
  }

  /**
   * Save metadata about stored translations
   */
  private saveMetadata(metadata: StorageMetadata): void {
    try {
      const allMetadata = this.getMetadataList();
      const existing = allMetadata.findIndex(
        (m) => m.documentId === metadata.documentId
      );

      if (existing >= 0) {
        allMetadata[existing] = metadata;
      } else {
        allMetadata.push(metadata);
      }

      // Keep only last 10 entries
      if (allMetadata.length > 10) {
        allMetadata.splice(0, allMetadata.length - 10);
      }

      localStorage.setItem(this.metadataKey, JSON.stringify(allMetadata));
    } catch (error) {
      logger.warn('Failed to save metadata', error);
    }
  }

  /**
   * Get list of metadata for all stored translations
   */
  private getMetadataList(): StorageMetadata[] {
    try {
      const stored = localStorage.getItem(this.metadataKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.warn('Failed to retrieve metadata list', error);
      return [];
    }
  }

  /**
   * Get metadata for a specific document
   */
  getMetadata(): StorageMetadata | null {
    try {
      const list = this.getMetadataList();
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
}
