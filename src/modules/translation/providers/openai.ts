/**
 * OpenAI Translation Provider
 * Uses OpenAI API for high-quality translations
 */

import { TranslationProvider } from './base';
import type { Language, OpenAIConfig } from '../types';

export class OpenAIProvider extends TranslationProvider {
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 1000;
  }

  get name(): string {
    return 'openai';
  }

  supports(_from: Language, _to: Language): boolean {
    // OpenAI supports all major languages
    return true;
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    const prompt = this.buildPrompt(text, from, to);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator. Translate accurately and preserve formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Low temperature for consistent translations
        max_tokens: this.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async translateBatch(
    texts: string[],
    from: Language,
    to: Language
  ): Promise<string[]> {
    // OpenAI: translate sequentially to avoid rate limits
    // For production, consider implementing parallel requests with rate limiting
    const results: string[] = [];

    for (const text of texts) {
      const translation = await this.translate(text, from, to);
      results.push(translation);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  /**
   * Build translation prompt
   */
  private buildPrompt(text: string, from: Language, to: Language): string {
    const langNames: Record<Language, string> = {
      en: 'English',
      nl: 'Dutch',
      fr: 'French',
    };

    return `Translate the following ${langNames[from]} text to ${langNames[to]}. Return only the translation, no explanations:\n\n${text}`;
  }
}
