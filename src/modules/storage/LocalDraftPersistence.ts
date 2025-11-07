import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';
import type { Comment, Operation } from '@/types';

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
  operations?: Operation[];
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
    options?:
      | string
      | {
          message?: string;
          comments?: DraftCommentPayload[];
          operations?: Operation[];
        }
  ): Promise<void> {
    try {
      let message = this.defaultMessage;
      let comments: DraftCommentPayload[] | undefined;
      let operations: Operation[] | undefined;

      if (typeof options === 'string') {
        message = options;
      } else if (options) {
        message = options.message ?? this.defaultMessage;
        comments = options.comments;
        operations = options.operations;
      }

      const payload: DraftPayload = {
        savedAt: new Date().toISOString(),
        elements,
        comments,
        operations,
      };

      // Validate that the payload is serializable BEFORE attempting to save
      // This prevents corrupted data from being written to storage
      let serialized: string;
      try {
        serialized = JSON.stringify(payload);
      } catch (jsonError) {
        logger.error('Cannot serialize draft payload - aborting save', {
          error:
            jsonError instanceof Error ? jsonError.message : String(jsonError),
          hasOperations: !!operations,
          operationCount: operations?.length ?? 0,
          hasComments: !!comments,
          commentCount: comments?.length ?? 0,
        });
        // Do not attempt to save if serialization fails
        return;
      }

      await this.store.saveFile(this.filename, serialized, message);
      logger.debug('Saved local draft', {
        filename: this.filename,
        operationCount: operations?.length ?? 0,
      });
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
