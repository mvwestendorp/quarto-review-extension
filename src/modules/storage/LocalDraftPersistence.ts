import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';

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

interface DraftPayload {
  savedAt: string;
  elements: DraftElementPayload[];
}

export class LocalDraftPersistence {
  private readonly filename: string;
  private readonly defaultMessage: string;

  constructor(
    private readonly store: EmbeddedSourceStore,
    options: LocalDraftPersistenceOptions = {}
  ) {
    this.filename = options.filename ?? 'document.qmd';
    this.defaultMessage = options.defaultMessage ?? 'Local draft update';
  }

  public async saveDraft(
    elements: DraftElementPayload[],
    message?: string
  ): Promise<void> {
    try {
      const payload: DraftPayload = {
        savedAt: new Date().toISOString(),
        elements,
      };
      const serialized = JSON.stringify(payload);
      await this.store.saveFile(
        this.filename,
        serialized,
        message ?? this.defaultMessage
      );
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
      const source = await this.store.getSource(this.filename);
      if (!source) {
        return null;
      }
      const parsed = JSON.parse(source.content) as DraftPayload;
      if (!parsed?.elements?.length) {
        return null;
      }
      return parsed;
    } catch (error) {
      logger.warn('Failed to load local draft', error);
      return null;
    }
  }
}

export default LocalDraftPersistence;
