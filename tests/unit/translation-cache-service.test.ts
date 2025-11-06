/**
 * Translation Cache Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationCacheService } from '@/modules/translation/cache/TranslationCacheService';
import type { CacheEntry } from '@/modules/translation/providers/types';

describe('TranslationCacheService', () => {
  let cache: TranslationCacheService;

  beforeEach(() => {
    cache = new TranslationCacheService({
      storage: 'memory',
      maxSize: 10,
      maxAge: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = TranslationCacheService.generateKey(
        'Hello',
        'en',
        'nl',
        'openai'
      );
      const key2 = TranslationCacheService.generateKey(
        'Hello',
        'en',
        'nl',
        'openai'
      );
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = TranslationCacheService.generateKey(
        'Hello',
        'en',
        'nl',
        'openai'
      );
      const key2 = TranslationCacheService.generateKey(
        'Goodbye',
        'en',
        'nl',
        'openai'
      );
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different providers', () => {
      const key1 = TranslationCacheService.generateKey(
        'Hello',
        'en',
        'nl',
        'openai'
      );
      const key2 = TranslationCacheService.generateKey(
        'Hello',
        'en',
        'nl',
        'local'
      );
      expect(key1).not.toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve cache entry', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      };

      await cache.set(entry);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toEqual(entry);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      await cache.set(entry);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toBeNull();
    });

    it('should set expiration if not provided', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      };

      await cache.set(entry);
      const retrieved = await cache.get('test-key');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      };

      await cache.set(entry);
      const exists = await cache.has('test-key');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cache.has('non-existent');
      expect(exists).toBe(false);
    });

    it('should return false for expired key', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
        expiresAt: Date.now() - 1000,
      };

      await cache.set(entry);
      const exists = await cache.has('test-key');

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing entry', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      };

      await cache.set(entry);
      const deleted = await cache.delete('test-key');

      expect(deleted).toBe(true);
      expect(await cache.has('test-key')).toBe(false);
    });

    it('should return false for non-existent entry', async () => {
      const deleted = await cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set({
        key: 'key1',
        value: 'value1',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });
      await cache.set({
        key: 'key2',
        value: 'value2',
        provider: 'local',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });

      await cache.clear();
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
    });

    it('should clear entries for specific provider', async () => {
      await cache.set({
        key: 'key1',
        value: 'value1',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });
      await cache.set({
        key: 'key2',
        value: 'value2',
        provider: 'local',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });

      await cache.clear('openai');

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(true);
    });
  });

  describe('stats', () => {
    it('should track cache hits and misses', async () => {
      const entry: CacheEntry = {
        key: 'test-key',
        value: 'translated text',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      };

      await cache.set(entry);

      await cache.get('test-key'); // Hit
      await cache.get('non-existent'); // Miss
      await cache.get('test-key'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track cache size', async () => {
      await cache.set({
        key: 'key1',
        value: 'value1',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });
      await cache.set({
        key: 'key2',
        value: 'value2',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('size limits', () => {
    it('should evict oldest entry when size limit reached', async () => {
      // Cache max size is 10
      for (let i = 0; i < 11; i++) {
        await cache.set({
          key: `key${i}`,
          value: `value${i}`,
          provider: 'openai',
          from: 'en',
          to: 'nl',
          timestamp: Date.now() + i, // Newer entries have higher timestamp
        });
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(10);

      // Oldest entry (key0) should be evicted
      expect(await cache.has('key0')).toBe(false);
      expect(await cache.has('key10')).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should invalidate all entries when no pattern given', async () => {
      await cache.set({
        key: 'key1',
        value: 'value1',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });
      await cache.set({
        key: 'key2',
        value: 'value2',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });

      const count = await cache.invalidate();

      expect(count).toBe(2);
      expect(cache.getStats().size).toBe(0);
    });

    it('should invalidate entries matching pattern', async () => {
      await cache.set({
        key: 'openai-key1',
        value: 'value1',
        provider: 'openai',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });
      await cache.set({
        key: 'local-key2',
        value: 'value2',
        provider: 'local',
        from: 'en',
        to: 'nl',
        timestamp: Date.now(),
      });

      const count = await cache.invalidate('openai');

      expect(count).toBe(1);
      expect(await cache.has('openai-key1')).toBe(false);
      expect(await cache.has('local-key2')).toBe(true);
    });
  });
});
