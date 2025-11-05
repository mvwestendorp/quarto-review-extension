/**
 * Translation Cache Service
 * Shared cache for all translation providers with lifecycle management
 */

import { createModuleLogger } from '@utils/debug';
import type {
  CacheEntry,
  CacheStats,
  TranslationCacheService as ICacheService,
} from '../providers/types';

const logger = createModuleLogger('TranslationCacheService');

/**
 * Cache service configuration
 */
export interface CacheConfig {
  maxSize?: number;
  maxAge?: number; // milliseconds
  storage?: 'memory' | 'localStorage' | 'indexedDB';
  storagePrefix?: string;
  cleanupInterval?: number; // milliseconds
}

/**
 * In-memory translation cache with optional persistence
 */
export class TranslationCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private config: Required<CacheConfig>;
  private cleanupTimer?: number;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      maxAge: config.maxAge ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      storage: config.storage ?? 'memory',
      storagePrefix: config.storagePrefix ?? 'quarto-review:translation:cache:',
      cleanupInterval: config.cleanupInterval ?? 60 * 60 * 1000, // 1 hour
    };

    logger.info('Translation cache service initialized', {
      maxSize: this.config.maxSize,
      maxAge: this.config.maxAge,
      storage: this.config.storage,
    });

    // Load from persistence if enabled
    if (this.config.storage !== 'memory') {
      void this.loadFromStorage();
    }

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Generate cache key from translation parameters
   */
  static generateKey(
    text: string,
    from: string,
    to: string,
    provider: string
  ): string {
    // Use a simple hash of the text + language pair + provider
    const content = `${provider}:${from}:${to}:${text}`;
    return this.simpleHash(content);
  }

  /**
   * Simple hash function for cache keys
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached translation
   */
  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache entry expired', { key, expiresAt: entry.expiresAt });
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit', { key, provider: entry.provider });
    return entry;
  }

  /**
   * Set cached translation
   */
  async set(entry: CacheEntry): Promise<void> {
    // Enforce size limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictOldest();
    }

    // Set expiration if not provided
    if (!entry.expiresAt) {
      entry.expiresAt = Date.now() + this.config.maxAge;
    }

    this.cache.set(entry.key, entry);

    logger.debug('Cache entry set', {
      key: entry.key,
      provider: entry.provider,
      size: this.cache.size,
    });

    // Persist if enabled
    if (this.config.storage !== 'memory') {
      void this.saveToStorage(entry);
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);

    if (deleted) {
      logger.debug('Cache entry deleted', { key });

      // Remove from storage if enabled
      if (this.config.storage !== 'memory') {
        void this.removeFromStorage(key);
      }
    }

    return deleted;
  }

  /**
   * Clear cache (optionally for specific provider)
   */
  async clear(provider?: string): Promise<void> {
    if (!provider) {
      this.cache.clear();
      logger.info('Cache cleared');
    } else {
      const keys = Array.from(this.cache.entries())
        .filter(([_, entry]) => entry.provider === provider)
        .map(([key]) => key);

      keys.forEach((key) => this.cache.delete(key));

      logger.info('Cache cleared for provider', {
        provider,
        entriesRemoved: keys.length,
      });
    }

    // Clear storage if enabled
    if (this.config.storage !== 'memory') {
      void this.clearStorage(provider);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map((e) => e.timestamp);

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? this.stats.hits / (this.stats.hits + this.stats.misses)
          : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern?: string): Promise<number> {
    if (!pattern) {
      const size = this.cache.size;
      await this.clear();
      return size;
    }

    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys()).filter((key) => regex.test(key));

    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }

    logger.info('Cache invalidated', { pattern, entriesRemoved: count });
    return count;
  }

  /**
   * Evict oldest cache entry
   */
  private async evictOldest(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', { key: oldestKey });
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.cleanupTimer = window.setInterval(() => {
      void this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      for (const key of expiredKeys) {
        await this.delete(key);
      }

      logger.info('Cleaned up expired cache entries', {
        count: expiredKeys.length,
      });
    }
  }

  /**
   * Load cache from localStorage
   */
  private async loadFromStorage(): Promise<void> {
    if (typeof window === 'undefined' || this.config.storage === 'memory') {
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.config.storagePrefix)
      );

      let loaded = 0;
      for (const storageKey of keys) {
        const data = localStorage.getItem(storageKey);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);

          // Check if expired
          if (!entry.expiresAt || entry.expiresAt >= Date.now()) {
            this.cache.set(entry.key, entry);
            loaded++;
          } else {
            // Remove expired entry from storage
            localStorage.removeItem(storageKey);
          }
        }
      }

      if (loaded > 0) {
        logger.info('Loaded cache from storage', { entries: loaded });
      }
    } catch (error) {
      logger.warn('Failed to load cache from storage', error);
    }
  }

  /**
   * Save cache entry to localStorage
   */
  private async saveToStorage(entry: CacheEntry): Promise<void> {
    if (typeof window === 'undefined' || this.config.storage === 'memory') {
      return;
    }

    try {
      const storageKey = `${this.config.storagePrefix}${entry.key}`;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      logger.warn('Failed to save cache entry to storage', {
        key: entry.key,
        error,
      });
    }
  }

  /**
   * Remove cache entry from localStorage
   */
  private async removeFromStorage(key: string): Promise<void> {
    if (typeof window === 'undefined' || this.config.storage === 'memory') {
      return;
    }

    try {
      const storageKey = `${this.config.storagePrefix}${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      logger.warn('Failed to remove cache entry from storage', { key, error });
    }
  }

  /**
   * Clear storage
   */
  private async clearStorage(provider?: string): Promise<void> {
    if (typeof window === 'undefined' || this.config.storage === 'memory') {
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.config.storagePrefix)
      );

      if (!provider) {
        // Clear all
        keys.forEach((key) => localStorage.removeItem(key));
      } else {
        // Clear for specific provider
        for (const storageKey of keys) {
          const data = localStorage.getItem(storageKey);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            if (entry.provider === provider) {
              localStorage.removeItem(storageKey);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to clear storage', { provider, error });
    }
  }

  /**
   * Dispose cache service and cleanup
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    logger.info('Translation cache service disposed', {
      finalSize: this.cache.size,
      stats: this.getStats(),
    });
  }
}
