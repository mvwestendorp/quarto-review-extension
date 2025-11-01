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
    return this.buildPairs(
      alignment,
      sourceSentences,
      targetSentences,
      scores,
      method
    );
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
    return this.buildPairs(
      alignment,
      sourceSentences,
      targetSentences,
      scores,
      method
    );
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

  private buildPairs(
    alignment: Array<[number, number]>,
    sourceSentences: Sentence[],
    targetSentences: Sentence[],
    scores: Array<{ sourceIndex: number; targetIndex: number; score: number }>,
    method: TranslationMethod
  ): TranslationPair[] {
    const pairs: TranslationPair[] = [];

    for (const [srcIdx, tgtIdx] of alignment) {
      const sourceSentence = sourceSentences[srcIdx];
      const targetSentence = targetSentences[tgtIdx];

      if (!sourceSentence || !targetSentence) {
        continue;
      }

      const alignmentScore =
        scores.find(
          (score) =>
            score.sourceIndex === srcIdx && score.targetIndex === tgtIdx
        )?.score ?? 0;

      const timestamp = Date.now();

      pairs.push({
        id: this.generatePairId(sourceSentence.id, targetSentence.id),
        sourceId: sourceSentence.id,
        targetId: targetSentence.id,
        sourceText: sourceSentence.content,
        targetText: targetSentence.content,
        sourceLanguage: sourceSentence.language,
        targetLanguage: targetSentence.language,
        method,
        alignmentScore,
        timestamp,
        lastModified: timestamp,
        status: 'synced',
        isManuallyEdited: false,
      });
    }

    return pairs;
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
