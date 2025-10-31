/**
 * Translation Provider Base Class
 * Abstract base for all translation providers
 */

import type { Language } from '../types';

export abstract class TranslationProvider {
  /**
   * Provider name
   */
  abstract get name(): string;

  /**
   * Check if this provider supports a language pair
   */
  abstract supports(from: Language, to: Language): boolean;

  /**
   * Translate a single text
   */
  abstract translate(
    text: string,
    from: Language,
    to: Language
  ): Promise<string>;

  /**
   * Translate multiple texts in batch
   */
  abstract translateBatch(
    texts: string[],
    from: Language,
    to: Language
  ): Promise<string[]>;

  /**
   * Check if provider is available/configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Optional: Get translation confidence/quality score
   */
  getConfidence?(translation: string): number;

  /**
   * Optional: Initialize provider (download models, etc.)
   */
  initialize?(): Promise<void>;

  /**
   * Optional: Clean up resources
   */
  destroy?(): void;
}
