import { describe, it, expect } from 'vitest';
import type { ElementMetadata } from '@/types';
import {
  mergeSectionCommentIntoSegments,
  normalizeContentForComparison,
} from '@modules/ui/shared/editor-content';

describe('editor-content utilities', () => {
  describe('mergeSectionCommentIntoSegments', () => {
    const fallbackMetadata: ElementMetadata = { type: 'Para' };

    it('appends section comment markup to the final segment', () => {
      const segments = [
        { content: 'First', metadata: fallbackMetadata },
        { content: 'Second', metadata: { type: 'Para', classes: ['test'] } },
      ];

      mergeSectionCommentIntoSegments(
        segments,
        '{>>note<<}',
        fallbackMetadata,
        (content, markup) => `${content}${markup}`
      );

      expect(segments[1].content).toBe('Second{>>note<<}');
      expect(segments[1].metadata?.classes).toEqual(['test']);
    });

    it('uses fallback metadata when segment metadata is missing', () => {
      const segments = [
        { content: 'Only segment', metadata: undefined },
      ];

      mergeSectionCommentIntoSegments(
        segments,
        '{>>note<<}',
        fallbackMetadata,
        (content) => `${content}-wrapped`
      );

      expect(segments[0].metadata).toEqual(fallbackMetadata);
    });

    it('is a no-op when markup is empty', () => {
      const segments = [{ content: 'Segment', metadata: fallbackMetadata }];

      mergeSectionCommentIntoSegments(
        segments,
        null,
        fallbackMetadata,
        (content, markup) => `${content}${markup}`
      );

      expect(segments[0].content).toBe('Segment');
    });
  });

  describe('normalizeContentForComparison', () => {
    it('normalizes whitespace and list markers', () => {
      const input = '* Item  \r\nSecond line   ';
      const normalized = normalizeContentForComparison(input);
      expect(normalized).toBe('- Item\nSecond line');
    });
  });
});
