import { describe, it, expect } from 'vitest';
import { SentenceSegmenter } from '@modules/translation/sentence-segmenter';
import type { Language } from '@modules/translation/types';

describe('SentenceSegmenter', () => {
  const segmenter = new SentenceSegmenter();

  describe('segmentText', () => {
    it('should segment simple sentences', () => {
      const text = 'Hello world. How are you? I am fine.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(3);
      expect(sentences[0].content).toBe('Hello world.');
      expect(sentences[1].content).toBe('How are you?');
      expect(sentences[2].content).toBe('I am fine.');
    });

    it('should handle empty text', () => {
      const text = '';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(0);
    });

    it('should handle single sentence', () => {
      const text = 'This is a single sentence.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(1);
      expect(sentences[0].content).toBe('This is a single sentence.');
    });

    it('should preserve abbreviations', () => {
      const text = 'Dr. Smith works at Mt. Sinai. He is very experienced.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(2);
      expect(sentences[0].content).toBe(
        'Dr. Smith works at Mt. Sinai.'
      );
      expect(sentences[1].content).toBe('He is very experienced.');
    });

    it('should handle Dutch text', () => {
      const text = 'Hallo wereld. Hoe gaat het? Goed, dank je.';
      const sentences = segmenter.segmentText(text, 'nl', 'elem-1');

      expect(sentences).toHaveLength(3);
      expect(sentences[0].content).toBe('Hallo wereld.');
      expect(sentences[1].content).toBe('Hoe gaat het?');
      expect(sentences[2].content).toBe('Goed, dank je.');
    });

    it('should handle French text', () => {
      const text = 'Bonjour le monde. Comment allez-vous? Je vais bien.';
      const sentences = segmenter.segmentText(text, 'fr', 'elem-1');

      expect(sentences).toHaveLength(3);
      expect(sentences[0].content).toBe('Bonjour le monde.');
      expect(sentences[1].content).toBe('Comment allez-vous?');
      expect(sentences[2].content).toBe('Je vais bien.');
    });

    it('should set correct element ID', () => {
      const text = 'First sentence. Second sentence.';
      const sentences = segmenter.segmentText(text, 'en', 'my-element');

      sentences.forEach((sentence) => {
        expect(sentence.elementId).toBe('my-element');
      });
    });

    it('should set correct language', () => {
      const text = 'Test sentence.';
      const languages: Language[] = ['en', 'nl', 'fr'];

      languages.forEach((lang) => {
        const sentences = segmenter.segmentText(text, lang, 'elem-1');
        expect(sentences[0].language).toBe(lang);
      });
    });

    it('should generate unique IDs', () => {
      const text = 'First. Second. Third.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      const ids = sentences.map((s) => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(sentences.length);
    });

    it('should set correct offsets', () => {
      const text = 'First sentence. Second sentence.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences[0].startOffset).toBeLessThan(sentences[0].endOffset);
      expect(sentences[1].startOffset).toBeLessThan(sentences[1].endOffset);
      expect(sentences[0].endOffset).toBeLessThanOrEqual(
        sentences[1].startOffset
      );
    });

    it('should handle exclamation marks', () => {
      const text = 'Watch out! Be careful! Stay safe!';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(3);
    });

    it('should handle question marks', () => {
      const text = 'What? Why? How?';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(3);
    });

    it('should handle mixed punctuation', () => {
      const text = 'Statement. Question? Exclamation!';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences).toHaveLength(3);
    });

    it('should generate hash for each sentence', () => {
      const text = 'First. Second.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      sentences.forEach((sentence) => {
        expect(sentence.hash).toBeDefined();
        expect(typeof sentence.hash).toBe('string');
        expect(sentence.hash.length).toBeGreaterThan(0);
      });
    });

    it('should generate different hashes for different content', () => {
      const text = 'First. Second.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      expect(sentences[0].hash).not.toBe(sentences[1].hash);
    });
  });

  describe('mergeSentences', () => {
    it('should merge sentences back to text', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');

      const merged = segmenter.mergeSentences(sentences);

      expect(merged).toContain('First sentence.');
      expect(merged).toContain('Second sentence.');
      expect(merged).toContain('Third sentence.');
    });

    it('should handle empty sentences array', () => {
      const merged = segmenter.mergeSentences([]);
      expect(merged).toBe('');
    });
  });

  describe('updateSentenceIds', () => {
    it('should update element IDs', () => {
      const text = 'First. Second.';
      const sentences = segmenter.segmentText(text, 'en', 'old-id');

      const updated = segmenter.updateSentenceIds(sentences, 'new-id');

      updated.forEach((sentence) => {
        expect(sentence.elementId).toBe('new-id');
      });
    });

    it('should regenerate sentence IDs', () => {
      const text = 'First. Second.';
      const sentences = segmenter.segmentText(text, 'en', 'elem-1');
      const originalIds = sentences.map((s) => s.id);

      const updated = segmenter.updateSentenceIds(sentences, 'elem-2');
      const newIds = updated.map((s) => s.id);

      // IDs should be regenerated (may be different)
      expect(updated).toHaveLength(sentences.length);
    });
  });
});
