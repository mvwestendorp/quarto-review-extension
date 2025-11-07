/**
 * PersistenceManager
 * Handles document persistence and local draft management
 */

import { createModuleLogger } from '@utils/debug';
import type LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import type { ChangesModule } from '@modules/changes';
import type { CommentsModule } from '@modules/comments';
import type { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';
import type { NotificationService } from './NotificationService';

const logger = createModuleLogger('PersistenceManager');

export interface PersistenceManagerConfig {
  localPersistence?: LocalDraftPersistence;
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
  refresh: () => void;
}

/**
 * Manager for handling local draft persistence and restoration
 */
export class PersistenceManager {
  private config: PersistenceManagerConfig;
  private callbacks: PersistenceCallbacks;

  constructor(
    config: PersistenceManagerConfig,
    callbacks: PersistenceCallbacks
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Persist the current document state to local storage
   */
  public persistDocument(message?: string): void {
    if (!this.config.localPersistence) {
      return;
    }
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
        };
      });

      const commentsSnapshot =
        typeof this.config.comments?.getAllComments === 'function'
          ? this.config.comments.getAllComments()
          : undefined;
      const operationsSnapshot =
        typeof this.config.changes.getOperations === 'function'
          ? this.config.changes.getOperations()
          : undefined;
      void this.config.localPersistence.saveDraft(payload, {
        message,
        comments: commentsSnapshot,
        operations: operationsSnapshot,
      });
    } catch (error) {
      logger.warn('Failed to persist local draft', error);
    }
  }

  /**
   * Restore local draft from previous session
   */
  public async restoreLocalDraft(): Promise<void> {
    if (!this.config.localPersistence) {
      return;
    }
    try {
      const draftPayload = await this.config.localPersistence.loadDraft();
      if (!draftPayload) {
        logger.debug('No draft found in localStorage');
        return;
      }
      const currentState = this.config.changes.getCurrentState();

      logger.debug('Checking for draft restoration', {
        draftElements: draftPayload.elements?.length ?? 0,
        currentStateElements: currentState.length,
        hasDraftComments:
          Array.isArray(draftPayload.comments) &&
          draftPayload.comments.length > 0,
      });

      // CRITICAL FIX: If currentState is empty but draft has elements, this might be valid
      // during early initialization. Only skip if BOTH are empty.
      if (
        currentState.length === 0 &&
        (!draftPayload.elements || draftPayload.elements.length === 0) &&
        (!draftPayload.comments || draftPayload.comments.length === 0)
      ) {
        logger.debug('Skipping restoration: both current and draft are empty');
        return;
      }

      // Check if there are content differences between current state and draft
      let hasDifference = false;
      if (currentState.length > 0) {
        const currentMap = new Map(
          currentState.map((elem) => [elem.id, elem.content])
        );

        hasDifference = draftPayload.elements.some((entry) => {
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
        hasDifference = !!(
          draftPayload.elements && draftPayload.elements.length > 0
        );
        if (hasDifference) {
          logger.debug(
            'Content difference: current state empty but draft has elements'
          );
        }
      }

      // Restore operations if available
      if (
        Array.isArray(draftPayload.operations) &&
        draftPayload.operations.length > 0 &&
        typeof this.config.changes.initializeWithOperations === 'function'
      ) {
        logger.info('Restoring operations from draft', {
          count: draftPayload.operations.length,
        });
        this.config.changes.initializeWithOperations(draftPayload.operations);
      }

      // Import comments first (even if no text changes)
      const hasComments =
        typeof this.config.comments?.importComments === 'function' &&
        Array.isArray(draftPayload.comments) &&
        draftPayload.comments.length > 0;

      if (hasComments) {
        const commentsToImport = draftPayload.comments ?? [];
        logger.info('Importing comments from draft', {
          count: commentsToImport.length,
        });
        this.config.comments?.importComments(commentsToImport);
        // Notify that comments were imported from storage
        this.callbacks.onCommentsImported?.();
      }

      // If no text differences and no comments, return early
      if (!hasDifference && !hasComments) {
        logger.debug('No differences or comments to restore');
        return;
      }

      // Notify callback to handle element restoration (only if text changed)
      if (hasDifference) {
        logger.info('Restoring draft elements', {
          count: draftPayload.elements.length,
        });
        this.callbacks.onDraftRestored(draftPayload.elements);
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

      if (shouldNotify && (hasDifference || hasComments)) {
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
   * Build session key for tracking draft restoration notifications
   */
  private buildDraftRestoreSessionKey(): string {
    const filename =
      typeof this.config.localPersistence?.getFilename === 'function'
        ? this.config.localPersistence.getFilename()
        : 'review-draft.json';
    return `quarto-review:draft-restored:${filename}`;
  }

  /**
   * Check if persistence is available
   */
  public isAvailable(): boolean {
    return !!this.config.localPersistence;
  }
}
