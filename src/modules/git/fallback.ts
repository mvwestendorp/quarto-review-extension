import { createModuleLogger } from '@utils/debug';

export interface EmbeddedSourceRecord {
  filename: string;
  content: string;
  originalContent: string;
  lastModified: string;
  version: string;
  commitMessage?: string;
}

interface PersistedSourcePayload {
  timestamp: string;
  version?: string;
  sources: Record<string, EmbeddedSourcePersisted>;
}

interface EmbeddedSourcePersisted {
  content: string;
  originalContent: string;
  lastModified: string;
  version: string;
  commitMessage?: string;
}

interface SaveResult {
  version: string;
  timestamp: string;
}

const STORAGE_KEY_DEFAULT = 'quarto-review:embedded-sources';
const EMBEDDED_SOURCES_ID = 'embedded-sources';

/**
 * Provides a lightweight persistence layer when no git provider is configured.
 * Sources are cached inside the rendered HTML and mirrored to localStorage so
 * that refreshes do not lose edits.
 */
export class EmbeddedSourceStore {
  private readonly logger = createModuleLogger('EmbeddedSourceStore');
  private readonly storageKey: string;
  private readonly storage: Storage | null;
  private readonly sources = new Map<string, EmbeddedSourceRecord>();
  private readonly readyPromise: Promise<void>;

  constructor(options?: { storageKey?: string }) {
    this.storageKey = options?.storageKey ?? STORAGE_KEY_DEFAULT;
    this.storage = this.resolveLocalStorage();
    this.readyPromise = this.initialize();
  }

  /**
   * Exposes a promise that resolves when initial data loading has completed.
   */
  public get ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Returns a read-only list of embedded sources currently tracked.
   */
  public async listSources(): Promise<EmbeddedSourceRecord[]> {
    await this.readyPromise;
    return Array.from(this.sources.values()).map((record) => ({
      ...record,
    }));
  }

  public async getSource(
    filename: string
  ): Promise<EmbeddedSourceRecord | undefined> {
    await this.readyPromise;
    const record = this.sources.get(filename);
    if (!record) {
      this.logger.debug('Source file not found in store', {
        filename,
        availableFiles: Array.from(this.sources.keys()),
      });
    } else {
      this.logger.debug('Source file found in store', {
        filename,
        contentLength: record.content?.length ?? 0,
      });
    }
    return record ? { ...record } : undefined;
  }

  public async saveFile(
    filename: string,
    content: string,
    message = 'Update file'
  ): Promise<SaveResult> {
    await this.readyPromise;

    const timestamp = new Date().toISOString();
    const version = this.generateVersionId();
    const existing = this.sources.get(filename);

    this.sources.set(filename, {
      filename,
      content,
      originalContent: existing?.originalContent ?? content,
      lastModified: timestamp,
      version,
      commitMessage: message,
    });

    this.updateEmbeddedSources();
    this.saveToLocalStorage();

    return { version, timestamp };
  }

  public async clearLocalCache(): Promise<void> {
    await this.readyPromise;
    if (!this.storage) return;
    this.storage.removeItem(this.storageKey);
  }

  public async clearAll(): Promise<void> {
    await this.readyPromise;
    this.sources.clear();
    this.updateEmbeddedSources();
    if (this.storage) {
      this.storage.removeItem(this.storageKey);
    }
  }

  private async initialize(): Promise<void> {
    this.loadFromDocument();
    this.loadFromLocalStorage();
  }

  private loadFromDocument(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const script = document.getElementById(EMBEDDED_SOURCES_ID);
    if (!script || !script.textContent) {
      return;
    }

    try {
      const payload = JSON.parse(script.textContent) as PersistedSourcePayload;
      if (payload?.sources) {
        Object.entries(payload.sources).forEach(([filename, data]) => {
          this.sources.set(filename, {
            filename,
            content: data.content,
            originalContent: data.originalContent ?? data.content,
            lastModified: data.lastModified ?? payload.timestamp,
            version:
              data.version ?? payload.version ?? this.generateVersionId(),
            commitMessage: data.commitMessage,
          });
        });
      }
      this.logger.debug(
        'Loaded embedded sources from document',
        this.sources.size
      );
    } catch (error) {
      this.logger.warn('Failed to parse embedded sources in document:', error);
    }
  }

  private loadFromLocalStorage(): void {
    if (!this.storage) return;
    const raw = this.storage.getItem(this.storageKey);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as PersistedSourcePayload;
      if (!payload?.sources) return;

      Object.entries(payload.sources).forEach(([filename, data]) => {
        const existing = this.sources.get(filename);
        if (!existing) {
          this.sources.set(filename, {
            filename,
            content: data.content,
            originalContent: data.originalContent ?? data.content,
            lastModified: data.lastModified,
            version: data.version,
            commitMessage: data.commitMessage,
          });
          return;
        }

        // Prefer whichever record is newer
        if (
          new Date(data.lastModified).getTime() >
          new Date(existing.lastModified).getTime()
        ) {
          this.sources.set(filename, {
            filename,
            content: data.content,
            originalContent: existing.originalContent,
            lastModified: data.lastModified,
            version: data.version,
            commitMessage: data.commitMessage ?? existing.commitMessage,
          });
        }
      });

      this.logger.debug(
        'Merged embedded sources from localStorage',
        Object.keys(payload.sources).length
      );
    } catch (error) {
      this.logger.warn(
        'Failed to parse embedded sources from localStorage:',
        error
      );
    }
  }

  private updateEmbeddedSources(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const payload: PersistedSourcePayload = {
      timestamp: new Date().toISOString(),
      sources: {},
      version: this.generateVersionId(),
    };

    this.sources.forEach((record, filename) => {
      payload.sources[filename] = {
        content: record.content,
        originalContent: record.originalContent,
        lastModified: record.lastModified,
        version: record.version,
        commitMessage: record.commitMessage,
      };
    });

    const script = this.ensureEmbeddedScript();
    script.textContent = JSON.stringify(payload, null, 2);
  }

  private saveToLocalStorage(): void {
    if (!this.storage) return;
    const payload: PersistedSourcePayload = {
      timestamp: new Date().toISOString(),
      sources: {},
    };

    this.sources.forEach((record, filename) => {
      payload.sources[filename] = {
        content: record.content,
        originalContent: record.originalContent,
        lastModified: record.lastModified,
        version: record.version,
        commitMessage: record.commitMessage,
      };
    });

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (error) {
      this.logger.warn(
        'Failed to persist embedded sources to localStorage:',
        error
      );
    }
  }

  private ensureEmbeddedScript(): HTMLScriptElement {
    let script = document.getElementById(
      EMBEDDED_SOURCES_ID
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = EMBEDDED_SOURCES_ID;
      script.type = 'application/json';
      document.body.appendChild(script);
    }
    return script;
  }

  private resolveLocalStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (error) {
      this.logger.debug('localStorage unavailable:', error);
    }
    return null;
  }

  private generateVersionId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
