import { EmbeddedSourceStore } from '@modules/git/fallback';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('LocalDraftPersistence');

export interface LocalDraftPersistenceOptions {
  filename?: string;
  defaultMessage?: string;
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

  public async saveDraft(content: string, message?: string): Promise<void> {
    try {
      await this.store.saveFile(
        this.filename,
        content,
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

  public async loadDraft(): Promise<string | null> {
    try {
      const source = await this.store.getSource(this.filename);
      if (!source) {
        return null;
      }
      return source.content;
    } catch (error) {
      logger.warn('Failed to load local draft', error);
      return null;
    }
  }
}

export default LocalDraftPersistence;
