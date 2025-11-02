/**
 * Translation Integration Tests
 * Tests integration of TranslationModule with main QuartoReview class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import QuartoReview from '../../src/main';
import type { TranslationModule } from '../../src/modules/translation';

describe('Translation Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create test container with proper data-review-markdown attributes
    container = document.createElement('div');
    container.innerHTML = `
      <div data-review-id="para-1" data-review-type="Para" data-review-markdown="This is a test paragraph in English.">
        This is a test paragraph in English.
      </div>
      <div data-review-id="para-2" data-review-type="Para" data-review-markdown="This is another paragraph with multiple sentences. It has more than one. Let's test this.">
        This is another paragraph with multiple sentences. It has more than one. Let's test this.
      </div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should create QuartoReview instance with translation always enabled', () => {
    const review = new QuartoReview({});

    expect(review).toBeDefined();
    // Translation module is always available since it's built into the extension
    expect(review.getTranslation()).toBeDefined();

    review.destroy();
  });

  it('should create QuartoReview instance with translation enabled', () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        defaultProvider: 'manual',
      },
    });

    expect(review).toBeDefined();
    const translation = review.getTranslation();
    expect(translation).toBeDefined();

    review.destroy();
  });

  it('should initialize translation module with default config', () => {
    const review = new QuartoReview({
      enableTranslation: true,
    });

    const translation = review.getTranslation();
    expect(translation).toBeDefined();
    expect(translation?.getAvailableProviders()).toContain('manual');

    review.destroy();
  });

  it('should allow access to translation API through getTranslation()', async () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        defaultProvider: 'manual',
      },
    });

    const translation = review.getTranslation();
    expect(translation).toBeDefined();

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check that document was initialized
    const doc = translation?.getDocument();
    expect(doc).toBeDefined();

    // Check stats
    const stats = translation?.getStats();
    expect(stats).toBeDefined();
    expect(stats?.total).toBeGreaterThanOrEqual(0);
    expect(stats?.translated).toBe(0); // No translations yet

    review.destroy();
  });

  it('should support subscribe to translation changes', async () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
      },
    });

    const translation = review.getTranslation();
    expect(translation).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const listener = vi.fn();
    const unsubscribe = translation?.subscribe(listener);

    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');

    // Cleanup
    unsubscribe?.();
    review.destroy();
  });

  it('should provide translation statistics', async () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
      },
    });

    const translation = review.getTranslation();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stats = translation?.getStats();
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('translated');
    expect(stats).toHaveProperty('manual');
    expect(stats).toHaveProperty('auto');
    expect(stats).toHaveProperty('outOfSync');

    review.destroy();
  });

  it('should list available translation providers', () => {
    const review = new QuartoReview({
      enableTranslation: true,
    });

    const translation = review.getTranslation();
    const providers = translation?.getAvailableProviders();

    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers?.length).toBeGreaterThan(0);
    expect(providers).toContain('manual');

    review.destroy();
  });

  it('should properly destroy translation module', async () => {
    const review = new QuartoReview({
      enableTranslation: true,
    });

    const translation = review.getTranslation();
    expect(translation).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Destroy should not throw
    expect(() => review.destroy()).not.toThrow();
  });

  it('should segment paragraphs into sentences', async () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
      },
    });

    const translation = review.getTranslation();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const doc = translation?.getDocument();
    expect(doc).toBeDefined();

    // Para-2 should have sentences
    const para2Sentences = doc?.sourceSentences.filter(
      (s) => s.elementId === 'para-2'
    );
    expect(para2Sentences).toBeDefined();
    // Should have at least one sentence
    expect(para2Sentences && para2Sentences.length > 0).toBe(true);

    review.destroy();
  });

  it('should configure custom translation providers', () => {
    const review = new QuartoReview({
      enableTranslation: true,
      translation: {
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        defaultProvider: 'manual',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4',
          },
        },
      },
    });

    const translation = review.getTranslation();
    expect(translation).toBeDefined();

    // OpenAI provider should be available (even if not initialized)
    const providers = translation?.getAvailableProviders();
    expect(providers).toBeDefined();

    review.destroy();
  });
});
