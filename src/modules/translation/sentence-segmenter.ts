/**
 * Sentence Segmenter
 * Splits text into sentences using language-aware parsing
 */

import type { Language, Sentence } from './types';

export class SentenceSegmenter {
  /**
   * Split text into sentences using simple regex-based approach
   * For production, consider using a library like 'compromise' for better accuracy
   *
   * NOTE: Lists (ordered and unordered) are NOT segmented - they are kept as single units
   * to preserve structure when editing in translation mode.
   */
  segmentText(
    text: string,
    language: Language,
    elementId: string = ''
  ): Sentence[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences: Sentence[] = [];

    // Check if text is a list - if so, keep it as a single sentence
    if (this.isListBlock(text)) {
      const trimmed = text.trim();
      sentences.push({
        id: this.generateSentenceId(trimmed, 0),
        elementId,
        content: trimmed,
        language,
        order: 0,
        startOffset: 0,
        endOffset: text.length,
        hash: this.hashContent(trimmed),
      });
      return sentences;
    }

    // Split on sentence boundaries (., !, ?)
    // This is a simplified approach - for better accuracy, use NLP libraries
    const sentenceTexts = this.splitIntoSentences(text, language);

    let offset = 0;
    sentenceTexts.forEach((sentenceText, index) => {
      const trimmed = sentenceText.trim();
      if (!trimmed) return;

      const startOffset = text.indexOf(sentenceText, offset);
      const endOffset = startOffset + sentenceText.length;

      sentences.push({
        id: this.generateSentenceId(trimmed, index),
        elementId,
        content: trimmed,
        language,
        order: index,
        startOffset,
        endOffset,
        hash: this.hashContent(trimmed),
      });

      offset = endOffset;
    });

    return sentences;
  }

  /**
   * Check if text is a list block (ordered or unordered)
   * Lists should NOT be segmented into individual sentences
   */
  private isListBlock(text: string): boolean {
    const trimmed = text.trim();

    // Check for ordered list (1., 2., 3., etc.)
    const orderedListPattern = /^\s*\d+[.)]\s+/m;
    if (orderedListPattern.test(trimmed)) {
      return true;
    }

    // Check for unordered list (-, *, +)
    const unorderedListPattern = /^\s*[-*+]\s+/m;
    if (unorderedListPattern.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Split text into sentences based on punctuation
   */
  private splitIntoSentences(text: string, language: Language): string[] {
    // Basic sentence splitting regex
    // Matches periods, exclamation marks, question marks followed by space or end
    // Handles common abbreviations (Mr., Mrs., Dr., etc.)
    const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/gm;

    // First, protect common abbreviations
    let protectedText = text;
    const abbreviations = this.getAbbreviations(language);

    abbreviations.forEach((abbr) => {
      const regex = new RegExp(`\\b${abbr}\\.`, 'gi');
      protectedText = protectedText.replace(regex, (match) =>
        match.replace('.', '<!DOT!>')
      );
    });

    // Split on sentence boundaries
    const sentences = protectedText
      .split(sentencePattern)
      .map((s) => s.replace(/<!DOT!>/g, '.').trim())
      .filter((s) => s.length > 0);

    return sentences;
  }

  /**
   * Get common abbreviations for a language
   */
  private getAbbreviations(language: Language): string[] {
    const common = [
      'Mr',
      'Mrs',
      'Ms',
      'Dr',
      'Prof',
      'Sr',
      'Jr',
      'vs',
      'etc',
      'i.e',
      'e.g',
      'Mt',
      'St',
      'Ave',
      'Blvd',
      'Inc',
      'Ltd',
      'Corp',
      'Co',
    ];

    switch (language) {
      case 'nl':
        return [
          ...common,
          'dhr',
          'mevr',
          'mw',
          'dr',
          'prof',
          'etc',
          'bijv',
          'nl',
        ];
      case 'fr':
        return [
          ...common,
          'M',
          'Mme',
          'Mlle',
          'Dr',
          'Prof',
          'etc',
          'p.ex',
          'c.-à-d',
        ];
      default:
        return common;
    }
  }

  /**
   * Generate unique sentence ID
   */
  private generateSentenceId(text: string, index: number): string {
    const hash = this.hashContent(text);
    return `sent-${index}-${hash.substring(0, 8)}`;
  }

  /**
   * Simple hash function for content comparison
   */
  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Update sentence IDs for consistency
   */
  updateSentenceIds(sentences: Sentence[], elementId: string): Sentence[] {
    return sentences.map((sentence, index) => ({
      ...sentence,
      id: this.generateSentenceId(sentence.content, index),
      elementId,
      order: index,
    }));
  }

  /**
   * Merge sentences back into text
   */
  mergeSentences(sentences: Sentence[]): string {
    return sentences.map((s) => s.content).join(' ');
  }
}
