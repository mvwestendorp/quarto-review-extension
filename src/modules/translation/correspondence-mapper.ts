/**
 * Correspondence Mapper
 * Creates and manages correspondence between source and target sentences
 */

import { AlignmentAlgorithm } from './alignment-algorithm';
import type { Sentence, TranslationPair, TranslationMethod } from './types';

export class CorrespondenceMapper {
  private alignmentAlgorithm = new AlignmentAlgorithm();

  /**
   * Create correspondence map between source and target sentences
   */
  createMapping(
    sourceSentences: Sentence[],
    targetSentences: Sentence[],
    method: TranslationMethod = 'automatic'
  ): TranslationPair[] {
    const scores = this.alignmentAlgorithm.computeAlignment(
      sourceSentences,
      targetSentences
    );

    const alignment = this.alignmentAlgorithm.findBestAlignment(scores);
    const pairs: TranslationPair[] = [];

    for (const [srcIdx, tgtIdx] of alignment) {
      const source = sourceSentences[srcIdx];
      const target = targetSentences[tgtIdx];

      // Skip if either sentence is undefined
      if (!source || !target) {
        continue;
      }

      const alignmentScore =
        scores.find((s) => s.sourceIndex === srcIdx && s.targetIndex === tgtIdx)
          ?.score || 0;

      pairs.push({
        id: this.generatePairId(source.id, target.id),
        sourceId: source.id,
        targetId: target.id,
        sourceText: source.content,
        targetText: target.content,
        sourceLanguage: source.language,
        targetLanguage: target.language,
        method,
        alignmentScore,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      });
    }

    return pairs;
  }

  /**
   * Create flexible mapping (allows 1:N, N:1 mappings)
   */
  createFlexibleMapping(
    sourceSentences: Sentence[],
    targetSentences: Sentence[],
    method: TranslationMethod = 'automatic'
  ): TranslationPair[] {
    const scores = this.alignmentAlgorithm.computeAlignment(
      sourceSentences,
      targetSentences
    );

    const alignment = this.alignmentAlgorithm.findFlexibleAlignment(scores);
    const pairs: TranslationPair[] = [];

    for (const [srcIdx, tgtIdx] of alignment) {
      const source = sourceSentences[srcIdx];
      const target = targetSentences[tgtIdx];

      // Skip if either sentence is undefined
      if (!source || !target) {
        continue;
      }

      const alignmentScore =
        scores.find((s) => s.sourceIndex === srcIdx && s.targetIndex === tgtIdx)
          ?.score || 0;

      pairs.push({
        id: this.generatePairId(source.id, target.id),
        sourceId: source.id,
        targetId: target.id,
        sourceText: source.content,
        targetText: target.content,
        sourceLanguage: source.language,
        targetLanguage: target.language,
        method,
        alignmentScore,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      });
    }

    return pairs;
  }

  /**
   * Update mapping when sentences change
   */
  updateMapping(
    pairs: TranslationPair[],
    updatedSentence: Sentence,
    isSource: boolean
  ): TranslationPair[] {
    return pairs.map((pair) => {
      const needsUpdate = isSource
        ? pair.sourceId === updatedSentence.id
        : pair.targetId === updatedSentence.id;

      if (needsUpdate) {
        return {
          ...pair,
          status: 'out-of-sync',
          lastModified: Date.now(),
        };
      }

      return pair;
    });
  }

  /**
   * Create manual correspondence between specific sentences
   */
  createManualPair(source: Sentence, target: Sentence): TranslationPair {
    return {
      id: this.generatePairId(source.id, target.id),
      sourceId: source.id,
      targetId: target.id,
      sourceText: source.content,
      targetText: target.content,
      sourceLanguage: source.language,
      targetLanguage: target.language,
      method: 'manual',
      alignmentScore: 1.0, // Perfect score for manual
      timestamp: Date.now(),
      lastModified: Date.now(),
      status: 'synced',
      isManuallyEdited: true,
    };
  }

  /**
   * Generate unique pair ID
   */
  private generatePairId(sourceId: string, targetId: string): string {
    return `pair-${sourceId}-${targetId}`;
  }

  /**
   * Find unmatched sentences
   */
  findUnmatchedSentences(
    sentences: Sentence[],
    pairs: TranslationPair[],
    isSource: boolean
  ): Sentence[] {
    const matchedIds = new Set(
      pairs.map((p) => (isSource ? p.sourceId : p.targetId))
    );

    return sentences.filter((s) => !matchedIds.has(s.id));
  }
}
