/**
 * Mock HTTP Provider
 * Example provider demonstrating v2 interface with simulated HTTP translation
 * Useful for testing and development
 */

import { createModuleLogger } from '@utils/debug';
import type {
  TranslationProviderV2,
  ProviderInfo,
  ProviderStatus,
  TranslationOptions,
  TranslationResult,
  ProviderInitOptions,
  ProviderEventEmitter,
} from './types';
import type { Language } from '../types';
import { TranslationCacheService } from '../cache/TranslationCacheService';

const logger = createModuleLogger('MockHTTPProvider');

/**
 * Mock HTTP provider configuration
 */
export interface MockHTTPConfig {
  baseUrl?: string;
  apiKey?: string;
  latency?: number; // Simulated network latency in ms
  errorRate?: number; // Simulated error rate (0-1)
  maxRetries?: number;
}

/**
 * Mock HTTP Provider for testing and demonstration
 */
export class MockHTTPProvider implements TranslationProviderV2 {
  private config: Required<MockHTTPConfig>;
  private status: ProviderStatus = 'uninitialized';
  private cacheService?: TranslationCacheService;
  private eventEmitter?: ProviderEventEmitter;
  private requestCount = 0;
  private errorCount = 0;

  constructor(config: MockHTTPConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'https://api.mock-translate.example.com',
      apiKey: config.apiKey ?? 'mock-api-key',
      latency: config.latency ?? 100,
      errorRate: config.errorRate ?? 0.05,
      maxRetries: config.maxRetries ?? 3,
    };

    logger.info('Mock HTTP Provider created', {
      baseUrl: this.config.baseUrl,
      latency: this.config.latency,
      errorRate: this.config.errorRate,
    });
  }

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo {
    return {
      name: 'mock-http',
      displayName: 'Mock HTTP Translation',
      description:
        'Mock HTTP translation provider for testing with simulated network latency and errors',
      backend: 'cloud',
      version: '1.0.0',
      author: 'Quarto Review Team',
      capabilities: {
        supportsBatch: true,
        supportsStreaming: false,
        supportsConfidence: true,
        supportsContext: true,
        requiresAuth: true,
        isOffline: false,
        maxBatchSize: 100,
        estimatedCostPerChar: 0.00001, // $0.01 per 1000 chars
      },
    };
  }

  /**
   * Get current status
   */
  getStatus(): ProviderStatus {
    return this.status;
  }

  /**
   * Check language support
   */
  supports(from: Language, to: Language): boolean {
    // Mock provider supports common languages
    const supportedLanguages = ['en', 'nl', 'fr', 'de', 'es', 'it', 'pt'];
    return supportedLanguages.includes(from) && supportedLanguages.includes(to);
  }

  /**
   * Check availability
   */
  async isAvailable(): Promise<boolean> {
    // Simulate API key validation
    return this.config.apiKey !== '' && this.config.apiKey !== 'invalid-key';
  }

  /**
   * Initialize provider
   */
  async initialize(options?: ProviderInitOptions): Promise<void> {
    if (this.status !== 'uninitialized') {
      logger.warn('Provider already initialized', { status: this.status });
      return;
    }

    this.status = 'initializing';
    logger.info('Initializing Mock HTTP Provider');

    try {
      // Store services
      if (options?.cacheService) {
        this.cacheService = options.cacheService as TranslationCacheService;
      }
      if (options?.eventEmitter) {
        this.eventEmitter = options.eventEmitter;
      }

      // Simulate connection test
      await this.simulateLatency(50);

      // Check availability
      const available = await this.isAvailable();
      this.status = available ? 'ready' : 'unavailable';

      if (this.status === 'ready') {
        logger.info('Mock HTTP Provider ready');
        this.emitEvent('provider:ready', {});
      } else {
        logger.warn('Mock HTTP Provider unavailable - invalid API key');
      }
    } catch (error) {
      this.status = 'error';
      this.emitEvent('provider:error', { error });
      logger.error('Initialization failed', error);
      throw error;
    }
  }

  /**
   * Translate single text
   */
  async translate(
    text: string,
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    if (this.status !== 'ready') {
      throw new Error(`Provider not ready (status: ${this.status})`);
    }

    if (!this.supports(from, to)) {
      throw new Error(`Language pair not supported: ${from} → ${to}`);
    }

    const startTime = performance.now();
    this.requestCount++;

    // Emit translation start event
    this.emitEvent('translation:start', {
      from,
      to,
      length: text.length,
    });

    // Check cache
    if (options?.useCache !== false && this.cacheService) {
      const cacheKey =
        options?.cacheKey ??
        TranslationCacheService.generateKey(text, from, to, 'mock-http');

      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.emitEvent('cache:hit', { key: cacheKey });
        logger.debug('Cache hit', { key: cacheKey });

        return {
          text: cached.value,
          provider: 'mock-http',
          cached: true,
          duration: performance.now() - startTime,
          confidence: cached.metadata?.confidence as number,
        };
      }

      this.emitEvent('cache:miss', { key: cacheKey });
    }

    try {
      // Simulate network latency
      await this.simulateLatency();

      // Simulate random errors
      if (Math.random() < this.config.errorRate) {
        this.errorCount++;
        throw new Error('Simulated translation error');
      }

      // Mock translation (simple uppercase transformation for demo)
      const mockTranslation = `[${to.toUpperCase()}] ${text}`;
      const confidence = 0.85 + Math.random() * 0.14; // 0.85-0.99
      const duration = performance.now() - startTime;

      // Cache result
      if (options?.useCache !== false && this.cacheService) {
        const cacheKey =
          options?.cacheKey ??
          TranslationCacheService.generateKey(text, from, to, 'mock-http');

        await this.cacheService.set({
          key: cacheKey,
          value: mockTranslation,
          provider: 'mock-http',
          from,
          to,
          timestamp: Date.now(),
          metadata: { confidence },
        });
      }

      this.emitEvent('translation:complete', {
        from,
        to,
        length: text.length,
        duration,
      });

      logger.debug('Translation completed', {
        length: text.length,
        duration,
        confidence,
      });

      return {
        text: mockTranslation,
        provider: 'mock-http',
        cached: false,
        duration,
        confidence,
      };
    } catch (error) {
      this.emitEvent('translation:error', { error });
      logger.error('Translation failed', error);
      throw error;
    }
  }

  /**
   * Translate batch
   */
  async translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult[]> {
    if (this.status !== 'ready') {
      throw new Error(`Provider not ready (status: ${this.status})`);
    }

    const capabilities = this.getInfo().capabilities;
    if (capabilities.maxBatchSize && texts.length > capabilities.maxBatchSize) {
      throw new Error(
        `Batch size ${texts.length} exceeds maximum ${capabilities.maxBatchSize}`
      );
    }

    logger.info('Starting batch translation', {
      count: texts.length,
      from,
      to,
    });

    const results: TranslationResult[] = [];

    // Check cache for all texts
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    if (options?.useCache !== false && this.cacheService) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = TranslationCacheService.generateKey(
          text,
          from,
          to,
          'mock-http'
        );

        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          results[i] = {
            text: cached.value,
            provider: 'mock-http',
            cached: true,
            duration: 0,
            confidence: cached.metadata?.confidence as number,
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

    logger.debug('Cache check complete', {
      total: texts.length,
      cached: texts.length - uncachedTexts.length,
      toTranslate: uncachedTexts.length,
    });

    // Translate uncached texts
    if (uncachedTexts.length > 0) {
      for (let i = 0; i < uncachedTexts.length; i++) {
        const text = uncachedTexts[i];
        const originalIndex = uncachedIndices[i];

        // Emit progress
        this.emitEvent('translation:progress', {
          current: i + 1,
          total: uncachedTexts.length,
          progress: (i + 1) / uncachedTexts.length,
        });

        try {
          const result = await this.translate(text, from, to, options);
          results[originalIndex] = result;
        } catch (error) {
          // For batch, continue on error but mark as failed
          results[originalIndex] = {
            text: '',
            provider: 'mock-http',
            cached: false,
            duration: 0,
            metadata: { error: String(error) },
          };
        }
      }
    }

    logger.info('Batch translation completed', {
      total: texts.length,
      cached: texts.length - uncachedTexts.length,
      translated: uncachedTexts.length,
    });

    return results;
  }

  /**
   * Estimate translation cost
   */
  estimateCost(textLength: number, from: Language, to: Language): number {
    const costPerChar = this.getInfo().capabilities.estimatedCostPerChar ?? 0;
    return textLength * costPerChar;
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<boolean> {
    return (
      this.config.apiKey !== '' &&
      this.config.apiKey !== 'invalid-key' &&
      this.config.baseUrl.startsWith('http')
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    message?: string;
  }> {
    const startTime = performance.now();

    try {
      await this.simulateLatency(10);
      const latency = performance.now() - startTime;

      return {
        healthy: this.status === 'ready',
        latency,
        message: `Mock provider operational. Requests: ${this.requestCount}, Errors: ${this.errorCount}`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: String(error),
      };
    }
  }

  /**
   * Dispose provider
   */
  async dispose(): Promise<void> {
    logger.info('Disposing Mock HTTP Provider', {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
    });

    this.status = 'uninitialized';
    this.cacheService = undefined;
    this.eventEmitter = undefined;
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Simulate network latency
   */
  private async simulateLatency(ms?: number): Promise<void> {
    const delay = ms ?? this.config.latency;
    const jitter = Math.random() * delay * 0.3; // ±30% jitter
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
  }

  /**
   * Emit provider event
   */
  private emitEvent(event: string, data: Record<string, unknown>): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(event as any, {
        provider: 'mock-http',
        timestamp: Date.now(),
        data,
      });
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate:
        this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
    };
  }
}
