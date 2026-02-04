import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';
import type { Comment, Operation, GitReviewSession } from '@/types';

const logger = createModuleLogger('LocalDraftPersistence');

export interface LocalDraftPersistenceOptions {
  filename?: string;
  defaultMessage?: string;
}

export interface DraftElementPayload {
  id: string;
  content: string;
  metadata?: unknown;
  sourcePosition?: { line: number; column: number };
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
  private readonly gitSessionFilename: string;

  constructor(
    private readonly store: EmbeddedSourceStore,
    options: LocalDraftPersistenceOptions = {}
  ) {
    this.filename = options.filename ?? 'review-draft.json';
    this.defaultMessage = options.defaultMessage ?? 'Local draft update';
    this.gitSessionFilename = `${this.filename}.git-session`;
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

      logger.info('Saved local draft to EmbeddedSourceStore', {
        filename: this.filename,
        operationCount: operations?.length ?? 0,
        elementCount: elements.length,
        commentCount: comments?.length ?? 0,
        serializedLength: serialized.length,
      });

      // Verify the save by immediately loading it back
      const verification = await this.store.getSource(this.filename);
      if (verification) {
        logger.debug(
          'Draft save verified - file exists in EmbeddedSourceStore',
          {
            filename: this.filename,
            storedLength: verification.content?.length ?? 0,
          }
        );
      } else {
        logger.warn(
          'Draft save verification failed - file not found after save',
          {
            filename: this.filename,
          }
        );
      }
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
      logger.debug('Attempting to load draft', { filename: this.filename });
      const source = await this.store.getSource(this.filename);
      if (!source) {
        // Draft file does not exist - this is normal, return null
        logger.debug('Draft file not found in git-backed storage', {
          filename: this.filename,
        });
        return null;
      }

      logger.debug('Draft file found in git-backed storage', {
        filename: this.filename,
        contentLength: source.content?.length ?? 0,
      });

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

  public async saveGitSession(session: GitReviewSession): Promise<void> {
    try {
      await this.store.saveFile(
        this.gitSessionFilename,
        JSON.stringify(session),
        'Update git review session'
      );
      logger.debug('Saved git review session metadata', {
        filename: this.gitSessionFilename,
      });
    } catch (error) {
      logger.warn('Failed to save git review session metadata', error);
    }
  }

  public async loadGitSession(): Promise<GitReviewSession | null> {
    try {
      const source = await this.store.getSource(this.gitSessionFilename);
      if (!source?.content || !source.content.trim()) {
        return null;
      }
      const parsed = JSON.parse(source.content) as GitReviewSession;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return parsed;
    } catch (error) {
      logger.debug('Failed to load git review session metadata', {
        filename: this.gitSessionFilename,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  public async clearGitSession(): Promise<void> {
    try {
      await this.store.saveFile(
        this.gitSessionFilename,
        '',
        'Clear git review session'
      );
      logger.debug('Cleared git review session metadata', {
        filename: this.gitSessionFilename,
      });
    } catch (error) {
      logger.warn('Failed to clear git review session metadata', error);
    }
  }
}

export default LocalDraftPersistence;
