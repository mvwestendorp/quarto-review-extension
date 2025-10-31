/**
 * Translation Engine
 * Manages multiple translation providers and routes translation requests
 */

import type { TranslationProvider } from './providers/base';
import { ManualTranslationProvider } from './providers/manual';
import { LocalAIProvider } from './providers/local-ai';
import { OpenAIProvider } from './providers/openai';
import type { Language, TranslationConfig, TranslationProgress } from './types';

export class TranslationEngine {
  private providers = new Map<string, TranslationProvider>();
  private defaultProvider: string;
  private progressCallback?: (progress: TranslationProgress) => void;

  constructor(config: TranslationConfig) {
    this.defaultProvider = config.defaultProvider;
    this.registerProviders(config);
  }

  /**
   * Register all configured providers
   */
  private registerProviders(config: TranslationConfig): void {
    // Always register manual provider
    this.registerProvider(new ManualTranslationProvider());

    // Register configured providers
    if (config.providers.local) {
      const localProvider = new LocalAIProvider(config.providers.local);

      if (this.progressCallback) {
        localProvider.setProgressCallback(this.progressCallback);
      }

      this.registerProvider(localProvider);
    }

    if (config.providers.openai) {
      this.registerProvider(new OpenAIProvider(config.providers.openai));
    }

    // Add more providers here (Google, DeepL, etc.)
  }

  /**
   * Register a translation provider
   */
  registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`[TranslationEngine] Registered provider: ${provider.name}`);
  }

  /**
   * Set progress callback for all providers that support it
   */
  setProgressCallback(callback: (progress: TranslationProgress) => void): void {
    this.progressCallback = callback;

    // Update local provider if it exists
    const localProvider = this.providers.get('local');
    if (localProvider && localProvider instanceof LocalAIProvider) {
      localProvider.setProgressCallback(callback);
    }
  }

  /**
   * Translate text using specified or default provider
   */
  async translate(
    text: string,
    from: Language,
    to: Language,
    providerName?: string
  ): Promise<string> {
    const provider = this.getProvider(providerName);

    if (!provider.supports(from, to)) {
      throw new Error(
        `Provider ${provider.name} doesn't support ${from} → ${to}`
      );
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider ${provider.name} is not available`);
    }

    return provider.translate(text, from, to);
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    providerName?: string
  ): Promise<string[]> {
    const provider = this.getProvider(providerName);

    if (!provider.supports(from, to)) {
      throw new Error(
        `Provider ${provider.name} doesn't support ${from} → ${to}`
      );
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider ${provider.name} is not available`);
    }

    return provider.translateBatch(texts, from, to);
  }

  /**
   * Get provider by name (or default)
   */
  private getProvider(name?: string): TranslationProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Translation provider '${providerName}' not found`);
    }

    return provider;
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) return false;

    return provider.isAvailable();
  }

  /**
   * Get provider info
   */
  getProviderInfo(name: string): { name: string; available: boolean } | null {
    const provider = this.providers.get(name);
    if (!provider) return null;

    return {
      name: provider.name,
      available: false, // Will be updated asynchronously
    };
  }

  /**
   * Initialize a provider (if it supports initialization)
   */
  async initializeProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    if (provider.initialize) {
      await provider.initialize();
    }
  }

  /**
   * Destroy all providers
   */
  destroy(): void {
    this.providers.forEach((provider) => {
      if (provider.destroy) {
        provider.destroy();
      }
    });
    this.providers.clear();
  }
}
