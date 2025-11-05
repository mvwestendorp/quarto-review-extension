/**
 * Translation Providers Module
 */

// Legacy v1 interface (deprecated)
export { TranslationProvider } from './base';
export { ManualTranslationProvider } from './manual';
export { OpenAIProvider } from './openai';
export { LocalAIProvider } from './local-ai';

// v2 Provider architecture
export type {
  TranslationProviderV2,
  ProviderInfo,
  ProviderCapabilities,
  ProviderStatus,
  ProviderBackend,
  TranslationOptions,
  TranslationResult,
  ProviderInitOptions,
  ProviderEvent,
  ProviderEventData,
  ProviderEventEmitter,
  CacheEntry,
  CacheStats,
  TranslationCacheService as ITranslationCacheService,
  ProviderRegistryConfig,
  ProviderRegistration,
} from './types';

export {
  ProviderRegistry,
  getGlobalProviderRegistry,
  resetGlobalProviderRegistry,
} from './ProviderRegistry';
