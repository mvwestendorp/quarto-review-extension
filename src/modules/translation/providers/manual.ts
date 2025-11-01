/**
 * Manual Translation Provider
 * Returns empty strings for user to fill in manually
 */

import { TranslationProvider } from './base';
import type { Language } from '../types';

export class ManualTranslationProvider extends TranslationProvider {
  get name(): string {
    return 'manual';
  }

  supports(_from: Language, _to: Language): boolean {
    // Manual translation works for all language pairs
    return true;
  }

  async translate(
    _text: string,
    _from: Language,
    _to: Language
  ): Promise<string> {
    // Manual provider doesn't auto-translate
    // Returns empty string to be filled by user
    return '';
  }

  async translateBatch(
    texts: string[],
    _from: Language,
    _to: Language
  ): Promise<string[]> {
    return texts.map(() => '');
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
