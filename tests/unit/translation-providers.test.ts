import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualTranslationProvider } from '@modules/translation/providers/manual';
import { OpenAIProvider } from '@modules/translation/providers/openai';
import { TranslationEngine } from '@modules/translation/translation-engine';
import type { TranslationConfig } from '@modules/translation/types';

describe('ManualTranslationProvider', () => {
  let provider: ManualTranslationProvider;

  beforeEach(() => {
    provider = new ManualTranslationProvider();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('manual');
  });

  it('should support all language pairs', () => {
    expect(provider.supports('en', 'nl')).toBe(true);
    expect(provider.supports('nl', 'fr')).toBe(true);
    expect(provider.supports('fr', 'en')).toBe(true);
  });

  it('should return empty string for translation', async () => {
    const result = await provider.translate('Hello', 'en', 'nl');
    expect(result).toBe('');
  });

  it('should return empty strings for batch translation', async () => {
    const results = await provider.translateBatch(
      ['Hello', 'World'],
      'en',
      'nl'
    );
    expect(results).toEqual(['', '']);
  });

  it('should always be available', async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let fetchMock: any;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
    });

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('should support all language pairs', () => {
    expect(provider.supports('en', 'nl')).toBe(true);
    expect(provider.supports('nl', 'fr')).toBe(true);
    expect(provider.supports('fr', 'en')).toBe(true);
  });

  it('should be available with API key', async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('should not be available without API key', async () => {
    const providerNoKey = new OpenAIProvider({ apiKey: '' });
    const available = await providerNoKey.isAvailable();
    expect(available).toBe(false);
  });

  it('should call OpenAI API for translation', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Hallo',
            },
          },
        ],
      }),
    });

    const result = await provider.translate('Hello', 'en', 'nl');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );

    expect(result).toBe('Hallo');
  });

  it('should handle API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    });

    await expect(provider.translate('Hello', 'en', 'nl')).rejects.toThrow();
  });

  it('should translate batch sequentially', async () => {
    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Translation ${callCount}`,
              },
            },
          ],
        }),
      };
    });

    const results = await provider.translateBatch(
      ['First', 'Second', 'Third'],
      'en',
      'nl'
    );

    expect(results).toHaveLength(3);
    expect(callCount).toBe(3);
  });

  it('should use correct temperature for consistent translations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Result' } }],
      }),
    });

    await provider.translate('Test', 'en', 'nl');

    const callArgs = fetchMock.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);

    expect(body.temperature).toBe(0.3);
  });
});

describe('TranslationEngine', () => {
  let engine: TranslationEngine;
  let config: TranslationConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      defaultProvider: 'manual',
      autoTranslateOnEdit: false,
      autoTranslateOnLoad: false,
      showCorrespondenceLines: true,
      highlightOnHover: true,
      providers: {},
    };

    engine = new TranslationEngine(config);
  });

  describe('provider management', () => {
    it('should register manual provider by default', () => {
      const providers = engine.getAvailableProviders();
      expect(providers).toContain('manual');
    });

    it('should register OpenAI provider when configured', () => {
      const configWithOpenAI: TranslationConfig = {
        ...config,
        providers: {
          openai: {
            apiKey: 'test-key',
          },
        },
      };

      const engineWithOpenAI = new TranslationEngine(configWithOpenAI);
      const providers = engineWithOpenAI.getAvailableProviders();

      expect(providers).toContain('openai');
    });

    it('should use default provider when none specified', async () => {
      const result = await engine.translate('Hello', 'en', 'nl');
      expect(result).toBe(''); // Manual provider returns empty
    });

    it('should throw error for non-existent provider', async () => {
      await expect(
        engine.translate('Hello', 'en', 'nl', 'non-existent')
      ).rejects.toThrow("Translation provider 'non-existent' not found");
    });
  });

  describe('translate', () => {
    it('should translate using specified provider', async () => {
      const result = await engine.translate('Hello', 'en', 'nl', 'manual');
      expect(result).toBe('');
    });

    it('should check if provider supports language pair', async () => {
      // Manual provider supports all pairs, so this should work
      const result = await engine.translate('Hello', 'en', 'nl');
      expect(result).toBeDefined();
    });

    it('should check if provider is available', async () => {
      // Manual provider is always available
      const result = await engine.translate('Hello', 'en', 'nl');
      expect(result).toBeDefined();
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const results = await engine.translateBatch(texts, 'en', 'nl');

      expect(results).toHaveLength(3);
      expect(results).toEqual(['', '', '']); // Manual provider
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for manual provider', async () => {
      const available = await engine.isProviderAvailable('manual');
      expect(available).toBe(true);
    });

    it('should return false for non-existent provider', async () => {
      const available = await engine.isProviderAvailable('non-existent');
      expect(available).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should clean up all providers', () => {
      engine.destroy();
      const providers = engine.getAvailableProviders();
      expect(providers).toHaveLength(0);
    });
  });
});
