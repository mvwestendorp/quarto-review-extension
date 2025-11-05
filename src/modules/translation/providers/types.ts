/**
 * Translation Provider v2 Types
 * Enhanced provider interface with lifecycle management, events, and metadata
 */

import type { Language } from '../types';

/**
 * Provider backend types
 */
export type ProviderBackend = 'cloud' | 'local' | 'hybrid';

/**
 * Provider initialization status
 */
export type ProviderStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'unavailable';

/**
 * Provider capability flags
 */
export interface ProviderCapabilities {
  supportsBatch: boolean;
  supportsStreaming: boolean;
  supportsConfidence: boolean;
  supportsContext: boolean;
  requiresAuth: boolean;
  isOffline: boolean;
  maxBatchSize?: number;
  estimatedCostPerChar?: number;
}

/**
 * Provider metadata for display and selection
 */
export interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  backend: ProviderBackend;
  version: string;
  author?: string;
  homepage?: string;
  capabilities: ProviderCapabilities;
  supportedLanguages?: Language[];
}

/**
 * Translation request options
 */
export interface TranslationOptions {
  context?: string;
  formality?: 'formal' | 'informal' | 'auto';
  preserveFormatting?: boolean;
  cacheKey?: string;
  useCache?: boolean;
  maxLength?: number;
  timeout?: number;
}

/**
 * Translation result with metadata
 */
export interface TranslationResult {
  text: string;
  confidence?: number;
  provider: string;
  cached: boolean;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Provider initialization options
 */
export interface ProviderInitOptions {
  cacheService?: TranslationCacheService;
  eventEmitter?: ProviderEventEmitter;
  signal?: AbortSignal;
}

/**
 * Provider event types
 */
export type ProviderEvent =
  | 'provider:registered'
  | 'provider:ready'
  | 'provider:error'
  | 'provider:unregistered'
  | 'translation:start'
  | 'translation:progress'
  | 'translation:complete'
  | 'translation:error'
  | 'cache:hit'
  | 'cache:miss'
  | 'cache:invalidate';

/**
 * Provider event data
 */
export interface ProviderEventData {
  provider: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Provider event emitter interface
 */
export interface ProviderEventEmitter {
  emit(event: ProviderEvent, data: ProviderEventData): void;
  on(event: ProviderEvent, listener: (data: ProviderEventData) => void): void;
  off(event: ProviderEvent, listener: (data: ProviderEventData) => void): void;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  key: string;
  value: string;
  provider: string;
  from: Language;
  to: Language;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Cache service interface
 */
export interface TranslationCacheService {
  get(key: string): Promise<CacheEntry | null>;
  set(entry: CacheEntry): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(provider?: string): Promise<void>;
  getStats(): CacheStats;
  invalidate(pattern?: string): Promise<number>;
}

/**
 * Enhanced Translation Provider interface v2
 */
export interface TranslationProviderV2 {
  /**
   * Provider information and metadata
   */
  getInfo(): ProviderInfo;

  /**
   * Get current provider status
   */
  getStatus(): ProviderStatus;

  /**
   * Check if provider supports a language pair
   */
  supports(from: Language, to: Language): boolean;

  /**
   * Check if provider is available and ready
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize provider with optional services
   * @returns Promise that resolves when initialization is complete
   */
  initialize(options?: ProviderInitOptions): Promise<void>;

  /**
   * Translate a single text
   */
  translate(
    text: string,
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult>;

  /**
   * Translate multiple texts in batch
   */
  translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult[]>;

  /**
   * Clean up resources and dispose provider
   */
  dispose(): Promise<void>;

  /**
   * Optional: Estimate translation cost
   */
  estimateCost?(textLength: number, from: Language, to: Language): number;

  /**
   * Optional: Validate configuration
   */
  validateConfig?(): Promise<boolean>;

  /**
   * Optional: Get health check information
   */
  healthCheck?(): Promise<{
    healthy: boolean;
    latency?: number;
    message?: string;
  }>;
}

/**
 * Provider registry configuration
 */
export interface ProviderRegistryConfig {
  defaultProvider?: string;
  cacheService?: TranslationCacheService;
  enableEvents?: boolean;
  debug?: boolean;
}

/**
 * Provider registration result
 */
export interface ProviderRegistration {
  provider: TranslationProviderV2;
  registered: Date;
  status: ProviderStatus;
}
