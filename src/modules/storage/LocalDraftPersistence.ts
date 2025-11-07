import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';
import type { Comment, Operation } from '@/types';

const logger = createModuleLogger('LocalDraftPersistence');

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
      const source = await this.store.getSource(this.filename);
      if (!source) {
        // Draft file does not exist - this is normal, return null
        return null;
      }

      let parsed: DraftPayload;
      try {
        parsed = JSON.parse(source.content) as DraftPayload;
      } catch (parseError) {
        logger.error('Failed to parse draft content as JSON', {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          filename: this.filename,
          contentLength: source.content?.length ?? 0,
          contentPreview: source.content?.substring(0, 100),
          contentType: typeof source.content,
        });
        return null;
      }

      // Validate that parsed data has the expected DraftPayload structure
      if (!parsed || typeof parsed !== 'object') {
        logger.error('Draft payload is not a valid object', {
          filename: this.filename,
          type: typeof parsed,
        });
        return null;
      }

      // Require 'elements' field for valid DraftPayload
      if (!Array.isArray(parsed.elements)) {
        logger.error('Draft payload missing required "elements" array', {
          filename: this.filename,
          hasElements: 'elements' in parsed,
          keys: Object.keys(parsed),
        });
        return null;
      }

      if (parsed.elements.length === 0) {
        logger.debug('Draft has no elements');
        return null;
      }

      logger.debug('Draft loaded successfully', {
        filename: this.filename,
        elementCount: parsed.elements.length,
        operationCount: parsed.operations?.length ?? 0,
        commentCount: parsed.comments?.length ?? 0,
      });

      return parsed;
    } catch (error) {
      logger.warn('Failed to load local draft', error);
      return null;
    }
  }
}

export default LocalDraftPersistence;
