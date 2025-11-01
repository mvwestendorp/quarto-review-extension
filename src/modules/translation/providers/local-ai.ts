/**
 * Local AI Translation Provider
 * Uses Transformers.js with NLLB-200 or Opus-MT models
 * Implements multi-tier strategy: Opus-MT (fast) → NLLB-200 (fallback)
 * Supports WebGPU acceleration with WASM fallback
 */

import { TranslationProvider } from './base';
import type { Language, LocalAIConfig, TranslationProgress } from '../types';

// Type definitions for transformers.js
type TransformersModule = any;
type Pipeline = any;
type ProgressCallback = (progress: TranslationProgress) => void;

export class LocalAIProvider extends TranslationProvider {
  private translator: Pipeline | null = null;
  private opusModels = new Map<string, Pipeline>();
  private backend: 'wasm' | 'webgpu' = 'wasm';
  private modelName: string;
  private mode: 'fast' | 'balanced' | 'quality';
  private transformers: TransformersModule | null = null;
  private progressCallback?: ProgressCallback;
  private initializePromise: Promise<void> | null = null;

  constructor(private config: LocalAIConfig = {}) {
    super();
    this.mode = config.mode || 'balanced';
    this.modelName = this.selectModelName();
  }

  get name(): string {
    return 'local';
  }

  /**
   * Select model based on mode
   */
  private selectModelName(): string {
    switch (this.mode) {
      case 'fast':
        return 'opus-mt'; // Will use language-specific models
      case 'quality':
        return 'Xenova/nllb-200-1.3B';
      case 'balanced':
      default:
        return 'Xenova/nllb-200-distilled-600M';
    }
  }

  /**
   * Set progress callback for download/initialization
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Detect WebGPU support
   */
  private async detectWebGPU(): Promise<boolean> {
    if (this.config.backend === 'wasm') {
      return false;
    }

    if (this.config.backend === 'webgpu') {
      return true; // User explicitly requested WebGPU
    }

    // Auto-detect
    if (typeof navigator === 'undefined') {
      return false;
    }

    // Type assertion for WebGPU API
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    };
    if (!nav.gpu) {
      return false;
    }

    try {
      const adapter = await nav.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Load transformers.js dynamically
   */
  private async loadTransformers(): Promise<TransformersModule> {
    if (this.transformers) {
      return this.transformers;
    }

    try {
      // Dynamic import to avoid bundling transformers.js if not needed
      this.transformers = await import('@xenova/transformers');
      return this.transformers;
    } catch {
      throw new Error(
        'Failed to load @xenova/transformers. Please install: npm install @xenova/transformers'
      );
    }
  }

  /**
   * Initialize the translation model
   */
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this._initialize();
    return this.initializePromise;
  }

  private async _initialize(): Promise<void> {
    if (this.translator) {
      return; // Already initialized
    }

    this.progressCallback?.({
      stage: 'downloading',
      progress: 0,
      message: 'Loading translation engine...',
    });

    const transformers = await this.loadTransformers();
    const { pipeline } = transformers;

    // Detect backend
    const hasWebGPU = await this.detectWebGPU();
    this.backend = hasWebGPU ? 'webgpu' : 'wasm';

    console.log(`[LocalAI] Using ${this.backend} backend for translation`);

    this.progressCallback?.({
      stage: 'downloading',
      progress: 0.1,
      message: `Downloading model (${this.modelName})...`,
    });

    try {
      // For fast mode, pre-load Opus-MT models for common pairs
      if (this.mode === 'fast') {
        await this.loadOpusModels(pipeline);
      }

      // Load main NLLB model (fallback or primary)
      if (this.mode !== 'fast' || this.config.mode === 'balanced') {
        this.translator = await pipeline('translation', this.modelName, {
          device: this.backend,
          dtype: this.backend === 'webgpu' ? 'fp16' : 'q8',
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              this.progressCallback?.({
                stage: 'downloading',
                progress: progress.progress / 100,
                message: `Downloading: ${progress.file} (${Math.round(progress.progress)}%)`,
              });
            }
          },
        });
      }

      this.progressCallback?.({
        stage: 'complete',
        progress: 1,
        message: 'Translation engine ready!',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.progressCallback?.({
        stage: 'complete',
        progress: 0,
        message: `Failed to initialize: ${message}`,
      });
      throw err;
    }
  }

  /**
   * Load Opus-MT models for common language pairs
   */
  private async loadOpusModels(pipeline: any): Promise<void> {
    const pairs = [
      ['en', 'nl'],
      ['nl', 'en'],
      ['en', 'fr'],
      ['fr', 'en'],
    ];

    for (const [from, to] of pairs) {
      const key = `${from}-${to}`;
      const modelName = `Xenova/opus-mt-${from}-${to}`;

      try {
        this.progressCallback?.({
          stage: 'downloading',
          progress: 0.2,
          message: `Loading Opus-MT (${from}→${to})...`,
        });

        const model = await pipeline('translation', modelName, {
          device: this.backend,
        });

        this.opusModels.set(key, model);
        console.log(`[LocalAI] Loaded Opus-MT: ${from}→${to}`);
      } catch {
        console.warn(`[LocalAI] Failed to load Opus-MT ${from}→${to}`);
      }
    }
  }

  supports(from: Language, to: Language): boolean {
    // NLLB-200 supports 200 languages including en, nl, fr
    const supported = ['en', 'nl', 'fr'];
    return supported.includes(from) && supported.includes(to);
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    await this.initialize();

    // Try Opus-MT first (fast mode)
    if (this.mode === 'fast') {
      const key = `${from}-${to}`;
      const opusModel = this.opusModels.get(key);

      if (opusModel) {
        const result = await opusModel(text);
        return result[0].translation_text;
      }
    }

    // Fallback to NLLB-200
    if (!this.translator) {
      throw new Error('Translation model not initialized');
    }

    const srcLang = this.getLanguageCode(from);
    const tgtLang = this.getLanguageCode(to);

    const result = await this.translator(text, {
      src_lang: srcLang,
      tgt_lang: tgtLang,
    });

    return result[0].translation_text;
  }

  async translateBatch(
    texts: string[],
    from: Language,
    to: Language
  ): Promise<string[]> {
    // Translate in parallel batches for better performance
    const batchSize = 5;
    const results: string[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const promises = batch.map((text) => this.translate(text, from, to));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Update progress
      this.progressCallback?.({
        stage: 'translating',
        progress: (i + batch.length) / texts.length,
        message: `Translating... ${i + batch.length}/${texts.length}`,
        current: i + batch.length,
        total: texts.length,
      });
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadTransformers();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get NLLB language code from our Language type
   */
  private getLanguageCode(lang: Language): string {
    const codes: Record<Language, string> = {
      en: 'eng_Latn',
      nl: 'nld_Latn',
      fr: 'fra_Latn',
    };
    return codes[lang];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.translator = null;
    this.opusModels.clear();
    this.transformers = null;
    this.initializePromise = null;
  }

  /**
   * Get backend info
   */
  getBackendInfo(): { backend: string; model: string; mode: string } {
    return {
      backend: this.backend,
      model: this.modelName,
      mode: this.mode,
    };
  }
}
