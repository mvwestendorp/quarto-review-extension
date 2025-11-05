import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';
import type { Comment } from '@/types';

const logger = createModuleLogger('LocalDraftPersistence');
const LEGACY_DRAFT_FILENAME = 'document.qmd';

export interface LocalDraftPersistenceOptions {
  filename?: string;
  defaultMessage?: string;
}

export interface DraftElementPayload {
  id: string;
  content: string;
  metadata?: unknown;
}

export type DraftCommentPayload = Comment;

interface DraftPayload {
  savedAt: string;
  elements: DraftElementPayload[];
  comments?: DraftCommentPayload[];
}

export class LocalDraftPersistence {
  private readonly filename: string;
  private readonly defaultMessage: string;

  constructor(
    private readonly store: EmbeddedSourceStore,
    options: LocalDraftPersistenceOptions = {}
  ) {
    this.filename = options.filename ?? 'review-draft.json';
    this.defaultMessage = options.defaultMessage ?? 'Local draft update';
  }

  public getFilename(): string {
    return this.filename;
  }

  public async saveDraft(
    elements: DraftElementPayload[],
    options?: string | { message?: string; comments?: DraftCommentPayload[] }
  ): Promise<void> {
    try {
      let message = this.defaultMessage;
      let comments: DraftCommentPayload[] | undefined;

      if (typeof options === 'string') {
        message = options;
      } else if (options) {
        message = options.message ?? this.defaultMessage;
        comments = options.comments;
      }

      const payload: DraftPayload = {
        savedAt: new Date().toISOString(),
        elements,
        comments,
      };
      const serialized = JSON.stringify(payload);
      await this.store.saveFile(this.filename, serialized, message);
      logger.debug('Saved local draft', { filename: this.filename });
    } catch (error) {
      logger.warn('Failed to persist local draft', error);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      await this.store.clearAll();
      logger.info('Cleared local draft cache');
    } catch (error) {
      logger.warn('Failed to clear local drafts', error);
    }
  }

  public async loadDraft(): Promise<DraftPayload | null> {
    try {
      let source = await this.store.getSource(this.filename);
      let migratedFromLegacy = false;
      if (!source) {
        source = await this.store.getSource(LEGACY_DRAFT_FILENAME);
        if (!source) {
          return null;
        }
        migratedFromLegacy = true;
      }
      const parsed = JSON.parse(source.content) as DraftPayload;
      if (!parsed?.elements?.length) {
        return null;
      }

      if (migratedFromLegacy) {
        try {
          await this.store.saveFile(
            this.filename,
            source.content,
            source.commitMessage ?? this.defaultMessage
          );
        } catch (migrationError) {
          logger.warn('Failed to migrate legacy draft storage', migrationError);
        }
      }
      return parsed;
    } catch (error) {
      logger.warn('Failed to load local draft', error);
      return null;
    }
  }
}

export default LocalDraftPersistence;
