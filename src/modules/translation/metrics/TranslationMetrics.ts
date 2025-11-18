/**
 * Translation Metrics
 *
 * Structured metrics for translation operations, provider performance,
 * cache effectiveness, and user interactions.
 *
 * Provides optional analytics hook for integration with monitoring systems
 * like Prometheus, Google Analytics, or custom dashboards.
 */

import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('TranslationMetrics');

/**
 * Metric event types
 */
export type MetricEventType =
  | 'translation.started'
  | 'translation.completed'
  | 'translation.failed'
  | 'translation.cancelled'
  | 'cache.hit'
  | 'cache.miss'
  | 'cache.write'
  | 'provider.initialized'
  | 'provider.failed'
  | 'sentence.edited'
  | 'export.started'
  | 'export.completed'
  | 'export.failed';

/**
 * Metric event data
 */
export interface MetricEvent {
  type: MetricEventType;
  timestamp: number;
  data?: Record<string, any>;
}

/**
 * Translation operation metrics
 */
export interface TranslationOperationMetrics {
  provider: string;
  sentenceCount: number;
  duration: number;
  success: boolean;
  errorType?: string;
  fromLanguage: string;
  toLanguage: string;
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  hitRate: number;
  averageLookupTime: number;
}

/**
 * Provider performance metrics
 */
export interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

/**
 * User interaction metrics
 */
export interface UserInteractionMetrics {
  manualEdits: number;
  autoTranslations: number;
  exportsCount: number;
  averageEditDuration: number;
}

/**
 * Aggregate metrics summary
 */
export interface MetricsSummary {
  translation: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
  };
  cache: CacheMetrics;
  providers: Record<string, ProviderMetrics>;
  userInteractions: UserInteractionMetrics;
}

/**
 * Analytics hook callback type
 */
export type AnalyticsHook = (event: MetricEvent) => void;

/**
 * Translation Metrics Service
 *
 * Tracks translation performance, cache effectiveness, and user behavior.
 * Provides optional analytics integration.
 */
export class TranslationMetrics {
  private static instance: TranslationMetrics | null = null;
  private analyticsHook: AnalyticsHook | null = null;
  private events: MetricEvent[] = [];
  private maxEvents = 1000; // Limit stored events to prevent memory growth

  // Counters
  private counters = {
    translationStarted: 0,
    translationCompleted: 0,
    translationFailed: 0,
    translationCancelled: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheWrites: 0,
    manualEdits: 0,
    exportsCompleted: 0,
  };

  // Latency tracking (for percentile calculations)
  private latencies: Map<string, number[]> = new Map();
  private cacheLookupTimes: number[] = [];

  private constructor() {
    logger.debug('TranslationMetrics initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TranslationMetrics {
    if (!TranslationMetrics.instance) {
      TranslationMetrics.instance = new TranslationMetrics();
    }
    return TranslationMetrics.instance;
  }

  /**
   * Set analytics hook for external integrations
   *
   * @example
   * // Google Analytics integration
   * metrics.setAnalyticsHook((event) => {
   *   gtag('event', event.type, event.data);
   * });
   *
   * @example
   * // Custom analytics
   * metrics.setAnalyticsHook((event) => {
   *   fetch('/api/analytics', {
   *     method: 'POST',
   *     body: JSON.stringify(event)
   *   });
   * });
   */
  public setAnalyticsHook(hook: AnalyticsHook | null): void {
    this.analyticsHook = hook;
    logger.debug('Analytics hook configured', { enabled: hook !== null });
  }

  /**
   * Record a metric event
   */
  private recordEvent(type: MetricEventType, data?: Record<string, any>): void {
    const event: MetricEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    // Store event (with size limit)
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Send to analytics hook if configured
    if (this.analyticsHook) {
      try {
        this.analyticsHook(event);
      } catch (error) {
        logger.error('Analytics hook error:', error);
      }
    }

    logger.debug('Metric recorded', { type, data });
  }

  /**
   * Track translation operation started
   */
  public trackTranslationStarted(
    provider: string,
    sentenceCount: number,
    fromLanguage: string,
    toLanguage: string
  ): void {
    this.counters.translationStarted++;
    this.recordEvent('translation.started', {
      provider,
      sentenceCount,
      fromLanguage,
      toLanguage,
    });
  }

  /**
   * Track translation operation completed
   */
  public trackTranslationCompleted(
    metrics: TranslationOperationMetrics
  ): void {
    this.counters.translationCompleted++;

    // Track latency for provider
    if (!this.latencies.has(metrics.provider)) {
      this.latencies.set(metrics.provider, []);
    }
    const providerLatencies = this.latencies.get(metrics.provider);
    if (providerLatencies) {
      providerLatencies.push(metrics.duration);
      // Limit latency array size
      if (providerLatencies.length > 100) {
        providerLatencies.shift();
      }
    }

    this.recordEvent('translation.completed', metrics);
  }

  /**
   * Track translation operation failed
   */
  public trackTranslationFailed(
    provider: string,
    errorType: string,
    sentenceCount: number
  ): void {
    this.counters.translationFailed++;
    this.recordEvent('translation.failed', {
      provider,
      errorType,
      sentenceCount,
    });
  }

  /**
   * Track translation operation cancelled
   */
  public trackTranslationCancelled(provider: string, sentenceCount: number): void {
    this.counters.translationCancelled++;
    this.recordEvent('translation.cancelled', { provider, sentenceCount });
  }

  /**
   * Track cache hit
   */
  public trackCacheHit(lookupTime?: number): void {
    this.counters.cacheHits++;
    if (lookupTime !== undefined) {
      this.cacheLookupTimes.push(lookupTime);
      if (this.cacheLookupTimes.length > 100) {
        this.cacheLookupTimes.shift();
      }
    }
    this.recordEvent('cache.hit', { lookupTime });
  }

  /**
   * Track cache miss
   */
  public trackCacheMiss(lookupTime?: number): void {
    this.counters.cacheMisses++;
    if (lookupTime !== undefined) {
      this.cacheLookupTimes.push(lookupTime);
      if (this.cacheLookupTimes.length > 100) {
        this.cacheLookupTimes.shift();
      }
    }
    this.recordEvent('cache.miss', { lookupTime });
  }

  /**
   * Track cache write
   */
  public trackCacheWrite(): void {
    this.counters.cacheWrites++;
    this.recordEvent('cache.write');
  }

  /**
   * Track manual sentence edit
   */
  public trackManualEdit(sentenceId: string): void {
    this.counters.manualEdits++;
    this.recordEvent('sentence.edited', { sentenceId, method: 'manual' });
  }

  /**
   * Track export operation
   */
  public trackExportStarted(format: string): void {
    this.recordEvent('export.started', { format });
  }

  /**
   * Track export completed
   */
  public trackExportCompleted(format: string, sentenceCount: number): void {
    this.counters.exportsCompleted++;
    this.recordEvent('export.completed', { format, sentenceCount });
  }

  /**
   * Track export failed
   */
  public trackExportFailed(format: string, errorType: string): void {
    this.recordEvent('export.failed', { format, errorType });
  }

  /**
   * Get cache metrics
   */
  public getCacheMetrics(): CacheMetrics {
    const total = this.counters.cacheHits + this.counters.cacheMisses;
    const hitRate = total > 0 ? this.counters.cacheHits / total : 0;
    const avgLookupTime =
      this.cacheLookupTimes.length > 0
        ? this.cacheLookupTimes.reduce((a, b) => a + b, 0) / this.cacheLookupTimes.length
        : 0;

    return {
      hits: this.counters.cacheHits,
      misses: this.counters.cacheMisses,
      writes: this.counters.cacheWrites,
      hitRate,
      averageLookupTime: avgLookupTime,
    };
  }

  /**
   * Get provider metrics
   */
  public getProviderMetrics(provider: string): ProviderMetrics | null {
    const latencies = this.latencies.get(provider);
    if (!latencies || latencies.length === 0) {
      return null;
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const total = sorted.reduce((a, b) => a + b, 0);
    const avgLatency = total / sorted.length;

    // Calculate percentiles
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    // Count successes and failures from events
    const providerEvents = this.events.filter(
      (e) =>
        e.data?.provider === provider &&
        (e.type === 'translation.completed' || e.type === 'translation.failed')
    );
    const successful = providerEvents.filter(
      (e) => e.type === 'translation.completed'
    ).length;
    const failed = providerEvents.filter(
      (e) => e.type === 'translation.failed'
    ).length;

    return {
      provider,
      totalRequests: successful + failed,
      successfulRequests: successful,
      failedRequests: failed,
      averageLatency: avgLatency,
      p50Latency: p50,
      p95Latency: p95,
      p99Latency: p99,
    };
  }

  /**
   * Get metrics summary
   */
  public getSummary(): MetricsSummary {
    const providerMetrics: Record<string, ProviderMetrics> = {};
    for (const provider of this.latencies.keys()) {
      const metrics = this.getProviderMetrics(provider);
      if (metrics) {
        providerMetrics[provider] = metrics;
      }
    }

    return {
      translation: {
        totalOperations: this.counters.translationStarted,
        successfulOperations: this.counters.translationCompleted,
        failedOperations: this.counters.translationFailed,
        averageDuration: this.calculateAverageLatency(),
      },
      cache: this.getCacheMetrics(),
      providers: providerMetrics,
      userInteractions: {
        manualEdits: this.counters.manualEdits,
        autoTranslations: this.counters.translationCompleted,
        exportsCount: this.counters.exportsCompleted,
        averageEditDuration: 0, // TODO: Track edit durations
      },
    };
  }

  /**
   * Calculate average latency across all providers
   */
  private calculateAverageLatency(): number {
    let total = 0;
    let count = 0;
    for (const latencies of this.latencies.values()) {
      total += latencies.reduce((a, b) => a + b, 0);
      count += latencies.length;
    }
    return count > 0 ? total / count : 0;
  }

  /**
   * Get recent events
   */
  public getRecentEvents(limit = 100): MetricEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.events = [];
    this.counters = {
      translationStarted: 0,
      translationCompleted: 0,
      translationFailed: 0,
      translationCancelled: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheWrites: 0,
      manualEdits: 0,
      exportsCompleted: 0,
    };
    this.latencies.clear();
    this.cacheLookupTimes = [];
    logger.debug('Metrics reset');
  }

  /**
   * Export metrics as JSON
   */
  public export(): string {
    return JSON.stringify({
      counters: this.counters,
      summary: this.getSummary(),
      recentEvents: this.getRecentEvents(50),
    }, null, 2);
  }
}

/**
 * Convenience function to get metrics instance
 */
export function getTranslationMetrics(): TranslationMetrics {
  return TranslationMetrics.getInstance();
}
