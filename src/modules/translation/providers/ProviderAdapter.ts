/**
 * Provider Adapter
 * Adapts legacy TranslationProvider (v1) to new TranslationProviderV2 interface
 */

import { createModuleLogger } from '@utils/debug';
import type { TranslationProvider } from './base';
import type {
  TranslationProviderV2,
  ProviderInfo,
  ProviderStatus,
  TranslationOptions,
  TranslationResult,
  ProviderInitOptions,
  ProviderCapabilities,
  ProviderBackend,
} from './types';
import type { Language } from '../types';
import { TranslationCacheService } from '../cache/TranslationCacheService';

const logger = createModuleLogger('ProviderAdapter');

/**
 * Adapter configuration for legacy providers
 */
export interface ProviderAdapterConfig {
  name: string;
  displayName: string;
  description: string;
  backend: ProviderBackend;
  version: string;
  capabilities?: Partial<ProviderCapabilities>;
  supportedLanguages?: Language[];
}

/**
 * Adapts legacy TranslationProvider to TranslationProviderV2
 */
export class ProviderAdapter implements TranslationProviderV2 {
  private legacyProvider: TranslationProvider;
  private config: ProviderAdapterConfig;
  private status: ProviderStatus = 'uninitialized';
  private cacheService?: TranslationCacheService;

  constructor(
    legacyProvider: TranslationProvider,
    config: ProviderAdapterConfig
  ) {
    this.legacyProvider = legacyProvider;
    this.config = config;

    logger.info('Provider adapter created', {
      name: config.name,
      legacyName: legacyProvider.name,
    });
  }

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo {
    const defaultCapabilities: ProviderCapabilities = {
      supportsBatch: true,
      supportsStreaming: false,
      supportsConfidence: false,
      supportsContext: false,
      requiresAuth: false,
      isOffline: this.config.backend === 'local',
    };

    return {
      name: this.config.name,
      displayName: this.config.displayName,
      description: this.config.description,
      backend: this.config.backend,
      version: this.config.version,
      capabilities: {
        ...defaultCapabilities,
        ...this.config.capabilities,
      },
      supportedLanguages: this.config.supportedLanguages,
    };
  }

  /**
   * Get current status
   */
  getStatus(): ProviderStatus {
    return this.status;
  }

  /**
   * Check if provider supports language pair
   */
  supports(from: Language, to: Language): boolean {
    return this.legacyProvider.supports(from, to);
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.legacyProvider.isAvailable();
    } catch (error) {
      logger.error('Error checking provider availability', {
        name: this.config.name,
        error,
      });
      return false;
    }
  }

  /**
   * Initialize provider
   */
  async initialize(options?: ProviderInitOptions): Promise<void> {
    if (this.status !== 'uninitialized') {
      logger.warn('Provider already initialized', {
        name: this.config.name,
        status: this.status,
      });
      return;
    }

    this.status = 'initializing';
    logger.info('Initializing provider', { name: this.config.name });

    try {
      // Store cache service if provided
      if (options?.cacheService) {
        this.cacheService = options.cacheService as TranslationCacheService;
      }

      // Call legacy initialize if available
      if (this.legacyProvider.initialize) {
        await this.legacyProvider.initialize();
      }

      // Check availability
      const available = await this.isAvailable();
      this.status = available ? 'ready' : 'unavailable';

      logger.info('Provider initialized', {
        name: this.config.name,
        status: this.status,
      });
    } catch (error) {
      this.status = 'error';
      logger.error('Provider initialization failed', {
        name: this.config.name,
        error,
      });
      throw error;
    }
  }

  /**
   * Translate text with caching
   */
  async translate(
    text: string,
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    const startTime = performance.now();

    // Check cache if enabled
    if (options?.useCache !== false && this.cacheService) {
      const cacheKey =
        options?.cacheKey ??
        TranslationCacheService.generateKey(
          text,
          from,
          to,
          this.config.name
        );

      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for translation', {
          provider: this.config.name,
          key: cacheKey,
        });

        return {
          text: cached.value,
          provider: this.config.name,
          cached: true,
          duration: performance.now() - startTime,
          confidence: cached.metadata?.confidence as number | undefined,
        };
      }

      logger.debug('Cache miss for translation', {
        provider: this.config.name,
        key: cacheKey,
      });
    }

    // Translate using legacy provider
    try {
      const translatedText = await this.legacyProvider.translate(
        text,
        from,
        to
      );

      const duration = performance.now() - startTime;

      // Get confidence if supported
      let confidence: number | undefined;
      if (this.legacyProvider.getConfidence) {
        confidence = this.legacyProvider.getConfidence(translatedText);
      }

      // Cache result if cache service available
      if (
        options?.useCache !== false &&
        this.cacheService &&
        translatedText
      ) {
        const cacheKey =
          options?.cacheKey ??
          TranslationCacheService.generateKey(
            text,
            from,
            to,
            this.config.name
          );

        await this.cacheService.set({
          key: cacheKey,
          value: translatedText,
          provider: this.config.name,
          from,
          to,
          timestamp: Date.now(),
          metadata: { confidence },
        });

        logger.debug('Translation cached', {
          provider: this.config.name,
          key: cacheKey,
        });
      }

      return {
        text: translatedText,
        provider: this.config.name,
        cached: false,
        duration,
        confidence,
      };
    } catch (error) {
      logger.error('Translation failed', {
        provider: this.config.name,
        error,
      });
      throw error;
    }
  }

  /**
   * Translate batch with caching
   */
  async translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];

    // Check cache for all texts if enabled
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    if (options?.useCache !== false && this.cacheService) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = TranslationCacheService.generateKey(
          text,
          from,
          to,
          this.config.name
        );

        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          results[i] = {
            text: cached.value,
            provider: this.config.name,
            cached: true,
            duration: 0,
            confidence: cached.metadata?.confidence as number | undefined,
          };
        } else {
          uncachedIndices.push(i);
          uncachedTexts.push(text);
        }
      }
    } else {
      uncachedIndices.push(...texts.map((_, i) => i));
      uncachedTexts.push(...texts);
    }

    // Translate uncached texts
    if (uncachedTexts.length > 0) {
      const startTime = performance.now();

      try {
        const translations = await this.legacyProvider.translateBatch(
          uncachedTexts,
          from,
          to
        );

        const duration = performance.now() - startTime;
        const avgDuration = duration / translations.length;

        // Process results and cache
        for (let i = 0; i < translations.length; i++) {
          const translatedText = translations[i];
          const originalIndex = uncachedIndices[i];
          const originalText = uncachedTexts[i];

          let confidence: number | undefined;
          if (this.legacyProvider.getConfidence) {
            confidence = this.legacyProvider.getConfidence(translatedText);
          }

          results[originalIndex] = {
            text: translatedText,
            provider: this.config.name,
            cached: false,
            duration: avgDuration,
            confidence,
          };

          // Cache result
          if (
            options?.useCache !== false &&
            this.cacheService &&
            translatedText
          ) {
            const cacheKey = TranslationCacheService.generateKey(
              originalText,
              from,
              to,
              this.config.name
            );

            await this.cacheService.set({
              key: cacheKey,
              value: translatedText,
              provider: this.config.name,
              from,
              to,
              timestamp: Date.now(),
              metadata: { confidence },
            });
          }
        }
      } catch (error) {
        logger.error('Batch translation failed', {
          provider: this.config.name,
          count: uncachedTexts.length,
          error,
        });
        throw error;
      }
    }

    logger.debug('Batch translation completed', {
      provider: this.config.name,
      total: texts.length,
      cached: texts.length - uncachedTexts.length,
      translated: uncachedTexts.length,
    });

    return results;
  }

  /**
   * Dispose provider
   */
  async dispose(): Promise<void> {
    logger.info('Disposing provider', { name: this.config.name });

    try {
      if (this.legacyProvider.destroy) {
        this.legacyProvider.destroy();
      }

      this.status = 'uninitialized';
      this.cacheService = undefined;

      logger.info('Provider disposed', { name: this.config.name });
    } catch (error) {
      logger.error('Error disposing provider', {
        name: this.config.name,
        error,
      });
    }
  }
}
