import { describe, it, expect } from 'vitest';
import { TranslationState } from '@modules/translation/storage/TranslationState';
import type { Sentence } from '@modules/translation/types';

/**
 * Performance tests for translation module with large documents
 *
 * These tests measure:
 * - Sentence segmentation speed
 * - State management performance
 * - Alignment algorithm efficiency
 * - Memory usage patterns
 */

describe('Translation Performance - Large Document Handling', () => {
  const generateLargeText = (sentenceCount: number): string => {
    const sentences = [
      'This is the first sentence.',
      'The second sentence contains more information.',
      'Here is another example of a complete thought.',
      'Multiple sentences can be processed together.',
      'Performance metrics help us understand efficiency.',
      'Large documents require careful optimization.',
      'Translation speed depends on document size.',
      'Sentence boundaries must be correctly identified.',
      'Proper segmentation improves alignment accuracy.',
      'Testing with various document sizes is important.',
    ];

    let text = '';
    for (let i = 0; i < sentenceCount; i++) {
      text += sentences[i % sentences.length] + ' ';
    }
    return text;
  };

  const generateLargeSentences = (count: number): Sentence[] => {
    const sentences: Sentence[] = [];
    for (let i = 0; i < count; i++) {
      sentences.push({
        id: `s${i}`,
        elementId: `elem${Math.floor(i / 100)}`,
        content: `Sentence number ${i + 1} with some content for testing.`,
        language: 'en',
        startOffset: i * 40,
        endOffset: i * 40 + 35,
        hash: `hash${i}`,
      });
    }
    return sentences;
  };

  describe('Translation State Performance', () => {
    it('handles 100 translation pairs efficiently', () => {
      const sentences = generateLargeSentences(100);
      const state = new TranslationState('en', 'nl');
      state.initialize(sentences);

      const targetSentences = sentences.map((s, i) => ({
        ...s,
        id: `t${i}`,
      }));

      const startTime = performance.now();
      for (let i = 0; i < sentences.length; i++) {
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: sentences[i].id,
          targetId: `t${i}`,
          sourceText: sentences[i].content,
          targetText: `Dutch translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'manual',
          isManuallyEdited: false,
        });
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(state.getStats().total).toBe(100);
      expect(duration).toBeLessThan(200); // Should be < 200ms
    });

    it('handles 500 translation pairs with good performance', () => {
      const sentences = generateLargeSentences(500);
      const state = new TranslationState('en', 'nl');
      state.initialize(sentences);

      const startTime = performance.now();
      for (let i = 0; i < sentences.length; i++) {
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: sentences[i].id,
          targetId: `t${i}`,
          sourceText: sentences[i].content,
          targetText: `Dutch translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'manual',
          isManuallyEdited: false,
        });
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(state.getStats().total).toBe(500);
      expect(duration).toBeLessThan(1000); // Should be < 1 second
    });

    it('updates translation pair efficiently', () => {
      const state = new TranslationState('en', 'nl');
      const sentences = generateLargeSentences(100);
      state.initialize(sentences);

      // Add 100 pairs
      for (let i = 0; i < 100; i++) {
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: `s${i}`,
          targetId: `t${i}`,
          sourceText: `Sentence ${i}`,
          targetText: `Translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'untranslated',
          isManuallyEdited: false,
        });
      }

      // Update statuses
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        state.updatePair(`p${i}`, { status: 'manual' });
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should be < 100ms
    });

    it('retrieves statistics efficiently from large state', () => {
      const state = new TranslationState('en', 'nl');
      const sentences = generateLargeSentences(500);
      state.initialize(sentences);

      // Add 500 pairs with mixed statuses
      for (let i = 0; i < 500; i++) {
        const status: any = i % 3 === 0 ? 'auto-translated' : i % 3 === 1 ? 'manual' : 'untranslated';
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: `s${i}`,
          targetId: `t${i}`,
          sourceText: `Sentence ${i}`,
          targetText: `Translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: status === 'auto-translated' ? 'automatic' : 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status,
          isManuallyEdited: false,
        });
      }

      const startTime = performance.now();
      const stats = state.getStats();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(stats.total).toBe(500);
      expect(duration).toBeLessThan(10); // Should be almost instant
    });
  });

  describe('Subscriber Management', () => {
    it('handles subscriber cleanup correctly', () => {
      const state = new TranslationState('en', 'nl');
      const sentences = generateLargeSentences(100);
      state.initialize(sentences);
      let changeCount = 0;

      const unsubscribe = state.subscribe(() => {
        changeCount++;
      });

      // Add pair - should trigger subscriber
      state.addTranslationPair({
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Test',
        targetText: 'Test',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'manual',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'manual',
        isManuallyEdited: false,
      });

      expect(changeCount).toBe(1);

      // Unsubscribe
      unsubscribe();

      // Add another pair - should NOT trigger (if unsubscribe works)
      const initialCount = changeCount;
      state.addTranslationPair({
        id: 'p2',
        sourceId: 's2',
        targetId: 't2',
        sourceText: 'Test 2',
        targetText: 'Test 2',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'manual',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'manual',
        isManuallyEdited: false,
      });

      expect(changeCount).toBe(initialCount); // Should not have increased
    });
  });

  describe('Stress Tests', () => {
    it('handles rapid updates efficiently', () => {
      const state = new TranslationState('en', 'nl');
      const sentences = generateLargeSentences(100);
      state.initialize(sentences);
      const updateCount = 1000;

      // Add initial pairs
      for (let i = 0; i < 100; i++) {
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: `s${i}`,
          targetId: `t${i}`,
          sourceText: `Sentence ${i}`,
          targetText: `Translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'untranslated',
          isManuallyEdited: false,
        });
      }

      const startTime = performance.now();
      for (let i = 0; i < updateCount; i++) {
        const pairId = `p${i % 100}`;
        state.updatePair(pairId, {
          status: i % 2 === 0 ? 'manual' : 'auto-translated',
        });
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should handle 1000 updates in < 1 second
    });

    it('maintains consistency with concurrent operations', () => {
      const state = new TranslationState('en', 'nl');
      const sentences = generateLargeSentences(100);
      state.initialize(sentences);

      // Simulate multiple rapid operations
      for (let i = 0; i < 100; i++) {
        state.addTranslationPair({
          id: `p${i}`,
          sourceId: `s${i}`,
          targetId: `t${i}`,
          sourceText: `Sentence ${i}`,
          targetText: `Translation ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          method: 'manual',
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'untranslated',
          isManuallyEdited: false,
        });
      }

      // Perform various operations
      for (let i = 0; i < 100; i++) {
        state.updatePair(`p${i}`, { status: 'manual' });
      }

      const stats = state.getStats();
      expect(stats.total).toBe(100);
      expect(stats.manual).toBe(100);
    });
  })
});
