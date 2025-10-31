import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationState } from '@modules/translation/storage/TranslationState';
import type { Sentence, TranslationPair } from '@modules/translation/types';

describe('TranslationState', () => {
  let state: TranslationState;

  beforeEach(() => {
    state = new TranslationState('en', 'nl');
  });

  describe('initialize', () => {
    it('should initialize with source sentences', () => {
      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
      ];

      state.initialize(sentences);
      const doc = state.getDocument();

      expect(doc).not.toBeNull();
      expect(doc?.sourceSentences).toHaveLength(1);
      expect(doc?.metadata.totalSentences).toBe(1);
    });

    it('should set correct languages', () => {
      state.initialize([]);
      const doc = state.getDocument();

      expect(doc?.metadata.sourceLanguage).toBe('en');
      expect(doc?.metadata.targetLanguage).toBe('nl');
    });

    it('should initialize with empty target sentences', () => {
      state.initialize([]);
      const doc = state.getDocument();

      expect(doc?.targetSentences).toHaveLength(0);
    });

    it('should initialize correspondence map', () => {
      state.initialize([]);
      const doc = state.getDocument();

      expect(doc?.correspondenceMap.pairs).toHaveLength(0);
      expect(doc?.correspondenceMap.forwardMapping.size).toBe(0);
      expect(doc?.correspondenceMap.reverseMapping.size).toBe(0);
    });
  });

  describe('addTranslationPair', () => {
    beforeEach(() => {
      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
      ];
      state.initialize(sentences);
    });

    it('should add translation pair', () => {
      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };

      state.addTranslationPair(pair);
      const doc = state.getDocument();

      expect(doc?.correspondenceMap.pairs).toHaveLength(1);
      expect(doc?.metadata.translatedCount).toBe(1);
    });

    it('should update forward mapping', () => {
      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };

      state.addTranslationPair(pair);

      const targets = state.getCorrespondingTargets('s1');
      expect(targets).toContain('t1');
    });

    it('should update reverse mapping', () => {
      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };

      state.addTranslationPair(pair);

      const sources = state.getCorrespondingSources('t1');
      expect(sources).toContain('s1');
    });

    it('should track automatic translations', () => {
      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };

      state.addTranslationPair(pair);
      const doc = state.getDocument();

      expect(doc?.metadata.autoCount).toBe(1);
      expect(doc?.metadata.manualCount).toBe(0);
    });

    it('should track manual translations', () => {
      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'manual',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: true,
      };

      state.addTranslationPair(pair);
      const doc = state.getDocument();

      expect(doc?.metadata.manualCount).toBe(1);
      expect(doc?.metadata.autoCount).toBe(0);
    });
  });

  describe('updateSentence', () => {
    beforeEach(() => {
      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
      ];
      state.initialize(sentences);

      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };
      state.addTranslationPair(pair);
    });

    it('should update source sentence content', () => {
      state.updateSentence('s1', 'Hi there', true);
      const doc = state.getDocument();

      const sentence = doc?.sourceSentences.find((s) => s.id === 's1');
      expect(sentence?.content).toBe('Hi there');
    });

    it('should mark pairs as out-of-sync when source changes', () => {
      state.updateSentence('s1', 'Hi there', true);
      const doc = state.getDocument();

      const pair = doc?.correspondenceMap.pairs.find((p) => p.id === 'p1');
      expect(pair?.status).toBe('out-of-sync');
    });

    it('should update sentence hash', () => {
      const doc = state.getDocument();
      const originalHash = doc?.sourceSentences.find((s) => s.id === 's1')?.hash;

      state.updateSentence('s1', 'Different text', true);

      const newHash = state.getDocument()?.sourceSentences.find((s) => s.id === 's1')?.hash;
      expect(newHash).not.toBe(originalHash);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for uninitialized state', () => {
      const stats = state.getStats();

      expect(stats.total).toBe(0);
      expect(stats.translated).toBe(0);
      expect(stats.manual).toBe(0);
      expect(stats.auto).toBe(0);
    });

    it('should return correct stats', () => {
      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
        {
          id: 's2',
          elementId: 'e1',
          content: 'World',
          language: 'en',
          startOffset: 6,
          endOffset: 11,
          hash: 'h2',
        },
      ];
      state.initialize(sentences);

      const pair1: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };

      const pair2: TranslationPair = {
        id: 'p2',
        sourceId: 's2',
        targetId: 't2',
        sourceText: 'World',
        targetText: 'Wereld',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'manual',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: true,
      };

      state.addTranslationPair(pair1);
      state.addTranslationPair(pair2);

      const stats = state.getStats();

      expect(stats.total).toBe(2);
      expect(stats.translated).toBe(2);
      expect(stats.auto).toBe(1);
      expect(stats.manual).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on changes', () => {
      let notified = false;

      state.subscribe(() => {
        notified = true;
      });

      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
      ];
      state.initialize(sentences);

      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };
      state.addTranslationPair(pair);

      expect(notified).toBe(true);
    });

    it('should allow unsubscribing', () => {
      let callCount = 0;

      const unsubscribe = state.subscribe(() => {
        callCount++;
      });

      state.initialize([]);
      expect(callCount).toBe(1);

      unsubscribe();

      const pair: TranslationPair = {
        id: 'p1',
        sourceId: 's1',
        targetId: 't1',
        sourceText: 'Hello',
        targetText: 'Hallo',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };
      state.addTranslationPair(pair);

      expect(callCount).toBe(1); // Should not increase after unsubscribe
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      state.initialize([]);
      state.reset();

      expect(state.getDocument()).toBeNull();
    });
  });
});
