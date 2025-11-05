/**
 * Provider Registry Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProviderRegistry,
  MockHTTPProvider,
  resetGlobalProviderRegistry,
} from '@/modules/translation/providers';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  afterEach(async () => {
    await registry.dispose();
    resetGlobalProviderRegistry();
  });

  describe('registration', () => {
    it('should register a provider', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
        latency: 10,
      });

      await registry.register(provider);

      expect(registry.hasProvider('mock-http')).toBe(true);
      expect(registry.getProviderCount()).toBe(1);
    });

    it('should set first provider as default', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);

      expect(registry.getDefaultProvider()).toBe('mock-http');
    });

    it('should not register same provider twice', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      await registry.register(provider);

      expect(registry.getProviderCount()).toBe(1);
    });

    it('should initialize provider on registration', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
        latency: 10,
      });

      expect(provider.getStatus()).toBe('uninitialized');

      await registry.register(provider);

      expect(provider.getStatus()).toBe('ready');
    });
  });

  describe('unregistration', () => {
    it('should unregister a provider', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      const result = await registry.unregister('mock-http');

      expect(result).toBe(true);
      expect(registry.hasProvider('mock-http')).toBe(false);
    });

    it('should return false for non-existent provider', async () => {
      const result = await registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should update default if default provider unregistered', async () => {
      const provider1 = new MockHTTPProvider({
        apiKey: 'test-key',
      });
      const provider2 = new MockHTTPProvider({
        apiKey: 'test-key-2',
        baseUrl: 'https://api2.example.com',
      });

      await registry.register(provider1);
      await registry.register(provider2);

      expect(registry.getDefaultProvider()).toBe('mock-http');

      await registry.unregister('mock-http');

      expect(registry.getDefaultProvider()).not.toBe('mock-http');
    });
  });

  describe('getProvider', () => {
    it('should get provider by name', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      const retrieved = registry.getProvider('mock-http');

      expect(retrieved).toBe(provider);
    });

    it('should return default provider when no name given', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      const retrieved = registry.getProvider();

      expect(retrieved).toBe(provider);
    });

    it('should return null for non-existent provider', () => {
      const retrieved = registry.getProvider('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('default provider', () => {
    it('should set default provider', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      const result = registry.setDefaultProvider('mock-http');

      expect(result).toBe(true);
      expect(registry.getDefaultProvider()).toBe('mock-http');
    });

    it('should return false when setting non-existent provider as default', () => {
      const result = registry.setDefaultProvider('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('queries', () => {
    it('should get all provider names', async () => {
      const provider1 = new MockHTTPProvider({
        apiKey: 'key1',
        baseUrl: 'https://api1.example.com',
      });
      const provider2 = new MockHTTPProvider({
        apiKey: 'key2',
        baseUrl: 'https://api2.example.com',
      });

      await registry.register(provider1);
      await registry.register(provider2);

      const names = registry.getProviderNames();
      expect(names).toContain('mock-http');
    });

    it('should get providers by status', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);

      const readyProviders = registry.getProvidersByStatus('ready');
      expect(readyProviders).toHaveLength(1);
      expect(readyProviders[0]).toBe(provider);
    });

    it('should get registration info', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });

      await registry.register(provider);
      const registration = registry.getRegistration('mock-http');

      expect(registration).not.toBeNull();
      expect(registration!.provider).toBe(provider);
      expect(registration!.status).toBe('ready');
      expect(registration!.registered).toBeInstanceOf(Date);
    });
  });

  describe('events', () => {
    it('should emit registration event', async () => {
      const listener = vi.fn();
      registry.on('provider:registered', listener);

      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
        latency: 10,
      });
      await registry.register(provider);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mock-http',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should emit ready event', async () => {
      const listener = vi.fn();
      registry.on('provider:ready', listener);

      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
        latency: 10,
      });
      await registry.register(provider);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mock-http',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should emit unregistration event', async () => {
      const listener = vi.fn();
      registry.on('provider:unregistered', listener);

      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });
      await registry.register(provider);
      await registry.unregister('mock-http');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mock-http',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should unsubscribe from events', async () => {
      const listener = vi.fn();
      const unsubscribe = registry.on('provider:registered', listener);

      unsubscribe();

      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });
      await registry.register(provider);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cache', () => {
    it('should provide access to cache service', () => {
      const cacheService = registry.getCacheService();
      expect(cacheService).toBeDefined();
      expect(cacheService.getStats).toBeDefined();
    });

    it('should clear cache', async () => {
      await registry.clearCache();

      const stats = registry.getCacheService().getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('stats', () => {
    it('should provide registry statistics', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });
      await registry.register(provider);

      const stats = registry.getStats();

      expect(stats.totalProviders).toBe(1);
      expect(stats.readyProviders).toBe(1);
      expect(stats.errorProviders).toBe(0);
      expect(stats.defaultProvider).toBe('mock-http');
      expect(stats.cacheStats).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should dispose all providers', async () => {
      const provider = new MockHTTPProvider({
        apiKey: 'test-key',
      });
      await registry.register(provider);

      await registry.dispose();

      expect(registry.getProviderCount()).toBe(0);
      expect(provider.getStatus()).toBe('uninitialized');
    });
  });
});
