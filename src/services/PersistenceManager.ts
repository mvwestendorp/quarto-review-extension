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
      const payload = elements.map((elem) => ({
        id: elem.id,
        content: elem.content,
        metadata: elem.metadata,
      }));
      const commentsSnapshot =
        typeof this.config.comments?.getAllComments === 'function'
          ? this.config.comments.getAllComments()
          : undefined;
      void this.config.localPersistence.saveDraft(payload, {
        message,
        comments: commentsSnapshot,
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
        return;
      }
      const currentState = this.config.changes.getCurrentState();
      if (currentState.length === 0) {
        return;
      }

      const currentMap = new Map(
        currentState.map((elem) => [elem.id, elem.content])
      );

      const hasDifference = draftPayload.elements.some((entry) => {
        const currentContent = currentMap.get(entry.id);
        return currentContent !== entry.content;
      });

      // Import comments first (even if no text changes)
      const hasComments =
        typeof this.config.comments?.importComments === 'function' &&
        Array.isArray(draftPayload.comments) &&
        draftPayload.comments.length > 0;

      if (hasComments) {
        const commentsToImport = draftPayload.comments ?? [];
        this.config.comments?.importComments(commentsToImport);
        // Notify that comments were imported from storage
        this.callbacks.onCommentsImported?.();
      }

      // If no text differences and no comments, return early
      if (!hasDifference && !hasComments) {
        return;
      }

      // Notify callback to handle element restoration (only if text changed)
      if (hasDifference) {
        this.callbacks.onDraftRestored(draftPayload.elements);
      }

      this.callbacks.refresh();

      const sessionKey = this.buildDraftRestoreSessionKey();
      const sessionStorage =
        typeof window !== 'undefined' ? window.sessionStorage : null;
      const shouldNotify = sessionStorage
        ? !sessionStorage.getItem(sessionKey)
        : true;

      if (shouldNotify) {
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
