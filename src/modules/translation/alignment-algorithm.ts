/**
 * Alignment Algorithm
 * Computes alignment scores between source and target sentences
 */

import type { Sentence } from './types';

export interface AlignmentScore {
  sourceIndex: number;
  targetIndex: number;
  score: number;
}

export class AlignmentAlgorithm {
  /**
   * Compute alignment scores between source and target sentences
   * Uses multiple heuristics for scoring
   */
  computeAlignment(
    sourceSentences: Sentence[],
    targetSentences: Sentence[]
  ): AlignmentScore[] {
    const scores: AlignmentScore[] = [];

    sourceSentences.forEach((source, srcIdx) => {
      targetSentences.forEach((target, tgtIdx) => {
        const score = this.scoreAlignment(source, target, srcIdx, tgtIdx);
        scores.push({ sourceIndex: srcIdx, targetIndex: tgtIdx, score });
      });
    });

    return scores;
  }

  /**
   * Score how well two sentences align
   */
  private scoreAlignment(
    source: Sentence,
    target: Sentence,
    srcIdx: number,
    tgtIdx: number
  ): number {
    let score = 0;

    // Position similarity (sentences in similar positions likely correspond)
    const positionScore =
      1 - Math.abs(srcIdx - tgtIdx) / Math.max(srcIdx, tgtIdx, 1);
    score += positionScore * 0.3;

    // Length similarity (similar length sentences likely correspond)
    const lengthRatio =
      Math.min(source.content.length, target.content.length) /
      Math.max(source.content.length, target.content.length);
    score += lengthRatio * 0.2;

    // Word overlap (common words indicate correspondence)
    const wordOverlap = this.computeWordOverlap(source.content, target.content);
    score += wordOverlap * 0.3;

    // Punctuation similarity
    const punctScore = this.punctuationSimilarity(
      source.content,
      target.content
    );
    score += punctScore * 0.2;

    return score;
  }

  /**
   * Compute word overlap between two texts
   */
  private computeWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    let overlap = 0;
    words1.forEach((word) => {
      if (words2.has(word)) overlap++;
    });

    return overlap / Math.max(words1.size, words2.size);
  }

  /**
   * Compute punctuation similarity
   */
  private punctuationSimilarity(text1: string, text2: string): number {
    const punct1 = text1.match(/[.,!?;:]/g) || [];
    const punct2 = text2.match(/[.,!?;:]/g) || [];

    if (punct1.length === 0 && punct2.length === 0) return 1;

    const common = punct1.filter((p, i) => punct2[i] === p).length;
    return common / Math.max(punct1.length, punct2.length);
  }

  /**
   * Find best alignment using greedy algorithm
   * Returns pairs of (sourceIndex, targetIndex)
   */
  findBestAlignment(scores: AlignmentScore[]): Array<[number, number]> {
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    const usedSources = new Set<number>();
    const usedTargets = new Set<number>();
    const pairs: Array<[number, number]> = [];

    for (const { sourceIndex, targetIndex, score } of sortedScores) {
      if (score < 0.3) break; // Minimum threshold

      if (!usedSources.has(sourceIndex) && !usedTargets.has(targetIndex)) {
        pairs.push([sourceIndex, targetIndex]);
        usedSources.add(sourceIndex);
        usedTargets.add(targetIndex);
      }
    }

    return pairs;
  }

  /**
   * Find N:M alignments (one source to multiple targets or vice versa)
   * This is more complex and allows for one-to-many mappings
   */
  findFlexibleAlignment(
    scores: AlignmentScore[],
    maxTargetsPerSource = 2,
    maxSourcesPerTarget = 2
  ): Array<[number, number]> {
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    const sourceCount = new Map<number, number>();
    const targetCount = new Map<number, number>();
    const pairs: Array<[number, number]> = [];

    for (const { sourceIndex, targetIndex, score } of sortedScores) {
      if (score < 0.25) break; // Lower threshold for flexible matching

      const srcCount = sourceCount.get(sourceIndex) || 0;
      const tgtCount = targetCount.get(targetIndex) || 0;

      if (srcCount < maxTargetsPerSource && tgtCount < maxSourcesPerTarget) {
        pairs.push([sourceIndex, targetIndex]);
        sourceCount.set(sourceIndex, srcCount + 1);
        targetCount.set(targetIndex, tgtCount + 1);
      }
    }

    return pairs;
  }
}
