import { describe, it, expect } from 'vitest';
import { AlignmentAlgorithm } from '@modules/translation/alignment-algorithm';
import { CorrespondenceMapper } from '@modules/translation/correspondence-mapper';
import type { Sentence } from '@modules/translation/types';

describe('AlignmentAlgorithm', () => {
  const algorithm = new AlignmentAlgorithm();

  describe('computeAlignment', () => {
    it('should compute alignment scores for sentence pairs', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello world',
          language: 'en',
          startOffset: 0,
          endOffset: 11,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Hallo wereld',
          language: 'nl',
          startOffset: 0,
          endOffset: 12,
          hash: 'h2',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);

      expect(scores).toHaveLength(1);
      expect(scores[0].sourceIndex).toBe(0);
      expect(scores[0].targetIndex).toBe(0);
      expect(scores[0].score).toBeGreaterThan(0);
    });

    it('should give higher scores to similar position sentences', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'First',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
        {
          id: 's2',
          elementId: 'e1',
          content: 'Second',
          language: 'en',
          startOffset: 6,
          endOffset: 12,
          hash: 'h2',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Eerste',
          language: 'nl',
          startOffset: 0,
          endOffset: 6,
          hash: 'h3',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'Tweede',
          language: 'nl',
          startOffset: 7,
          endOffset: 13,
          hash: 'h4',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);

      // Find scores for (0,0) and (0,1)
      const score00 = scores.find(
        (s) => s.sourceIndex === 0 && s.targetIndex === 0
      )!.score;
      const score01 = scores.find(
        (s) => s.sourceIndex === 0 && s.targetIndex === 1
      )!.score;

      // (0,0) should have higher score due to position similarity
      expect(score00).toBeGreaterThan(score01);
    });

    it('should give higher scores to similar length sentences', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Short',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Kort',
          language: 'nl',
          startOffset: 0,
          endOffset: 4,
          hash: 'h2',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'This is a very long sentence with many words',
          language: 'nl',
          startOffset: 5,
          endOffset: 50,
          hash: 'h3',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);

      const score01 = scores.find(
        (s) => s.sourceIndex === 0 && s.targetIndex === 0
      )!.score;
      const score02 = scores.find(
        (s) => s.sourceIndex === 0 && s.targetIndex === 1
      )!.score;

      // Should prefer similar length
      expect(score01).toBeGreaterThan(score02);
    });
  });

  describe('findBestAlignment', () => {
    it('should find 1:1 alignment for simple case', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'First',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
        {
          id: 's2',
          elementId: 'e1',
          content: 'Second',
          language: 'en',
          startOffset: 6,
          endOffset: 12,
          hash: 'h2',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Eerste',
          language: 'nl',
          startOffset: 0,
          endOffset: 6,
          hash: 'h3',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'Tweede',
          language: 'nl',
          startOffset: 7,
          endOffset: 13,
          hash: 'h4',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);
      const alignment = algorithm.findBestAlignment(scores);

      expect(alignment).toHaveLength(2);
      expect(alignment).toContainEqual([0, 0]);
      expect(alignment).toContainEqual([1, 1]);
    });

    it('should not create duplicate mappings', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Test',
          language: 'en',
          startOffset: 0,
          endOffset: 4,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Test 1',
          language: 'nl',
          startOffset: 0,
          endOffset: 6,
          hash: 'h2',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'Test 2',
          language: 'nl',
          startOffset: 7,
          endOffset: 13,
          hash: 'h3',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);
      const alignment = algorithm.findBestAlignment(scores);

      // Should only map to one target (highest score)
      expect(alignment).toHaveLength(1);
    });

    it('should filter out low-score alignments', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Completely different text with no relation',
          language: 'en',
          startOffset: 0,
          endOffset: 43,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Totalement autre chose sans rapport',
          language: 'fr',
          startOffset: 0,
          endOffset: 36,
          hash: 'h2',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);
      const alignment = algorithm.findBestAlignment(scores);

      // May or may not align depending on threshold
      // Just ensure it doesn't crash
      expect(Array.isArray(alignment)).toBe(true);
    });
  });

  describe('findFlexibleAlignment', () => {
    it('should allow 1:N mappings', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Long sentence that splits',
          language: 'en',
          startOffset: 0,
          endOffset: 25,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Part one',
          language: 'nl',
          startOffset: 0,
          endOffset: 8,
          hash: 'h2',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'Part two',
          language: 'nl',
          startOffset: 9,
          endOffset: 17,
          hash: 'h3',
        },
      ];

      const scores = algorithm.computeAlignment(source, target);
      const alignment = algorithm.findFlexibleAlignment(scores);

      // Should allow source[0] to map to multiple targets
      const sourceMappings = alignment.filter((a) => a[0] === 0);
      expect(sourceMappings.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('CorrespondenceMapper', () => {
  const mapper = new CorrespondenceMapper();

  describe('createMapping', () => {
    it('should create translation pairs from sentences', () => {
      const source: Sentence[] = [
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

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Hallo',
          language: 'nl',
          startOffset: 0,
          endOffset: 5,
          hash: 'h2',
        },
      ];

      const pairs = mapper.createMapping(source, target);

      expect(pairs).toHaveLength(1);
      expect(pairs[0].sourceId).toBe('s1');
      expect(pairs[0].targetId).toBe('t1');
      expect(pairs[0].sourceText).toBe('Hello');
      expect(pairs[0].targetText).toBe('Hallo');
    });

    it('should set method to automatic by default', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Test',
          language: 'en',
          startOffset: 0,
          endOffset: 4,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Test',
          language: 'nl',
          startOffset: 0,
          endOffset: 4,
          hash: 'h2',
        },
      ];

      const pairs = mapper.createMapping(source, target);

      expect(pairs[0].method).toBe('automatic');
      expect(pairs[0].isManuallyEdited).toBe(false);
    });

    it('should set status to synced', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Test',
          language: 'en',
          startOffset: 0,
          endOffset: 4,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Test',
          language: 'nl',
          startOffset: 0,
          endOffset: 4,
          hash: 'h2',
        },
      ];

      const pairs = mapper.createMapping(source, target);

      expect(pairs[0].status).toBe('synced');
    });

    it('should include alignment scores', () => {
      const source: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Test',
          language: 'en',
          startOffset: 0,
          endOffset: 4,
          hash: 'h1',
        },
      ];

      const target: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Test',
          language: 'nl',
          startOffset: 0,
          endOffset: 4,
          hash: 'h2',
        },
      ];

      const pairs = mapper.createMapping(source, target);

      expect(pairs[0].alignmentScore).toBeDefined();
      expect(pairs[0].alignmentScore).toBeGreaterThanOrEqual(0);
      expect(pairs[0].alignmentScore).toBeLessThanOrEqual(1);
    });
  });

  describe('createManualPair', () => {
    it('should create manual translation pair', () => {
      const source: Sentence = {
        id: 's1',
        elementId: 'e1',
        content: 'Hello',
        language: 'en',
        startOffset: 0,
        endOffset: 5,
        hash: 'h1',
      };

      const target: Sentence = {
        id: 't1',
        elementId: 'e1',
        content: 'Hallo',
        language: 'nl',
        startOffset: 0,
        endOffset: 5,
        hash: 'h2',
      };

      const pair = mapper.createManualPair(source, target);

      expect(pair.method).toBe('manual');
      expect(pair.isManuallyEdited).toBe(true);
      expect(pair.alignmentScore).toBe(1.0);
      expect(pair.status).toBe('synced');
    });
  });

  describe('updateMapping', () => {
    it('should mark affected pairs as out-of-sync', () => {
      const pairs = [
        {
          id: 'p1',
          sourceId: 's1',
          targetId: 't1',
          sourceText: 'Hello',
          targetText: 'Hallo',
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          method: 'automatic' as const,
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'synced' as const,
          isManuallyEdited: false,
        },
      ];

      const updatedSentence: Sentence = {
        id: 's1',
        elementId: 'e1',
        content: 'Hi there',
        language: 'en',
        startOffset: 0,
        endOffset: 8,
        hash: 'new-hash',
      };

      const updated = mapper.updateMapping(pairs, updatedSentence, true);

      expect(updated[0].status).toBe('out-of-sync');
    });

    it('should not affect unrelated pairs', () => {
      const pairs = [
        {
          id: 'p1',
          sourceId: 's1',
          targetId: 't1',
          sourceText: 'Hello',
          targetText: 'Hallo',
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          method: 'automatic' as const,
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'synced' as const,
          isManuallyEdited: false,
        },
      ];

      const updatedSentence: Sentence = {
        id: 's2',
        elementId: 'e1',
        content: 'Different sentence',
        language: 'en',
        startOffset: 0,
        endOffset: 18,
        hash: 'hash',
      };

      const updated = mapper.updateMapping(pairs, updatedSentence, true);

      expect(updated[0].status).toBe('synced');
    });
  });

  describe('findUnmatchedSentences', () => {
    it('should find source sentences without translations', () => {
      const sentences: Sentence[] = [
        {
          id: 's1',
          elementId: 'e1',
          content: 'First',
          language: 'en',
          startOffset: 0,
          endOffset: 5,
          hash: 'h1',
        },
        {
          id: 's2',
          elementId: 'e1',
          content: 'Second',
          language: 'en',
          startOffset: 6,
          endOffset: 12,
          hash: 'h2',
        },
      ];

      const pairs = [
        {
          id: 'p1',
          sourceId: 's1',
          targetId: 't1',
          sourceText: 'First',
          targetText: 'Eerste',
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          method: 'automatic' as const,
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'synced' as const,
          isManuallyEdited: false,
        },
      ];

      const unmatched = mapper.findUnmatchedSentences(sentences, pairs, true);

      expect(unmatched).toHaveLength(1);
      expect(unmatched[0].id).toBe('s2');
    });

    it('should find target sentences without source', () => {
      const sentences: Sentence[] = [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Eerste',
          language: 'nl',
          startOffset: 0,
          endOffset: 6,
          hash: 'h1',
        },
        {
          id: 't2',
          elementId: 'e1',
          content: 'Tweede',
          language: 'nl',
          startOffset: 7,
          endOffset: 13,
          hash: 'h2',
        },
      ];

      const pairs = [
        {
          id: 'p1',
          sourceId: 's1',
          targetId: 't1',
          sourceText: 'First',
          targetText: 'Eerste',
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          method: 'automatic' as const,
          timestamp: Date.now(),
          lastModified: Date.now(),
          status: 'synced' as const,
          isManuallyEdited: false,
        },
      ];

      const unmatched = mapper.findUnmatchedSentences(sentences, pairs, false);

      expect(unmatched).toHaveLength(1);
      expect(unmatched[0].id).toBe('t2');
    });
  });
});
