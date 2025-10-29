import { createModuleLogger } from '@utils/debug';

interface HistoryState {
  content: string;
  timestamp: number;
}

interface HistoryData {
  elementId: string;
  states: HistoryState[];
  lastUpdated: number;
}

export interface EditorHistoryStorageOptions {
  prefix: string;
  maxStates: number;
  maxSize: number;
}

export class EditorHistoryStorage {
  private readonly logger = createModuleLogger('EditorHistoryStorage');

  constructor(private readonly options: EditorHistoryStorageOptions) {}

  save(elementId: string, content: string): void {
    if (!elementId) return;

    const history = this.get(elementId);
    history.states.push({ content, timestamp: Date.now() });

    if (history.states.length > this.options.maxStates) {
      history.states.shift();
    }

    history.lastUpdated = Date.now();

    this.persist(elementId, history);
  }

  get(elementId: string): HistoryData {
    try {
      const stored = localStorage.getItem(this.storageKey(elementId));
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryData;
        return {
          elementId,
          states: parsed.states ?? [],
          lastUpdated: parsed.lastUpdated ?? Date.now(),
        };
      }
    } catch (error) {
      this.logger.warn('Failed to retrieve editor history:', error);
    }

    return {
      elementId,
      states: [],
      lastUpdated: Date.now(),
    };
  }

  list(): Array<{
    elementId: string;
    stateCount: number;
    lastUpdated: string;
    size: number;
  }> {
    const results: Array<{
      elementId: string;
      stateCount: number;
      lastUpdated: string;
      size: number;
    }> = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.options.prefix)) {
          continue;
        }
        const stored = localStorage.getItem(key);
        if (!stored) {
          continue;
        }
        try {
          const data = JSON.parse(stored) as HistoryData;
          results.push({
            elementId: data.elementId,
            stateCount: data.states?.length ?? 0,
            lastUpdated: data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString()
              : 'Unknown',
            size: stored.length,
          });
        } catch (parseError) {
          this.logger.warn('Failed to parse stored history', {
            key,
            error: parseError,
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to enumerate editor histories:', error);
    }

    return results;
  }

  clear(elementId: string): void {
    try {
      localStorage.removeItem(this.storageKey(elementId));
      this.logger.debug('Editor history cleared', { elementId });
    } catch (error) {
      this.logger.warn('Failed to clear editor history:', error);
    }
  }

  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.options.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      this.logger.debug('Cleared editor histories', {
        count: keysToRemove.length,
      });
    } catch (error) {
      this.logger.warn('Failed to clear editor histories:', error);
    }
  }

  private persist(elementId: string, history: HistoryData): void {
    try {
      this.store(elementId, history);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.logger.warn('localStorage quota exceeded, pruning histories', {
          elementId,
        });
        this.pruneOldHistories();
        this.store(elementId, history);
      } else {
        this.logger.warn('Failed to save editor history:', error);
      }
    }
  }

  private store(elementId: string, history: HistoryData): void {
    // Enforce max size by pruning oldest half if necessary
    let serialized = JSON.stringify(history);
    if (serialized.length > this.options.maxSize) {
      history.states = history.states.slice(
        Math.floor(history.states.length / 2)
      );
      serialized = JSON.stringify(history);
    }

    localStorage.setItem(this.storageKey(elementId), serialized);
    this.logger.debug('Editor history saved', {
      elementId,
      stateCount: history.states.length,
    });
  }

  private pruneOldHistories(): void {
    try {
      const histories: Array<{ key: string; timestamp: number }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.options.prefix)) continue;

        const stored = localStorage.getItem(key);
        if (!stored) continue;

        try {
          const data = JSON.parse(stored) as HistoryData;
          histories.push({
            key,
            timestamp: data.lastUpdated || 0,
          });
        } catch {
          histories.push({ key, timestamp: 0 });
        }
      }

      histories.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = Math.ceil(histories.length / 2);

      for (let i = 0; i < toRemove; i++) {
        const entry = histories[i];
        if (entry) {
          localStorage.removeItem(entry.key);
        }
      }

      this.logger.debug('Pruned editor histories', {
        removed: toRemove,
        remaining: histories.length - toRemove,
      });
    } catch (error) {
      this.logger.warn('Failed to prune editor histories:', error);
    }
  }

  private storageKey(elementId: string): string {
    return `${this.options.prefix}${elementId}`;
  }
}
