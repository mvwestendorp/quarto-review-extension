/**
 * Provider Registry
 * Central registry for managing translation providers with lifecycle and events
 */

import { createModuleLogger } from '@utils/debug';
import type {
  TranslationProviderV2,
  ProviderRegistryConfig,
  ProviderRegistration,
  ProviderStatus,
  ProviderEvent,
  ProviderEventData,
  ProviderEventEmitter,
  TranslationCacheService as ICacheService,
} from './types';
import { TranslationCacheService } from '../cache/TranslationCacheService';

const logger = createModuleLogger('ProviderRegistry');

/**
 * Event emitter for provider events
 */
class SimpleEventEmitter implements ProviderEventEmitter {
  private listeners = new Map<ProviderEvent, Set<(data: ProviderEventData) => void>>();

  emit(event: ProviderEvent, data: ProviderEventData): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in provider event listener for ${event}:`, error);
        }
      });
    }
  }

  on(event: ProviderEvent, listener: (data: ProviderEventData) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: ProviderEvent, listener: (data: ProviderEventData) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

/**
 * Provider Registry manages all translation providers
 */
export class ProviderRegistry {
  private providers = new Map<string, ProviderRegistration>();
  private cacheService: ICacheService;
  private eventEmitter: SimpleEventEmitter;
  private defaultProviderName: string | null = null;
  private config: ProviderRegistryConfig;

  constructor(config: ProviderRegistryConfig = {}) {
    this.config = {
      defaultProvider: config.defaultProvider ?? undefined,
      cacheService: config.cacheService,
      enableEvents: config.enableEvents ?? true,
      debug: config.debug ?? false,
    };

    // Initialize cache service
    this.cacheService =
      config.cacheService ??
      new TranslationCacheService({
        storage: 'localStorage',
        maxSize: 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

    // Initialize event emitter
    this.eventEmitter = new SimpleEventEmitter();

    if (config.defaultProvider) {
      this.defaultProviderName = config.defaultProvider;
    }

    logger.info('Provider registry initialized', {
      defaultProvider: this.defaultProviderName,
      enableEvents: this.config.enableEvents,
    });
  }

  /**
   * Register a new provider
   */
  async register(provider: TranslationProviderV2): Promise<void> {
    const info = provider.getInfo();

    if (this.providers.has(info.name)) {
      logger.warn('Provider already registered', { name: info.name });
      return;
    }

    // Create registration
    const registration: ProviderRegistration = {
      provider,
      registered: new Date(),
      status: provider.getStatus(),
    };

    this.providers.set(info.name, registration);

    // Emit registration event
    if (this.config.enableEvents) {
      this.eventEmitter.emit('provider:registered', {
        provider: info.name,
        timestamp: Date.now(),
        data: { info, status: registration.status },
      });
    }

    logger.info('Provider registered', {
      name: info.name,
      backend: info.backend,
      status: registration.status,
    });

    // Set as default if none set
    if (!this.defaultProviderName) {
      this.defaultProviderName = info.name;
      logger.info('Set default provider', { name: info.name });
    }

    // Initialize if not already initialized
    if (provider.getStatus() === 'uninitialized') {
      try {
        await provider.initialize({
          cacheService: this.cacheService,
          eventEmitter: this.eventEmitter,
        });

        registration.status = provider.getStatus();

        if (this.config.enableEvents) {
          this.eventEmitter.emit('provider:ready', {
            provider: info.name,
            timestamp: Date.now(),
            data: { status: registration.status },
          });
        }

        logger.info('Provider initialized', {
          name: info.name,
          status: registration.status,
        });
      } catch (error) {
        registration.status = 'error';

        if (this.config.enableEvents) {
          this.eventEmitter.emit('provider:error', {
            provider: info.name,
            timestamp: Date.now(),
            data: { error: error instanceof Error ? error.message : String(error) },
          });
        }

        logger.error('Provider initialization failed', {
          name: info.name,
          error,
        });
      }
    }
  }

  /**
   * Unregister a provider
   */
  async unregister(name: string): Promise<boolean> {
    const registration = this.providers.get(name);
    if (!registration) {
      return false;
    }

    // Dispose provider
    try {
      await registration.provider.dispose();
    } catch (error) {
      logger.error('Error disposing provider', { name, error });
    }

    // Remove from registry
    this.providers.delete(name);

    // Emit event
    if (this.config.enableEvents) {
      this.eventEmitter.emit('provider:unregistered', {
        provider: name,
        timestamp: Date.now(),
      });
    }

    logger.info('Provider unregistered', { name });

    // Update default if needed
    if (this.defaultProviderName === name) {
      const remaining = Array.from(this.providers.keys());
      this.defaultProviderName =
        remaining.length > 0 ? (remaining[0] ?? null) : null;
      logger.info('Default provider changed', {
        newDefault: this.defaultProviderName,
      });
    }

    return true;
  }

  /**
   * Get provider by name
   */
  getProvider(name?: string): TranslationProviderV2 | null {
    const providerName = name ?? this.defaultProviderName;
    if (!providerName) {
      return null;
    }

    const registration = this.providers.get(providerName);
    return registration ? registration.provider : null;
  }

  /**
   * Get provider registration info
   */
  getRegistration(name: string): ProviderRegistration | null {
    return this.providers.get(name) ?? null;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all provider registrations
   */
  getAllRegistrations(): Map<string, ProviderRegistration> {
    return new Map(this.providers);
  }

  /**
   * Get default provider name
   */
  getDefaultProvider(): string | null {
    return this.defaultProviderName;
  }

  /**
   * Set default provider
   */
  setDefaultProvider(name: string): boolean {
    if (!this.providers.has(name)) {
      logger.warn('Cannot set default provider - not registered', { name });
      return false;
    }

    this.defaultProviderName = name;
    logger.info('Default provider changed', { name });
    return true;
  }

  /**
   * Check if provider is registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Get providers by status
   */
  getProvidersByStatus(status: ProviderStatus): TranslationProviderV2[] {
    return Array.from(this.providers.values())
      .filter((reg) => reg.provider.getStatus() === status)
      .map((reg) => reg.provider);
  }

  /**
   * Get cache service
   */
  getCacheService(): ICacheService {
    return this.cacheService;
  }

  /**
   * Get event emitter for subscribing to provider events
   */
  getEventEmitter(): SimpleEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Subscribe to provider events
   */
  on(event: ProviderEvent, listener: (data: ProviderEventData) => void): () => void {
    this.eventEmitter.on(event, listener);

    // Return unsubscribe function
    return () => {
      this.eventEmitter.off(event, listener);
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalProviders: number;
    readyProviders: number;
    errorProviders: number;
    defaultProvider: string | null;
    cacheStats: ReturnType<TranslationCacheService['getStats']>;
  } {
    const readyProviders = this.getProvidersByStatus('ready').length;
    const errorProviders = this.getProvidersByStatus('error').length;

    return {
      totalProviders: this.providers.size,
      readyProviders,
      errorProviders,
      defaultProvider: this.defaultProviderName,
      cacheStats: this.cacheService.getStats(),
    };
  }

  /**
   * Clear cache for all or specific provider
   */
  async clearCache(provider?: string): Promise<void> {
    await this.cacheService.clear(provider);

    if (this.config.enableEvents) {
      this.eventEmitter.emit('cache:invalidate', {
        provider: provider ?? 'all',
        timestamp: Date.now(),
      });
    }

    logger.info('Cache cleared', { provider: provider ?? 'all' });
  }

  /**
   * Dispose registry and cleanup all providers
   */
  async dispose(): Promise<void> {
    logger.info('Disposing provider registry', {
      providerCount: this.providers.size,
    });

    // Dispose all providers
    const disposePromises = Array.from(this.providers.values()).map((reg) =>
      reg.provider.dispose().catch((error) => {
        logger.error('Error disposing provider', {
          provider: reg.provider.getInfo().name,
          error,
        });
      })
    );

    await Promise.all(disposePromises);

    // Dispose cache service
    this.cacheService.dispose();

    // Clear event listeners
    this.eventEmitter.removeAllListeners();

    // Clear registry
    this.providers.clear();
    this.defaultProviderName = null;

    logger.info('Provider registry disposed');
  }
}

/**
 * Create a global provider registry instance
 */
let globalRegistry: ProviderRegistry | null = null;

/**
 * Get or create global provider registry
 */
export function getGlobalProviderRegistry(
  config?: ProviderRegistryConfig
): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry(config);
  }
  return globalRegistry;
}

/**
 * Reset global provider registry (for testing)
 */
export function resetGlobalProviderRegistry(): void {
  if (globalRegistry) {
    void globalRegistry.dispose();
    globalRegistry = null;
  }
}
