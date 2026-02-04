/**
 * PersistenceManager
 * Handles document persistence and local draft management
 */

import { createModuleLogger } from '@utils/debug';
import type LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import type { DraftElementPayload } from '@modules/storage/LocalDraftPersistence';
import type { TranslationPersistence } from '@modules/translation/storage/TranslationPersistence';
import type { ChangesModule } from '@modules/changes';
import type { CommentsModule } from '@modules/comments';
import type { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';
import type { NotificationService } from './NotificationService';
import type { Operation, Comment } from '@/types';
import { getPagePrefixFromElementId } from '@utils/page-utils';
import {
  UnifiedDocumentPersistence,
  type TranslationRestorationInfo,
} from './UnifiedDocumentPersistence';

const logger = createModuleLogger('PersistenceManager');

export interface PersistenceManagerConfig {
  localPersistence: LocalDraftPersistence;
  translationPersistence: TranslationPersistence;
  changes: ChangesModule;
  comments?: CommentsModule;
  historyStorage: EditorHistoryStorage;
  notificationService: NotificationService;
}

export interface PersistenceCallbacks {
  onDraftRestored: (
    elements: Array<{ id: string; content: string; metadata?: unknown }>
  ) => void;
  onCommentsImported?: () => void;
  onTranslationsImported?: (translations: TranslationRestorationInfo[]) => void;
  refresh: () => void;
}

/**
 * Manager for handling local draft persistence and restoration
 *
 * Phase 1 v2.0: Unified persistence coordination
 * Requires both localPersistence and translationPersistence to coordinate
 * review edits (git-backed) and translation state (browser storage).
 *
 * Single code path through UnifiedDocumentPersistence ensures translation
 * merges are automatically persisted alongside review edits.
 */
export class PersistenceManager {
  private config: PersistenceManagerConfig;
  private callbacks: PersistenceCallbacks;
  private unifiedPersistence: UnifiedDocumentPersistence;

  constructor(
    config: PersistenceManagerConfig,
    callbacks: PersistenceCallbacks
  ) {
    this.config = config;
    this.callbacks = callbacks;

    // Always create unified persistence - both backends are required
    this.unifiedPersistence = new UnifiedDocumentPersistence(
      config.localPersistence,
      config.translationPersistence
    );
    logger.info('UnifiedDocumentPersistence initialized');
  }

  /**
   * Persist the current document state via unified persistence
   *
   * Saves review edits and translation state atomically to both backends:
   * - LocalDraftPersistence (git-backed) for review changes
   * - TranslationPersistence (browser storage) for translation state
   */
  public async persistDocument(): Promise<void> {
    try {
      const elements = this.config.changes.getCurrentState();

      // Strip inline comment markup from content before saving
      // since comments are now stored separately in the comments array
      const payload = elements.map((elem) => {
        let cleanContent = elem.content;

        // Remove inline CriticMarkup comments {>>...<<} from content
        if (this.config.comments) {
          const matches = this.config.comments.parse(elem.content);
          const commentMatches = matches.filter((m) => m.type === 'comment');

          // Process in reverse order to maintain string indices
          for (let i = commentMatches.length - 1; i >= 0; i--) {
            const match = commentMatches[i];
            if (!match) continue;
            cleanContent = this.config.comments.accept(cleanContent, match);
          }
        }

        return {
          id: elem.id,
          content: cleanContent,
          metadata: elem.metadata,
          sourcePosition: elem.sourcePosition,
        };
      });

      const currentPagePrefixes = this.getPagePrefixesFromElements(payload);

      let existingDraft: Awaited<
        ReturnType<LocalDraftPersistence['loadDraft']>
      > | null = null;
      try {
        existingDraft = await this.config.localPersistence.loadDraft();
      } catch (error) {
        logger.debug('Unable to load existing draft for merge', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const mergedElements = this.mergeElementsByPage(
        existingDraft?.elements ?? [],
        payload,
        currentPagePrefixes
      );

      const commentsSnapshot =
        typeof this.config.comments?.getAllComments === 'function'
          ? this.config.comments.getAllComments()
          : undefined;
      const operationsSnapshot =
        typeof this.config.changes.getOperations === 'function'
          ? Array.from(this.config.changes.getOperations())
          : undefined;

      const mergedComments = this.mergeCommentsByPage(
        existingDraft?.comments as Comment[] | undefined,
        commentsSnapshot,
        currentPagePrefixes
      );
      const mergedOperations = this.mergeOperationsByPage(
        existingDraft?.operations,
        operationsSnapshot,
        currentPagePrefixes
      );

      logger.debug('Preparing to persist document', {
        elementCount: mergedElements.length,
        operationCount: mergedOperations?.length ?? 0,
        commentCount: mergedComments?.length ?? 0,
      });

      // Single unified code path - always use unified persistence
      await this.unifiedPersistence.saveDocument({
        id: `doc-${Date.now()}`,
        documentId: this.buildDocumentId(),
        savedAt: Date.now(),
        version: 1,
        review: {
          elements: mergedElements,
          operations: mergedOperations,
          comments: mergedComments,
        },
      });

      logger.debug('Document persisted via unified persistence');
    } catch (error) {
      logger.warn('Failed to persist document', error);
    }
  }

  /**
   * Restore local draft from previous session
   *
   * Phase 2: Now uses unified persistence to restore both review edits and translations.
   * This ensures that translation merges persisted alongside review changes are properly restored.
   */
  public async restoreLocalDraft(): Promise<void> {
    if (!this.config.localPersistence) {
      return;
    }
    try {
      // Load unified document (review + translations)
      const documentId = this.buildDocumentId();
      const unifiedPayload =
        await this.unifiedPersistence.loadDocument(documentId);

      // If nothing was persisted, return early
      if (!unifiedPayload) {
        logger.debug('No persisted document found', { documentId });
        return;
      }

      const currentState = this.config.changes.getCurrentState();
      const hasReviewPayload = !!unifiedPayload.review;
      const hasTranslations =
        unifiedPayload.translations &&
        Object.keys(unifiedPayload.translations).length > 0;

      logger.debug('Checking for draft restoration', {
        documentId,
        draftElements: unifiedPayload.review?.elements?.length ?? 0,
        currentStateElements: currentState.length,
        hasDraftComments:
          Array.isArray(unifiedPayload.review?.comments) &&
          unifiedPayload.review.comments.length > 0,
        hasTranslations,
      });

      // CRITICAL FIX: If currentState is empty but draft has elements, this might be valid
      // during early initialization. Only skip if BOTH are empty.
      if (
        currentState.length === 0 &&
        (!unifiedPayload.review?.elements ||
          unifiedPayload.review.elements.length === 0) &&
        (!unifiedPayload.review?.comments ||
          unifiedPayload.review.comments.length === 0) &&
        !hasTranslations
      ) {
        logger.debug('Skipping restoration: both current and draft are empty');
        return;
      }

      // Check if there are content differences between current state and draft
      let hasDifference = false;
      if (hasReviewPayload && unifiedPayload.review?.elements) {
        if (currentState.length > 0) {
          const currentMap = new Map(
            currentState.map((elem) => [elem.id, elem.content])
          );

          hasDifference = unifiedPayload.review.elements.some((entry) => {
            const currentContent = currentMap.get(entry.id);
            const isDifferent = currentContent !== entry.content;
            if (isDifferent) {
              logger.debug('Content difference found', {
                elementId: entry.id,
                draftContent: entry.content.substring(0, 50),
                currentContent: currentContent?.substring(0, 50),
              });
            }
            return isDifferent;
          });
        } else {
          // If current state is empty but draft has elements, that's a difference
          hasDifference =
            unifiedPayload.review.elements.length > 0 ? true : false;
          if (hasDifference) {
            logger.debug(
              'Content difference: current state empty but draft has elements'
            );
          }
        }
      }

      // Restore operations if available
      // BUG FIX: Restore ALL operations, not just current page
      // Previous code filtered by getCurrentPagePrefix(), which caused multi-page edits
      // to be lost when navigating between pages. Now we restore the full operation
      // history so all pages have their changes available.
      // See: https://github.com/quarto-dev/quarto-review-extension/issues/XXX
      logger.debug('Checking for operations in restored payload', {
        hasOperations: !!unifiedPayload.review?.operations,
        operationCount: unifiedPayload.review?.operations?.length ?? 0,
        hasFunction:
          typeof this.config.changes.initializeWithOperations === 'function',
      });

      if (
        Array.isArray(unifiedPayload.review?.operations) &&
        unifiedPayload.review.operations.length > 0 &&
        typeof this.config.changes.initializeWithOperations === 'function'
      ) {
        // Restore ALL operations from all pages
        // This is safe because:
        // 1. Operations contain element IDs with page prefixes
        // 2. When user navigates to a page, only that page's elements are rendered
        // 3. Non-existent elements are silently skipped by initializeWithOperations
        const allOps = unifiedPayload.review.operations;
        const pageDistribution = this.summarizeOperationsByPage(allOps);

        logger.info('Restoring operations from draft', {
          totalCount: allOps.length,
          pageDistribution,
        });

        this.config.changes.initializeWithOperations(allOps);
      } else if (unifiedPayload.review?.operations?.length === 0) {
        logger.debug('Draft has no operations - using current state');
      }

      // Import comments first (even if no text changes)
      const hasComments =
        typeof this.config.comments?.importComments === 'function' &&
        Array.isArray(unifiedPayload.review?.comments) &&
        unifiedPayload.review.comments.length > 0;

      if (hasComments) {
        const commentsToImport = unifiedPayload.review?.comments ?? [];
        logger.info('Importing comments from draft', {
          count: commentsToImport.length,
        });
        this.config.comments?.importComments(commentsToImport);
        // Notify that comments were imported from storage
        this.callbacks.onCommentsImported?.();
      }

      // Restore translations if available
      const translationsToRestore: TranslationRestorationInfo[] = [];
      if (hasTranslations && unifiedPayload.translations) {
        for (const [, translationDoc] of Object.entries(
          unifiedPayload.translations
        )) {
          translationsToRestore.push({
            sourceLanguage: translationDoc.metadata.sourceLanguage,
            targetLanguage: translationDoc.metadata.targetLanguage,
            document: translationDoc,
          });
        }

        if (translationsToRestore.length > 0) {
          logger.info('Restoring translations from storage', {
            count: translationsToRestore.length,
          });
          this.callbacks.onTranslationsImported?.(translationsToRestore);
        }
      }

      // If no text differences and no comments and no translations, return early
      if (!hasDifference && !hasComments && !hasTranslations) {
        logger.debug('No differences, comments, or translations to restore');
        return;
      }

      // Notify callback to handle element restoration (only if text changed)
      if (hasDifference && unifiedPayload.review?.elements) {
        logger.info('Restoring draft elements', {
          count: unifiedPayload.review.elements.length,
        });
        this.callbacks.onDraftRestored(unifiedPayload.review.elements);
      }

      // Always refresh to ensure UI is updated
      logger.debug('Triggering refresh after draft restoration');
      this.callbacks.refresh();

      const sessionKey = this.buildDraftRestoreSessionKey();
      const sessionStorage =
        typeof window !== 'undefined' ? window.sessionStorage : null;
      const shouldNotify = sessionStorage
        ? !sessionStorage.getItem(sessionKey)
        : true;

      if (shouldNotify && (hasDifference || hasComments || hasTranslations)) {
        logger.info('Showing draft restoration notification');
        this.config.notificationService.info(
          'Restored local draft from previous session.'
        );
        sessionStorage?.setItem(sessionKey, '1');
      }
    } catch (error) {
      logger.warn('Failed to restore local draft', error);
    }
  }

  /**
   * Confirm and clear all local drafts
   */
  public async confirmAndClearLocalDrafts(): Promise<void> {
    if (!this.config.localPersistence) {
      this.config.notificationService.error(
        'Local draft storage is not available.'
      );
      return;
    }
    const confirmed = window.confirm(
      'This will remove all locally saved drafts and editor history. This action cannot be undone. Continue?'
    );
    if (!confirmed) {
      return;
    }
    await this.config.localPersistence.clearAll();
    this.config.historyStorage.clearAll();
    this.config.notificationService.success('Local drafts cleared.');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  }

  /**
   * Build a document identifier for unified persistence
   * Used to correlate review edits and translations
   */
  private buildDocumentId(): string {
    // Use the draft filename as the document identifier
    const filename =
      typeof this.config.localPersistence?.getFilename === 'function'
        ? this.config.localPersistence.getFilename()
        : 'review-draft.json';
    return filename.replace(/\.json$/i, '');
  }

  /**
   * Build session key for tracking draft restoration notifications
   */
  private buildDraftRestoreSessionKey(): string {
    const filename =
      typeof this.config.localPersistence?.getFilename === 'function'
        ? this.config.localPersistence.getFilename()
        : 'review-draft.json';
    return `quarto-review:draft-restored:${filename}`;
  }

  private getPagePrefixesFromElements(
    elements: DraftElementPayload[]
  ): Set<string> {
    const prefixes = new Set<string>();
    elements.forEach((element) => {
      if (!element?.id) return;
      const prefix = getPagePrefixFromElementId(element.id);
      if (prefix) {
        prefixes.add(prefix);
      }
    });
    return prefixes;
  }

  private mergeElementsByPage(
    existing: DraftElementPayload[],
    updates: DraftElementPayload[],
    updatedPrefixes: Set<string>
  ): DraftElementPayload[] {
    if (!existing.length) {
      return updates;
    }
    if (updatedPrefixes.size === 0) {
      return existing;
    }
    const filteredExisting = existing.filter((element) => {
      const prefix = getPagePrefixFromElementId(element.id);
      return !updatedPrefixes.has(prefix);
    });
    return [...filteredExisting, ...updates];
  }

  private mergeCommentsByPage(
    existing: Comment[] | undefined,
    updates: Comment[] | undefined,
    updatedPrefixes: Set<string>
  ): Comment[] | undefined {
    const filteredExisting = (existing ?? []).filter((comment) => {
      const prefix = getPagePrefixFromElementId(comment.elementId);
      return !updatedPrefixes.has(prefix);
    });

    const merged = new Map<string, Comment>();
    filteredExisting.forEach((comment) => merged.set(comment.id, comment));
    (updates ?? []).forEach((comment) => merged.set(comment.id, comment));

    return merged.size > 0 ? Array.from(merged.values()) : undefined;
  }

  private mergeOperationsByPage(
    existing: Operation[] | undefined,
    updates: Operation[] | undefined,
    updatedPrefixes: Set<string>
  ): Operation[] | undefined {
    const filteredExisting = (existing ?? []).filter((op) => {
      const prefix = getPagePrefixFromElementId(op.elementId);
      return !updatedPrefixes.has(prefix);
    });
    const merged = [...filteredExisting, ...(updates ?? [])];
    return merged.length > 0 ? merged : undefined;
  }

  /**
   * Summarize operations by page for logging
   * Helps with debugging multi-page persistence
   */
  private summarizeOperationsByPage(
    operations: Operation[]
  ): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const op of operations) {
      const elementId = op.elementId || '';
      const pagePrefix = elementId.split('.')[0] || 'unknown';
      summary[pagePrefix] = (summary[pagePrefix] || 0) + 1;
    }
    return summary;
  }

  /**
   * Check if persistence is available
   */
  public isAvailable(): boolean {
    return !!this.config.localPersistence;
  }
}
