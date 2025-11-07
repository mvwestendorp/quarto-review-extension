/**
 * Unified Document Persistence
 * Facade layer coordinating review edits and translation persistence
 *
 * This layer provides a single interface for saving and loading document state
 * across both the review layer (git-backed) and translation layer (browser storage).
 *
 * Architecture:
 * - UnifiedDocumentPersistence (this file) → Facade coordinating both backends
 * - LocalDraftPersistence → Git-backed storage for review edits/comments
 * - TranslationPersistence → Browser localStorage for translation state
 */

import { createModuleLogger } from '@utils/debug';
import type LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import type { TranslationPersistence } from '@modules/translation/storage/TranslationPersistence';
import { TranslationPersistence as TranslationPersistenceImpl } from '@modules/translation/storage/TranslationPersistence';
import type { DraftElementPayload } from '@modules/storage/LocalDraftPersistence';
import type { TranslationDocument, Language } from '@modules/translation/types';
import type { Operation, Comment } from '@/types';

const logger = createModuleLogger('UnifiedDocumentPersistence');

/**
 * Payload for the unified document persistence layer
 * Contains review edits and translations (optionally)
 */
export interface UnifiedDocumentPayload {
  /** Unique identifier for this unified payload */
  id: string;

  /** Document identifier (used to correlate review and translation data) */
  documentId: string;

  /** Timestamp when this payload was saved */
  savedAt: number;

  /** Payload version for future migrations */
  version: number;

  /** Review layer: document structure, edits, and comments */
  review?: {
    elements: DraftElementPayload[];
    operations?: Operation[];
    comments?: Comment[];
  };

  /** Translation layer: per-language-pair translation data */
  translations?: Record<string, TranslationDocument>;
}

/**
 * Configuration for translation restoration
 */
export interface TranslationRestorationInfo {
  sourceLanguage: Language;
  targetLanguage: Language;
  document: TranslationDocument;
}

/**
 * Unified Document Persistence
 *
 * Coordinates persistence across both review and translation layers.
 * Ensures that when translations are merged back into reviews,
 * both the review changes AND the translation state are persisted.
 *
 * Usage:
 * 1. Create: `const unified = new UnifiedDocumentPersistence(localPersistence, translationPersistence)`
 * 2. Save: `await unified.saveDocument(payload)` - saves both review and translations
 * 3. Load: `const payload = await unified.loadDocument(documentId)` - loads all data
 */
export class UnifiedDocumentPersistence {
  constructor(
    private localPersistence: LocalDraftPersistence,

    _translationPersistence: TranslationPersistence
  ) {}

  /**
   * Save document across both persistence layers
   *
   * Transaction-like behavior:
   * - Always saves review layer (if present) to git-backed storage
   * - Always saves each translation to browser storage
   * - If either fails, logs warning but continues (no rollback)
   *
   * @param payload - Unified document payload with review and/or translations
   * @throws Error if payload is invalid (no review or translations)
   */
  public async saveDocument(payload: UnifiedDocumentPayload): Promise<void> {
    // Validate: must have at least review or translations
    if (!payload.review && !payload.translations) {
      throw new Error(
        'UnifiedDocumentPayload must have review or translation data'
      );
    }

    logger.debug('Saving unified document', {
      documentId: payload.documentId,
      hasReview: !!payload.review,
      translationCount: Object.keys(payload.translations || {}).length,
    });

    // Save review layer to git-backed storage
    if (payload.review) {
      try {
        await this.localPersistence.saveDraft(payload.review.elements, {
          message: `Local draft update: ${new Date().toISOString()}`,
          comments: payload.review.comments,
          operations: payload.review.operations,
        });

        logger.debug('Review layer saved successfully', {
          elementCount: payload.review.elements.length,
          commentCount: payload.review.comments?.length ?? 0,
          operationCount: payload.review.operations?.length ?? 0,
        });
      } catch (error) {
        logger.warn('Failed to save review layer', error);
      }
    }

    // Save each translation to browser storage
    if (payload.translations) {
      for (const [langPair, translationDoc] of Object.entries(
        payload.translations
      )) {
        try {
          // Create a persistence instance for this specific language pair
          const translationId = `${payload.documentId}-${langPair}`;
          const translationPersistence = new TranslationPersistenceImpl(
            translationId
          );

          const saved = translationPersistence.saveDocument(translationDoc);

          if (saved) {
            logger.debug('Translation saved successfully', {
              langPair,
              sentenceCount: translationDoc.sourceSentences.length,
            });
          } else {
            logger.warn('Failed to save translation document', { langPair });
          }
        } catch (error) {
          logger.warn('Error saving translation', { langPair, error });
        }
      }
    }

    logger.info('Unified document saved', {
      documentId: payload.documentId,
    });
  }

  /**
   * Load document from both persistence layers
   *
   * Restoration order:
   * 1. Load review edits and comments from git-backed storage
   * 2. Discover and load all translations for this document from browser storage
   * 3. Combine into single UnifiedDocumentPayload
   *
   * @param documentId - The document identifier to load
   * @returns Complete document payload with review and translations, or null if nothing persisted
   */
  public async loadDocument(
    documentId: string
  ): Promise<UnifiedDocumentPayload | null> {
    logger.debug('Loading unified document', { documentId });

    try {
      // Load review layer from git-backed storage
      const reviewPayload = await this.localPersistence.loadDraft();

      // Load all translations for this document from browser storage
      const translations: Record<string, TranslationDocument> = {};
      const allStoredDocs = TranslationPersistenceImpl.getAllDocuments();

      for (const doc of allStoredDocs) {
        // Check if this translation belongs to our document
        // Translation storage keys are: `quarto_review_translation_{documentId}-{langPair}`
        // So we look for docs where the ID starts with our documentId
        if (doc.id.startsWith(`${documentId}-`)) {
          const langPair = doc.id.substring(`${documentId}-`.length);
          translations[langPair] = doc;
        }
      }

      // If nothing is persisted, return null
      if (!reviewPayload && Object.keys(translations).length === 0) {
        logger.debug('No persisted data found for document', { documentId });
        return null;
      }

      // Build unified payload
      const unified: UnifiedDocumentPayload = {
        id: `unified-${Date.now()}`,
        documentId,
        savedAt: Date.now(),
        version: 1,
        review: reviewPayload
          ? {
              elements: reviewPayload.elements,
              operations: reviewPayload.operations,
              comments: reviewPayload.comments,
            }
          : undefined,
        translations:
          Object.keys(translations).length > 0 ? translations : undefined,
      };

      logger.info('Unified document loaded', {
        documentId,
        hasReview: !!unified.review,
        translationCount: Object.keys(unified.translations || {}).length,
      });

      return unified;
    } catch (error) {
      logger.warn('Failed to load unified document', error);
      return null;
    }
  }

  /**
   * Get all translation documents for a specific document
   *
   * Useful for discovering what language pairs have been translated.
   *
   * @param documentId - The document identifier
   * @returns Array of translation documents for this document
   */
  public getTranslationsForDocument(
    documentId: string
  ): TranslationRestorationInfo[] {
    try {
      const allDocs = TranslationPersistenceImpl.getAllDocuments();
      const results: TranslationRestorationInfo[] = [];

      for (const doc of allDocs) {
        if (doc.id.startsWith(`${documentId}-`)) {
          results.push({
            sourceLanguage: doc.metadata.sourceLanguage,
            targetLanguage: doc.metadata.targetLanguage,
            document: doc,
          });
        }
      }

      logger.debug('Found translations for document', {
        documentId,
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.warn('Failed to get translations for document', error);
      return [];
    }
  }
}
