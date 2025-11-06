# Provider Architecture v2

## Overview

The Provider Architecture v2 is a modular, extensible translation provider system with centralized registry management, shared caching, event-driven lifecycle, and comprehensive observability.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    Translation Engine                      │
└─────────────────────────┬─────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                  │
    ┌────▼────────┐                   ┌────▼──────┐
    │  Provider   │◄──────events──────│   Event   │
    │  Registry   │                   │  Emitter  │
    └────┬────────┘                   └───────────┘
         │
    ┌────▼──────────────────────────────────┐
    │  Registered Providers                 │
    ├───────────┬───────────┬───────────────┤
    │  OpenAI   │  Local AI │  Mock HTTP    │
    │ (adapted) │ (adapted) │  (native v2)  │
    └─────┬─────┴─────┬─────┴───────┬───────┘
          │           │             │
          └───────────┴─────────────┘
                      │
              ┌───────▼────────┐
              │  Cache Service │
              │  (LocalStorage)│
              └────────────────┘
```

## Core Components

### 1. TranslationProviderV2 Interface

The enhanced provider interface with full lifecycle management:

```typescript
interface TranslationProviderV2 {
  // Metadata
  getInfo(): ProviderInfo;
  getStatus(): ProviderStatus;

  // Capabilities
  supports(from: Language, to: Language): boolean;
  isAvailable(): Promise<boolean>;

  // Lifecycle
  initialize(options?: ProviderInitOptions): Promise<void>;
  dispose(): Promise<void>;

  // Translation
  translate(
    text: string,
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult>;

  translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult[]>;

  // Optional capabilities
  estimateCost?(textLength: number, from: Language, to: Language): number;
  validateConfig?(): Promise<boolean>;
  healthCheck?(): Promise<HealthCheckResult>;
}
```

**Key Features:**
- **Lifecycle Management:** Initialize → Ready → Dispose
- **Status Tracking:** Uninitialized, Initializing, Ready, Error, Unavailable
- **Rich Metadata:** Capabilities, backend type, version info
- **Event Integration:** Provider events for observability
- **Cache Integration:** Automatic caching support
- **Optional Extensions:** Cost estimation, health checks, config validation

### 2. ProviderRegistry

Central registry for managing all translation providers:

**Key Responsibilities:**
- Provider registration and lifecycle management
- Default provider selection
- Event emission for provider state changes
- Cache service integration
- Provider queries and statistics

**API:**
```typescript
class ProviderRegistry {
  // Registration
  async register(provider: TranslationProviderV2): Promise<void>;
  async unregister(name: string): Promise<boolean>;

  // Access
  getProvider(name?: string): TranslationProviderV2 | null;
  getProviderNames(): string[];
  getProvidersByStatus(status: ProviderStatus): TranslationProviderV2[];

  // Default provider
  getDefaultProvider(): string | null;
  setDefaultProvider(name: string): boolean;

  // Events
  on(event: ProviderEvent, listener: EventListener): () => void;

  // Cache
  getCacheService(): TranslationCacheService;
  async clearCache(provider?: string): Promise<void>;

  // Management
  getStats(): RegistryStats;
  async dispose(): Promise<void>;
}
```

### 3. TranslationCacheService

Shared cache for all translation providers with persistence:

**Features:**
- Configurable storage backends (memory, localStorage, indexedDB)
- Automatic expiration with TTL
- LRU eviction when size limit reached
- Cache statistics (hits, misses, hit rate)
- Provider-specific operations
- Pattern-based invalidation

**API:**
```typescript
class TranslationCacheService {
  static generateKey(text, from, to, provider): string;

  async get(key: string): Promise<CacheEntry | null>;
  async set(entry: CacheEntry): Promise<void>;
  async has(key: string): Promise<boolean>;
  async delete(key: string): Promise<boolean>;
  async clear(provider?: string): Promise<void>;

  getStats(): CacheStats;
  async invalidate(pattern?: string): Promise<number>;

  dispose(): void;
}
```

**Configuration:**
```typescript
const cache = new TranslationCacheService({
  maxSize: 1000,                    // Max entries
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  storage: 'localStorage',          // or 'memory' or 'indexedDB'
  storagePrefix: 'quarto-review:translation:cache:',
  cleanupInterval: 60 * 60 * 1000, // 1 hour
});
```

### 4. ProviderAdapter

Bridges legacy v1 providers to v2 interface:

**Usage:**
```typescript
import { ProviderAdapter } from '@/modules/translation/providers';
import { OpenAIProvider } from '@/modules/translation/providers';

const legacyProvider = new OpenAIProvider({ apiKey: '...' });

const adaptedProvider = new ProviderAdapter(legacyProvider, {
  name: 'openai',
  displayName: 'OpenAI Translation',
  description: 'GPT-powered translation',
  backend: 'cloud',
  version: '1.0.0',
  capabilities: {
    supportsBatch: true,
    requiresAuth: true,
  },
});

await registry.register(adaptedProvider);
```

### 5. MockHTTPProvider

Example v2 provider for testing and development:

**Features:**
- Simulated network latency with jitter
- Configurable error rate
- Request/error statistics
- Full v2 interface implementation
- Cost estimation
- Health checks

**Usage:**
```typescript
import { MockHTTPProvider } from '@/modules/translation/providers';

const provider = new MockHTTPProvider({
  apiKey: 'test-key',
  baseUrl: 'https://api.example.com',
  latency: 100,      // 100ms base latency
  errorRate: 0.05,   // 5% error rate
  maxRetries: 3,
});

await registry.register(provider);
```

## Provider Lifecycle

```
┌──────────────┐
│Uninitialized │
└──────┬───────┘
       │ register()
       ▼
┌──────────────┐
│ Initializing │
└──────┬───────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
┌─────┐  ┌───────────┐
│Ready│  │Unavailable│
└──┬──┘  └───────────┘
   │
   │ error occurs
   ▼
┌─────┐
│Error│
└─────┘
   │
   │ dispose()
   ▼
┌──────────────┐
│Uninitialized │
└──────────────┘
```

**State Transitions:**
1. **Uninitialized → Initializing:** `register()` called
2. **Initializing → Ready:** Initialization successful, provider available
3. **Initializing → Unavailable:** Initialization successful, but provider not available (e.g., missing API key)
4. **Initializing → Error:** Initialization failed
5. **Ready → Error:** Runtime error occurred
6. **Any → Uninitialized:** `dispose()` called

## Provider Events

The registry emits events for observability:

| Event | Description | Data |
|-------|-------------|------|
| `provider:registered` | Provider registered | `{ info, status }` |
| `provider:ready` | Provider initialized and ready | `{ status }` |
| `provider:error` | Provider error occurred | `{ error }` |
| `provider:unregistered` | Provider removed | `{}` |
| `translation:start` | Translation started | `{ from, to, length }` |
| `translation:progress` | Translation progress update | `{ current, total, progress }` |
| `translation:complete` | Translation completed | `{ from, to, duration }` |
| `translation:error` | Translation failed | `{ error }` |
| `cache:hit` | Cache hit | `{ key }` |
| `cache:miss` | Cache miss | `{ key }` |
| `cache:invalidate` | Cache invalidated | `{ provider? }` |

**Subscribing to Events:**
```typescript
const unsubscribe = registry.on('provider:ready', (data) => {
  console.log(`Provider ${data.provider} is ready!`);
});

// Later: unsubscribe()
```

## Creating a New Provider

### Option 1: Native v2 Implementation

```typescript
import type {
  TranslationProviderV2,
  ProviderInfo,
  ProviderStatus,
  TranslationOptions,
  TranslationResult,
} from '@/modules/translation/providers/types';

export class MyCustomProvider implements TranslationProviderV2 {
  private status: ProviderStatus = 'uninitialized';
  private cacheService?: TranslationCacheService;

  getInfo(): ProviderInfo {
    return {
      name: 'my-provider',
      displayName: 'My Custom Provider',
      description: 'Custom translation provider',
      backend: 'cloud',
      version: '1.0.0',
      capabilities: {
        supportsBatch: true,
        supportsStreaming: false,
        supportsConfidence: true,
        supportsContext: false,
        requiresAuth: true,
        isOffline: false,
      },
    };
  }

  getStatus(): ProviderStatus {
    return this.status;
  }

  supports(from: Language, to: Language): boolean {
    // Implement language support check
    return true;
  }

  async isAvailable(): Promise<boolean> {
    // Check if provider is available (API key valid, etc.)
    return true;
  }

  async initialize(options?: ProviderInitOptions): Promise<void> {
    this.status = 'initializing';

    // Store cache service
    if (options?.cacheService) {
      this.cacheService = options.cacheService;
    }

    // Initialize provider (load models, validate API key, etc.)
    // ...

    this.status = 'ready';
  }

  async translate(
    text: string,
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    const startTime = performance.now();

    // Check cache
    if (options?.useCache !== false && this.cacheService) {
      const cacheKey =
        options?.cacheKey ||
        TranslationCacheService.generateKey(text, from, to, 'my-provider');

      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return {
          text: cached.value,
          provider: 'my-provider',
          cached: true,
          duration: performance.now() - startTime,
        };
      }
    }

    // Perform translation
    const translatedText = await this.performTranslation(text, from, to);

    // Cache result
    if (options?.useCache !== false && this.cacheService) {
      const cacheKey =
        options?.cacheKey ||
        TranslationCacheService.generateKey(text, from, to, 'my-provider');

      await this.cacheService.set({
        key: cacheKey,
        value: translatedText,
        provider: 'my-provider',
        from,
        to,
        timestamp: Date.now(),
      });
    }

    return {
      text: translatedText,
      provider: 'my-provider',
      cached: false,
      duration: performance.now() - startTime,
    };
  }

  async translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    options?: TranslationOptions
  ): Promise<TranslationResult[]> {
    // Implement batch translation
    return Promise.all(
      texts.map((text) => this.translate(text, from, to, options))
    );
  }

  async dispose(): Promise<void> {
    // Clean up resources
    this.status = 'uninitialized';
    this.cacheService = undefined;
  }

  private async performTranslation(
    text: string,
    from: Language,
    to: Language
  ): Promise<string> {
    // Implement actual translation logic
    return text;
  }
}
```

### Option 2: Adapt Legacy Provider

```typescript
import { ProviderAdapter } from '@/modules/translation/providers';
import { MyLegacyProvider } from './my-legacy-provider';

const legacyProvider = new MyLegacyProvider();

const adaptedProvider = new ProviderAdapter(legacyProvider, {
  name: 'my-provider',
  displayName: 'My Provider',
  description: 'My translation provider',
  backend: 'cloud',
  version: '1.0.0',
  capabilities: {
    supportsBatch: true,
    requiresAuth: true,
  },
});

await registry.register(adaptedProvider);
```

## Usage Examples

### Basic Setup

```typescript
import {
  ProviderRegistry,
  MockHTTPProvider,
  ProviderAdapter,
} from '@/modules/translation/providers';
import { TranslationCacheService } from '@/modules/translation/cache';
import { OpenAIProvider } from '@/modules/translation/providers';

// Create registry
const registry = new ProviderRegistry({
  defaultProvider: 'openai',
  enableEvents: true,
});

// Register providers
const openaiProvider = new ProviderAdapter(
  new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  {
    name: 'openai',
    displayName: 'OpenAI GPT',
    description: 'GPT-powered translation',
    backend: 'cloud',
    version: '1.0.0',
  }
);

const mockProvider = new MockHTTPProvider({
  apiKey: 'test-key',
  latency: 100,
});

await registry.register(openaiProvider);
await registry.register(mockProvider);
```

### Translation with Caching

```typescript
const provider = registry.getProvider('openai');

// First call - translates and caches
const result1 = await provider.translate('Hello', 'en', 'nl', {
  useCache: true,
});
console.log(result1.cached); // false
console.log(result1.duration); // ~500ms

// Second call - cached
const result2 = await provider.translate('Hello', 'en', 'nl', {
  useCache: true,
});
console.log(result2.cached); // true
console.log(result2.duration); // ~1ms
```

### Event Monitoring

```typescript
// Monitor all provider events
registry.on('provider:ready', (data) => {
  console.log(`✓ ${data.provider} is ready`);
});

registry.on('translation:start', (data) => {
  console.log(`Translating ${data.data.length} characters...`);
});

registry.on('cache:hit', (data) => {
  console.log(`Cache hit: ${data.data.key}`);
});

registry.on('provider:error', (data) => {
  console.error(`Provider error: ${data.data.error}`);
});
```

### Cache Management

```typescript
// Get cache statistics
const stats = registry.getCacheService().getStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

// Clear cache for specific provider
await registry.clearCache('openai');

// Clear all cache
await registry.clearCache();

// Invalidate by pattern
await registry.getCacheService().invalidate('openai-.*');
```

### Provider Queries

```typescript
// Get all providers
const allProviders = registry.getProviderNames();
console.log('Available providers:', allProviders);

// Get ready providers
const readyProviders = registry.getProvidersByStatus('ready');
console.log(`${readyProviders.length} providers ready`);

// Get provider info
const provider = registry.getProvider('openai');
const info = provider?.getInfo();
console.log(`Provider: ${info?.displayName}`);
console.log(`Backend: ${info?.backend}`);
console.log(`Supports batch: ${info?.capabilities.supportsBatch}`);

// Registry statistics
const stats = registry.getStats();
console.log(`Total providers: ${stats.totalProviders}`);
console.log(`Ready: ${stats.readyProviders}`);
console.log(`Errors: ${stats.errorProviders}`);
```

## Best Practices

### 1. Always Use the Registry

Don't instantiate providers directly in application code. Always register and access through the registry:

```typescript
// ❌ Bad
const provider = new OpenAIProvider({ apiKey: '...' });
await provider.translate('Hello', 'en', 'nl');

// ✅ Good
await registry.register(adaptedOpenAIProvider);
const provider = registry.getProvider('openai');
await provider.translate('Hello', 'en', 'nl');
```

### 2. Enable Caching

Always enable caching unless you have a specific reason not to:

```typescript
// Default: caching enabled
await provider.translate(text, from, to);

// Explicitly disable if needed
await provider.translate(text, from, to, { useCache: false });
```

### 3. Monitor Provider Events

Subscribe to provider events for observability:

```typescript
registry.on('provider:error', (data) => {
  // Log to error tracking service
  Sentry.captureException(new Error(data.data.error));
});

registry.on('translation:complete', (data) => {
  // Track performance metrics
  analytics.track('translation', {
    duration: data.data.duration,
    provider: data.provider,
  });
});
```

### 4. Handle Provider Unavailability

Always check provider status before critical operations:

```typescript
const provider = registry.getProvider();
if (provider?.getStatus() !== 'ready') {
  console.warn('Provider not ready, using fallback');
  // Use fallback provider or manual translation
}
```

### 5. Cleanup on Shutdown

Always dispose the registry on application shutdown:

```typescript
// On app shutdown
await registry.dispose();
```

## Testing

### Unit Testing with MockHTTPProvider

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry, MockHTTPProvider } from '@/modules/translation/providers';

describe('Translation Feature', () => {
  let registry: ProviderRegistry;

  beforeEach(async () => {
    registry = new ProviderRegistry();

    const mockProvider = new MockHTTPProvider({
      apiKey: 'test-key',
      latency: 10,      // Fast for testing
      errorRate: 0,     // No errors
    });

    await registry.register(mockProvider);
  });

  it('should translate text', async () => {
    const provider = registry.getProvider();
    const result = await provider.translate('Hello', 'en', 'nl');

    expect(result.text).toBeDefined();
    expect(result.provider).toBe('mock-http');
  });
});
```

### Integration Testing

```typescript
// Test with real providers in CI
const provider = process.env.CI
  ? new MockHTTPProvider({ apiKey: 'test' })
  : new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });

await registry.register(provider);
```

## Migration from v1

### Step 1: Wrap Existing Providers

```typescript
import { ProviderAdapter } from '@/modules/translation/providers';

// Your existing v1 provider
const v1Provider = new MyExistingProvider();

// Wrap with adapter
const v2Provider = new ProviderAdapter(v1Provider, {
  name: 'my-provider',
  displayName: 'My Provider',
  description: 'My translation provider',
  backend: 'cloud',
  version: '1.0.0',
});

await registry.register(v2Provider);
```

### Step 2: Update Application Code

```typescript
// Old: Direct provider instantiation
const engine = new TranslationEngine(config);
await engine.translate('Hello', 'en', 'nl');

// New: Registry-based
const registry = new ProviderRegistry();
await registry.register(adaptedProvider);
const provider = registry.getProvider();
await provider.translate('Hello', 'en', 'nl');
```

### Step 3: Implement Native v2 (Optional)

For best performance and features, rewrite providers to implement v2 interface natively.

## Troubleshooting

### Provider Not Initializing

```typescript
const provider = registry.getProvider('my-provider');
console.log('Status:', provider?.getStatus());

if (provider?.getStatus() === 'error') {
  // Check logs for initialization error
  // Verify API keys and configuration
}
```

### Cache Not Working

```typescript
const stats = registry.getCacheService().getStats();
console.log('Cache stats:', stats);

// Check if cache is enabled
const result = await provider.translate(text, from, to, {
  useCache: true, // Ensure this is true
});
console.log('Result cached:', result.cached);
```

### High Error Rate

```typescript
const provider = registry.getProvider() as MockHTTPProvider;
const stats = provider.getStats?.();
console.log('Error rate:', (stats.errorRate * 100).toFixed(1) + '%');

// Check provider health
const health = await provider.healthCheck?.();
console.log('Health check:', health);
```

## Performance Considerations

**Cache Hit Rate:** Aim for >80% cache hit rate for typical usage.

**Provider Initialization:** Initialize providers on app start, not on-demand.

**Batch Operations:** Use `translateBatch()` for multiple translations.

**Event Listeners:** Clean up event listeners to prevent memory leaks.

**Cache Size:** Monitor cache size and adjust limits based on memory constraints.

## Future Enhancements

- **Streaming Support:** Real-time translation streaming
- **Quality Scoring:** Automatic translation quality assessment
- **Fallback Chains:** Automatic provider fallback on failure
- **A/B Testing:** Compare provider results for quality
- **Translation Memory:** Context-aware caching
- **Cost Optimization:** Automatic cheapest provider selection

## References

- [Phase 2: Provider Architecture](./phase-2-provider-architecture.md)
- [Logging Taxonomy](./LOGGING_TAXONOMY.md)
- [StateStore Integration](./STATESTORE_INTEGRATION.md)
- [Translation Module Implementation](../TRANSLATION_MODULE_IMPLEMENTATION_PLAN.md)
